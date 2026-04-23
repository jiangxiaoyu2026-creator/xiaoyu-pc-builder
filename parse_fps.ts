import fs from 'fs';
import path from 'path';

const dataDir = '/Users/mac/new/Gaming FPS_1';
const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.md'));

type Resolution = '1080p' | '1440p' | '4K';
interface FpsMetrics {
  avg: number;
  low: number;
}

const gamesFpsData: Record<string, {
  cpu: Record<string, Partial<Record<string, FpsMetrics>>>,
  gpu: Record<string, Partial<Record<string, FpsMetrics>>>
}> = {};

const cpuSet = new Set<string>();
const gpuSet = new Set<string>();

const gameNameMapping: Record<string, string> = {
  "Apex Legends": "Apex 英雄",
  "Black Myth Wukong": "黑神话：悟空",
  "Counter-Strike 2": "反恐精英 2",
  "Cyberpunk 2077": "赛博朋克 2077",
  "Delta Force": "三角洲行动",
  "Dota 2": "刀塔 2",
  "Minecraft": "我的世界",
  "Overwatch 2": "守望先锋 2",
  "PUBG": "绝地求生",
  "PlayerUnknown's Battlegrounds": "绝地求生",
  "RDR2": "荒野大镖客：救赎 2",
  "Red Dead Redemption 2": "荒野大镖客：救赎 2",
  "Rust": "腐蚀",
  "Valorant": "无畏契约"
};

for (const file of files) {
  const isCpu = file.includes('_cpu_data');
  const isGpu = file.includes('_gpu_data');
  if (!isCpu && !isGpu) continue;

  const content = fs.readFileSync(path.join(dataDir, file), 'utf-8');
  const lines = content.split('\n');

  let rawGameName = '';
  for (const line of lines) {
    if (line.startsWith('## 游戏:')) {
      const match = line.match(/## 游戏:\s*(.+?)\s*\|/);
      if (match) {
        rawGameName = match[1].trim();
      }
      break;
    }
  }

  if (!rawGameName) continue;
  
  const gameName = gameNameMapping[rawGameName] || rawGameName;

  if (!gamesFpsData[gameName]) {
    gamesFpsData[gameName] = { cpu: {}, gpu: {} };
  }

  const targetDict = isCpu ? gamesFpsData[gameName].cpu : gamesFpsData[gameName].gpu;

  let parsingTable = false;
  for (const line of lines) {
    if (line.includes('|-----|--------|')) {
      parsingTable = true;
      continue;
    }
    if (parsingTable && line.trim().startsWith('|')) {
      const parts = line.split('|').map(p => p.trim()).filter(Boolean);
      if (parts.length >= 4) {
        const hardware = parts[0];
        const resRaw = parts[1];
        let res = '';
        if (resRaw.includes('1080')) res = '1080p';
        else if (resRaw.includes('1440')) res = '1440p';
        else if (resRaw.includes('2160') || resRaw.includes('4K')) res = '4K';

        const avgRaw = parts[2].replace(/[^\d]/g, '');
        const lowRaw = parts[3].replace(/[^\d]/g, '');

        if (hardware && res && avgRaw && lowRaw) {
          if (!targetDict[hardware]) {
            targetDict[hardware] = {};
          }
          targetDict[hardware][res] = {
            avg: parseInt(avgRaw, 10),
            low: parseInt(lowRaw, 10)
          };
          if (isCpu) cpuSet.add(hardware);
          if (isGpu) gpuSet.add(hardware);
        }
      }
    }
  }
}

const sortedGames = Object.keys(gamesFpsData).sort();
const sortedCpus = Array.from(cpuSet).sort();
const sortedGpus = Array.from(gpuSet).sort();

const outContent = `// Auto-generated Game FPS Data
export type Resolution = '1080p' | '1440p' | '4K';

export interface FpsMetrics {
  avg: number;
  low: number;
}

export const gamesList = ${JSON.stringify(sortedGames, null, 2)};
export const cpuList = ${JSON.stringify(sortedCpus, null, 2)};
export const gpuList = ${JSON.stringify(sortedGpus, null, 2)};

export const gamesFpsData: Record<string, { cpu: Record<string, Partial<Record<Resolution, FpsMetrics>>>, gpu: Record<string, Partial<Record<Resolution, FpsMetrics>>> }> = ${JSON.stringify(gamesFpsData, null, 2)};
`;

fs.writeFileSync('/Users/mac/new/src/data/gameFpsData.ts', outContent);
console.log('Successfully generated /Users/mac/new/src/data/gameFpsData.ts');
