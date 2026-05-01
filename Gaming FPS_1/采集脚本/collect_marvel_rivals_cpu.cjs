const { chromium } = require('playwright');
const fs = require('fs');

const DATA_DIR = '/Users/mac/new/Gaming FPS_1';
const GAME = 'marvel-rivals';
const GAME_NAME = 'Marvel Rivals';
const FILE_NAME = 'howmanyfps_marvel_rivals_cpu_data.md';
const TYPE = 'cpu';

const RESOLUTIONS = [
  { label: '1920x1080 (1K)', option: '1920 x 1080' },
  { label: '2560x1440 (2K)', option: '2560 x 1440' },
  { label: '3840x2160 (4K)', option: '3840 x 2160' }
];

// Intel Core Ultra
const CPU_LIST = [
  'Core Ultra 9 285K',
  'Core Ultra 7 265K',
  'Core Ultra 7 265KF',
  'Core Ultra 5 245K',
  'Core Ultra 5 245KF',
  'Core Ultra 5 225',
  'Core Ultra 5 225F',
  // Intel 14代
  'Core i9-14900KS',
  'Core i9-14900K',
  'Core i9-14900KF',
  'Core i9-14900',
  'Core i9-14900F',
  'Core i7-14700K',
  'Core i7-14700KF',
  'Core i7-14700',
  'Core i7-14700F',
  'Core i5-14600K',
  'Core i5-14600KF',
  'Core i5-14600',
  'Core i5-14500',
  'Core i5-14400',
  'Core i5-14400F',
  // Intel 13代
  'Core i9-13900KS',
  'Core i9-13900K',
  'Core i9-13900KF',
  'Core i9-13900',
  'Core i9-13900F',
  'Core i7-13700K',
  'Core i7-13700KF',
  'Core i7-13700',
  'Core i7-13700F',
  'Core i5-13600K',
  'Core i5-13600KF',
  'Core i5-13500',
  'Core i5-13400',
  'Core i5-13400F',
  // Intel 12代
  'Core i9-12900KS',
  'Core i9-12900K',
  'Core i9-12900KF',
  'Core i9-12900',
  'Core i9-12900F',
  'Core i7-12700K',
  'Core i7-12700KF',
  'Core i7-12700',
  'Core i7-12700F',
  'Core i5-12600K',
  'Core i5-12600KF',
  'Core i5-12600',
  'Core i5-12500',
  'Core i5-12400',
  'Core i5-12400F',
  // Intel 11代
  'Core i9-11900K',
  'Core i9-11900KF',
  'Core i9-11900F',
  'Core i7-11700K',
  'Core i7-11700KF',
  'Core i7-11700F',
  'Core i5-11600K',
  'Core i5-11600KF',
  'Core i5-11600',
  'Core i5-11500',
  'Core i5-11400F',
  // Intel 10代/更早
  'Core i5-11400',
  'Core i5-10400',
  'Core i5-10400F',
  'Core i3-14100',
  'Core i3-13100',
  'Core i3-13100F',
  'Core i3-12300',
  'Core i3-12100',
  'Core i3-12100F',
  // AMD Ryzen 9000
  'Ryzen 9 9950X3D',
  'Ryzen 9 9950X',
  'Ryzen 9 9900X',
  'Ryzen 9 9850X3D',
  'Ryzen 7 9800X3D',
  'Ryzen 7 9700X',
  // AMD Ryzen 7000
  'Ryzen 9 7950X3D',
  'Ryzen 9 7950X',
  'Ryzen 9 7900X3D',
  'Ryzen 9 7900X',
  'Ryzen 7 7800X3D',
  'Ryzen 7 7700X',
  'Ryzen 7 7700',
  'Ryzen 5 7600X',
  'Ryzen 5 7600',
  'Ryzen 5 7500F',
  // AMD Ryzen 5000
  'Ryzen 9 5950X',
  'Ryzen 9 5900X',
  'Ryzen 9 5900',
  'Ryzen 7 5800X3D',
  'Ryzen 7 5800X',
  'Ryzen 7 5800',
  'Ryzen 7 5700X3D',
  'Ryzen 7 5700X',
  'Ryzen 7 5700G',
  'Ryzen 7 5700',
  'Ryzen 5 5600X3D',
  'Ryzen 5 5600X',
  'Ryzen 5 5600GT',
  'Ryzen 5 5600G',
  'Ryzen 5 5600',
  'Ryzen 5 5500',
  'Ryzen 5 5600XT',
  'Ryzen 3 5300G',
  // AMD Phoenix
  'Ryzen 7 8700G',
  'Ryzen 5 8600G',
  'Ryzen 5 8500G',
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
    await page.click('[aria-label="Search for a CPU"]', {force: true, timeout: 5000});
  } catch {
    await page.click('[aria-label="Search for a Processor"]', {force: true, timeout: 5000});
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
    'Core ' + searchTerm,
    'Ryzen ' + searchTerm,
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
        if (opt.textContent?.includes(originalTerm)) {
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
  await page.waitForTimeout(4000);

  const existing = getExistingData();
  console.log(`已存在 ${existing.size} 条数据\n`);

  let content = '';
  let successCount = 0;
  let notFoundCount = 0;

  for (const cpu of CPU_LIST) {
    if (existing.has(cpu + '|1920x1080 (1K)')) {
      console.log(`⏭️ ${cpu}: 已存在，跳过`);
      continue;
    }

    console.log(`采集: ${cpu}...`);
    const data = await collectData(page, cpu);

    if (!data) {
      console.log(`  ❌ 未找到`);
      notFoundCount++;
      continue;
    }

    let hasSuccess = false;
    for (const r of data.results) {
      const key = cpu + '|' + r.resolution;
      if (r.valid && !existing.has(key)) {
        content += `| ${cpu} | ${r.resolution} | ${r.avg} FPS | ${r.low} FPS |\n`;
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

    if (successCount > 0 && successCount % 10 === 0) {
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
      const header = `# ${GAME_NAME} CPU 帧率数据 — HowManyFPS\n## 游戏: ${GAME_NAME}\n## 采集时间: ${new Date().toISOString().split('T')[0]}\n\n| CPU | 分辨率 | Real-Time Average | 1% Lows |\n|-----|--------|-------------------|--------|\n\n`;
      fs.writeFileSync(file, header);
    }
    fs.appendFileSync(file, content);
  }

  console.log(`\n采集完成: ${successCount} 个CPU成功, ${notFoundCount} 个未找到`);
  await browser.close();
}

main().catch(e => console.error('Error:', e.message));
