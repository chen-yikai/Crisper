import { mcp } from "elysia-mcp";
import { db } from "@/db";

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
          const posts = await db.query.posts.findMany({
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
          const users = await db.query.users.findMany({
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
          const topics = await db.query.topics.findMany();
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
  },
});
