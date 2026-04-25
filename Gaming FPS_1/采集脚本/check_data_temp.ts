import { gamesFpsData, cpuList, gpuList, Resolution } from './src/data/gameFpsData';

const resolutions: Resolution[] = ['1080p', '1440p', '4K'];
const games = Object.keys(gamesFpsData);

console.log("=== CPU and GPU List Check ===");
console.log(`Total CPUs parsed: ${cpuList.length}`);
console.log(`Total GPUs parsed: ${gpuList.length}`);

const cpuSet = new Set(cpuList);
const gpuSet = new Set(gpuList);
const common = [...cpuList].filter(x => gpuSet.has(x));

if (common.length > 0) {
  console.log(`WARNING: There are ${common.length} items that appear in BOTH CPU and GPU lists (Parsing Error?):`);
  console.log(common);
} else {
  console.log("Good: CPU and GPU lists have no overlap.");
}

console.log("\n=== CPU List ===");
console.log(cpuList.slice(0, 5).join(", ") + (cpuList.length > 5 ? " ... (" + cpuList.length + " total)" : ""));

console.log("\n=== GPU List ===");
console.log(gpuList.slice(0, 5).join(", ") + (gpuList.length > 5 ? " ... (" + gpuList.length + " total)" : ""));

console.log("\n=== Missing Data Check ===");
let missingDataPoints = 0;
const missingDetails: string[] = [];

for (const game of games) {
  const cpuData = gamesFpsData[game].cpu || {};
  const gpuData = gamesFpsData[game].gpu || {};

  // Check CPU data
  for (const cpu of cpuList) {
    if (!cpuData[cpu]) {
      missingDataPoints++;
      if (missingDetails.length < 20) missingDetails.push(`[CPU] ${game} -> ${cpu} completely missing`);
    } else {
      for (const res of resolutions) {
        if (!cpuData[cpu][res]) {
          missingDataPoints++;
          if (missingDetails.length < 20) missingDetails.push(`[CPU] ${game} -> ${cpu} missing ${res}`);
        }
      }
    }
  }

  // Check GPU data
  for (const gpu of gpuList) {
    if (!gpuData[gpu]) {
      missingDataPoints++;
      if (missingDetails.length < 20) missingDetails.push(`[GPU] ${game} -> ${gpu} completely missing`);
    } else {
      for (const res of resolutions) {
        if (!gpuData[gpu][res]) {
          missingDataPoints++;
          if (missingDetails.length < 20) missingDetails.push(`[GPU] ${game} -> ${gpu} missing ${res}`);
        }
      }
    }
  }
}

console.log(`Total missing data points: ${missingDataPoints}`);
if (missingDataPoints > 0) {
  console.log("\nSample of missing data points:");
  missingDetails.forEach(d => console.log(d));
}
