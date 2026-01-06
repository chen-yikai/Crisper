# Use official Bun image as the base
FROM oven/bun:1 AS base

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install --production

# Copy application files
COPY . .

# Create data directory for SQLite database and uploaded files
RUN mkdir -p /app/data

# Set environment variables
ENV NODE_ENV=production
ENV SQLITE_PATH=/app/data/sqlite.db

# Expose ports
# Port 3000 for main API
# Port 3001 for MCP server
EXPOSE 3000 3001

# Run database migrations and start the application
# Note: db:push is idempotent and safe to run on startup
CMD ["sh", "-c", "(bun run db:push || echo 'Warning: Database migration failed') && bun run src/index.ts"]
