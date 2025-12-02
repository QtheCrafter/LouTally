# Lou Groza Award Vote Tracker

A web application that automatically tracks vote percentages for Lou Groza Award finalists by scraping the official website every minute and displaying the data in real-time charts.

## Features

- **Automated Scraping**: Puppeteer-based bot that visits the Lou Groza Award finalists page, clicks the Results button, and extracts vote percentages
- **Data Storage**: SQLite database stores historical vote snapshots with timestamps
- **Real-time Dashboard**: React frontend with Chart.js visualizations showing vote trends over time
- **Auto-refresh**: Frontend polls the backend API every minute for the latest data

## Project Structure

```
LouTally/
├── backend/           # Node.js backend service
│   ├── src/
│   │   ├── db.js      # SQLite database helpers
│   │   ├── scraper.js # Puppeteer scraping logic
│   │   └── server.js  # Express API server
│   ├── data/          # SQLite database (created automatically)
│   ├── Dockerfile     # Docker configuration for backend
│   └── package.json
├── frontend/          # React frontend application
│   ├── src/
│   │   ├── App.jsx    # Main dashboard component
│   │   ├── App.css    # Styles
│   │   ├── main.jsx   # Entry point
│   │   └── index.css  # Global styles
│   ├── index.html
│   ├── vite.config.js
│   ├── nginx.conf     # Nginx configuration for production
│   ├── Dockerfile     # Docker configuration for frontend
│   └── package.json
├── docker-compose.yml # Docker Compose configuration
└── README.md
```

## Prerequisites

### For Local Development (Windows)
- **Node.js** (v24 or higher) - [Download for Windows](https://nodejs.org/)
- **npm** (v11 or higher, comes with Node.js)

### For Docker Deployment (Linux Ubuntu)
- **Docker** (20.10 or higher) - [Install Docker](https://docs.docker.com/engine/install/ubuntu/)
- **Docker Compose** (v2.0 or higher) - Usually included with Docker Desktop or install separately

## Installation

### Option 1: Docker Deployment (Recommended for Linux Ubuntu)

This is the easiest way to deploy on a Linux Ubuntu server. Supports both AMD64 and ARM64 architectures.

1. **Clone the repository** (if not already done):
```bash
git clone <repository-url>
cd LouTally
```

2. **Build and start the containers**:
   
   **For AMD64/x86_64 systems:**
   ```bash
   docker-compose up -d --build
   ```
   
   **For ARM64/aarch64 systems (Raspberry Pi, ARM VPS, etc.):**
   ```bash
   # Docker will auto-detect ARM and use Chromium
   docker-compose up -d --build
   
   # Or explicitly specify ARM
   docker-compose -f docker-compose.yml -f docker-compose.arm.yml up -d --build
   ```

3. **View logs**:
```bash
# All services
docker-compose logs -f

# Backend only
docker-compose logs -f backend

# Frontend only
docker-compose logs -f frontend
```

4. **Access the application**:
   - Frontend: http://localhost (or http://your-server-ip)
   - Backend API: http://localhost:3001/api/health

5. **Stop the containers**:
```bash
docker-compose down
```

6. **Rebuild after code changes**:
```bash
docker-compose up -d --build
```

**Note**: The SQLite database is persisted in `backend/data/` directory, so your data will survive container restarts.

### Option 2: Local Development Setup

### Backend Setup

1. Navigate to the backend directory:
```powershell
cd backend
```

2. Install dependencies:
```powershell
npm install
```

### Frontend Setup

1. Navigate to the frontend directory:
```powershell
cd frontend
```

2. Install dependencies:
```powershell
npm install
```

## Running the Application

### Start the Backend Server

Open a PowerShell terminal and run:

```powershell
cd backend
npm start
```

The backend will:
- Start the Express API server on `http://localhost:3001`
- Perform an initial scrape of vote data
- Schedule automatic scraping every minute
- Create the SQLite database automatically in `backend/data/votes.db`

### Start the Frontend Development Server

Open a **second** PowerShell terminal and run:

```powershell
cd frontend
npm run dev
```

The frontend will start on `http://localhost:3000` and automatically open in your browser.

## API Endpoints

- `GET /api/votes` - Get all vote history grouped by candidate
- `GET /api/votes/latest` - Get the most recent vote percentages
- `GET /api/health` - Health check endpoint

## How It Works

1. **Scraping Process**:
   - Puppeteer launches a headless browser
   - Navigates to `https://lougrozaaward.com/finalists/2025/`
   - Clicks the "Results" button to reveal vote percentages
   - Extracts percentages from elements with class `.totalpoll-question-choices-item-votes-text`
   - Stores the data in SQLite with timestamps

2. **Data Storage**:
   - Each scrape creates a new snapshot in the database
   - Data is stored with candidate name, percentage, and timestamp
   - Historical data is preserved for trend analysis

3. **Frontend Display**:
   - Fetches vote history from the backend API
   - Displays current percentages in cards
   - Shows a line chart with vote trends over time
   - Auto-refreshes every minute

## Troubleshooting

### Backend Issues

- **Port already in use**: Change the PORT in `backend/src/server.js` or stop the process using port 3001
- **Puppeteer installation fails**: You may need to install additional system dependencies. On Windows, Puppeteer should work out of the box with Node.js.

### Frontend Issues

- **Cannot connect to backend**: Ensure the backend server is running on port 3001
- **No data showing**: Wait a minute for the scraper to collect initial data, or check the backend console for scraping errors

### Scraping Issues

- **Results button not found**: The website structure may have changed. Check the browser console logs for details
- **No vote percentages extracted**: Verify the CSS selector `.totalpoll-question-choices-item-votes-text` still exists on the page

## Development

### Backend Development Mode

Run with auto-reload:
```powershell
cd backend
npm run dev
```

### Frontend Build for Production

```powershell
cd frontend
npm run build
```

The built files will be in `frontend/dist/`.

## Notes

- The scraper runs every minute automatically once the backend starts
- The database file (`backend/data/votes.db`) will be created automatically on first run
- The frontend polls the API every minute for new data
- All timestamps are stored in UTC format

## License

ISC

