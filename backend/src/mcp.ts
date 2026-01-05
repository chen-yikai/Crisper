import { mcp } from "elysia-mcp";

export const mcpPlugin = mcp({
  serverInfo: {
    name: "crisper-db-tools",
    version: "1.0.0",
  },
  capabilities: {
    tools: {},
  },
  setupServer: async (s) => {
    s.registerTool(
      "get_all_posts",
      {
        description: "取得crisper平台上所有的貼文",
      },
      async () => {
        return {
          content: [],
        };
      },
    );
  },
});
