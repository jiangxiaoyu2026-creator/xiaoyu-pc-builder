import { BuildEntry, Category, HardwareItem } from '../types/clientTypes';

export interface HardwareCompatibility {
    sockets: string[];
    memoryTypes: string[];
    cores?: number;
    threads?: number;
}

function unique(values: string[]) {
    return Array.from(new Set(values));
}

function parseSpecs(raw: unknown): Record<string, unknown> {
    let value = raw;
    for (let attempt = 0; attempt < 2 && typeof value === 'string'; attempt += 1) {
        try {
            value = JSON.parse(value);
        } catch {
            return {};
        }
    }
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function valuesFor(specs: Record<string, unknown>, keys: string[]) {
    return keys.flatMap((key) => {
        const value = specs[key];
        if (Array.isArray(value)) return value.map(String);
        return value === undefined || value === null ? [] : [String(value)];
    });
}

function normalizeSocket(value: string) {
    const text = value.toUpperCase().replace(/\s+/g, '');
    const matches = text.match(/AM[45]|LGA(?:1200|1700|1851)/g) || [];
    return matches.map((match) => match.replace('LGA', 'LGA'));
}

function normalizeMemoryType(value: string) {
    const text = value.toUpperCase();
    const result: string[] = [];
    if (/DDR\s*4|\bD4\b/.test(text)) result.push('DDR4');
    if (/DDR\s*5|\bD5\b/.test(text)) result.push('DDR5');
    return result;
}

function firstNumber(value: unknown) {
    const match = String(value ?? '').match(/\d+/);
    return match ? Number(match[0]) : undefined;
}

function inferSockets(item: HardwareItem) {
    const model = item.model.toUpperCase();
    if (item.category === 'mainboard') {
        if (/X870|B850|B840|B650|X670|A620/.test(model)) return ['AM5'];
        if (/B550|X570|B450|A520|A320/.test(model)) return ['AM4'];
        if (/Z890|B860|H810/.test(model)) return ['LGA1851'];
        if (/Z790|B760|Z690|B660|H610|Z590|B560|H510/.test(model)) return ['LGA1700'];
    }
    if (item.category === 'cpu') {
        if (/\b(245|250|265|270|285)[A-Z]{0,6}\b/.test(model)) return ['LGA1851'];
        if (/\b(12100|12400|12600|12900|13100|13400|13500|13600|13700|13900|14100|14400|14500|14600|14700|14900)[A-Z]{0,3}\b/.test(model)) return ['LGA1700'];
        if (/\b(7500|7600|7700|7800|7900|7950|8400|8500|8600|8700|9600|9700|9800|9900|9950)[A-Z0-9]*\b/.test(model)) return ['AM5'];
        if (/\b(2200|2400|2600|2700|3100|3200|3300|3400|3500|3600|3700|3900|4500|4600|4650|5500|5600|5700|5800|5900|5950)[A-Z0-9]*\b/.test(model)) return ['AM4'];
    }
    return [];
}

function inferMemoryTypes(item: HardwareItem) {
    const model = item.model.toUpperCase();
    const explicit = normalizeMemoryType(model);
    if (explicit.length > 0) return explicit;
    if (item.category === 'ram') {
        const speedMatch = model.match(/(?:^|\D)(2133|2400|2666|2800|3000|3200|3600|4000|4800|5200|5600|6000|6200|6400|6800|7200|7600|8000|8200|8400)(?:\D|$)/);
        if (speedMatch) return Number(speedMatch[1]) >= 4800 ? ['DDR5'] : ['DDR4'];
    }
    if (item.category === 'mainboard') {
        if (/X870|B850|B840|B650|X670|A620|Z890|B860|H810/.test(model)) return ['DDR5'];
    }
    return [];
}

export function getHardwareCompatibility(item?: HardwareItem | null): HardwareCompatibility {
    if (!item) return { sockets: [], memoryTypes: [] };
    const specs = parseSpecs(item.specs);
    const sockets = unique(valuesFor(specs, ['socket', 'socket_type', 'socketType', 'cpuSocket']).flatMap(normalizeSocket));
    const memoryTypes = unique(valuesFor(specs, ['memoryType', 'memory_type', 'ram_type', 'ramType', 'type']).flatMap(normalizeMemoryType));

    return {
        sockets: sockets.length > 0 ? sockets : inferSockets(item),
        memoryTypes: memoryTypes.length > 0 ? memoryTypes : inferMemoryTypes(item),
        cores: firstNumber(specs.cores),
        threads: firstNumber(specs.threads),
    };
}

export function hasOverlap(left: string[], right: string[]) {
    return left.some((value) => right.includes(value));
}

export function areSocketIncompatible(first?: HardwareItem | null, second?: HardwareItem | null) {
    const firstSockets = getHardwareCompatibility(first).sockets;
    const secondSockets = getHardwareCompatibility(second).sockets;
    return firstSockets.length > 0 && secondSockets.length > 0 && !hasOverlap(firstSockets, secondSockets);
}

export function areMemoryIncompatible(mainboard?: HardwareItem | null, ram?: HardwareItem | null) {
    const boardTypes = getHardwareCompatibility(mainboard).memoryTypes;
    const ramTypes = getHardwareCompatibility(ram).memoryTypes;
    return boardTypes.length > 0 && ramTypes.length > 0 && !hasOverlap(boardTypes, ramTypes);
}

export function getBuildItem(buildList: BuildEntry[], category: Category) {
    const entry = buildList.find((candidate) => candidate.category === category);
    if (!entry) return null;
    if (entry.item) return entry.item;
    if (!entry.customName?.trim()) return null;

    // 直播台允许直接输入型号。为常见的简写（如“12400”）补出最小商品对象，
    // 使兼容性筛选仍然能工作；未知型号不会被强行判断为不兼容。
    return {
        id: `custom-${entry.id}`,
        category: entry.category,
        brand: '',
        model: entry.customName.trim(),
        price: entry.customPrice || 0,
        specs: {},
    };
}

export function getCompatibilityIssues(buildList: BuildEntry[]) {
    const cpu = getBuildItem(buildList, 'cpu');
    const mainboard = getBuildItem(buildList, 'mainboard');
    const ram = getBuildItem(buildList, 'ram');
    const issues: string[] = [];
    const cpuSockets = getHardwareCompatibility(cpu).sockets;
    const mainboardSockets = getHardwareCompatibility(mainboard).sockets;
    const boardMemoryTypes = getHardwareCompatibility(mainboard).memoryTypes;
    const ramMemoryTypes = getHardwareCompatibility(ram).memoryTypes;

    if (cpu && mainboard && cpuSockets.length > 0 && mainboardSockets.length > 0 && !hasOverlap(cpuSockets, mainboardSockets)) {
        issues.push(`接口不兼容: CPU是 ${cpuSockets.join('/')}，主板是 ${mainboardSockets.join('/')}`);
    }
    if (mainboard && ram && boardMemoryTypes.length > 0 && ramMemoryTypes.length > 0 && !hasOverlap(boardMemoryTypes, ramMemoryTypes)) {
        issues.push(`内存不兼容: 内存是 ${ramMemoryTypes.join('/')}，主板支持 ${boardMemoryTypes.join('/')}`);
    }
    return issues;
}
