const { chromium } = require('playwright');
const fs = require('fs');

const DATA_DIR = '/Users/mac/new/Gaming FPS_1';
const RESOLUTIONS = [
  { label: '1920x1080 (1K)', option: '1920 x 1080' },
  { label: '2560x1440 (2K)', option: '2560 x 1440' },
  { label: '3840x2160 (4K)', option: '3840 x 2160' }
];

// LOL缺失的GPU列表（36款）
const MISSING_GPUS = [
  'GeForce RTX 3050 6 GB', 'GeForce RTX 3060 8 GB', 'GeForce RTX 3060 Ti GDDR6X',
  'GeForce RTX 3090 Ti', 'GeForce RTX 4070 SUPER', 'GeForce RTX 4070 Ti SUPER',
  'GeForce RTX 4080 SUPER', 'GeForce RTX 4090 D', 'RTX 3060 8 GB',
  'RTX 4070 Super', 'RTX 4070 Ti Super', 'RTX 4080 Super',
  'RX 6500 XT', 'RX 970', 'Radeon RX 6400', 'Radeon RX 6600',
  'Radeon RX 6600 XT', 'Radeon RX 6650 XT', 'Radeon RX 6700',
  'Radeon RX 6700 XT', 'Radeon RX 6800', 'Radeon RX 6800 XT',
  'Radeon RX 6900 XT', 'Radeon RX 7600', 'Radeon RX 7600 XT',
  'Radeon RX 7650 GRE', 'Radeon RX 7700 XT', 'Radeon RX 7800 XT',
  'Radeon RX 8800 XT', 'Radeon RX 9060 XT', 'Radeon RX 9060 XT 16GB',
  'Radeon RX 9070', 'Radeon RX 9070 XT', 'Radeon RX 970',
  'Radeon RX 9700 XT', 'Radeon RX 9800 XT'
];

// LOL缺失的CPU列表（74款）
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

// 验证函数：检查数据是否合理
function validateData(hardware, res, avg, low) {
  const issues = [];
  const avgNum = parseInt(avg);
  const lowNum = parseInt(low);

  if (isNaN(avgNum) || isNaN(lowNum) || avgNum < 20 || avgNum > 2000) {
    issues.push(`FPS异常: ${avg}`);
  }
  if (lowNum > avgNum) {
    issues.push(`Low(${lowNum}) > Avg(${avgNum})`);
  }
  if (avgNum > 0) {
    const ratio = lowNum / avgNum;
    if (ratio < 0.3 || ratio > 0.98) {
      issues.push(`比例异常: ${ratio.toFixed(2)}`);
    }
  }

  return issues;
}

async function collectCpuData(page, cpuName) {
  try {
    await page.click('[aria-label="Search for a CPU"]');
    await page.waitForTimeout(300);
    await page.keyboard.type(cpuName, { delay: 30 });
    await page.waitForTimeout(600);

    const selected = await page.evaluate((cpu) => {
      const opts = document.querySelectorAll('[role="option"]');
      // 精确匹配
      for (const opt of opts) {
        const text = opt.textContent || '';
        if (text.includes(cpu)) {
          opt.click();
          return cpu; // 返回匹配的CPU名称
        }
      }
      // 部分匹配
      for (const opt of opts) {
        const text = opt.textContent || '';
        const cpuParts = cpu.split(' ');
        if (cpuParts.some(p => text.includes(p) && p.length > 3)) {
          opt.click();
          return cpu;
        }
      }
      if (opts.length > 0) {
        opts[0].click();
        return 'auto:' + opts[0].textContent?.substring(0, 30);
      }
      return null;
    }, cpuName);

    if (!selected) {
      await page.keyboard.press('Escape');
      return null;
    }

    await page.waitForTimeout(1500);

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

      if (fps) {
        results.push({ resolution: res.label, avg: fps.avg, low: fps.low });
      }
    }

    return { selected, results };
  } catch (e) {
    console.log(`  错误: ${e.message}`);
    return null;
  }
}

async function collectGpuData(page, gpuName) {
  try {
    await page.click('[aria-label="Search for a GPU"]');
    await page.waitForTimeout(300);
    await page.keyboard.type(gpuName, { delay: 30 });
    await page.waitForTimeout(600);

    const selected = await page.evaluate((gpu) => {
      const opts = document.querySelectorAll('[role="option"]');
      // 精确匹配
      for (const opt of opts) {
        const text = opt.textContent || '';
        if (text.includes(gpu)) {
          opt.click();
          return gpu;
        }
      }
      // 部分匹配
      for (const opt of opts) {
        const text = opt.textContent || '';
        const gpuParts = gpu.split(' ');
        if (gpuParts.some(p => text.includes(p) && p.length > 3)) {
          opt.click();
          return gpu;
        }
      }
      if (opts.length > 0) {
        opts[0].click();
        return 'auto:' + opts[0].textContent?.substring(0, 30);
      }
      return null;
    }, gpuName);

    if (!selected) {
      await page.keyboard.press('Escape');
      return null;
    }

    await page.waitForTimeout(1500);

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

      if (fps) {
        results.push({ resolution: res.label, avg: fps.avg, low: fps.low });
      }
    }

    return { selected, results };
  } catch (e) {
    console.log(`  错误: ${e.message}`);
    return null;
  }
}

async function main() {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('https://howmanyfps.com/games/league-of-legends');
  await page.waitForTimeout(3000);

  let gpuFileContent = `# League of Legends GPU 帧率数据 — HowManyFPS\n## 游戏: League of Legends\n## 采集时间: ${new Date().toISOString().split('T')[0]}\n\n`;
  gpuFileContent += `| GPU | 分辨率 | Real-Time Average | 1% Lows |\n|-----|--------|-------------------|--------|\n`;

  console.log('开始采集 League of Legends 缺失的 GPU 数据...');
  console.log(`共 ${MISSING_GPUS.length} 款 GPU\n`);

  const issues = [];

  for (let i = 0; i < MISSING_GPUS.length; i++) {
    const gpu = MISSING_GPUS[i];
    console.log(`[${i+1}/${MISSING_GPUS.length}] 采集 ${gpu}...`);

    const data = await collectGpuData(page, gpu);
    if (data && data.results && data.results.length > 0) {
      // 验证数据
      let hasIssue = false;
      for (const r of data.results) {
        const problems = validateData(gpu, r.resolution, r.avg, r.low);
        if (problems.length > 0) {
          issues.push({ hardware: gpu, resolution: r.resolution, issues: problems });
          hasIssue = true;
        }
      }

      if (hasIssue) {
        console.log(`  ⚠️ 异常: 1080p=${data.results[0]?.avg}/${data.results[0]?.low}`);
      } else {
        console.log(`  ✅ 成功: 1080p=${data.results[0]?.avg}/${data.results[0]?.low}`);
      }

      for (const r of data.results) {
        gpuFileContent += `| ${gpu} | ${r.resolution} | ${r.avg} FPS | ${r.low} FPS |\n`;
      }
    } else {
      console.log(`  ❌ 失败或无数据`);
    }

    // 每5个验证一次
    if ((i + 1) % 5 === 0) {
      console.log(`\n--- 验证点: 已采集 ${i+1}/${MISSING_GPUS.length} 个GPU ---`);
      if (issues.length > 0) {
        console.log(`  发现 ${issues.length} 个异常数据`);
      }
      console.log('');
    }
  }

  fs.writeFileSync(`${DATA_DIR}/howmanyfps_leagueoflegends_gpu_data_new.md`, gpuFileContent);
  console.log('\nGPU数据已保存');

  // 保存问题数据
  if (issues.length > 0) {
    fs.writeFileSync(`${DATA_DIR}/lol_gpu_issues.json`, JSON.stringify(issues, null, 2));
    console.log(`\n⚠️ 发现 ${issues.length} 个异常数据，已保存到 lol_gpu_issues.json`);
  }

  console.log('\nLeague of Legends GPU 采集完成!');
  await browser.close();
}

main().catch(console.error);
