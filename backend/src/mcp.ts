import { mcp } from "elysia-mcp";
import { treaty } from "@elysiajs/eden";
import { z } from "zod";
import type { Route } from "./api.js";
import { jwtPlugin } from "@/lib/jwt";

const { api } = treaty<Route>("http://localhost:3000");

// Get the JWT signer from the existing plugin
const { jwt } = jwtPlugin.decorator;
const generateToken = (userId: number) => jwt.sign({ userId });

const textContent = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
});

const errorContent = (error: unknown) => ({
  content: [
    {
      type: "text" as const,
      text: `Error: ${error instanceof Error ? error.message : String(error)}`,
    },
  ],
  isError: true,
});

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
          const { data, error } = await api.posts.get({
            query: { limit: 50 },
          });
          if (error) return errorContent(error);
          return textContent(data?.data);
        } catch (error) {
          return errorContent(error);
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
          const { data, error } = await api.users.get({
            query: { limit: 50 },
          });
          if (error) return errorContent(error);
          return textContent(data?.data);
        } catch (error) {
          return errorContent(error);
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
          const { data, error } = await api.topics.get();
          if (error) return errorContent(error);
          return textContent(data?.data);
        } catch (error) {
          return errorContent(error);
        }
      },
    );

    s.registerTool(
      "get_post",
      {
        description: "取得單一貼文",
        inputSchema: z.object({
          id: z.number().describe("貼文 ID"),
          includeReplies: z.boolean().optional().describe("是否包含留言"),
        }),
      },
      async ({ id, includeReplies }) => {
        try {
          const { data, error } = await api.posts({ id }).get({
            query: { includeReplies },
          });
          if (error) return errorContent(error);
          return textContent(data);
        } catch (error) {
          return errorContent(error);
        }
      },
    );

    s.registerTool(
      "get_replies_by_post",
      {
        description: "取得指定貼文的所有留言",
        inputSchema: z.object({
          postId: z.coerce.number().describe("貼文 ID"),
        }),
      },
      async ({ postId }) => {
        try {
          const { data, error } = await api.post.reply({ postId }).get();
          if (error) return errorContent(error);
          return textContent(data?.data);
        } catch (error) {
          return errorContent(error);
        }
      },
    );

    s.registerTool(
      "create_post",
      {
        description: "建立新貼文（需要提供使用者 ID）",
        inputSchema: z.object({
          userId: z.number().describe("使用者 ID"),
          title: z.string().describe("貼文標題"),
          content: z.string().describe("貼文內容"),
          topics: z.string().describe("貼文主題"),
          images: z.array(z.string()).optional().describe("圖片 URL 陣列"),
        }),
      },
      async ({ userId, title, content, topics, images }) => {
        try {
          const token = await generateToken(userId);
          const { data, error } = await api.posts.post(
            { title, content, topics, images: images ?? [] },
            { headers: { Authorization: `Bearer ${token}` } },
          );
          if (error) return errorContent(error);
          return textContent(data);
        } catch (error) {
          return errorContent(error);
        }
      },
    );

    s.registerTool(
      "delete_post",
      {
        description: "刪除指定貼文（需要提供使用者 ID，只能刪除自己的貼文）",
        inputSchema: z.object({
          userId: z.number().describe("使用者 ID"),
          id: z.number().describe("貼文 ID"),
        }),
      },
      async ({ userId, id }) => {
        try {
          const token = await generateToken(userId);
          const { data, error } = await api.posts({ id }).delete(
            {},
            { headers: { Authorization: `Bearer ${token}` } },
          );
          if (error) return errorContent(error);
          return textContent(data);
        } catch (error) {
          return errorContent(error);
        }
      },
    );

    s.registerTool(
      "update_user",
      {
        description: "更新使用者資料（名稱、描述）",
        inputSchema: z.object({
          userId: z.number().describe("使用者 ID"),
          name: z.string().optional().describe("新的使用者名稱"),
          description: z.string().nullable().optional().describe("新的使用者描述"),
        }),
      },
      async ({ userId, name, description }) => {
        try {
          const token = await generateToken(userId);
          const { data, error } = await api.users.patch(
            { name, description },
            { headers: { Authorization: `Bearer ${token}` } },
          );
          if (error) return errorContent(error);
          return textContent(data);
        } catch (error) {
          return errorContent(error);
        }
      },
    );
  },
});
