import { mcp } from "elysia-mcp";
import { db } from "@/db";
import { postTable, replyTable, topicTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

export const mcpPlugin = mcp({
  serverInfo: {
    name: "crisper-db-tools",
    version: "1.0.0",
  },
  capabilities: {
    tools: {},
  },
  enableJsonResponse: true,
  setupServer: async (s) => {
    s.registerTool(
      "get_all_posts",
      {
        description: "取得crisper平台上所有的貼文",
      },
      async () => {
        try {
          const posts = await db.query.postTable.findMany({
            limit: 50,
          });
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(posts, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
              },
            ],
            isError: true,
          };
        }
      },
    );

    s.registerTool(
      "get_all_users",
      {
        description: "取得crisper平台上所有的使用者（不包含密碼）",
      },
      async () => {
        try {
          const users = await db.query.userTable.findMany({
            columns: {
              password: false,
            },
            limit: 50,
          });
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(users, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
              },
            ],
            isError: true,
          };
        }
      },
    );

    s.registerTool(
      "get_all_topics",
      {
        description: "取得crisper平台上所有的主題",
      },
      async () => {
        try {
          const topics = await db.query.topicTable.findMany();
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(topics, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
              },
            ],
            isError: true,
          };
        }
      },
    );
    s.registerTool(
      "create_post",
      {
        description: "建立新貼文",
        inputSchema: z.object({
          creator: z.number().describe("建立者的使用者 ID"),
          title: z.string().describe("貼文標題"),
          content: z.string().describe("貼文內容"),
          topics: z.string().optional().describe("貼文主題"),
        }),
      },
      async ({ creator, title, content, topics }) => {
        try {
          if (topics) {
            const existingTopic = await db.query.topicTable.findFirst({
              where: eq(topicTable.name, topics),
            });
            if (!existingTopic) {
              await db.insert(topicTable).values({ name: topics });
            }
          }
          const [newPost] = await db
            .insert(postTable)
            .values({ creator, title, content, topics })
            .returning();
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  { message: "貼文建立成功", post: newPost },
                  null,
                  2,
                ),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
              },
            ],
            isError: true,
          };
        }
      },
    );

    s.registerTool(
      "update_post",
      {
        description: "更新貼文",
        inputSchema: z.object({
          id: z.number().describe("貼文 ID"),
          title: z.string().optional().describe("新標題"),
          content: z.string().optional().describe("新內容"),
          topics: z.string().optional().describe("新主題"),
        }),
      },
      async ({ id, title, content, topics }) => {
        try {
          const post = await db.query.postTable.findFirst({
            where: eq(postTable.id, id),
          });
          if (!post) {
            return {
              content: [{ type: "text", text: "Error: 找不到此貼文" }],
              isError: true,
            };
          }
          if (topics) {
            const existingTopic = await db.query.topicTable.findFirst({
              where: eq(topicTable.name, topics),
            });
            if (!existingTopic) {
              await db.insert(topicTable).values({ name: topics });
            }
          }
          await db
            .update(postTable)
            .set({ title, content, topics, updateAt: new Date() })
            .where(eq(postTable.id, id));
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ message: "貼文更新成功" }, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
              },
            ],
            isError: true,
          };
        }
      },
    );

    s.registerTool(
      "delete_post",
      {
        description: "刪除貼文",
        inputSchema: z.object({
          id: z.number().describe("貼文 ID"),
        }),
      },
      async ({ id }) => {
        try {
          const post = await db.query.postTable.findFirst({
            where: eq(postTable.id, id),
          });
          if (!post) {
            return {
              content: [{ type: "text", text: "Error: 找不到此貼文" }],
              isError: true,
            };
          }
          await db.delete(postTable).where(eq(postTable.id, id));
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ message: "貼文刪除成功" }, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
              },
            ],
            isError: true,
          };
        }
      },
    );

    // Reply CRUD tools
    s.registerTool(
      "get_replies_by_post",
      {
        description: "取得指定貼文的所有留言",
        inputSchema: z.object({
          postId: z.number().describe("貼文 ID"),
        }),
      },
      async ({ postId }) => {
        try {
          const replies = await db.query.replyTable.findMany({
            where: eq(replyTable.postId, postId),
          });
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(replies, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
              },
            ],
            isError: true,
          };
        }
      },
    );

    s.registerTool(
      "create_reply",
      {
        description: "建立新留言",
        inputSchema: z.object({
          postId: z.number().describe("貼文 ID"),
          userId: z.number().describe("使用者 ID"),
          content: z.string().describe("留言內容"),
        }),
      },
      async ({ postId, userId, content }) => {
        try {
          const post = await db.query.postTable.findFirst({
            where: eq(postTable.id, postId),
          });
          if (!post) {
            return {
              content: [{ type: "text", text: "Error: 找不到此貼文" }],
              isError: true,
            };
          }
          const [newReply] = await db
            .insert(replyTable)
            .values({ postId, userId, content })
            .returning();
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  { message: "留言建立成功", reply: newReply },
                  null,
                  2,
                ),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
              },
            ],
            isError: true,
          };
        }
      },
    );

    s.registerTool(
      "update_reply",
      {
        description: "更新留言",
        inputSchema: z.object({
          id: z.number().describe("留言 ID"),
          content: z.string().describe("新留言內容"),
        }),
      },
      async ({ id, content }) => {
        try {
          const reply = await db.query.replyTable.findFirst({
            where: eq(replyTable.id, id),
          });
          if (!reply) {
            return {
              content: [{ type: "text", text: "Error: 找不到此留言" }],
              isError: true,
            };
          }
          await db
            .update(replyTable)
            .set({ content, updatedAt: new Date() })
            .where(eq(replyTable.id, id));
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ message: "留言更新成功" }, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
              },
            ],
            isError: true,
          };
        }
      },
    );

    s.registerTool(
      "delete_reply",
      {
        description: "刪除留言",
        inputSchema: z.object({
          id: z.number().describe("留言 ID"),
        }),
      },
      async ({ id }) => {
        try {
          const reply = await db.query.replyTable.findFirst({
            where: eq(replyTable.id, id),
          });
          if (!reply) {
            return {
              content: [{ type: "text", text: "Error: 找不到此留言" }],
              isError: true,
            };
          }
          await db.delete(replyTable).where(eq(replyTable.id, id));
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ message: "留言刪除成功" }, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
              },
            ],
            isError: true,
          };
        }
      },
    );
  },
});
