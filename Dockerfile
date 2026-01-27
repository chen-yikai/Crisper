FROM oven/bun:1

WORKDIR /app

COPY ./backend ./backend

RUN cd backend && bun install && bun run db:push && bun run db:seed

EXPOSE 3000

ENV SQLITE_PATH=sqlite.db
ENV NODE_ENV=production
ENV OLLAMA_URL=https://ollama.skills.eliaschen.dev

CMD ["bun", "run", "./backend/src/index.ts"]
