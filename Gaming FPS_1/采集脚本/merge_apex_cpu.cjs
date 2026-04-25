const fs = require('fs');

const DATA_DIR = '/Users/mac/new/Gaming FPS_1';

// 读取原始数据
const existingFile = DATA_DIR + '/howmanyfps_ApexLegends_cpu_data.md';
const newFile = DATA_DIR + '/howmanyfps_apex_legends_cpu_data_new.md';
const outputFile = DATA_DIR + '/howmanyfps_ApexLegends_cpu_data_merged.md';

console.log('合并 Apex Legends CPU 数据...\n');

// 读取现有数据
let existingData = [];
if (fs.existsSync(existingFile)) {
  const existingContent = fs.readFileSync(existingFile, 'utf8');
  const lines = existingContent.split('\n');
  for (const line of lines) {
    if (line.startsWith('|') && line.includes('|')) {
      const parts = line.split('|').map(p => p.trim()).filter(p => p);
      if (parts.length >= 4 && parts[0] !== 'CPU') {
        existingData.push({
          cpu: parts[0],
          resolution: parts[1],
          avg: parts[2],
          low: parts[3]
        });
      }
    }
  }
  console.log('现有数据: ' + existingData.length + ' 条');
}

// 读取新数据
let newData = [];
if (fs.existsSync(newFile)) {
  const newContent = fs.readFileSync(newFile, 'utf8');
  const lines = newContent.split('\n');
  for (const line of lines) {
    if (line.startsWith('|') && line.includes('|')) {
      const parts = line.split('|').map(p => p.trim()).filter(p => p);
      if (parts.length >= 4 && parts[0] !== 'CPU') {
        newData.push({
          cpu: parts[0],
          resolution: parts[1],
          avg: parts[2],
          low: parts[3]
        });
      }
    }
  }
  console.log('新数据: ' + newData.length + ' 条');
}

// 合并数据（去除重复）
const mergedMap = new Map();
for (const item of existingData) {
  const key = item.cpu + '|' + item.resolution;
  mergedMap.set(key, item);
}
for (const item of newData) {
  const key = item.cpu + '|' + item.resolution;
  mergedMap.set(key, item);
}
const merged = Array.from(mergedMap.values());

// 按CPU名称和分辨率排序
merged.sort((a, b) => {
  if (a.cpu !== b.cpu) return a.cpu.localeCompare(b.cpu);
  return a.resolution.localeCompare(b.resolution);
});

console.log('合并后: ' + merged.length + ' 条\n');

// 生成新文件
let content = '# Apex Legends CPU 帧率数据 — HowManyFPS\n## 游戏: Apex Legends\n';
content += '## 采集时间: ' + new Date().toISOString().split('T')[0] + '\n\n';
content += '| CPU | 分辨率 | Real-Time Average | 1% Lows |\n|-----|--------|-------------------|--------|\n';

for (const item of merged) {
  content += '| ' + item.cpu + ' | ' + item.resolution + ' | ' + item.avg + ' | ' + item.low + ' |\n';
}

fs.writeFileSync(outputFile, content);
console.log('已保存到: ' + outputFile);

// 备份原文件
const backupFile = existingFile.replace('.md', '_backup_' + Date.now() + '.md');
fs.copyFileSync(existingFile, backupFile);
console.log('已备份原文件到: ' + backupFile);

// 覆盖原文件
fs.writeFileSync(existingFile, content);
console.log('已更新原文件: ' + existingFile);