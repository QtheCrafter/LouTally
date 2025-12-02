import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { scrapeVotes } from './scraper.js';
import { getVoteHistory, getLatestVotes } from './db.js';

// Normalize candidate names to ensure consistency (same as scraper)
function normalizeCandidateName(name) {
  if (!name || typeof name !== 'string') {
    return name;
  }
  
  let normalized = String(name).trim();
  normalized = normalized.replace(/\d+\.?\d*\s*%/g, '').trim();
  normalized = normalized.replace(/^(View More|Finalist:|Finalist|Place Kicker|Place Kicker:)\s*/i, '').trim();
  normalized = normalized.replace(/\s*(View More|Finalist|Place Kicker)$/i, '').trim();
  normalized = normalized.replace(/\s+/g, ' ').trim();
  normalized = normalized.replace(/^[^\w]+|[^\w]+$/g, '').trim();
  
  // Title case normalization
  normalized = normalized.split(' ').map(word => {
    if (word.length === 0) return '';
    if (word.match(/^(Mc|Mac|O'|De|Van|Von)/i)) {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
  
  return normalized;
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API endpoint to get vote history
app.get('/api/votes', (req, res) => {
  try {
    const candidateName = req.query.candidate || null;
    const history = getVoteHistory(candidateName);
    
    // Group by normalized candidate name to handle any inconsistencies
    const grouped = {};
    history.forEach(row => {
      // Normalize the candidate name to ensure consistent grouping
      const normalizedName = normalizeCandidateName(row.candidate_name);
      
      if (!grouped[normalizedName]) {
        grouped[normalizedName] = [];
      }
      grouped[normalizedName].push({
        timestamp: row.timestamp,
        percentage: row.percentage
      });
    });
    
    // Also normalize latest votes
    const latest = getLatestVotes().map(vote => ({
      ...vote,
      candidate_name: normalizeCandidateName(vote.candidate_name)
    }));
    
    res.json({
      success: true,
      data: grouped,
      latest: latest
    });
  } catch (error) {
    console.error('Error fetching vote history:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint to get latest votes
app.get('/api/votes/latest', (req, res) => {
  try {
    const latest = getLatestVotes().map(vote => ({
      ...vote,
      candidate_name: normalizeCandidateName(vote.candidate_name)
    }));
    res.json({ success: true, data: latest });
  } catch (error) {
    console.error('Error fetching latest votes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start scraping immediately on startup
console.log('Starting initial scrape...');
scrapeVotes().catch(err => {
  console.error('Initial scrape failed:', err);
});

// Schedule scraping every minute
cron.schedule('* * * * *', () => {
  scrapeVotes().catch(err => {
    console.error('Scheduled scrape failed:', err);
  });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log('Scraper scheduled to run every minute');
});

