import { Elysia } from "elysia";
import { staticPlugin } from "@elysiajs/static";
import { routes } from "@/api";
import { mcpPlugin } from "./mcp";
import { hideOpenAPI } from "./lib/hideOpenAPI";

const app = new Elysia()
  .use(staticPlugin({ assets: "./data", prefix: "/s3" }))
  .get("/s3/avatars/default.png", () => Bun.file("./assets/defaultAvatar.png"))
  .onError(({ code, set, error }) => {
    switch (code) {
      case "VALIDATION":
      case "PARSE":
        set.status = 422;
        try {
          const summary = JSON.parse(error.message).summary;
          return {
            message: "資料格式錯誤",
            info: summary,
          };
        } catch (error) {
          return {
            message: "資料格式錯誤",
            info: "Bad Request",
          };
        }
      case "NOT_FOUND":
        return null;
      case "INTERNAL_SERVER_ERROR":
      case "UNKNOWN":
        set.status = 500;
        return { message: "後端服務發生錯誤" };
    }
  })
  .use(routes)
  .use(hideOpenAPI)
  .use(mcpPlugin)
  .listen(3000);

console.log(
  `Crisper backend is running at ${app.server?.hostname}:${app.server?.port}`,
);
