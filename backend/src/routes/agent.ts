import { t } from "elysia";
import { authHandler } from "@/lib/authHandler";
import { routeHandler } from "@/lib/routeHandler";
import { MessageSchema } from "@/lib/messageObject";
import { ChatOllama } from "@langchain/ollama";
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { treaty } from "@elysiajs/eden";
import type { Route } from "../api.js";
import { jwtPlugin } from "@/lib/jwt";

const MessageItemSchema = t.Object({
  role: t.Union([t.Literal("user"), t.Literal("assistant")]),
  content: t.String(),
});

const modelName = process.env.OLLAMA_MODEL || "qwen2.5:0.5b";
const ollamaBaseUrl = process.env.OLLAMA_HOST || "http://localhost:11434";

// Setup API client and JWT for tool authentication
const { api } = treaty<Route>("http://localhost:3000");
const { jwt } = jwtPlugin.decorator;
const generateToken = (userId: number) => jwt.sign({ userId });

// Define LangChain tools that mirror the MCP tools
const getAllPostsTool = tool(
  async () => {
    const { data, error } = await api.posts.get({ query: { limit: 50 } });
    if (error) return `Error: ${JSON.stringify(error)}`;
    return JSON.stringify(data?.data, null, 2);
  },
  {
    name: "get_all_posts",
    description: "取得crisper平台上所有的貼文",
    schema: z.object({}),
  },
);

const getAllUsersTool = tool(
  async () => {
    const { data, error } = await api.users.get({ query: { limit: 50 } });
    if (error) return `Error: ${JSON.stringify(error)}`;
    return JSON.stringify(data?.data, null, 2);
  },
  {
    name: "get_all_users",
    description: "取得crisper平台上所有的使用者（不包含密碼）",
    schema: z.object({}),
  },
);

const getAllTopicsTool = tool(
  async () => {
    const { data, error } = await api.topics.get();
    if (error) return `Error: ${JSON.stringify(error)}`;
    return JSON.stringify(data?.data, null, 2);
  },
  {
    name: "get_all_topics",
    description: "取得crisper平台上所有的主題",
    schema: z.object({}),
  },
);

const getPostTool = tool(
  async ({ id, includeReplies }) => {
    const { data, error } = await api.posts({ id }).get({
      query: { includeReplies },
    });
    if (error) return `Error: ${JSON.stringify(error)}`;
    return JSON.stringify(data, null, 2);
  },
  {
    name: "get_post",
    description: "取得單一貼文",
    schema: z.object({
      id: z.number().describe("貼文 ID"),
      includeReplies: z.boolean().optional().describe("是否包含留言"),
    }),
  },
);

const getRepliesByPostTool = tool(
  async ({ postId }) => {
    const { data, error } = await api.post.reply({ postId }).get();
    if (error) return `Error: ${JSON.stringify(error)}`;
    return JSON.stringify(data?.data, null, 2);
  },
  {
    name: "get_replies_by_post",
    description: "取得指定貼文的所有留言",
    schema: z.object({
      postId: z.number().describe("貼文 ID"),
    }),
  },
);

const createPostTool = tool(
  async ({ userId, title, content, topics, images }) => {
    const token = await generateToken(userId);
    const { data, error } = await api.posts.post(
      { title, content, topics, images: images ?? [] },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (error) return `Error: ${JSON.stringify(error)}`;
    return JSON.stringify(data, null, 2);
  },
  {
    name: "create_post",
    description: "建立新貼文（需要提供使用者 ID）",
    schema: z.object({
      userId: z.number().describe("使用者 ID"),
      title: z.string().describe("貼文標題"),
      content: z.string().describe("貼文內容"),
      topics: z.string().describe("貼文主題"),
      images: z.array(z.string()).optional().describe("圖片 URL 陣列"),
    }),
  },
);

const deletePostTool = tool(
  async ({ userId, id }) => {
    const token = await generateToken(userId);
    const { data, error } = await api
      .posts({ id })
      .delete({}, { headers: { Authorization: `Bearer ${token}` } });
    if (error) return `Error: ${JSON.stringify(error)}`;
    return JSON.stringify(data, null, 2);
  },
  {
    name: "delete_post",
    description: "刪除指定貼文（需要提供使用者 ID，只能刪除自己的貼文）",
    schema: z.object({
      userId: z.number().describe("使用者 ID"),
      id: z.number().describe("貼文 ID"),
    }),
  },
);

const updateUserTool = tool(
  async ({ userId, name, description }) => {
    const token = await generateToken(userId);
    const { data, error } = await api.users.patch(
      { name, description },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (error) return `Error: ${JSON.stringify(error)}`;
    return JSON.stringify(data, null, 2);
  },
  {
    name: "update_user",
    description: "更新使用者資料（名稱、描述）",
    schema: z.object({
      userId: z.number().describe("使用者 ID"),
      name: z.string().optional().describe("新的使用者名稱"),
      description: z.string().nullable().optional().describe("新的使用者描述"),
    }),
  },
);

const tools = [
  getAllPostsTool,
  getAllUsersTool,
  getAllTopicsTool,
  getPostTool,
  getRepliesByPostTool,
  createPostTool,
  deletePostTool,
  updateUserTool,
];

export const crispyRoute = routeHandler("agent")
  .use(authHandler)
  .post(
    "/",
    async ({ body, user, status }) => {
      const userId = user.userId;

      const systemPrompt = `你是 Crisper 社群平台的 AI 助理。你的名字叫做 Crispy。
目前登入使用者 ID: ${userId}。
你的任務是根據使用者需求，精確地調用工具。
請遵守以下規則：
1. 優先辨識使用者提到的「標題」、「內容」與「主題」。
2. 使用繁體中文回覆。
3. 使用前面提到的使用者ID執行一些需要ID的工具`;

      try {
        const llm = new ChatOllama({
          model: modelName,
          baseUrl: ollamaBaseUrl,
          temperature: 0.7,
        });

        const llmWithTools = llm.bindTools(tools);

        // Convert incoming messages to LangChain format
        const langchainMessages = [
          new SystemMessage(systemPrompt),
          ...body.messages.map((msg) =>
            msg.role === "user"
              ? new HumanMessage(msg.content)
              : new AIMessage(msg.content),
          ),
        ];

        // Initial LLM call
        let response = await llmWithTools.invoke(langchainMessages);

        // Handle tool calls in a loop (agent loop)
        while (response.tool_calls && response.tool_calls.length > 0) {
          const toolResults = [];

          for (const toolCall of response.tool_calls) {
            const selectedTool = tools.find((t) => t.name === toolCall.name);
            if (selectedTool) {
              const result = await selectedTool.invoke(toolCall.args);
              toolResults.push({
                tool_call_id: toolCall.id,
                content:
                  typeof result === "string" ? result : JSON.stringify(result),
              });
            }
          }

          // Add the AI response and tool results to the conversation
          langchainMessages.push(response);
          for (const result of toolResults) {
            langchainMessages.push(
              new ToolMessage({
                content: result.content,
                tool_call_id: result.tool_call_id,
              }),
            );
          }

          // Get next response
          response = await llmWithTools.invoke(langchainMessages);
        }

        const assistantMessage = {
          role: "assistant" as const,
          content:
            typeof response.content === "string"
              ? response.content
              : JSON.stringify(response.content),
        };

        return {
          messages: [...body.messages, assistantMessage],
        };
      } catch (error) {
        console.error("Agent error:", error);
        return status(500, { message: "Crispy發生錯誤" });
      }
    },
    {
      body: t.Object({
        messages: t.Array(MessageItemSchema, { minItems: 1 }),
      }),
      response: {
        200: t.Object({
          messages: t.Array(MessageItemSchema),
        }),
        401: MessageSchema,
        500: MessageSchema,
      },
      detail: {
        summary: "與Crispy對話",
        description:
          "與 AI 助理 Crispy 對話。傳入訊息歷史陣列，回傳更新後的訊息歷史陣列（包含 AI 回覆）。需要 Token 認證。",
      },
    },
  );
