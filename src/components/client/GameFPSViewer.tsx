import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Gamepad2, Cpu, MonitorPlay, TrendingUp, GaugeCircle, Activity, ChevronDown, Search, AlertTriangle } from 'lucide-react';
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

// 精致的搜索下拉选择器 (Glassmorphism)
const SearchableSelect = ({ options, value, onChange, placeholder, icon: Icon, label }: { options: string[], value: string, onChange: (val: string) => void, placeholder: string, icon: any, label: string }) => {
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
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1.5 ml-1 uppercase tracking-widest">{label}</div>
            <div 
                className={`relative flex items-center bg-white/60 dark:bg-slate-900/40 backdrop-blur-md border ${isOpen ? 'border-indigo-500 ring-1 ring-indigo-500/30' : 'border-slate-200/50 dark:border-white/10 hover:border-indigo-400/50 dark:hover:border-white/20'} rounded-[16px] transition-all duration-300 shadow-sm`}
            >
                <div className="pl-4 text-indigo-500 dark:text-indigo-400 flex items-center justify-center">
                    <Icon size={18} strokeWidth={2} />
                </div>
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
                    className="flex-1 bg-transparent px-3 py-3.5 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none w-full text-[14px] font-medium transition-colors"
                    spellCheck={false}
                />
                <div className="pr-4 text-slate-400 dark:text-slate-500 flex items-center justify-center cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
                    <ChevronDown size={18} className={`transition-transform duration-300 ${isOpen ? 'rotate-180 text-indigo-500 dark:text-indigo-400' : ''}`} />
                </div>
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 rounded-[16px] max-h-[260px] overflow-y-auto custom-scrollbar shadow-2xl py-2">
                    {filteredOptions.length === 0 ? (
                        <div className="px-4 py-6 text-sm text-slate-500 flex flex-col items-center justify-center gap-2">
                            <Search size={20} className="text-slate-300 mb-1" />
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
                                    className={`px-3 py-2.5 text-sm font-medium rounded-xl cursor-pointer transition-all flex items-center justify-between ${
                                        opt === value 
                                        ? 'bg-indigo-500 text-white shadow-md' 
                                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                                    }`}
                                >
                                    <span className="truncate pr-4 flex items-center gap-2">
                                        <span className="truncate">{opt}</span>
                                    </span>
                                    {opt === value && <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] shrink-0" />}
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
    
    const initialCpus = Object.keys(gamesFpsData[initialGame]?.cpu || {}).sort();
    const initialGpus = Object.keys(gamesFpsData[initialGame]?.gpu || {}).sort();
    const [selectedCpu, setSelectedCpu] = useState<string>(initialCpus.length > 0 ? initialCpus[0] : cpuList[0]);
    const [selectedGpu, setSelectedGpu] = useState<string>(initialGpus.length > 0 ? initialGpus[0] : gpuList[0]);

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
            gradient: 'from-violet-500 to-indigo-500', 
            text: 'text-violet-400', 
            border: 'border-violet-500/30 shadow-[0_0_20px_rgba(139,92,246,0.15)]'
        };
        if (fps >= 144) return { 
            gradient: 'from-sky-400 to-blue-500', 
            text: 'text-sky-400', 
            border: 'border-sky-500/30 shadow-[0_0_20px_rgba(14,165,233,0.15)]'
        };
        if (fps >= 60) return { 
            gradient: 'from-emerald-400 to-teal-500', 
            text: 'text-emerald-400', 
            border: 'border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
        };
        return { 
            gradient: 'from-orange-400 to-rose-500', 
            text: 'text-orange-400', 
            border: 'border-orange-500/30 shadow-[0_0_20px_rgba(249,115,22,0.15)]'
        };
    };

    const scoreStyle = getPremiumScoreStyles(result.avg);

    if (!gamesFpsData[selectedGame] && selectedGame !== '') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500 dark:text-slate-400">
                <Activity size={48} className="mb-4 opacity-50" />
                <h2 className="text-xl font-display font-medium tracking-tight">暂无此游戏性能数据</h2>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0C10] text-slate-900 dark:text-slate-100 font-sans p-4 sm:p-6 lg:p-8 transition-colors duration-500">
            <div className="max-w-[1400px] mx-auto">
                <header className="mb-8 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-[16px] bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Gamepad2 className="text-white" size={24} strokeWidth={2} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-display font-bold tracking-tight">性能评测引擎</h1>
                        <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">多维度全景帧数分析系统</p>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
                    
                    {/* === 左侧：游戏列表 === */}
                    <div className="lg:col-span-3 xl:col-span-3 flex flex-col gap-4 bg-white/60 dark:bg-[#12141C]/80 backdrop-blur-xl border border-slate-200/60 dark:border-white/5 rounded-[24px] overflow-hidden shadow-xl shadow-slate-200/20 dark:shadow-none h-[calc(100vh-140px)] sticky top-6">
                        <div className="p-5 border-b border-slate-200/60 dark:border-white/5">
                            <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <Search size={16} className="text-indigo-500" /> 
                                游戏测试库 <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full">{gamesList.length}款</span>
                            </h2>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
                            {gamesList.map((game) => (
                                <button
                                    key={game}
                                    onClick={() => handleSelectGame(game)}
                                    className={`w-full text-left px-4 py-3 rounded-[14px] flex items-center gap-3 transition-all duration-200 group ${
                                        selectedGame === game 
                                        ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 shadow-sm' 
                                        : 'hover:bg-slate-100/80 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                    }`}
                                >
                                    <img src={`/images/games/icons/${game}.png`} alt="" className={`w-6 h-6 rounded-[6px] object-cover shrink-0 transition-transform duration-300 ${selectedGame === game ? 'scale-110 shadow-md shadow-indigo-500/20' : 'group-hover:scale-105'}`} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                    <span className="font-medium text-[13px] truncate flex-1">{game}</span>
                                    {selectedGame === game && (
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* === 右侧：主数据区 === */}
                    <div className="lg:col-span-9 xl:col-span-9 flex flex-col gap-6">
                        
                        {/* 顶部 横幅 */}
                        <div className="relative overflow-hidden rounded-[24px] bg-slate-900 border border-slate-800 h-[180px] flex items-center shadow-2xl">
                            <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/80 to-transparent z-10" />
                            <div 
                                className="absolute right-0 top-0 bottom-0 w-3/4 opacity-60 bg-cover bg-center bg-no-repeat z-0" 
                                style={{ backgroundImage: `url('/images/games/covers/${selectedGame}.jpg')` }}
                            />
                            
                            <div className="relative z-20 p-8 sm:p-10">
                                <div className="flex items-center gap-2 text-indigo-400 text-[11px] font-bold tracking-widest uppercase mb-3">
                                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
                                    实时计算分析引擎激活
                                </div>
                                <h2 className="text-3xl sm:text-5xl font-display font-black text-white tracking-tight drop-shadow-lg">
                                    {selectedGame}
                                </h2>
                            </div>
                        </div>

                        {/* 控制面板 Glassmorphism */}
                        <div className="bg-white/60 dark:bg-[#12141C]/80 backdrop-blur-xl border border-slate-200/60 dark:border-white/5 rounded-[24px] p-6 shadow-lg shadow-slate-200/30 dark:shadow-none">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <SearchableSelect options={availableCpus} value={selectedCpu} onChange={setSelectedCpu} placeholder="选择 CPU" icon={Cpu} label="处理器 (CPU)"/>
                                <SearchableSelect options={availableGpus} value={selectedGpu} onChange={setSelectedGpu} placeholder="选择 显卡" icon={MonitorPlay} label="独立显卡 (GPU)"/>
                                
                                <div className="relative">
                                    <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1.5 ml-1 uppercase tracking-widest">画面分辨率</div>
                                    <div className="flex gap-1.5 h-[50px] bg-white/50 dark:bg-slate-900/50 p-1.5 rounded-[16px] border border-slate-200/50 dark:border-white/10">
                                        {(['1080p', '1440p', '4K'] as Resolution[]).map(res => (
                                            <button
                                                key={res}
                                                onClick={() => setSelectedRes(res)}
                                                className={`flex-1 rounded-[12px] font-bold text-[13px] transition-all duration-300 ${
                                                    selectedRes === res 
                                                    ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/25' 
                                                    : 'text-slate-500 hover:bg-white dark:hover:bg-white/10'
                                                }`}
                                            >
                                                {res}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* FPS 数据展示区 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* 平均帧数卡片 */}
                            <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} transition={{duration:0.4}} className={`bg-white/60 dark:bg-[#12141C]/80 backdrop-blur-xl border ${scoreStyle.border} rounded-[32px] p-8 relative overflow-hidden flex flex-col justify-center`}>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/20 to-transparent dark:from-white/5 rounded-bl-full pointer-events-none" />
                                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2 relative z-10">
                                    <GaugeCircle size={20} />
                                    <span className="text-[15px] font-bold">平均画面帧数</span>
                                </div>
                                <div className="flex items-baseline gap-3 relative z-10">
                                    <motion.div className={`text-[5rem] sm:text-[6rem] font-display leading-none font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-b ${scoreStyle.gradient}`}>
                                        <BouncyNumber value={result.avg} />
                                    </motion.div>
                                    <span className={`text-2xl font-display font-bold ${scoreStyle.text} opacity-60`}>FPS</span>
                                </div>
                            </motion.div>

                            {/* 1% Low 卡片 */}
                            <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} transition={{duration:0.4, delay:0.1}} className="bg-white/60 dark:bg-[#12141C]/80 backdrop-blur-xl border border-slate-200/60 dark:border-white/5 rounded-[32px] p-8 relative overflow-hidden flex flex-col justify-center shadow-lg shadow-slate-200/30 dark:shadow-none">
                                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2 relative z-10">
                                    <TrendingUp size={20} />
                                    <span className="text-[15px] font-bold">最低帧底线 (1% Low)</span>
                                </div>
                                <div className="flex items-baseline gap-3 relative z-10">
                                    <motion.div className="text-[4rem] sm:text-[5rem] font-display leading-none font-black tracking-tight text-slate-800 dark:text-white drop-shadow-sm">
                                        <BouncyNumber value={result.low} />
                                    </motion.div>
                                    <span className="text-xl font-display font-bold text-slate-400 opacity-60">FPS</span>
                                </div>
                            </motion.div>
                        </div>

                        {/* 木桶效应诊断 (Tech Bars) */}
                        <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{duration:0.5, delay:0.2}} className="bg-white/60 dark:bg-[#12141C]/80 backdrop-blur-xl border border-slate-200/60 dark:border-white/5 rounded-[32px] p-8 shadow-lg shadow-slate-200/30 dark:shadow-none relative overflow-hidden">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="p-2.5 bg-indigo-500/10 text-indigo-500 rounded-xl">
                                    <Activity size={22} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">木桶效应诊断</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">对比各项硬件的极限能力，找出拖慢整体帧数的瓶颈所在</p>
                                </div>
                            </div>

                            <div className="space-y-8">
                                {/* CPU */}
                                <div>
                                    <div className="flex justify-between items-end mb-3">
                                        <div className="flex items-center gap-2.5">
                                            <Cpu size={18} className="text-slate-400" />
                                            <span className="text-[15px] font-bold text-slate-800 dark:text-slate-200">{selectedCpu}</span>
                                            {result.isCpuBottleneck && (
                                                <span className="px-2.5 py-1 text-[10px] font-black tracking-wider bg-rose-500 text-white rounded-lg ml-2 shadow-[0_0_12px_rgba(244,63,94,0.4)] flex items-center gap-1"><AlertTriangle size={12}/> 本项拖慢了系统</span>
                                            )}
                                        </div>
                                        <div className="text-[18px] font-display font-black text-slate-900 dark:text-white">{result.cAvg} <span className="text-[11px] font-sans text-slate-400 font-bold uppercase tracking-wider">极限 FPS</span></div>
                                    </div>
                                    <div className="h-4 w-full bg-slate-100 dark:bg-slate-900/60 rounded-full overflow-hidden border border-slate-200/50 dark:border-white/5 relative shadow-inner">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(100, (result.cAvg / 300) * 100)}%` }}
                                            className={`h-full absolute left-0 top-0 rounded-full transition-all duration-1000 ease-out ${result.isCpuBottleneck ? 'bg-gradient-to-r from-rose-400 to-rose-500' : 'bg-gradient-to-r from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-500'}`} 
                                        />
                                    </div>
                                </div>

                                {/* GPU */}
                                <div>
                                    <div className="flex justify-between items-end mb-3">
                                        <div className="flex items-center gap-2.5">
                                            <MonitorPlay size={18} className="text-slate-400" />
                                            <span className="text-[15px] font-bold text-slate-800 dark:text-slate-200">{selectedGpu}</span>
                                            {!result.isCpuBottleneck && (
                                                <span className="px-2.5 py-1 text-[10px] font-black tracking-wider bg-rose-500 text-white rounded-lg ml-2 shadow-[0_0_12px_rgba(244,63,94,0.4)] flex items-center gap-1"><AlertTriangle size={12}/> 本项拖慢了系统</span>
                                            )}
                                        </div>
                                        <div className="text-[18px] font-display font-black text-slate-900 dark:text-white">{result.gAvg} <span className="text-[11px] font-sans text-slate-400 font-bold uppercase tracking-wider">极限 FPS</span></div>
                                    </div>
                                    <div className="h-4 w-full bg-slate-100 dark:bg-slate-900/60 rounded-full overflow-hidden border border-slate-200/50 dark:border-white/5 relative shadow-inner">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(100, (result.gAvg / 300) * 100)}%` }}
                                            className={`h-full absolute left-0 top-0 rounded-full transition-all duration-1000 ease-out ${!result.isCpuBottleneck ? 'bg-gradient-to-r from-rose-400 to-rose-500' : 'bg-gradient-to-r from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-500'}`} 
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mt-8 pt-5 border-t border-slate-200/60 dark:border-white/5">
                                <p className="text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                    {result.diff < 10 ? (
                                        "当前配置极为均衡，CPU与GPU性能几乎在同一水平线上，无明显瓶颈。"
                                    ) : result.isCpuBottleneck ? (
                                        <><strong className="text-rose-500 font-bold dark:text-rose-400">CPU 遭遇处理瓶颈。</strong> 显卡性能仍有巨大富余，建议升级处理器或进一步拉高画质以榨干显卡性能。</>
                                    ) : (
                                        <><strong className="text-rose-500 font-bold dark:text-rose-400">GPU 满载成为帧率极限。</strong> 处理器游刃有余但显卡已无余力，建议适当调低游戏画质或升级显卡。</>
                                    )}
                                </p>
                            </div>
                        </motion.div>

                    </div>
                </div>
            </div>
        </div>
    );
};
