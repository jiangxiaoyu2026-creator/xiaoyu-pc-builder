import puppeteer from 'puppeteer';

(async () => {
    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.setViewport({ width: 375, height: 667 });
        await page.goto('http://localhost:5173/');
        await new Promise(r => setTimeout(r, 2000));
        await page.screenshot({ path: 'mobile_screenshot.png' });
        await browser.close();
        console.log("Screenshot taken: mobile_screenshot.png");
    } catch (e) {
        console.error(e);
    }
})();
