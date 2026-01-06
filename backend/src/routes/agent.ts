import { t } from "elysia";
import { routeHandler } from "@/lib/routeHandler";
import { Ollama } from "ollama";
import type { Message } from "ollama";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// Create Ollama client
const ollama = new Ollama({ host: "http://localhost:11434" });

// MCP client setup
let mcpClient: Client | null = null;

async function initializeMCPClient() {
  if (mcpClient) {
    return mcpClient;
  }

  const transport = new StdioClientTransport({
    command: "node",
    args: ["--loader", "tsx", "./src/index.ts"],
  });

  mcpClient = new Client(
    {
      name: "crisper-agent",
      version: "1.0.0",
    },
    {
      capabilities: {},
    },
  );

  await mcpClient.connect(transport);
  return mcpClient;
}

// Function to call MCP tools
async function callMCPTool(toolName: string, args: any = {}) {
  try {
    const client = await initializeMCPClient();
    const result = await client.callTool({
      name: toolName,
      arguments: args,
    });
    return result;
  } catch (error) {
    console.error("Error calling MCP tool:", error);
    return {
      content: [
        {
          type: "text",
          text: `Error calling tool ${toolName}: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
      isError: true,
    };
  }
}

// Function to handle agent chat with MCP integration
async function handleAgentChat(
  userMessage: string,
  model: string = "llama3.2",
) {
  const messages: Message[] = [
    {
      role: "system",
      content: `You are a helpful assistant for the Crisper platform. You have access to the following tools:
- get_all_posts: 取得crisper平台上所有的貼文
- get_all_users: 取得crisper平台上所有的使用者（不包含密碼）
- get_all_topics: 取得crisper平台上所有的主題

When you need information from the database, indicate which tool you want to use by responding with a JSON object in this format:
{"tool": "tool_name", "reason": "why you need this tool"}

After receiving tool results, provide a helpful response to the user based on that data.`,
    },
    {
      role: "user",
      content: userMessage,
    },
  ];

  // First call to get LLM's response
  let response = await ollama.chat({
    model,
    messages,
    stream: false,
  });

  let iterations = 0;
  const maxIterations = 5;

  // Tool calling loop
  while (iterations < maxIterations) {
    const content = response.message.content;

    // Check if the response contains a tool call request
    let toolRequest;
    try {
      // Try to find JSON in the response
      const jsonMatch = content.match(/\{[^}]*"tool"[^}]*\}/);
      if (jsonMatch) {
        toolRequest = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // Not a tool call, just a regular response
      break;
    }

    if (!toolRequest || !toolRequest.tool) {
      break;
    }

    // Call the MCP tool
    const toolResult = await callMCPTool(toolRequest.tool);

    // Extract text content from tool result
    const toolResultText =
      toolResult.content
        ?.map((c: any) => (c.type === "text" ? c.text : ""))
        .join("\n") || "No result";

    // Add tool result to conversation
    messages.push({
      role: "assistant",
      content: content,
    });

    messages.push({
      role: "user",
      content: `Tool result for ${toolRequest.tool}:\n${toolResultText}\n\nNow please provide a helpful response to the original question based on this data.`,
    });

    // Get LLM's response with tool results
    response = await ollama.chat({
      model,
      messages,
      stream: false,
    });

    iterations++;
  }

  return {
    response: response.message.content,
    iterations,
  };
}

export const agentRoute = routeHandler("agent")
  .post(
    "/chat",
    async ({ body, status }) => {
      try {
        const result = await handleAgentChat(body.message, body.model);

        return {
          message: "Success",
          data: {
            response: result.response,
            iterations: result.iterations,
          },
        };
      } catch (error) {
        console.error("Error in agent chat:", error);
        return status(500, {
          message: "處理請求時發生錯誤",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
    {
      body: t.Object({
        message: t.String(),
        model: t.Optional(t.String()),
      }),
      response: {
        200: t.Object({
          message: t.String(),
          data: t.Object({
            response: t.String(),
            iterations: t.Number(),
          }),
        }),
        500: t.Object({
          message: t.String(),
          error: t.Optional(t.String()),
        }),
      },
      detail: {
        summary: "與 AI Agent 對話",
        description:
          "發送訊息給 AI Agent，Agent 會使用 Ollama API 並可以存取 MCP 工具來查詢資料庫資訊。",
      },
    },
  )
  .get(
    "/models",
    async ({ status }) => {
      try {
        const models = await ollama.list();
        return {
          message: "Success",
          models: models.models.map((m) => ({
            name: m.name,
            size: m.size,
            modified_at: m.modified_at,
          })),
        };
      } catch (error) {
        console.error("Error listing models:", error);
        return status(500, {
          message: "取得模型列表時發生錯誤",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
    {
      response: {
        200: t.Object({
          message: t.String(),
          models: t.Array(
            t.Object({
              name: t.String(),
              size: t.Number(),
              modified_at: t.String(),
            }),
          ),
        }),
        500: t.Object({
          message: t.String(),
          error: t.Optional(t.String()),
        }),
      },
      detail: {
        summary: "取得可用的 Ollama 模型列表",
        description: "列出本地 Ollama 伺服器上所有可用的模型。",
      },
    },
  );
