const fs = require('fs');

const DATA_DIR = '/Users/mac/new/Gaming FPS_1';

// GPU性能排序（降序）
const GPU_RANKING = [
  'RTX 5090', 'RTX 5080', 'RTX 4090', 'RTX 4090 D', 'RTX 4080 Super',
  'RTX 4080', 'RTX 4070 Ti Super', 'RTX 4070 Ti', 'RTX 4070 Super',
  'RTX 4070', 'RTX 3070 Ti', 'RTX 3070', 'RTX 3060 Ti', 'RTX 3060',
  'RTX 4060 Ti', 'RTX 4060', 'RTX 5060 Ti', 'RTX 5060', 'RTX 5050', 'RTX 3050'
];

const AMD_RANKING = [
  'RX 7900 XTX', 'RX 7900 XT', 'RX 7900 GRE', 'RX 7800 XT', 'RX 7700 XT',
  'RX 9700 XT', 'RX 9800 XT', 'RX 970', 'RX 8800 XT',
  'RX 7600 XT', 'RX 7600', 'RX 6600 XT', 'RX 6650 XT', 'RX 6700', 'RX 6700 XT',
  'RX 6800', 'RX 6800 XT', 'RX 6900 XT', 'RX 6400', 'RX 6500 XT'
];

// CPU性能排序（降序）
const CPU_RANKING = [
  'Ryzen 9 9950X3D', 'Ryzen 9 9950X', 'Ryzen 9 9900X', 'Ryzen 9 7950X3D',
  'Ryzen 9 7950X', 'Ryzen 7 9800X3D', 'Ryzen 7 7800X3D', 'Ryzen 7 7700X',
  'Ryzen 7 5800X3D', 'Ryzen 5 9600X', 'Ryzen 5 7600X', 'Ryzen 5 5600X3D'
];

const INTEL_RANKING = [
  'Core Ultra 9 285K', 'Core i9-14900KS', 'Core i9-14900K', 'Core i9-14900',
  'Core i7-14700K', 'Core i7-14700', 'Core i5-14600K', 'Core i5-14500',
  'Core i5-14400', 'Core i3-14100', 'Core i3-13100', 'Core i3-12100'
];

function parseDataFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const data = {};

  for (const line of lines) {
    if (line.startsWith('|') && line.includes('|')) {
      const parts = line.split('|').map(p => p.trim()).filter(Boolean);
      if (parts.length >= 4 && !parts[0].startsWith('#') && parts[0] !== 'CPU' && parts[0] !== 'GPU' && parts[0] !== '分辨率') {
        const hardware = parts[0];
        const res = parts[1];
        const avgMatch = parts[2].match(/(\d+)/);
        const lowMatch = parts[3].match(/(\d+)/);

        if (avgMatch && lowMatch) {
          if (!data[hardware]) data[hardware] = {};
          data[hardware][res] = {
            avg: parseInt(avgMatch[1]),
            low: parseInt(lowMatch[1]),
            raw: parts[2]
          };
        }
      }
    }
  }

  return data;
}

function getPerformanceRank(hardware, ranking) {
  for (let i = 0; i < ranking.length; i++) {
    if (hardware.includes(ranking[i]) || ranking[i].includes(hardware.split(' ').pop())) {
      return i;
    }
  }
  return -1;
}

function validateData(data, type, game) {
  const issues = [];
  const entries = Object.entries(data);

  console.log(`\n=== 验证 ${game} ${type.toUpperCase()} 数据 ===`);
  console.log(`总计: ${entries.length} 个硬件\n`);

  for (const [hardware, resolutions] of entries) {
    for (const [res, fps] of Object.entries(resolutions)) {
      if (!fps.avg || !fps.low) continue;

      const avg = fps.avg;
      const low = fps.low;

      // 检查1: FPS 异常低（可能是默认值）
      if (avg <= 15 || avg >= 2000) {
        issues.push({
          hardware,
          resolution: res,
          issue: `FPS异常值: ${fps.raw}`,
          severity: 'ERROR'
        });
      }

      // 检查2: Low/Avg 比例异常
      if (avg > 0) {
        const ratio = low / avg;
        if (ratio < 0.35 || ratio > 0.98) {
          issues.push({
            hardware,
            resolution: res,
            issue: `比例异常 (Low/Avg=${ratio.toFixed(2)}): ${fps.raw}`,
            severity: 'WARNING'
          });
        }
      }

      // 检查3: Low > Avg（不可能）
      if (low > avg) {
        issues.push({
          hardware,
          resolution: res,
          issue: `Low(${low}) > Avg(${avg})`,
          severity: 'ERROR'
        });
      }
    }
  }

  // 检查4: 性能排序验证（只检查同品牌同系列）
  if (type === 'gpu') {
    const nvidiaData = {};
    const amdData = {};

    for (const [hardware, resolutions] of entries) {
      if (hardware.includes('RTX') || hardware.includes('GeForce')) {
        nvidiaData[hardware] = resolutions;
      } else if (hardware.includes('Radeon') || hardware.includes('RX')) {
        amdData[hardware] = resolutions;
      }
    }

    // NVIDIA 排序检查
    const nvidiaEntries = Object.entries(nvidiaData);
    for (let i = 0; i < nvidiaEntries.length; i++) {
      for (let j = i + 1; j < nvidiaEntries.length; j++) {
        const [hw1, res1] = nvidiaEntries[i];
        const [hw2, res2] = nvidiaEntries[j];
        const rank1 = getPerformanceRank(hw1, GPU_RANKING);
        const rank2 = getPerformanceRank(hw2, GPU_RANKING);

        if (rank1 >= 0 && rank2 >= 0 && rank1 < rank2) {
          // 高端应该比低端强
          const avg1 = res1['1920x1080 (1K)']?.avg || 0;
          const avg2 = res2['1920x1080 (1K)']?.avg || 0;

          if (avg1 < avg2 * 0.7) {
            issues.push({
              hardware: `${hw1} vs ${hw2}`,
              resolution: '1920x1080 (1K)',
              issue: `性能排序矛盾: ${hw1}(rank${rank1})应该强于${hw2}(rank${rank2})`,
              severity: 'WARNING'
            });
          }
        }
      }
    }
  }

  return issues;
}

function main() {
  const games = ['cs2', 'fortnite', 'minecraft'];

  for (const game of games) {
    const cpuFile = `${DATA_DIR}/howmanyfps_${game}_cpu_data.md`;
    const gpuFile = `${DATA_DIR}/howmanyfps_${game}_gpu_data.md`;

    // 验证CPU数据
    const cpuData = parseDataFile(cpuFile);
    const cpuIssues = validateData(cpuData, 'cpu', game);

    // 验证GPU数据
    const gpuData = parseDataFile(gpuFile);
    const gpuIssues = validateData(gpuData, 'gpu', game);

    // 输出问题
    const allIssues = [...cpuIssues, ...gpuIssues];
    if (allIssues.length > 0) {
      console.log(`\n⚠️ 发现 ${allIssues.length} 个问题:\n`);
      for (const issue of allIssues) {
        const icon = issue.severity === 'ERROR' ? '❌' : '⚠️';
        console.log(`  ${icon} ${issue.hardware}`);
        console.log(`     ${issue.resolution}: ${issue.issue}\n`);
      }
    } else {
      console.log(`\n✅ ${game} 数据验证通过！\n`);
    }
  }

  console.log('\n=== 验证完成 ===');
}

main();
