import { replyTable } from "@/db/schema";
import { authHandler } from "@/lib/authHandler";
import { MessageSchema } from "@/lib/messageObject";
import { routeHandler } from "@/lib/routeHandler";
import { t } from "elysia";
import { eq, sql } from "drizzle-orm";

export const ReplySchema = t.Object({
  id: t.Number(),
  postId: t.Number(),
  userId: t.Number(),
  content: t.String(),
  createdAt: t.Date(),
  updatedAt: t.Date(),
});

const PaginationSchema = t.Object({
  page: t.Number(),
  limit: t.Number(),
  total: t.Number(),
  totalPages: t.Number(),
});

export const replyRoute = routeHandler("/post/reply", "Reply")
  .get(
    "/:postId",
    async ({ db, params, query }) => {
      const page = query.page ?? 1;
      const limit = query.limit;
      const offset = limit ? (page - 1) * limit : undefined;

      // Get total count for pagination
      const totalResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(replyTable)
        .where(eq(replyTable.postId, params.postId));
      const total = totalResult[0]?.count ?? 0;

      const replies = await db.query.replyTable.findMany({
        where: (table, { eq }) => eq(table.postId, params.postId),
        limit: limit,
        offset: offset,
        orderBy: (table, { desc }) => [desc(table.createdAt)],
      });

      // Return with pagination if limit is provided
      if (limit) {
        return {
          data: replies,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        };
      }

      return { data: replies };
    },
    {
      params: t.Object({
        postId: t.Integer(),
      }),
      query: t.Object({
        page: t.Optional(t.Number({ minimum: 1 })),
        limit: t.Optional(t.Number({ minimum: 1 })),
      }),
      response: {
        200: t.Object({
          data: t.Array(ReplySchema),
          pagination: t.Optional(PaginationSchema),
        }),
      },
      detail: {
        summary: "取得貼文留言列表",
        description:
          "根據貼文 ID 取得該貼文的所有留言，按建立時間降序排列。提供 limit 時會回傳分頁資訊。",
      },
    },
  )
  .use(authHandler)
  .post(
    "/",
    async ({ user, db, body, status }) => {
      if (body.content.trim() === "") {
        return status(422, { message: "content不可為空白" });
      }
      const post = await db.query.postTable.findFirst({
        where: (table, { eq }) => eq(table.id, body.postId),
      });
      if (!post) {
        return status(400, { message: "找不到postId對應的貼文" });
      }
      const [reply] = await db
        .insert(replyTable)
        .values({
          ...body,
          userId: user.userId,
        })
        .returning();
      return {
        message: "留言建立成功",
        reply: reply,
      };
    },
    {
      body: t.Object({
        postId: t.Integer(),
        content: t.String(),
      }),
      response: {
        200: t.Object({
          message: t.String(),
          reply: ReplySchema,
        }),
        400: MessageSchema,
        422: MessageSchema,
      },
      detail: {
        summary: "建立貼文留言",
      },
    },
  )
  .put(
    "/:id",
    async ({ db, params, body, status, user }) => {
      if (body.content.trim() === "") {
        return status(422, { message: "content不可為空白" });
      }

      const reply = await db.query.replyTable.findFirst({
        where: (table, { eq }) => eq(table.id, params.id),
      });
      if (!reply) {
        return status(404, { message: "找不到此留言" });
      }

      if (reply.userId !== user.userId) {
        return status(403, { message: "無權限修改此留言" });
      }

      await db
        .update(replyTable)
        .set({ content: body.content, updatedAt: new Date() })
        .where(eq(replyTable.id, params.id));

      return { message: "留言更新成功" };
    },
    {
      params: t.Object({
        id: t.Integer(),
      }),
      body: t.Object({
        content: t.String(),
      }),
      response: {
        200: MessageSchema,
        403: MessageSchema,
        404: MessageSchema,
        422: MessageSchema,
      },
      detail: {
        summary: "更新留言",
        description:
          "更新指定的留言內容。需要 Token 認證，且只能修改自己的留言。",
      },
    },
  )
  .delete(
    "/:id",
    async ({ db, params, status, user }) => {
      const reply = await db.query.replyTable.findFirst({
        where: (table, { eq }) => eq(table.id, params.id),
      });
      if (!reply) {
        return status(404, { message: "找不到此留言" });
      }

      if (reply.userId !== user.userId) {
        return status(403, { message: "無權限刪除此留言" });
      }

      await db.delete(replyTable).where(eq(replyTable.id, params.id));

      return { message: "留言刪除成功" };
    },
    {
      params: t.Object({
        id: t.Integer(),
      }),
      response: {
        200: MessageSchema,
        403: MessageSchema,
        404: MessageSchema,
      },
      detail: {
        summary: "刪除留言",
        description: "刪除指定的留言。需要 Token 認證，且只能刪除自己的留言。",
      },
    },
  );
