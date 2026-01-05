import { Elysia, t } from "elysia";
import { staticPlugin } from "@elysiajs/static";
import { routes } from "@/api";
import { mcpPlugin } from "@/mcp";

const app = new Elysia()
  .get("/s3/avatars/default.png", () => Bun.file("./assets/defaultAvatar.png"))
  .use(staticPlugin({ assets: "data", prefix: "/s3" }))
  .onError(({ code, set, error }) => {
    switch (code) {
      case "VALIDATION":
      case "PARSE":
        set.status = 422;
        return {
          message: "資料格式錯誤",
        };
      case "NOT_FOUND":
        set.status = 404;
        return null;
      case "INTERNAL_SERVER_ERROR":
      case "UNKNOWN":
        set.status = 500;
        return { message: "後端服務發生錯誤" };
    }
  })
  .use(routes)
  .listen(3000);

const mcpApp = new Elysia().use(mcpPlugin).listen(3001);

console.log(
  `Crisper backend is running at ${app.server?.hostname}:${app.server?.port}`,
);
console.log(
  `MCP server is running at ${mcpApp.server?.hostname}:${mcpApp.server?.port}/mcp`,
);
