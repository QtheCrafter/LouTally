// Debug script to test the scraper with detailed output
import { scrapeVotes } from './scraper.js';

// Set DEBUG mode
process.env.DEBUG = 'true';

console.log('Running scraper in DEBUG mode...');
console.log('Browser will open so you can see what\'s happening');
console.log('Browser will close automatically after 30 seconds\n');

scrapeVotes()
  .then(data => {
    console.log('\n=== Scrape Complete ===');
    console.log(`Found ${data.length} candidates`);
    if (data.length > 0) {
      data.forEach(c => console.log(`  ${c.name}: ${c.percentage}%`));
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('\n=== Error ===');
    console.error(error);
    process.exit(1);
  });

