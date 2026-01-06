# Crisper

一款聰明、好用的脆 - A smart and useful platform with AI capabilities

## Features

- **Social Platform**: Post, like, and interact with content
- **User Management**: Registration, authentication, and profile management
- **Topics**: Organize posts by topics
- **AI Agent**: Intelligent assistant powered by Ollama with MCP tool integration

## Installation

To install dependencies:

```bash
bun install
```

## Running the Application

### Backend

The backend runs two servers:
- **Main API Server** on port 3000: REST API for the platform
- **MCP Server** on port 3001: Model Context Protocol server for AI tools

```bash
cd backend
bun run dev
```

### Prerequisites for AI Agent

The AI agent connects to an Ollama API server. By default, it uses `https://ollama.crisper.skills.eliaschen.dev`.

To use a different Ollama server:

1. Set the `OLLAMA_HOST` environment variable:
   ```bash
   export OLLAMA_HOST=http://localhost:11434
   ```

2. Ensure a compatible model is available on the Ollama server (e.g., llama3.2):
   ```bash
   # For the default remote server
   OLLAMA_HOST=https://ollama.crisper.skills.eliaschen.dev ollama pull llama3.2
   
   # For local server
   ollama pull llama3.2
   ```

## API Documentation

- **Main API**: http://localhost:3000/api/docs
- **Agent API**: See [backend/docs/AGENT_API.md](backend/docs/AGENT_API.md)

## Architecture

The project uses:
- **Elysia**: Fast and elegant web framework
- **Drizzle ORM**: Type-safe database ORM
- **SQLite**: Lightweight database
- **Ollama**: Local LLM runtime
- **MCP (Model Context Protocol)**: Tool integration for AI

## Development

This project was created using `bun init` in bun v1.3.5. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
