const { chromium } = require('playwright');
const fs = require('fs');

const DATA_DIR = '/Users/mac/new/Gaming FPS_1';
const RESOLUTIONS = [
  { label: '1920x1080 (1K)', option: '1920 x 1080' },
  { label: '2560x1440 (2K)', option: '2560 x 1440' },
  { label: '3840x2160 (4K)', option: '3840 x 2160' }
];

// 读取现有数据
function getExistingData() {
  const file = DATA_DIR + '/howmanyfps_cyberpunk2077_gpu_data.md';
  const content = fs.readFileSync(file, 'utf8');
  const existing = new Set();
  const lines = content.split('\n');
  for (const line of lines) {
    if (line.startsWith('|')) {
      const parts = line.split('|').map(p => p.trim()).filter(p => p);
      if (parts.length >= 4) {
        existing.add(parts[0] + '|' + parts[1]);
      }
    }
  }
  return existing;
}

// Cyberpunk 2077 需要的 GPU 列表（减少到关键型号）
const NEEDED_GPUS = [
  'GeForce RTX 3060',
  'GeForce RTX 3060 Ti GDDR6X',
  'GeForce RTX 4060',
  'GeForce RTX 5070',
  'GeForce RTX 5080',
  'GeForce RTX 5090',
  'Radeon RX 6700',
  'Radeon RX 7600',
  'Radeon RX 9060 XT',
];

// 搜索并选择GPU
async function searchAndSelect(page, searchTerm) {
  await page.click('[aria-label="Search for a GPU"]', {force: true});
  await page.waitForTimeout(300);

  await page.evaluate(() => {
    const inputs = document.querySelectorAll('input');
    for (const inp of inputs) {
      if (inp.placeholder?.includes('Search')) {
        inp.value = '';
      }
    }
  });
  await page.waitForTimeout(100);

  await page.keyboard.type(searchTerm, { delay: 30 });
  await page.waitForTimeout(800);

  const match = await page.evaluate((originalTerm) => {
    const opts = document.querySelectorAll('[role="option"]');
    for (const opt of opts) {
      if (opt.textContent?.includes(originalTerm) && !opt.textContent?.includes('Mobile')) {
        opt.click();
        return opt.textContent.substring(0, 60);
      }
    }
    return null;
  }, searchTerm);

  if (!match) {
    await page.keyboard.press('Escape');
    return null;
  }

  await page.waitForTimeout(1500);
  return match;
}

// 获取FPS数据
async function getFpsData(page) {
  return await page.evaluate(() => {
    const ps = document.querySelectorAll('p');
    for (let i = 0; i < ps.length; i++) {
      if (ps[i].textContent === 'Real-Time Average' && i > 0) {
        const avgText = ps[i-1].textContent;
        const lowText = ps[i+1]?.textContent;

        if (avgText === '— FPS' || avgText === 'Under 10 FPS' || lowText === '— FPS' || lowText === 'Under 10 FPS') {
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

// 采集数据
async function collectData(page, name) {
  const selected = await searchAndSelect(page, name);
  if (!selected) return null;

  const results = [];
  for (const res of RESOLUTIONS) {
    await page.click('[aria-label="Select game resolution"]', {force: true});
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
  const browser = await chromium.connectOverCDP('http://localhost:9222', {timeout: 60000});
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('https://howmanyfps.com/games/cyberpunk-2077', {timeout: 60000, waitUntil: 'domcontentloaded'});
  await page.waitForTimeout(3000);

  const existing = getExistingData();
  console.log('已存在 ' + existing.size + ' 条数据\n');

  let content = '';
  let successCount = 0;

  for (const gpu of NEEDED_GPUS) {
    console.log('采集: ' + gpu + '...');
    const data = await collectData(page, gpu);

    if (!data) {
      console.log('  ❌ 未找到');
      continue;
    }

    let hasSuccess = false;
    for (const r of data.results) {
      const key = gpu + '|' + r.resolution;
      if (r.valid && !existing.has(key)) {
        content += '| ' + gpu + ' | ' + r.resolution + ' | ' + r.avg + ' FPS | ' + r.low + ' |\n';
        existing.add(key);
        console.log('  ✅ ' + r.resolution + ': ' + r.avg + ' FPS');
        hasSuccess = true;
      } else if (!r.valid) {
        console.log('  ⚠️ ' + r.resolution + ': 无数据');
      } else {
        console.log('  ⏭️ ' + r.resolution + ': 已存在');
      }
    }
    if (hasSuccess) successCount++;
  }

  if (content) {
    // 追加到现有文件
    const file = DATA_DIR + '/howmanyfps_cyberpunk2077_gpu_data.md';
    fs.appendFileSync(file, content);
    console.log('\n已补充 ' + successCount + ' 个GPU的新数据');
  } else {
    console.log('\n没有新数据补充');
  }

  await browser.close();
}

main().catch(e => console.error('Error:', e.message));
