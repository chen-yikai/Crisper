import Elysia, { t } from "elysia";
import { jwtPlugin } from "./jwt";

export const authHandler = (app: Elysia) =>
  app
    .use(jwtPlugin)
    .guard({
      detail: {
        security: [{ Authorization: [] }],
      },
    })
    .derive(async ({ jwt, headers: { authorization }, status }) => {
      const token = authorization
        ? authorization.startsWith("Bearer ")
          ? authorization.slice(7)
          : authorization
        : "";
      const payload = await jwt.verify(token);

      if (!payload) {
        return status(402, { message: "未經授權的請求" });
      }
      return { user: payload };
    });
