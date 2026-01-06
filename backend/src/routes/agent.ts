import { t } from "elysia";
import { routeHandler } from "@/lib/routeHandler";
import { Ollama } from "ollama";
import type { Message, Tool } from "ollama";

// Create Ollama client
// Uses OLLAMA_HOST environment variable or defaults to the provided Ollama API
const OLLAMA_HOST = process.env.OLLAMA_HOST || "https://ollama.crisper.skills.eliaschen.dev";
const ollama = new Ollama({ host: OLLAMA_HOST });

// MCP Tools Configuration - this acts as the bridge
// These tools are available in the MCP server and we expose them to Ollama
const mcpTools: Tool[] = [
  {
    type: "function",
    function: {
      name: "get_all_posts",
      description: "取得crisper平台上所有的貼文",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_all_users",
      description: "取得crisper平台上所有的使用者（不包含密碼）",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_all_topics",
      description: "取得crisper平台上所有的主題",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
];

// Function to call MCP server tools via HTTP
async function callMCPTool(toolName: string, args: any = {}) {
  try {
    // Call the MCP server directly via HTTP
    const response = await fetch("http://localhost:3001/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method: "tools/call",
        params: {
          name: toolName,
          arguments: args,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`MCP server responded with status ${response.status}`);
    }

    const result = await response.json();

    if (result.error) {
      throw new Error(result.error.message || "MCP tool call failed");
    }

    return result.result;
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

// Function to handle agent chat with MCP tool integration (ollama-mcp-bridge pattern)
async function handleAgentChat(
  userMessage: string,
  model: string = "llama3.2",
) {
  const messages: Message[] = [
    {
      role: "user",
      content: userMessage,
    },
  ];

  let iterations = 0;
  const maxIterations = 5;

  // Tool calling loop - this is the bridge between Ollama and MCP
  while (iterations < maxIterations) {
    // Call Ollama with available tools
    const response = await ollama.chat({
      model,
      messages,
      tools: mcpTools,
      stream: false,
    });

    messages.push(response.message);

    // Check if there are tool calls
    if (!response.message.tool_calls || response.message.tool_calls.length === 0) {
      // No more tool calls, return the final response
      return {
        response: response.message.content,
        iterations,
        toolCalls: [],
      };
    }

    // Process each tool call
    const toolCallResults = [];
    for (const toolCall of response.message.tool_calls) {
      const toolName = toolCall.function.name;
      const toolArgs = toolCall.function.arguments || {};

      console.log(`Calling MCP tool: ${toolName} with args:`, toolArgs);

      // Call the MCP tool
      const toolResult = await callMCPTool(toolName, toolArgs);

      // Extract text content from tool result
      const toolResultText =
        toolResult.content
          ?.map((c: any) => (c.type === "text" ? c.text : ""))
          .join("\n") || "No result";

      // Add tool result to messages
      messages.push({
        role: "tool",
        content: toolResultText,
      });

      toolCallResults.push({
        tool: toolName,
        result: toolResultText,
      });
    }

    iterations++;

    // Continue the loop to let Ollama process the tool results
  }

  // If we hit max iterations, return the last message
  const lastMessage = messages[messages.length - 1];
  return {
    response: lastMessage.content || "Max iterations reached",
    iterations,
    toolCalls: [],
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
          "發送訊息給 AI Agent，Agent 會使用 Ollama API 並透過 MCP bridge 存取資料庫工具。支援 Ollama 原生的 function calling。",
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
  )
  .get(
    "/tools",
    async () => {
      return {
        message: "Success",
        tools: mcpTools.map((tool) => ({
          name: tool.function.name || "unknown",
          description: tool.function.description || "",
          parameters: tool.function.parameters as any,
        })),
      };
    },
    {
      response: {
        200: t.Object({
          message: t.String(),
          tools: t.Array(
            t.Object({
              name: t.String(),
              description: t.String(),
              parameters: t.Any(),
            }),
          ),
        }),
      },
      detail: {
        summary: "取得可用的 MCP 工具列表",
        description: "列出所有可透過 agent 使用的 MCP 工具。",
      },
    },
  );
