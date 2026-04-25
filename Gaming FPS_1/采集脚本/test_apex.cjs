const { chromium } = require('playwright');
const fs = require('fs');

const MISSING_GPUS = [
  'GeForce RTX 3050 6 GB', 'GeForce RTX 3060 8 GB', 'GeForce RTX 3060 Ti GDDR6X',
  'GeForce RTX 3090 Ti', 'GeForce RTX 4070 SUPER', 'GeForce RTX 4070 Ti SUPER'
];

async function searchAndSelect(page, type, searchTerm) {
  console.log('Clicking search for', type);
  await page.click('[aria-label="Search for a ' + type + '"]');
  await page.waitForTimeout(300);

  console.log('Typing search term:', searchTerm);
  await page.keyboard.type(searchTerm, { delay: 30 });
  await page.waitForTimeout(600);

  const match = await page.evaluate((originalTerm) => {
    const opts = document.querySelectorAll('[role="option"]');
    console.log('Found', opts.length, 'options');
    for (const opt of opts) {
      if (opt.textContent?.includes(originalTerm)) {
        console.log('Found match:', opt.textContent.substring(0, 50));
        opt.click();
        return opt.textContent.substring(0, 60);
      }
    }
    return null;
  }, searchTerm);

  if (match) {
    await page.waitForTimeout(1500);
    return match;
  }
  await page.keyboard.press('Escape');
  return null;
}

async function main() {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('https://howmanyfps.com/games/apex-legends');
  await page.waitForTimeout(3000);

  console.log('Page loaded, starting collection...');

  for (let i = 0; i < Math.min(MISSING_GPUS.length, 3); i++) {
    const gpu = MISSING_GPUS[i];
    console.log('\n[' + (i+1) + '/' + Math.min(MISSING_GPUS.length, 3) + '] Processing ' + gpu);
    const result = await searchAndSelect(page, 'GPU', gpu);
    if (result) {
      console.log('  Selected:', result);
    } else {
      console.log('  Not found');
    }
  }

  await browser.close();
  console.log('Done!');
}

main().catch(e => console.error('Error:', e.message));