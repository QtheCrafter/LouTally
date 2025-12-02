# Installation Guide for Ubuntu 22.04 VPS

This guide will help you install and run LouTally on your Ubuntu 22.04 VPS server.

## Prerequisites

- Ubuntu 22.04 LTS server
- Root or sudo access
- At least 2GB RAM (4GB recommended)
- At least 10GB free disk space
- Internet connection

## Step 1: Update System Packages

First, update your system packages to ensure you have the latest security patches:

```bash
sudo apt update
sudo apt upgrade -y
```

## Step 2: Install Node.js 18 (Optional - Only if running npm install outside Docker)

**Note**: If you're only using Docker (recommended), you can skip this step. Docker will use Node.js 18.20.4 automatically.

If you need Node.js 18 on your host system (for local development or running npm install outside Docker):

```bash
# Remove existing Node.js if installed via apt
sudo apt remove -y nodejs npm 2>/dev/null || true

# Install Node.js 18.17.0 using NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v18.17.0 or similar
npm --version
```

**Alternative: Using NVM (Node Version Manager)** - Recommended for development:

```bash
# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reload shell configuration
source ~/.bashrc

# Install and use Node.js 18.17.0
nvm install 18.17.0
nvm use 18.17.0
nvm alias default 18.17.0

# Verify
node --version  # Should show v18.17.0
```

## Step 3: Install Docker

### Install Docker Engine

```bash
# Remove old versions if any
sudo apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

# Install prerequisites
sudo apt install -y ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Verify Docker installation
sudo docker --version
sudo docker compose version
```

### Add Your User to Docker Group (Optional but Recommended)

This allows you to run Docker commands without `sudo`:

```bash
sudo usermod -aG docker $USER
```

**Important**: You need to log out and log back in for this to take effect. Alternatively, run:
```bash
newgrp docker
```

## Step 4: Clone the Repository

```bash
# Navigate to your preferred directory (e.g., /opt or ~)
cd ~

# Clone the repository (replace with your actual repository URL)
git clone <your-repository-url> LouTally
cd LouTally
```

If you don't have git installed:
```bash
sudo apt install -y git
```

## Step 5: Configure Environment (if needed)

If you need to modify any environment variables, check the `docker-compose.yml` file. The default configuration should work for most setups.

## Step 6: Build and Start the Application

### Detect Your Architecture

First, check your system architecture:

```bash
uname -m
```

- `x86_64` or `amd64` = AMD64 architecture (most common)
- `aarch64` or `arm64` = ARM64 architecture (Raspberry Pi, ARM VPS)

### Build and Start

**For AMD64/x86_64 systems:**

```bash
# Build and start containers
TARGETARCH=amd64 docker compose up -d --build

# Or use the build script
chmod +x build.sh
./build.sh
```

**For ARM64/aarch64 systems:**

```bash
# Build and start containers
TARGETARCH=arm64 docker compose up -d --build
```

**Auto-detect (recommended):**

```bash
# Docker Compose will auto-detect architecture
docker compose up -d --build
```

## Step 7: Verify Installation

### Check Container Status

```bash
docker compose ps
```

You should see both `lou-tally-backend` and `lou-tally-frontend` containers running.

### View Logs

```bash
# View all logs
docker compose logs -f

# View backend logs only
docker compose logs -f backend

# View frontend logs only
docker compose logs -f frontend
```

### Test the Application

```bash
# Test backend health endpoint
curl http://localhost:3001/api/health

# Test frontend (if accessible)
curl http://localhost
```

## Step 8: Access the Application

- **Frontend**: `http://your-server-ip` (port 80)
- **Backend API**: `http://your-server-ip:3001/api/health`

If you're accessing from a remote machine, make sure:
1. Your firewall allows traffic on ports 80 and 3001
2. Your VPS provider's security group/firewall allows these ports

### Configure Firewall (if using UFW)

```bash
sudo ufw allow 80/tcp
sudo ufw allow 3001/tcp
sudo ufw status
```

## Troubleshooting

### Issue: Docker Compose Command Not Found

**Solution**: Use `docker compose` (with space) instead of `docker-compose` (with hyphen). Docker Compose V2 is integrated into Docker CLI.

If you still get errors, install Docker Compose plugin:
```bash
sudo apt install -y docker-compose-plugin
```

### Issue: Permission Denied When Running Docker

**Solution**: Either use `sudo` or add your user to the docker group:
```bash
sudo usermod -aG docker $USER
newgrp docker
```

### Issue: Port Already in Use

**Solution**: Check what's using the port and stop it:
```bash
# Check what's using port 80
sudo lsof -i :80

# Check what's using port 3001
sudo lsof -i :3001

# Stop the containers
docker compose down
```

### Issue: Build Fails with Architecture Errors

**Solution**: Explicitly set the architecture:
```bash
# For AMD64
TARGETARCH=amd64 docker compose build

# For ARM64
TARGETARCH=arm64 docker compose build
```

### Issue: Containers Keep Restarting

**Solution**: Check the logs to see what's wrong:
```bash
docker compose logs backend
docker compose logs frontend
```

Common causes:
- Database permission issues: Ensure `backend/data` directory is writable
- Port conflicts: Check if ports 80 or 3001 are already in use
- Missing dependencies: Check if all required files are present

### Issue: Cannot Access Frontend from Browser

**Solution**:
1. Check if containers are running: `docker compose ps`
2. Check frontend logs: `docker compose logs frontend`
3. Verify firewall settings
4. Try accessing backend directly: `http://your-server-ip:3001/api/health`

### Issue: Database Not Persisting

**Solution**: Ensure the volume mount is correct. The database should be in `./backend/data/` directory. Check permissions:
```bash
sudo chown -R $USER:$USER backend/data
chmod -R 755 backend/data
```

## Useful Commands

### Stop the Application

```bash
docker compose down
```

### Restart the Application

```bash
docker compose restart
```

### Rebuild After Code Changes

```bash
docker compose up -d --build
```

### View Resource Usage

```bash
docker stats
```

### Clean Up (Remove containers, networks, volumes)

```bash
# Stop and remove containers
docker compose down

# Remove everything including volumes (WARNING: This deletes the database!)
docker compose down -v
```

### Update the Application

```bash
# Pull latest code
git pull

# Rebuild and restart
docker compose up -d --build
```

## Maintenance

### Backup Database

The SQLite database is stored in `backend/data/votes.db`. To backup:

```bash
# Create backup directory
mkdir -p ~/backups

# Copy database file
cp backend/data/votes.db ~/backups/votes-$(date +%Y%m%d-%H%M%S).db
```

### Monitor Logs

Set up log rotation or use a log management tool. For basic monitoring:

```bash
# Follow logs in real-time
docker compose logs -f

# View last 100 lines
docker compose logs --tail=100
```

### Update Docker Images

```bash
# Pull latest base images
docker compose pull

# Rebuild with latest images
docker compose up -d --build
```

## Security Considerations

1. **Firewall**: Only expose necessary ports (80, 3001)
2. **Updates**: Keep your system and Docker updated
3. **Permissions**: Don't run containers as root if possible
4. **Secrets**: Never commit `.env` files with sensitive data
5. **HTTPS**: Consider setting up a reverse proxy (nginx/traefik) with SSL certificates

## Getting Help

If you encounter issues not covered here:

1. Check the logs: `docker compose logs`
2. Verify your system architecture: `uname -m`
3. Check Docker version: `docker --version`
4. Review the main README.md for additional information

## Next Steps

Once installed, the application will:
- Automatically scrape vote data every minute
- Store data in SQLite database
- Display real-time charts on the frontend
- Provide API endpoints for vote data

The database file persists in `backend/data/votes.db` and will survive container restarts.

