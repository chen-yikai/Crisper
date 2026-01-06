# Docker Deployment Guide

This guide explains how to deploy the Crisper backend using Docker.

## Prerequisites

- Docker (version 20.10 or higher)
- Docker Compose (version 2.0 or higher)

## Quick Start

### Using Docker Compose (Recommended)

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a `.env` file (optional):
```bash
# Copy and modify as needed
echo "JWT_SECRET=your-secure-secret-key" > .env
```

3. Start the application:
```bash
docker-compose up -d
```

4. Check the logs:
```bash
docker-compose logs -f
```

5. Access the application:
   - API Server: http://localhost:3000
   - API Documentation: http://localhost:3000/api/docs
   - MCP Server: http://localhost:3001/mcp

### Using Docker CLI

1. Build the image:
```bash
docker build -t crisper-backend .
```

2. Run the container:
```bash
docker run -d \
  --name crisper-backend \
  -p 3000:3000 \
  -p 3001:3001 \
  -e JWT_SECRET=your-secure-secret-key \
  -v $(pwd)/data:/app/data \
  crisper-backend
```

## Environment Variables

- `SQLITE_PATH`: Path to SQLite database file (default: `/app/data/sqlite.db`)
- `JWT_SECRET`: Secret key for JWT token generation (default: `ruru`)
- `NODE_ENV`: Node environment (default: `production`)

## Data Persistence

The SQLite database and uploaded files are stored in the `/app/data` directory inside the container. This directory is mounted as a volume to persist data between container restarts.

## Management Commands

### Stop the application:
```bash
docker-compose down
```

### Restart the application:
```bash
docker-compose restart
```

### View logs:
```bash
docker-compose logs -f backend
```

### Access the container shell:
```bash
docker-compose exec backend sh
```

### Run database migrations:
```bash
docker-compose exec backend bun run db:push
```

## Troubleshooting

### Port already in use
If ports 3000 or 3001 are already in use, modify the port mapping in `docker-compose.yml`:
```yaml
ports:
  - "8000:3000"  # Maps host port 8000 to container port 3000
  - "8001:3001"  # Maps host port 8001 to container port 3001
```

### Database issues
If you encounter database issues, you can reset the database by removing the data directory:
```bash
docker-compose down
rm -rf data/
docker-compose up -d
```

## Production Deployment

For production deployment, consider:

1. **Use a reverse proxy** (nginx, Caddy) for SSL/TLS termination
2. **Set a strong JWT_SECRET** environment variable
3. **Configure proper backup** for the SQLite database
4. **Monitor logs** and set up alerts
5. **Use Docker secrets** for sensitive environment variables
6. **Consider using a managed database** for high-availability scenarios

## Health Check

The container includes a health check that verifies the API is responding properly. You can check the health status with:
```bash
docker inspect --format='{{.State.Health.Status}}' crisper-backend
```
