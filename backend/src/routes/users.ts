import { t } from "elysia";
import { userTable } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { routeHandler } from "@/lib/routeHandler";
import { authHandler } from "@/lib/authHandler";
import { MessageSchema } from "@/lib/messageObject";

const passwordPattern = "^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d]{4,}$";

const UserSchema = t.Object({
  id: t.Number(),
  name: t.String(),
  email: t.String(),
  description: t.Union([t.String(), t.Null()]),
  avatar: t.Union([t.String(), t.Null()]),
  createdAt: t.Date(),
  updateAt: t.Date(),
});

export const usersRoute = routeHandler("users")
  .get(
    "/",
    async ({ db, query }) => {
      const users = await db.query.userTable.findMany({
        columns: {
          password: false,
        },
        limit: query.limit,
        where: (table, { like, sql }) =>
          like(
            sql`lower(${table.name})`,
            `%${(query.search ?? "").toLowerCase()}%`
          ),
        orderBy: (table, { asc, desc }) => {
          const order = query.order === "asc" ? asc : desc;
          switch (query.sortBy) {
            case "name":
              return [order(table.name)];
            case "email":
              return [order(table.email)];
            case "createdAt":
            default:
              return [order(table.createdAt)];
          }
        },
      });
      return users;
    },
    {
      query: t.Object({
        search: t.Optional(t.String()),
        limit: t.Optional(t.Number()),
        sortBy: t.Optional(
          t.Union([
            t.Literal("name"),
            t.Literal("email"),
            t.Literal("createdAt"),
          ])
        ),
        order: t.Optional(t.Union([t.Literal("asc"), t.Literal("desc")])),
      }),
      response: t.Array(UserSchema),
      detail: {
        summary: "取得使用者列表",
        description:
          "取得使用者列表，可選擇性地使用搜尋關鍵字、限制回傳數量和排序方式。密碼欄位不會包含在結果中。預設按建立時間降序排列。",
      },
    }
  )
  .get(
    "/:id",
    async ({ db, params, status }) => {
      const user = await db.query.userTable.findFirst({
        columns: {
          password: false,
        },
        where: eq(userTable.id, params.id),
      });
      if (!user) {
        return status(404, { message: "找不到此使用者" });
      }
      return user;
    },
    {
      params: t.Object({
        id: t.Number(),
      }),
      response: {
        200: UserSchema,
        404: MessageSchema,
      },
      detail: {
        summary: "取得單一使用者",
        description:
          "根據使用者 ID 取得單一使用者的詳細資訊。密碼欄位不會包含在結果中。",
      },
    }
  )
  .post(
    "/signup",
    async ({ db, body, status }) => {
      const existingUser = await db.query.userTable.findFirst({
        where: eq(userTable.email, body.email),
      });
      if (existingUser) {
        return status(409, {
          message: "帳號註冊失敗: 此電子郵件已被使用",
        });
      }
      const [newUser] = await db.insert(userTable).values(body).returning();
      return {
        message: "帳號註冊成功",
        info: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
        },
      };
    },
    {
      body: t.Object({
        name: t.String(),
        email: t.String({ format: "email" }),
        password: t.String({ pattern: passwordPattern }),
      }),
      response: {
        200: t.Object({
          message: t.String(),
          info: t.Object({
            id: t.Number(),
            name: t.String(),
            email: t.String(),
          }),
        }),
        409: MessageSchema,
      },
      detail: {
        summary: "使用者註冊",
        description:
          "註冊新的使用者帳號。電子郵件必須是唯一的。密碼必須包含至少一個字母和一個數字，最少長度為 4 個字元。",
      },
    }
  )
  .post(
    "/signin",
    async ({ db, body, status, jwt }) => {
      const user = await db.query.userTable.findFirst({
        where: and(
          eq(userTable.email, body.email),
          eq(userTable.password, body.password)
        ),
      });
      if (!user) {
        return status(401, {
          message: "登入失敗: 無效的電子郵件或密碼",
          userInfo: null,
          token: null,
        });
      }
      const token = await jwt.sign({ userId: user!.id });
      return {
        message: "登入成功",
        userInfo: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          description: user.description,
          createdAt: user.createdAt,
        },
        token: token,
      };
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String({ pattern: passwordPattern }),
      }),
      response: {
        200: t.Object({
          message: t.String(),
          userInfo: t.Object({
            id: t.Number(),
            name: t.String(),
            email: t.String(),
            avatar: t.Union([t.String(), t.Null()]),
            description: t.Union([t.String(), t.Null()]),
            createdAt: t.Date(),
          }),
          token: t.String(),
        }),
        401: t.Object({
          message: t.String(),
          userInfo: t.Null(),
          token: t.Null(),
        }),
      },
      detail: {
        summary: "使用者登入",
        description:
          "使用電子郵件和密碼進行使用者驗證。驗證成功後會回傳 Token。",
      },
    }
  )
  .use(authHandler)
  .patch(
    "/avatar",
    async ({ db, body, status, user }) => {
      const extNameSplit = body.image.name.split(".");
      if (extNameSplit.length < 2) {
        return status(422, { message: "檔案格式需包含副檔名" });
      }
      const extName = extNameSplit.pop();
      const fileName = `${user.userId}.${extName}`;
      const filePath = `./data/avatars/${fileName}`;
      const fileUrl = `/s3/avatars/${fileName}`;

      await Bun.write(filePath, body.image);

      await db
        .update(userTable)
        .set({ avatar: fileUrl })
        .where(eq(userTable.id, user.userId));

      return {
        message: "頭像更新成功",
        avatarUrl: fileUrl,
      };
    },
    {
      body: t.Object({
        image: t.File({
          type: ["image/*"],
        }),
      }),
      response: {
        200: t.Object({
          message: t.String(),
          avatarUrl: t.String(),
        }),
        401: MessageSchema,
        422: MessageSchema,
      },
      detail: {
        summary: "更新使用者頭像",
        description:
          "上傳並更新已驗證使用者的頭像圖片。需要在 Authorization 標頭中提供 Token。僅接受圖片檔案。",
      },
    }
  )
  .delete(
    "/",
    async ({ db, user }) => {
      await db.delete(userTable).where(eq(userTable.id, user.userId));
      return { message: "帳號刪除成功" };
    },
    {
      response: {
        200: MessageSchema,
        401: MessageSchema,
      },
      detail: {
        summary: "刪除使用者帳號",
        description:
          "刪除已驗證的使用者帳號。需要在 Authorization 標頭中提供 Token。此操作無法復原。",
      },
    }
  );
