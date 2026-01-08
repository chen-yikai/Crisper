import Elysia from "elysia";

export const hideOpenAPI = (app: Elysia) =>
  app.guard({ detail: { hide: true } });
