const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 375, height: 812 }
  });
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/Users/mac/.gemini/antigravity/brain/6ad6c380-1009-4e2e-9b08-3abeffe40be1/artifacts/mobile_screenshot.png' });
  await browser.close();
  console.log("Screenshot taken: artifacts/mobile_screenshot.png");
})();
