import jwt from "@elysiajs/jwt";
import { t } from "elysia";

export const jwtPlugin = jwt({
  secret: Bun.env.JWT_SECRET || "ruru",
  schema: t.Object({
    userId: t.Number(),
  }),
});
