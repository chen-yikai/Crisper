# Use official Bun image as the base
FROM oven/bun:1

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install --production

# Copy application files
COPY . .

# Set environment variables
ENV NODE_ENV=production

# Expose ports
# Port 3000 for main API
# Port 3001 for MCP server
EXPOSE 3000 3001

# Run database migrations and start the application
CMD ["sh", "-c", "bun run db:push && bun run src/index.ts"]
