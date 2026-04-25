import fs from 'fs';
import { gamesFpsData, cpuList, gpuList, Resolution } from './src/data/gameFpsData';

const games = Object.keys(gamesFpsData).sort();
if (!cpuList.includes('Ryzen 9 9850X3D')) {
  cpuList.push('Ryzen 9 9850X3D');
}
let mdContent = "# 缺失的 FPS 数据采集清单\n\n";
mdContent += "请帮我采集以下游戏缺失的硬件帧数数据（包含 1080p, 1440p, 4K 的平均帧和 Low 1% 帧数）：\n\n";

for (const game of games) {
  const cpuData = gamesFpsData[game].cpu || {};
  const gpuData = gamesFpsData[game].gpu || {};
  
  const missingCpus: string[] = [];
  const missingGpus: string[] = [];
  
  for (const cpu of cpuList) {
    if (!cpuData[cpu] || !cpuData[cpu]['1080p'] || !cpuData[cpu]['1440p'] || !cpuData[cpu]['4K']) {
      missingCpus.push(cpu);
    }
  }
  
  for (const gpu of gpuList) {
    if (!gpuData[gpu] || !gpuData[gpu]['1080p'] || !gpuData[gpu]['1440p'] || !gpuData[gpu]['4K']) {
      missingGpus.push(gpu);
    }
  }
  
  if (missingCpus.length > 0 || missingGpus.length > 0) {
    mdContent += `## 游戏：${game}\n`;
    if (missingCpus.length > 0) {
      mdContent += `### 需要补充的 CPU (${missingCpus.length}款)\n`;
      mdContent += "> " + missingCpus.join("、 ") + "\n\n";
    }
    if (missingGpus.length > 0) {
      mdContent += `### 需要补充的显卡 (${missingGpus.length}款)\n`;
      mdContent += "> " + missingGpus.join("、 ") + "\n\n";
    }
  }
}

fs.writeFileSync('/Users/mac/new/缺失的FPS数据采集清单.md', mdContent);
console.log("Markdown file generated at /Users/mac/new/缺失的FPS数据采集清单.md");
