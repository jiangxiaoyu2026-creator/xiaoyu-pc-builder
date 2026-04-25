const { chromium } = require('playwright');
const fs = require('fs');

const DATA_DIR = '/Users/mac/new/Gaming FPS_1';
const RESOLUTIONS = [
  { label: '1920x1080 (1K)', option: '1920 x 1080' },
  { label: '2560x1440 (2K)', option: '2560 x 1440' },
  { label: '3840x2160 (4K)', option: '3840 x 2160' }
];

// Apex Legends 缺失的 CPU 列表（74款）
const MISSING_CPUS = [
  'Core Ultra 5 225', 'Core Ultra 5 225F', 'Core Ultra 5 235', 'Core Ultra 5 245K',
  'Core Ultra 5 245KF', 'Core Ultra 7 265K', 'Core Ultra 7 265KF', 'Core Ultra 9 285K',
  'Core i3-12100', 'Core i3-12100F', 'Core i3-12300', 'Core i3-13100',
  'Core i3-13100F', 'Core i3-14100', 'Core i5-11400F', 'Core i5-11500',
  'Core i5-11600', 'Core i5-11600K', 'Core i5-11600KF', 'Core i5-12400',
  'Core i5-12400F', 'Core i5-12500', 'Core i5-12600', 'Core i5-12600KF',
  'Core i5-13400', 'Core i5-13400F', 'Core i5-13500', 'Core i5-13600',
  'Core i5-13600KF', 'Core i5-14600', 'Core i7-11700F', 'Core i7-11700K',
  'Core i7-11700KF', 'Core i7-12700', 'Core i7-12700F', 'Core i7-12700K',
  'Core i7-12700KF', 'Core i7-13700', 'Core i7-14700', 'Core i9-11900F',
  'Core i9-11900K', 'Core i9-11900KF', 'Core i9-12900', 'Core i9-12900F',
  'Core i9-12900KF', 'Core i9-13900KF', 'Ryzen 3 5300G', 'Ryzen 5 5500',
  'Ryzen 5 5600', 'Ryzen 5 5600G', 'Ryzen 5 5600GT', 'Ryzen 5 5600X',
  'Ryzen 5 5600X3D', 'Ryzen 5 5600XT', 'Ryzen 5 7500F', 'Ryzen 5 7600',
  'Ryzen 5 8500G', 'Ryzen 5 8600G', 'Ryzen 5 9600X', 'Ryzen 7 5700',
  'Ryzen 7 5700G', 'Ryzen 7 5700X', 'Ryzen 7 5700X3D', 'Ryzen 7 5800',
  'Ryzen 7 5800X', 'Ryzen 7 5800X3D', 'Ryzen 7 7700', 'Ryzen 7 8700G',
  'Ryzen 7 9700X', 'Ryzen 7 9800X3D', 'Ryzen 9 5900', 'Ryzen 9 5900X',
  'Ryzen 9 5950X', 'Ryzen 9 9850X3D'
];

// 搜索并选择CPU
async function searchAndSelectCpu(page, searchTerm) {
  await page.click('[aria-label="Search for a CPU"]');
  await page.waitForTimeout(300);

  const searchTerms = [searchTerm];

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

// 获取FPS数据
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

// 验证数据
function validateData(hw, res, avg, low) {
  const issues = [];
  const avgNum = parseInt(avg);
  const lowNum = parseInt(low);

  if (avgNum < 15) issues.push('FPS过低');
  if (lowNum > avgNum) issues.push('Low > Avg');
  if (avgNum > 0) {
    const ratio = lowNum / avgNum;
    if (ratio < 0.25 || ratio > 0.98) issues.push('比例异常:' + ratio.toFixed(2));
  }
  return issues;
}

// 采集CPU数据
async function collectCpu(page, cpuName) {
  const selected = await searchAndSelectCpu(page, cpuName);
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
    if (fps.valid) {
      const problems = validateData(cpuName, res.label, fps.avg, fps.low);
      results.push({ resolution: res.label, ...fps, problems });
    } else {
      results.push({ resolution: res.label, valid: false, reason: fps.reason });
    }
  }

  return { selected, results };
}

async function main() {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('https://howmanyfps.com/games/apex-legends');
  await page.waitForTimeout(3000);

  let content = '# Apex Legends CPU 帧率数据 — HowManyFPS\n## 游戏: Apex Legends\n## 采集时间: ' + new Date().toISOString().split('T')[0] + '\n\n';
  content += '| CPU | 分辨率 | Real-Time Average | 1% Lows |\n|-----|--------|-------------------|--------|\n';

  console.log('=== Apex Legends CPU 采集 ===\n');

  const issues = [];
  let successCount = 0;

  for (let i = 0; i < MISSING_CPUS.length; i++) {
    const cpu = MISSING_CPUS[i];
    console.log('[' + (i+1) + '/' + MISSING_CPUS.length + '] ' + cpu + '...');

    const data = await collectCpu(page, cpu);

    if (!data) {
      console.log('  ❌ 未找到');
      issues.push({ hw: cpu, reason: 'not_found' });
      continue;
    }

    let hasIssue = false;
    let hasValid = false;

    for (const r of data.results) {
      if (!r.valid) {
        issues.push({ hw: cpu, res: r.resolution, reason: r.reason });
        hasIssue = true;
      } else if (r.problems && r.problems.length > 0) {
        issues.push({ hw: cpu, res: r.resolution, reason: r.problems.join(', ') });
        hasIssue = true;
      }
      if (r.valid) hasValid = true;
    }

    if (hasValid) {
      successCount++;
      if (hasIssue) {
        console.log('  ⚠️ 部分成功');
      } else {
        console.log('  ✅ 成功');
      }
      for (const r of data.results) {
        if (r.valid) {
          content += '| ' + cpu + ' | ' + r.resolution + ' | ' + r.avg + ' FPS | ' + r.low + ' FPS |\n';
        }
      }
    } else {
      console.log('  ❌ 无有效数据');
    }

    // 每10个保存一次
    if ((i + 1) % 10 === 0) {
      console.log('\n--- 验证点: ' + (i+1) + '/' + MISSING_CPUS.length + ' ---');
      fs.writeFileSync(DATA_DIR + '/apex_cpu_temp.md', content);
    }
  }

  fs.writeFileSync(DATA_DIR + '/howmanyfps_apex_legends_cpu_data_new.md', content);

  if (issues.length > 0) {
    fs.writeFileSync(DATA_DIR + '/apex_cpu_issues.json', JSON.stringify(issues, null, 2));
  }

  console.log('\n=== 采集完成 ===');
  console.log('成功: ' + successCount + '/' + MISSING_CPUS.length);

  await browser.close();
}

main().catch(e => console.error('Error:', e.message));