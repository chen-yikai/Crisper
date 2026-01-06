FROM oven/bun:1

WORKDIR /app

COPY package.json ./

RUN bun install

COPY . .

ENV NODE_ENV=production
ENV SQLITE_PATH=/app/data/sqlite.db

RUN mkdir -p /app/data

EXPOSE 3000 3001

CMD ["sh", "-c", "bun run db:push && bun run src/index.ts"]
