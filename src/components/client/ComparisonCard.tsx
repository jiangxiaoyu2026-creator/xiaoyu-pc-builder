import React from 'react';
import { Crown, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { RadarChart } from './RadarChart';

interface HardwareSpecs {
    power?: number;
    ludashi?: number;
}

interface ComparisonCardProps {
    item1Name: string;
    item1Data: any;
    item2Name: string;
    item2Data: any;
    item1Specs?: HardwareSpecs;
    item2Specs?: HardwareSpecs;
}

export const ComparisonCard: React.FC<ComparisonCardProps> = ({ item1Name, item1Data, item2Name, item2Data, item1Specs, item2Specs }) => {
    const item1Avg = item1Data?.avg || 0;
    const item2Avg = item2Data?.avg || 0;
    const item1Low = item1Data?.low || 0;
    const item2Low = item2Data?.low || 0;
    
    const diff = item1Avg - item2Avg;
    const diffPercent = item2Avg > 0 ? Math.abs((diff / item2Avg) * 100).toFixed(1) : '0';
    
    const winner = diff > 0 ? 1 : diff < 0 ? 2 : 0;

    // Colors
    const colorA = '#5B5CE6'; // Indigo primary
    const colorB = '#F97316'; // Orange secondary
    const bgA = 'rgba(91, 92, 230, 0.2)';
    const bgB = 'rgba(249, 115, 22, 0.2)';

    // Radar Data based on real dimensions
    const item1Power = item1Specs?.power || 0;
    const item2Power = item2Specs?.power || 0;
    const item1Ludashi = item1Specs?.ludashi || 0;
    const item2Ludashi = item2Specs?.ludashi || 0;

    const maxAvg = Math.max(item1Avg, item2Avg, 1);
    const maxLow = Math.max(item1Low, item2Low, 1);
    const maxPower = Math.max(item1Power, item2Power, 100);
    const maxLudashi = Math.max(item1Ludashi, item2Ludashi, 100000);
    
    // Stability calculation (0 to 100)
    const item1Stability = item1Avg > 0 ? (item1Low / item1Avg) * 100 : 0;
    const item2Stability = item2Avg > 0 ? (item2Low / item2Avg) * 100 : 0;
    const maxStability = 100;

    const radarData = {
        dimensions: [
            { name: '平均帧率', max: maxAvg },
            { name: '1% Low', max: maxLow },
            { name: '稳定性', max: maxStability },
            { name: '跑分 (预估)', max: maxLudashi },
            { name: '功耗', max: maxPower, inverse: true }
        ],
        dataA: [item1Avg, item1Low, item1Stability, item1Ludashi, item1Power],
        dataB: [item2Avg, item2Low, item2Stability, item2Ludashi, item2Power],
        colorA, colorB, fillA: bgA, fillB: bgB
    };

    return (
        <div className="flex flex-col gap-6 w-full">
            
            {/* === 顶部结论横幅 (Hero Banner) === */}
            {winner !== 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative">
                    {/* Item A Card */}
                    <div className={`relative flex-1 bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border ${winner === 1 ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-slate-100'} transition-all flex flex-col items-center z-10`}>
                        {winner === 1 && (
                            <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex flex-col items-center animate-crown-bounce">
                                <Crown className="text-emerald-500 fill-emerald-500 drop-shadow-md" size={28} />
                                <div className="bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest mt-1 shadow-md">Winner</div>
                            </div>
                        )}
                        <div className="text-[15px] font-bold text-slate-800 text-center mt-2">{item1Name}</div>
                        <div className="text-[12px] text-slate-500 mt-1">平均帧数</div>
                        <div className={`text-4xl font-black font-mono mt-2 ${winner === 1 ? 'text-[#5B5CE6]' : 'text-slate-400'}`}>
                            {item1Avg} <span className="text-sm font-sans opacity-60">FPS</span>
                        </div>
                    </div>

                    {/* VS Badge */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 animate-vs-pulse">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-orange-500 text-white flex items-center justify-center font-black italic text-xl shadow-[0_0_20px_rgba(239,68,68,0.4)] border-4 border-[#F8F9FC]">
                            VS
                        </div>
                    </div>

                    {/* Item B Card */}
                    <div className={`relative flex-1 bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border ${winner === 2 ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-slate-100'} transition-all flex flex-col items-center z-10`}>
                        {winner === 2 && (
                            <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex flex-col items-center animate-crown-bounce">
                                <Crown className="text-emerald-500 fill-emerald-500 drop-shadow-md" size={28} />
                                <div className="bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest mt-1 shadow-md">Winner</div>
                            </div>
                        )}
                        <div className="text-[15px] font-bold text-slate-800 text-center mt-2">{item2Name}</div>
                        <div className="text-[12px] text-slate-500 mt-1">平均帧数</div>
                        <div className={`text-4xl font-black font-mono mt-2 ${winner === 2 ? 'text-[#F97316]' : 'text-slate-400'}`}>
                            {item2Avg} <span className="text-sm font-sans opacity-60">FPS</span>
                        </div>
                    </div>
                </div>
            )}

            {/* === 数据对比区域 (Bars & Radar) === */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* 左侧：横向进度条 */}
                <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-[16px] font-bold text-slate-800">帧数对比</h3>
                        {winner !== 0 && (
                            <div className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[12px] font-bold">
                                帧差: +{diffPercent}%
                            </div>
                        )}
                    </div>

                    {/* Average FPS */}
                    <div className="mb-6">
                        <div className="text-[12px] text-slate-500 mb-2 font-bold uppercase">Average FPS (平均帧)</div>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="w-[120px] text-[12px] font-bold text-slate-700 truncate">{item1Name}</div>
                                <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden relative">
                                    <motion.div 
                                        initial={{width:0}} animate={{width: `${Math.min(100, (item1Avg / maxAvg) * 100)}%`}} 
                                        transition={{duration: 0.8}} 
                                        className={`h-full rounded-full bg-gradient-to-r from-indigo-400 to-[#5B5CE6] ${winner === 1 ? 'animate-bar-glow-a' : ''}`} 
                                    />
                                </div>
                                <div className={`w-[40px] text-right font-mono font-bold text-[14px] ${winner === 1 ? 'text-[#5B5CE6]' : 'text-slate-500'}`}>{item1Avg}</div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-[120px] text-[12px] font-bold text-slate-700 truncate">{item2Name}</div>
                                <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden relative">
                                    <motion.div 
                                        initial={{width:0}} animate={{width: `${Math.min(100, (item2Avg / maxAvg) * 100)}%`}} 
                                        transition={{duration: 0.8}} 
                                        className={`h-full rounded-full bg-gradient-to-r from-orange-400 to-[#F97316] ${winner === 2 ? 'animate-bar-glow-b' : ''}`} 
                                    />
                                </div>
                                <div className={`w-[40px] text-right font-mono font-bold text-[14px] ${winner === 2 ? 'text-[#F97316]' : 'text-slate-500'}`}>{item2Avg}</div>
                            </div>
                        </div>
                    </div>

                    {/* 1% Low FPS */}
                    <div className="pt-4 border-t border-slate-100">
                        <div className="text-[12px] text-slate-500 mb-2 font-bold uppercase">1% Low (最低帧)</div>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="w-[120px] text-[12px] font-bold text-slate-700 truncate">{item1Name}</div>
                                <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden relative">
                                    <motion.div 
                                        initial={{width:0}} animate={{width: `${Math.min(100, (item1Low / maxLow) * 100)}%`}} 
                                        transition={{duration: 0.8, delay: 0.2}} 
                                        className="h-full rounded-full bg-indigo-300" 
                                    />
                                </div>
                                <div className="w-[40px] text-right font-mono font-bold text-[13px] text-slate-500">{item1Low}</div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-[120px] text-[12px] font-bold text-slate-700 truncate">{item2Name}</div>
                                <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden relative">
                                    <motion.div 
                                        initial={{width:0}} animate={{width: `${Math.min(100, (item2Low / maxLow) * 100)}%`}} 
                                        transition={{duration: 0.8, delay: 0.2}} 
                                        className="h-full rounded-full bg-orange-300" 
                                    />
                                </div>
                                <div className="w-[40px] text-right font-mono font-bold text-[13px] text-slate-500">{item2Low}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 右侧：雷达图 & 胜利标签 */}
                <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col items-center relative">
                    <h3 className="text-[16px] font-bold text-slate-800 self-start mb-2">多维对比</h3>
                    
                    <RadarChart data={radarData} size={220} />
                    
                    <div className="flex gap-4 mt-2 text-[11px] font-bold text-slate-500 mb-6">
                        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-indigo-500 opacity-80"></div>{item1Name}</div>
                        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-orange-500 opacity-80"></div>{item2Name}</div>
                    </div>

                    <div className="w-full pt-4 border-t border-slate-100 flex flex-col gap-2">
                        <h4 className="text-[13px] font-bold text-slate-800 mb-1">多维胜出总结</h4>
                        <div className="flex flex-wrap gap-2">
                            {/* Avg */}
                            <div className={`px-3 py-1.5 rounded-lg text-[12px] font-bold flex items-center gap-1.5 ${item1Avg >= item2Avg ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600'}`}>
                                <CheckCircle2 size={14} /> 平均帧率: {item1Avg >= item2Avg ? item1Name : item2Name} 胜
                            </div>
                            
                            {/* Low */}
                            <div className={`px-3 py-1.5 rounded-lg text-[12px] font-bold flex items-center gap-1.5 ${item1Low >= item2Low ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600'}`}>
                                <CheckCircle2 size={14} /> 1% Low: {item1Low >= item2Low ? item1Name : item2Name} 胜
                            </div>

                            {/* Stability */}
                            <div className={`px-3 py-1.5 rounded-lg text-[12px] font-bold flex items-center gap-1.5 ${item1Stability >= item2Stability ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600'}`}>
                                <CheckCircle2 size={14} /> 稳定性: {item1Stability >= item2Stability ? item1Name : item2Name} 胜 ({Math.max(item1Stability, item2Stability).toFixed(1)}%)
                            </div>

                            {/* LuDaShi */}
                            {(item1Ludashi > 0 || item2Ludashi > 0) && (
                                <div className={`px-3 py-1.5 rounded-lg text-[12px] font-bold flex items-center gap-1.5 ${item1Ludashi >= item2Ludashi ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600'}`}>
                                    <CheckCircle2 size={14} /> 鲁大师跑分: {item1Ludashi >= item2Ludashi ? item1Name : item2Name} 胜
                                </div>
                            )}

                            {/* Power (inverse, lower is better) */}
                            {(item1Power > 0 || item2Power > 0) && (
                                <div className={`px-3 py-1.5 rounded-lg text-[12px] font-bold flex items-center gap-1.5 ${item1Power <= item2Power ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600'}`}>
                                    <CheckCircle2 size={14} /> 功耗表现: {item1Power <= item2Power ? item1Name : item2Name} 胜 ({Math.min(item1Power || Infinity, item2Power || Infinity)}W)
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
