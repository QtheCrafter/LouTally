# Docker Deployment Guide

This guide explains how to deploy the Lou Groza Award Vote Tracker using Docker Compose on a Linux Ubuntu server.

## Prerequisites

1. **Docker** (20.10 or higher)
   ```bash
   sudo apt update
   sudo apt install docker.io docker-compose-plugin
   sudo systemctl start docker
   sudo systemctl enable docker
   ```

2. **Docker Compose** (v2.0 or higher)
   - Usually included with Docker, or install separately:
   ```bash
   sudo apt install docker-compose-plugin
   ```

## Quick Start

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd LouTally
   ```

2. **Build and start the containers**:
   
   **For AMD64/x86_64 systems:**
   ```bash
   docker-compose up -d --build
   ```
   
   **For ARM64/aarch64 systems (like Raspberry Pi, ARM VPS):**
   ```bash
   # Option 1: Use the ARM-specific compose file
   docker-compose -f docker-compose.yml -f docker-compose.arm.yml up -d --build
   
   # Option 2: Build with platform flag
   docker-compose build --build-arg TARGETARCH=arm64
   docker-compose up -d
   
   # Option 3: Let Docker auto-detect (recommended)
   docker-compose up -d --build
   ```
   
   The Dockerfile automatically detects ARM architecture and installs Chromium instead of Chrome.

3. **Check the status**:
   ```bash
   docker-compose ps
   ```

4. **View logs**:
   ```bash
   # All services
   docker-compose logs -f

   # Backend only
   docker-compose logs -f backend

   # Frontend only
   docker-compose logs -f frontend
   ```

5. **Access the application**:
   - Frontend: http://localhost (or http://your-server-ip)
   - Backend API: http://localhost:3001/api/health

## Common Commands

### Stop the containers
```bash
docker-compose down
```

### Restart the containers
```bash
docker-compose restart
```

### Rebuild after code changes
```bash
docker-compose up -d --build
```

### View container logs
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Execute commands inside containers
```bash
# Backend shell
docker-compose exec backend sh

# Frontend shell
docker-compose exec frontend sh
```

### Clean up (removes containers, networks, but keeps volumes)
```bash
docker-compose down
```

### Full clean up (removes everything including volumes)
```bash
docker-compose down -v
```

## Data Persistence

The SQLite database is stored in `backend/data/` directory and is mounted as a volume. This means:
- Your data persists even if containers are stopped/removed
- The database file is accessible on the host at `./backend/data/votes.db`
- Backups can be made by copying the `backend/data/` directory

## Troubleshooting

### Containers won't start
```bash
# Check logs
docker-compose logs

# Check if ports are already in use
sudo netstat -tulpn | grep -E ':(80|3001)'
```

### Backend can't scrape votes
- Check backend logs: `docker-compose logs backend`
- Ensure the container has internet access
- Verify Puppeteer dependencies are installed (they should be in the Dockerfile)

### Frontend can't connect to backend
- Verify both containers are running: `docker-compose ps`
- Check nginx configuration in `frontend/nginx.conf`
- Test backend directly: `curl http://localhost:3001/api/health`

### Rebuild from scratch
```bash
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

## Production Considerations

### Security
- Change default ports if exposing to the internet
- Set up a reverse proxy (nginx/traefik) with SSL/TLS
- Use environment variables for sensitive configuration
- Consider using Docker secrets for sensitive data

### Performance
- The containers include health checks for automatic restart
- Monitor resource usage: `docker stats`
- Consider resource limits in docker-compose.yml

### Backups
```bash
# Backup database
cp -r backend/data backend/data.backup.$(date +%Y%m%d)

# Or use docker exec
docker-compose exec backend sh -c "cp /app/data/votes.db /app/data/votes.db.backup"
```

### Updates
```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose up -d --build
```

## Environment Variables

You can customize the setup by creating a `.env` file in the project root:

```env
# Backend
NODE_ENV=production
PORT=3001

# Frontend (build-time)
VITE_API_URL=
```

Then reference them in `docker-compose.yml` if needed.

## Architecture

- **Backend**: Node.js service running on port 3001
  - Uses Puppeteer for web scraping
  - **AMD64**: Uses Google Chrome
  - **ARM64**: Uses Chromium (Chrome not available for ARM)
  - SQLite database for data storage
  - Express API server
  - Automatically detects browser executable based on architecture

- **Frontend**: Nginx serving React app on port 80
  - Static files from Vite build
  - Proxies `/api/*` requests to backend
  - Serves frontend on `/`
  - Supports both AMD64 and ARM64 architectures

- **Network**: Both services communicate via Docker network

## ARM Architecture Support

The application fully supports ARM64 (aarch64) architecture, commonly used on:
- Raspberry Pi 4/5
- ARM-based VPS (AWS Graviton, Oracle Cloud ARM, etc.)
- Apple Silicon Macs (for development)

**Key differences for ARM:**
- Uses Chromium instead of Google Chrome (Chrome doesn't support ARM Linux)
- All dependencies are ARM-compatible
- Performance may be slightly slower than AMD64, but fully functional

The Dockerfile automatically detects the architecture and installs the appropriate browser.

## Monitoring

### Health Checks
Both services include health checks:
- Backend: `GET /api/health`
- Frontend: HTTP check on port 80

### Logs
Logs are available via:
```bash
docker-compose logs -f
```

Or view in Docker Desktop if using GUI.

