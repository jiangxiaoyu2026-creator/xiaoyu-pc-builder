import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Activity,
    AlertTriangle,
    ChevronDown,
    Cpu,
    Gamepad2,
    GaugeCircle,
    Lock,
    MonitorPlay,
    RefreshCw,
    Search,
    Target,
} from 'lucide-react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import {
    GameFpsGameData,
    GameFpsHardware,
    GameFpsIndex,
    GameFpsResolution,
    getGameFpsGame,
    getGameFpsIndex,
    getGameVisual,
} from '../../services/gameFpsApi';

const resolutionLabels: Record<GameFpsResolution, string> = {
    '1080p': '1080P',
    '1440p': '2K',
    '4K': '4K',
};

const paletteClasses = [
    'from-indigo-500 to-sky-500',
    'from-emerald-500 to-cyan-500',
    'from-rose-500 to-orange-500',
    'from-violet-500 to-fuchsia-500',
    'from-blue-500 to-teal-500',
    'from-amber-500 to-red-500',
];

type CompactEntry = [queryName: string, avgFps: number, low1Fps: number, avgPerformanceRating: number | null, low1PerformanceRating: number | null];

type GameEstimate = {
    avgFps: number | null;
    lowFps: number | null;
    bottleneckType: 'cpu' | 'gpu' | 'balanced' | 'missing';
};

function fpsTone(fps: number) {
    if (fps >= 240) return { text: 'text-indigo-600 dark:text-indigo-300', bg: 'bg-indigo-50 dark:bg-indigo-500/10', bar: 'bg-indigo-500', label: '电竞高刷' };
    if (fps >= 144) return { text: 'text-blue-600 dark:text-blue-300', bg: 'bg-blue-50 dark:bg-blue-500/10', bar: 'bg-blue-500', label: '高刷流畅' };
    if (fps >= 60) return { text: 'text-emerald-600 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-500/10', bar: 'bg-emerald-500', label: '稳定可玩' };
    return { text: 'text-orange-600 dark:text-orange-300', bg: 'bg-orange-50 dark:bg-orange-500/10', bar: 'bg-orange-500', label: '需要优化' };
}

function formatNumber(value: number | null | undefined) {
    if (!Number.isFinite(value)) return '--';
    return Math.round(value as number).toLocaleString('zh-CN');
}

function formatSegment(segment: string | null) {
    if (segment === 'Desktop') return '桌面端';
    if (segment === 'Mobile') return '移动端';
    return segment || '未知类型';
}

function AnimatedNumber({
    value,
    className = '',
    duration = 0.55,
}: {
    value: number | null | undefined;
    className?: string;
    duration?: number;
}) {
    const prefersReducedMotion = useReducedMotion();
    const numericValue = Number.isFinite(value) ? Number(value) : null;
    const count = useMotionValue(numericValue ?? 0);
    const rounded = useTransform(count, (latest) => formatNumber(latest));

    useEffect(() => {
        if (numericValue === null) return;
        if (prefersReducedMotion) {
            count.set(numericValue);
            return;
        }
        const controls = animate(count, numericValue, {
            duration,
            ease: [0.16, 1, 0.3, 1],
        });
        return controls.stop;
    }, [count, duration, numericValue, prefersReducedMotion]);

    if (numericValue === null) return <span className={className}>--</span>;

    return (
        <motion.span className={`tabular-nums ${className}`}>
            {rounded}
        </motion.span>
    );
}

function MetricPulse({
    pulseKey,
    className = 'rounded-3xl bg-emerald-300/14',
}: {
    pulseKey: string;
    className?: string;
}) {
    return (
        <motion.div
            key={pulseKey}
            className={`pointer-events-none absolute inset-0 ${className}`}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: [0, 1, 0], scale: [0.98, 1.012, 1] }}
            transition={{ duration: 0.72, ease: 'easeOut' }}
        />
    );
}

function GameInitials({ name, rank, className = '' }: { name: string; rank: number; className?: string }) {
    const initials = name.split(/\s|:|-/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
    const palette = paletteClasses[rank % paletteClasses.length];
    return (
        <div className={`bg-gradient-to-br ${palette} text-white flex items-center justify-center font-black ${className}`}>
            {initials || '#'}
        </div>
    );
}

function LoadingBlock({ label }: { label: string }) {
    return (
        <div className="min-h-[360px] flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
            <RefreshCw size={28} className="animate-spin text-indigo-500" />
            <span className="text-sm font-bold">{label}</span>
        </div>
    );
}

function ResolutionTabs({ value, onChange }: { value: GameFpsResolution; onChange: (value: GameFpsResolution) => void }) {
    return (
        <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-[#1A1A24] border border-slate-200 dark:border-[#2D3748] p-1 rounded-xl">
            {(['1080p', '1440p', '4K'] as GameFpsResolution[]).map((resolution) => (
                <button
                    key={resolution}
                    onClick={() => onChange(resolution)}
                    className={`h-10 rounded-lg text-sm font-black transition-all ${
                        value === resolution
                            ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                            : 'text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    {resolutionLabels[resolution]}
                </button>
            ))}
        </div>
    );
}

function QualityLockControl() {
    const lockedOptions = ['高', '中', '低'];

    return (
        <div>
            <div className="mb-2 text-[11px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">游戏画质</div>
            <div className="grid grid-cols-4 gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-[#2D3748] dark:bg-[#1A1A24]">
                <button
                    type="button"
                    className="h-10 rounded-lg bg-indigo-600 text-sm font-black text-white shadow-sm shadow-indigo-500/20"
                >
                    最高
                </button>
                {lockedOptions.map((option) => (
                    <button
                        key={option}
                        type="button"
                        disabled
                        className="flex h-10 cursor-not-allowed items-center justify-center gap-1 rounded-lg text-sm font-black text-slate-400 opacity-70 dark:text-slate-500"
                    >
                        <Lock size={12} />
                        {option}
                    </button>
                ))}
            </div>
        </div>
    );
}

function HardwareSelect({
    label,
    icon: Icon,
    options,
    value,
    onChange,
    placeholder,
}: {
    label: string;
    icon: typeof Cpu;
    options: GameFpsHardware[];
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
}) {
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);
    const selected = options.find((option) => option.queryName === value) || options[0];

    useEffect(() => {
        const closeOnOutsideClick = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', closeOnOutsideClick);
        return () => document.removeEventListener('mousedown', closeOnOutsideClick);
    }, []);

    const filteredOptions = useMemo(() => {
        const keyword = searchTerm.trim().toLowerCase();
        if (!keyword) return options.slice(0, 80);
        return options.filter((option) => `${option.name} ${option.shortName} ${option.queryName}`.toLowerCase().includes(keyword)).slice(0, 120);
    }, [options, searchTerm]);

    return (
        <div ref={wrapperRef} className="relative">
            <div className="mb-2 text-[11px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">{label}</div>
            <button
                onClick={() => {
                    setOpen((current) => !current);
                    setSearchTerm('');
                }}
                className="w-full min-h-[58px] rounded-2xl bg-white dark:bg-[#1A1A24] border border-slate-200 dark:border-[#2D3748] hover:border-indigo-300 dark:hover:border-indigo-500/60 transition-colors px-4 py-3 flex items-center gap-3 text-left"
            >
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shrink-0">
                    <Icon size={20} />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="font-black text-sm text-slate-900 dark:text-white truncate">{selected?.name || placeholder}</div>
                    <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate">
                        {selected ? `${formatSegment(selected.segment)} · 性能位 #${selected.fpsScorePosition ?? '-'}` : '请选择硬件'}
                    </div>
                </div>
                <ChevronDown size={18} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute z-50 mt-2 w-full rounded-2xl border border-slate-200 dark:border-[#2D3748] bg-white dark:bg-[#121218] shadow-2xl overflow-hidden">
                    <div className="p-3 border-b border-slate-100 dark:border-[#1E293B]">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                placeholder={placeholder}
                                className="w-full h-10 rounded-xl bg-slate-50 dark:bg-[#1A1A24] border border-slate-200 dark:border-[#2D3748] pl-9 pr-3 text-sm outline-none focus:border-indigo-500"
                                autoFocus
                            />
                        </div>
                    </div>
                    <div className="max-h-[320px] overflow-y-auto custom-scrollbar p-2">
                        {filteredOptions.map((option) => (
                            <button
                                key={option.queryName}
                                onClick={() => {
                                    onChange(option.queryName);
                                    setOpen(false);
                                    setSearchTerm('');
                                }}
                                className={`w-full px-3 py-2.5 rounded-xl text-left flex items-center justify-between gap-3 transition-colors ${
                                    option.queryName === value
                                        ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-200'
                                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                                }`}
                            >
                                <span className="min-w-0">
                                    <span className="block text-sm font-bold truncate">{option.name}</span>
                                    <span className="block text-xs text-slate-400 truncate">{formatSegment(option.segment)} · {option.shortName}</span>
                                </span>
                                {option.fpsScorePosition && <span className="text-xs font-black text-slate-400 shrink-0">#{option.fpsScorePosition}</span>}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function findEntry(entries: CompactEntry[], queryName: string) {
    return entries.find((entry) => entry[0] === queryName) || null;
}

function createGameEstimate(gameData: GameFpsGameData, cpuQueryName: string, gpuQueryName: string, resolution: GameFpsResolution): GameEstimate {
    const cpuEntry = findEntry(gameData.cpu[resolution], cpuQueryName);
    const gpuEntry = findEntry(gameData.gpu[resolution], gpuQueryName);
    if (!cpuEntry || !gpuEntry) return { avgFps: null, lowFps: null, bottleneckType: 'missing' };

    const avgFps = Math.min(cpuEntry[1], gpuEntry[1]);
    const lowFps = Math.min(cpuEntry[2], gpuEntry[2]);
    const diff = Math.abs(cpuEntry[1] - gpuEntry[1]);
    const isBalanced = diff <= Math.max(5, avgFps * 0.05);

    return {
        avgFps,
        lowFps,
        bottleneckType: isBalanced ? 'balanced' : cpuEntry[1] < gpuEntry[1] ? 'cpu' : 'gpu',
    };
}

export const GameFPSViewer: React.FC = () => {
    const [index, setIndex] = useState<GameFpsIndex | null>(null);
    const [indexError, setIndexError] = useState<string | null>(null);
    const [gameData, setGameData] = useState<GameFpsGameData | null>(null);
    const [gameDataLoading, setGameDataLoading] = useState(false);
    const [gameDataError, setGameDataError] = useState<string | null>(null);
    const [libraryEstimates, setLibraryEstimates] = useState<Record<string, GameEstimate>>({});
    const [libraryEstimatesLoading, setLibraryEstimatesLoading] = useState(false);
    const [selectedGameQueryName, setSelectedGameQueryName] = useState('');
    const [selectedCpuQueryName, setSelectedCpuQueryName] = useState('');
    const [selectedGpuQueryName, setSelectedGpuQueryName] = useState('');
    const [selectedResolution, setSelectedResolution] = useState<GameFpsResolution>('1080p');
    const [gameSearch, setGameSearch] = useState('');
    const configPanelRef = useRef<HTMLElement>(null);

    const scrollToConfigPanel = (behavior: ScrollBehavior) => {
        const panel = configPanelRef.current;
        if (!panel) return;

        let parent = panel.parentElement;
        let scrollParent: HTMLElement | null = null;
        while (parent && parent !== document.body) {
            const overflowY = window.getComputedStyle(parent).overflowY;
            if ((overflowY === 'auto' || overflowY === 'scroll') && parent.scrollHeight > parent.clientHeight) {
                scrollParent = parent;
                break;
            }
            parent = parent.parentElement;
        }

        if (!scrollParent) {
            panel.scrollIntoView({ behavior, block: 'start' });
            return;
        }

        const panelRect = panel.getBoundingClientRect();
        const parentRect = scrollParent.getBoundingClientRect();
        scrollParent.scrollTo({
            top: Math.max(0, scrollParent.scrollTop + panelRect.top - parentRect.top - 16),
            behavior,
        });
    };

    const handleSelectGame = (queryName: string) => {
        setSelectedGameQueryName(queryName);
        if (typeof window === 'undefined') return;
        window.setTimeout(() => scrollToConfigPanel('auto'), 80);
        window.setTimeout(() => scrollToConfigPanel('auto'), 650);
    };

    useEffect(() => {
        let ignore = false;
        getGameFpsIndex()
            .then((nextIndex) => {
                if (ignore) return;
                const defaultGame = nextIndex.games.find((game) => game.imageKind !== 'fallback_cover') || nextIndex.games[0];
                setIndex(nextIndex);
                setSelectedGameQueryName(defaultGame?.queryName || '');
                setSelectedCpuQueryName(nextIndex.baselineCpu.queryName);
                setSelectedGpuQueryName(nextIndex.baselineGpu.queryName);
            })
            .catch((error) => {
                if (!ignore) setIndexError(error instanceof Error ? error.message : 'FPS 数据加载失败');
            });
        return () => {
            ignore = true;
        };
    }, []);

    useEffect(() => {
        if (!selectedGameQueryName) return;
        let ignore = false;
        setGameDataLoading(true);
        setGameDataError(null);

        getGameFpsGame(selectedGameQueryName)
            .then((data) => {
                if (!ignore) setGameData(data);
            })
            .catch((error) => {
                if (!ignore) setGameDataError(error instanceof Error ? error.message : '游戏数据加载失败');
            })
            .finally(() => {
                if (!ignore) setGameDataLoading(false);
            });

        return () => {
            ignore = true;
        };
    }, [selectedGameQueryName]);

    useEffect(() => {
        if (!index || !selectedCpuQueryName || !selectedGpuQueryName) return;
        let ignore = false;
        setLibraryEstimatesLoading(true);

        Promise.all(index.games.map((game) => getGameFpsGame(game.queryName)))
            .then((gameDataList) => {
                if (ignore) return;
                const nextEstimates: Record<string, GameEstimate> = {};
                for (const nextGameData of gameDataList) {
                    nextEstimates[nextGameData.game.queryName] = createGameEstimate(nextGameData, selectedCpuQueryName, selectedGpuQueryName, selectedResolution);
                }
                setLibraryEstimates(nextEstimates);
            })
            .catch((error) => {
                console.error(error);
                if (!ignore) setLibraryEstimates({});
            })
            .finally(() => {
                if (!ignore) setLibraryEstimatesLoading(false);
            });

        return () => {
            ignore = true;
        };
    }, [index, selectedCpuQueryName, selectedGpuQueryName, selectedResolution]);

    const filteredGames = useMemo(() => {
        if (!index) return [];
        const keyword = gameSearch.trim().toLowerCase();
        return index.games.filter((game) => !keyword || getGameVisual(game).searchText.includes(keyword));
    }, [gameSearch, index]);

    const selectedGame = useMemo(() => (
        index?.games.find((game) => game.queryName === selectedGameQueryName) || null
    ), [index, selectedGameQueryName]);

    const isCurrentGameData = gameData?.game.queryName === selectedGameQueryName;
    const activeGameData = isCurrentGameData ? gameData : null;
    const currentGameDataLoading = gameDataLoading || (!!selectedGameQueryName && !!gameData && !isCurrentGameData);
    const selectedVisual = selectedGame ? getGameVisual(selectedGame) : null;
    const selectedArtworkIsFallback = selectedGame?.imageKind === 'fallback_cover';
    const selectedCpu = index?.cpus.find((cpu) => cpu.queryName === selectedCpuQueryName) || null;
    const selectedGpu = index?.gpus.find((gpu) => gpu.queryName === selectedGpuQueryName) || null;
    const cpuEntry = activeGameData ? findEntry(activeGameData.cpu[selectedResolution], selectedCpuQueryName) : null;
    const gpuEntry = activeGameData ? findEntry(activeGameData.gpu[selectedResolution], selectedGpuQueryName) : null;
    const finalAvgFps = cpuEntry && gpuEntry ? Math.min(cpuEntry[1], gpuEntry[1]) : null;
    const finalLowFps = cpuEntry && gpuEntry ? Math.min(cpuEntry[2], gpuEntry[2]) : null;
    const cpuAvgFps = cpuEntry?.[1] ?? null;
    const gpuAvgFps = gpuEntry?.[1] ?? null;
    const finalTone = fpsTone(finalAvgFps || 0);
    const maxCapability = Math.max(cpuAvgFps || 0, gpuAvgFps || 0, 1);
    const diff = cpuAvgFps !== null && gpuAvgFps !== null ? Math.abs(cpuAvgFps - gpuAvgFps) : 0;
    const balancedThreshold = Math.max(5, (finalAvgFps || 0) * 0.05);
    const isBalanced = cpuAvgFps !== null && gpuAvgFps !== null && diff <= balancedThreshold;
    const bottleneckType = !cpuEntry || !gpuEntry ? 'missing' : isBalanced ? 'balanced' : cpuEntry[1] < gpuEntry[1] ? 'cpu' : 'gpu';
    const bottleneckLabel = bottleneckType === 'cpu' ? 'CPU 瓶颈' : bottleneckType === 'gpu' ? '显卡瓶颈' : bottleneckType === 'balanced' ? '整体均衡' : '数据不足';
    const bottleneckHint = bottleneckType === 'cpu'
        ? '当前最终帧率由 CPU 上限决定，升级 CPU 或提高分辨率/画质更能改善利用率。'
        : bottleneckType === 'gpu'
            ? '当前最终帧率由显卡上限决定，升级显卡、降低分辨率或开启 DLSS/FSR 更有效。'
            : bottleneckType === 'balanced'
                ? 'CPU 与显卡上限接近，这套组合在当前游戏和分辨率下比较均衡。'
                : '请选择完整的 CPU 和显卡。';
    const activeConfigKey = `${selectedGameQueryName}-${selectedCpuQueryName}-${selectedGpuQueryName}-${selectedResolution}`;
    const fpsPulseKey = `${activeConfigKey}-${finalAvgFps ?? 'missing'}-${finalLowFps ?? 'missing'}`;
    const cpuPulseKey = `${activeConfigKey}-cpu-${cpuAvgFps ?? 'missing'}`;
    const gpuPulseKey = `${activeConfigKey}-gpu-${gpuAvgFps ?? 'missing'}`;

    if (indexError) {
        return (
            <div className="min-h-full bg-[#FAFAFA] dark:bg-[#0B0B10] p-4 sm:p-6 lg:p-8 text-slate-900 dark:text-white">
                <div className="max-w-4xl mx-auto bg-white dark:bg-[#121218] border border-red-200 dark:border-red-500/30 rounded-2xl p-8">
                    <div className="flex items-center gap-3 text-red-600 dark:text-red-300 font-bold">
                        <AlertTriangle size={22} /> FPS 数据加载失败
                    </div>
                    <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{indexError}</p>
                </div>
            </div>
        );
    }

    if (!index) {
        return <LoadingBlock label="正在加载游戏 FPS 数据" />;
    }

    return (
        <div className="min-h-full bg-[#F5F7FB] dark:bg-[#090A0F] text-slate-950 dark:text-slate-100 p-4 sm:p-6 lg:p-8">
            <div className="max-w-[1680px] mx-auto space-y-6">
                <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-5">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#14161F] border border-slate-200 dark:border-white/10 shadow-sm flex items-center justify-center">
                            <Gamepad2 className="text-indigo-600 dark:text-indigo-300" size={25} />
                        </div>
                        <div>
                            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white dark:bg-white/5 text-indigo-600 dark:text-indigo-200 text-xs font-black border border-slate-200 dark:border-white/10 mb-3">
                                <Activity size={13} /> HowManyFPS Top 50 · {index.version}
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">游戏帧率实验室</h1>
                            <p className="mt-2 text-sm sm:text-[15px] text-slate-500 dark:text-slate-400 max-w-3xl leading-relaxed">
                                {index.counts.processedRows.toLocaleString('zh-CN')} 条组件级实测数据，按 CPU 与显卡两侧上限取低值生成当前帧率。
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-2 px-3 h-11 rounded-xl bg-white dark:bg-[#14161F] border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-500 dark:text-slate-400">
                            <GaugeCircle size={16} className="text-emerald-500" />
                            {index.counts.games} 款游戏
                        </div>
                        <div className="flex items-center gap-2 px-3 h-11 rounded-xl bg-white dark:bg-[#14161F] border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-500 dark:text-slate-400">
                            <Cpu size={16} className="text-indigo-500" />
                            {index.counts.cpus + index.counts.gpus} 个硬件样本
                        </div>
                    </div>
                </header>

                <section ref={configPanelRef} className="relative rounded-[28px] border border-white/80 dark:border-white/10 shadow-[0_28px_80px_rgba(15,23,42,0.16)] dark:shadow-[0_28px_90px_rgba(0,0,0,0.45)] scroll-mt-4">
                    <div className="absolute inset-0 rounded-[28px] overflow-hidden bg-slate-950">
                        {selectedGame && selectedVisual && (
                            <>
                                <GameInitials name={selectedVisual.displayName} rank={selectedGame.rank} className="absolute inset-0 text-8xl opacity-80" />
                                {selectedVisual.coverPath && (
                                    <img
                                        src={selectedVisual.coverPath}
                                        alt=""
                                        className={`absolute inset-0 h-full w-full object-cover ${
                                            selectedArtworkIsFallback ? 'scale-110 object-center opacity-90 saturate-150' : ''
                                        }`}
                                        onError={(event) => { event.currentTarget.style.display = 'none'; }}
                                    />
                                )}
                            </>
                        )}
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.16),transparent_34%),linear-gradient(90deg,rgba(2,6,23,0.94)_0%,rgba(2,6,23,0.74)_42%,rgba(2,6,23,0.32)_100%)]" />
                        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent" />
                        {selectedArtworkIsFallback && selectedVisual?.coverPath && (
                            <img
                                src={selectedVisual.coverPath}
                                alt=""
                                className="hidden xl:block absolute right-[470px] top-10 bottom-10 w-[240px] object-contain rounded-[26px] shadow-[0_32px_90px_rgba(0,0,0,0.62)] ring-1 ring-white/25 opacity-95"
                                onError={(event) => { event.currentTarget.style.display = 'none'; }}
                            />
                        )}
                    </div>

                    <div className="relative grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-5 p-4 sm:p-6 lg:p-8 min-h-[590px] xl:min-h-[520px]">
                        <motion.div
                            key={`${selectedGameQueryName}-hero`}
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.24 }}
                            className="min-h-[390px] xl:min-h-0 flex flex-col justify-between text-white select-none cursor-default"
                        >
                            <div className="flex flex-wrap items-center gap-2">
                                {selectedGame && (
                                    <>
                                        <span className="px-3 py-1.5 rounded-xl bg-white/12 border border-white/15 backdrop-blur-md text-xs font-black">#{selectedGame.rank}</span>
                                        <span className="px-3 py-1.5 rounded-xl bg-white/12 border border-white/15 backdrop-blur-md text-xs font-bold">最高画质</span>
                                    </>
                                )}
                                <span className={`px-3 py-1.5 rounded-xl text-xs font-black backdrop-blur-md ${
                                    bottleneckType === 'balanced'
                                        ? 'bg-emerald-400/20 text-emerald-100 border border-emerald-300/25'
                                        : bottleneckType === 'missing'
                                            ? 'bg-white/12 text-white/80 border border-white/15'
                                            : 'bg-orange-400/20 text-orange-100 border border-orange-300/25'
                                }`}>
                                    {bottleneckLabel}
                                </span>
                            </div>

                            <div className="max-w-5xl">
                                <div className="mb-5">
                                    <h2 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[0.95]">
                                        {selectedVisual?.displayName || '游戏帧率'}
                                    </h2>
                                    <p className="mt-4 text-base sm:text-lg text-white/62 font-semibold">{selectedVisual?.originalName || ''}</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_180px] gap-4 max-w-3xl">
                                    <div className="relative overflow-hidden rounded-3xl bg-white/10 border border-white/15 backdrop-blur-xl p-5 sm:p-6">
                                        <MetricPulse pulseKey={fpsPulseKey} />
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2 text-sm font-black text-white/86">
                                                <Target size={18} className="text-emerald-300" />
                                                最终游戏帧率
                                            </div>
                                            <span className="px-2.5 py-1 rounded-lg bg-white/12 text-white text-xs font-black">{resolutionLabels[selectedResolution]}</span>
                                        </div>
                                        <div className="mt-3 flex items-end gap-3">
                                            <AnimatedNumber value={finalAvgFps} className="text-6xl sm:text-7xl font-black tracking-tight text-white" />
                                            <div className="pb-3 text-xl font-black text-white/55">FPS</div>
                                        </div>
                                        <p className="mt-3 text-sm leading-relaxed text-white/58">{bottleneckHint}</p>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-1 gap-3">
                                        <div className="relative overflow-hidden rounded-2xl bg-emerald-400/16 border border-emerald-200/20 backdrop-blur-xl p-4">
                                            <MetricPulse pulseKey={`${fpsPulseKey}-low`} className="rounded-2xl bg-emerald-200/16" />
                                            <div className="text-xs font-black uppercase text-emerald-100/70">1% Low 帧率</div>
                                            <AnimatedNumber value={finalLowFps} className="mt-2 block text-4xl font-black text-emerald-100" />
                                            <div className="mt-1 text-[11px] font-bold text-emerald-100/55">稳定性参考</div>
                                        </div>
                                        <div className="rounded-2xl bg-white/10 border border-white/15 backdrop-blur-xl p-4">
                                            <div className="text-xs font-black uppercase text-white/45">评级</div>
                                            <motion.div
                                                key={finalTone.label}
                                                initial={{ opacity: 0, y: 4 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.22 }}
                                                className="mt-2 text-lg font-black"
                                            >
                                                {finalTone.label}
                                            </motion.div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        <div className="rounded-3xl bg-white/94 dark:bg-[#11131B]/94 border border-white/80 dark:border-white/10 shadow-2xl backdrop-blur-2xl p-4 sm:p-5 space-y-4 self-start xl:self-stretch">
                            {currentGameDataLoading ? (
                                <LoadingBlock label="正在加载当前游戏数据" />
                            ) : gameDataError ? (
                                <div className="rounded-2xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-300 font-bold">{gameDataError}</div>
                            ) : (
                                <>
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <div className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-300">Benchmark Console</div>
                                            <div className="mt-1 text-lg font-black text-slate-950 dark:text-white">测帧控制台</div>
                                        </div>
                                        <motion.div
                                            key={`${finalTone.label}-${finalAvgFps ?? 'missing'}`}
                                            initial={{ opacity: 0, y: -4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.22 }}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-black ${finalTone.bg} ${finalTone.text}`}
                                        >
                                            {finalTone.label}
                                        </motion.div>
                                    </div>

                                    <HardwareSelect label="选择 CPU" icon={Cpu} options={index.cpus} value={selectedCpuQueryName} onChange={setSelectedCpuQueryName} placeholder="搜索 CPU，例如 9800X3D / i5-14600K" />
                                    <HardwareSelect label="选择显卡" icon={MonitorPlay} options={index.gpus} value={selectedGpuQueryName} onChange={setSelectedGpuQueryName} placeholder="搜索显卡，例如 RTX 5070 / RX 9070" />
                                    <ResolutionTabs value={selectedResolution} onChange={setSelectedResolution} />
                                    <QualityLockControl />

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className={`relative overflow-hidden rounded-2xl border p-3 ${bottleneckType === 'cpu' ? 'border-orange-300 dark:border-orange-500/40 bg-orange-50 dark:bg-orange-500/10' : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5'}`}>
                                            <MetricPulse pulseKey={cpuPulseKey} className="rounded-2xl bg-indigo-300/12" />
                                            <div className="flex items-center gap-2 text-xs font-black text-slate-900 dark:text-white">
                                                <Cpu size={15} className="text-indigo-500" /> CPU 上限
                                            </div>
                                            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">{selectedCpu?.name || '未选择 CPU'}</div>
                                            <div className="mt-2 flex items-end justify-between gap-2">
                                                <AnimatedNumber value={cpuAvgFps} className="text-2xl font-black text-slate-900 dark:text-white" />
                                                <div className="pb-1 text-[10px] font-bold text-slate-400">FPS</div>
                                            </div>
                                            <div className="mt-2 h-1.5 rounded-full bg-slate-200/70 dark:bg-white/10 overflow-hidden">
                                                <div className="h-full rounded-full bg-indigo-500 transition-[width] duration-700 ease-out" style={{ width: `${Math.min(100, ((cpuAvgFps || 0) / maxCapability) * 100)}%` }} />
                                            </div>
                                        </div>

                                        <div className={`relative overflow-hidden rounded-2xl border p-3 ${bottleneckType === 'gpu' ? 'border-orange-300 dark:border-orange-500/40 bg-orange-50 dark:bg-orange-500/10' : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5'}`}>
                                            <MetricPulse pulseKey={gpuPulseKey} className="rounded-2xl bg-emerald-300/12" />
                                            <div className="flex items-center gap-2 text-xs font-black text-slate-900 dark:text-white">
                                                <MonitorPlay size={15} className="text-indigo-500" /> 显卡上限
                                            </div>
                                            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">{selectedGpu?.name || '未选择显卡'}</div>
                                            <div className="mt-2 flex items-end justify-between gap-2">
                                                <AnimatedNumber value={gpuAvgFps} className="text-2xl font-black text-slate-900 dark:text-white" />
                                                <div className="pb-1 text-[10px] font-bold text-slate-400">FPS</div>
                                            </div>
                                            <div className="mt-2 h-1.5 rounded-full bg-slate-200/70 dark:bg-white/10 overflow-hidden">
                                                <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-700 ease-out" style={{ width: `${Math.min(100, ((gpuAvgFps || 0) / maxCapability) * 100)}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </section>

                <section className="space-y-4">
                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                        <div>
                            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 dark:text-white">游戏库</h2>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                {libraryEstimatesLoading ? '正在刷新当前配置帧率' : `${filteredGames.length} 款游戏 · 当前配置估算`}
                            </p>
                        </div>
                        <div className="relative w-full lg:w-[420px]">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                value={gameSearch}
                                onChange={(event) => setGameSearch(event.target.value)}
                                placeholder="搜索游戏，例如 赛博朋克 / Valorant / GTA"
                                className="w-full h-12 rounded-2xl bg-white dark:bg-[#14161F] border border-slate-200 dark:border-white/10 pl-10 pr-3 text-sm font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 shadow-sm"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
                        {filteredGames.map((game) => {
                            const visual = getGameVisual(game);
                            const estimate = libraryEstimates[game.queryName];
                            const isActive = game.queryName === selectedGameQueryName;
                            const cardTone = fpsTone(estimate?.avgFps || 0);
                            const estimateLabel = estimate?.bottleneckType === 'cpu' ? 'CPU' : estimate?.bottleneckType === 'gpu' ? '显卡' : estimate?.bottleneckType === 'balanced' ? '均衡' : '--';
                            const cardArtworkIsFallback = game.imageKind === 'fallback_cover';

                            return (
                                <button
                                    key={game.queryName}
                                    onClick={() => handleSelectGame(game.queryName)}
                                    className={`group relative h-[260px] rounded-3xl overflow-hidden border text-left shadow-sm transition-all select-none ${
                                        isActive
                                            ? 'border-indigo-400 shadow-[0_18px_45px_rgba(79,70,229,0.24)]'
                                            : 'border-white dark:border-white/10 hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(15,23,42,0.16)]'
                                    }`}
                                >
                                    <GameInitials name={visual.displayName} rank={game.rank} className="absolute inset-0 text-6xl" />
                                    {visual.coverPath && (
                                        <img
                                            src={visual.coverPath}
                                            alt=""
                                            className={`absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 ${
                                                cardArtworkIsFallback ? 'scale-125 object-center opacity-75 blur-xl saturate-150 group-hover:scale-[1.32]' : ''
                                            }`}
                                            onError={(event) => { event.currentTarget.style.display = 'none'; }}
                                        />
                                    )}
                                    {cardArtworkIsFallback && visual.coverPath && (
                                        <img
                                            src={visual.coverPath}
                                            alt=""
                                            className="absolute z-[2] left-1/2 top-[43%] h-[74%] max-h-[198px] w-auto max-w-[44%] -translate-x-1/2 -translate-y-1/2 object-contain rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.55)] ring-1 ring-white/20 opacity-95 transition-transform duration-700 group-hover:scale-105"
                                            onError={(event) => { event.currentTarget.style.display = 'none'; }}
                                        />
                                    )}
                                    <div className="absolute z-[1] inset-0 bg-gradient-to-t from-slate-950 via-slate-950/38 to-slate-950/5" />
                                    <div className="absolute z-[3] left-4 right-4 top-4 flex items-start justify-between gap-3">
                                        <span className="px-2.5 py-1.5 rounded-xl bg-black/45 text-white text-xs font-black backdrop-blur-md">#{game.rank}</span>
                                        <span className={`px-2.5 py-1.5 rounded-xl text-xs font-black backdrop-blur-md ${cardTone.bg} ${cardTone.text}`}>
                                            <AnimatedNumber value={estimate?.avgFps} /> FPS
                                        </span>
                                    </div>
                                    <div className="absolute z-[3] left-4 right-4 bottom-4 text-white">
                                        <div className="flex items-end justify-between gap-3">
                                            <div className="min-w-0">
                                                <h3 className="text-2xl font-black tracking-tight truncate">{visual.displayName}</h3>
                                                <p className="mt-1 text-sm text-white/62 truncate">{visual.originalName}</p>
                                            </div>
                                            <div className="shrink-0 text-right">
                                                <div className="text-[10px] font-black uppercase text-white/45">瓶颈</div>
                                                <div className="mt-1 text-sm font-black">{estimateLabel}</div>
                                            </div>
                                        </div>
                                        <div className="mt-3 flex items-center justify-between gap-2">
                                            <span className="px-2.5 py-1 rounded-lg bg-white/12 border border-white/10 backdrop-blur-md text-xs font-bold">最高画质</span>
                                            {isActive && <span className="px-2.5 py-1 rounded-lg bg-indigo-500 text-white text-xs font-black">已选中</span>}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </section>
            </div>
        </div>
    );
};
