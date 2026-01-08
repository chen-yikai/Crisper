import { Elysia, t } from "elysia";
import { db } from "@/db";
import { jwtPlugin } from "./jwt";

export const routeHandler = (path?: string, title?: string) => {
  const tag = !title
    ? path
      ? path.charAt(0).toUpperCase() + path.slice(1)
      : ""
    : title;
  return new Elysia({
    prefix: path,
    tags: [tag],
  })
    .decorate("db", db)
    .use(jwtPlugin);
};
