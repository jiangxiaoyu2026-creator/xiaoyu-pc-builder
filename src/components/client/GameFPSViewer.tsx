import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Gamepad2, Cpu, MonitorPlay, TrendingUp, GaugeCircle, Activity, ChevronDown, Search, Layers } from 'lucide-react';
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
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2 ml-1 uppercase tracking-widest">{label}</div>
            <div 
                className={`relative flex items-center bg-white dark:bg-[#1A1A24] border ${isOpen ? 'border-indigo-500 ring-1 ring-indigo-500/20' : 'border-slate-200 dark:border-[#2D3748] hover:border-slate-300 dark:hover:border-slate-600'} rounded-xl transition-all shadow-sm`}
            >
                <div className="pl-4 text-indigo-500 dark:text-indigo-400">
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
                    className="flex-1 bg-transparent px-3 py-3.5 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none w-full text-[15px] font-medium transition-colors"
                    spellCheck={false}
                />
                <div className="pr-4 text-slate-400 dark:text-slate-500">
                    <ChevronDown size={18} className={`transition-transform duration-300 ${isOpen ? 'rotate-180 text-indigo-500 dark:text-indigo-400' : ''}`} />
                </div>
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white dark:bg-[#121218] border border-slate-100 dark:border-[#1E293B] rounded-xl max-h-[280px] overflow-y-auto custom-scrollbar shadow-2xl dark:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.7)] py-2">
                    {filteredOptions.length === 0 ? (
                        <div className="px-4 py-6 text-sm text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center gap-2">
                            <Search size={20} className="text-slate-300 dark:text-slate-600 mb-1" />
                            未找到匹配的型号
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
                                    <span className="truncate pr-4">{opt}</span>
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
    const [isMobileGamesOpen, setIsMobileGamesOpen] = useState(false);
    
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

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                    
                    {/* 左侧：游戏列表选择器 */}
                    <div className={`xl:col-span-3 bg-white dark:bg-[#121218] border border-slate-200 dark:border-[#1E293B] rounded-[24px] p-5 shadow-sm flex flex-col relative z-40 transition-all duration-300 ${isMobileGamesOpen ? 'h-[60vh] xl:h-[800px]' : 'h-auto xl:h-[800px]'}`}>
                        <div 
                            className="flex items-center gap-3 xl:mb-5 px-1 cursor-pointer xl:cursor-default"
                            onClick={() => setIsMobileGamesOpen(!isMobileGamesOpen)}
                        >
                            <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400">
                                <Layers size={18} />
                            </div>
                            <h2 className="text-sm font-bold text-slate-900 dark:text-white">测试库</h2>
                            <span className="ml-auto text-xs font-medium text-slate-500 bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-full">{gamesList.length} 款</span>
                            <ChevronDown size={18} className={`xl:hidden text-slate-400 transition-transform ${isMobileGamesOpen ? 'rotate-180' : ''}`} />
                        </div>
                        
                        <div className={`flex-col gap-2 overflow-y-auto pr-2 custom-scrollbar flex-1 ${isMobileGamesOpen ? 'flex mt-4' : 'hidden xl:flex'}`}>
                            {gamesList.map((game) => {
                                const isActive = selectedGame === game;
                                return (
                                    <div
                                        key={game}
                                        onClick={() => {
                                            handleSelectGame(game);
                                            setIsMobileGamesOpen(false);
                                        }}
                                        className={`group cursor-pointer rounded-xl px-4 py-4 transition-all flex items-center justify-between relative overflow-hidden ${
                                            isActive 
                                            ? 'bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 shadow-sm dark:shadow-none' 
                                            : 'bg-transparent border border-transparent hover:bg-slate-50 dark:hover:bg-white/5'
                                        }`}
                                    >
                                        <span className={`text-[15px] font-medium transition-colors truncate pr-4 flex items-center gap-2.5 ${isActive ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200'}`}>
                                            <img src={`/images/games/icons/${game}.png`} alt="" className="w-6 h-6 rounded-[6px] object-cover bg-slate-100 dark:bg-slate-800 shadow-sm" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                            {game}
                                        </span>
                                        {isActive && (
                                            <motion.div 
                                                layoutId="activeGameIndicator"
                                                className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 shrink-0" 
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* 右侧：主内容面板 */}
                    <div className="xl:col-span-9 flex flex-col gap-8">
                        
                        {/* 所选游戏展示横幅 */}
                        <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} className="relative overflow-hidden rounded-[24px] bg-white dark:bg-[#121218] border border-slate-200 dark:border-[#1E293B] min-h-[160px] flex items-center shadow-sm transition-colors duration-300">
                            <div className="absolute inset-0 z-0 opacity-[0.03] dark:opacity-[0.15] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-600 via-transparent to-transparent"></div>
                            
                            {/* 游戏图片占位 - 读取 public/images/games/covers 目录下的同名jpg图片 */}
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
                                    <h2 className="text-3xl sm:text-4xl font-display font-bold text-slate-900 dark:text-white tracking-tight drop-shadow-sm">
                                        {selectedGame}
                                    </h2>
                                </div>
                                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-[13px] font-bold tracking-widest uppercase bg-white/50 dark:bg-black/20 w-fit px-3 py-1.5 rounded-lg backdrop-blur-sm">
                                    <Activity size={16} className="animate-pulse" /> 实时计算分析引擎激活
                                </div>
                            </div>
                        </motion.div>

                        {/* 配置调节区 */}
                        <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} transition={{delay: 0.1}} className="relative z-30 bg-white dark:bg-[#121218] border border-slate-200 dark:border-[#1E293B] rounded-[24px] p-6 sm:p-8 shadow-sm transition-colors duration-300">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-6">
                                <SearchableSelect 
                                    options={availableCpus}
                                    value={selectedCpu}
                                    onChange={setSelectedCpu}
                                    placeholder="输入或选择 CPU..."
                                    icon={Cpu}
                                    label="处理器 (CPU)"
                                />

                                <SearchableSelect 
                                    options={availableGpus}
                                    value={selectedGpu}
                                    onChange={setSelectedGpu}
                                    placeholder="输入或选择 显卡..."
                                    icon={MonitorPlay}
                                    label="独立显卡 (GPU)"
                                />

                                <div className="relative z-0">
                                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2 ml-1 uppercase tracking-widest">画面分辨率</div>
                                    <div className="flex gap-2 h-[50px] bg-slate-50 dark:bg-[#1A1A24] p-1.5 rounded-xl border border-slate-200 dark:border-[#2D3748] transition-colors">
                                        {(['1080p', '1440p', '4K'] as Resolution[]).map(res => (
                                            <button
                                                key={res}
                                                onClick={() => setSelectedRes(res)}
                                                className={`flex-1 rounded-[8px] font-medium text-[14px] transition-all ${
                                                    selectedRes === res 
                                                    ? 'bg-white dark:bg-[#2D3748] text-indigo-600 dark:text-white shadow-sm border border-slate-200 dark:border-transparent' 
                                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-white/5 border border-transparent'
                                                }`}
                                            >
                                                {res}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mt-6 text-[12px] text-slate-500 dark:text-slate-400 bg-amber-50/50 dark:bg-amber-900/10 p-3 sm:p-4 rounded-xl border border-amber-100/50 dark:border-amber-800/20 flex items-center justify-center gap-2 leading-relaxed">
                                <div className="text-amber-500"><Activity size={16} /></div>
                                <div>
                                    <span className="font-bold text-amber-700 dark:text-amber-500">测算基准：最高/超级画质。</span>
                                    实际游玩时若使用默认或中低画质，游戏帧率会比当前测算值<span className="text-amber-600 dark:text-amber-400 font-bold mx-0.5">大幅提升</span>。
                                </div>
                            </div>
                        </motion.div>

                        {/* 数据输出展板 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            
                            {/* 核心指标：平均帧率 */}
                            <motion.div initial={{opacity:0, scale:0.97}} animate={{opacity:1, scale:1}} transition={{delay: 0.2, type: 'spring'}} className="rounded-2xl bg-white dark:bg-[#121218] border border-slate-200 dark:border-[#1E293B] relative flex flex-col p-5 sm:p-6 shadow-sm overflow-hidden group min-h-[160px] transition-colors duration-300">
                                <div className="flex justify-between items-start w-full">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-slate-50 dark:bg-white/5 rounded-[12px] border border-slate-200 dark:border-[#2D3748] text-slate-500 dark:text-slate-400">
                                            <GaugeCircle size={22} />
                                        </div>
                                        <div>
                                            <div className="text-[15px] font-bold text-slate-900 dark:text-white">平均画面帧数</div>
                                            <div className="text-[12px] text-slate-500 mt-0.5">综合性能基准</div>
                                        </div>
                                    </div>
                                    <div className={`px-4 py-2 rounded-full border flex items-center gap-2 ${scoreStyle.bg} ${scoreStyle.border}`}>
                                        <div className={`w-2 h-2 rounded-full animate-pulse ${scoreStyle.text.replace('text-', 'bg-')}`} />
                                        <span className={`text-[11px] font-bold uppercase tracking-widest ${scoreStyle.text}`}>{rating.label}</span>
                                    </div>
                                </div>

                                <div className="mt-auto pt-4 flex items-baseline gap-3">
                                    <motion.div 
                                        className={`text-[3.5rem] sm:text-[4.5rem] font-display leading-[0.8] font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b ${scoreStyle.gradient}`}
                                    >
                                        <BouncyNumber value={result.avg} />
                                    </motion.div>
                                    <span className={`text-lg font-display font-bold ${scoreStyle.text} opacity-50`}>FPS</span>
                                </div>
                            </motion.div>

                            {/* 次要指标：1% Low FPS */}
                            <motion.div initial={{opacity:0, scale:0.97}} animate={{opacity:1, scale:1}} transition={{delay: 0.3, type: 'spring'}} className="rounded-2xl bg-white dark:bg-[#121218] border border-slate-200 dark:border-[#1E293B] relative flex flex-col p-5 sm:p-6 shadow-sm overflow-hidden group min-h-[160px] transition-colors duration-300">
                                <div className="flex justify-between items-start w-full">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-slate-50 dark:bg-white/5 rounded-[12px] border border-slate-200 dark:border-[#2D3748] text-slate-500 dark:text-slate-400">
                                            <TrendingUp size={22} />
                                        </div>
                                        <div>
                                            <div className="text-[15px] font-bold text-slate-900 dark:text-white">最低帧底线 (1% Low)</div>
                                            <div className="text-[12px] text-slate-500 mt-0.5">决定是否会卡顿掉帧</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-auto pt-4 flex items-baseline gap-3">
                                    <motion.div 
                                        className={`text-[3.5rem] sm:text-[4.5rem] font-display leading-[0.8] font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b ${scoreStyle.gradient}`}
                                    >
                                        <BouncyNumber value={result.low} />
                                    </motion.div>
                                    <span className={`text-lg font-display font-bold ${scoreStyle.text} opacity-50`}>FPS</span>
                                </div>
                            </motion.div>
                        </div>

                        {/* 木桶效应分析面板 */}
                        <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} transition={{delay: 0.4}} className="bg-white dark:bg-[#121218] border border-slate-200 dark:border-[#1E293B] rounded-2xl p-5 sm:p-6 shadow-sm transition-colors duration-300 mt-5">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl border border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                                    <Activity size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">木桶效应诊断</h3>
                                    <p className="text-[13px] text-slate-500 mt-1">对比各项硬件的极限能力，找出拖慢整体帧数的瓶颈所在</p>
                                </div>
                            </div>

                            <div className="space-y-8">
                                {/* CPU 能力柱状图 */}
                                <div>
                                    <div className="flex justify-between items-end mb-3">
                                        <div className="flex items-center gap-2.5">
                                            <Cpu size={18} className="text-slate-400" />
                                            <span className="text-[15px] font-bold text-slate-700 dark:text-slate-300">{selectedCpu}</span>
                                            {result.isCpuBottleneck && <span className="px-2.5 py-1 text-[11px] font-bold bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 rounded-lg ml-2">本项拖慢了系统</span>}
                                        </div>
                                        <div className="text-[16px] font-display font-bold text-slate-900 dark:text-white">{result.cAvg} <span className="text-[12px] font-sans text-slate-400 font-normal">FPS 极限</span></div>
                                    </div>
                                    <div className="h-4 w-full bg-slate-100 dark:bg-[#1A1A24] rounded-full overflow-hidden border border-slate-200 dark:border-[#2D3748] relative">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(100, (result.cAvg / 300) * 100)}%` }}
                                            className={`h-full absolute left-0 top-0 rounded-full ${result.isCpuBottleneck ? 'bg-rose-500' : 'bg-slate-400 dark:bg-slate-600'}`} 
                                        />
                                    </div>
                                </div>

                                {/* GPU 能力柱状图 */}
                                <div>
                                    <div className="flex justify-between items-end mb-3">
                                        <div className="flex items-center gap-2.5">
                                            <MonitorPlay size={18} className="text-slate-400" />
                                            <span className="text-[15px] font-bold text-slate-700 dark:text-slate-300">{selectedGpu}</span>
                                            {!result.isCpuBottleneck && <span className="px-2.5 py-1 text-[11px] font-bold bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 rounded-lg ml-2">本项拖慢了系统</span>}
                                        </div>
                                        <div className="text-[16px] font-display font-bold text-slate-900 dark:text-white">{result.gAvg} <span className="text-[12px] font-sans text-slate-400 font-normal">FPS 极限</span></div>
                                    </div>
                                    <div className="h-4 w-full bg-slate-100 dark:bg-[#1A1A24] rounded-full overflow-hidden border border-slate-200 dark:border-[#2D3748] relative">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(100, (result.gAvg / 300) * 100)}%` }}
                                            className={`h-full absolute left-0 top-0 rounded-full ${!result.isCpuBottleneck ? 'bg-rose-500' : 'bg-slate-400 dark:bg-slate-600'}`} 
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-[#1E293B] flex items-start gap-4 bg-slate-50 dark:bg-[#1A1A24] p-5 rounded-2xl">
                                <div className="mt-1 w-2 h-2 rounded-full bg-indigo-500 shrink-0 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                                <p className="text-[14px] text-slate-700 dark:text-slate-300 leading-[1.8] font-medium">
                                    {result.diff < 10 ? (
                                        "经系统诊断，当前电脑配置极其均衡。处理器与显卡的性能表现几乎在同一水平线上，无明显的性能瓶颈，您可以获得绝佳的游玩体验。"
                                    ) : result.isCpuBottleneck ? (
                                        `经系统诊断，在 ${selectedRes} 画质下，您的显卡性能仍有极大富余，但处理器 (CPU) 处理能力达到了极限，拖慢了全局帧数。建议升级更为强劲的处理器，或将游戏画质进一步调高，以充分榨干显卡性能。`
                                    ) : (
                                        `经系统诊断，在 ${selectedRes} 画质下，您的处理器表现游刃有余，但独立显卡 (GPU) 已经满载，成为了拉低帧率的罪魁祸首。为了获得更流畅的体验，建议您适当调低游戏画质，或考虑更换级别更高的显卡。`
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
