const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 375, height: 667 }
  });
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'artifacts/mobile_screenshot.png' });
  await browser.close();
  console.log("Screenshot taken: artifacts/mobile_screenshot.png");
})();
