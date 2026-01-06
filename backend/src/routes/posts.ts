import { t } from "elysia";
import { posts, topics, postLikes } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { routeHandler } from "@/lib/routeHandler";
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
      const allPosts = await db.query.posts.findMany({
        limit: query.limit,
        extras: {
          likesCount: sql<number>`(
            SELECT COUNT(*)
            FROM ${postLikes}
            WHERE ${postLikes.postId} = ${posts.id}
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
      }),
      response: {
        200: t.Array(PostSchema),
      },
      detail: {
        summary: "取得貼文列表",
        description:
          "取得貼文列表，可選擇性地使用搜尋關鍵字、限制回傳數量和排序方式。預設按建立時間降序排列。",
      },
    },
  )
  .get(
    "/:id",
    async ({ db, params, status }) => {
      const post = await db.query.posts.findFirst({
        where: eq(posts.id, params.id),
        extras: {
          likesCount: sql<number>`(
            SELECT COUNT(*)
            FROM ${postLikes}
            WHERE ${postLikes.postId} = ${posts.id}
          )`.as("likesCount"),
        },
      });
      if (!post) {
        return status(404, { message: "找不到此貼文" });
      }
      return post;
    },
    {
      params: t.Object({
        id: t.Number(),
      }),
      response: {
        200: PostSchema,
        404: t.Object({ message: t.String() }),
      },
      detail: {
        summary: "取得單一貼文",
        description: "根據貼文 ID 取得單一貼文的詳細資訊。",
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
        401: t.Object({ message: t.String() }),
        422: t.Object({ message: t.String() }),
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
        const existingTopic = await db.query.topics.findFirst({
          where: eq(topics.name, body.topics),
        });
        if (!existingTopic) {
          await db.insert(topics).values({ name: body.topics });
        }
      }

      const [newPost] = await db
        .insert(posts)
        .values({
          ...body,
          creator: user.userId,
        })
        .returning();

      const postWithLikes = await db.query.posts.findFirst({
        where: eq(posts.id, newPost.id),
        extras: {
          likesCount: sql<number>`(
            SELECT COUNT(*)
            FROM ${postLikes}
            WHERE ${postLikes.postId} = ${posts.id}
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
        401: t.Object({ message: t.String() }),
        422: t.Object({ message: t.String() }),
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

      const post = await db.query.posts.findFirst({
        where: eq(posts.id, params.id),
      });
      if (!post) {
        return status(404, { message: "找不到此貼文" });
      }

      if (body.topics) {
        const existingTopic = await db.query.topics.findFirst({
          where: eq(topics.name, body.topics),
        });
        if (!existingTopic) {
          await db.insert(topics).values({ name: body.topics });
        }
      }

      await db.update(posts).set(body).where(eq(posts.id, params.id));
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
        200: t.Object({ message: t.String() }),
        401: t.Object({ message: t.String() }),
        404: t.Object({ message: t.String() }),
        422: t.Object({ message: t.String() }),
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
    async ({ db, params, status }) => {
      const post = await db.query.posts.findFirst({
        where: eq(posts.id, params.id),
      });
      if (!post) {
        return status(404, { message: "找不到此貼文" });
      }

      await db.delete(posts).where(eq(posts.id, params.id));
      return { message: "貼文刪除成功" };
    },
    {
      params: t.Object({
        id: t.Number(),
      }),
      response: {
        200: t.Object({ message: t.String() }),
        401: t.Object({ message: t.String() }),
        404: t.Object({ message: t.String() }),
      },
      detail: {
        summary: "刪除貼文",
        description: "刪除指定的貼文。需要 Token 認證。",
      },
    },
  )
  .post(
    "/:id/like",
    async ({ db, params, body, status, user }) => {
      const post = await db.query.posts.findFirst({
        where: eq(posts.id, params.id),
      });
      if (!post) {
        return status(404, { message: "找不到此貼文" });
      }

      const existingLike = await db.query.postLikes.findFirst({
        where: and(
          eq(postLikes.userId, user.userId),
          eq(postLikes.postId, params.id),
        ),
      });

      if (body.liked && !existingLike) {
        await db.insert(postLikes).values({
          userId: user.userId,
          postId: params.id,
        });
        return { message: "按讚成功", liked: true };
      } else if (!body.liked && existingLike) {
        await db
          .delete(postLikes)
          .where(
            and(
              eq(postLikes.userId, user.userId),
              eq(postLikes.postId, params.id),
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
        401: t.Object({ message: t.String() }),
        404: t.Object({ message: t.String() }),
      },
      detail: {
        summary: "更新按讚狀態",
        description:
          "更新對指定貼文的按讚狀態。需要 Token 認證。傳送 { liked: true } 按讚，{ liked: false } 取消按讚。",
      },
    },
  )
  .get(
    "/:id/liked",
    async ({ db, params, status, user }) => {
      const post = await db.query.posts.findFirst({
        where: eq(posts.id, params.id),
      });
      if (!post) {
        return status(404, { message: "找不到此貼文" });
      }

      const existingLike = await db.query.postLikes.findFirst({
        where: and(
          eq(postLikes.userId, user.userId),
          eq(postLikes.postId, params.id),
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
        401: t.Object({ message: t.String() }),
        404: t.Object({ message: t.String() }),
      },
      detail: {
        summary: "檢查是否按讚",
        description: "檢查當前使用者是否對指定貼文按讚。需要 token 認證。",
      },
    },
  );
