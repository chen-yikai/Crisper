import { t } from "elysia";
import { topics } from "@/db/schema";
import { routeHandler } from "@/lib/routeHandler";

const TopicSchema = t.Object({
  name: t.String(),
  createdAt: t.Date(),
});

export const topicsRoute = routeHandler("topics").get(
  "/",
  async ({ db, query }) => {
    const allTopics = await db.query.topics.findMany({
      limit: query.limit,
      orderBy: (table, { asc, desc }) => {
        const order = query.order === "asc" ? asc : desc;
        switch (query.sortBy) {
          case "name":
            return [order(table.name)];
          case "createdAt":
          default:
            return [order(table.createdAt)];
        }
      },
    });
    return allTopics;
  },
  {
    query: t.Object({
      limit: t.Optional(t.Number()),
      sortBy: t.Optional(t.Union([t.Literal("name"), t.Literal("createdAt")])),
      order: t.Optional(t.Union([t.Literal("asc"), t.Literal("desc")])),
    }),
    response: t.Array(TopicSchema),
    detail: {
      summary: "取得主題列表",
      description:
        "取得所有主題列表，可選擇性地限制回傳數量和排序方式。預設按建立時間降序排列。",
    },
  },
);
