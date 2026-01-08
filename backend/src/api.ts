import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { usersRoute } from "@/routes/users";
import { postsRoute } from "@/routes/posts";
import { topicsRoute } from "@/routes/topics";
import { likesRoute } from "./routes/likes";
import { replyRoute } from "./routes/reply";

export const routes = new Elysia({ prefix: "/api" })
  .use(
    swagger({
      path: "/docs",
      // provider: "swagger-ui",
      scalarConfig: {
        layout: "classic",
        defaultOpenAllTags: true,
      },
      documentation: {
        info: {
          title: "Crisper API Documentation",
          version: "1.0.0",
          description: "一款聰明、好用的脆",
          license: {
            name: "MIT LICENSE",
          },
        },
        components: {
          securitySchemes: {
            Authorization: {
              type: "http",
              scheme: "bearer",
              bearerFormat: "JWT",
            },
          },
        },
      },
    }),
  )
  .use(usersRoute)
  .use(postsRoute)
  .use(replyRoute)
  .use(likesRoute)
  .use(topicsRoute);
