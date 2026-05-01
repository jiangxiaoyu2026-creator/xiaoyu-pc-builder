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
                                    className={`px-3 py-2.5 text-sm font-medium rounded-lg cursor-pointer transition-all flex items-center justify-between ${
                                        opt === value 
                                        ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300' 
                                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                                    }`}
                                >
                                    <span className="truncate pr-4 flex items-center gap-2">
                                        {isGame && <img src={`/images/games/icons/${opt}.png`} alt="" className="w-5 h-5 rounded-[4px] object-cover bg-slate-100 dark:bg-slate-800 shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
                                        <span className="truncate">{opt}</span>
                                    </span>
                                    {opt === value && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.5)] shrink-0" />}
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
            gradient: 'from-violet-600 to-indigo-600 dark:from-[#C084FC] dark:to-[#818CF8]', 
            text: 'text-violet-600 dark:text-[#C084FC]', 
            bg: 'bg-violet-50 dark:bg-violet-500/10',
            border: 'border-violet-200 dark:border-violet-500/20'
        };
        if (fps >= 144) return { 
            gradient: 'from-sky-500 to-blue-600 dark:from-[#38BDF8] dark:to-[#3B82F6]', 
            text: 'text-sky-600 dark:text-[#38BDF8]', 
            bg: 'bg-sky-50 dark:bg-sky-500/10',
            border: 'border-sky-200 dark:border-sky-500/20'
        };
        if (fps >= 60) return { 
            gradient: 'from-emerald-500 to-teal-600 dark:from-[#34D399] dark:to-[#10B981]', 
            text: 'text-emerald-600 dark:text-[#34D399]', 
            bg: 'bg-emerald-50 dark:bg-emerald-500/10',
            border: 'border-emerald-200 dark:border-emerald-500/20'
        };
        return { 
            gradient: 'from-orange-500 to-red-500 dark:from-[#FB923C] dark:to-[#EF4444]', 
            text: 'text-orange-600 dark:text-[#FB923C]', 
            bg: 'bg-orange-50 dark:bg-orange-500/10',
            border: 'border-orange-200 dark:border-orange-500/20'
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
            <div className="flex flex-col gap-6 mt-4">
                <div className="rounded-2xl bg-white dark:bg-[#121218] border border-slate-200 dark:border-[#1E293B] shadow-sm relative flex flex-col p-6 sm:p-8">
                    {/* Headers for A and B */}
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3 w-1/2 pr-2">
                            <div className="w-3 h-3 shrink-0 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                            <div className="min-w-0">
                                <div className="text-[12px] text-slate-500 font-bold mb-0.5">测试对象 A</div>
                                <div className="text-[15px] font-bold text-slate-900 dark:text-white truncate" title={item1Name}>{item1Name}</div>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 w-1/2 pl-2 text-right">
                            <div className="min-w-0">
                                <div className="text-[12px] text-slate-500 font-bold mb-0.5">测试对象 B</div>
                                <div className="text-[15px] font-bold text-slate-900 dark:text-white truncate" title={item2Name}>{item2Name}</div>
                            </div>
                            <div className="w-3 h-3 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                        </div>
                    </div>

                    {/* Average FPS Bars */}
                    <div className="mb-6">
                        <div className="flex justify-between items-end mb-2.5">
                            <div className="text-[13px] text-slate-500 font-bold flex items-center gap-2">
                                平均帧数
                                {winner !== 0 && (
                                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400">差距 {diffPercent}%</span>
                                )}
                            </div>
                            <div className="flex gap-3 sm:gap-4 font-display font-bold items-center">
                                <div className={`text-xl ${winner === 1 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-200'}`}><BouncyNumber value={item1Avg} /> <span className="text-[10px] font-sans opacity-50">FPS</span></div>
                                <div className="text-[11px] text-slate-300 dark:text-slate-600 uppercase tracking-widest font-sans">vs</div>
                                <div className={`text-xl ${winner === 2 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}`}><BouncyNumber value={item2Avg} /> <span className="text-[10px] font-sans opacity-50">FPS</span></div>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <div className="h-3.5 w-full bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden">
                                <motion.div initial={{width:0}} animate={{width: `${Math.min(100, (item1Avg / Math.max(item1Avg, item2Avg, 1)) * 100)}%`}} transition={{duration: 0.8, ease: "easeOut"}} className="h-full rounded-full bg-indigo-500 shadow-[inset_-2px_0_4px_rgba(0,0,0,0.1)] relative" />
                            </div>
                            <div className="h-3.5 w-full bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden">
                                <motion.div initial={{width:0}} animate={{width: `${Math.min(100, (item2Avg / Math.max(item1Avg, item2Avg, 1)) * 100)}%`}} transition={{duration: 0.8, ease: "easeOut"}} className="h-full rounded-full bg-emerald-500 shadow-[inset_-2px_0_4px_rgba(0,0,0,0.1)] relative" />
                            </div>
                        </div>
                    </div>

                    {/* 1% Low Bars */}
                    <div className="pt-4 border-t border-slate-100 dark:border-[#1E293B]">
                        <div className="flex justify-between items-end mb-2.5">
                            <div className="text-[12px] text-slate-500 font-bold">1% Low 最低帧</div>
                            <div className="flex gap-3 sm:gap-4 font-display font-bold items-center">
                                <div className={`text-lg ${winner === 1 ? 'text-indigo-500/80 dark:text-indigo-400/80' : 'text-slate-600 dark:text-slate-400'}`}><BouncyNumber value={item1Low} /> <span className="text-[10px] font-sans opacity-50">FPS</span></div>
                                <div className="text-[10px] text-slate-300 dark:text-slate-600 uppercase tracking-widest font-sans">vs</div>
                                <div className={`text-lg ${winner === 2 ? 'text-emerald-500/80 dark:text-emerald-400/80' : 'text-slate-600 dark:text-slate-400'}`}><BouncyNumber value={item2Low} /> <span className="text-[10px] font-sans opacity-50">FPS</span></div>
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden">
                                <motion.div initial={{width:0}} animate={{width: `${Math.min(100, (item1Low / Math.max(item1Low, item2Low, 1)) * 100)}%`}} transition={{duration: 0.8, ease: "easeOut", delay: 0.1}} className="h-full rounded-full bg-indigo-400/70 relative" />
                            </div>
                            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden">
                                <motion.div initial={{width:0}} animate={{width: `${Math.min(100, (item2Low / Math.max(item1Low, item2Low, 1)) * 100)}%`}} transition={{duration: 0.8, ease: "easeOut", delay: 0.1}} className="h-full rounded-full bg-emerald-400/70 relative" />
                            </div>
                        </div>
                    </div>
                </div>

                <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} transition={{delay: 0.3}} className="bg-slate-50 dark:bg-[#1A1A24] border border-slate-200 dark:border-[#1E293B] rounded-2xl p-5 flex items-center justify-center gap-3">
                    <Zap size={20} className={winner === 1 ? 'text-indigo-500' : winner === 2 ? 'text-emerald-500' : 'text-slate-400'} />
                    <span className="text-[14px] font-medium text-slate-700 dark:text-slate-300">
                        {winner === 1 ? (
                            <><strong className="text-indigo-600 dark:text-indigo-400">{item1Name}</strong> 在该画质下的平均帧数领先约 <strong className="text-indigo-600 dark:text-indigo-400">{diffPercent}%</strong> ({diff} FPS)。</>
                        ) : winner === 2 ? (
                            <><strong className="text-emerald-600 dark:text-emerald-400">{item2Name}</strong> 在该画质下的平均帧数领先约 <strong className="text-emerald-600 dark:text-emerald-400">{diffPercent}%</strong> ({Math.abs(diff)} FPS)。</>
                        ) : (
                            <>两者的平均帧数表现完全一致，属于同等性能水平。</>
                        )}
                    </span>
                </motion.div>
            </div>
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
                        <div className="bg-white dark:bg-[#121218] border-2 border-indigo-500/30 dark:border-indigo-500/50 rounded-[24px] shadow-lg shadow-indigo-500/10 dark:shadow-[0_0_30px_rgba(99,102,241,0.15)] relative">
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
                        
                        {/* 所选游戏展示横幅 */}
                        <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} className="relative overflow-hidden rounded-[24px] bg-white dark:bg-[#121218] border border-slate-200 dark:border-[#1E293B] h-[160px] sm:h-[180px] flex items-center shadow-sm transition-colors duration-300">
                            <div className="absolute inset-0 z-0 opacity-[0.03] dark:opacity-[0.15] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-600 via-transparent to-transparent"></div>
                            
                            {/* 游戏图片占位 */}
                            <div 
                                className="absolute right-0 top-0 bottom-0 w-2/3 md:w-1/2 opacity-30 dark:opacity-40 bg-cover bg-center bg-no-repeat pointer-events-none" 
                                style={{ 
                                    backgroundImage: `url('/images/games/covers/${selectedGame}.jpg')`,
                                    maskImage: 'linear-gradient(to right, transparent, black)',
                                    WebkitMaskImage: 'linear-gradient(to right, transparent, black)'
                                }}
                            ></div>

                            <div className="relative z-10 p-8 sm:p-10 flex flex-col justify-center">
                                <div className="flex items-center gap-3 mb-3">
                                    <h2 className="text-3xl sm:text-4xl font-display font-black text-slate-900 dark:text-white tracking-tight drop-shadow-sm">
                                        {selectedGame}
                                    </h2>
                                </div>
                                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-[12px] sm:text-[13px] font-bold tracking-widest uppercase bg-white/50 dark:bg-black/20 w-fit px-3 py-1.5 rounded-lg backdrop-blur-sm border border-white/20 dark:border-white/5">
                                    <Activity size={16} className="animate-pulse" /> 实时计算分析引擎激活
                                </div>
                            </div>
                        </motion.div>

                        {/* 主数据区 */}
                        {activeMode === 'config' ? (
                            <div className="flex flex-col gap-6">
                                {/* 核心指标与诊断容器 */}
                                <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} transition={{delay: 0.2}} className="bg-white dark:bg-[#121218] border border-slate-200 dark:border-[#1E293B] rounded-[24px] shadow-sm p-6 sm:p-8 lg:p-10 relative overflow-hidden">
                                    {/* 评级 */}
                                    <div className="absolute top-6 right-6">
                                        <div className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border flex items-center gap-2 shadow-sm ${scoreStyle.bg} ${scoreStyle.border}`}>
                                            <div className={`w-2 h-2 rounded-full animate-pulse ${scoreStyle.text.replace('text-', 'bg-')}`} />
                                            <span className={`text-[11px] sm:text-[12px] font-bold uppercase tracking-widest ${scoreStyle.text}`}>{rating.label}</span>
                                        </div>
                                    </div>

                                    {/* 帧数展示 */}
                                    <div className="flex flex-col md:flex-row gap-8 md:gap-16 items-start md:items-center mt-6 mb-12">
                                        <div>
                                            <div className="flex items-center gap-2 text-slate-500 mb-2">
                                                <GaugeCircle size={18} />
                                                <span className="text-[14px] font-bold">平均画面帧数</span>
                                            </div>
                                            <div className="flex items-baseline gap-2">
                                                <motion.div className={`text-[5rem] sm:text-[6rem] lg:text-[7rem] font-display leading-[0.8] font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-b ${scoreStyle.gradient}`}>
                                                    <BouncyNumber value={result.avg} />
                                                </motion.div>
                                                <span className={`text-xl sm:text-2xl font-display font-bold ${scoreStyle.text} opacity-50`}>FPS</span>
                                            </div>
                                        </div>
                                        
                                        <div className="hidden md:block w-px h-24 bg-slate-100 dark:bg-slate-800"></div>
                                        
                                        <div>
                                            <div className="flex items-center gap-2 text-slate-500 mb-2">
                                                <TrendingUp size={18} />
                                                <span className="text-[14px] font-bold">1% Low 最低帧</span>
                                            </div>
                                            <div className="flex items-baseline gap-2">
                                                <motion.div className={`text-[3rem] sm:text-[4rem] font-display leading-[0.8] font-black tracking-tight text-slate-700 dark:text-slate-300`}>
                                                    <BouncyNumber value={result.low} />
                                                </motion.div>
                                                <span className={`text-lg font-display font-bold text-slate-500 opacity-50`}>FPS</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 木桶效应可视化 */}
                                    <div className="bg-slate-50 dark:bg-[#1A1A24] rounded-[20px] p-6 sm:p-8 border border-slate-100 dark:border-[#2D3748]">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
                                                <Activity size={18} />
                                            </div>
                                            <h3 className="text-[16px] font-bold text-slate-900 dark:text-white">木桶效应诊断</h3>
                                        </div>

                                        <div className="space-y-6">
                                            {/* CPU Bar */}
                                            <div>
                                                <div className="flex justify-between items-end mb-2.5">
                                                    <div className="flex items-center gap-2">
                                                        <Cpu size={16} className="text-slate-400" />
                                                        <span className="text-[14px] font-bold text-slate-700 dark:text-slate-300">{selectedCpu}</span>
                                                        {result.isCpuBottleneck && <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-500 text-white rounded-[6px] ml-2 shadow-sm shadow-rose-500/20">瓶颈</span>}
                                                    </div>
                                                    <div className="text-[15px] font-display font-bold text-slate-900 dark:text-white">{result.cAvg} <span className="text-[11px] font-sans text-slate-400 font-normal">极限 FPS</span></div>
                                                </div>
                                                <div className="h-3.5 w-full bg-slate-200/50 dark:bg-[#121218] rounded-full overflow-hidden border border-slate-200/50 dark:border-[#2D3748] relative">
                                                    <motion.div 
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${Math.min(100, (result.cAvg / 300) * 100)}%` }}
                                                        className={`h-full absolute left-0 top-0 rounded-full transition-all duration-1000 ease-out ${result.isCpuBottleneck ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 'bg-slate-400 dark:bg-slate-500'}`} 
                                                    />
                                                </div>
                                            </div>

                                            {/* GPU Bar */}
                                            <div>
                                                <div className="flex justify-between items-end mb-2.5">
                                                    <div className="flex items-center gap-2">
                                                        <MonitorPlay size={16} className="text-slate-400" />
                                                        <span className="text-[14px] font-bold text-slate-700 dark:text-slate-300">{selectedGpu}</span>
                                                        {!result.isCpuBottleneck && <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-500 text-white rounded-[6px] ml-2 shadow-sm shadow-rose-500/20">瓶颈</span>}
                                                    </div>
                                                    <div className="text-[15px] font-display font-bold text-slate-900 dark:text-white">{result.gAvg} <span className="text-[11px] font-sans text-slate-400 font-normal">极限 FPS</span></div>
                                                </div>
                                                <div className="h-3.5 w-full bg-slate-200/50 dark:bg-[#121218] rounded-full overflow-hidden border border-slate-200/50 dark:border-[#2D3748] relative">
                                                    <motion.div 
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${Math.min(100, (result.gAvg / 300) * 100)}%` }}
                                                        className={`h-full absolute left-0 top-0 rounded-full transition-all duration-1000 ease-out ${!result.isCpuBottleneck ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 'bg-slate-400 dark:bg-slate-500'}`} 
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="mt-7 pt-5 border-t border-slate-200/50 dark:border-slate-700/50">
                                            <p className="text-[14px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                                {result.diff < 10 ? (
                                                    "当前配置极为均衡，CPU与GPU性能几乎在同一水平线上，无明显瓶颈。"
                                                ) : result.isCpuBottleneck ? (
                                                    <><strong className="text-rose-500 font-bold">CPU 处理能力触达极限。</strong> 显卡性能仍有巨大富余，建议升级处理器或进一步拉高画质以榨干显卡性能。</>
                                                ) : (
                                                    <><strong className="text-rose-500 font-bold">GPU 满载成为帧率瓶颈。</strong> 处理器游刃有余但显卡已无余力，建议适当调低游戏画质或升级显卡。</>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        ) : activeMode === 'cpu' ? (
                            <div className="bg-white dark:bg-[#121218] border border-slate-200 dark:border-[#1E293B] rounded-[24px] shadow-sm p-4 sm:p-6 lg:p-8">
                                {renderComparisonCard(selectedCpu, gamesFpsData[selectedGame]?.cpu[selectedCpu]?.[selectedRes], selectedCpu2, gamesFpsData[selectedGame]?.cpu[selectedCpu2]?.[selectedRes])}
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-[#121218] border border-slate-200 dark:border-[#1E293B] rounded-[24px] shadow-sm p-4 sm:p-6 lg:p-8">
                                {renderComparisonCard(selectedGpu, gamesFpsData[selectedGame]?.gpu[selectedGpu]?.[selectedRes], selectedGpu2, gamesFpsData[selectedGame]?.gpu[selectedGpu2]?.[selectedRes])}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
