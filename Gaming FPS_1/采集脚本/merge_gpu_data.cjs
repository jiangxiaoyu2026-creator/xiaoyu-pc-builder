const fs = require('fs');
const path = require('path');

const DATA_DIR = '/Users/mac/new/Gaming FPS_1';

// 只保留有效数据行（Avg > 10 或 Low != Avg）
function isValidRow(line) {
  // 匹配 Avg=10 且 Low=10 的行（无效）
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

// 合并数据
function mergeData(existingFile, newFile) {
  const existingContent = fs.readFileSync(existingFile, 'utf8');
  const newContent = fs.readFileSync(newFile, 'utf8');

  const existingLines = existingContent.split('\n');
  const newLines = newContent.split('\n');

  const dataMap = new Map();

  // 读取现有数据
  for (const line of existingLines) {
    if (!line.startsWith('|')) continue;
    if (line.includes('|-----|')) continue; // 跳过表头分隔行
    const row = parseRow(line);
    if (!row) continue;
    const key = row.hardware + '|' + row.resolution;
    dataMap.set(key, row);
  }

  // 添加新数据（覆盖旧的）
  for (const line of newLines) {
    if (!line.startsWith('|')) continue;
    if (line.includes('|-----|')) continue; // 跳过表头分隔行
    const row = parseRow(line);
    if (!row) continue;
    const key = row.hardware + '|' + row.resolution;
    dataMap.set(key, row);
  }

  return dataMap;
}

// 主函数
function main() {
  const games = [
    'cyberpunk2077',
  ];

  const gameNames = {
    'cyberpunk2077': 'Cyberpunk 2077',
    'fortnite': 'Fortnite',
    'blackmythwukong': 'Black Myth Wukong',
    'apex_legends': 'Apex Legends',
  };

  for (const game of games) {
    const existingFile = DATA_DIR + '/howmanyfps_' + game + '_gpu_data.md';
    const newFile = DATA_DIR + '/howmanyfps_' + game + '_GPU_data_new.md';

    if (!fs.existsSync(existingFile)) {
      console.log('跳过: ' + existingFile + ' 不存在');
      continue;
    }
    if (!fs.existsSync(newFile)) {
      console.log('跳过: ' + newFile + ' 不存在');
      continue;
    }

    console.log('\n处理: ' + game);
    const dataMap = mergeData(existingFile, newFile);

    // 生成新内容
    const gameName = gameNames[game] || game.replace(/^\w/, c => c.toUpperCase()).replace(/(\d)/, ' $1');
    let content = '# ' + gameName + ' GPU 帧率数据 — HowManyFPS\n';
    content += '## 游戏: ' + gameName + '\n';
    content += '## 采集时间: ' + new Date().toISOString().split('T')[0] + '\n\n';
    content += '| GPU | 分辨率 | Real-Time Average | 1% Lows |\n|-----|--------|-------------------|--------|\n';

    let validCount = 0;
    let invalidCount = 0;

    // 排序并过滤
    const sortedData = Array.from(dataMap.values()).sort((a, b) => {
      if (a.hardware !== b.hardware) return a.hardware.localeCompare(b.hardware);
      return a.resolution.localeCompare(b.resolution);
    });

    for (const row of sortedData) {
      const line = '| ' + row.hardware + ' | ' + row.resolution + ' | ' + row.avg + ' | ' + row.low + ' |';
      if (isValidRow(line)) {
        content += line + '\n';
        validCount++;
      } else {
        invalidCount++;
      }
    }

    fs.writeFileSync(existingFile, content);
    console.log('  有效: ' + validCount + ' 条, 移除无效: ' + invalidCount + ' 条');
  }
}

main();
