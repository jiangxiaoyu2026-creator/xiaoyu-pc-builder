import { gamesFpsData } from './src/data/gameFpsData';

let missingCount = 0;
for (const game of Object.keys(gamesFpsData)) {
    for (const cpu of Object.keys(gamesFpsData[game].cpu)) {
        for (const res of ['1080p', '1440p', '4K']) {
            if (!gamesFpsData[game].cpu[cpu]?.[res]) {
                missingCount++;
            }
        }
    }
    for (const gpu of Object.keys(gamesFpsData[game].gpu)) {
        for (const res of ['1080p', '1440p', '4K']) {
            if (!gamesFpsData[game].gpu[gpu]?.[res]) {
                missingCount++;
            }
        }
    }
}
console.log("Total missing data points:", missingCount);
