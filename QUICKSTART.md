# Quick Start Guide

## On Your ARM Ubuntu VPS

### 1. Upload Files
Upload all project files to your VPS (using `scp`, `rsync`, or `git clone`).

### 2. Run Deployment Script
```bash
chmod +x deploy.sh
./deploy.sh
```

This will:
- Install Node.js if needed
- Install all system dependencies
- Install Node.js packages
- Set up PM2
- Start the bot and server

### 3. Access Dashboard
Open your browser and go to: `http://your-vps-ip:3000`

### 4. Check Status
```bash
pm2 status          # Check if both processes are running
pm2 logs            # View logs
pm2 logs loutally-bot    # View only bot logs
pm2 logs loutally-server # View only server logs
```

## Manual Setup (Alternative)

If you prefer manual setup:

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install system dependencies
sudo apt-get update
sudo apt-get install -y ca-certificates fonts-liberation libasound2 libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 lsb-release wget xdg-utils

# Install Node.js packages
npm install

# Install PM2
sudo npm install -g pm2

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Open firewall
sudo ufw allow 3000/tcp
```

## Troubleshooting

### Bot not collecting data
- Check bot logs: `pm2 logs loutally-bot`
- The website structure may have changed - check `debug-screenshot.png` if it exists
- Verify the URL is accessible from your VPS

### Dashboard shows no data
- Wait a few minutes for the bot to collect initial data
- Check database: `sqlite3 votes.db "SELECT * FROM votes ORDER BY timestamp DESC LIMIT 10;"`
- Verify server is running: `pm2 status`

### Port 3000 not accessible
- Check firewall: `sudo ufw status`
- Open port: `sudo ufw allow 3000/tcp`
- Check if server is listening: `netstat -tulpn | grep 3000`

### Puppeteer issues on ARM
If Puppeteer fails, you may need to install Chromium separately:
```bash
sudo apt-get install -y chromium-browser
```

Then edit `bot.js` and add `executablePath: '/usr/bin/chromium-browser'` to the puppeteer.launch options.

