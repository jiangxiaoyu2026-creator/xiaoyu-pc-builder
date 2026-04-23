import { gamesFpsData } from './src/data/gameFpsData';

for (const game of Object.keys(gamesFpsData)) {
    const cpuKeys = Object.keys(gamesFpsData[game].cpu).sort();
    const gpuKeys = Object.keys(gamesFpsData[game].gpu).sort();
    
    if (cpuKeys.length === 0 || gpuKeys.length === 0) continue;
    
    const firstCpu = cpuKeys[0];
    const firstGpu = gpuKeys[0];
    
    const cData = gamesFpsData[game].cpu[firstCpu]?.['1080p'];
    const gData = gamesFpsData[game].gpu[firstGpu]?.['1080p'];
    
    if (!cData || !gData) {
        console.log(`Game: ${game} | Missing data! cData:`, !!cData, `gData:`, !!gData);
    }
}
console.log("Check complete.");
