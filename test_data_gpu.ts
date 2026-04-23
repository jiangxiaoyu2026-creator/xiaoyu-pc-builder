import { gamesFpsData, gamesList, cpuList, gpuList } from './src/data/gameFpsData';
const gameData = gamesFpsData["赛博朋克 2077"];
const gpus = Object.keys(gameData.gpu);
const firstGpu = gpus[0];
console.log("First GPU:", firstGpu);
console.log("Data for first GPU at 1080p:", gameData.gpu[firstGpu]?.['1080p']);
