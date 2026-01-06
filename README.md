# crisper

A modern backend application built with Bun and Elysia.

## Installation

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

## Backend Docker Deployment

The backend can be easily deployed using Docker. See [backend/DOCKER.md](backend/DOCKER.md) for detailed deployment instructions.

Quick start with Docker Compose:

```bash
cd backend
export JWT_SECRET=your-secure-secret-key
docker-compose up -d
```

The backend will be available at:
- API Server: http://localhost:3000
- API Documentation: http://localhost:3000/api/docs
- MCP Server: http://localhost:3001/mcp

## About

This project was created using `bun init` in bun v1.3.5. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
