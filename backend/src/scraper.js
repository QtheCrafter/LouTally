import puppeteer from 'puppeteer';
import { insertVoteSnapshot } from './db.js';
import { existsSync } from 'fs';

const TARGET_URL = 'https://lougrozaaward.com/finalists/2025/';

// Normalize candidate names to ensure consistency
function normalizeCandidateName(name) {
  if (!name || typeof name !== 'string') {
    return name;
  }
  
  // Convert to string and trim
  let normalized = String(name).trim();
  
  // Remove any percentage values that might have been included
  normalized = normalized.replace(/\d+\.?\d*\s*%/g, '').trim();
  
  // Remove common prefixes/suffixes
  normalized = normalized.replace(/^(View More|Finalist:|Finalist|Place Kicker|Place Kicker:)\s*/i, '').trim();
  normalized = normalized.replace(/\s*(View More|Finalist|Place Kicker)$/i, '').trim();
  
  // Normalize whitespace (multiple spaces/newlines to single space)
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  // Remove any trailing/leading special characters
  normalized = normalized.replace(/^[^\w]+|[^\w]+$/g, '').trim();
  
  // Title case normalization (first letter of each word uppercase, rest lowercase)
  // But preserve known names like "Matsuzawa" 
  normalized = normalized.split(' ').map(word => {
    if (word.length === 0) return '';
    // Keep common name patterns
    if (word.match(/^(Mc|Mac|O'|De|Van|Von)/i)) {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
  
  return normalized;
}

export async function scrapeVotes() {
  let browser = null;
  
  try {
    console.log(`[${new Date().toISOString()}] Starting vote scrape...`);
    
    // Use DEBUG environment variable to run in non-headless mode
    const isDebug = process.env.DEBUG === 'true';
    
    // Determine Chrome/Chromium executable path
    // Priority: 1) Environment variable, 2) Check for Chromium (ARM), 3) Check for Chrome (AMD64), 4) Let Puppeteer use bundled
    let executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    
    if (!executablePath) {
      // Check for Chromium first (common on ARM Linux)
      if (existsSync('/usr/bin/chromium')) {
        executablePath = '/usr/bin/chromium';
      } else if (existsSync('/usr/bin/google-chrome-stable')) {
        executablePath = '/usr/bin/google-chrome-stable';
      }
      // If neither exists, Puppeteer will use its bundled Chromium
    }
    
    const launchOptions = {
      headless: isDebug ? false : 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    };
    
    // Only set executablePath if we found one
    if (executablePath) {
      launchOptions.executablePath = executablePath;
    }
    
    browser = await puppeteer.launch(launchOptions);
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Navigate to the page
    console.log(`  Navigating to ${TARGET_URL}...`);
    await page.goto(TARGET_URL, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait for the page to load and find the Results button
    await page.waitForTimeout(2000); // Give page time to fully render
    
    // Debug: Check what buttons/elements exist on the page
    const pageInfo = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, a, [role="button"]'));
      const buttonTexts = buttons.map(btn => btn.textContent?.toLowerCase().trim()).filter(Boolean);
      
      // Check for vote elements before clicking
      const voteElementsBefore = document.querySelectorAll('.totalpoll-question-choices-item-votes-text');
      const choiceItemsBefore = document.querySelectorAll('.totalpoll-question-choices-item');
      
      // Look for any element containing "results"
      const resultsElements = Array.from(document.querySelectorAll('*')).filter(el => {
        const text = el.textContent?.toLowerCase().trim();
        return text && (text === 'results' || text.includes('results'));
      });
      
      return {
        buttonCount: buttons.length,
        buttonTexts: buttonTexts.slice(0, 10), // First 10 button texts
        voteElementsBefore: voteElementsBefore.length,
        choiceItemsBefore: choiceItemsBefore.length,
        resultsElementsCount: resultsElements.length,
        resultsElementTexts: resultsElements.slice(0, 5).map(el => el.textContent?.trim().substring(0, 50))
      };
    });
    
    console.log(`  Page loaded. Found ${pageInfo.buttonCount} buttons, ${pageInfo.voteElementsBefore} vote elements (before click)`);
    console.log(`  Button texts found: ${pageInfo.buttonTexts.join(', ')}`);
    console.log(`  Results elements: ${pageInfo.resultsElementsCount}`);
    
    // Try to find and click the Results button
    let buttonClicked = false;
    const resultsButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button, a, [role="button"]'));
      return buttons.find(btn => {
        const text = btn.textContent?.toLowerCase().trim();
        return text === 'results' || text === 'view results' || text.includes('results');
      });
    });
    
    if (resultsButton && resultsButton.asElement()) {
      console.log(`  Found Results button, clicking...`);
      await resultsButton.asElement().click();
      buttonClicked = true;
    } else {
      // If no button found, try clicking on any element with "Results" text
      const clicked = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('*'));
        const resultsElement = elements.find(el => {
          const text = el.textContent?.toLowerCase().trim();
          return text === 'results' || text === 'view results';
        });
        if (resultsElement) {
          resultsElement.click();
          return true;
        }
        return false;
      });
      if (clicked) {
        console.log(`  Clicked Results element via fallback method`);
        buttonClicked = true;
      } else {
        console.log(`  WARNING: Could not find Results button to click`);
      }
    }
    
    // Wait for vote elements to actually appear (with timeout)
    if (buttonClicked) {
      console.log(`  Waiting for vote results to load...`);
      
      // Try multiple selectors and wait strategies
      const selectorsToTry = [
        '.totalpoll-question-choices-item-votes-text',
        '.totalpoll-question-choices-item',
        '[class*="totalpoll"]',
        '[class*="votes"]'
      ];
      
      let elementsFound = false;
      for (const selector of selectorsToTry) {
        try {
          console.log(`  Trying selector: ${selector}`);
          await page.waitForSelector(selector, { 
            timeout: 10000,
            visible: true 
          });
          console.log(`  ✓ Found elements with selector: ${selector}`);
          elementsFound = true;
          break;
        } catch (waitError) {
          // Try next selector
          continue;
        }
      }
      
      if (elementsFound) {
        // Give extra time for any animations/transitions and data to fully populate
        console.log(`  Waiting additional 2 seconds for data to stabilize...`);
        await page.waitForTimeout(2000);
      } else {
        console.log(`  ⚠ No vote elements found with any selector, waiting 5 seconds and continuing...`);
        await page.waitForTimeout(5000);
      }
    } else {
      // If button wasn't clicked, wait a bit anyway
      await page.waitForTimeout(2000);
    }
    
    // Debug: Check page state after clicking
    const pageStateAfter = await page.evaluate(() => {
      const voteElements = document.querySelectorAll('.totalpoll-question-choices-item-votes-text');
      const choiceItems = document.querySelectorAll('.totalpoll-question-choices-item');
      
      // Try alternative selectors
      const altSelectors = [
        '.totalpoll-question-choices-item-votes-text',
        '[class*="votes"]',
        '[class*="percentage"]',
        '[class*="result"]'
      ];
      
      const altResults = {};
      altSelectors.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          altResults[selector] = elements.length;
        } catch (e) {
          altResults[selector] = 0;
        }
      });
      
      // Get sample HTML structure
      const sampleHTML = choiceItems.length > 0 
        ? choiceItems[0].outerHTML.substring(0, 500)
        : 'No choice items found';
      
      return {
        voteElementsCount: voteElements.length,
        choiceItemsCount: choiceItems.length,
        altSelectors: altResults,
        sampleHTML: sampleHTML,
        pageTitle: document.title,
        url: window.location.href
      };
    });
    
    console.log(`  After click: ${pageStateAfter.voteElementsCount} vote elements, ${pageStateAfter.choiceItemsCount} choice items`);
    console.log(`  Alternative selectors:`, pageStateAfter.altSelectors);
    console.log(`  Current URL: ${pageStateAfter.url}`);
    
    // Extract vote percentages
    const voteData = await page.evaluate(() => {
      const voteElements = document.querySelectorAll('.totalpoll-question-choices-item-votes-text');
      const candidates = [];
      
      // Also try to get candidate names - they might be in nearby elements
      const choiceItems = document.querySelectorAll('.totalpoll-question-choices-item');
      
      choiceItems.forEach((item, index) => {
        const voteText = item.querySelector('.totalpoll-question-choices-item-votes-text');
        if (voteText) {
          // Extract percentage from text (e.g., "45.2%" or "45.2 %")
          const text = voteText.textContent.trim();
          const match = text.match(/(\d+\.?\d*)\s*%/);
          const percentage = match ? parseFloat(match[1]) : null;
          
          // Try multiple strategies to find candidate name
          let candidateName = null;
          
          // Strategy 1: Look for label/title elements
          const nameElement = item.querySelector('.totalpoll-question-choices-item-label, .totalpoll-question-choices-item-title, label, [class*="label"], [class*="title"]');
          if (nameElement) {
            candidateName = nameElement.textContent?.trim();
          }
          
          // Strategy 2: Look for text nodes or headings within the item
          if (!candidateName) {
            const headings = item.querySelectorAll('h1, h2, h3, h4, h5, h6, strong, b');
            if (headings.length > 0) {
              candidateName = headings[0].textContent?.trim();
            }
          }
          
          // Strategy 3: Look for the first significant text node (not the percentage)
          if (!candidateName) {
            const allText = item.textContent || '';
            // Remove the percentage text and clean up
            const cleaned = allText.replace(/\d+\.?\d*\s*%/g, '').trim();
            // Take the first line or first significant chunk
            const lines = cleaned.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            if (lines.length > 0 && lines[0].length > 2) {
              candidateName = lines[0].substring(0, 100); // Limit length
            }
          }
          
          // Strategy 4: Look for links or buttons that might contain the name
          if (!candidateName) {
            const link = item.querySelector('a');
            if (link && link.textContent) {
              candidateName = link.textContent.trim();
            }
          }
          
          // Fallback to generic name
          if (!candidateName || candidateName.length < 2) {
            candidateName = `Candidate ${index + 1}`;
          }
          
          // Basic cleanup (can't use normalizeCandidateName here as it's not in browser context)
          candidateName = candidateName.replace(/\s+/g, ' ').trim();
          
          if (percentage !== null && candidateName && candidateName.length > 0) {
            candidates.push({
              name: candidateName,
              percentage: percentage
            });
          }
        }
      });
      
      // Fallback: if we can't find names via choice items, try direct vote elements
      if (candidates.length === 0 && voteElements.length > 0) {
        // Try to find parent elements that might contain names
        voteElements.forEach((el, index) => {
          const text = el.textContent.trim();
          const match = text.match(/(\d+\.?\d*)\s*%/);
          const percentage = match ? parseFloat(match[1]) : null;
          
          if (percentage !== null) {
            // Try to find name in parent/sibling elements
            let candidateName = `Candidate ${index + 1}`;
            const parent = el.closest('.totalpoll-question-choices-item, [class*="choice"], [class*="item"]');
            if (parent) {
              const nameEl = parent.querySelector('[class*="label"], [class*="title"], h1, h2, h3, h4, h5, h6, strong');
              if (nameEl) {
                candidateName = nameEl.textContent?.trim() || candidateName;
              }
            }
            
            // Basic cleanup (can't use normalizeCandidateName here as it's not in browser context)
            candidateName = candidateName.replace(/\s+/g, ' ').trim();
            
            if (candidateName && candidateName.length > 0) {
              candidates.push({
                name: candidateName,
                percentage: percentage
              });
            }
          }
        });
      }
      
      return candidates;
    });
    
    // Store the vote data
    if (voteData.length > 0) {
      // Normalize candidate names before storing (now we're back in Node.js context)
      const normalizedVoteData = voteData.map(candidate => ({
        ...candidate,
        name: normalizeCandidateName(candidate.name)
      }));
      
      // Log normalized names for debugging
      console.log(`  Extracted candidates:`, normalizedVoteData.map(c => `${c.name} (${c.percentage}%)`).join(', '));
      
      for (const candidate of normalizedVoteData) {
        insertVoteSnapshot(candidate.name, candidate.percentage);
        console.log(`  - ${candidate.name}: ${candidate.percentage}%`);
      }
      console.log(`[${new Date().toISOString()}] Successfully scraped ${normalizedVoteData.length} candidates`);
    } else {
      console.warn(`[${new Date().toISOString()}] No vote data found on page`);
      console.warn(`  Debug info: Button clicked: ${buttonClicked}, Vote elements found: ${pageStateAfter.voteElementsCount}`);
      
      // Save screenshot for debugging if in debug mode
      if (isDebug) {
        await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });
        console.log(`  Screenshot saved to debug-screenshot.png`);
      }
    }
    
    // Keep browser open in debug mode
    if (!isDebug) {
      await browser.close();
    } else {
      console.log(`  Browser kept open for inspection (DEBUG mode)`);
      // Close after 30 seconds in debug mode
      setTimeout(async () => {
        await browser.close();
      }, 30000);
    }
    
    return voteData;
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error scraping votes:`, error.message);
    if (browser) {
      await browser.close();
    }
    throw error;
  }
}

