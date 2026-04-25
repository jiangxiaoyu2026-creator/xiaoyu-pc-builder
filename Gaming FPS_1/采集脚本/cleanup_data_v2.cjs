const fs = require('fs');
const path = require('path');

const DATA_DIR = '/Users/mac/new/Gaming FPS_1';

// Only remove rows where BOTH avg AND low are exactly 10 FPS (definitely invalid/default data)
function isInvalidRow(line) {
  // Match patterns like "| XX FPS | 10 FPS |" where both are 10
  const match = line.match(/\|[^|]+\|[^|]+\|\s*10\s*FPS\s*\|\s*10\s*FPS\s*\|/);
  return match !== null;
}

// Main
function main() {
  const files = fs.readdirSync(DATA_DIR).filter(f =>
    f.startsWith('howmanyfps_') && (f.endsWith('_cpu_data.md') || f.endsWith('_gpu_data.md'))
  );

  console.log('=== 数据清理 v2 (仅移除 Avg=10 且 Low=10 的行) ===\n');

  let totalRemoved = 0;
  const summary = [];

  for (const file of files) {
    const filepath = path.join(DATA_DIR, file);
    const content = fs.readFileSync(filepath, 'utf8');
    const lines = content.split('\n');

    const validLines = [];
    const removedLines = [];

    for (const line of lines) {
      if (isInvalidRow(line)) {
        removedLines.push(line);
      } else {
        validLines.push(line);
      }
    }

    if (removedLines.length > 0) {
      fs.writeFileSync(filepath, validLines.join('\n') + '\n');

      summary.push({
        file,
        total: lines.filter(l => l.startsWith('|')).length,
        removed: removedLines.length
      });
      totalRemoved += removedLines.length;
    }
  }

  // Print summary
  if (summary.length > 0) {
    console.log('已清理的文件：\n');
    console.log('文件                          | 总行数 | 移除   | 保留');
    console.log('------------------------------|--------|--------|------');
    for (const s of summary) {
      const name = s.file.replace('howmanyfps_', '').replace('_data.md', '').padEnd(28);
      console.log(`${name}| ${String(s.total).padStart(6)} | ${String(s.removed).padStart(6)} | ${s.total - s.removed}`);
    }
    console.log('\n总计移除: ' + totalRemoved + ' 条无效数据');
  } else {
    console.log('没有发现需要清理的数据');
  }
}

main();
