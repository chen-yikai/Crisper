#!/bin/bash

./backend/server &

ollama-mcp-bridge --config ./mcp-config.json --port 8000 --ollama-url https://ollama.crisper.skills.eliaschen.dev
