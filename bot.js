const puppeteer = require('puppeteer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'votes.db');
const URL = 'https://lougrozaaward.com/finalists/2025/';
const SCRAPE_INTERVAL = 60000; // 1 minute in milliseconds

// Initialize database
function initDatabase() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        reject(err);
        return;
      }
      console.log('Connected to SQLite database');
    });

    // Create table if it doesn't exist
    db.run(`
      CREATE TABLE IF NOT EXISTS votes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        candidate_name TEXT NOT NULL,
        vote_percent REAL NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(db);
      }
    });
  });
}

// Scrape vote percentages
async function scrapeVotes() {
  let browser;
  try {
    console.log('Launching browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log(`Navigating to ${URL}...`);
    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for the page to load
    await page.waitForTimeout(2000);

    // Look for and click the results button
    console.log('Looking for results button...');
    try {
      // Wait a bit for page to fully load
      await page.waitForTimeout(2000);

      // Try multiple strategies to find and click the results button
      let buttonClicked = false;

      // Strategy 1: XPath to find button/link containing "Results" text (case insensitive)
      try {
        const [button] = await page.$x("//button[contains(translate(text(), 'RESULTS', 'results'), 'results')] | //a[contains(translate(text(), 'RESULTS', 'results'), 'results')] | //*[@role='button' and contains(translate(text(), 'RESULTS', 'results'), 'results')]");
        if (button) {
          await button.click();
          buttonClicked = true;
          console.log('Clicked Results button via XPath');
        }
      } catch (e) {
        // Continue to next strategy
      }

      // Strategy 2: Try common selectors
      if (!buttonClicked) {
        const buttonSelectors = [
          'button[class*="results"]',
          'a[class*="results"]',
          '[id*="results"]',
          '.totalpoll-button-results',
          '.totalpoll-results-button',
          'button.totalpoll-button',
          '[data-action="results"]'
        ];

        for (const selector of buttonSelectors) {
          try {
            const element = await page.$(selector);
            if (element) {
              await element.click();
              buttonClicked = true;
              console.log(`Clicked button with selector: ${selector}`);
              break;
            }
          } catch (e) {
            // Try next selector
          }
        }
      }

      // Strategy 3: Try clicking any button and see if results appear
      if (!buttonClicked) {
        try {
          const buttons = await page.$$('button, a[role="button"]');
          for (const button of buttons) {
            const text = await page.evaluate(el => el.textContent, button);
            if (text && text.toLowerCase().includes('result')) {
              await button.click();
              buttonClicked = true;
              console.log('Clicked button containing "result" text');
              break;
            }
          }
        } catch (e) {
          // Continue
        }
      }

      if (!buttonClicked) {
        console.log('Warning: Could not find Results button, proceeding anyway...');
      } else {
        // Wait for results to load after clicking
        await page.waitForTimeout(3000);
        // Wait for vote elements to appear
        try {
          await page.waitForSelector('.totalpoll-question-choices-item-votes-text', { timeout: 5000 });
        } catch (e) {
          console.log('Vote elements not found immediately, continuing...');
        }
      }
    } catch (error) {
      console.log('Error clicking results button:', error.message);
      console.log('Proceeding to scrape votes anyway...');
    }

    // Scrape vote percentages
    console.log('Scraping vote percentages...');
    
    // Wait a bit more to ensure dynamic content is loaded
    await page.waitForTimeout(2000);
    
    const voteData = await page.evaluate(() => {
      let voteElements = document.querySelectorAll('.totalpoll-question-choices-item-votes-text');
      const candidates = [];
      
      if (voteElements.length === 0) {
        console.warn('No vote elements found with selector .totalpoll-question-choices-item-votes-text');
        // Try alternative selectors
        const altSelectors = [
          '[class*="votes-text"]',
          '[class*="vote"]',
          '.totalpoll-votes',
          '[data-votes]'
        ];
        
        for (const selector of altSelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            console.log(`Found ${elements.length} elements with selector: ${selector}`);
            voteElements = elements;
            break;
          }
        }
      }
      
      voteElements.forEach((element, index) => {
        const percentText = element.textContent.trim();
        // Extract percentage value (remove % sign and convert to number)
        const percentMatch = percentText.match(/(\d+\.?\d*)/);
        if (percentMatch) {
          const percent = parseFloat(percentMatch[1]);
          
          // Try to get candidate name from nearby elements
          let candidateName = `Candidate ${index + 1}`;
          const parent = element.closest('.totalpoll-question-choices-item, [class*="choices-item"], [class*="poll-item"]');
          if (parent) {
            // Try multiple selectors for candidate name
            const nameSelectors = [
              '.totalpoll-question-choices-item-label',
              '.totalpoll-question-choices-item-title',
              '[class*="label"]',
              '[class*="title"]',
              '[class*="name"]',
              'h3',
              'h4',
              'strong',
              'span[class*="candidate"]'
            ];
            
            for (const nameSelector of nameSelectors) {
              const nameElement = parent.querySelector(nameSelector);
              if (nameElement && nameElement.textContent.trim()) {
                candidateName = nameElement.textContent.trim();
                break;
              }
            }
            
            // If still no name, try getting text from parent excluding the vote element
            if (candidateName === `Candidate ${index + 1}`) {
              const parentText = parent.textContent.trim();
              const lines = parentText.split('\n').map(l => l.trim()).filter(l => l && !l.match(/^\d+\.?\d*\s*%?$/));
              if (lines.length > 0) {
                candidateName = lines[0];
              }
            }
          }
          
          candidates.push({
            name: candidateName,
            percent: percent
          });
        }
      });
      
      return candidates;
    });

    console.log('Scraped vote data:', voteData);

    if (voteData.length === 0) {
      console.log('Warning: No vote data found. Page structure may have changed.');
      // Take a screenshot for debugging
      await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });
      console.log('Screenshot saved to debug-screenshot.png');
    }

    await browser.close();
    return voteData;
  } catch (error) {
    console.error('Error scraping votes:', error);
    if (browser) {
      await browser.close();
    }
    throw error;
  }
}

// Save votes to database
function saveVotes(db, votes) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare('INSERT INTO votes (candidate_name, vote_percent) VALUES (?, ?)');
    
    votes.forEach((vote) => {
      stmt.run([vote.name, vote.percent], (err) => {
        if (err) {
          console.error(`Error saving vote for ${vote.name}:`, err);
        } else {
          console.log(`Saved: ${vote.name} - ${vote.percent}%`);
        }
      });
    });
    
    stmt.finalize((err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

// Main bot loop
async function runBot() {
  const db = await initDatabase();
  
  console.log('Bot started. Scraping every minute...');
  
  // Run immediately, then every minute
  async function scrapeAndSave() {
    try {
      const votes = await scrapeVotes();
      if (votes.length > 0) {
        await saveVotes(db, votes);
      } else {
        console.log('No votes to save this round.');
      }
    } catch (error) {
      console.error('Error in scrape cycle:', error);
    }
  }
  
  // Initial scrape
  await scrapeAndSave();
  
  // Set up interval
  setInterval(async () => {
    await scrapeAndSave();
  }, SCRAPE_INTERVAL);
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down bot...');
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
      } else {
        console.log('Database connection closed.');
      }
      process.exit(0);
    });
  });
}

// Start the bot
runBot().catch(console.error);

