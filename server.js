const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'votes.db');

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database helper functions
function getDatabase() {
  return new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error('Error opening database:', err);
    }
  });
}

// API endpoint to get all vote data
app.get('/api/votes', (req, res) => {
  const db = getDatabase();
  
  db.all(`
    SELECT 
      candidate_name,
      vote_percent,
      timestamp
    FROM votes
    ORDER BY timestamp ASC
  `, (err, rows) => {
    if (err) {
      console.error('Error fetching votes:', err);
      res.status(500).json({ error: 'Failed to fetch votes' });
      return;
    }
    
    res.json(rows);
    db.close();
  });
});

// API endpoint to get latest votes
app.get('/api/votes/latest', (req, res) => {
  const db = getDatabase();
  
  db.all(`
    SELECT 
      candidate_name,
      vote_percent,
      timestamp
    FROM votes
    WHERE timestamp = (
      SELECT MAX(timestamp) FROM votes
    )
    ORDER BY vote_percent DESC
  `, (err, rows) => {
    if (err) {
      console.error('Error fetching latest votes:', err);
      res.status(500).json({ error: 'Failed to fetch latest votes' });
      return;
    }
    
    res.json(rows);
    db.close();
  });
});

// API endpoint to get vote statistics
app.get('/api/votes/stats', (req, res) => {
  const db = getDatabase();
  
  db.all(`
    SELECT 
      candidate_name,
      COUNT(*) as data_points,
      MIN(vote_percent) as min_percent,
      MAX(vote_percent) as max_percent,
      AVG(vote_percent) as avg_percent,
      MAX(timestamp) as last_updated
    FROM votes
    GROUP BY candidate_name
    ORDER BY avg_percent DESC
  `, (err, rows) => {
    if (err) {
      console.error('Error fetching stats:', err);
      res.status(500).json({ error: 'Failed to fetch statistics' });
      return;
    }
    
    res.json(rows);
    db.close();
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

