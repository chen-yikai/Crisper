import * as t from "drizzle-orm/sqlite-core";

export const userTable = t.sqliteTable("users", {
  id: t.integer().primaryKey({ autoIncrement: true }),
  name: t.text().notNull(),
  email: t.text().notNull().unique(),
  password: t.text().notNull(),
  description: t.text().default(""),
  avatar: t.text().default("/s3/avatars/default.png"),
  createdAt: t
    .integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updateAt: t
    .integer("update_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const postTable = t.sqliteTable("posts", {
  id: t.integer("id").primaryKey({ autoIncrement: true }),
  creator: t
    .integer()
    .notNull()
    .references(() => userTable.id),
  title: t.text("title").notNull(),
  content: t.text("content").notNull(),
  topics: t.text("topics").references(() => topicTable.name),
  images: t.text("images", { mode: "json" }).$type<string[]>(),
  createdAt: t
    .integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updateAt: t
    .integer("update_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const topicTable = t.sqliteTable("topics", {
  name: t.text().unique().primaryKey(),
  createdAt: t
    .integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const likeTable = t.sqliteTable(
  "post_likes",
  {
    userId: t
      .integer("user_id")
      .notNull()
      .references(() => userTable.id),
    postId: t
      .integer("post_id")
      .notNull()
      .references(() => postTable.id),
    createdAt: t
      .integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    pk: t.primaryKey({ columns: [table.userId, table.postId] }),
  }),
);

export const replyTable = t.sqliteTable("post_replies", {
  postId: t
    .integer("post_id")
    .notNull()
    .references(() => postTable.id),
  userId: t
    .integer("user_id")
    .notNull()
    .references(() => userTable.id),
  content: t.text().notNull(),
  createdAt: t
    .integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
