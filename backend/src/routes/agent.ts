import { t } from "elysia";
import { authHandler } from "@/lib/authHandler";
import { routeHandler } from "@/lib/routeHandler";
import { MessageSchema } from "@/lib/messageObject";

const MessageItemSchema = t.Object({
  role: t.Union([t.Literal("user"), t.Literal("assistant")]),
  content: t.String(),
});

const model = process.env.OLLAMA_MODEL || "qwen2.5:0.5b";

export const crispyRoute = routeHandler("agent")
  .use(authHandler)
  .post(
    "/",
    async ({ body, user, status }) => {
      const userId = user.userId;

      const systemMessage = {
        role: "system",
        content: `你是 Crisper 社群平台的 AI 助理。你的名字叫做 Crispy。
目前登入使用者 ID: ${userId}。
你的任務是根據使用者需求，精確地調用 MCP 工具（Model Context Protocol）。
請遵守以下規則：
1. 優先辨識使用者提到的「標題」、「內容」與「主題」。
2. 若缺少必要資訊，請直接詢問使用者。
3. 使用繁體中文回覆。
4. 使用前面提到的使用者ID執行一些需要ID的工具`,
      };

      const payload = {
        model: model,
        stream: false,
        messages: [systemMessage, ...body.messages],
        options: {
          temperature: 0.7,
          num_ctx: 4096,
        },
      };

      try {
        const response = await fetch(`${process.env.OLLAMA_BRIDGE}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          return status(502, { message: "無法連線Crispy" });
        }

        const result = await response.json();
        const assistantMessage = {
          role: "assistant" as const,
          content: result.message?.content ?? result.response ?? "",
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
        502: MessageSchema,
      },
      detail: {
        summary: "與Crispy對話",
        description:
          "與 AI 助理 Crispy 對話。傳入訊息歷史陣列，回傳更新後的訊息歷史陣列（包含 AI 回覆）。需要 Token 認證。",
      },
    },
  );
