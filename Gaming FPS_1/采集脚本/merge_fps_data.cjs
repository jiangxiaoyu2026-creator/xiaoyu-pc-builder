const fs = require('fs');

const DATA_DIR = '/Users/mac/new/Gaming FPS_1';

// 游戏列表
const games = [
  'cs2',
  'fortnite'
];

function parseExistingData(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const data = {};

  let currentHardware = '';
  for (const line of lines) {
    if (line.startsWith('|') && line.includes('|')) {
      const parts = line.split('|').map(p => p.trim()).filter(Boolean);
      if (parts.length >= 4 && parts[0] !== 'CPU' && parts[0] !== 'GPU' && parts[0] !== '分辨率') {
        currentHardware = parts[0];
        if (!data[currentHardware]) {
          data[currentHardware] = {};
        }
        const res = parts[1];
        data[currentHardware][res] = {
          avg: parts[2],
          low: parts[3]
        };
      }
    }
  }

  return data;
}

function parseNewData(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const data = {};

  for (const line of lines) {
    if (line.startsWith('|') && line.includes('|')) {
      const parts = line.split('|').map(p => p.trim()).filter(Boolean);
      if (parts.length >= 4 && parts[0] !== 'CPU' && parts[0] !== 'GPU' && parts[0] !== '分辨率' && !parts[0].startsWith('#')) {
        const hardware = parts[0];
        if (!data[hardware]) {
          data[hardware] = {};
        }
        const res = parts[1];
        const avg = parts[2];
        const low = parts[3];

        // 只添加有效数据
        if (avg && low && !avg.includes('undefined') && !low.includes('undefined')) {
          data[hardware][res] = { avg, low };
        }
      }
    }
  }

  return data;
}

function mergeAndSave(gameName, isCpu) {
  const type = isCpu ? 'cpu' : 'gpu';
  const existingFile = `${DATA_DIR}/howmanyfps_${gameName}_${type}_data.md`;
  const newFile = `${DATA_DIR}/howmanyfps_${gameName}_${type}_data_new.md`;
  const backupFile = `${DATA_DIR}/howmanyfps_${gameName}_${type}_data_backup_${Date.now()}.md`;

  console.log(`\n处理 ${gameName} ${type.toUpperCase()} 数据...`);

  // 读取现有数据
  const existingData = parseExistingData(existingFile);
  console.log(`  现有数据: ${Object.keys(existingData).length} 个硬件`);

  // 读取新数据
  const newData = parseNewData(newFile);
  console.log(`  新数据: ${Object.keys(newData).length} 个硬件`);

  // 合并数据
  const mergedData = { ...existingData };
  let addedCount = 0;
  let updatedCount = 0;

  for (const [hardware, resolutions] of Object.entries(newData)) {
    if (!mergedData[hardware]) {
      mergedData[hardware] = {};
    }
    for (const [res, values] of Object.entries(resolutions)) {
      if (values.avg && values.low) {
        if (mergedData[hardware][res]) {
          updatedCount++;
        } else {
          addedCount++;
        }
        mergedData[hardware][res] = values;
      }
    }
  }

  console.log(`  合并结果: 新增 ${addedCount} 条, 更新 ${updatedCount} 条`);

  // 备份现有文件
  if (fs.existsSync(existingFile)) {
    fs.copyFileSync(existingFile, backupFile);
    console.log(`  已备份到: ${backupFile}`);
  }

  // 生成新的合并文件
  const header = isCpu
    ? `# ${gameName.toUpperCase()} CPU 帧率数据 — HowManyFPS\n## 游戏: ${gameName}\n## 采集时间: ${new Date().toISOString().split('T')[0]}\n\n| CPU | 分辨率 | Real-Time Average | 1% Lows |\n|-----|--------|-------------------|--------|\n`
    : `# ${gameName.toUpperCase()} GPU 帧率数据 — HowManyFPS\n## 游戏: ${gameName}\n## 采集时间: ${new Date().toISOString().split('T')[0]}\n\n| GPU | 分辨率 | Real-Time Average | 1% Lows |\n|-----|--------|-------------------|--------|\n`;

  let newContent = header;
  const sortedHardware = Object.keys(mergedData).sort();

  for (const hardware of sortedHardware) {
    for (const [res, values] of Object.entries(mergedData[hardware])) {
      newContent += `| ${hardware} | ${res} | ${values.avg} | ${values.low} |\n`;
    }
  }

  fs.writeFileSync(existingFile, newContent);
  console.log(`  已保存到: ${existingFile}`);

  return { added: addedCount, updated: updatedCount };
}

function main() {
  console.log('=== FPS 数据合并工具 ===\n');

  let totalAdded = 0;
  let totalUpdated = 0;

  for (const game of games) {
    const cpuResult = mergeAndSave(game, true);
    const gpuResult = mergeAndSave(game, false);
    totalAdded += cpuResult.added + gpuResult.added;
    totalUpdated += cpuResult.updated + gpuResult.updated;
  }

  console.log('\n=== 合并完成 ===');
  console.log(`总计: 新增 ${totalAdded} 条, 更新 ${totalUpdated} 条`);

  // 删除备份文件（可选）
  // console.log('\n清理临时文件...');
  // const backupFiles = fs.readdirSync(DATA_DIR).filter(f => f.includes('_backup_'));
  // for (const file of backupFiles) {
  //   fs.unlinkSync(`${DATA_DIR}/${file}`);
  // }
  // console.log(`已删除 ${backupFiles.length} 个备份文件`);
}

main();
