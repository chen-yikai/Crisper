FROM python:3.11-slim

RUN apt-get update && apt-get install -y curl unzip && \
    curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

WORKDIR /app

COPY ./backend ./backend

RUN ./backend/build.sh && pip install ollama-mcp-bridge

COPY ./mcp-config.json ./

EXPOSE 3000

ENV SQLITE_PATH=sqlite.db
ENV NODE_ENV=production

COPY ./entrypoint.sh ./

ENTRYPOINT ["./entrypoint.sh"]
