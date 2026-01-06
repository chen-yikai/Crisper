# Agent API Documentation

## Overview

The Agent API provides an AI-powered interface to interact with the Crisper platform using Ollama LLMs with integrated MCP (Model Context Protocol) tools. This implementation follows the **ollama-mcp-bridge** pattern, where MCP tools are exposed to Ollama through native function calling.

## Architecture

```
┌──────────────┐
│   Client     │
└──────┬───────┘
       │ HTTP Request
       ↓
┌──────────────────────┐
│   Agent Route        │
│  (ollama-mcp-bridge) │
└──────┬───────────────┘
       │
       ├────→ ┌──────────────┐
       │      │ Ollama API   │
       │      │ (localhost:  │
       │      │    11434)    │
       │      └──────────────┘
       │
       └────→ ┌──────────────┐
              │  MCP Server  │
              │ (localhost:  │
              │    3001/mcp) │
              └──────────────┘
```

## Endpoints

### 1. POST `/api/agent/chat`

Send a message to the AI agent. The agent can use MCP tools to query database information.

**Request Body:**
```json
{
  "message": "What posts are available on the platform?",
  "model": "llama3.2" // optional, defaults to "llama3.2"
}
```

**Response:**
```json
{
  "message": "Success",
  "data": {
    "response": "Here are the posts available on the platform: ...",
    "iterations": 2
  }
}
```

**Example with curl:**
```bash
curl -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "List all users on the platform",
    "model": "llama3.2"
  }'
```

### 2. GET `/api/agent/models`

Get a list of available Ollama models.

**Response:**
```json
{
  "message": "Success",
  "models": [
    {
      "name": "llama3.2:latest",
      "size": 2019393189,
      "modified_at": "2024-01-06T12:00:00Z"
    }
  ]
}
```

**Example with curl:**
```bash
curl http://localhost:3000/api/agent/models
```

### 3. GET `/api/agent/tools`

Get a list of available MCP tools that the agent can use.

**Response:**
```json
{
  "message": "Success",
  "tools": [
    {
      "name": "get_all_posts",
      "description": "取得crisper平台上所有的貼文",
      "parameters": {
        "type": "object",
        "properties": {},
        "required": []
      }
    },
    {
      "name": "get_all_users",
      "description": "取得crisper平台上所有的使用者（不包含密碼）",
      "parameters": {
        "type": "object",
        "properties": {},
        "required": []
      }
    },
    {
      "name": "get_all_topics",
      "description": "取得crisper平台上所有的主題",
      "parameters": {
        "type": "object",
        "properties": {},
        "required": []
      }
    }
  ]
}
```

**Example with curl:**
```bash
curl http://localhost:3000/api/agent/tools
```

## MCP Tools Available

The following tools are available to the agent through the MCP server:

1. **get_all_posts**: Retrieves all posts from the Crisper platform (up to 50)
2. **get_all_users**: Retrieves all users from the platform (excluding passwords, up to 50)
3. **get_all_topics**: Retrieves all topics from the platform

## How It Works

1. **Client sends a message** to the agent endpoint
2. **Agent calls Ollama** with the message and available MCP tools
3. **Ollama decides** if it needs to call any tools to answer the question
4. If tools are needed:
   - Ollama returns tool calls
   - **Agent executes tool calls** by making requests to the MCP server
   - Tool results are sent back to Ollama
   - Ollama formulates a response based on the tool results
5. The final response is returned to the client

This is the **ollama-mcp-bridge** pattern: MCP tools are bridged into Ollama's function calling system.

## Prerequisites

1. **Ollama API**: The agent connects to `https://ollama.crisper.skills.eliaschen.dev` by default
   - You can override this by setting the `OLLAMA_HOST` environment variable
   - Example: `export OLLAMA_HOST=http://localhost:11434`

2. **A compatible model must be available** on the Ollama server
   - Check available models with: `GET /api/agent/models`
   - If no models are available, you may need to pull one (e.g., llama3.2)
   ```bash
   # Using ollama CLI against the remote server (one-time command)
   OLLAMA_HOST=https://ollama.crisper.skills.eliaschen.dev ollama pull llama3.2
   
   # OR export the variable first for persistent use
   export OLLAMA_HOST=https://ollama.crisper.skills.eliaschen.dev
   ollama pull llama3.2
   ```

3. **The MCP server** must be running at port 3001 (automatically started with the backend)

## Example Usage

### Simple Question
```bash
curl -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, what can you help me with?"
  }'
```

### Question Requiring Database Access
```bash
curl -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How many users are registered on the platform?"
  }'
```

In the second example, the agent will:
1. Recognize it needs user data
2. Call the `get_all_users` tool via MCP
3. Count the users from the returned data
4. Respond with the answer

## Error Handling

The API returns appropriate HTTP status codes:

- **200**: Success
- **500**: Server error (Ollama not available, MCP server error, etc.)

Error responses include a message and error details:
```json
{
  "message": "處理請求時發生錯誤",
  "error": "Connection to Ollama failed: connect ECONNREFUSED"
}
```

## Notes

- The agent uses an iterative approach with a maximum of 5 iterations to prevent infinite loops
- Tool calls are made synchronously, one after another
- The MCP server is called via HTTP JSON-RPC
- Ollama's native function calling is used for tool integration
