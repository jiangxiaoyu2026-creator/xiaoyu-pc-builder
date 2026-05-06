import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Gamepad2, Cpu, MonitorPlay, TrendingUp, GaugeCircle, Activity, ChevronDown, Search, Zap } from 'lucide-react';
import { motion, useMotionValue, animate, useTransform } from 'framer-motion';
import { gamesFpsData, gamesList, cpuList, gpuList, Resolution } from '../../data/gameFpsData';

// 动态数字增长效果
const BouncyNumber = ({ value, className }: { value: number; className?: string }) => {
    const count = useMotionValue(0);
    const rounded = useTransform(count, (latest) => Math.round(latest));

    useEffect(() => {
        const controls = animate(count, value, {
            type: 'spring',
            stiffness: 80,
            damping: 15,
            restDelta: 0.5
        });
        return controls.stop;
    }, [value, count]);

    return <motion.span className={className}>{rounded}</motion.span>;
};

// 精致的搜索下拉选择器
const SearchableSelect = ({ options, value, onChange, placeholder, icon: Icon, label, isGame = false }: { options: string[], value: string, onChange: (val: string) => void, placeholder: string, icon: any, label: string, isGame?: boolean }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt => opt.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div ref={wrapperRef} className="relative w-full">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2 ml-1 uppercase tracking-widest">{label}</div>
            <div 
                className={`relative flex items-center bg-white dark:bg-[#1A1A24] border ${isOpen ? 'border-indigo-500 ring-1 ring-indigo-500/20' : 'border-slate-200 dark:border-[#2D3748] hover:border-slate-300 dark:hover:border-slate-600'} rounded-xl transition-all shadow-sm`}
            >
                {isGame && value && !isOpen ? (
                    <div className="pl-4 flex items-center justify-center">
                        <img src={`/images/games/icons/${value}.png`} alt="" className="w-5 h-5 rounded-[4px] object-cover bg-slate-100 dark:bg-slate-800" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    </div>
                ) : (
                    <div className="pl-4 text-indigo-500 dark:text-indigo-400 flex items-center justify-center">
                        <Icon size={18} strokeWidth={2} />
                    </div>
                )}
                <input 
                    type="text"
                    value={isOpen ? searchTerm : value}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => {
                        setIsOpen(true);
                        setSearchTerm("");
                    }}
                    placeholder={placeholder}
                    className="flex-1 bg-transparent px-3 py-3.5 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none w-full text-[15px] font-medium transition-colors"
                    spellCheck={false}
                />
                <div className="pr-4 text-slate-400 dark:text-slate-500 flex items-center justify-center">
                    <ChevronDown size={18} className={`transition-transform duration-300 ${isOpen ? 'rotate-180 text-indigo-500 dark:text-indigo-400' : ''}`} />
                </div>
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white dark:bg-[#121218] border border-slate-100 dark:border-[#1E293B] rounded-xl max-h-[280px] overflow-y-auto custom-scrollbar shadow-2xl dark:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.7)] py-2">
                    {filteredOptions.length === 0 ? (
                        <div className="px-4 py-6 text-sm text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center gap-2">
                            <Search size={20} className="text-slate-300 dark:text-slate-600 mb-1" />
                            未找到匹配的项
                        </div>
                    ) : (
                        <ul className="flex flex-col px-1.5 gap-0.5">
                            {filteredOptions.map((opt) => (
                                <li 
                                    key={opt}
                                    onClick={() => {
                                        onChange(opt);
                                        setIsOpen(false);
                                        setSearchTerm("");
                                    }}
                                    className={`px-3 py-2.5 text-sm font-medium rounded-lg cursor-pointer transition-all flex items-center justify-between border-l-2 ${
                                        opt === value 
                                        ? 'bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500 shadow-[-2px_0_10px_rgba(139,92,246,0.2)]' 
                                        : 'border-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                                    }`}
                                >
                                    <span className="truncate pr-4 flex items-center gap-2">
                                        {isGame && <img src={`/images/games/icons/${opt}.png`} alt="" className="w-5 h-5 rounded-[4px] object-cover bg-slate-100 dark:bg-slate-800 shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
                                        <span className="truncate">{opt}</span>
                                    </span>
                                    {opt === value && <div className="w-1.5 h-1.5 rounded-full bg-violet-500 dark:bg-violet-400 shadow-[0_0_8px_rgba(139,92,246,0.5)] shrink-0" />}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
};

export const GameFPSViewer: React.FC = () => {
    const initialGame = gamesList.length > 0 ? gamesList[0] : '';
    const [selectedGame, setSelectedGame] = useState<string>(initialGame);
    const [selectedRes, setSelectedRes] = useState<Resolution>('1080p');
    const [activeMode, setActiveMode] = useState<'config' | 'cpu' | 'gpu'>('config');
    
    const initialCpus = Object.keys(gamesFpsData[initialGame]?.cpu || {}).sort();
    const initialGpus = Object.keys(gamesFpsData[initialGame]?.gpu || {}).sort();
    const [selectedCpu, setSelectedCpu] = useState<string>(initialCpus.length > 0 ? initialCpus[0] : cpuList[0]);
    const [selectedGpu, setSelectedGpu] = useState<string>(initialGpus.length > 0 ? initialGpus[0] : gpuList[0]);
    const [selectedCpu2, setSelectedCpu2] = useState<string>(initialCpus.length > 1 ? initialCpus[1] : (initialCpus.length > 0 ? initialCpus[0] : cpuList[0]));
    const [selectedGpu2, setSelectedGpu2] = useState<string>(initialGpus.length > 1 ? initialGpus[1] : (initialGpus.length > 0 ? initialGpus[0] : gpuList[0]));

    const availableCpus = useMemo(() => {
        if (!selectedGame) return [];
        const cpuData = gamesFpsData[selectedGame]?.cpu || {};
        return Object.keys(cpuData).sort((a, b) => {
            const fpsA = cpuData[a]?.[selectedRes]?.avg || 0;
            const fpsB = cpuData[b]?.[selectedRes]?.avg || 0;
            return fpsB - fpsA;
        });
    }, [selectedGame, selectedRes]);
    
    const availableGpus = useMemo(() => {
        if (!selectedGame) return [];
        const gpuData = gamesFpsData[selectedGame]?.gpu || {};
        return Object.keys(gpuData).sort((a, b) => {
            const fpsA = gpuData[a]?.[selectedRes]?.avg || 0;
            const fpsB = gpuData[b]?.[selectedRes]?.avg || 0;
            return fpsB - fpsA;
        });
    }, [selectedGame, selectedRes]);

    const handleSelectGame = (game: string) => {
        setSelectedGame(game);
        
        const cpuData = gamesFpsData[game]?.cpu || {};
        const cpus = Object.keys(cpuData).sort((a, b) => {
            const fpsA = cpuData[a]?.[selectedRes]?.avg || 0;
            const fpsB = cpuData[b]?.[selectedRes]?.avg || 0;
            return fpsB - fpsA;
        });
        
        const gpuData = gamesFpsData[game]?.gpu || {};
        const gpus = Object.keys(gpuData).sort((a, b) => {
            const fpsA = gpuData[a]?.[selectedRes]?.avg || 0;
            const fpsB = gpuData[b]?.[selectedRes]?.avg || 0;
            return fpsB - fpsA;
        });
        
        if (cpus.length > 0) setSelectedCpu(cpus[0]);
        if (gpus.length > 0) setSelectedGpu(gpus[0]);
        
        if (cpus.length > 1) setSelectedCpu2(cpus[1]);
        else if (cpus.length > 0) setSelectedCpu2(cpus[0]);
        
        if (gpus.length > 1) setSelectedGpu2(gpus[1]);
        else if (gpus.length > 0) setSelectedGpu2(gpus[0]);
    };

    const stats = useMemo(() => {
        if (!selectedGame) return null;
        const gameData = gamesFpsData[selectedGame];
        if (!gameData) return null;

        const cData = gameData.cpu[selectedCpu]?.[selectedRes];
        const gData = gameData.gpu[selectedGpu]?.[selectedRes];

        if (!cData || !gData) return null;

        return {
            cAvg: cData.avg,
            gAvg: gData.avg,
            cLow: cData.low,
            gLow: gData.low,
            avg: Math.min(cData.avg, gData.avg),
            low: Math.min(cData.low, gData.low),
            isCpuBottleneck: cData.avg < gData.avg,
            diff: Math.abs(cData.avg - gData.avg)
        };
    }, [selectedGame, selectedCpu, selectedGpu, selectedRes]);

    const result = stats || { avg: 0, low: 0, cAvg: 0, gAvg: 0, isCpuBottleneck: false, diff: 0 };

    const getPremiumScoreStyles = (fps: number) => {
        if (fps >= 240) return { 
            gradient: 'from-violet-500 to-fuchsia-600 dark:from-[#A78BFA] dark:to-[#E879F9]', 
            text: 'text-fuchsia-600 dark:text-[#E879F9]', 
            bg: 'bg-fuchsia-50/80 dark:bg-[#E879F9]/10',
            border: 'border-fuchsia-200 dark:border-[#E879F9]/30',
            shadow: 'shadow-[0_0_20px_rgba(232,121,249,0.3)]'
        };
        if (fps >= 144) return { 
            gradient: 'from-indigo-500 to-violet-600 dark:from-[#818CF8] dark:to-[#A78BFA]', 
            text: 'text-violet-600 dark:text-[#A78BFA]', 
            bg: 'bg-violet-50/80 dark:bg-[#A78BFA]/10',
            border: 'border-violet-200 dark:border-[#A78BFA]/30',
            shadow: 'shadow-[0_0_20px_rgba(167,139,250,0.3)]'
        };
        if (fps >= 60) return { 
            gradient: 'from-cyan-500 to-blue-600 dark:from-[#22D3EE] dark:to-[#3B82F6]', 
            text: 'text-cyan-600 dark:text-[#22D3EE]', 
            bg: 'bg-cyan-50/80 dark:bg-[#22D3EE]/10',
            border: 'border-cyan-200 dark:border-[#22D3EE]/30',
            shadow: 'shadow-[0_0_20px_rgba(34,211,238,0.3)]'
        };
        return { 
            gradient: 'from-rose-500 to-red-600 dark:from-[#FB7185] dark:to-[#E11D48]', 
            text: 'text-rose-600 dark:text-[#FB7185]', 
            bg: 'bg-rose-50/80 dark:bg-[#FB7185]/10',
            border: 'border-rose-200 dark:border-[#FB7185]/30',
            shadow: 'shadow-[0_0_20px_rgba(251,113,133,0.3)]'
        };
    };

    const getRating = (fps: number) => {
        if (fps >= 240) return { label: '电竞极速', desc: '性能远超常规需求，完美驱动顶级高刷显示器，适合专业竞技。' };
        if (fps >= 144) return { label: '丝滑流畅', desc: '帧率表现优异，画面无拖影，带来沉浸式流畅体验。' };
        if (fps >= 60) return { label: '平稳顺畅', desc: '达到 60FPS 标准线，游戏运行平稳，日常游玩无压力。' };
        return { label: '遭遇瓶颈', desc: '帧数偏低，可能出现肉眼可见的卡顿或操作延迟。' };
    };

    const scoreStyle = getPremiumScoreStyles(result.avg);
    const rating = getRating(result.avg);

    const renderComparisonCard = (item1Name: string, item1Data: any, item2Name: string, item2Data: any) => {
        const item1Avg = item1Data?.avg || 0;
        const item2Avg = item2Data?.avg || 0;
        const item1Low = item1Data?.low || 0;
        const item2Low = item2Data?.low || 0;
        
        const diff = item1Avg - item2Avg;
        const diffPercent = item2Avg > 0 ? Math.abs((diff / item2Avg) * 100).toFixed(1) : 0;
        
        const winner = diff > 0 ? 1 : diff < 0 ? 2 : 0;
        
        return (
            <div className="flex flex-col gap-6 w-full">
                <div className="bg-[#121218]/90 backdrop-blur-xl border border-slate-800/80 rounded-[24px] shadow-[0_0_40px_rgba(0,0,0,0.5)] p-6 sm:p-8 relative overflow-hidden group hover:scale-[1.01] transition-all duration-300">
                    {/* 网格底纹 */}
                    <div className="absolute inset-0 bg-[url('/images/grid-pattern.svg')] opacity-5 pointer-events-none mix-blend-overlay"></div>
                    
                    {/* Headers for A and B */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 relative z-10">
                        <div className="flex flex-col gap-1.5 w-full md:w-5/12">
                            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.5)]"></div>
                                测试对象 A
                            </div>
                            <div className="text-[16px] sm:text-[20px] font-display font-bold text-slate-100 leading-tight truncate" title={item1Name}>{item1Name}</div>
                        </div>
                        
                        <div className="hidden md:flex w-2/12 justify-center items-center">
                            <div className="px-3 py-1 rounded-full bg-slate-700/80 border border-slate-600 text-[10px] text-slate-200 font-bold tracking-widest uppercase shadow-inner">VS</div>
                        </div>

                        <div className="flex flex-col gap-1.5 w-full md:w-5/12 md:items-end md:text-right">
                            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 md:flex-row-reverse">
                                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.5)]"></div>
                                测试对象 B
                            </div>
                            <div className="text-[16px] sm:text-[20px] font-display font-bold text-slate-100 leading-tight truncate" title={item2Name}>{item2Name}</div>
                        </div>
                    </div>

                    {/* Average FPS Bars */}
                    <div className="mb-6 relative z-10">
                        <div className="flex justify-between items-end mb-3">
                            <div className="text-[13px] text-slate-200 font-bold flex items-center gap-2">
                                平均帧数
                                {winner !== 0 && (
                                    <span className="text-[10px] bg-white/10 border border-white/20 px-2 py-0.5 rounded text-white font-bold shadow-sm">差距 {diffPercent}%</span>
                                )}
                            </div>
                            <div className="flex gap-3 sm:gap-5 font-display font-bold items-center">
                                <div className={`text-xl ${winner === 1 ? 'text-violet-400 drop-shadow-[0_0_12px_rgba(139,92,246,0.6)] scale-110 transition-transform' : 'text-slate-300'}`}><BouncyNumber value={item1Avg} /> <span className="text-[10px] font-sans opacity-60">FPS</span></div>
                                <div className="text-[11px] text-slate-500 uppercase tracking-widest font-sans">vs</div>
                                <div className={`text-xl ${winner === 2 ? 'text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.6)] scale-110 transition-transform' : 'text-slate-300'}`}><BouncyNumber value={item2Avg} /> <span className="text-[10px] font-sans opacity-60">FPS</span></div>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2.5">
                            <div className="h-4 w-full bg-[#0B0B10] border border-slate-800 rounded-full overflow-hidden relative">
                                <div className="absolute inset-0 bg-[url('/images/scanlines.png')] opacity-30 mix-blend-overlay z-10 pointer-events-none"></div>
                                <motion.div initial={{width:0}} animate={{width: `${Math.min(100, (item1Avg / Math.max(item1Avg, item2Avg, 1)) * 100)}%`}} transition={{duration: 0.8, ease: "easeOut"}} className="h-full rounded-full bg-gradient-to-r from-violet-900/50 to-violet-500 border-r border-violet-300 shadow-[0_0_15px_rgba(139,92,246,0.4)] relative z-0" />
                            </div>
                            <div className="h-4 w-full bg-[#0B0B10] border border-slate-800 rounded-full overflow-hidden relative">
                                <div className="absolute inset-0 bg-[url('/images/scanlines.png')] opacity-30 mix-blend-overlay z-10 pointer-events-none"></div>
                                <motion.div initial={{width:0}} animate={{width: `${Math.min(100, (item2Avg / Math.max(item1Avg, item2Avg, 1)) * 100)}%`}} transition={{duration: 0.8, ease: "easeOut"}} className="h-full rounded-full bg-gradient-to-r from-cyan-900/50 to-cyan-500 border-r border-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.4)] relative z-0" />
                            </div>
                        </div>
                    </div>

                    {/* 1% Low Bars */}
                    <div className="pt-5 border-t border-slate-800/80 relative z-10">
                        <div className="flex justify-between items-end mb-3">
                            <div className="text-[12px] text-slate-300 font-bold">1% Low 最低帧</div>
                            <div className="flex gap-3 sm:gap-5 font-display font-bold items-center">
                                <div className={`text-lg ${winner === 1 ? 'text-violet-300 drop-shadow-[0_0_8px_rgba(139,92,246,0.4)]' : 'text-slate-400'}`}><BouncyNumber value={item1Low} /> <span className="text-[10px] font-sans opacity-60">FPS</span></div>
                                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-sans">vs</div>
                                <div className={`text-lg ${winner === 2 ? 'text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]' : 'text-slate-400'}`}><BouncyNumber value={item2Low} /> <span className="text-[10px] font-sans opacity-60">FPS</span></div>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <div className="h-2 w-full bg-[#0B0B10] border border-slate-800/80 rounded-full overflow-hidden relative">
                                <motion.div initial={{width:0}} animate={{width: `${Math.min(100, (item1Low / Math.max(item1Low, item2Low, 1)) * 100)}%`}} transition={{duration: 0.8, ease: "easeOut", delay: 0.1}} className="h-full rounded-full bg-violet-500/70 relative z-0" />
                            </div>
                            <div className="h-2 w-full bg-[#0B0B10] border border-slate-800/80 rounded-full overflow-hidden relative">
                                <motion.div initial={{width:0}} animate={{width: `${Math.min(100, (item2Low / Math.max(item1Low, item2Low, 1)) * 100)}%`}} transition={{duration: 0.8, ease: "easeOut", delay: 0.1}} className="h-full rounded-full bg-cyan-500/70 relative z-0" />
                            </div>
                        </div>
                    </div>
                </div>

                <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} transition={{delay: 0.3}} className="bg-[#121218]/90 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-5 flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(0,0,0,0.3)]">
                    <Zap size={20} className={winner === 1 ? 'text-violet-500' : winner === 2 ? 'text-cyan-500' : 'text-slate-500'} />
                    <span className="text-[14px] font-medium text-slate-200">
                        {winner === 1 ? (
                            <><strong className="text-violet-400">{item1Name}</strong> 在该画质下的平均帧数领先约 <strong className="text-violet-300 bg-violet-500/20 px-1.5 py-0.5 rounded">{diffPercent}%</strong> ({diff} FPS)。</>
                        ) : winner === 2 ? (
                            <><strong className="text-cyan-400">{item2Name}</strong> 在该画质下的平均帧数领先约 <strong className="text-cyan-300 bg-cyan-500/20 px-1.5 py-0.5 rounded">{diffPercent}%</strong> ({Math.abs(diff)} FPS)。</>
                        ) : (
                            <>两者的平均帧数表现完全一致，属于同等性能水平。</>
                        )}
                    </span>
                </motion.div>
            </div>
        );
    };

    const renderMultiGameTable = (type: 'cpu' | 'gpu', item1: string, item2: string) => {
        const rows: { game: string; item1Avg: number; item1Low: number; item2Avg: number; item2Low: number }[] = [];

        for (const game of gamesList) {
            const gameData = gamesFpsData[game];
            if (!gameData) continue;
            const data1 = gameData[type][item1]?.[selectedRes];
            const data2 = gameData[type][item2]?.[selectedRes];
            if (data1 && data2) {
                rows.push({ game, item1Avg: data1.avg, item1Low: data1.low, item2Avg: data2.avg, item2Low: data2.low });
            }
        }

        if (rows.length === 0) return null;

        const item1Wins = rows.filter(r => r.item1Avg > r.item2Avg).length;
        const item2Wins = rows.filter(r => r.item2Avg > r.item1Avg).length;
        const ties = rows.length - item1Wins - item2Wins;

        return (
            <motion.div initial={{opacity:0, y:15}} animate={{opacity:1, y:0}} transition={{delay: 0.35}} className="bg-[#121218] rounded-[24px] border border-slate-800 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent"></div>

                {/* Header */}
                <div className="px-6 pt-6 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-violet-500/20 text-violet-400 rounded-lg border border-violet-500/30">
                            <Gamepad2 size={18} />
                        </div>
                        <div>
                            <h3 className="text-[15px] font-bold text-slate-100 tracking-wide">全游戏横评对比</h3>
                            <p className="text-[11px] text-slate-500 mt-0.5">覆盖 {rows.length} 款游戏 · {selectedRes} 画质</p>
                        </div>
                    </div>
                    {/* Win summary pills */}
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-500/30 border border-violet-500/50 shadow-[0_0_10px_rgba(139,92,246,0.2)]">
                            <div className="w-1.5 h-1.5 rounded-full bg-violet-300 shadow-[0_0_5px_rgba(255,255,255,0.8)]"></div>
                            <span className="text-[11px] font-bold text-violet-200 drop-shadow-md">A 胜 {item1Wins}</span>
                        </div>
                        {ties > 0 && <div className="px-2 py-1.5 rounded-full bg-slate-700 border border-slate-600 shadow-sm">
                            <span className="text-[11px] font-bold text-slate-300">平 {ties}</span>
                        </div>}
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500/30 border border-cyan-500/50 shadow-[0_0_10px_rgba(34,211,238,0.2)]">
                            <div className="w-1.5 h-1.5 rounded-full bg-cyan-300 shadow-[0_0_5px_rgba(255,255,255,0.8)]"></div>
                            <span className="text-[11px] font-bold text-cyan-200 drop-shadow-md">B 胜 {item2Wins}</span>
                        </div>
                    </div>
                </div>

                {/* Column labels */}
                <div className="grid grid-cols-[1fr_90px_90px_90px_90px] gap-1 px-6 py-2.5 border-y border-slate-700/80 bg-slate-800/80 text-[11px] font-bold text-slate-300 uppercase tracking-widest shadow-sm">
                    <div>游戏</div>
                    <div className="text-right">A 平均</div>
                    <div className="text-right">A 最低</div>
                    <div className="text-right">B 平均</div>
                    <div className="text-right">B 最低</div>
                </div>

                {/* Rows */}
                <div className="max-h-[520px] overflow-y-auto custom-scrollbar">
                    {rows.map((r) => {
                        const winner = r.item1Avg > r.item2Avg ? 1 : r.item2Avg > r.item1Avg ? 2 : 0;
                        const diff = Math.abs(r.item1Avg - r.item2Avg);
                        const diffPct = Math.max(r.item1Avg, r.item2Avg) > 0 ? ((diff / Math.max(r.item1Avg, r.item2Avg)) * 100).toFixed(0) : '0';
                        return (
                            <div key={r.game} className={`grid grid-cols-[1fr_90px_90px_90px_90px] gap-1 px-6 py-2.5 items-center border-b border-slate-800/40 transition-colors hover:bg-slate-800/30 ${selectedGame === r.game ? 'bg-violet-500/5 border-l-2 border-l-violet-500' : 'border-l-2 border-l-transparent'}`}>
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <img src={`/images/games/icons/${r.game}.png`} alt="" className="w-5 h-5 rounded-[4px] object-cover bg-slate-800 shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                    <span className="text-[14px] font-bold text-slate-200 truncate drop-shadow-sm">{r.game}</span>
                                    {parseInt(diffPct) >= 15 && <span className={`text-[10px] font-black px-1.5 py-0.5 rounded shadow-sm ${winner === 1 ? 'bg-violet-500/30 text-violet-300 border border-violet-500/50' : 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50'}`}>+{diffPct}%</span>}
                                </div>
                                <div className={`text-right font-mono text-[14px] font-black ${winner === 1 ? 'text-violet-400 drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]' : 'text-slate-300'}`}>{r.item1Avg}</div>
                                <div className={`text-right font-mono text-[12px] font-medium ${winner === 1 ? 'text-violet-300/80' : 'text-slate-400'}`}>{r.item1Low}</div>
                                <div className={`text-right font-mono text-[14px] font-black ${winner === 2 ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]' : 'text-slate-300'}`}>{r.item2Avg}</div>
                                <div className={`text-right font-mono text-[12px] font-medium ${winner === 2 ? 'text-cyan-300/80' : 'text-slate-400'}`}>{r.item2Low}</div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer summary */}
                <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <Zap size={16} className={item1Wins > item2Wins ? 'text-violet-500' : item2Wins > item1Wins ? 'text-cyan-500' : 'text-slate-500'} />
                        <span className="text-[13px] font-medium text-slate-400">
                            {item1Wins > item2Wins ? (
                                <><strong className="text-violet-400">{item1}</strong> 在 <strong className="text-white">{rows.length}</strong> 款游戏中赢得 <strong className="text-violet-400">{item1Wins}</strong> 款，综合表现更优。</>
                            ) : item2Wins > item1Wins ? (
                                <><strong className="text-cyan-400">{item2}</strong> 在 <strong className="text-white">{rows.length}</strong> 款游戏中赢得 <strong className="text-cyan-400">{item2Wins}</strong> 款，综合表现更优。</>
                            ) : (
                                <>两者在 <strong className="text-white">{rows.length}</strong> 款游戏中势均力敌，综合实力相当。</>
                            )}
                        </span>
                    </div>
                    {/* Average FPS across all games */}
                    <div className="flex items-center gap-4 text-[11px] font-bold">
                        <span className="text-slate-500">全局均值:</span>
                        <span className="text-violet-400 font-mono">{Math.round(rows.reduce((s, r) => s + r.item1Avg, 0) / rows.length)} FPS</span>
                        <span className="text-slate-600">vs</span>
                        <span className="text-cyan-400 font-mono">{Math.round(rows.reduce((s, r) => s + r.item2Avg, 0) / rows.length)} FPS</span>
                    </div>
                </div>
            </motion.div>
        );
    };

    if (!gamesFpsData[selectedGame] && selectedGame !== '') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500 dark:text-slate-400 bg-[#FAFAFA] dark:bg-[#0B0B10] transition-colors duration-500">
                <Activity size={48} className="mb-4 text-slate-300 dark:text-slate-700" />
                <h2 className="text-xl font-display font-medium tracking-tight">暂无此游戏性能数据</h2>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0B0B10] text-slate-800 dark:text-slate-200 font-sans p-4 sm:p-6 lg:p-8 xl:p-12 transition-colors duration-500 relative overflow-hidden">
            
            <div className="max-w-[1400px] mx-auto relative z-10">
                
                {/* 顶部标题区 */}
                <header className="mb-8 lg:mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-[20px] bg-white dark:bg-[#121218] border border-slate-200 dark:border-[#1E293B] flex items-center justify-center shadow-sm dark:shadow-none">
                            <Gamepad2 className="text-indigo-600 dark:text-indigo-400" size={28} strokeWidth={1.5} />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-white tracking-tight">性能评测中心</h1>
                            <p className="text-[15px] text-slate-500 dark:text-slate-400 mt-1">精准预测您的电脑在不同游戏下的真实表现</p>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8 items-start">
                    
                    {/* === 左侧：战术控制台 === */}
                    <div className="lg:col-span-4 xl:col-span-4 flex flex-col gap-6 relative z-50">
                        {/* 1. 游戏选择器 */}
                        <div className="bg-white dark:bg-[#121218]/90 border border-slate-200 dark:border-violet-500/50 rounded-[24px] shadow-sm dark:shadow-[0_0_30px_rgba(139,92,246,0.1)] relative">
                            {/* Inner gradient container with overflow hidden to not crop corners, while allowing dropdown to escape */}
                            <div className="absolute inset-0 overflow-hidden rounded-[24px] pointer-events-none z-0">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-indigo-500/10 to-transparent rounded-bl-full" />
                            </div>
                            <div className="p-6 relative z-10">
                                <div className="flex items-center gap-3 mb-6 relative z-10">
                                <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                    <Gamepad2 size={22} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">测试目标</h2>
                                    <p className="text-[12px] text-slate-500 mt-0.5">选择要进行帧数测试的游戏</p>
                                </div>
                            </div>
                            
                            <SearchableSelect 
                                options={gamesList}
                                value={selectedGame}
                                onChange={handleSelectGame}
                                placeholder="搜索游戏..."
                                icon={Search}
                                label="选择游戏"
                                isGame={true}
                            />
                            </div>
                        </div>

                        {/* 2. 硬件与模式控制 */}
                        <div className="bg-white dark:bg-[#121218] border border-slate-200 dark:border-[#1E293B] rounded-[24px] p-6 shadow-sm flex flex-col gap-6">
                            {/* Mode Tabs */}
                            <div className="flex p-1.5 bg-slate-50 dark:bg-[#1A1A24] rounded-[14px] border border-slate-200 dark:border-[#2D3748]">
                                <button onClick={() => setActiveMode('config')} className={`flex-1 py-2.5 rounded-[10px] font-bold text-[12px] transition-all flex items-center justify-center gap-1.5 ${activeMode === 'config' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30 border border-indigo-500' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 border border-transparent'}`}><Activity size={14}/> 整机诊断</button>
                                <button onClick={() => setActiveMode('cpu')} className={`flex-1 py-2.5 rounded-[10px] font-bold text-[12px] transition-all flex items-center justify-center gap-1.5 ${activeMode === 'cpu' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30 border border-indigo-500' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 border border-transparent'}`}><Cpu size={14}/> CPU对比</button>
                                <button onClick={() => setActiveMode('gpu')} className={`flex-1 py-2.5 rounded-[10px] font-bold text-[12px] transition-all flex items-center justify-center gap-1.5 ${activeMode === 'gpu' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30 border border-indigo-500' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 border border-transparent'}`}><MonitorPlay size={14}/> GPU对比</button>
                            </div>

                            {/* Selectors */}
                            <div className="flex flex-col gap-5">
                                {activeMode === 'config' ? (
                                    <>
                                        <SearchableSelect options={availableCpus} value={selectedCpu} onChange={setSelectedCpu} placeholder="输入或选择 CPU..." icon={Cpu} label="处理器 (CPU)"/>
                                        <SearchableSelect options={availableGpus} value={selectedGpu} onChange={setSelectedGpu} placeholder="输入或选择 显卡..." icon={MonitorPlay} label="独立显卡 (GPU)"/>
                                    </>
                                ) : activeMode === 'cpu' ? (
                                    <>
                                        <SearchableSelect options={availableCpus} value={selectedCpu} onChange={setSelectedCpu} placeholder="选择处理器 A..." icon={Cpu} label="处理器 (CPU) A"/>
                                        <SearchableSelect options={availableCpus} value={selectedCpu2} onChange={setSelectedCpu2} placeholder="选择处理器 B..." icon={Cpu} label="处理器 (CPU) B"/>
                                    </>
                                ) : (
                                    <>
                                        <SearchableSelect options={availableGpus} value={selectedGpu} onChange={setSelectedGpu} placeholder="选择显卡 A..." icon={MonitorPlay} label="独立显卡 (GPU) A"/>
                                        <SearchableSelect options={availableGpus} value={selectedGpu2} onChange={setSelectedGpu2} placeholder="选择显卡 B..." icon={MonitorPlay} label="独立显卡 (GPU) B"/>
                                    </>
                                )}

                                <div className="relative z-0 mt-2 border-t border-slate-100 dark:border-slate-800 pt-5">
                                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2 ml-1 uppercase tracking-widest">画面分辨率</div>
                                    <div className="flex gap-2 h-[46px] bg-slate-50 dark:bg-[#1A1A24] p-1.5 rounded-xl border border-slate-200 dark:border-[#2D3748] transition-colors">
                                        {(['1080p', '1440p', '4K'] as Resolution[]).map(res => (
                                            <button
                                                key={res}
                                                onClick={() => setSelectedRes(res)}
                                                className={`flex-1 rounded-[8px] font-medium text-[13px] transition-all ${
                                                    selectedRes === res 
                                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30 border border-indigo-500' 
                                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-white/5 border border-transparent'
                                                }`}
                                            >
                                                {res}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="mt-4 text-[11px] text-slate-500 dark:text-slate-400 bg-amber-50/80 dark:bg-amber-900/10 p-3 rounded-xl border border-amber-100/50 dark:border-amber-800/20 flex items-start gap-2 leading-relaxed">
                                        <div className="text-amber-500 mt-0.5"><Activity size={14} /></div>
                                        <div>
                                            <span className="font-bold text-amber-700 dark:text-amber-500">基准：最高/超级画质。</span>
                                            实际游玩若用中低画质，帧率将大幅提升。
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* === 右侧：数据看板 === */}
                    <div className="lg:col-span-8 xl:col-span-8 flex flex-col gap-6">
                        
                        {/* 主数据区 */}
                        {activeMode === 'config' ? (
                            <div className="flex flex-col gap-6">
                                {/* Hero Metrics: 双卡片并列设计 */}
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                    
                                    {/* 左侧：平均帧数 (主卡) */}
                                    <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} transition={{delay: 0.1}} className="md:col-span-6 bg-[#121218]/90 backdrop-blur-xl border border-violet-500/20 rounded-[24px] shadow-[0_0_40px_rgba(139,92,246,0.05)] p-6 sm:p-8 lg:p-10 relative overflow-hidden group hover:scale-[1.01] transition-all duration-300">
                                        {/* 网格底纹 */}
                                        <div className="absolute inset-0 bg-[url('/images/grid-pattern.svg')] opacity-10 pointer-events-none mix-blend-overlay"></div>
                                        
                                        {/* 顶部标签与评级 */}
                                        <div className="flex justify-between items-start mb-8 relative z-10">
                                            <div className="flex items-center gap-2 text-violet-400">
                                                <GaugeCircle size={18} />
                                                <span className="text-[13px] font-bold tracking-widest uppercase">平均画面帧数 / AVG FPS</span>
                                            </div>
                                            
                                            <div className={`px-4 py-1.5 rounded-full border flex items-center gap-2 backdrop-blur-md ${scoreStyle.bg} ${scoreStyle.border} ${scoreStyle.shadow}`}>
                                                <div className={`w-2 h-2 rounded-full animate-pulse ${scoreStyle.text.replace('text-', 'bg-')}`} />
                                                <span className={`text-[12px] font-bold uppercase tracking-widest ${scoreStyle.text}`}>{rating.label}</span>
                                            </div>
                                        </div>

                                        {/* 巨大数值 */}
                                        <div className="flex items-baseline gap-3 relative z-10">
                                            <motion.div className={`text-[5rem] sm:text-[6rem] lg:text-[7rem] font-mono leading-[0.8] font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-b ${scoreStyle.gradient} drop-shadow-lg`}>
                                                <BouncyNumber value={result.avg} />
                                            </motion.div>
                                            <span className={`text-2xl font-mono font-bold ${scoreStyle.text} opacity-60 tracking-widest`}>FPS</span>
                                        </div>
                                    </motion.div>

                                    {/* 右侧：1% Low (副卡) */}
                                    <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} transition={{delay: 0.2}} className="md:col-span-6 bg-[#121218]/80 backdrop-blur-xl border border-cyan-500/20 rounded-[24px] shadow-[0_0_30px_rgba(34,211,238,0.05)] p-6 sm:p-8 lg:p-10 flex flex-col justify-between relative overflow-hidden group hover:scale-[1.01] transition-all duration-300">
                                        <div className="absolute inset-0 bg-[url('/images/grid-pattern.svg')] opacity-5 pointer-events-none mix-blend-overlay"></div>
                                        
                                        <div className="flex items-center gap-2 text-cyan-400 mb-6 relative z-10">
                                            <TrendingUp size={18} />
                                            <span className="text-[13px] font-bold tracking-widest uppercase">1% Low / 最低帧</span>
                                        </div>

                                        <div className="flex items-baseline gap-2 relative z-10 mt-auto">
                                            <motion.div className={`text-[5rem] sm:text-[6rem] lg:text-[7rem] font-mono leading-[0.8] font-black tracking-tighter text-slate-100 drop-shadow-md`}>
                                                <BouncyNumber value={result.low} />
                                            </motion.div>
                                            <span className={`text-xl font-mono font-bold text-slate-500 tracking-widest`}>FPS</span>
                                        </div>
                                    </motion.div>
                                </div>

                                {/* 木桶效应可视化 - 科技仪表盘风格 */}
                                <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} transition={{delay: 0.3}} className="bg-[#121218] rounded-[24px] p-6 sm:p-8 lg:p-10 border border-slate-800 shadow-xl relative overflow-hidden">
                                    <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent"></div>
                                    
                                    <div className="flex items-center gap-3 mb-8">
                                        <div className="p-2 bg-violet-500/20 text-violet-400 rounded-lg border border-violet-500/30 shadow-[0_0_15px_rgba(139,92,246,0.2)]">
                                            <Activity size={18} />
                                        </div>
                                        <h3 className="text-[16px] font-bold text-slate-100 tracking-wide">性能瓶颈分析引擎 <span className="text-violet-500 text-[12px] ml-2 animate-pulse">● ACTIVE</span></h3>
                                    </div>

                                    <div className="space-y-8">
                                        {/* CPU Bar */}
                                        <div className="relative">
                                            <div className="flex justify-between items-end mb-3">
                                                <div className="flex items-center gap-2">
                                                    <Cpu size={16} className="text-slate-400" />
                                                    <span className="text-[14px] font-mono font-bold text-slate-300">{selectedCpu}</span>
                                                    {result.isCpuBottleneck && <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/50 rounded-[4px] ml-2 shadow-[0_0_10px_rgba(244,63,94,0.3)] uppercase tracking-wider">Bottleneck</span>}
                                                </div>
                                                <div className="text-[15px] font-mono font-bold text-white">{result.cAvg} <span className="text-[11px] font-sans text-slate-500 font-normal">MAX FPS</span></div>
                                            </div>
                                            {/* 科技感刻度进度条 */}
                                            <div className="h-4 w-full bg-[#0B0B10] rounded-[4px] overflow-hidden border border-slate-800 relative">
                                                <div className="absolute inset-0 bg-[url('/images/scanlines.png')] opacity-30 mix-blend-overlay z-10 pointer-events-none"></div>
                                                <motion.div 
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${Math.min(100, (result.cAvg / 300) * 100)}%` }}
                                                    className={`h-full absolute left-0 top-0 transition-all duration-1000 ease-out z-0 border-r-2 ${result.isCpuBottleneck ? 'bg-gradient-to-r from-rose-900/50 to-rose-500 border-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.6)]' : 'bg-gradient-to-r from-violet-900/50 to-violet-600 border-violet-300 shadow-[0_0_15px_rgba(139,92,246,0.4)]'}`} 
                                                />
                                                {/* 刻度线遮罩 */}
                                                <div className="absolute inset-0 w-full h-full z-20 flex justify-between px-1 pointer-events-none opacity-20">
                                                    {[...Array(20)].map((_, i) => <div key={i} className="w-px h-full bg-white"></div>)}
                                                </div>
                                            </div>
                                        </div>

                                        {/* GPU Bar */}
                                        <div className="relative">
                                            <div className="flex justify-between items-end mb-3">
                                                <div className="flex items-center gap-2">
                                                    <MonitorPlay size={16} className="text-slate-400" />
                                                    <span className="text-[14px] font-mono font-bold text-slate-300">{selectedGpu}</span>
                                                    {!result.isCpuBottleneck && <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/50 rounded-[4px] ml-2 shadow-[0_0_10px_rgba(244,63,94,0.3)] uppercase tracking-wider">Bottleneck</span>}
                                                </div>
                                                <div className="text-[15px] font-mono font-bold text-white">{result.gAvg} <span className="text-[11px] font-sans text-slate-500 font-normal">MAX FPS</span></div>
                                            </div>
                                            <div className="h-4 w-full bg-[#0B0B10] rounded-[4px] overflow-hidden border border-slate-800 relative">
                                                <div className="absolute inset-0 bg-[url('/images/scanlines.png')] opacity-30 mix-blend-overlay z-10 pointer-events-none"></div>
                                                <motion.div 
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${Math.min(100, (result.gAvg / 300) * 100)}%` }}
                                                    className={`h-full absolute left-0 top-0 transition-all duration-1000 ease-out z-0 border-r-2 ${!result.isCpuBottleneck ? 'bg-gradient-to-r from-rose-900/50 to-rose-500 border-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.6)]' : 'bg-gradient-to-r from-cyan-900/50 to-cyan-600 border-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.4)]'}`} 
                                                />
                                                <div className="absolute inset-0 w-full h-full z-20 flex justify-between px-1 pointer-events-none opacity-20">
                                                    {[...Array(20)].map((_, i) => <div key={i} className="w-px h-full bg-white"></div>)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-8 pt-5 border-t border-slate-800/80">
                                        <p className="text-[14px] text-slate-400 leading-relaxed font-medium">
                                            {result.diff < 10 ? (
                                                "SYS_STATUS: 最佳均衡状态。CPU与GPU负载均等，算力分配完美。"
                                            ) : result.isCpuBottleneck ? (
                                                <><strong className="text-rose-400 font-bold">WARN: CPU 算力已达极限。</strong> 显卡仍有巨大性能冗余。建议提升画面分辨率/画质以榨干GPU，或升级处理器。</>
                                            ) : (
                                                <><strong className="text-rose-400 font-bold">WARN: GPU 满载导致帧率受限。</strong> 处理器算力过剩。建议适当降低特效质量或开启DLSS/FSR，亦可考虑升级显卡。</>
                                            )}
                                        </p>
                                    </div>
                                </motion.div>
                            </div>
                        ) : activeMode === 'cpu' ? (
                            <div className="w-full flex flex-col gap-6">
                                {renderComparisonCard(selectedCpu, gamesFpsData[selectedGame]?.cpu[selectedCpu]?.[selectedRes], selectedCpu2, gamesFpsData[selectedGame]?.cpu[selectedCpu2]?.[selectedRes])}
                                {renderMultiGameTable('cpu', selectedCpu, selectedCpu2)}
                            </div>
                        ) : (
                            <div className="w-full flex flex-col gap-6">
                                {renderComparisonCard(selectedGpu, gamesFpsData[selectedGame]?.gpu[selectedGpu]?.[selectedRes], selectedGpu2, gamesFpsData[selectedGame]?.gpu[selectedGpu2]?.[selectedRes])}
                                {renderMultiGameTable('gpu', selectedGpu, selectedGpu2)}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
