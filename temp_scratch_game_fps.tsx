import React, { useState, useMemo, useEffect } from 'react';
import { Gamepad2, Cpu, MonitorPlay, Zap, TrendingUp, GaugeCircle, Activity, Crosshair, AlertCircle } from 'lucide-react';
import { motion, useMotionValue, animate, useTransform } from 'framer-motion';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { cpuFpsData, gpuFpsData, cpuList, gpuList, Resolution } from '../../data/gameFpsData';

// Component for bouncy number counting
const BouncyNumber = ({ value, className }: { value: number; className?: string }) => {
    const count = useMotionValue(0);
    const rounded = useTransform(count, (latest) => Math.round(latest));

    useEffect(() => {
        const controls = animate(count, value, {
            type: 'spring',
            stiffness: 100,
            damping: 15,
            restDelta: 0.5
        });
        return controls.stop;
    }, [value, count]);

    return <motion.span className={className}>{rounded}</motion.span>;
};

export const GameFPSViewer: React.FC = () => {
    const [selectedGame, setSelectedGame] = useState('Counter-Strike 2');
    const [selectedCpu, setSelectedCpu] = useState(cpuList[0]);
    const [selectedGpu, setSelectedGpu] = useState(gpuList[0]);
    const [selectedRes, setSelectedRes] = useState<Resolution>('1080p');

    const stats = useMemo(() => {
        const cData = cpuFpsData[selectedCpu]?.[selectedRes];
        const gData = gpuFpsData[selectedGpu]?.[selectedRes];

        if (!cData || !gData) return null;

        return {
            cAvg: cData.avg,
            gAvg: gData.avg,
            cLow: cData.low,
            gLow: gData.low,
            avg: Math.min(cData.avg, gData.avg),
            low: Math.min(cData.low, gData.low),
        };
    }, [selectedCpu, selectedGpu, selectedRes]);

    const result = stats || { avg: 0, low: 0 };

    const getScoreColor = (fps: number) => {
        if (fps >= 240) return 'text-purple-500 dark:text-purple-400';
        if (fps >= 144) return 'text-emerald-500 dark:text-emerald-400';
        if (fps >= 60) return 'text-amber-500 dark:text-amber-400';
        return 'text-rose-500 dark:text-rose-400';
    };

    const getScoreBg = (fps: number) => {
        if (fps >= 240) return 'bg-purple-500/20 shadow-purple-500/40';
        if (fps >= 144) return 'bg-emerald-500/20 shadow-emerald-500/40';
        if (fps >= 60) return 'bg-amber-500/20 shadow-amber-500/40';
        return 'bg-rose-500/20 shadow-rose-500/40';
    };

    const getRating = (fps: number) => {
        if (fps >= 240) return { label: '电竞极佳', color: 'text-purple-500', desc: '完美应对高刷显示器' };
        if (fps >= 144) return { label: '丝滑流畅', color: 'text-emerald-500', desc: '适合绝大部分玩家' };
        if (fps >= 60) return { label: '勉强可玩', color: 'text-amber-500', desc: '可能出现偶发卡顿' };
        return { label: '严重卡顿', color: 'text-rose-500', desc: '建议降低画质或升级' };
    };

    const rating = getRating(result.avg);

    // Radar Chart Data Calculation
    const radarData = useMemo(() => {
        if (!stats) return [];
        return [
            { subject: 'CPU 均帧', A: Math.min(stats.cAvg, 300), fullMark: 300 },
            { subject: 'GPU 均帧', A: Math.min(stats.gAvg, 300), fullMark: 300 },
            { subject: 'GPU 1%Low', A: Math.min(stats.gLow, 300), fullMark: 300 },
            { subject: 'CPU 1%Low', A: Math.min(stats.cLow, 300), fullMark: 300 },
            { subject: '分辨率抗压', A: selectedRes === '4K' ? 120 : selectedRes === '1440p' ? 200 : 280, fullMark: 300 },
        ];
    }, [stats, selectedRes]);

    const getBottleneck = () => {
        if (!stats) return null;
        const diff = stats.cAvg - stats.gAvg;
        if (Math.abs(diff) < 20) return "整机均衡均衡，发挥良好";
        if (diff > 0) return "GPU 瓶颈 - 显卡成为短板";
        return "CPU 瓶颈 - 处理器拖后腿";
    };

    const getRecommendation = () => {
        if (selectedRes === '4K') return "4K 画质要求极高，建议优先升级旗舰显卡（如 RTX 4080 以上），CPU 选用中端即可。";
        if (selectedRes === '1440p') return "2K 是当前主流，需要均衡的处理器与显卡搭配，推荐 RTX 4070 / RX 7800 XT 级别。";
        return "1080p 分辨率极大依赖 CPU 单核性能，如果预算有限，建议着重投资高频处理器。";
    };

    // Stagger container animation
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: { type: "spring", stiffness: 100, damping: 15 }
        }
    };

    return (
        <motion.div 
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8"
        >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 auto-rows-[auto]">
                
                {/* Hero Header - Span 4 */}
                <motion.div variants={itemVariants} className="col-span-1 md:col-span-4 relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 shadow-2xl p-6 md:p-8 text-white min-h-[160px] flex items-center">
                    <motion.div 
                        initial={{ scale: 0.8, opacity: 0, rotate: -15 }}
                        animate={{ scale: 1, opacity: 0.1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 50, damping: 20, delay: 0.2 }}
                        className="absolute top-1/2 -translate-y-1/2 right-0 md:right-8 p-4 pointer-events-none"
                    >
                        <Gamepad2 size={120} />
                    </motion.div>
                    
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                            <motion.div 
                                whileHover={{ scale: 1.1, rotate: 10 }}
                                className="p-2 bg-indigo-500/30 rounded-xl backdrop-blur-md cursor-default pointer-events-auto"
                            >
                                <Zap className="text-indigo-300" size={24} />
                            </motion.div>
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-indigo-200">
                                游戏性能评测台
                            </h1>
                        </div>
                        <p className="text-indigo-200/80 max-w-xl text-sm leading-relaxed mt-3">
                            通过木桶效应算法分析 CPU 与 GPU 瓶颈。即时查看您的配置在不同分辨率下的真实体验表现。
                        </p>
                    </div>
                </motion.div>

                {/* Configuration Selector - Span 2 */}
                <motion.div variants={itemVariants} className="col-span-1 md:col-span-2 bg-white dark:bg-slate-900/80 rounded-[2rem] p-6 md:p-8 shadow-xl border border-slate-200/60 dark:border-slate-800 backdrop-blur-2xl">
                    <div className="flex items-center gap-2 mb-6">
                        <Activity className="text-indigo-500" size={20} />
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">配置分析</h2>
                    </div>
                    
                    <div className="space-y-6">
                        <motion.div whileTap={{ scale: 0.99 }}>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 transition-colors">测试项目 (Game)</label>
                            <select 
                                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 rounded-2xl px-4 py-3.5 text-sm font-semibold text-slate-700 dark:text-slate-200 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all appearance-none cursor-not-allowed"
                                value={selectedGame}
                                disabled
                            >
                                <option>{selectedGame}</option>
                            </select>
                        </motion.div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">处理器 (CPU)</label>
                                <div className="relative group">
                                    <select 
                                        className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-indigo-400 dark:hover:border-indigo-500 outline-none transition-all appearance-none cursor-pointer"
                                        value={selectedCpu}
                                        onChange={(e) => setSelectedCpu(e.target.value)}
                                    >
                                        {cpuList.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 p-1.5 bg-white dark:bg-slate-700 rounded-lg shadow-sm group-hover:text-indigo-500 transition-colors">
                                        <Cpu className="text-slate-400 group-hover:text-indigo-500 transition-colors" size={16} />
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">显卡 (GPU)</label>
                                <div className="relative group">
                                    <select 
                                        className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-indigo-400 dark:hover:border-indigo-500 outline-none transition-all appearance-none cursor-pointer"
                                        value={selectedGpu}
                                        onChange={(e) => setSelectedGpu(e.target.value)}
                                    >
                                        {gpuList.map(g => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 p-1.5 bg-white dark:bg-slate-700 rounded-lg shadow-sm group-hover:text-indigo-500 transition-colors">
                                        <MonitorPlay className="text-slate-400 group-hover:text-indigo-500 transition-colors" size={16} />
                                    </div>
                                </div>
                            </motion.div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">运行分辨率 (Resolution)</label>
                            <div className="flex gap-3">
                                {(['1080p', '1440p', '4K'] as Resolution[]).map(res => (
                                    <motion.button
                                        whileHover={{ scale: 1.03, y: -2 }}
                                        whileTap={{ scale: 0.95 }}
                                        key={res}
                                        onClick={() => setSelectedRes(res)}
                                        className={`relative flex-1 py-3 px-2 md:px-4 rounded-xl font-bold text-xs md:text-sm transition-all overflow-hidden ${
                                            selectedRes === res 
                                            ? 'text-white border-transparent shadow-lg shadow-indigo-500/40' 
                                            : 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/80 hover:bg-white dark:hover:bg-slate-700'
                                        }`}
                                    >
                                        {selectedRes === res && (
                                            <motion.div 
                                                layoutId="activeResIndicator" 
                                                className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-indigo-600 -z-10" 
                                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                            />
                                        )}
                                        {res}
                                    </motion.button>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Dashboard Main Meter - Span 2, Row Span 2 */}
                <motion.div variants={itemVariants} className="col-span-1 md:col-span-2 md:row-span-2 bg-white dark:bg-slate-900/80 rounded-[2rem] p-6 shadow-xl border border-slate-200/60 dark:border-slate-800 backdrop-blur-2xl flex flex-col items-center justify-center relative overflow-hidden group min-h-[300px]">
                    <motion.div 
                        layout
                        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] aspect-square rounded-full blur-[100px] pointer-events-none transition-colors duration-1000 ${getScoreBg(result.avg)}`}
                        animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.4, 0.3] }}
                        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                    />

                    <div className="flex flex-col items-center z-10 w-full mb-4">
                        <motion.div 
                            whileHover={{ rotate: 180 }}
                            transition={{ duration: 0.5, type: 'spring' }}
                            className={`mb-6 p-4 rounded-full border bg-white dark:bg-slate-800 shadow-xl ${getScoreColor(result.avg)}`}
                        >
                            <GaugeCircle size={32} />
                        </motion.div>
                        
                        <div className="text-center relative">
                            <motion.div 
                                className={`text-[6rem] md:text-[8rem] leading-none font-black tracking-tighter ${getScoreColor(result.avg)} drop-shadow-md`}
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: 'spring', bounce: 0.4 }}
                            >
                                <BouncyNumber value={result.avg} />
                            </motion.div>
                            <div className="text-sm font-bold text-slate-400 mt-4 tracking-widest uppercase bg-slate-100/50 dark:bg-slate-800/50 px-4 py-1.5 rounded-full inline-block">综合平均帧数</div>
                        </div>
                    </div>
                </motion.div>

                {/* Performance Rating Card - Span 1 */}
                <motion.div variants={itemVariants} className="col-span-1 bg-white dark:bg-slate-900/80 rounded-[2rem] p-6 shadow-xl border border-slate-200/60 dark:border-slate-800 backdrop-blur-2xl flex flex-col justify-center relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                            <Crosshair className="text-slate-400" size={18} />
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">性能评级</h3>
                        </div>
                        <div className={`text-2xl font-black ${rating.color}`}>
                            {rating.label}
                        </div>
                        <div className="text-xs text-slate-400 dark:text-slate-500 mt-2 font-medium">
                            {rating.desc}
                        </div>
                    </div>
                </motion.div>

                {/* 1% Low Card - Span 1 */}
                <motion.div variants={itemVariants} whileHover={{ scale: 1.02 }} className="col-span-1 bg-white dark:bg-slate-900/80 rounded-[2rem] p-6 shadow-xl border border-slate-200/60 dark:border-slate-800 backdrop-blur-2xl flex flex-col justify-center cursor-default">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="text-indigo-400" size={18} />
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">最低极差</h3>
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <div className={`text-4xl font-black ${getScoreColor(result.low)}`}>
                            <BouncyNumber value={result.low} />
                        </div>
                        <span className="text-sm font-bold text-slate-400">FPS</span>
                    </div>
                    <div className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">
                        1% Lows 决定卡顿下限
                    </div>
                </motion.div>

                {/* Recommendation Notice - Span 2 */}
                <motion.div variants={itemVariants} className="col-span-1 md:col-span-2 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-[2rem] p-6 border border-indigo-100 dark:border-indigo-500/20 flex flex-col sm:flex-row items-center gap-4">
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm text-indigo-500 shrink-0">
                        <AlertCircle size={24} />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1">分辨率适配建议</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                            {getRecommendation()}
                        </p>
                    </div>
                </motion.div>

                {/* Radar Chart - Span 2 */}
                <motion.div variants={itemVariants} className="col-span-1 md:col-span-2 bg-white dark:bg-slate-900/80 rounded-[2rem] p-6 shadow-xl border border-slate-200/60 dark:border-slate-800 relative z-0 flex flex-col">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <TargetIcon className="text-indigo-400" size={16} /> 瓶颈雷达分析
                    </h3>
                    
                    <div className="flex-1 w-full min-h-[220px] relative">
                         <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                <PolarGrid stroke="#cbd5e1" strokeDasharray="3 3" className="dark:stroke-slate-700" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 300]} tick={false} axisLine={false} />
                                <Radar 
                                    name="Performance" 
                                    dataKey="A" 
                                    stroke="#6366f1" 
                                    strokeWidth={3}
                                    fill="#818cf8" 
                                    fillOpacity={0.4} 
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="mt-2 text-center text-xs font-semibold text-slate-500 bg-slate-50 dark:bg-slate-800 py-2 rounded-xl">
                        诊断: <span className="text-indigo-600 dark:text-indigo-400">{getBottleneck()}</span>
                    </div>
                </motion.div>

            </div>
        </motion.div>
    );
};

// TargetIcon custom addition
const TargetIcon = (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
    </svg>
)
