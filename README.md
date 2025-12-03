# Lou Tally - Vote Tracking Bot & Dashboard

A web scraping bot and dashboard system to track vote percentages for Lou Groza Award finalists over time.

## Features

- 🤖 Automated web scraping bot that collects vote percentages every minute
- 📊 Real-time dashboard with interactive charts
- 💾 SQLite database for data storage
- 📈 Historical trend visualization
- 🎨 Modern, responsive web interface

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- ARM Ubuntu VPS (or any Linux system)

## Installation on ARM Ubuntu VPS

### 1. Install Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. Install system dependencies for Puppeteer

```bash
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
```

### 3. Clone or upload the project

```bash
cd ~
git clone <your-repo-url> LouTally
cd LouTally
```

### 4. Install Node.js dependencies

```bash
npm install
```

## Running the Application

### Option 1: Run bot and server separately

**Terminal 1 - Start the bot:**
```bash
npm run bot
```

**Terminal 2 - Start the web server:**
```bash
npm start
```

### Option 2: Use PM2 for production (recommended)

Install PM2:
```bash
sudo npm install -g pm2
```

Start both processes:
```bash
pm2 start bot.js --name "loutally-bot"
pm2 start server.js --name "loutally-server"
pm2 save
pm2 startup
```

View logs:
```bash
pm2 logs
```

## Accessing the Dashboard

Once the server is running, access the dashboard at:
- Local: `http://localhost:3000`
- Remote: `http://your-vps-ip:3000`

Make sure to open port 3000 in your firewall:
```bash
sudo ufw allow 3000/tcp
```

## Project Structure

```
LouTally/
├── bot.js              # Web scraping bot
├── server.js           # Express API server
├── package.json        # Dependencies
├── votes.db           # SQLite database (created automatically)
├── public/
│   └── index.html     # Dashboard frontend
└── README.md          # This file
```

## API Endpoints

- `GET /api/votes` - Get all vote data
- `GET /api/votes/latest` - Get latest vote percentages
- `GET /api/votes/stats` - Get statistics for each candidate
- `GET /api/health` - Health check endpoint

## Database Schema

The `votes` table stores:
- `id` - Auto-increment primary key
- `candidate_name` - Name of the candidate
- `vote_percent` - Vote percentage (float)
- `timestamp` - When the vote was recorded

## Troubleshooting

### Bot can't find the results button
The bot will try multiple strategies to find and click the results button. If it fails, it will still attempt to scrape the vote percentages. Check `debug-screenshot.png` if issues persist.

### Puppeteer fails on ARM
Make sure all system dependencies are installed. You may need to install Chromium separately:
```bash
sudo apt-get install -y chromium-browser
```

Then modify `bot.js` to use the system Chromium:
```javascript
browser = await puppeteer.launch({
  executablePath: '/usr/bin/chromium-browser',
  // ... other options
});
```

### Port already in use
Change the PORT in `server.js` or set an environment variable:
```bash
PORT=8080 npm start
```

## License

ISC

