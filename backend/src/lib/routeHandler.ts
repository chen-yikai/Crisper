import { Elysia, t } from "elysia";
import { db } from "@/db";
import { jwtPlugin } from "./jwt";

export const routeHandler = (path?: string, summary?: string) =>
  new Elysia({
    prefix: path,
    detail: {
      description: summary,
    },
    tags: [path ? path.charAt(0).toUpperCase() + path.slice(1) : ""],
  })
    .decorate("db", db)
    .use(jwtPlugin);
