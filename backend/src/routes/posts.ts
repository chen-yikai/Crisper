import { t } from "elysia";
import { postTable, topicTable, likeTable, replyTable } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { routeHandler } from "@/lib/routeHandler";
import { MessageSchema } from "@/lib/messageObject";
import { authHandler } from "@/lib/authHandler";
import { nanoid } from "nanoid";

const PostSchema = t.Object({
  id: t.Number(),
  creator: t.Number(),
  title: t.String(),
  content: t.String(),
  topics: t.Union([t.String(), t.Null()]),
  images: t.Union([t.Array(t.String()), t.Null()]),
  likesCount: t.Number(),
  createdAt: t.Date(),
  updateAt: t.Date(),
});

const ReplySchema = t.Object({
  id: t.Number(),
  postId: t.Number(),
  userId: t.Number(),
  content: t.String(),
  createdAt: t.Date(),
  updatedAt: t.Date(),
});

const PostWithRepliesSchema = t.Object({
  id: t.Number(),
  creator: t.Number(),
  title: t.String(),
  content: t.String(),
  topics: t.Union([t.String(), t.Null()]),
  images: t.Union([t.Array(t.String()), t.Null()]),
  likesCount: t.Number(),
  createdAt: t.Date(),
  updateAt: t.Date(),
  replies: t.Array(ReplySchema),
});

const validateImagesExist = async (images?: string[] | null) => {
  if (!images || images.length === 0) return true;
  for (const url of images) {
    const base = url.split("/").pop();
    const filePath = `./data/posts/${base}`;
    const file = Bun.file(filePath);
    if (!(await file.exists())) {
      return false;
    }
  }
  return true;
};

export const postsRoute = routeHandler("posts")
  .get(
    "/",
    async ({ db, query }) => {
      const allPosts = await db.query.postTable.findMany({
        limit: query.limit,
        extras: {
          likesCount: sql<number>`(
            SELECT COUNT(*)
            FROM ${likeTable}
            WHERE ${likeTable.postId} = ${postTable.id}
          )`.as("likesCount"),
        },
        where: (table, { like, sql }) =>
          like(
            sql`lower(${table.title})`,
            `%${(query.search ?? "").toLowerCase()}%`,
          ),
        orderBy: (table, { asc, desc }) => {
          const order = query.order === "asc" ? asc : desc;
          switch (query.sortBy) {
            case "title":
              return [order(table.title)];
            case "createdAt":
            default:
              return [order(table.createdAt)];
          }
        },
      });

      if (query.includeReplies) {
        const postsWithReplies = await Promise.all(
          allPosts.map(async (post) => {
            const replies = await db.query.replyTable.findMany({
              where: eq(replyTable.postId, post.id),
              orderBy: (table, { desc }) => [desc(table.createdAt)],
            });
            return { ...post, replies };
          }),
        );
        return postsWithReplies;
      }

      return allPosts;
    },
    {
      query: t.Object({
        search: t.Optional(t.String()),
        limit: t.Optional(t.Number()),
        sortBy: t.Optional(
          t.Union([t.Literal("title"), t.Literal("createdAt")]),
        ),
        order: t.Optional(t.Union([t.Literal("asc"), t.Literal("desc")])),
        includeReplies: t.Optional(t.Boolean()),
      }),
      response: {
        200: t.Union([t.Array(PostSchema), t.Array(PostWithRepliesSchema)]),
      },
      detail: {
        summary: "取得貼文列表",
        description:
          "取得貼文列表，可選擇性地使用搜尋關鍵字、限制回傳數量和排序方式。預設按建立時間降序排列。可選擇性地包含留言列表。",
      },
    },
  )
  .get(
    "/:id",
    async ({ db, params, query, status }) => {
      const post = await db.query.postTable.findFirst({
        where: eq(postTable.id, params.id),
        extras: {
          likesCount: sql<number>`(
            SELECT COUNT(*)
            FROM ${likeTable}
            WHERE ${likeTable.postId} = ${postTable.id}
          )`.as("likesCount"),
        },
      });
      if (!post) {
        return status(404, { message: "找不到此貼文" });
      }

      if (query.includeReplies) {
        const replies = await db.query.replyTable.findMany({
          where: eq(replyTable.postId, params.id),
          orderBy: (table, { desc }) => [desc(table.createdAt)],
        });
        return { ...post, replies };
      }

      return post;
    },
    {
      params: t.Object({
        id: t.Number(),
      }),
      query: t.Object({
        includeReplies: t.Optional(t.Boolean()),
      }),
      response: {
        200: t.Union([PostSchema, PostWithRepliesSchema]),
        404: MessageSchema,
      },
      detail: {
        summary: "取得單一貼文",
        description:
          "根據貼文 ID 取得單一貼文的詳細資訊。可選擇性地包含留言列表。",
      },
    },
  )
  .use(authHandler)
  .post(
    "/image",
    async ({ body, status }) => {
      const extNameSplit = body.image.name.split(".");
      if (extNameSplit.length < 2) {
        return status(422, { message: "檔案格式需包含副檔名" });
      }
      const extName = extNameSplit.pop();
      const fileName = `${nanoid()}.${extName}`;
      const filePath = `./data/posts/${fileName}`;
      const fileUrl = `/s3/posts/${fileName}`;

      await Bun.write(filePath, body.image);

      return {
        message: "圖片上傳成功",
        imageUrl: fileUrl,
      };
    },
    {
      body: t.Object({
        image: t.File({
          type: ["image/*"],
        }),
      }),
      response: {
        200: t.Object({
          message: t.String(),
          imageUrl: t.String(),
        }),
        401: MessageSchema,
        422: MessageSchema,
      },
      detail: {
        summary: "上傳貼文圖片",
        description:
          "上傳貼文圖片。需要 Token 認證。僅接受圖片檔案。回傳圖片 URL 供建立貼文時使用。",
      },
    },
  )
  .post(
    "/",
    async ({ db, body, status, user }) => {
      if (body.images) {
        const imagesValid = await validateImagesExist(body.images ?? null);
        if (!imagesValid) {
          return status(422, { message: "圖片不存在或路徑無效" });
        }
      }

      if (body.topics) {
        const existingTopic = await db.query.topicTable.findFirst({
          where: eq(topicTable.name, body.topics),
        });
        if (!existingTopic) {
          await db.insert(topicTable).values({ name: body.topics });
        }
      }

      const [newPost] = await db
        .insert(postTable)
        .values({
          ...body,
          creator: user.userId,
        })
        .returning();

      const postWithLikes = await db.query.postTable.findFirst({
        where: eq(postTable.id, newPost.id),
        extras: {
          likesCount: sql<number>`(
            SELECT COUNT(*)
            FROM ${likeTable}
            WHERE ${likeTable.postId} = ${postTable.id}
          )`.as("likesCount"),
        },
      });

      return {
        message: "貼文建立成功",
        post: postWithLikes,
      };
    },
    {
      body: t.Object({
        title: t.String(),
        content: t.String(),
        topics: t.Optional(t.String()),
        images: t.Optional(t.Array(t.String())),
      }),
      response: {
        200: t.Object({
          message: t.String(),
          post: PostSchema,
        }),
        401: MessageSchema,
        422: MessageSchema,
      },
      detail: {
        summary: "建立新貼文",
        description:
          "建立新的貼文。需要 Token 認證。可選擇性地指定主題和圖片 URL 陣列（先透過 /image 端點上傳圖片取得 URL）。",
      },
    },
  )
  .put(
    "/:id",
    async ({ db, params, body, status, user }) => {
      const imagesValid = await validateImagesExist(body.images ?? null);
      if (!imagesValid) {
        return status(422, { message: "圖片不存在或路徑無效" });
      }

      const post = await db.query.postTable.findFirst({
        where: eq(postTable.id, params.id),
      });
      if (!post) {
        return status(404, { message: "找不到此貼文" });
      }

      if (post.creator !== user.userId) {
        return status(403, { message: "無權限修改此貼文" });
      }

      if (body.topics) {
        const existingTopic = await db.query.topicTable.findFirst({
          where: eq(topicTable.name, body.topics),
        });
        if (!existingTopic) {
          await db.insert(topicTable).values({ name: body.topics });
        }
      }

      await db
        .update(postTable)
        .set({ ...body, updateAt: new Date() })
        .where(eq(postTable.id, params.id));
      return { message: "貼文更新成功" };
    },
    {
      params: t.Object({
        id: t.Number(),
      }),
      body: t.Object({
        title: t.Optional(t.String()),
        content: t.Optional(t.String()),
        topics: t.Optional(t.String()),
        images: t.Optional(t.Array(t.String())),
      }),
      response: {
        200: MessageSchema,
        401: MessageSchema,
        403: MessageSchema,
        404: MessageSchema,
        422: MessageSchema,
      },
      detail: {
        summary: "更新貼文",
        description:
          "更新指定的貼文。需要 Token 認證。可更新標題、內容、主題或圖片。",
      },
    },
  )
  .delete(
    "/:id",
    async ({ db, params, status, user }) => {
      const post = await db.query.postTable.findFirst({
        where: eq(postTable.id, params.id),
      });
      if (!post) {
        return status(404, { message: "找不到此貼文" });
      }

      if (post.creator !== user.userId) {
        return status(403, { message: "無權限刪除此貼文" });
      }

      await db.delete(postTable).where(eq(postTable.id, params.id));
      return { message: "貼文刪除成功" };
    },
    {
      params: t.Object({
        id: t.Number(),
      }),
      response: {
        200: MessageSchema,
        401: MessageSchema,
        403: MessageSchema,
        404: MessageSchema,
      },
      detail: {
        summary: "刪除貼文",
        description: "刪除指定的貼文。需要 Token 認證。",
      },
    },
  );
