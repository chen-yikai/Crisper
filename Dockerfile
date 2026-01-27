FROM oven/bun:1

WORKDIR /app

COPY ./backend ./

ENV SQLITE_PATH=sqlite.db
ENV NODE_ENV=production
ENV OLLAMA_URL=https://ollama.skills.eliaschen.dev

RUN bun install && bun run db:push && bun run db:seed

EXPOSE 3000

CMD ["bun", "run", "dev"]
