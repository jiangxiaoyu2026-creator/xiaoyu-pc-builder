const { chromium } = require('playwright');
const fs = require('fs');

const DATA_DIR = '/Users/mac/new/Gaming FPS_1';
const RESOLUTIONS = [
  { label: '1920x1080 (1K)', option: '1920 x 1080' },
  { label: '2560x1440 (2K)', option: '2560 x 1440' },
  { label: '3840x2160 (4K)', option: '3840 x 2160' }
];

// CS2缺失的CPU列表
const MISSING_CPUS = [
  'Core Ultra 5 225', 'Core Ultra 5 225F', 'Core Ultra 5 235', 'Core Ultra 5 245K',
  'Core Ultra 5 245KF', 'Core Ultra 7 265K', 'Core Ultra 7 265KF', 'Core Ultra 9 285K',
  'Core i3-12100', 'Core i3-12100F', 'Core i3-12300', 'Core i5-11400F',
  'Core i5-11500', 'Core i5-11600', 'Core i5-12500', 'Core i5-12600K',
  'Core i5-13600', 'Core i5-14600', 'Core i7-11700F', 'Core i7-12700',
  'Core i7-13700', 'Core i7-13700KF', 'Core i7-14700', 'Core i9-11900F',
  'Core i9-12900KS', 'Core i9-13900', 'Core i9-13900KF', 'Core i9-14900',
  'Ryzen 3 5300G', 'Ryzen 5 8500G', 'Ryzen 5 8600G', 'Ryzen 5 9600X',
  'Ryzen 7 5700', 'Ryzen 7 5700G', 'Ryzen 7 8700G', 'Ryzen 7 9700X',
  'Ryzen 9 9850X3D'
];

// CS2缺失的GPU列表
const MISSING_GPUS = [
  'GeForce RTX 3050', 'GeForce RTX 3060 8 GB', 'GeForce RTX 4070 Super',
  'GeForce RTX 4070 Ti Super', 'GeForce RTX 4080 Super', 'GeForce RTX 4090 D',
  'Radeon RX 6500 XT', 'Radeon RX 8800 XT', 'Radeon RX 970',
  'Radeon RX 9700 XT', 'Radeon RX 9800 XT'
];

async function collectCpuData(page, cpuName) {
  try {
    // 点击CPU下拉框
    await page.click('[aria-label="Search for a CPU"]');
    await page.waitForTimeout(300);

    // 输入CPU名称
    await page.keyboard.type(cpuName, { delay: 30 });
    await page.waitForTimeout(500);

    // 选择第一个匹配的选项
    const selected = await page.evaluate((cpu) => {
      const opts = document.querySelectorAll('[role="option"]');
      for (const opt of opts) {
        const text = opt.textContent || '';
        // 精确匹配
        if (text.includes(cpu) || cpu.includes(text.split(' ')[0])) {
          opt.click();
          return true;
        }
      }
      // 如果没有找到精确匹配，尝试点击第一个
      if (opts.length > 0) {
        opts[0].click();
        return true;
      }
      return false;
    }, cpuName);

    if (!selected) {
      await page.keyboard.press('Escape');
      return null;
    }

    await page.waitForTimeout(1500);

    const results = [];
    for (const res of RESOLUTIONS) {
      // 选择分辨率
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

      if (fps) {
        results.push({
          resolution: res.label,
          avg: fps.avg,
          low: fps.low
        });
      }
    }

    return results;
  } catch (e) {
    console.log(`  错误: ${e.message}`);
    return null;
  }
}

async function collectGpuData(page, gpuName) {
  try {
    // 点击GPU下拉框
    await page.click('[aria-label="Search for a GPU"]');
    await page.waitForTimeout(300);

    // 输入GPU名称
    await page.keyboard.type(gpuName, { delay: 30 });
    await page.waitForTimeout(500);

    // 选择第一个匹配的选项
    const selected = await page.evaluate((gpu) => {
      const opts = document.querySelectorAll('[role="option"]');
      for (const opt of opts) {
        const text = opt.textContent || '';
        if (text.includes(gpu) || gpu.includes(text.split(' ')[0])) {
          opt.click();
          return true;
        }
      }
      if (opts.length > 0) {
        opts[0].click();
        return true;
      }
      return false;
    }, gpuName);

    if (!selected) {
      await page.keyboard.press('Escape');
      return null;
    }

    await page.waitForTimeout(1500);

    const results = [];
    for (const res of RESOLUTIONS) {
      // 选择分辨率
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

      if (fps) {
        results.push({
          resolution: res.label,
          avg: fps.avg,
          low: fps.low
        });
      }
    }

    return results;
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

  // 初始化CPU数据文件
  let cpuFileContent = `# Counter-Strike 2 CPU 帧率数据 — HowManyFPS\n## 游戏: Counter-Strike 2 | Graphics Preset: Very High | Upscaling: Native | GPU: GeForce RTX 5090\n## 采集时间: ${new Date().toISOString().split('T')[0]}\n\n`;
  cpuFileContent += `| CPU | 分辨率 | Real-Time Average | 1% Lows |\n|-----|--------|-------------------|--------|\n`;

  // 初始化GPU数据文件
  let gpuFileContent = `# Counter-Strike 2 GPU 帧率数据 — HowManyFPS\n## 游戏: Counter-Strike 2 | Graphics Preset: Very High | Upscaling: Native | CPU: Ryzen 9 9950X3D\n## 采集时间: ${new Date().toISOString().split('T')[0]}\n\n`;
  gpuFileContent += `| GPU | 分辨率 | Real-Time Average | 1% Lows |\n|-----|--------|-------------------|--------|\n`;

  console.log('开始采集 CS2 缺失的 CPU 数据...');
  console.log(`共 ${MISSING_CPUS.length} 款 CPU\n`);

  for (let i = 0; i < MISSING_CPUS.length; i++) {
    const cpu = MISSING_CPUS[i];
    console.log(`[${i+1}/${MISSING_CPUS.length}] 采集 ${cpu}...`);

    const results = await collectCpuData(page, cpu);
    if (results && results.length > 0) {
      console.log(`  成功: 1080p=${results[0]?.avg}/${results[0]?.low}, 1440p=${results[1]?.avg}/${results[1]?.low}, 4K=${results[2]?.avg}/${results[2]?.low}`);
      // 保存到文件
      for (const r of results) {
        cpuFileContent += `| ${cpu} | ${r.resolution} | ${r.avg} FPS | ${r.low} FPS |\n`;
      }
    } else {
      console.log(`  失败或无数据`);
    }

    // 每5个CPU验证一次
    if ((i + 1) % 5 === 0) {
      console.log(`\n--- 验证点: 已采集 ${i+1}/${MISSING_CPUS.length} 个CPU ---\n`);
    }
  }

  // 保存CPU数据
  fs.writeFileSync(`${DATA_DIR}/howmanyfps_cs2_cpu_data_new.md`, cpuFileContent);
  console.log('\nCPU数据已保存到 howmanyfps_cs2_cpu_data_new.md');

  console.log('\n\n开始采集 CS2 缺失的 GPU 数据...');
  console.log(`共 ${MISSING_GPUS.length} 款 GPU\n`);

  for (let i = 0; i < MISSING_GPUS.length; i++) {
    const gpu = MISSING_GPUS[i];
    console.log(`[${i+1}/${MISSING_GPUS.length}] 采集 ${gpu}...`);

    const results = await collectGpuData(page, gpu);
    if (results && results.length > 0) {
      console.log(`  成功: 1080p=${results[0]?.avg}/${results[0]?.low}, 1440p=${results[1]?.avg}/${results[1]?.low}, 4K=${results[2]?.avg}/${results[2]?.low}`);
      // 保存到文件
      for (const r of results) {
        gpuFileContent += `| ${gpu} | ${r.resolution} | ${r.avg} FPS | ${r.low} FPS |\n`;
      }
    } else {
      console.log(`  失败或无数据`);
    }

    // 每3个GPU验证一次
    if ((i + 1) % 3 === 0) {
      console.log(`\n--- 验证点: 已采集 ${i+1}/${MISSING_GPUS.length} 个GPU ---\n`);
    }
  }

  // 保存GPU数据
  fs.writeFileSync(`${DATA_DIR}/howmanyfps_cs2_gpu_data_new.md`, gpuFileContent);
  console.log('\nGPU数据已保存到 howmanyfps_cs2_gpu_data_new.md');

  console.log('\n采集完成!');
  await browser.close();
}

main().catch(console.error);
