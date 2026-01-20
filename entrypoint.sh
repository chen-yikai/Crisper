#!/bin/bash

cd /app/backend && bun run ./src/index.ts &

ollama-mcp-bridge --config ./mcp-config.json --port 8000 --ollama-url https://ollama.skills.eliaschen.dev
