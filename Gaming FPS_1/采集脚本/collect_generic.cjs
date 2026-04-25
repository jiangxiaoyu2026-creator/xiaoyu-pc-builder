const { chromium } = require('playwright');
const fs = require('fs');

const DATA_DIR = '/Users/mac/new/Gaming FPS_1';
const RESOLUTIONS = [
  { label: '1920x1080 (1K)', option: '1920 x 1080' },
  { label: '2560x1440 (2K)', option: '2560 x 1440' },
  { label: '3840x2160 (4K)', option: '3840 x 2160' }
];

// 修复版搜索函数
async function searchAndSelect(page, type, searchTerm) {
  await page.click(`[aria-label="Search for a ${type}"]`);
  await page.waitForTimeout(300);

  const searchTerms = [
    searchTerm,
    'GeForce ' + searchTerm,
    'Radeon ' + searchTerm.replace('RX ', 'RX ')
  ];

  let selected = null;

  for (const term of searchTerms) {
    await page.evaluate(() => {
      const inputs = document.querySelectorAll('input');
      for (const inp of inputs) {
        if (inp.placeholder?.includes('Search')) {
          inp.value = '';
        }
      }
    });
    await page.waitForTimeout(100);

    await page.keyboard.type(term, { delay: 30 });
    await page.waitForTimeout(600);

    const match = await page.evaluate((originalTerm) => {
      const opts = document.querySelectorAll('[role="option"]');
      for (const opt of opts) {
        if (opt.textContent?.includes(originalTerm)) {
          opt.click();
          return opt.textContent.substring(0, 60);
        }
      }
      return null;
    }, searchTerm);

    if (match) {
      selected = match;
      break;
    }
  }

  if (!selected) {
    await page.keyboard.press('Escape');
    return null;
  }

  await page.waitForTimeout(1500);
  return selected;
}

async function getFpsData(page) {
  return await page.evaluate(() => {
    const ps = document.querySelectorAll('p');
    for (let i = 0; i < ps.length; i++) {
      if (ps[i].textContent === 'Real-Time Average' && i > 0) {
        const avgText = ps[i-1].textContent;
        const lowText = ps[i+1]?.textContent;

        if (avgText === '— FPS' || lowText === '— FPS') {
          return { valid: false, reason: 'no_data' };
        }

        const avg = avgText?.match(/(\d+)/)?.[1];
        const low = lowText?.match(/(\d+)/)?.[1];

        if (!avg || !low) {
          return { valid: false, reason: 'parse_failed' };
        }

        return { valid: true, avg, low };
      }
    }
    return { valid: false, reason: 'not_found' };
  });
}

async function collectHardware(page, type, name) {
  const selected = await searchAndSelect(page, type, name);
  if (!selected) return null;

  const results = [];
  for (const res of RESOLUTIONS) {
    await page.click('[aria-label="Select game resolution"]');
    await page.waitForTimeout(300);

    await page.evaluate((opt) => {
      const opts = document.querySelectorAll('[role="option"]');
      for (const o of opts) {
        if (o.textContent?.includes(opt)) {
          o.click();
          return;
        }
      }
    }, res.option);

    await page.waitForTimeout(1500);

    const fps = await getFpsData(page);
    results.push({ resolution: res.label, ...fps });
  }

  return { selected, results };
}

async function main() {
  const game = process.argv[2] || 'fortnite';
  const type = process.argv[3] || 'gpu';
  const hardwareList = process.argv.slice(4);

  if (hardwareList.length === 0) {
    console.log('用法: node collect_generic.cjs <游戏> <类型> <硬件列表...>');
    process.exit(1);
  }

  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(`https://howmanyfps.com/games/${game}`);
  await page.waitForTimeout(3000);

  let content = `# ${game} ${type.toUpperCase()} 帧率数据 — HowManyFPS\n`;
  content += `## 游戏: ${game}\n## 采集时间: ${new Date().toISOString().split('T')[0]}\n\n`;
  content += `| ${type.toUpperCase()} | 分辨率 | Real-Time Average | 1% Lows |\n|-----|--------|-------------------|--------|\n`;

  console.log(`=== ${game} ${type.toUpperCase()} 采集 ===\n`);

  const issues = [];

  for (let i = 0; i < hardwareList.length; i++) {
    const hw = hardwareList[i];
    console.log(`[${i+1}/${hardwareList.length}] ${hw}...`);

    const data = await collectHardware(page, type, hw);

    if (!data) {
      console.log('  ❌ 未找到');
      issues.push({ hw, reason: 'not_found' });
      continue;
    }

    let hasValid = false;
    for (const r of data.results) {
      if (r.valid) {
        content += `| ${hw} | ${r.resolution} | ${r.avg} FPS | ${r.low} FPS |\n`;
        hasValid = true;
      } else {
        issues.push({ hw, res: r.resolution, reason: r.reason });
      }
    }

    if (hasValid) {
      const validCount = data.results.filter(r => r.valid).length;
      console.log(`  ✅ 成功 (${validCount}/3)`);
    } else {
      console.log(`  ❌ 全部无数据`);
    }

    if ((i + 1) % 5 === 0) {
      console.log(`\n--- 进度: ${i+1}/${hardwareList.length} ---\n`);
    }
  }

  fs.writeFileSync(`${DATA_DIR}/${game}_${type}_temp.md`, content);

  if (issues.length > 0) {
    fs.writeFileSync(`${DATA_DIR}/${game}_${type}_issues.json`, JSON.stringify(issues, null, 2));
    console.log(`\n问题数据: ${issues.length} 条`);
  }

  console.log(`\n=== 完成 ===`);
  await browser.close();
}

main().catch(console.error);
