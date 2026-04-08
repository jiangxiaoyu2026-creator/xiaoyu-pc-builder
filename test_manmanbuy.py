import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        url = "https://tool.manmanbuy.com/HistoryLowest.aspx?url=item.jd.com%2F100114195705.html"
        print(f"Navigating to {url}")
        
        try:
            await page.goto(url, wait_until="networkidle", timeout=15000)
            await page.wait_for_timeout(3000)  # Wait for any JS components to load
            await page.screenshot(path="manmanbuy_test.png", full_page=True)
            print("Screenshot saved to manmanbuy_test.png")
            
            # Print page title
            title = await page.title()
            print(f"Title: {title}")
            
            # Print any text content that might be the price
            content = await page.content()
            if "￥" in content or "¥" in content:
                print("Found price symbol in HTML.")
            else:
                print("No price symbol found in HTML.")
                
        except Exception as e:
            print(f"Error: {e}")
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
