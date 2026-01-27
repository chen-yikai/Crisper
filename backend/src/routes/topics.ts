import { t } from "elysia";
import { topicTable } from "@/db/schema";
import { sql } from "drizzle-orm";
import { routeHandler } from "@/lib/routeHandler";

const TopicSchema = t.Object({
  name: t.String(),
  createdAt: t.Date(),
});

const PaginationSchema = t.Object({
  page: t.Number(),
  limit: t.Number(),
  total: t.Number(),
  totalPages: t.Number(),
});

export const topicsRoute = routeHandler("topics").get(
  "/",
  async ({ db, query }) => {
    const page = query.page ?? 1;
    const limit = query.limit;
    const offset = limit ? (page - 1) * limit : undefined;

    // Get total count for pagination
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(topicTable);
    const total = totalResult[0]?.count ?? 0;

    const allTopics = await db.query.topicTable.findMany({
      limit: limit,
      offset: offset,
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

    // Return with pagination if limit is provided
    if (limit) {
      return {
        data: allTopics,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }

    return { data: allTopics };
  },
  {
    query: t.Object({
      page: t.Optional(t.Number({ minimum: 1 })),
      limit: t.Optional(t.Number({ minimum: 1 })),
      sortBy: t.Optional(t.Union([t.Literal("name"), t.Literal("createdAt")])),
      order: t.Optional(t.Union([t.Literal("asc"), t.Literal("desc")])),
    }),
    response: t.Object({
      data: t.Array(TopicSchema),
      pagination: t.Optional(PaginationSchema),
    }),
    detail: {
      summary: "取得主題列表",
      description:
        "取得所有主題列表，可選擇性地使用分頁和排序方式。提供 limit 時會回傳分頁資訊。",
    },
  },
);
