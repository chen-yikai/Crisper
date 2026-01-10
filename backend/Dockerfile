FROM oven/bun:1

WORKDIR /app

COPY package.json ./

RUN bun install

COPY . .

ENV NODE_ENV=production
ENV SQLITE_PATH=sqlite.db

EXPOSE 3000 

RUN bun run db:generate && \
    bun run db:push && \
    bun run db:seed

CMD ["bun", "run", "src/index.ts"]
