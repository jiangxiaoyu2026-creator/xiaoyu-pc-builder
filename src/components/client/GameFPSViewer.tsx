import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Gamepad2, Cpu, MonitorPlay, TrendingUp, GaugeCircle, Activity, ChevronDown, Search, Zap } from 'lucide-react';
import { motion, useMotionValue, animate, useTransform } from 'framer-motion';
import { gamesFpsData, gamesList, cpuList, gpuList, Resolution } from '../../data/gameFpsData';
import { cpuSpecs } from '../../data/cpuSpecsData';
import { gpuSpecs } from '../../data/gpuSpecsData';
import { ComparisonCard } from './ComparisonCard';

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
            gradient: 'from-[#5B5CE6] to-indigo-500', 
            text: 'text-indigo-600', 
            bg: 'bg-indigo-50',
            border: 'border-indigo-100',
            shadow: 'shadow-[0_4px_20px_rgba(91,92,230,0.15)]'
        };
        if (fps >= 144) return { 
            gradient: 'from-blue-500 to-cyan-500', 
            text: 'text-blue-600', 
            bg: 'bg-blue-50',
            border: 'border-blue-100',
            shadow: 'shadow-[0_4px_20px_rgba(59,130,246,0.15)]'
        };
        if (fps >= 60) return { 
            gradient: 'from-emerald-500 to-teal-500', 
            text: 'text-emerald-600', 
            bg: 'bg-emerald-50',
            border: 'border-emerald-100',
            shadow: 'shadow-[0_4px_20px_rgba(16,185,129,0.15)]'
        };
        return { 
            gradient: 'from-orange-500 to-red-500', 
            text: 'text-orange-600', 
            bg: 'bg-orange-50',
            border: 'border-orange-100',
            shadow: 'shadow-[0_4px_20px_rgba(249,115,22,0.15)]'
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

    // renderComparisonCard removed, using imported ComparisonCard component

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
            <motion.div initial={{opacity:0, y:15}} animate={{opacity:1, y:0}} transition={{delay: 0.35}} className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden mt-6">
                
                {/* Header */}
                <div className="px-6 pt-6 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
                            <Gamepad2 size={18} />
                        </div>
                        <div>
                            <h3 className="text-[15px] font-bold text-slate-800 tracking-wide">全游戏横评对比</h3>
                            <p className="text-[11px] text-slate-500 mt-0.5">覆盖 {rows.length} 款游戏 · {selectedRes} 画质</p>
                        </div>
                    </div>
                    {/* Win summary pills */}
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_5px_rgba(91,92,230,0.4)]"></div>
                            <span className="text-[11px] font-bold text-indigo-600">A 胜 {item1Wins}</span>
                        </div>
                        {ties > 0 && <div className="px-2 py-1.5 rounded-full bg-slate-100 border border-slate-200">
                            <span className="text-[11px] font-bold text-slate-600">平 {ties}</span>
                        </div>}
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-100">
                            <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_5px_rgba(249,115,22,0.4)]"></div>
                            <span className="text-[11px] font-bold text-orange-600">B 胜 {item2Wins}</span>
                        </div>
                    </div>
                </div>

                {/* Column labels + Rows - horizontal scroll on mobile */}
                <div className="overflow-x-auto">
                <div className="min-w-[580px]">
                <div className="grid grid-cols-[1fr_80px_80px_80px_80px] sm:grid-cols-[1fr_90px_90px_90px_90px] gap-1 px-6 py-2.5 border-y border-slate-700/80 bg-slate-800/80 text-[11px] font-bold text-slate-300 uppercase tracking-widest shadow-sm">
                    <div>游戏</div>
                    <div className="text-right">A 平均</div>
                    <div className="text-right">A 最低</div>
                    <div className="text-right">B 平均</div>
                    <div className="text-right">B 最低</div>
                </div>

                {/* Rows */}
                <div className="flex flex-col max-h-[520px] overflow-y-auto custom-scrollbar">
                    {rows.map((row, idx) => {
                        const aWinAvg = row.item1Avg > row.item2Avg;
                        const bWinAvg = row.item2Avg > row.item1Avg;
                        const aWinLow = row.item1Low > row.item2Low;
                        const bWinLow = row.item2Low > row.item1Low;
                        
                        return (
                            <div key={row.game} className={`grid grid-cols-[1fr_80px_80px_80px_80px] sm:grid-cols-[1fr_90px_90px_90px_90px] gap-1 px-6 py-3.5 items-center border-b border-slate-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-slate-100 transition-colors`}>
                                <div className="text-[13px] font-bold text-slate-800 truncate">{row.game}</div>
                                <div className={`text-right font-mono text-[13px] sm:text-[14px] ${aWinAvg ? 'text-indigo-600 font-bold bg-indigo-50/50 py-1 rounded' : 'text-slate-500'}`}>{row.item1Avg}</div>
                                <div className={`text-right font-mono text-[11px] sm:text-[12px] ${aWinLow ? 'text-indigo-500 font-medium' : 'text-slate-400'}`}>{row.item1Low}</div>
                                <div className={`text-right font-mono text-[13px] sm:text-[14px] ${bWinAvg ? 'text-orange-600 font-bold bg-orange-50/50 py-1 rounded' : 'text-slate-500'}`}>{row.item2Avg}</div>
                                <div className={`text-right font-mono text-[11px] sm:text-[12px] ${bWinLow ? 'text-orange-500 font-medium' : 'text-slate-400'}`}>{row.item2Low}</div>
                            </div>
                        );
                    })}
                </div>
                </div>
                </div>

                {/* Footer summary */}
                <div className="px-6 py-5 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                        <Zap size={18} className={item1Wins > item2Wins ? 'text-indigo-500' : item2Wins > item1Wins ? 'text-orange-500' : 'text-slate-400'} />
                        <span className="text-[14px] font-medium text-slate-600">
                            {item1Wins > item2Wins ? (
                                <><strong className="text-indigo-600">{item1}</strong> 在 <strong className="text-slate-800">{rows.length}</strong> 款游戏中赢得 <strong className="text-indigo-600 bg-indigo-100 px-1 rounded">{item1Wins}</strong> 款，综合表现更优。</>
                            ) : item2Wins > item1Wins ? (
                                <><strong className="text-orange-600">{item2}</strong> 在 <strong className="text-slate-800">{rows.length}</strong> 款游戏中赢得 <strong className="text-orange-600 bg-orange-100 px-1 rounded">{item2Wins}</strong> 款，综合表现更优。</>
                            ) : (
                                <>两者在 <strong className="text-slate-800">{rows.length}</strong> 款游戏中势均力敌，综合实力相当。</>
                            )}
                        </span>
                    </div>
                    {/* Average FPS across all games */}
                    <div className="flex items-center gap-4 text-[12px] font-bold shrink-0">
                        <span className="text-slate-500">全局均值:</span>
                        <span className="text-indigo-600 font-mono text-[13px]">{Math.round(rows.reduce((s, r) => s + r.item1Avg, 0) / rows.length)} FPS</span>
                        <span className="text-slate-400">vs</span>
                        <span className="text-orange-600 font-mono text-[13px]">{Math.round(rows.reduce((s, r) => s + r.item2Avg, 0) / rows.length)} FPS</span>
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
        <div className="min-h-screen bg-[#FAFAFA] text-slate-800 font-sans p-4 sm:p-6 lg:p-8 xl:p-12 transition-colors duration-500 relative overflow-hidden">
            
            <div className="max-w-[1400px] mx-auto relative z-10">
                
                {/* 顶部标题区 */}
                <header className="mb-8 lg:mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-[20px] bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                            <Gamepad2 className="text-indigo-600" size={28} strokeWidth={1.5} />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 tracking-tight">性能评测中心</h1>
                            <p className="text-[15px] text-slate-500 mt-1">精准预测您的电脑在不同游戏下的真实表现</p>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8 items-start">
                    
                    {/* === 左侧：战术控制台 === */}
                    <div className="lg:col-span-4 xl:col-span-4 flex flex-col gap-6 relative z-50 lg:sticky lg:top-6 lg:self-start">
                        {/* 1. 游戏选择器 */}
                        <div className="bg-white border border-slate-200 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative">
                            {/* Inner gradient container with overflow hidden to not crop corners, while allowing dropdown to escape */}
                            <div className="absolute inset-0 overflow-hidden rounded-[24px] pointer-events-none z-0">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-indigo-500/10 to-transparent rounded-bl-full" />
                            </div>
                            <div className="p-6 relative z-10">
                                <div className="flex items-center gap-3 mb-6 relative z-10">
                                <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
                                    <Gamepad2 size={22} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900 leading-tight">测试目标</h2>
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
                        <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col gap-6">
                            {/* Mode Tabs */}
                            <div className="flex p-1.5 bg-slate-50 rounded-[14px] border border-slate-200">
                                <button onClick={() => setActiveMode('config')} className={`flex-1 py-2.5 rounded-[10px] font-bold text-[12px] transition-all flex items-center justify-center gap-1.5 ${activeMode === 'config' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30 border border-indigo-500' : 'text-slate-500 hover:text-slate-700 border border-transparent'}`}><Activity size={14}/> 整机诊断</button>
                                <button onClick={() => setActiveMode('cpu')} className={`flex-1 py-2.5 rounded-[10px] font-bold text-[12px] transition-all flex items-center justify-center gap-1.5 ${activeMode === 'cpu' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30 border border-indigo-500' : 'text-slate-500 hover:text-slate-700 border border-transparent'}`}><Cpu size={14}/> CPU对比</button>
                                <button onClick={() => setActiveMode('gpu')} className={`flex-1 py-2.5 rounded-[10px] font-bold text-[12px] transition-all flex items-center justify-center gap-1.5 ${activeMode === 'gpu' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30 border border-indigo-500' : 'text-slate-500 hover:text-slate-700 border border-transparent'}`}><MonitorPlay size={14}/> GPU对比</button>
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

                                <div className="relative z-0 mt-2 border-t border-slate-100 pt-5">
                                    <div className="text-[11px] font-bold text-slate-500 mb-2 ml-1 uppercase tracking-widest">画面分辨率</div>
                                    <div className="flex gap-2 h-[46px] bg-slate-50 p-1.5 rounded-xl border border-slate-200 transition-colors">
                                        {(['1080p', '1440p', '4K'] as Resolution[]).map(res => (
                                            <button
                                                key={res}
                                                onClick={() => setSelectedRes(res)}
                                                className={`flex-1 rounded-[8px] font-medium text-[13px] transition-all ${
                                                    selectedRes === res 
                                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30 border border-indigo-500' 
                                                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/50 border border-transparent'
                                                }`}
                                            >
                                                {res}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="mt-4 text-[11px] text-slate-500 bg-amber-50/80 p-3 rounded-xl border border-amber-100/50 flex items-start gap-2 leading-relaxed">
                                        <div className="text-amber-500 mt-0.5"><Activity size={14} /></div>
                                        <div>
                                            <span className="font-bold text-amber-700">基准：最高/超级画质。</span>
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
                                    
                                    {/* 平均 FPS Card */}
                                    <div className="md:col-span-6 bg-white rounded-[24px] border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 md:p-8 flex flex-col justify-between relative overflow-hidden group">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-indigo-300"></div>
                                        <div className="flex justify-between items-start mb-4 relative z-10">
                                            <div className="flex items-center gap-2 text-slate-500">
                                                <Activity size={18} />
                                                <span className="text-[13px] font-bold tracking-wider uppercase">平均画面帧数 / AVG FPS</span>
                                            </div>
                                            <div className={`px-3 py-1 rounded-full text-[11px] font-bold ${scoreStyle.bg} ${scoreStyle.text} border ${scoreStyle.border} ${scoreStyle.shadow}`}>
                                                <div className="flex items-center gap-1.5">
                                                    <div className={`w-1.5 h-1.5 rounded-full bg-current animate-pulse`}></div>
                                                    {rating.label}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-4 relative z-10">
                                            <div className={`text-6xl md:text-8xl font-black font-mono tracking-tighter bg-clip-text text-transparent bg-gradient-to-br ${scoreStyle.gradient} leading-none`}>
                                                <BouncyNumber value={result.avg} />
                                                <span className="text-2xl md:text-3xl font-sans tracking-normal opacity-60 ml-2">FPS</span>
                                            </div>
                                        </div>
                                        <div className={`absolute -bottom-10 -right-10 w-40 h-40 bg-gradient-to-br ${scoreStyle.gradient} opacity-5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700`}></div>
                                    </div>

                                    {/* 1% Low Card */}
                                    <div className="md:col-span-6 bg-white rounded-[24px] border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 md:p-8 flex flex-col justify-between relative overflow-hidden group">
                                        <div className="flex items-center gap-2 text-slate-500 mb-4 relative z-10">
                                            <TrendingUp size={18} />
                                            <span className="text-[13px] font-bold tracking-wider uppercase">1% LOW / 最低帧</span>
                                        </div>
                                        <div className="mt-4 relative z-10">
                                            <div className="text-6xl md:text-8xl font-black font-mono tracking-tighter text-slate-700 leading-none drop-shadow-sm">
                                                <BouncyNumber value={result.low} />
                                                <span className="text-2xl md:text-3xl font-sans tracking-normal opacity-40 ml-2">FPS</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Bottleneck Analysis */}
                                <div className="bg-white rounded-[24px] border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 md:p-8 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                                    <div className="flex items-center gap-3 mb-8 relative z-10">
                                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100 shadow-sm">
                                            <GaugeCircle size={20} />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-800 tracking-wide flex items-center gap-3">
                                            性能瓶颈分析引擎
                                            <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200 flex items-center gap-1.5 uppercase tracking-widest"><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></div> ACTIVE</span>
                                        </h3>
                                    </div>

                                    <div className="space-y-8 relative z-10">
                                        {/* CPU Bar */}
                                        <div className="flex flex-col gap-2 relative">
                                            <div className="flex justify-between text-[13px] font-bold font-display">
                                                <div className="flex items-center gap-2 text-slate-800">
                                                    <Cpu size={16} className="text-slate-500" /> {selectedCpu}
                                                </div>
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-[14px] text-slate-800 font-mono">{result.cAvg}</span>
                                                    <span className="text-[10px] text-slate-500 uppercase tracking-widest">MAX FPS</span>
                                                </div>
                                            </div>
                                            <div className="h-3.5 w-full bg-slate-100 border border-slate-200 rounded-full overflow-hidden relative">
                                                <motion.div initial={{width:0}} animate={{width: `${Math.min(100, (result.cAvg / Math.max(result.cAvg, result.gAvg)) * 100)}%`}} transition={{duration: 1, ease: "easeOut"}} className={`h-full rounded-full ${result.isCpuBottleneck ? 'bg-gradient-to-r from-red-400 to-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-gradient-to-r from-indigo-400 to-indigo-500'}`} />
                                            </div>
                                            {result.isCpuBottleneck && (
                                                <div className="absolute top-0 left-[200px] -translate-y-0.5">
                                                    <div className="bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm"><Zap size={10} /> BOTTLENECK</div>
                                                </div>
                                            )}
                                        </div>

                                        {/* GPU Bar */}
                                        <div className="flex flex-col gap-2 relative">
                                            <div className="flex justify-between text-[13px] font-bold font-display">
                                                <div className="flex items-center gap-2 text-slate-800">
                                                    <MonitorPlay size={16} className="text-slate-500" /> {selectedGpu}
                                                </div>
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-[14px] text-slate-800 font-mono">{result.gAvg}</span>
                                                    <span className="text-[10px] text-slate-500 uppercase tracking-widest">MAX FPS</span>
                                                </div>
                                            </div>
                                            <div className="h-3.5 w-full bg-slate-100 border border-slate-200 rounded-full overflow-hidden relative">
                                                <motion.div initial={{width:0}} animate={{width: `${Math.min(100, (result.gAvg / Math.max(result.cAvg, result.gAvg)) * 100)}%`}} transition={{duration: 1, ease: "easeOut", delay: 0.2}} className={`h-full rounded-full ${!result.isCpuBottleneck ? 'bg-gradient-to-r from-red-400 to-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-gradient-to-r from-indigo-400 to-indigo-500'}`} />
                                            </div>
                                            {!result.isCpuBottleneck && (
                                                <div className="absolute top-0 left-[200px] -translate-y-0.5">
                                                    <div className="bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm"><Zap size={10} /> BOTTLENECK</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="mt-8 pt-5 border-t border-slate-100 flex gap-3 items-start relative z-10">
                                        <div className="text-red-500 mt-0.5"><Activity size={16} /></div>
                                        <p className="text-[13px] text-slate-600 leading-relaxed font-medium">
                                            {result.diff < 10 ? (
                                                "SYS_STATUS: 最佳均衡状态。CPU与GPU负载均等，算力分配完美。"
                                            ) : result.isCpuBottleneck ? (
                                                <><strong className="text-red-500 font-bold">WARN: CPU 算力已达极限。</strong> 显卡仍有巨大性能冗余。建议提升画面分辨率/画质以榨干GPU，或升级处理器。</>
                                            ) : (
                                                <><strong className="text-red-500 font-bold">WARN: GPU 满载导致帧率受限。</strong> 处理器算力过剩。建议适当降低特效质量或开启DLSS/FSR，亦可考虑升级显卡。</>
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : activeMode === 'cpu' ? (
                            <div className="w-full flex flex-col gap-6">
                                <ComparisonCard 
                                    item1Name={selectedCpu}
                                    item1Data={gamesFpsData[selectedGame]?.cpu[selectedCpu]?.[selectedRes]}
                                    item2Name={selectedCpu2}
                                    item2Data={gamesFpsData[selectedGame]?.cpu[selectedCpu2]?.[selectedRes]}
                                    item1Specs={cpuSpecs[selectedCpu]}
                                    item2Specs={cpuSpecs[selectedCpu2]}
                                />
                                {renderMultiGameTable('cpu', selectedCpu, selectedCpu2)}
                            </div>
                        ) : (
                            <div className="w-full flex flex-col gap-6">
                                <ComparisonCard 
                                    item1Name={selectedGpu}
                                    item1Data={gamesFpsData[selectedGame]?.gpu[selectedGpu]?.[selectedRes]}
                                    item2Name={selectedGpu2}
                                    item2Data={gamesFpsData[selectedGame]?.gpu[selectedGpu2]?.[selectedRes]}
                                    item1Specs={gpuSpecs[selectedGpu]}
                                    item2Specs={gpuSpecs[selectedGpu2]}
                                />
                                {renderMultiGameTable('gpu', selectedGpu, selectedGpu2)}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
