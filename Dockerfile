FROM oven/bun:latest AS builder

WORKDIR /app

COPY ./backend ./backend

ENV SQLITE_PATH=sqlite.db
ENV NODE_ENV=production

RUN cd backend && ./build.sh

FROM python:3.11-slim

WORKDIR /app

COPY --from=builder /app/backend ./backend

RUN pip install ollama-mcp-bridge

COPY ./mcp-config.json ./

EXPOSE 3000

ENV SQLITE_PATH=sqlite.db
ENV NODE_ENV=production

COPY ./entrypoint.sh ./

ENTRYPOINT ["./entrypoint.sh"]
