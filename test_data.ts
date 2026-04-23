import { gamesFpsData, gamesList, cpuList, gpuList } from './src/data/gameFpsData';

const game = "赛博朋克 2077";
console.log("Game in list:", gamesList.includes(game));
console.log("Game data keys:", Object.keys(gamesFpsData));

const gameData = gamesFpsData[game];
if (gameData) {
    const cpus = Object.keys(gameData.cpu);
    const gpus = Object.keys(gameData.gpu);
    console.log("Available CPUs:", cpus.length, cpus.slice(0, 3));
    console.log("Available GPUs:", gpus.length, gpus.slice(0, 3));

    const selectedCpu = cpuList[0];
    console.log("Initial CPU:", selectedCpu);
    console.log("Does initial CPU exist in game?", cpus.includes(selectedCpu));
    
    const firstCpu = cpus[0];
    console.log("First CPU in game:", firstCpu);
    console.log("Data for first CPU at 1080p:", gameData.cpu[firstCpu]?.['1080p']);
} else {
    console.log("GAME DATA IS UNDEFINED!");
}
