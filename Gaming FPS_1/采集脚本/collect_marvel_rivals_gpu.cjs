const { chromium } = require('playwright');
const fs = require('fs');

const DATA_DIR = '/Users/mac/new/Gaming FPS_1';
const GAME = 'marvel-rivals';
const GAME_NAME = 'Marvel Rivals';
const FILE_NAME = 'howmanyfps_marvel_rivals_gpu_data.md';
const TYPE = 'gpu';

const RESOLUTIONS = [
  { label: '1920x1080 (1K)', option: '1920 x 1080' },
  { label: '2560x1440 (2K)', option: '2560 x 1440' },
  { label: '3840x2160 (4K)', option: '3840 x 2160' }
];

// RTX 30/40/50系列 + AMD主流
const GPU_LIST = [
  // NVIDIA RTX 50系列
  'GeForce RTX 5090',
  'GeForce RTX 5080',
  'GeForce RTX 5070 Ti',
  'GeForce RTX 5070',
  'GeForce RTX 5060 Ti',
  'GeForce RTX 5060',
  'GeForce RTX 5050',
  // NVIDIA RTX 40系列
  'GeForce RTX 4090',
  'GeForce RTX 4080 Super',
  'GeForce RTX 4080',
  'GeForce RTX 4070 Ti Super',
  'GeForce RTX 4070 Ti',
  'GeForce RTX 4070 Super',
  'GeForce RTX 4070',
  'GeForce RTX 4060 Ti',
  'GeForce RTX 4060',
  // NVIDIA RTX 30系列
  'GeForce RTX 3090 Ti',
  'GeForce RTX 3090',
  'GeForce RTX 3080 Ti',
  'GeForce RTX 3080',
  'GeForce RTX 3070 Ti',
  'GeForce RTX 3070',
  'GeForce RTX 3060 Ti',
  'GeForce RTX 3060 Ti GDDR6X',
  'GeForce RTX 3060',
  'GeForce RTX 3060 8 GB',
  'GeForce RTX 3050',
  'GeForce RTX 3050 6 GB',
  // AMD RX 9000系列
  'Radeon RX 9070 XT',
  'Radeon RX 9070',
  // AMD RX 8000系列
  'Radeon RX 8800 XT',
  'Radeon RX 9070',
  // AMD RX 7000系列
  'Radeon RX 7900 XTX',
  'Radeon RX 7900 XT',
  'Radeon RX 7900 GRE',
  'Radeon RX 7800 XT',
  'Radeon RX 7700 XT',
  'Radeon RX 7600 XT',
  'Radeon RX 7600',
  'Radeon RX 7500 XT',
  // AMD RX 6000系列
  'Radeon RX 6900 XT',
  'Radeon RX 6800 XT',
  'Radeon RX 6800',
  'Radeon RX 6750 XT',
  'Radeon RX 6700 XT',
  'Radeon RX 6700',
  'Radeon RX 6650 XT',
  'Radeon RX 6600 XT',
  'Radeon RX 6600',
  'Radeon RX 6500 XT',
  // 其他
  'Radeon RX 6400',
  'GeForce RTX 4090 D',
  'GeForce RTX 4080 Super',
  'GeForce RTX 4070 Ti Super',
  'GeForce RTX 4070 Super',
];

function getExistingData() {
  const file = DATA_DIR + '/' + FILE_NAME;
  if (!fs.existsSync(file)) return new Set();
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

async function searchAndSelect(page, searchTerm) {
  try {
    await page.click('[aria-label="Search for a GPU"]', {force: true, timeout: 5000});
  } catch {
    await page.click('[aria-label="Search for a Graphics Card"]', {force: true, timeout: 5000});
  }
  await page.waitForTimeout(300);

  await page.evaluate(() => {
    const inputs = document.querySelectorAll('input');
    for (const inp of inputs) {
      if (inp.placeholder?.toLowerCase().includes('search')) {
        inp.value = '';
        break;
      }
    }
  });
  await page.waitForTimeout(100);

  const searchTerms = [
    searchTerm,
    'GeForce ' + searchTerm,
    'Radeon ' + searchTerm,
  ];

  for (const term of searchTerms) {
    await page.evaluate(() => {
      const inputs = document.querySelectorAll('input');
      for (const inp of inputs) {
        if (inp.placeholder?.toLowerCase().includes('search')) {
          inp.value = '';
          break;
        }
      }
    });
    await page.waitForTimeout(100);
    await page.keyboard.type(term, { delay: 30 });
    await page.waitForTimeout(600);

    const match = await page.evaluate((originalTerm) => {
      const opts = document.querySelectorAll('[role="option"]');
      for (const opt of opts) {
        if (opt.textContent?.includes(originalTerm) && !opt.textContent?.includes('Mobile') && !opt.textContent?.includes('Laptop')) {
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
  }

  await page.keyboard.press('Escape');
  return null;
}

async function getFpsData(page) {
  return await page.evaluate(() => {
    const ps = document.querySelectorAll('p');
    for (let i = 0; i < ps.length; i++) {
      if (ps[i].textContent === 'Real-Time Average' && i > 0) {
        const avgText = ps[i-1]?.textContent;
        const lowText = ps[i+1]?.textContent;

        if (!avgText || !lowText) return { valid: false, reason: 'missing_text' };
        if (avgText === '— FPS' || avgText === 'Under 10 FPS' || lowText === '— FPS' || lowText === 'Under 10 FPS') {
          return { valid: false, reason: 'no_data' };
        }

        const avg = avgText?.match(/(\d+)/)?.[1];
        const low = lowText?.match(/(\d+)/)?.[1];

        if (!avg || !low) return { valid: false, reason: 'parse_failed' };
        return { valid: true, avg, low };
      }
    }
    return { valid: false, reason: 'element_not_found' };
  });
}

async function collectData(page, name) {
  const selected = await searchAndSelect(page, name);
  if (!selected) return null;

  const results = [];
  for (const res of RESOLUTIONS) {
    try {
      await page.click('[aria-label="Select game resolution"]', {force: true, timeout: 3000});
    } catch {
      await page.click('[aria-label="Select resolution"]', {force: true, timeout: 3000});
    }
    await page.waitForTimeout(300);

    await page.evaluate((opt) => {
      const opts = document.querySelectorAll('[role="option"]');
      for (const o of opts) {
        if (o.textContent?.includes(opt.split(' x ')[0]) && o.textContent?.includes(opt.split(' x ')[1])) {
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

  const url = `https://howmanyfps.com/games/${GAME}`;
  console.log(`导航到: ${url}`);
  await page.goto(url, {timeout: 60000, waitUntil: 'domcontentloaded'});
  await page.waitForTimeout(4000); // 等待页面完全加载

  const existing = getExistingData();
  console.log(`已存在 ${existing.size} 条数据\n`);

  let content = '';
  let successCount = 0;
  let notFoundCount = 0;

  for (const gpu of GPU_LIST) {
    if (existing.has(gpu + '|1920x1080 (1K)')) {
      console.log(`⏭️ ${gpu}: 已存在，跳过`);
      continue;
    }

    console.log(`采集: ${gpu}...`);
    const data = await collectData(page, gpu);

    if (!data) {
      console.log(`  ❌ 未找到`);
      notFoundCount++;
      continue;
    }

    let hasSuccess = false;
    for (const r of data.results) {
      const key = gpu + '|' + r.resolution;
      if (r.valid && !existing.has(key)) {
        content += `| ${gpu} | ${r.resolution} | ${r.avg} FPS | ${r.low} FPS |\n`;
        existing.add(key);
        console.log(`  ✅ ${r.resolution}: ${r.avg} FPS / ${r.low} FPS`);
        hasSuccess = true;
      } else if (!r.valid) {
        console.log(`  ⚠️ ${r.resolution}: 无数据`);
      } else {
        console.log(`  ⏭️ ${r.resolution}: 已存在`);
      }
    }
    if (hasSuccess) successCount++;

    // 每5个保存一次
    if (successCount > 0 && successCount % 5 === 0) {
      const file = DATA_DIR + '/' + FILE_NAME;
      if (fs.existsSync(file)) {
        fs.appendFileSync(file, content);
        content = '';
        console.log(`\n已保存进度...\n`);
      }
    }
  }

  if (content) {
    const file = DATA_DIR + '/' + FILE_NAME;
    if (!fs.existsSync(file)) {
      const header = `# ${GAME_NAME} GPU 帧率数据 — HowManyFPS\n## 游戏: ${GAME_NAME}\n## 采集时间: ${new Date().toISOString().split('T')[0]}\n\n| GPU | 分辨率 | Real-Time Average | 1% Lows |\n|-----|--------|-------------------|--------|\n\n`;
      fs.writeFileSync(file, header);
    }
    fs.appendFileSync(file, content);
  }

  console.log(`\n采集完成: ${successCount} 个GPU成功, ${notFoundCount} 个未找到`);
  await browser.close();
}

main().catch(e => console.error('Error:', e.message));
