import { CSSProperties, useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle,
    ArrowRightLeft,
    ChevronDown,
    Cpu,
    Gamepad2,
    Gauge,
    RefreshCw,
    Search,
    Smartphone,
    Trophy,
    Wifi
} from 'lucide-react';
import {
    LeaderboardApi,
    LeaderboardCategory,
    LeaderboardCategoryId,
    LeaderboardCategoryCompareResponse,
    LeaderboardCompareMetric,
    LeaderboardDefinition,
    LeaderboardNameCandidate,
    LeaderboardRow
} from '../../services/leaderboardApi';

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';
type SurfaceMode = 'ladder' | 'compare';
type CompareKind = Extract<LeaderboardCategoryId, 'cpu' | 'gpu'>;
type CompareSide = 'first' | 'second';
type CompareWinnerSide = CompareSide | 'tie';

interface CompareWinnerInfo {
    side: CompareWinnerSide;
    label: string;
    percent: number;
}

interface PowerInfo {
    watts: number | null;
    raw?: string;
    source: string;
}

interface RelativePerformance {
    first: number;
    second: number;
    metricCount: number;
}

interface RadarAxis {
    label: string;
    first: number;
    second: number;
    metricCount: number;
    sourceLabel: string;
    firstRaw?: string;
    secondRaw?: string;
}

const SIDE_THEMES = {
    first: {
        short: 'A',
        camp: '方案',
        text: 'text-indigo-700 dark:text-indigo-200',
        dot: 'bg-indigo-400',
    },
    second: {
        short: 'B',
        camp: '方案',
        text: 'text-orange-700 dark:text-orange-200',
        dot: 'bg-orange-400',
    },
} as const;

const INITIAL_LIMIT = 90;
const LOAD_MORE_LIMIT = 90;
const OVERALL_BOARD_ID = '__overall__';
const COMPARE_MIN_QUERY_LENGTH = 2;
const POWER_KEYWORDS = ['功耗', 'TDP', 'TGP', 'TBP', 'PBP', 'MTP', 'PL1', 'PL2', '整卡功耗', '板卡功耗', '功率', '基础功耗', '最大功耗', '典型功耗'];

function formatNumber(value: number): string {
    return new Intl.NumberFormat('zh-CN', {
        maximumFractionDigits: value >= 100 ? 0 : 2
    }).format(value);
}

function formatSignedPercent(value: number): string {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
}

function getCategoryIcon(category: LeaderboardCategoryId) {
    switch (category) {
        case 'cpu':
            return Cpu;
        case 'gpu':
            return Gamepad2;
        case 'soc':
            return Smartphone;
        case 'router':
            return Wifi;
        default:
            return Trophy;
    }
}

function getRankTone(rank: number) {
    if (rank === 1) return 'border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-400/50 dark:bg-amber-400/15 dark:text-amber-200';
    if (rank === 2) return 'border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-400/40 dark:bg-cyan-400/10 dark:text-cyan-200';
    if (rank === 3) return 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-400/40 dark:bg-rose-400/10 dark:text-rose-200';
    return 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400';
}

function findBoard(boards: LeaderboardDefinition[], boardId: string) {
    return boards.find(board => board.id === boardId);
}

function normalizeCompareName(value: string) {
    return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function isCandidateSelected(value: string, candidate: LeaderboardNameCandidate | null) {
    if (!candidate) return false;
    return normalizeCompareName(value) === normalizeCompareName(candidate.name);
}

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}

function getWinnerInfo(metric: LeaderboardCompareMetric): CompareWinnerInfo | null {
    if (!metric.first || !metric.second) return null;

    const firstScore = metric.first.score;
    const secondScore = metric.second.score;
    if (firstScore === secondScore) {
        return { side: 'tie', label: '持平', percent: 0 };
    }

    const firstWins = firstScore > secondScore;
    const winnerScore = firstWins ? firstScore : secondScore;
    const loserScore = firstWins ? secondScore : firstScore;
    const percent = loserScore > 0 ? ((winnerScore - loserScore) / loserScore) * 100 : 0;

    return {
        side: firstWins ? 'first' : 'second',
        label: firstWins ? '方案 A 胜出' : '方案 B 胜出',
        percent,
    };
}

function average(values: number[]) {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function normalizeMetricPair(metric: LeaderboardCompareMetric) {
    if (!metric.first || !metric.second) return null;

    const maxScore = Math.max(metric.first.score, metric.second.score);
    if (maxScore <= 0) return null;

    return {
        first: (metric.first.score / maxScore) * 100,
        second: (metric.second.score / maxScore) * 100,
    };
}

function parseSpecNumber(value: string | undefined) {
    if (!value) return null;
    const normalized = value.replace(/,/g, '');
    const match = normalized.match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : null;
}

function parseReleaseMonth(value: string | undefined) {
    if (!value) return null;
    const match = value.match(/(20\d{2})(?:[.\-/年](\d{1,2}))?/);
    if (!match) return null;
    const year = Number(match[1]);
    const month = clamp(Number(match[2] ?? 1), 1, 12);
    return year * 12 + month;
}

function formatReleaseMonth(monthValue: number | null) {
    if (!monthValue) return undefined;
    const year = Math.floor((monthValue - 1) / 12);
    const month = ((monthValue - 1) % 12) + 1;
    return `${year}.${String(month).padStart(2, '0')}`;
}

function getCurrentMonthValue() {
    const now = new Date();
    return now.getFullYear() * 12 + now.getMonth() + 1;
}

function scoreReleaseMonth(monthValue: number) {
    const ageMonths = Math.max(0, getCurrentMonthValue() - monthValue);
    return clamp(100 - ageMonths * 1.8, 35, 100);
}

function parseWattValue(value: string | undefined) {
    if (!value) return null;
    const normalized = value.replace(/,/g, '');
    const match = normalized.match(/(\d+(?:\.\d+)?)\s*(?:w|瓦)/i);
    return match ? Number(match[1]) : null;
}

function isPowerKey(key: string) {
    const normalizedKey = key.toLowerCase();
    return POWER_KEYWORDS.some(keyword => normalizedKey.includes(keyword.toLowerCase()));
}

function findSpecValue(metrics: LeaderboardCompareMetric[], side: CompareSide, keywords: string[]) {
    for (const metric of metrics) {
        const row = side === 'first' ? metric.first : metric.second;
        if (!row?.specMap) continue;

        const entries = Object.entries(row.specMap);
        for (const keyword of keywords) {
            const exact = entries.find(([key, value]) => key === keyword && Boolean(value));
            if (exact) return exact[1];
        }
        for (const keyword of keywords) {
            const fuzzy = entries.find(([key, value]) => key.toLowerCase().includes(keyword.toLowerCase()) && Boolean(value));
            if (fuzzy) return fuzzy[1];
        }
    }

    return undefined;
}

function findPowerInfo(metrics: LeaderboardCompareMetric[], side: CompareSide): PowerInfo {
    for (const metric of metrics) {
        const row = side === 'first' ? metric.first : metric.second;
        if (!row) continue;

        for (const [key, value] of Object.entries(row.specMap)) {
            if (!value) continue;
            const watts = isPowerKey(key) ? parseSpecNumber(value) : parseWattValue(value);
            if (watts && watts > 0) {
                return {
                    watts,
                    raw: /(?:w|瓦)/i.test(value) ? value : `${formatNumber(watts)}W`,
                    source: `${metric.board.shortTitle} · ${key}`,
                };
            }
        }

        for (const spec of row.specs) {
            const [key = '', value = spec] = spec.split(/[:：]/);
            const watts = isPowerKey(key) ? parseSpecNumber(value) : parseWattValue(spec);
            if (watts && watts > 0) {
                return {
                    watts,
                    raw: /(?:w|瓦)/i.test(spec) ? spec.replace(/^.*?[:：]\s*/, '') : `${formatNumber(watts)}W`,
                    source: `${metric.board.shortTitle} · ${key || '规格'}`,
                };
            }
        }

        const nameWatts = parseWattValue(row.name);
        if (nameWatts && nameWatts > 0) {
            return {
                watts: nameWatts,
                raw: `${formatNumber(nameWatts)}W`,
                source: '型号名称',
            };
        }
    }

    return {
        watts: null,
        source: '本地 CSV 暂无功耗字段',
    };
}

function buildMetricAxis(
    label: string,
    metrics: LeaderboardCompareMetric[],
    match: (metric: LeaderboardCompareMetric) => boolean,
    sourceLabel: string
): RadarAxis | null {
    const pairs = metrics
        .filter(match)
        .map(normalizeMetricPair)
        .filter((pair): pair is { first: number; second: number } => Boolean(pair));

    if (pairs.length === 0) return null;

    return {
        label,
        first: average(pairs.map(pair => pair.first)),
        second: average(pairs.map(pair => pair.second)),
        metricCount: pairs.length,
        sourceLabel,
    };
}

function buildNumericSpecAxis(
    label: string,
    firstValue: number | null,
    secondValue: number | null,
    sourceLabel: string,
    options: { lowerIsBetter?: boolean; firstRaw?: string; secondRaw?: string } = {}
): RadarAxis | null {
    if (!firstValue || !secondValue || firstValue <= 0 || secondValue <= 0) return null;

    const maxValue = Math.max(firstValue, secondValue);
    const minValue = Math.min(firstValue, secondValue);

    return {
        label,
        first: options.lowerIsBetter ? (minValue / firstValue) * 100 : (firstValue / maxValue) * 100,
        second: options.lowerIsBetter ? (minValue / secondValue) * 100 : (secondValue / maxValue) * 100,
        metricCount: 1,
        sourceLabel,
        firstRaw: options.firstRaw,
        secondRaw: options.secondRaw,
    };
}

function buildSpecAxes(kind: CompareKind, metrics: LeaderboardCompareMetric[]): RadarAxis[] {
    const axes: RadarAxis[] = [];
    const firstReleaseRaw = findSpecValue(metrics, 'first', ['上市时间', '发布时间']);
    const secondReleaseRaw = findSpecValue(metrics, 'second', ['上市时间', '发布时间']);
    const firstRelease = parseReleaseMonth(firstReleaseRaw);
    const secondRelease = parseReleaseMonth(secondReleaseRaw);

    if (firstRelease && secondRelease) {
        axes.push({
            label: '上市时间',
            first: scoreReleaseMonth(firstRelease),
            second: scoreReleaseMonth(secondRelease),
            metricCount: 1,
            sourceLabel: '越新越高',
            firstRaw: formatReleaseMonth(firstRelease),
            secondRaw: formatReleaseMonth(secondRelease),
        });
    }

    const firstPower = findPowerInfo(metrics, 'first');
    const secondPower = findPowerInfo(metrics, 'second');
    const powerAxis = buildNumericSpecAxis(
        '功耗控制',
        firstPower.watts,
        secondPower.watts,
        '瓦数越低越高',
        { lowerIsBetter: true, firstRaw: firstPower.raw, secondRaw: secondPower.raw }
    );
    if (powerAxis) axes.push(powerAxis);

    if (kind === 'cpu') {
        const firstCore = parseSpecNumber(findSpecValue(metrics, 'first', ['核心数']));
        const secondCore = parseSpecNumber(findSpecValue(metrics, 'second', ['核心数']));
        const firstThread = parseSpecNumber(findSpecValue(metrics, 'first', ['线程数']));
        const secondThread = parseSpecNumber(findSpecValue(metrics, 'second', ['线程数']));
        const coreAxis = buildNumericSpecAxis('核心线程', firstCore, secondCore, '核心 + 线程');
        const threadAxis = buildNumericSpecAxis('核心线程', firstThread, secondThread, '核心 + 线程');

        if (coreAxis && threadAxis) {
            axes.push({
                label: '核心线程',
                first: average([coreAxis.first, threadAxis.first]),
                second: average([coreAxis.second, threadAxis.second]),
                metricCount: 2,
                sourceLabel: '核心 + 线程',
                firstRaw: `${formatNumber(firstCore ?? 0)}C/${formatNumber(firstThread ?? 0)}T`,
                secondRaw: `${formatNumber(secondCore ?? 0)}C/${formatNumber(secondThread ?? 0)}T`,
            });
        }
    } else {
        const firstMemoryRaw = findSpecValue(metrics, 'first', ['显存容量', '显存']);
        const secondMemoryRaw = findSpecValue(metrics, 'second', ['显存容量', '显存']);
        const memoryAxis = buildNumericSpecAxis(
            '显存容量',
            parseSpecNumber(firstMemoryRaw),
            parseSpecNumber(secondMemoryRaw),
            '容量越大越高',
            { firstRaw: firstMemoryRaw, secondRaw: secondMemoryRaw }
        );
        if (memoryAxis) axes.push(memoryAxis);
    }

    return axes;
}

function buildRadarAxes(kind: CompareKind, metrics: LeaderboardCompareMetric[]): RadarAxis[] {
    const performanceAxes = kind === 'cpu'
        ? [
            buildMetricAxis('单核性能', metrics, metric => metric.board.title.includes('单核'), '单核跑分均值'),
            buildMetricAxis('多核性能', metrics, metric => metric.board.title.includes('多核'), '多核跑分均值'),
            buildMetricAxis('渲染生产', metrics, metric => metric.board.group === '渲染' || metric.board.title.includes('Blender'), '生产力跑分'),
        ]
        : [
            buildMetricAxis('理论算力', metrics, metric => metric.board.group === '理论性能', 'FP32 / AI'),
            buildMetricAxis('图形跑分', metrics, metric => metric.board.group === '3DMark', '3DMark 均值'),
            buildMetricAxis('游戏帧率', metrics, metric => metric.board.group === '游戏帧率', '游戏均值'),
            buildMetricAxis('生产渲染', metrics, metric => metric.board.group === '生产力', '生产力跑分'),
        ];

    return [
        ...performanceAxes.filter((axis): axis is RadarAxis => Boolean(axis)),
        ...buildSpecAxes(kind, metrics),
    ];
}

function getRadarPoint(index: number, total: number, value: number, radius = 92, center = 160) {
    const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
    const distance = radius * (clamp(value, 0, 100) / 100);
    return {
        x: center + Math.cos(angle) * distance,
        y: center + Math.sin(angle) * distance,
    };
}

function getRadarPolygon(values: number[]) {
    return values
        .map((value, index) => {
            const point = getRadarPoint(index, values.length, value);
            return `${point.x},${point.y}`;
        })
        .join(' ');
}

function buildRelativePerformance(metrics: LeaderboardCompareMetric[]): RelativePerformance {
    const pairs = metrics
        .map(normalizeMetricPair)
        .filter((pair): pair is { first: number; second: number } => Boolean(pair));

    return {
        first: average(pairs.map(pair => pair.first)),
        second: average(pairs.map(pair => pair.second)),
        metricCount: pairs.length,
    };
}

function useCatalog() {
    const [categories, setCategories] = useState<LeaderboardCategory[]>([]);
    const [boards, setBoards] = useState<LeaderboardDefinition[]>([]);
    const [status, setStatus] = useState<LoadStatus>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        let active = true;

        async function loadCatalog() {
            setStatus('loading');
            try {
                const data = await LeaderboardApi.getCatalog();
                if (!active) return;
                setCategories(data.categories);
                setBoards(data.boards);
                setStatus('ready');
            } catch (error) {
                if (!active) return;
                setStatus('error');
                setErrorMessage(error instanceof Error ? error.message : '榜单目录加载失败');
            }
        }

        loadCatalog();

        return () => {
            active = false;
        };
    }, []);

    return { categories, boards, status, errorMessage };
}

function usePagedRows(board: LeaderboardDefinition | undefined, searchTerm: string) {
    const [rows, setRows] = useState<LeaderboardRow[]>([]);
    const [total, setTotal] = useState(0);
    const [topScore, setTopScore] = useState(0);
    const [status, setStatus] = useState<LoadStatus>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    useEffect(() => {
        let active = true;

        async function loadFirstPage() {
            if (!board) {
                setRows([]);
                setTotal(0);
                setTopScore(0);
                setStatus('idle');
                return;
            }

            setStatus('loading');
            setErrorMessage('');
            try {
                const data = await LeaderboardApi.getRows(board.id, {
                    offset: 0,
                    limit: INITIAL_LIMIT,
                    search: searchTerm
                });
                if (!active) return;
                setRows(data.items);
                setTotal(data.total);
                setTopScore(data.topScore);
                setStatus('ready');
            } catch (error) {
                if (!active) return;
                setRows([]);
                setTotal(0);
                setTopScore(0);
                setStatus('error');
                setErrorMessage(error instanceof Error ? error.message : '榜单数据加载失败');
            }
        }

        loadFirstPage();

        return () => {
            active = false;
        };
    }, [board, searchTerm]);

    const loadMore = async () => {
        if (!board || isLoadingMore || rows.length >= total) return;

        setIsLoadingMore(true);
        try {
            const data = await LeaderboardApi.getRows(board.id, {
                offset: rows.length,
                limit: LOAD_MORE_LIMIT,
                search: searchTerm
            });
            setRows(prev => [...prev, ...data.items]);
            setTotal(data.total);
            setTopScore(data.topScore);
        } finally {
            setIsLoadingMore(false);
        }
    };

    return {
        rows,
        total,
        topScore,
        status,
        errorMessage,
        isLoadingMore,
        hasMore: rows.length < total,
        loadMore
    };
}

function useCompositeRows(category: LeaderboardCategoryId, searchTerm: string, enabled: boolean) {
    const [rows, setRows] = useState<LeaderboardRow[]>([]);
    const [total, setTotal] = useState(0);
    const [topScore, setTopScore] = useState(0);
    const [status, setStatus] = useState<LoadStatus>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    useEffect(() => {
        let active = true;

        async function loadComposite() {
            if (!enabled) {
                setRows([]);
                setTotal(0);
                setTopScore(0);
                setStatus('idle');
                return;
            }

            setStatus('loading');
            setErrorMessage('');
            try {
                const data = await LeaderboardApi.getCompositeRows(category, {
                    offset: 0,
                    limit: INITIAL_LIMIT,
                    search: searchTerm
                });
                if (!active) return;
                setRows(data.items);
                setTotal(data.total);
                setTopScore(data.topScore);
                setStatus('ready');
            } catch (error) {
                if (!active) return;
                setRows([]);
                setTotal(0);
                setTopScore(0);
                setStatus('error');
                setErrorMessage(error instanceof Error ? error.message : '综合榜单数据加载失败');
            }
        }

        loadComposite();

        return () => {
            active = false;
        };
    }, [category, enabled, searchTerm]);

    const loadMore = async () => {
        if (!enabled || isLoadingMore || rows.length >= total) return;

        setIsLoadingMore(true);
        try {
            const data = await LeaderboardApi.getCompositeRows(category, {
                offset: rows.length,
                limit: LOAD_MORE_LIMIT,
                search: searchTerm
            });
            setRows(prev => [...prev, ...data.items]);
            setTotal(data.total);
            setTopScore(data.topScore);
        } finally {
            setIsLoadingMore(false);
        }
    };

    return {
        rows,
        total,
        topScore,
        status,
        errorMessage,
        isLoadingMore,
        hasMore: rows.length < total,
        loadMore
    };
}

function useDebouncedValue(value: string, delay = 260) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = window.setTimeout(() => setDebouncedValue(value), delay);
        return () => window.clearTimeout(timer);
    }, [delay, value]);

    return debouncedValue;
}

function useCategoryCompare(category: CompareKind, firstName: string, secondName: string, enabled: boolean) {
    const debouncedFirstName = useDebouncedValue(firstName, 520);
    const debouncedSecondName = useDebouncedValue(secondName, 520);
    const [result, setResult] = useState<LeaderboardCategoryCompareResponse | null>(null);
    const [status, setStatus] = useState<LoadStatus>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        let active = true;

        async function compare() {
            const firstQuery = debouncedFirstName.trim();
            const secondQuery = debouncedSecondName.trim();
            const hasSearchableInput = firstQuery.length >= COMPARE_MIN_QUERY_LENGTH || secondQuery.length >= COMPARE_MIN_QUERY_LENGTH;

            if (!enabled || !hasSearchableInput) {
                setResult(null);
                setStatus('idle');
                setErrorMessage('');
                return;
            }

            setStatus('loading');
            setErrorMessage('');
            try {
                const data = await LeaderboardApi.compareCategory({
                    category,
                    firstName: firstQuery,
                    secondName: secondQuery
                });
                if (!active) return;
                setResult(data);
                setStatus('ready');
            } catch (error) {
                if (!active) return;
                setResult(null);
                setStatus('error');
                setErrorMessage(error instanceof Error ? error.message : '对比数据加载失败');
            }
        }

        compare();

        return () => {
            active = false;
        };
    }, [category, debouncedFirstName, debouncedSecondName, enabled]);

    return { result, status, errorMessage };
}

export default function LeaderboardCenter() {
    const { categories, boards, status: catalogStatus, errorMessage: catalogError } = useCatalog();
    const [surfaceMode, setSurfaceMode] = useState<SurfaceMode>('ladder');
    const [category, setCategory] = useState<LeaderboardCategoryId>('cpu');
    const [selectedId, setSelectedId] = useState(OVERALL_BOARD_ID);
    const [searchTerm, setSearchTerm] = useState('');
    const [cpuFirstName, setCpuFirstName] = useState('');
    const [cpuSecondName, setCpuSecondName] = useState('');
    const [gpuFirstName, setGpuFirstName] = useState('');
    const [gpuSecondName, setGpuSecondName] = useState('');

    const categoryBoards = useMemo(
        () => boards.filter(board => board.category === category),
        [boards, category]
    );
    const isOverallSelected = selectedId === OVERALL_BOARD_ID;
    const selectedBoard = isOverallSelected ? undefined : findBoard(boards, selectedId) ?? categoryBoards[0] ?? boards[0];
    const selectedCategory = categories.find(item => item.id === category) ?? categories[0];
    const cpuMetricCount = useMemo(() => boards.filter(board => board.category === 'cpu').length, [boards]);
    const gpuMetricCount = useMemo(() => boards.filter(board => board.category === 'gpu').length, [boards]);
    const boardGroups = useMemo(() => {
        return categoryBoards.reduce<Record<string, LeaderboardDefinition[]>>((groups, board) => {
            groups[board.group] = groups[board.group] ? [...groups[board.group], board] : [board];
            return groups;
        }, {});
    }, [categoryBoards]);

    const isCompareMode = surfaceMode === 'compare';
    const singleBoardData = usePagedRows(selectedBoard, searchTerm);
    const compositeData = useCompositeRows(category, searchTerm, surfaceMode === 'ladder' && isOverallSelected);
    const ladderData = isOverallSelected ? compositeData : singleBoardData;
    const cpuCompare = useCategoryCompare('cpu', cpuFirstName, cpuSecondName, isCompareMode);
    const gpuCompare = useCategoryCompare('gpu', gpuFirstName, gpuSecondName, isCompareMode);

    const topScore = ladderData.topScore || 1;
    const featuredRows = ladderData.rows.slice(0, 3);
    const ActiveCategoryIcon = selectedCategory ? getCategoryIcon(selectedCategory.id) : Trophy;
    const activeBoardTitle = isOverallSelected
        ? `${selectedCategory?.label ?? '硬件'} 综合榜单`
        : selectedBoard?.title ?? '细分榜单';
    const activeMetricLabel = isOverallSelected
        ? category === 'gpu' ? '指标组归一分' : '归一化平均分'
        : selectedBoard?.metricLabel ?? '跑分';
    const overallSummaryLabel = category === 'gpu'
        ? `综合 4 个指标组 · ${categoryBoards.length} 个细分榜 · ${ladderData.total} 个型号`
        : `综合 ${categoryBoards.length} 个细分榜 · ${ladderData.total} 个型号`;
    const activeBoardGroup = isOverallSelected ? '综合榜单' : selectedBoard?.group ?? '';

    const handleCategoryChange = (nextCategory: LeaderboardCategoryId) => {
        setCategory(nextCategory);
        setSelectedId(OVERALL_BOARD_ID);
        setSearchTerm('');
    };

    const getCompareCandidate = (
        result: LeaderboardCategoryCompareResponse | null,
        side: CompareSide
    ) => side === 'first' ? result?.firstResolved ?? null : result?.secondResolved ?? null;

    const getCompareCandidates = (
        result: LeaderboardCategoryCompareResponse | null,
        side: CompareSide
    ) => side === 'first' ? result?.firstCandidates ?? [] : result?.secondCandidates ?? [];

    const renderCandidateButtons = (
        candidates: LeaderboardNameCandidate[],
        value: string,
        setValue: (value: string) => void
    ) => {
        const normalizedValue = normalizeCompareName(value);
        const isExact = candidates.some(candidate => normalizeCompareName(candidate.name) === normalizedValue);

        if (!normalizedValue || candidates.length === 0 || isExact) return null;

        return (
            <div className="mt-2 flex flex-wrap gap-1.5">
                {candidates.slice(0, 5).map(candidate => (
                    <button
                        key={candidate.name}
                        type="button"
                        onClick={() => setValue(candidate.name)}
                        className="max-w-full truncate rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:border-slate-400 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-white"
                    >
                        {candidate.name}
                    </button>
                ))}
            </div>
        );
    };

    const renderHardwareSummary = (
        candidate: LeaderboardNameCandidate | null,
        value: string,
        side: CompareSide,
        status: LoadStatus,
        overallWinner: CompareWinnerSide,
        winCount: number,
        totalMetrics: number,
        leadCount: number,
        hasCandidates: boolean
    ) => {
        const theme = SIDE_THEMES[side];
        const isWinner = totalMetrics > 0 && overallWinner === side;
        const statusText = totalMetrics === 0
            ? '已匹配'
            : isWinner
                ? `胜出 ${winCount} 项`
                : overallWinner === 'tie'
                    ? '势均力敌'
                    : `落后 ${leadCount} 项`;

        if (!value.trim()) {
            return (
                <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm font-bold text-slate-400 dark:border-slate-700">
                    等待型号
                </div>
            );
        }

        if (status === 'loading' && !candidate) {
            return (
                <div className="flex min-h-[132px] items-center gap-2 rounded-lg border border-dashed border-slate-200 p-4 text-sm font-bold text-slate-400 dark:border-slate-700">
                    <RefreshCw size={16} className="animate-spin" />
                    正在匹配
                </div>
            );
        }

        if (status === 'idle' && !candidate) {
            return (
                <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm font-bold text-slate-400 dark:border-slate-700">
                    继续输入型号
                </div>
            );
        }

        if (!candidate && hasCandidates) {
            return (
                <div className="rounded-lg border border-dashed border-indigo-200 bg-indigo-50/40 p-4 text-sm font-bold text-indigo-500 dark:border-indigo-400/20 dark:bg-indigo-400/10 dark:text-indigo-300">
                    选择一个候选型号
                </div>
            );
        }

        if (!candidate) {
            return (
                <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm font-bold text-slate-400 dark:border-slate-700">
                    未找到型号
                </div>
            );
        }

        return (
            <article className={`rounded-lg border bg-white p-4 shadow-sm dark:bg-slate-900 ${
                isWinner
                    ? 'border-amber-300 bg-amber-50/60 dark:border-amber-300/40 dark:bg-amber-300/10'
                    : 'border-slate-200 dark:border-slate-800'
            }`}>
                <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-black ${
                            side === 'first'
                                ? 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-300/30 dark:bg-indigo-400/10 dark:text-indigo-200'
                                : 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-300/30 dark:bg-orange-400/10 dark:text-orange-200'
                        }`}>
                            <span className={`h-2 w-2 rounded-full ${theme.dot}`} />
                            {theme.camp} {theme.short}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-black ${
                            isWinner
                                ? 'border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-300/40 dark:bg-amber-300/15 dark:text-amber-200'
                                : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400'
                        }`}>
                            {isWinner && <Trophy size={12} />}
                            {statusText}
                        </span>
                    </div>
                    <h3 className="text-base font-black leading-snug text-slate-950 dark:text-white md:text-lg">{candidate.name}</h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs font-black">
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                            {candidate.boardCount} 项数据
                        </span>
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                            最高 #{candidate.bestRank}
                        </span>
                    </div>
                    {candidate.specs.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {candidate.specs.slice(0, 4).map(spec => (
                                <span key={spec} className="max-w-full truncate rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                                    {spec}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </article>
        );
    };

    const renderMetricRow = (metric: LeaderboardCompareMetric, firstLabel = '方案 A', secondLabel = '方案 B') => {
        const winner = getWinnerInfo(metric);
        const badgeClass = winner?.side === 'first'
            ? 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-300/40 dark:bg-indigo-300/15 dark:text-indigo-100'
            : winner?.side === 'second'
                ? 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-300/40 dark:bg-orange-300/15 dark:text-orange-100'
                : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400';
        const winnerTheme = winner?.side === 'first' || winner?.side === 'second' ? SIDE_THEMES[winner.side] : null;
        const winnerText = winner
            ? winner.side === 'tie'
                ? '持平'
                : `${winner.side === 'first' ? 'A' : 'B'} 胜 ${formatSignedPercent(winner.percent)}`
            : '共同数据不足';

        const renderMetricValue = (
            row: LeaderboardRow | null | undefined,
            side: CompareSide,
            label: string,
            isWinner: boolean
        ) => {
            const theme = SIDE_THEMES[side];
            const unit = row?.unit ? ` ${row.unit}` : '';

            return (
                <div className={`grid grid-cols-[minmax(0,1.25fr)_auto_auto] items-center gap-3 rounded-md border px-3 py-2.5 ${
                    isWinner
                        ? 'border-amber-200 bg-amber-50/70 dark:border-amber-300/30 dark:bg-amber-300/10'
                        : 'border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950/40'
                }`}>
                    <div className="flex min-w-0 items-center gap-2">
                        <span className={`inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded border text-xs font-black ${side === 'first' ? 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-300/30 dark:bg-indigo-400/10 dark:text-indigo-200' : 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-300/30 dark:bg-orange-400/10 dark:text-orange-200'}`}>
                            {theme.short}
                        </span>
                        <span className={`truncate text-sm font-black ${isWinner ? 'text-slate-950 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                            {label}
                        </span>
                    </div>
                    <div className="whitespace-nowrap text-xs font-bold text-slate-400">
                        {row ? `#${row.rank}` : '无数据'}
                    </div>
                    <div className={`text-right text-sm font-black ${isWinner ? 'text-slate-950 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                        {row ? formatNumber(row.score) : '-'}
                        {row && <span className="ml-1 text-[11px] font-bold text-slate-400">{unit}</span>}
                    </div>
                </div>
            );
        };

        return (
            <article key={metric.board.id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-4">
                <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <div className="text-sm font-black leading-snug text-slate-950 dark:text-white">{metric.board.title}</div>
                        <div className="mt-1 text-xs font-bold text-slate-400">{metric.board.group}</div>
                    </div>
                    <div className={`inline-flex w-fit shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-black ${badgeClass}`}>
                        {winnerTheme && <span className={`h-2 w-2 rounded-full ${winnerTheme.dot}`} />}
                        {winnerText}
                    </div>
                </div>
                <div className="grid gap-2.5">
                    {renderMetricValue(metric.first, 'first', firstLabel, winner?.side === 'first')}
                    {renderMetricValue(metric.second, 'second', secondLabel, winner?.side === 'second')}
                </div>
            </article>
        );
    };

    const renderCapabilityRadar = (
        kind: CompareKind,
        metrics: LeaderboardCompareMetric[],
        firstLabel = '方案 A',
        secondLabel = '方案 B'
    ) => {
        const axes = buildRadarAxes(kind, metrics);
        if (axes.length < 3) {
            return (
                <section className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5 text-sm font-bold text-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-500">
                    雷达图需要至少 3 个共同维度；当前共同跑分或规格不足。
                </section>
            );
        }

        const firstAverage = average(axes.map(axis => axis.first));
        const secondAverage = average(axes.map(axis => axis.second));
        const summaryWinner: CompareWinnerSide = firstAverage === secondAverage
            ? 'tie'
            : firstAverage > secondAverage
                ? 'first'
                : 'second';
        const firstPoints = getRadarPolygon(axes.map(axis => axis.first));
        const secondPoints = getRadarPolygon(axes.map(axis => axis.second));
        const gridLevels = [25, 50, 75, 100];
        const labelAnchor = (x: number) => x < 142 ? 'end' : x > 178 ? 'start' : 'middle';

        const renderAxisBar = (axis: RadarAxis) => {
            const axisWinner: CompareWinnerSide = axis.first === axis.second ? 'tie' : axis.first > axis.second ? 'first' : 'second';
            return (
                <div key={axis.label} className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/30">
                    <div className="mb-2 flex items-start justify-between gap-2">
                        <div>
                            <div className="text-sm font-black text-slate-950 dark:text-white">{axis.label}</div>
                            <div className="mt-0.5 text-[11px] font-bold text-slate-400">{axis.sourceLabel}</div>
                        </div>
                        <div className={`shrink-0 text-right text-xs font-black ${
                            axisWinner === 'first'
                                ? 'text-indigo-600 dark:text-indigo-200'
                                : axisWinner === 'second'
                                    ? 'text-orange-600 dark:text-orange-200'
                                    : 'text-slate-400'
                        }`}>
                            {axis.metricCount} 项 · {axisWinner === 'tie' ? '持平' : axisWinner === 'first' ? 'A 更强' : 'B 更强'}
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <div className="grid grid-cols-[24px_minmax(0,1fr)_80px] items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-200">
                            <span>A</span>
                            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                                <div className={`h-full rounded-full bg-indigo-500 ${axisWinner === 'first' ? '' : 'opacity-60'}`} style={{ width: `${clamp(axis.first, 4, 100)}%` }} />
                            </div>
                            <span className="truncate text-right">
                                {formatNumber(axis.first)}
                                {axis.firstRaw && <span className="block truncate text-[10px] text-slate-400">{axis.firstRaw}</span>}
                            </span>
                        </div>
                        <div className="grid grid-cols-[24px_minmax(0,1fr)_80px] items-center gap-2 text-xs font-bold text-orange-600 dark:text-orange-200">
                            <span>B</span>
                            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                                <div className={`h-full rounded-full bg-orange-400 ${axisWinner === 'second' ? '' : 'opacity-60'}`} style={{ width: `${clamp(axis.second, 4, 100)}%` }} />
                            </div>
                            <span className="truncate text-right">
                                {formatNumber(axis.second)}
                                {axis.secondRaw && <span className="block truncate text-[10px] text-slate-400">{axis.secondRaw}</span>}
                            </span>
                        </div>
                    </div>
                </div>
            );
        };

        return (
            <section className="mt-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h3 className="text-sm font-black text-slate-950 dark:text-white">综合能力雷达图</h3>
                        <div className="mt-1 text-xs font-bold text-slate-400">每个顶点就是一个维度；数值越靠外越强</div>
                    </div>
                    <div className={`rounded-md border px-2.5 py-1 text-xs font-black ${
                        summaryWinner === 'first'
                            ? 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-300/30 dark:bg-indigo-400/10 dark:text-indigo-200'
                            : summaryWinner === 'second'
                                ? 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-300/30 dark:bg-orange-400/10 dark:text-orange-200'
                                : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400'
                    }`}>
                        {summaryWinner === 'tie' ? '综合持平' : `${summaryWinner === 'first' ? 'A' : 'B'} 综合领先`}
                    </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(320px,0.95fr)_minmax(0,1.35fr)]">
                    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                        <div className="flex flex-wrap gap-3 text-xs font-black">
                            <span className="inline-flex min-w-0 items-center gap-1.5 text-indigo-600 dark:text-indigo-200">
                                <span className="h-2 w-4 rounded-full bg-indigo-500" />
                                <span className="truncate">A {formatNumber(firstAverage)} · {firstLabel}</span>
                            </span>
                            <span className="inline-flex min-w-0 items-center gap-1.5 text-orange-600 dark:text-orange-200">
                                <span className="h-2 w-4 rounded-full bg-orange-400" />
                                <span className="truncate">B {formatNumber(secondAverage)} · {secondLabel}</span>
                            </span>
                        </div>
                        <svg viewBox="0 0 320 320" className="mx-auto mt-2 h-[320px] w-full max-w-[380px]" role="img" aria-label="综合能力雷达图">
                            {gridLevels.map(level => (
                                <polygon
                                    key={level}
                                    points={getRadarPolygon(axes.map(() => level))}
                                    fill="none"
                                    stroke="rgba(148, 163, 184, 0.26)"
                                    strokeWidth="1"
                                />
                            ))}
                            {axes.map((axis, index) => {
                                const end = getRadarPoint(index, axes.length, 100);
                                return (
                                    <line key={`${axis.label}-line`} x1="160" y1="160" x2={end.x} y2={end.y} stroke="rgba(148, 163, 184, 0.22)" />
                                );
                            })}
                            <polygon points={firstPoints} fill="rgba(99, 102, 241, 0.18)" stroke="#6366f1" strokeWidth="2.6" />
                            <polygon points={secondPoints} fill="rgba(249, 115, 22, 0.16)" stroke="#f97316" strokeWidth="2.6" />
                            {axes.map((axis, index) => {
                                const first = getRadarPoint(index, axes.length, axis.first);
                                const second = getRadarPoint(index, axes.length, axis.second);
                                const label = getRadarPoint(index, axes.length, 100, 124);
                                return (
                                    <g key={axis.label}>
                                        <circle cx={first.x} cy={first.y} r="3.6" fill="#6366f1" />
                                        <circle cx={second.x} cy={second.y} r="3.6" fill="#f97316" />
                                        <text
                                            x={label.x}
                                            y={label.y}
                                            textAnchor={labelAnchor(label.x)}
                                            dominantBaseline="middle"
                                            className="fill-slate-700 dark:fill-slate-200"
                                            style={{ fontSize: 12, fontWeight: 800 }}
                                        >
                                            {axis.label}
                                        </text>
                                    </g>
                                );
                            })}
                        </svg>
                    </div>

                    <div className="grid content-start gap-3 xl:grid-cols-2">
                        {axes.map(renderAxisBar)}
                    </div>
                </div>
            </section>
        );
    };

    const renderPowerOverview = (
        kind: CompareKind,
        metrics: LeaderboardCompareMetric[],
        firstLabel = '方案 A',
        secondLabel = '方案 B'
    ) => {
        const firstPower = findPowerInfo(metrics, 'first');
        const secondPower = findPowerInfo(metrics, 'second');
        const firstWatts = firstPower.watts;
        const secondWatts = secondPower.watts;
        const hasFirstPower = firstWatts !== null;
        const hasSecondPower = secondWatts !== null;
        const hasBothPower = hasFirstPower && hasSecondPower;
        const maxWatts = Math.max(firstWatts ?? 0, secondWatts ?? 0, 1);
        const powerWinner: CompareWinnerSide | null = hasBothPower
            ? firstWatts === secondWatts
                ? 'tie'
                : firstWatts < secondWatts
                    ? 'first'
                    : 'second'
            : null;
        const powerGap = hasBothPower ? Math.abs(firstWatts - secondWatts) : 0;
        const powerGapPercent = hasBothPower ? (powerGap / Math.max(firstWatts, secondWatts)) * 100 : 0;
        const performance = buildRelativePerformance(metrics);
        const firstEfficiency = hasFirstPower && firstWatts > 0 ? performance.first / firstWatts : null;
        const secondEfficiency = hasSecondPower && secondWatts > 0 ? performance.second / secondWatts : null;
        const efficiencyWinner: CompareWinnerSide | null = firstEfficiency !== null && secondEfficiency !== null
            ? firstEfficiency === secondEfficiency
                ? 'tie'
                : firstEfficiency > secondEfficiency
                    ? 'first'
                    : 'second'
            : null;
        const summaryText = hasBothPower
            ? powerWinner === 'tie'
                ? '功耗相同'
                : `${powerWinner === 'first' ? 'A' : 'B'} 少 ${formatNumber(powerGap)}W`
            : '暂无功耗结论';
        const summaryMeta = hasBothPower
            ? powerWinner === 'tie'
                ? '两边标称功耗一致'
                : `低 ${powerGapPercent.toFixed(1)}%`
            : `${kind === 'cpu' ? 'CPU' : 'GPU'} 本地数据没有功耗/TDP/TGP 字段`;

        const renderPowerRow = (side: CompareSide, label: string, power: PowerInfo, isWinner: boolean) => {
            const theme = SIDE_THEMES[side];
            const watts = power.watts;
            const width = watts ? clamp((watts / maxWatts) * 100, 4, 100) : 0;

            return (
                <div className={`rounded-lg border p-3 ${
                    isWinner
                        ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-300/30 dark:bg-emerald-300/10'
                        : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/30'
                }`}>
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <div className={`inline-flex items-center gap-1.5 text-xs font-black ${theme.text}`}>
                                <span className={`h-2 w-2 rounded-full ${theme.dot}`} />
                                {theme.camp} {theme.short}
                            </div>
                            <div className="mt-1 truncate text-sm font-black text-slate-950 dark:text-white">{label}</div>
                            <div className="mt-1 text-xs font-bold text-slate-400">{power.source}</div>
                        </div>
                        <div className="shrink-0 text-right">
                            <div className={`text-2xl font-black leading-none ${watts ? 'text-slate-950 dark:text-white' : 'text-slate-300 dark:text-slate-600'}`}>
                                {watts ? `${formatNumber(watts)}W` : '--'}
                            </div>
                            <div className={`mt-1 text-xs font-black ${isWinner ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-400'}`}>
                                {watts ? (isWinner ? '更省电' : '标称功耗') : '缺数据'}
                            </div>
                        </div>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                        {watts && (
                            <div
                                className={`h-full rounded-full ${side === 'first' ? 'bg-indigo-500' : 'bg-orange-400'} ${isWinner ? '' : 'opacity-55'}`}
                                style={{ width: `${width}%` }}
                            />
                        )}
                    </div>
                    <div className="mt-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                        {power.raw ?? '本地未提供功耗数值'}
                    </div>
                </div>
            );
        };

        return (
            <section className="mt-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h3 className="text-sm font-black text-slate-950 dark:text-white">功耗对比</h3>
                        <div className="mt-1 text-xs font-bold text-slate-400">读取本地功耗 / TDP / TGP / TBP 字段，越低越省电</div>
                    </div>
                    <div className={`rounded-md border px-2.5 py-1 text-xs font-black ${
                        hasBothPower
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-300/30 dark:bg-emerald-300/10 dark:text-emerald-300'
                            : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400'
                    }`}>
                        {summaryText}
                    </div>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.75fr)]">
                    <div className="grid gap-3 md:grid-cols-2">
                        {renderPowerRow('first', firstLabel, firstPower, powerWinner === 'first')}
                        {renderPowerRow('second', secondLabel, secondPower, powerWinner === 'second')}
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                        <div className="text-xs font-black text-slate-500 dark:text-slate-400">结论</div>
                        <div className="mt-1 text-lg font-black text-slate-950 dark:text-white">{summaryMeta}</div>
                        <div className="mt-3 grid gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                            <div className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2 dark:bg-slate-900">
                                <span>共同跑分</span>
                                <span>{performance.metricCount} 项</span>
                            </div>
                            <div className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2 dark:bg-slate-900">
                                <span>相对性能/W</span>
                                <span className="text-right">
                                    {firstEfficiency !== null && secondEfficiency !== null
                                        ? `${efficiencyWinner === 'first' ? 'A' : efficiencyWinner === 'second' ? 'B' : '持平'} 更高`
                                        : '缺功耗数据'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        );
    };

    const renderComparePanel = (
        kind: CompareKind,
        title: string,
        metricCount: number,
        firstName: string,
        setFirstName: (value: string) => void,
        secondName: string,
        setSecondName: (value: string) => void,
        compareState: ReturnType<typeof useCategoryCompare>
    ) => {
        const Icon = kind === 'cpu' ? Cpu : Gamepad2;
        const firstInputId = `${kind}-first-name`;
        const secondInputId = `${kind}-second-name`;
        const result = compareState.result;
        const metrics = result?.metrics ?? [];
        const firstResolvedCandidate = getCompareCandidate(result, 'first');
        const secondResolvedCandidate = getCompareCandidate(result, 'second');
        const firstCandidates = getCompareCandidates(result, 'first');
        const secondCandidates = getCompareCandidates(result, 'second');
        const firstSelected = isCandidateSelected(firstName, firstResolvedCandidate);
        const secondSelected = isCandidateSelected(secondName, secondResolvedCandidate);
        const firstCandidate = firstSelected ? firstResolvedCandidate : null;
        const secondCandidate = secondSelected ? secondResolvedCandidate : null;
        const bothSelected = firstSelected && secondSelected;
        const comparableMetrics = bothSelected ? metrics.filter(metric => metric.first && metric.second) : [];
        const firstWins = comparableMetrics.filter(metric => (metric.delta?.gap ?? 0) > 0).length;
        const secondWins = comparableMetrics.filter(metric => (metric.delta?.gap ?? 0) < 0).length;
        const tieCount = comparableMetrics.filter(metric => metric.delta && metric.delta.gap === 0).length;
        const overallWinner: CompareWinnerSide = comparableMetrics.length === 0 || firstWins === secondWins
            ? 'tie'
            : firstWins > secondWins
                ? 'first'
                : 'second';
        const leadCount = Math.abs(firstWins - secondWins);
        const renderScoreCard = (side: CompareSide, wins: number) => {
            const theme = SIDE_THEMES[side];
            const isWinner = comparableMetrics.length > 0 && overallWinner === side;
            const scoreLabel = comparableMetrics.length === 0
                ? '待对比'
                : isWinner
                    ? '当前胜方'
                    : overallWinner === 'tie'
                        ? '持平'
                        : '暂时落后';

            return (
                <div className={`rounded-lg border px-3 py-2.5 ${
                    isWinner
                        ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-300/40 dark:bg-amber-300/10 dark:text-amber-200'
                        : 'border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'
                }`}>
                    <div className="flex items-center justify-between gap-2">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-black ${theme.text}`}>
                            <span className={`h-2 w-2 rounded-full ${theme.dot}`} />
                            {theme.camp} {theme.short}
                        </span>
                        <span className="text-[11px] font-black">{scoreLabel}</span>
                    </div>
                    <div className="mt-1 flex items-end gap-1">
                        <span className="text-2xl font-black leading-none">{wins}</span>
                        <span className="pb-0.5 text-xs font-bold text-slate-400">项胜出</span>
                    </div>
                </div>
            );
        };
        const renderSelectionStatus = (
            side: CompareSide,
            value: string,
            candidate: LeaderboardNameCandidate | null,
            candidates: LeaderboardNameCandidate[]
        ) => {
            const theme = SIDE_THEMES[side];
            const trimmed = value.trim();
            const hasCandidates = candidates.length > 0;
            const isSearching = compareState.status === 'loading' && trimmed.length >= COMPARE_MIN_QUERY_LENGTH && !candidate;
            const statusText = !trimmed
                ? '等待型号'
                : candidate
                    ? '已选定'
                    : isSearching
                        ? '正在匹配'
                        : hasCandidates
                            ? '请选择候选'
                            : trimmed.length < COMPARE_MIN_QUERY_LENGTH
                                ? '继续输入'
                                : '未匹配完整型号';

            return (
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950/40">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                            <span className={`inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded border text-xs font-black ${
                                side === 'first'
                                    ? 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-300/30 dark:bg-indigo-400/10 dark:text-indigo-200'
                                    : 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-300/30 dark:bg-orange-400/10 dark:text-orange-200'
                            }`}>
                                {theme.short}
                            </span>
                            <span className="truncate text-sm font-black text-slate-700 dark:text-slate-200">
                                {candidate?.name || trimmed || '未选择'}
                            </span>
                        </div>
                        <span className={`shrink-0 rounded-md px-2 py-1 text-xs font-black ${
                            candidate
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300'
                                : 'bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-400'
                        }`}>
                            {statusText}
                        </span>
                    </div>
                </div>
            );
        };
        const renderScoreboard = () => {
            if (!bothSelected || comparableMetrics.length === 0) {
                return (
                    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950 sm:min-w-[360px]">
                        <div className="text-sm font-black text-slate-700 dark:text-slate-200">
                            {bothSelected ? '共同指标不足' : '未开始对比'}
                        </div>
                        <div className="mt-1 text-xs font-bold text-slate-400">
                            {bothSelected ? '这两款硬件暂无足够共同榜单' : 'A/B 型号未完整选定'}
                        </div>
                    </div>
                );
            }

            return (
                <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:min-w-[440px] sm:grid-cols-[minmax(0,1fr)_82px_minmax(0,1fr)]">
                    {renderScoreCard('first', firstWins)}
                    <div className="flex min-h-[74px] flex-col items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-center dark:border-slate-800 dark:bg-slate-900">
                        <Gauge size={18} className={overallWinner === 'tie' ? 'text-slate-400' : 'text-amber-500'} />
                        <div className="mt-1 text-sm font-black text-slate-950 dark:text-white">{`${firstWins}:${secondWins}`}</div>
                        <div className="mt-0.5 text-[11px] font-bold text-slate-400">
                            {overallWinner === 'tie' ? `${tieCount} 项持平` : `领先 ${leadCount} 项`}
                        </div>
                    </div>
                    {renderScoreCard('second', secondWins)}
                </div>
            );
        };

        return (
            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                                <Icon size={20} />
                            </span>
                            <div>
                                <h2 className="text-lg font-black text-slate-950 dark:text-white">{title}</h2>
                                <div className="text-xs font-bold text-slate-500 dark:text-slate-400">{metricCount} 个指标</div>
                            </div>
                        </div>
                    </div>

                    {renderScoreboard()}
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_96px_minmax(0,1fr)] md:items-stretch">
                    <div className="block">
                        <label htmlFor={firstInputId} className="mb-1.5 block text-xs font-bold text-slate-500 dark:text-slate-400">型号 A</label>
                        <input
                            id={firstInputId}
                            value={firstName}
                            onChange={event => setFirstName(event.target.value)}
                            placeholder={kind === 'cpu' ? '例如 Intel Core i5 12600K' : '例如 RTX 4090'}
                            className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                        />
                        {renderCandidateButtons(firstCandidates, firstName, setFirstName)}
                    </div>
                    <div className="flex items-center justify-center py-1 md:items-end md:pb-0 md:pt-6">
                        <div className={`relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 bg-white text-slate-950 shadow-[0_10px_28px_rgba(15,23,42,0.12)] dark:bg-slate-950 dark:text-white ${
                            comparableMetrics.length > 0
                                ? overallWinner === 'first'
                                    ? 'border-indigo-300 ring-4 ring-indigo-100 dark:border-indigo-300/50 dark:ring-indigo-400/10'
                                    : overallWinner === 'second'
                                        ? 'border-orange-300 ring-4 ring-orange-100 dark:border-orange-300/50 dark:ring-orange-400/10'
                                        : 'border-slate-300 ring-4 ring-slate-100 dark:border-slate-700 dark:ring-slate-800'
                                : 'border-slate-200 ring-4 ring-slate-100 dark:border-slate-700 dark:ring-slate-800'
                        }`}>
                            <span className="absolute left-2 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-indigo-500" />
                            <span className="text-xl font-black leading-none">VS</span>
                            <span className="absolute right-2 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-orange-400" />
                        </div>
                    </div>
                    <div className="block">
                        <label htmlFor={secondInputId} className="mb-1.5 block text-xs font-bold text-slate-500 dark:text-slate-400 md:text-right">型号 B</label>
                        <input
                            id={secondInputId}
                            value={secondName}
                            onChange={event => setSecondName(event.target.value)}
                            placeholder={kind === 'cpu' ? '例如 Intel Core i7 12700K' : '例如 RTX 4080'}
                            className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 outline-none focus:border-orange-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                        />
                        {renderCandidateButtons(secondCandidates, secondName, setSecondName)}
                    </div>
                </div>

                {compareState.status === 'error' && (
                    <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                        {compareState.errorMessage}
                    </div>
                )}

                {bothSelected ? (
                    <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                        {renderHardwareSummary(firstCandidate, firstName, 'first', compareState.status, overallWinner, firstWins, comparableMetrics.length, leadCount, firstCandidates.length > 0)}
                        {renderHardwareSummary(secondCandidate, secondName, 'second', compareState.status, overallWinner, secondWins, comparableMetrics.length, leadCount, secondCandidates.length > 0)}
                    </div>
                ) : (
                    <div className="mt-4 grid gap-2 md:grid-cols-2">
                        {renderSelectionStatus('first', firstName, firstCandidate, firstCandidates)}
                        {renderSelectionStatus('second', secondName, secondCandidate, secondCandidates)}
                    </div>
                )}

                {comparableMetrics.length > 0 && renderCapabilityRadar(kind, comparableMetrics, firstCandidate?.name, secondCandidate?.name)}
                {comparableMetrics.length > 0 && renderPowerOverview(kind, comparableMetrics, firstCandidate?.name, secondCandidate?.name)}

                {comparableMetrics.length > 0 ? (
                    <section className="mt-4 rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40 md:p-4">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <h3 className="text-sm font-black text-slate-950 dark:text-white">逐项跑分对比</h3>
                                <div className="mt-0.5 text-xs font-bold text-slate-400">
                                    {comparableMetrics.length} 项共同指标 · A 胜 {firstWins} 项 · B 胜 {secondWins} 项
                                </div>
                            </div>
                        </div>
                        <div className="grid gap-3 xl:grid-cols-2">
                            {comparableMetrics.map(metric => renderMetricRow(metric, firstCandidate?.name, secondCandidate?.name))}
                        </div>
                    </section>
                ) : bothSelected ? (
                    <div className="mt-4 rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm font-bold text-slate-400 dark:border-slate-700">
                        {compareState.status === 'loading'
                            ? '正在加载'
                            : '共同指标不足'}
                    </div>
                ) : null}
            </section>
        );
    };

    if (catalogStatus === 'loading' || catalogStatus === 'idle') {
        return (
            <div className="flex min-h-full items-center justify-center bg-slate-50 text-slate-500 dark:bg-[#090B0F]">
                <RefreshCw size={24} className="mr-2 animate-spin text-cyan-500" />
                <span className="text-sm font-bold">正在加载天梯目录</span>
            </div>
        );
    }

    if (catalogStatus === 'error') {
        return (
            <div className="flex min-h-full items-center justify-center bg-slate-50 p-6 text-center dark:bg-[#090B0F]">
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                    <AlertTriangle size={28} className="mx-auto" />
                    <div className="mt-3 text-base font-black">天梯目录加载失败</div>
                    <div className="mt-1 text-sm">{catalogError}</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-full bg-slate-50 px-3 py-4 text-slate-900 dark:bg-[#090B0F] dark:text-slate-100 md:px-5 md:py-6">
            <div className="mx-auto flex max-w-7xl flex-col gap-4">
                <section className="overflow-hidden rounded-lg border border-slate-900/10 bg-[#080B10] text-white shadow-[0_18px_60px_rgba(15,23,42,0.18)] dark:border-white/10">
                    <div className="pointer-events-none h-1 bg-[linear-gradient(90deg,#22d3ee,#a3e635,#facc15,#fb7185)]" />
                    <div className="grid gap-3 p-3 [background-image:linear-gradient(rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.055)_1px,transparent_1px)] [background-size:34px_34px] md:grid-cols-[minmax(0,1fr)_360px] md:items-center md:gap-4 md:p-4">
                        <div className="min-w-0">
                            {!isCompareMode && (
                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/10 px-2.5 py-1 text-xs font-black text-cyan-200">
                                        <Trophy size={14} />
                                        综合优先
                                    </div>
                                    <div className="rounded-md border border-white/10 bg-black/20 px-2.5 py-1 text-xs font-bold text-slate-400">
                                        细分榜单下钻
                                    </div>
                                </div>
                            )}
                            <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-2">
                                <h1 className="text-2xl font-black tracking-tight md:text-3xl">
                                    {isCompareMode ? '硬件对比' : '硬件天梯图'}
                                </h1>
                                {!isCompareMode && (
                                    <div className="flex flex-wrap gap-2 pb-0.5 text-xs font-black">
                                        <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.06] px-2.5 py-1 text-white">
                                            <ActiveCategoryIcon size={14} className="text-cyan-400" />
                                            {selectedCategory?.label ?? '-'}
                                        </span>
                                        <span className="rounded-md border border-white/10 bg-white/[0.06] px-2.5 py-1 text-slate-300">
                                            {categoryBoards.length} 个细分榜
                                        </span>
                                        <span className="rounded-md border border-white/10 bg-white/[0.06] px-2.5 py-1 text-slate-300">
                                            {ladderData.total || selectedBoard?.rows || 0} 个型号
                                        </span>
                                    </div>
                                )}
                            </div>
                            <p className="mt-2 hidden max-w-3xl text-sm font-bold leading-6 text-slate-400 sm:block">
                                {isCompareMode
                                    ? '输入 CPU 或 GPU 型号，自动汇总共同指标并给出逐项胜负。'
                                    : '先看当前分类的综合排名，再进入 Cinebench、Geekbench、游戏帧率等细分榜单。'}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 rounded-lg border border-white/10 bg-white/[0.07] p-1.5">
                            {[
                                { id: 'ladder' as SurfaceMode, label: '天梯图', icon: Trophy },
                                { id: 'compare' as SurfaceMode, label: '双硬件对比', icon: ArrowRightLeft }
                            ].map(item => {
                                const Icon = item.icon;
                                const active = surfaceMode === item.id;

                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => setSurfaceMode(item.id)}
                                        className={`flex h-10 items-center justify-center gap-2 rounded-md text-sm font-black transition-colors md:h-11 ${
                                            active
                                                ? 'bg-white text-slate-950 shadow-sm'
                                                : 'text-slate-400 hover:bg-white/10 hover:text-white'
                                        }`}
                                    >
                                        <Icon size={16} />
                                        {item.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {surfaceMode === 'ladder' && categoryBoards.length > 0 && (
                    <>
                        <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {categories.map(item => {
                                const Icon = getCategoryIcon(item.id);
                                const isActive = item.id === category;
                                const count = boards.filter(board => board.category === item.id).length;

                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => handleCategoryChange(item.id)}
                                        title={item.description}
                                        className={`flex min-h-[58px] items-center gap-2.5 rounded-lg border p-2.5 text-left transition-all md:min-h-[68px] md:gap-3 md:p-3 ${
                                            isActive
                                                ? 'border-slate-950 bg-slate-950 text-white shadow-sm dark:border-cyan-400/40 dark:bg-slate-900 dark:ring-2 dark:ring-cyan-400/15'
                                                : 'border-slate-200 bg-white/75 hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-900/75 dark:hover:border-slate-700'
                                        }`}
                                    >
                                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg md:h-10 md:w-10 ${
                                            isActive
                                                ? 'bg-cyan-400 text-slate-950'
                                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'
                                        }`}>
                                            <Icon size={18} />
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block truncate text-sm font-black">{item.label}</span>
                                            <span className={`mt-1 block text-xs ${isActive ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'}`}>{count} 个榜单</span>
                                        </span>
                                    </button>
                                );
                            })}
                        </section>

                        <section className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:hidden">
                            <label className="block">
                                <span className="mb-1.5 block text-xs font-black text-slate-500 dark:text-slate-400">先综合，再选择细分榜单</span>
                                <div className="relative">
                                    <select
                                        value={selectedId}
                                        onChange={event => {
                                            setSelectedId(event.target.value);
                                            setSearchTerm('');
                                        }}
                                        className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-3 pr-9 text-sm font-black text-slate-800 outline-none focus:border-cyan-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                                    >
                                        <option value={OVERALL_BOARD_ID}>{selectedCategory?.label ?? '硬件'} 综合榜单</option>
                                        {Object.entries(boardGroups).map(([group, groupBoards]) => (
                                            <optgroup key={group} label={group}>
                                                {groupBoards.map(board => (
                                                    <option key={board.id} value={board.id}>{board.title}</option>
                                                ))}
                                            </optgroup>
                                        ))}
                                    </select>
                                    <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                </div>
                            </label>
                        </section>

                        <div className="grid gap-4 lg:grid-cols-[310px_minmax(0,1fr)]">
                            <aside className="hidden rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:sticky lg:top-20 lg:block lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto">
                                <div className="mb-3">
                                    <div className="text-sm font-black">{selectedCategory?.label ?? ''} 天梯</div>
                                    <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">先看综合榜，再进入细分项目。</div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <div className="mb-2 px-1 text-xs font-bold text-slate-400 dark:text-slate-500">综合榜单</div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedId(OVERALL_BOARD_ID);
                                                setSearchTerm('');
                                            }}
                                            className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-3 text-left transition-colors ${
                                                isOverallSelected
                                                    ? 'border-slate-950 bg-slate-950 text-white shadow-sm dark:border-cyan-400/30 dark:bg-cyan-400/10 dark:text-cyan-200'
                                                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800'
                                            }`}
                                        >
                                            <span className="min-w-0">
                                                <span className="block truncate text-sm font-black">{selectedCategory?.label ?? '硬件'} 综合榜单</span>
                                                <span className={`mt-0.5 block text-xs ${isOverallSelected ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                                    {category === 'gpu' ? `按 4 个指标组综合` : `平均 ${categoryBoards.length} 个细分榜`}
                                                </span>
                                            </span>
                                            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isOverallSelected ? 'bg-cyan-400 text-slate-950' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'}`}>
                                                <Gauge size={16} />
                                            </span>
                                        </button>
                                    </div>
                                    {Object.entries(boardGroups).map(([group, groupBoards]) => (
                                        <div key={group}>
                                            <div className="mb-2 px-1 text-xs font-bold text-slate-400 dark:text-slate-500">{group}</div>
                                            <div className="grid gap-2">
                                                {groupBoards.map(board => {
                                                    const isActive = board.id === selectedId;
                                                    return (
                                                        <button
                                                            key={board.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedId(board.id);
                                                                setSearchTerm('');
                                                            }}
                                                            className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                                                                isActive
                                                                    ? 'border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-400/30 dark:bg-cyan-400/10 dark:text-cyan-200'
                                                                    : 'border-transparent bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800'
                                                            }`}
                                                        >
                                                            <span className="min-w-0">
                                                                <span className="block truncate text-sm font-bold">{board.shortTitle}</span>
                                                                <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{board.rows} 条</span>
                                                            </span>
                                                            <span className={`h-2 w-2 shrink-0 rounded-full ${isActive ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </aside>

                            <main className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                                <div className="border-b border-slate-200 p-4 dark:border-slate-800 md:p-5">
                                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h2 className="text-xl font-black text-slate-950 dark:text-white md:text-2xl">{activeBoardTitle}</h2>
                                                <span className={`rounded-md px-2 py-1 text-xs font-bold ${
                                                    isOverallSelected
                                                        ? 'bg-slate-950 text-cyan-200 dark:bg-cyan-400/10 dark:text-cyan-200'
                                                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                                }`}>
                                                    {activeMetricLabel}
                                                </span>
                                                {activeBoardGroup && (
                                                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                                                        {activeBoardGroup}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                                {isOverallSelected
                                                    ? overallSummaryLabel
                                                    : `${ladderData.total || selectedBoard?.rows || 0} 条记录`}
                                            </div>
                                        </div>

                                        <label className="relative block w-full xl:w-[320px]">
                                            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                value={searchTerm}
                                                onChange={event => setSearchTerm(event.target.value)}
                                                placeholder="搜索型号、规格或分数"
                                                className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm font-medium outline-none transition-colors placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-cyan-500"
                                            />
                                        </label>
                                    </div>

                                    {featuredRows.length > 0 && (
                                        <div className="mt-4 grid gap-2 md:grid-cols-3">
                                            {featuredRows.map(row => {
                                                const unit = row.unit ? ` ${row.unit}` : '';
                                                return (
                                                    <article key={`featured-${row.rank}-${row.name}`} className="flex min-w-0 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/60">
                                                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-xs font-black ${getRankTone(row.rank)}`}>
                                                            #{row.rank}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="truncate text-sm font-black text-slate-950 dark:text-white">{row.name}</div>
                                                            <div className="mt-1 text-xs font-black text-cyan-700 dark:text-cyan-300">
                                                                {formatNumber(row.score)}
                                                                <span className="ml-1 text-slate-500 dark:text-slate-400">{unit}</span>
                                                            </div>
                                                        </div>
                                                    </article>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {ladderData.status === 'loading' && (
                                    <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 text-slate-500">
                                        <RefreshCw size={26} className="animate-spin text-cyan-500" />
                                        <div className="text-sm font-bold">正在加载榜单数据</div>
                                    </div>
                                )}

                                {ladderData.status === 'error' && (
                                    <div className="m-4 flex min-h-[360px] flex-col items-center justify-center rounded-lg border border-dashed border-rose-200 bg-rose-50 p-6 text-center text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                                        <AlertTriangle size={28} />
                                        <div className="mt-3 text-base font-black">榜单数据暂不可用</div>
                                        <div className="mt-1 text-sm">{ladderData.errorMessage}</div>
                                    </div>
                                )}

                                {ladderData.status === 'ready' && (
                                    <>
                                        <section className="bg-[#101418] p-3 text-white md:p-5">
                                            <div className="relative overflow-hidden rounded-lg border border-white/10 bg-[linear-gradient(135deg,#12171d,#1a2530_46%,#10241f)] p-3 shadow-[0_18px_50px_rgba(0,0,0,0.25)] md:p-5">
                                                <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:28px_28px]" />
                                                <div className="relative mb-4 flex flex-wrap items-center justify-between gap-2">
                                                    <div>
                                                        <div className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">
                                                            {isOverallSelected ? 'Composite Ladder' : 'Performance Ladder'}
                                                        </div>
                                                        <div className="mt-1 text-sm font-bold text-slate-300">
                                                            {searchTerm ? `${ladderData.total} 条匹配结果` : `${ladderData.total} 条完整排行`}
                                                        </div>
                                                    </div>
                                                    <div className="rounded-md border border-white/10 bg-white/10 px-2.5 py-1 text-xs font-bold text-slate-200">
                                                        {isOverallSelected ? '综合最高分' : 'Top score'} {formatNumber(ladderData.topScore)}
                                                    </div>
                                                </div>

                                                <div className="relative space-y-2">
                                                    <div className="absolute bottom-0 left-4 top-0 w-px bg-cyan-300/30 md:left-5" />
                                                    <div className="absolute bottom-0 left-8 top-0 w-px bg-amber-300/20 md:left-12" />
                                                    {ladderData.rows.map((row, index) => {
                                                        const percent = Math.max(4, Math.min(100, (row.score / topScore) * 100));
                                                        const unit = row.unit ? ` ${row.unit}` : '';
                                                        const indent = Math.min(44, index * 3);
                                                        const style: CSSProperties = {
                                                            marginLeft: `${indent}px`,
                                                            width: `calc(100% - ${indent}px)`
                                                        };

                                                        return (
                                                            <article key={`${row.rank}-${row.name}`} style={style} className="relative rounded-lg border border-white/10 bg-white/[0.07] p-3 shadow-sm backdrop-blur transition-colors hover:border-cyan-300/40 hover:bg-white/[0.11]">
                                                                <div className="flex gap-3">
                                                                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border text-sm font-black ${getRankTone(row.rank)}`}>
                                                                        {row.rank}
                                                                    </div>
                                                                    <div className="min-w-0 flex-1">
                                                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                                                            <div className="min-w-0">
                                                                                <h3 className="truncate text-sm font-black text-white md:text-base">{row.name}</h3>
                                                                                {row.specs.length > 0 && (
                                                                                    <div className="mt-1 flex flex-wrap gap-1.5">
                                                                                        {row.specs.map(spec => (
                                                                                            <span key={spec} className="max-w-full truncate rounded-md border border-white/10 bg-black/20 px-2 py-1 text-xs font-bold text-slate-300">
                                                                                                {spec}
                                                                                            </span>
                                                                                        ))}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                            <div className="flex shrink-0 items-center gap-2 sm:justify-end">
                                                                                <div className="text-left sm:text-right">
                                                                                    <div className="text-lg font-black text-cyan-200">
                                                                                        {formatNumber(row.score)}
                                                                                        <span className="ml-1 text-xs text-slate-400">{unit}</span>
                                                                                    </div>
                                                                                    <div className="text-xs font-bold text-slate-400">{activeMetricLabel}</div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="mt-3 h-3 overflow-hidden rounded-full bg-black/30 ring-1 ring-white/10">
                                                                            <div className="h-full rounded-full bg-[linear-gradient(90deg,#22d3ee,#facc15,#fb7185)] transition-all duration-500" style={{ width: `${percent}%` }} />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </article>
                                                        );
                                                    })}
                                                </div>

                                                {ladderData.rows.length === 0 && (
                                                    <div className="relative rounded-lg border border-dashed border-white/15 p-10 text-center text-sm font-bold text-slate-400">
                                                        没有匹配的型号
                                                    </div>
                                                )}

                                                {ladderData.hasMore && (
                                                    <div className="relative mt-4 flex justify-center">
                                                        <button
                                                            type="button"
                                                            onClick={ladderData.loadMore}
                                                            disabled={ladderData.isLoadingMore}
                                                            className="h-10 rounded-lg border border-white/10 bg-white/10 px-5 text-sm font-black text-white transition-colors hover:border-cyan-300/40 hover:bg-cyan-300/10 disabled:opacity-60"
                                                        >
                                                            {ladderData.isLoadingMore ? '加载中' : '显示更多阶梯'}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </section>
                                    </>
                                )}
                            </main>
                        </div>
                    </>
                )}

                {surfaceMode === 'compare' && (
                    <div className="grid gap-4">
                        {renderComparePanel(
                            'cpu',
                            'CPU 双型号对比',
                            cpuMetricCount,
                            cpuFirstName,
                            setCpuFirstName,
                            cpuSecondName,
                            setCpuSecondName,
                            cpuCompare
                        )}
                        {renderComparePanel(
                            'gpu',
                            'GPU 双型号对比',
                            gpuMetricCount,
                            gpuFirstName,
                            setGpuFirstName,
                            gpuSecondName,
                            setGpuSecondName,
                            gpuCompare
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
