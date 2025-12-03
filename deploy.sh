#!/bin/bash

# Lou Tally Deployment Script for ARM Ubuntu VPS
# Run this script on your VPS to set up the application

set -e

echo "🚀 Starting Lou Tally deployment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "✅ Node.js already installed: $(node --version)"
fi

# Install system dependencies for Puppeteer
echo "📦 Installing system dependencies for Puppeteer..."
sudo apt-get update
sudo apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Install PM2 globally if not already installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    sudo npm install -g pm2
else
    echo "✅ PM2 already installed"
fi

# Create PM2 startup script
echo "⚙️  Setting up PM2 startup..."
pm2 startup systemd -u $USER --hp $HOME || true

# Start the application
echo "🚀 Starting application with PM2..."
pm2 start ecosystem.config.js
pm2 save

# Open firewall port (if ufw is active)
if command -v ufw &> /dev/null && sudo ufw status | grep -q "Status: active"; then
    echo "🔥 Opening port 3000 in firewall..."
    sudo ufw allow 3000/tcp
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Dashboard available at: http://$(hostname -I | awk '{print $1}'):3000"
echo "📝 View logs: pm2 logs"
echo "📊 PM2 status: pm2 status"
echo "🛑 Stop: pm2 stop ecosystem.config.js"
echo "🔄 Restart: pm2 restart ecosystem.config.js"

