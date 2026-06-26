import type { HardwareItem } from '../types/clientTypes';

export type GameFpsResolution = '1080p' | '1440p' | '4K';
export type GameFpsHardwareType = 'cpu' | 'gpu';
export type GameFpsSortKey = 'avg' | 'low' | 'score' | 'name';

export interface GameFpsHardware {
    id: string;
    name: string;
    shortName: string;
    queryName: string;
    segment: string | null;
    fpsScore: number | null;
    fpsScorePosition: number | null;
}

export interface GameFpsGameSummary {
    rank: number;
    id: string;
    name: string;
    queryName: string;
    preset: string;
    officialImagePath?: string | null;
    imageSourceType?: string | null;
    imageKind?: string | null;
    fallbackReason?: string | null;
    stats: {
        cpuRows: number;
        gpuRows: number;
        resolutions: Record<GameFpsResolution, { cpuRows: number; gpuRows: number }>;
    };
    topByResolution: Record<GameFpsResolution, {
        cpuAvgFps: number | null;
        cpuLow1Fps: number | null;
        cpuQueryName: string | null;
        gpuAvgFps: number | null;
        gpuLow1Fps: number | null;
        gpuQueryName: string | null;
    }>;
}

export interface GameFpsIndex {
    version: string;
    generatedAt: string;
    sourceGeneratedAt: string;
    source: string;
    mode: 'component';
    topN: number;
    baselineCpu: GameFpsHardware;
    baselineGpu: GameFpsHardware;
    counts: {
        games: number;
        cpus: number;
        gpus: number;
        expectedRows: number;
        processedRows: number;
        skippedRows: number;
    };
    resolutions: { key: GameFpsResolution; label: string; source: string }[];
    games: GameFpsGameSummary[];
    cpus: GameFpsHardware[];
    gpus: GameFpsHardware[];
}

type CompactFpsEntry = [queryName: string, avgFps: number, low1Fps: number, avgPerformanceRating: number | null, low1PerformanceRating: number | null];

export interface GameFpsGameData {
    version: string;
    game: Pick<GameFpsGameSummary, 'rank' | 'id' | 'name' | 'queryName' | 'preset'>;
    cpu: Record<GameFpsResolution, CompactFpsEntry[]>;
    gpu: Record<GameFpsResolution, CompactFpsEntry[]>;
    stats: GameFpsGameSummary['stats'];
}

export interface GameFpsLeaderboardRow {
    rank: number;
    queryName: string;
    name: string;
    shortName: string;
    segment: string | null;
    fpsScore: number | null;
    fpsScorePosition: number | null;
    avgFps: number;
    low1Fps: number;
    avgPerformanceRating: number | null;
    low1PerformanceRating: number | null;
}

export interface GameFpsVisual {
    displayName: string;
    originalName: string;
    subtitle: string;
    searchText: string;
    iconPath: string | null;
    coverPath: string | null;
}

export interface BuildGameFpsRow {
    name: string;
    fps: number;
    lowFps?: number;
    queryName: string;
    iconPath: string | null;
}

const DATA_VERSION = '2026-06-26';
const DATA_BASE_PATH = `/data/howmanyfps/${DATA_VERSION}`;

const gameDisplayNames: Record<string, string> = {
    'fortnite': '堡垒之夜',
    'minecraft': '我的世界',
    'grand-theft-auto-v': '侠盗猎车手 5',
    'league-of-legends': '英雄联盟',
    'counter-strike-2': '反恐精英 2',
    'valorant': '无畏契约',
    'dota-2': '刀塔 2',
    'overwatch-2': '守望先锋 2',
    'call-of-duty-warzone-20': '使命召唤：战区 2.0',
    'world-of-warcraft': '魔兽世界',
    'tom-clancys-rainbow-six-siege': '彩虹六号：围攻',
    'apex-legends': 'Apex 英雄',
    'escape-from-tarkov': '逃离塔科夫',
    'hitman-3': '杀手 3',
    'rocket-league': '火箭联盟',
    'destiny-2': '命运 2',
    'playerunknowns-battlegrounds': '绝地求生',
    'rust': '腐蚀',
    'elden-ring': '艾尔登法环',
    'battlefield-6': '战地风云 6',
    'red-dead-redemption-2': '荒野大镖客：救赎 2',
    'cyberpunk-2077': '赛博朋克 2077',
    'diablo-iv': '暗黑破坏神 IV',
    'hunt-showdown': '猎杀：对决',
    'helldivers-2': '绝地潜兵 2',
    'world-of-tanks': '坦克世界',
    'baldurs-gate-3': '博德之门 3',
    'clair-obscur-expedition-33': '光与影：33号远征队',
    'sea-of-thieves': '盗贼之海',
    'borderlands-4': '无主之地 4',
    'tom-clancys-the-division-2': '全境封锁 2',
    'lost-ark': '命运方舟',
    'war-thunder': '战争雷霆',
    'monster-hunter-wilds': '怪物猎人：荒野',
    'the-witcher-3-wild-hunt': '巫师 3：狂猎',
    'call-of-duty-black-ops-6': '使命召唤：黑色行动 6',
    'total-war-warhammer-iii': '全面战争：战锤 III',
    'god-of-war': '战神',
    'god-of-war-ragnarök': '战神：诸神黄昏',
    'halo-infinite': '光环：无限',
    'warhammer-40000-space-marine-2': '战锤 40K：星际战士 2',
    'the-last-of-us-part-ii': '最后生还者 第二部',
    'f1-25': 'F1 25',
    'gears-5': '战争机器 5',
    'the-first-descendant': '第一后裔',
    'valheim': '英灵神殿',
    'the-last-of-us-part-i': '最后生还者 第一部',
    'hogwarts-legacy': '霍格沃茨之遗',
    'monster-hunter-world': '怪物猎人：世界',
    'star-wars-jedi-fallen-order': '星球大战 绝地：陨落的武士团',
};

const availableIconNames = new Set([
    '黑神话：悟空',
    '逃离塔科夫',
    '守望先锋 2',
    '反恐精英 2',
    '魔兽世界',
    '我的世界',
    'Apex 英雄',
    '三角洲行动',
    '使命召唤：战区 2.0',
    '命运 2',
    '腐蚀',
    '绝地求生',
    '无畏契约',
    '赛博朋克 2077',
    '刀塔 2',
    '堡垒之夜',
    '荒野大镖客：救赎 2',
    '艾尔登法环',
    '火箭联盟',
    '侠盗猎车手 5',
    '彩虹六号：围攻',
    '英雄联盟',
]);

const availableCoverNames = new Set([
    '黑神话：悟空',
    '守望先锋 2',
    '反恐精英 2',
    '我的世界',
    'Apex 英雄',
    '三角洲行动',
    '绝地求生',
    '赛博朋克 2077',
    '无畏契约',
    '刀塔 2',
    '荒野大镖客：救赎 2',
]);

const preferredBuildGameQueryNames = [
    'cyberpunk-2077',
    'red-dead-redemption-2',
    'counter-strike-2',
    'valorant',
    'playerunknowns-battlegrounds',
    'apex-legends',
    'dota-2',
    'overwatch-2',
    'call-of-duty-warzone-20',
    'minecraft',
    'league-of-legends',
    'grand-theft-auto-v',
    'elden-ring',
    'escape-from-tarkov',
    'tom-clancys-rainbow-six-siege',
    'fortnite',
];

let indexPromise: Promise<GameFpsIndex> | null = null;
const gameDataPromises = new Map<string, Promise<GameFpsGameData>>();

async function fetchJson<T>(url: string, cache: RequestCache = 'force-cache'): Promise<T> {
    const response = await fetch(url, { cache });
    if (!response.ok) {
        throw new Error(`Failed to load FPS data: ${response.status} ${url}`);
    }
    return response.json() as Promise<T>;
}

function normalizeText(value: string) {
    return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function resolutionFromNumber(value: number): GameFpsResolution {
    if (value === 1440) return '1440p';
    if (value === 2160) return '4K';
    return '1080p';
}

export function getGameFpsIndex() {
    if (!indexPromise) {
        indexPromise = fetchJson<GameFpsIndex>(`${DATA_BASE_PATH}/index.json`, 'no-cache');
    }
    return indexPromise;
}

export function getGameFpsGame(queryName: string) {
    if (!gameDataPromises.has(queryName)) {
        gameDataPromises.set(queryName, fetchJson<GameFpsGameData>(`${DATA_BASE_PATH}/games/${queryName}.json`));
    }
    return gameDataPromises.get(queryName)!;
}

export function getGameVisual(game: Pick<GameFpsGameSummary, 'name' | 'queryName' | 'officialImagePath'>): GameFpsVisual {
    const displayName = gameDisplayNames[game.queryName] || game.name;
    const hasLocalizedName = displayName !== game.name;
    const iconPath = availableIconNames.has(displayName) ? `/images/games/icons/${displayName}.png` : null;
    const coverPath = game.officialImagePath || (availableCoverNames.has(displayName) ? `/images/games/covers/${displayName}.jpg` : null);

    return {
        displayName,
        originalName: game.name,
        subtitle: hasLocalizedName ? game.name : game.queryName.replace(/-/g, ' '),
        searchText: `${displayName} ${game.name} ${game.queryName}`.toLowerCase(),
        iconPath,
        coverPath,
    };
}

export function buildLeaderboardRows(
    index: GameFpsIndex,
    gameData: GameFpsGameData,
    type: GameFpsHardwareType,
    resolution: GameFpsResolution,
    searchTerm: string,
    sortKey: GameFpsSortKey,
) {
    const hardwareList = type === 'cpu' ? index.cpus : index.gpus;
    const hardwareByQueryName = new Map(hardwareList.map((hardware) => [hardware.queryName, hardware]));
    const keyword = searchTerm.trim().toLowerCase();

    const rows = (gameData[type][resolution] || []).map((entry, indexInList): GameFpsLeaderboardRow | null => {
        const hardware = hardwareByQueryName.get(entry[0]);
        if (!hardware) return null;
        return {
            rank: indexInList + 1,
            queryName: hardware.queryName,
            name: hardware.name,
            shortName: hardware.shortName,
            segment: hardware.segment,
            fpsScore: hardware.fpsScore,
            fpsScorePosition: hardware.fpsScorePosition,
            avgFps: entry[1],
            low1Fps: entry[2],
            avgPerformanceRating: entry[3],
            low1PerformanceRating: entry[4],
        };
    }).filter((row): row is GameFpsLeaderboardRow => {
        if (!row) return false;
        if (!keyword) return true;
        return `${row.name} ${row.shortName} ${row.queryName}`.toLowerCase().includes(keyword);
    });

    const sorted = [...rows];
    if (sortKey === 'low') {
        sorted.sort((a, b) => b.low1Fps - a.low1Fps || b.avgFps - a.avgFps);
    } else if (sortKey === 'score') {
        sorted.sort((a, b) => (a.fpsScorePosition || Number.MAX_SAFE_INTEGER) - (b.fpsScorePosition || Number.MAX_SAFE_INTEGER));
    } else if (sortKey === 'name') {
        sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else {
        sorted.sort((a, b) => b.avgFps - a.avgFps || b.low1Fps - a.low1Fps);
    }

    return sorted.map((row, displayIndex) => ({ ...row, rank: displayIndex + 1 }));
}

function canUseHardwareKey(item: HardwareItem, key: string, type: GameFpsHardwareType) {
    const rawModel = item.model.toUpperCase();
    const upperKey = key.toUpperCase();
    if (type === 'gpu' && /\b[45]090D\b|RTX\s*[45]090D/.test(rawModel) && !/\b[45]090\s*D\b/.test(upperKey)) return false;
    if (type === 'cpu' && /13400EF/.test(rawModel) && !/13400EF|13400F/.test(upperKey)) return false;
    return true;
}

export function findHardwareQueryName(index: GameFpsIndex, item: HardwareItem | null | undefined, type: GameFpsHardwareType) {
    if (!item) return null;
    const hardwareList = type === 'cpu' ? index.cpus : index.gpus;
    const rawModel = item.model.toUpperCase();
    const modelStr = normalizeText(`${item.brand} ${item.model}`);
    const modelOnly = normalizeText(rawModel);

    for (const hardware of hardwareList) {
        const cleanKey = normalizeText(hardware.name);
        const cleanShortName = normalizeText(hardware.shortName);
        if (
            (modelStr.includes(cleanKey) || cleanKey.includes(modelStr) ||
                modelOnly.includes(cleanKey) || cleanKey.includes(modelOnly) ||
                modelStr.includes(cleanShortName) || cleanShortName.includes(modelStr) ||
                modelOnly.includes(cleanShortName) || cleanShortName.includes(modelOnly)) &&
            canUseHardwareKey(item, hardware.name, type)
        ) {
            return hardware.queryName;
        }
    }

    if (type === 'cpu') {
        const match = rawModel.match(/\d{4,5}[A-Z]{0,3}/);
        if (match) {
            const identifier = match[0];
            const numMatch = identifier.match(/\d+/);
            for (const hardware of hardwareList) {
                const upperKey = hardware.name.toUpperCase();
                if ((upperKey.includes(identifier) || (numMatch && upperKey.includes(numMatch[0]))) && canUseHardwareKey(item, hardware.name, type)) {
                    return hardware.queryName;
                }
            }
        }
    }

    if (type === 'gpu') {
        const numMatch = item.model.match(/\d{4}/);
        if (numMatch) {
            const num = numMatch[0];
            const isTi = /TI/i.test(item.model);
            const isSuper = /SUPER/i.test(item.model);
            const isXTX = /XTX/i.test(item.model);
            const isXT = /XT\b/i.test(item.model) && !isXTX;
            const isGRE = /GRE/i.test(item.model);

            for (const hardware of hardwareList) {
                const upperKey = hardware.name.toUpperCase();
                if (!upperKey.includes(num)) continue;

                const keyTi = /TI/i.test(upperKey);
                const keySuper = /SUPER/i.test(upperKey);
                const keyXTX = /XTX/i.test(upperKey);
                const keyXT = /XT\b/i.test(upperKey) && !keyXTX;
                const keyGRE = /GRE/i.test(upperKey);

                if (isTi === keyTi && isSuper === keySuper && isXTX === keyXTX && isXT === keyXT && isGRE === keyGRE && canUseHardwareKey(item, hardware.name, type)) {
                    return hardware.queryName;
                }
            }

            for (const hardware of hardwareList) {
                if (hardware.name.toUpperCase().includes(num) && canUseHardwareKey(item, hardware.name, type)) {
                    return hardware.queryName;
                }
            }
        }
    }

    return null;
}

function findEntry(entries: CompactFpsEntry[], queryName: string | null) {
    if (!queryName) return null;
    return entries.find((entry) => entry[0] === queryName) || null;
}

export async function getDefaultBuildGameFps(limit = 12): Promise<BuildGameFpsRow[]> {
    const index = await getGameFpsIndex();
    return index.games.slice(0, limit).map((game) => {
        const visual = getGameVisual(game);
        return {
            name: visual.displayName,
            fps: 0,
            queryName: game.queryName,
            iconPath: visual.iconPath,
        };
    });
}

export async function getBuildGameFps(
    cpuItem: HardwareItem | null | undefined,
    gpuItem: HardwareItem | null | undefined,
    resolution: GameFpsResolution,
    limit = 12,
): Promise<BuildGameFpsRow[]> {
    const index = await getGameFpsIndex();
    const cpuQueryName = findHardwareQueryName(index, cpuItem, 'cpu');
    const gpuQueryName = findHardwareQueryName(index, gpuItem, 'gpu');
    const gamesByQueryName = new Map(index.games.map((game) => [game.queryName, game]));
    const queryNames = [
        ...preferredBuildGameQueryNames.filter((queryName) => gamesByQueryName.has(queryName)),
        ...index.games.map((game) => game.queryName).filter((queryName) => !preferredBuildGameQueryNames.includes(queryName)),
    ].slice(0, limit);

    const gameDataList = await Promise.all(queryNames.map((queryName) => getGameFpsGame(queryName)));

    return gameDataList.map((gameData) => {
        const game = gamesByQueryName.get(gameData.game.queryName) || gameData.game;
        const visual = getGameVisual(game);
        const cpuEntry = findEntry(gameData.cpu[resolution], cpuQueryName);
        const gpuEntry = findEntry(gameData.gpu[resolution], gpuQueryName);
        const avgFps = cpuEntry && gpuEntry ? Math.min(cpuEntry[1], gpuEntry[1]) : (gpuEntry?.[1] ?? cpuEntry?.[1] ?? 0);
        const lowFps = cpuEntry && gpuEntry ? Math.min(cpuEntry[2], gpuEntry[2]) : (gpuEntry?.[2] ?? cpuEntry?.[2] ?? undefined);

        return {
            name: visual.displayName,
            fps: avgFps,
            lowFps,
            queryName: gameData.game.queryName,
            iconPath: visual.iconPath,
        };
    });
}
