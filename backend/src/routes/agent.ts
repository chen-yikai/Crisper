import { authHandler } from "@/lib/authHandler";
import { routeHandler } from "@/lib/routeHandler";

export const likesRoute = routeHandler("agent")
  .use(authHandler)
  .post("/", async ({ user }) => {
    const id = user.userId;
    await fetch(`${process.env.OLLAMA_BRIDGE}/api/chat`);
  });
