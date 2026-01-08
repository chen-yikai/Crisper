import { postTable, likeTable } from "@/db/schema";
import { authHandler } from "@/lib/authHandler";
import { routeHandler } from "@/lib/routeHandler";
import { MessageSchema } from "@/lib/messageObject";
import { eq, and } from "drizzle-orm";
import { t } from "elysia";

export const likesRoute = routeHandler("posts/likes", "Likes")
  .use(authHandler)
  .post(
    ":id",
    async ({ db, params, body, status, user }) => {
      const post = await db.query.postTable.findFirst({
        where: eq(postTable.id, params.id),
      });
      if (!post) {
        return status(404, { message: "找不到此貼文" });
      }

      const existingLike = await db.query.likeTable.findFirst({
        where: and(
          eq(likeTable.userId, user.userId),
          eq(likeTable.postId, params.id),
        ),
      });

      if (body.liked && !existingLike) {
        await db.insert(likeTable).values({
          userId: user.userId,
          postId: params.id,
        });
        return { message: "按讚成功", liked: true };
      } else if (!body.liked && existingLike) {
        await db
          .delete(likeTable)
          .where(
            and(
              eq(likeTable.userId, user.userId),
              eq(likeTable.postId, params.id),
            ),
          );
        return { message: "取消按讚成功", liked: false };
      }

      return { message: "狀態無變更", liked: !!existingLike };
    },
    {
      params: t.Object({
        id: t.Number(),
      }),
      body: t.Object({
        liked: t.Boolean(),
      }),
      response: {
        200: t.Object({ message: t.String(), liked: t.Boolean() }),
        401: MessageSchema,
        404: MessageSchema,
      },
      detail: {
        summary: "更新按讚狀態",
        description:
          "更新對指定貼文的按讚狀態。需要 Token 認證。傳送 { liked: true } 按讚，{ liked: false } 取消按讚。",
      },
    },
  )
  .get(
    ":id",
    async ({ db, params, status, user }) => {
      const post = await db.query.postTable.findFirst({
        where: eq(postTable.id, params.id),
      });
      if (!post) {
        return status(404, { message: "找不到此貼文" });
      }

      const existingLike = await db.query.likeTable.findFirst({
        where: and(
          eq(likeTable.userId, user.userId),
          eq(likeTable.postId, params.id),
        ),
      });

      return { postId: post.id, liked: !!existingLike };
    },
    {
      params: t.Object({
        id: t.Number(),
      }),
      response: {
        200: t.Object({ postId: t.Number(), liked: t.Boolean() }),
        401: MessageSchema,
        404: MessageSchema,
      },
      detail: {
        summary: "檢查是否按讚",
        description: "檢查當前使用者是否對指定貼文按讚。需要 token 認證。",
      },
    },
  );
