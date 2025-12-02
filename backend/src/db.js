import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'votes.db');

// Create data directory if it doesn't exist
mkdirSync(dataDir, { recursive: true });

const db = new Database(dbPath);

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS vote_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_name TEXT NOT NULL,
    percentage REAL NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_candidate_timestamp 
    ON vote_snapshots(candidate_name, timestamp);
`);

export const insertVoteSnapshot = (candidateName, percentage) => {
  const stmt = db.prepare(`
    INSERT INTO vote_snapshots (candidate_name, percentage)
    VALUES (?, ?)
  `);
  return stmt.run(candidateName, percentage);
};

export const getVoteHistory = (candidateName = null) => {
  if (candidateName) {
    const stmt = db.prepare(`
      SELECT candidate_name, percentage, timestamp
      FROM vote_snapshots
      WHERE candidate_name = ?
      ORDER BY timestamp ASC
    `);
    return stmt.all(candidateName);
  } else {
    const stmt = db.prepare(`
      SELECT candidate_name, percentage, timestamp
      FROM vote_snapshots
      ORDER BY timestamp ASC, candidate_name ASC
    `);
    return stmt.all();
  }
};

export const getLatestVotes = () => {
  const stmt = db.prepare(`
    SELECT candidate_name, percentage, timestamp
    FROM vote_snapshots
    WHERE timestamp = (
      SELECT MAX(timestamp) FROM vote_snapshots
    )
    ORDER BY candidate_name ASC
  `);
  return stmt.all();
};

export default db;

