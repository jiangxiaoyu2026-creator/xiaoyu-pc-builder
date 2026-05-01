const { chromium } = require('playwright');
const fs = require('fs');
const { execSync } = require('child_process');

const DATA_DIR = '/Users/mac/new/Gaming FPS_1';
const GAME = 'forza-horizon-5';
const GAME_NAME = 'Forza Horizon 5';
const FILE_NAME = 'howmanyfps_forza_horizon_5_gpu_data.md';

const RESOLUTIONS = [
  { label: '1920x1080 (1K)', option: '1920 x 1080' },
  { label: '2560x1440 (2K)', option: '2560 x 1440' },
  { label: '3840x2160 (4K)', option: '3840 x 2160' }
];

const GPU_LIST = [
  'GeForce RTX 5090', 'GeForce RTX 5080', 'GeForce RTX 5070 Ti', 'GeForce RTX 5070',
  'GeForce RTX 5060 Ti', 'GeForce RTX 5060', 'GeForce RTX 5050', 'GeForce RTX 4090',
  'GeForce RTX 4080 Super', 'GeForce RTX 4080', 'GeForce RTX 4070 Ti Super', 'GeForce RTX 4070 Ti',
  'GeForce RTX 4070 Super', 'GeForce RTX 4070', 'GeForce RTX 4060 Ti', 'GeForce RTX 4060',
  'GeForce RTX 3090 Ti', 'GeForce RTX 3090', 'GeForce RTX 3080 Ti', 'GeForce RTX 3080',
  'GeForce RTX 3070 Ti', 'GeForce RTX 3070', 'GeForce RTX 3060 Ti', 'GeForce RTX 3060 Ti GDDR6X',
  'GeForce RTX 3060', 'GeForce RTX 3060 8 GB', 'GeForce RTX 3050', 'GeForce RTX 3050 6 GB',
  'Radeon RX 9070 XT', 'Radeon RX 9070', 'Radeon RX 7900 XTX', 'Radeon RX 7900 XT',
  'Radeon RX 7900 GRE', 'Radeon RX 7800 XT', 'Radeon RX 7700 XT', 'Radeon RX 7600 XT', 'Radeon RX 7600',
  'Radeon RX 6900 XT', 'Radeon RX 6800 XT', 'Radeon RX 6800', 'Radeon RX 6750 XT',
  'Radeon RX 6700 XT', 'Radeon RX 6700', 'Radeon RX 6650 XT', 'Radeon RX 6600 XT', 'Radeon RX 6600',
  'Radeon RX 6500 XT', 'Radeon RX 6400',
];

function getExistingData() {
  const file = DATA_DIR + '/' + FILE_NAME;
  if (!fs.existsSync(file)) return new Set();
  const content = fs.readFileSync(file, 'utf8');
  const existing = new Set();
  content.split('\n').forEach(line => {
    if (line.startsWith('|')) {
      const parts = line.split('|').map(p => p.trim()).filter(p => p);
      if (parts.length >= 4) existing.add(parts[0] + '|' + parts[1]);
    }
  });
  return existing;
}

async function checkSiteAccess() {
  try {
    const result = execSync('curl -s -o /dev/null -w "%{http_code}" --max-time 5 https://howmanyfps.com/games/forza-horizon-5', { encoding: 'utf8' });
    return result.trim() === '200';
  } catch {
    return false;
  }
}

async function waitForSite(maxWaitMinutes = 30) {
  const startTime = Date.now();
  let attempt = 0;
  while (Date.now() - startTime < maxWaitMinutes * 60 * 1000) {
    attempt++;
    console.log(`检查网站访问 (尝试 ${attempt})...`);
    if (await checkSiteAccess()) {
      console.log('✅ 网站可访问');
      return true;
    }
    console.log('   网站仍被阻止，等待 30 秒...');
    await new Promise(r => setTimeout(r, 30000));
  }
  console.log('⚠️ 等待超时');
  return false;
}

async function searchAndSelect(page, searchTerm) {
  const selectors = [
    '[aria-label="Search for a GPU"]',
    '[aria-label="Search for a Graphics Card"]'
  ];

  let clicked = false;
  for (const sel of selectors) {
    try {
      await page.click(sel, {force: true, timeout: 3000});
      clicked = true;
      break;
    } catch {}
  }
  if (!clicked) return null;
  await page.waitForTimeout(300);

  await page.evaluate(() => {
    const inp = [...document.querySelectorAll('input')].find(i => i.placeholder?.toLowerCase().includes('search'));
    if (inp) inp.value = '';
  });
  await page.waitForTimeout(100);

  const terms = [searchTerm, 'GeForce ' + searchTerm, 'Radeon ' + searchTerm];
  for (const term of terms) {
    await page.evaluate(() => {
      const inp = [...document.querySelectorAll('input')].find(i => i.placeholder?.toLowerCase().includes('search'));
      if (inp) inp.value = '';
    });
    await page.waitForTimeout(100);
    await page.keyboard.type(term, { delay: 30 });
    await page.waitForTimeout(600);

    const match = await page.evaluate((orig) => {
      const opts = [...document.querySelectorAll('[role="option"]')];
      const opt = opts.find(o => o.textContent?.includes(orig) && !o.textContent?.includes('Mobile'));
      if (opt) { opt.click(); return opt.textContent.substring(0, 60); }
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
    const ps = [...document.querySelectorAll('p')];
    for (let i = 0; i < ps.length; i++) {
      if (ps[i].textContent === 'Real-Time Average' && i > 0) {
        const avg = ps[i-1]?.textContent?.match(/(\d+)/)?.[1];
        const low = ps[i+1]?.textContent?.match(/(\d+)/)?.[1];
        if (!avg || !low) return { valid: false };
        if (avg === '—' || low === '—') return { valid: false };
        return { valid: true, avg, low };
      }
    }
    return { valid: false };
  });
}

async function collectData(page, name) {
  const selected = await searchAndSelect(page, name);
  if (!selected) return null;

  const results = [];
  for (const res of RESOLUTIONS) {
    const selectors = ['[aria-label="Select game resolution"]', '[aria-label="Select resolution"]'];
    let clicked = false;
    for (const sel of selectors) {
      try {
        await page.click(sel, {force: true, timeout: 3000});
        clicked = true;
        break;
      } catch {}
    }
    if (!clicked) { results.push({ resolution: res.label, valid: false }); continue; }
    await page.waitForTimeout(300);

    await page.evaluate((opt) => {
      const parts = opt.split(' x ');
      const opts = [...document.querySelectorAll('[role="option"]')];
      const o = opts.find(x => x.textContent?.includes(parts[0]) && x.textContent?.includes(parts[1]));
      if (o) o.click();
    }, res.option);

    await page.waitForTimeout(1500);
    results.push({ resolution: res.label, ...(await getFpsData(page)) });
  }
  return { selected, results };
}

async function main() {
  console.log('🎮 开始采集 Forza Horizon 5 GPU 数据\n');

  // 等待网站可访问
  if (!await waitForSite(30)) {
    console.log('⚠️ 无法访问网站，脚本退出');
    process.exit(1);
  }

  // 启动 Chrome 并采集
  execSync('pkill -f "Google Chrome" 2>/dev/null || true');
  await new Promise(r => setTimeout(r, 2000));

  const chromeCmd = `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --user-data-dir="$HOME/Library/Application Support/Google/Chrome" --profile-directory=Default" --remote-debugging-port=9222 --new-window "https://howmanyfps.com/games/forza-horizon-5" 2>&1 &`;
  execSync(chromeCmd, { shell: '/bin/bash' });
  await new Promise(r => setTimeout(r, 8000));

  let browser;
  try {
    browser = await chromium.connectOverCDP('http://localhost:9222', {timeout: 15000});
  } catch {
    console.log('❌ 无法连接 Chrome');
    execSync('pkill -f "Google Chrome" 2>/dev/null || true');
    process.exit(1);
  }

  const page = await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });

  // 检查页面是否加载成功
  await page.goto(`https://howmanyfps.com/games/${GAME}`, {timeout: 60000, waitUntil: 'domcontentloaded'});
  await page.waitForTimeout(3000);

  const title = await page.title();
  if (title.includes('请稍候') || title.includes('challenge')) {
    console.log('❌ 页面仍被 Cloudflare 拦截');
    await browser.close();
    execSync('pkill -f "Google Chrome" 2>/dev/null || true');
    process.exit(1);
  }

  console.log(`✅ 页面加载成功: ${title}\n`);

  const existing = getExistingData();
  console.log(`已有 ${existing.size} 条数据\n`);

  let content = '';
  let successCount = 0;

  for (const gpu of GPU_LIST) {
    if (existing.has(gpu + '|1920x1080 (1K)')) {
      console.log(`⏭️ ${gpu}: 已存在`);
      continue;
    }

    console.log(`采集: ${gpu}...`);
    const data = await collectData(page, gpu);

    if (!data) {
      console.log(`  ❌ 未找到`);
      continue;
    }

    let hasSuccess = false;
    for (const r of data.results) {
      const key = gpu + '|' + r.resolution;
      if (r.valid && !existing.has(key)) {
        content += `| ${gpu} | ${r.resolution} | ${r.avg} FPS | ${r.low} FPS |\n`;
        existing.add(key);
        console.log(`  ✅ ${r.resolution}: ${r.avg} FPS`);
        hasSuccess = true;
      } else if (!r.valid) {
        console.log(`  ⚠️ ${r.resolution}: 无数据`);
      } else {
        console.log(`  ⏭️ ${r.resolution}: 已存在`);
      }
    }
    if (hasSuccess) successCount++;

    // 每10个保存一次
    if (successCount > 0 && successCount % 10 === 0 && content) {
      const file = DATA_DIR + '/' + FILE_NAME;
      if (!fs.existsSync(file)) {
        fs.writeFileSync(file, `# ${GAME_NAME} GPU 帧率数据 — HowManyFPS\n## 游戏: ${GAME_NAME}\n## 采集时间: ${new Date().toISOString().split('T')[0]}\n\n| GPU | 分辨率 | Real-Time Average | 1% Lows |\n|-----|--------|-------------------|--------|\n\n`);
      }
      fs.appendFileSync(file, content);
      content = '';
      console.log(`\n已保存进度 (${successCount} 个GPU)\n`);
    }
  }

  if (content) {
    const file = DATA_DIR + '/' + FILE_NAME;
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, `# ${GAME_NAME} GPU 帧率数据 — HowManyFPS\n## 游戏: ${GAME_NAME}\n## 采集时间: ${new Date().toISOString().split('T')[0]}\n\n| GPU | 分辨率 | Real-Time Average | 1% Lows |\n|-----|--------|-------------------|--------|\n\n`);
    }
    fs.appendFileSync(file, content);
  }

  console.log(`\n🎉 采集完成: ${successCount} 个GPU成功`);
  await browser.close();
  execSync('pkill -f "Google Chrome" 2>/dev/null || true');
}

main().catch(e => {
  console.error('Error:', e.message);
  try { require('child_process').execSync('pkill -f "Google Chrome" 2>/dev/null || true'); } catch {}
  process.exit(1);
});
