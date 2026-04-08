import { useState, useEffect, useMemo } from 'react';
import { Trophy, Zap, Shield, RefreshCw, BarChart2 } from 'lucide-react';
import { HardwareItem } from '../../types/adminTypes';
import { ApiService } from '../../services/api';

type RankMode = 'value' | 'performance_multi' | 'performance_single';
type CategoryFilter = 'cpu' | 'gpu'; // Prepared for GPU later

interface RankEntry {
    item: HardwareItem;
    model: string;
    score: number;
    price: number;
    valueRatio: number; // score per 100 RMB
    badge?: 'gold' | 'silver' | 'bronze';
    rank: number;
}

export default function HardwareLeaderboard() {
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<HardwareItem[]>([]);
    const [mode, setMode] = useState<RankMode>('value');
    const [category] = useState<CategoryFilter>('cpu');

    useEffect(() => {
        const fetchItems = async () => {
            setLoading(true);
            try {
                // Fetch all products across several pages if necessary, but 200 should cover CPUs for now
                const res = await ApiService.get(`/products?category=${category}&page=1&page_size=200`);
                setItems(res.items || []);
            } catch (err) {
                console.error("Failed to fetch products for leaderboard", err);
            } finally {
                setLoading(false);
            }
        };
        fetchItems();
    }, [category]);

    const rankedData = useMemo(() => {
        const entries: RankEntry[] = [];
        let maxScore = 0;

        items.forEach(item => {
            if (item.price <= 0) return; // Must have valid price

            // Parse specs
            let specsObj = item.specs;
            if (typeof specsObj === 'string') {
                try { specsObj = JSON.parse(specsObj); } catch { specsObj = {}; }
            }
            if (!specsObj) specsObj = {};

            const modelName = specsObj.cpu || item.model;
            const cbMulti = Number(specsObj.cinebenchR23_multi || 0);
            const cbSingle = Number(specsObj.cinebenchR23_single || 0);

            if (cbMulti > 0) {
                let score = 0;
                if (mode === 'value' || mode === 'performance_multi') {
                    score = cbMulti;
                } else if (mode === 'performance_single') {
                    score = cbSingle;
                }

                if (score > 0) {
                    const valueRatio = (score / item.price) * 100;
                    if (score > maxScore) maxScore = score;
                    entries.push({
                        item,
                        model: modelName,
                        score,
                        price: item.price,
                        valueRatio: Number(valueRatio.toFixed(1)),
                        rank: 0 // Will assign after sorting
                    });
                }
            }
        });

        // Filter out strict duplicates by model name to keep list clean
        const uniqueEntries: RankEntry[] = [];
        const seenModels = new Set();
        // Sort first so we keep the cheapest/highest scoring representation of a duplicated model
        entries.sort((a, b) => mode === 'value' ? b.valueRatio - a.valueRatio : b.score - a.score);
        
        entries.forEach(e => {
            if (!seenModels.has(e.model)) {
                seenModels.add(e.model);
                uniqueEntries.push(e);
            }
        });

        // Assign ranks & badges
        uniqueEntries.forEach((e, idx) => {
            e.rank = idx + 1;
            if (idx === 0) e.badge = 'gold';
            else if (idx === 1) e.badge = 'silver';
            else if (idx === 2) e.badge = 'bronze';
        });

        return { entries: uniqueEntries, maxScore: maxScore || 1 };
    }, [items, mode]);


    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 min-h-[400px]">
                <RefreshCw size={32} className="animate-spin text-slate-300 mb-4" />
                <p className="text-slate-500 font-bold tracking-widest text-xs uppercase">同步核心跑分数据...</p>
            </div>
        );
    }

    // Colors mapping
    const getBadgeColors = (badge?: string) => {
        if (badge === 'gold') return 'bg-amber-100 text-amber-600 border-amber-200 shadow-amber-500/20 shadow-lg';
        if (badge === 'silver') return 'bg-slate-100 text-slate-500 border-slate-200 shadow-slate-500/10 shadow-lg';
        if (badge === 'bronze') return 'bg-orange-50 text-orange-600 border-orange-200 shadow-orange-500/10 shadow-md';
        return 'bg-slate-50 text-slate-400 border-slate-100 flex items-center justify-center';
    };

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto h-full overflow-y-auto hide-scrollbar relative">
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-50/40 dark:bg-indigo-900/10 rounded-full blur-3xl pointer-events-none -mr-40 -mt-40"></div>
            
            {/* Header section */}
            <div className="mb-8 relative z-10 flex flex-col md:flex-row gap-6 md:items-end justify-between">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3 tracking-tight mb-2">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                            <Trophy size={24} />
                        </div>
                        硬件天梯排行榜
                    </h2>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-lg leading-relaxed">
                        基于真实评测得分 (Cinebench) 与小鱼商城底价，为您直观展现哪款心水神贴最具配置购买价值。
                    </p>
                </div>
                
                <div className="flex bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200 dark:border-slate-700/50 backdrop-blur shrink-0 shadow-inner">
                    <button 
                        onClick={() => setMode('value')} 
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-[12px] font-black text-xs transition-all tracking-wide ${mode === 'value' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm border border-slate-200/50 dark:border-slate-600' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        <Zap size={16} className={mode === 'value' ? 'text-indigo-500' : ''} /> 综合性价比
                    </button>
                    <button 
                        onClick={() => setMode('performance_multi')} 
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-[12px] font-black text-xs transition-all tracking-wide ${mode === 'performance_multi' ? 'bg-white dark:bg-slate-700 text-purple-600 shadow-sm border border-slate-200/50 dark:border-slate-600' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        <BarChart2 size={16} className={mode === 'performance_multi' ? 'text-purple-500' : ''} /> 多核绝对战力
                    </button>
                    <button 
                        onClick={() => setMode('performance_single')} 
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-[12px] font-black text-xs transition-all tracking-wide hidden sm:flex ${mode === 'performance_single' ? 'bg-white dark:bg-slate-700 text-sky-600 shadow-sm border border-slate-200/50 dark:border-slate-600' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        <Shield size={16} className={mode === 'performance_single' ? 'text-sky-500' : ''} /> 单核性能榜
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="flex flex-col gap-3 relative z-10 pb-20">
                {rankedData.entries.map((entry) => {
                    const isTop3 = entry.rank <= 3;
                    const maxRatio = mode === 'value' ? rankedData.entries[0].valueRatio : rankedData.maxScore;
                    const currentRatio = mode === 'value' ? entry.valueRatio : entry.score;
                    const fillPercentage = (currentRatio / maxRatio) * 100;
                    
                    return (
                        <div 
                            key={entry.rank} 
                            className={`group flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-white dark:bg-slate-800 border transition-all duration-300 ${isTop3 ? 'border-indigo-100 dark:border-indigo-500/20 hover:border-indigo-300 shadow-[0_4px_20px_rgba(0,0,0,0.03)]' : 'border-slate-100 dark:border-slate-700 hover:border-slate-200 shadow-sm'}`}
                        >
                            {/* Ranking Badge */}
                            <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg border ${getBadgeColors(entry.badge)}`}>
                                {isTop3 ? (
                                    <div className="relative">
                                        <Trophy size={20} />
                                        <span className="absolute -bottom-2 -right-2 text-[10px] bg-white rounded-full w-4 h-4 flex items-center justify-center shadow-sm text-slate-800 ring-1 ring-slate-100">{entry.rank}</span>
                                    </div>
                                ) : (
                                    <span>{entry.rank}</span>
                                )}
                            </div>
                            
                            {/* Product Info */}
                            <div className="flex-1 min-w-0 w-full">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-extrabold text-[15px] text-slate-900 dark:text-white truncate">
                                        {entry.model}
                                    </h4>
                                    <div className="text-right shrink-0 ml-4 font-mono font-black text-slate-800 dark:text-slate-200 tracking-tight">
                                        ¥{entry.price}
                                    </div>
                                </div>
                                
                                {/* Progress Bar */}
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden ${mode === 'value' ? 'bg-gradient-to-r from-indigo-400 to-indigo-600' : mode === 'performance_multi' ? 'bg-gradient-to-r from-purple-400 to-purple-600' : 'bg-gradient-to-r from-sky-400 to-sky-600'}`}
                                            style={{ width: `${fillPercentage}%` }}
                                        >
                                            <div className="absolute inset-0 bg-white/20 w-8 blur-sm -skew-x-12 animate-[shimmer_2s_infinite]"></div>
                                        </div>
                                    </div>
                                    <div className="shrink-0 w-24 text-right">
                                        {mode === 'value' ? (
                                            <span className="text-[12px] font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
                                                {entry.valueRatio} <span className="text-[9px] text-slate-400">分/百元</span>
                                            </span>
                                        ) : (
                                            <span className="text-[12px] font-black text-purple-600 dark:text-purple-400 font-mono">
                                                {entry.score} <span className="text-[9px] text-slate-400 font-sans tracking-wide">pts</span>
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
                
                {rankedData.entries.length === 0 && (
                    <div className="text-center py-20 text-slate-400 text-sm font-bold bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 border-dashed rounded-2xl">
                        当前类别暂无具备跑分测试数据的商品...
                    </div>
                )}
            </div>
        </div>
    );
}
