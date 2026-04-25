const { chromium } = require('playwright');
const fs = require('fs');

const DATA_DIR = '/Users/mac/new/Gaming FPS_1';
const RESOLUTIONS = [
  { label: '1920x1080 (1K)', option: '1920 x 1080' },
  { label: '2560x1440 (2K)', option: '2560 x 1440' },
  { label: '3840x2160 (4K)', option: '3840 x 2160' }
];

// 需要补采的数据
const MISSING_DATA = [
  { type: 'cpu', name: 'Ryzen 5 8600G', resolutions: ['2560x1440 (2K)'] },
  { type: 'gpu', name: 'GeForce RTX 3060 8 GB', resolutions: ['1920x1080 (1K)', '2560x1440 (2K)', '3840x2160 (4K)'] },
  { type: 'gpu', name: 'GeForce RTX 4080 Super', resolutions: ['1920x1080 (1K)'] },
  { type: 'gpu', name: 'GeForce RTX 4090 D', resolutions: ['1920x1080 (1K)', '2560x1440 (2K)', '3840x2160 (4K)'] },
  { type: 'gpu', name: 'Radeon RX 8800 XT', resolutions: ['1920x1080 (1K)', '2560x1440 (2K)', '3840x2160 (4K)'] },
  { type: 'gpu', name: 'Radeon RX 9700 XT', resolutions: ['1920x1080 (1K)', '2560x1440 (2K)', '3840x2160 (4K)'] },
  { type: 'gpu', name: 'Radeon RX 9800 XT', resolutions: ['1920x1080 (1K)', '2560x1440 (2K)', '3840x2160 (4K)'] },
];

async function collectSingleData(page, type, name, resolution) {
  try {
    const comboboxLabel = type === 'cpu' ? 'Search for a CPU' : 'Search for a GPU';

    // 点击下拉框
    await page.click(`[aria-label="${comboboxLabel}"]`);
    await page.waitForTimeout(400);

    // 输入搜索词
    await page.keyboard.type(name, { delay: 30 });
    await page.waitForTimeout(600);

    // 选择选项
    await page.evaluate((searchTerm) => {
      const opts = document.querySelectorAll('[role="option"]');
      for (const opt of opts) {
        const text = opt.textContent || '';
        // 尝试多种匹配方式
        if (text.includes(searchTerm) || searchTerm.includes(text.split(' ')[0])) {
          opt.click();
          return true;
        }
      }
      // 如果有选项，选第一个
      if (opts.length > 0) {
        opts[0].click();
        return true;
      }
      return false;
    }, name);

    await page.waitForTimeout(1500);

    // 选择分辨率
    const resOption = RESOLUTIONS.find(r => r.label === resolution)?.option;
    if (resOption) {
      await page.click('[aria-label="Select game resolution"]');
      await page.waitForTimeout(400);

      await page.evaluate((opt) => {
        const opts = document.querySelectorAll('[role="option"]');
        for (const o of opts) {
          if (o.textContent?.includes(opt)) {
            o.click();
            return;
          }
        }
      }, resOption);

      await page.waitForTimeout(1500);
    }

    // 获取FPS数据
    const fps = await page.evaluate(() => {
      const ps = document.querySelectorAll('p');
      for (let i = 0; i < ps.length; i++) {
        if (ps[i].textContent === 'Real-Time Average' && i > 0) {
          const avg = ps[i-1].textContent?.match(/(\d+)/)?.[1];
          const low = ps[i+1]?.textContent?.match(/(\d+)/)?.[1];
          return { avg, low };
        }
      }
      return null;
    });

    return fps;
  } catch (e) {
    console.log(`  错误: ${e.message}`);
    return null;
  }
}

async function main() {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('https://howmanyfps.com/games/counter-strike-2');
  await page.waitForTimeout(3000);

  console.log('开始补采缺失数据...\n');

  const results = [];

  for (const item of MISSING_DATA) {
    console.log(`补采 ${item.type.toUpperCase()}: ${item.name}`);

    for (const res of item.resolutions) {
      console.log(`  - ${res}...`);
      const fps = await collectSingleData(page, item.type, item.name, res);

      if (fps) {
        console.log(`    结果: ${fps.avg} FPS / ${fps.low} FPS`);
        results.push({
          type: item.type,
          name: item.name,
          resolution: res,
          avg: fps.avg,
          low: fps.low
        });
      } else {
        console.log(`    失败或无数据`);
      }
    }
    console.log('');
  }

  console.log('\n补采完成!');
  console.log('\n需要补充的数据:');
  for (const r of results) {
    console.log(`${r.type}: ${r.name} - ${r.resolution}: ${r.avg}/${r.low}`);
  }

  // 保存结果
  fs.writeFileSync(`${DATA_DIR}/cs2_fix_data.json`, JSON.stringify(results, null, 2));

  await browser.close();
}

main().catch(console.error);
