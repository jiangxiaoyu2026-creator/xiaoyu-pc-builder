import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        url = "https://open.jd.com/v2/#/doc/apiAuthPackage?apiCateId=593&apiId=1380&apiName=jingdong.ware.write.updateWare&apiCateName=%E7%AB%99%E5%A4%96%E7%AB%99%E5%86%85%E5%AF%BC%E6%B5%81%E5%9F%BA%E7%A1%80%E5%8C%85&gwType=0"
        
        try:
            await page.goto(url, wait_until="networkidle", timeout=20000)
            await page.wait_for_timeout(3000)
            await page.screenshot(path="jd_api_test.png", full_page=False)
            print("Screenshot saved to jd_api_test.png")
            
            # Extract plain text from page
            content = await page.evaluate("() => document.body.innerText")
            print("=== PAGE CONTENT ===")
            print(content[:1500])  # print first 1500 chars
            
        except Exception as e:
            print(f"Error: {e}")
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
