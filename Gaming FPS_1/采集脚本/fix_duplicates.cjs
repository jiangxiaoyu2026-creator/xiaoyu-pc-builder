const fs = require('fs');
const path = require('path');

const DATA_DIR = '/Users/mac/new/Gaming FPS_1';

// 只保留有效数据行
function isValidRow(line) {
  const match = line.match(/\|[^|]+\|[^|]+\|\s*10\s*FPS\s*\|\s*10\s*FPS\s*\|/);
  return !match;
}

// 解析数据行
function parseRow(line) {
  const parts = line.split('|').map(p => p.trim()).filter(p => p);
  if (parts.length < 4) return null;
  return {
    hardware: parts[0],
    resolution: parts[1],
    avg: parts[2],
    low: parts[3]
  };
}

// 清理重复数据
function deduplicate(filepath) {
  const content = fs.readFileSync(filepath, 'utf8');
  const lines = content.split('\n');

  const dataMap = new Map();
  const headerLines = [];

  for (const line of lines) {
    if (!line.startsWith('|')) {
      headerLines.push(line);
      continue;
    }
    if (line.includes('|-----|')) continue;

    const row = parseRow(line);
    if (!row) continue;

    const key = row.hardware + '|' + row.resolution;
    // 只保留一条
    if (!dataMap.has(key)) {
      dataMap.set(key, row);
    }
  }

  // 生成新内容
  let newContent = headerLines.join('\n') + '\n';
  newContent += '| ' + (dataMap.values().next().value?.hardware || '') + ' | 分辨率 | Real-Time Average | 1% Lows |\n';
  newContent += '|-----|--------|-------------------|--------|\n';

  const sortedData = Array.from(dataMap.values()).sort((a, b) => {
    if (a.hardware !== b.hardware) return a.hardware.localeCompare(b.hardware);
    return a.resolution.localeCompare(b.resolution);
  });

  for (const row of sortedData) {
    if (isValidRow(`| ${row.hardware} | ${row.resolution} | ${row.avg} | ${row.low} |`)) {
      newContent += `| ${row.hardware} | ${row.resolution} | ${row.avg} | ${row.low} |\n`;
    }
  }

  return { content: newContent, count: sortedData.length };
}

// 主函数
function main() {
  const files = [
    'howmanyfps_valorant_cpu_data.md',
    'howmanyfps_fortnite_cpu_data.md',
    'howmanyfps_pubg_gpu_data.md',
  ];

  for (const file of files) {
    const filepath = path.join(DATA_DIR, file);
    if (!fs.existsSync(filepath)) {
      console.log('跳过: ' + file + ' 不存在');
      continue;
    }

    const result = deduplicate(filepath);
    fs.writeFileSync(filepath, result.content);
    console.log('已清理 ' + file + ': ' + result.count + ' 条数据');
  }
}

main();
