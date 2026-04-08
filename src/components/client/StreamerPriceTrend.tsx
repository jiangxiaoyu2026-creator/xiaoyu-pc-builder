import { useState, useEffect } from 'react';
import {
    XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, BarChart, Bar, Legend
} from 'recharts';
import { TrendingUp, ArrowUpRight, ArrowDownRight, RefreshCw, AlertCircle } from 'lucide-react';

interface PublicPriceTrendData {
    todaySummary: {
        upCount: number;
        downCount: number;
        totalChanges: number;
    };
    chartData: Array<{
        date: string;
        upCount: number;
        downCount: number;
        totalChanges: number;
        avgChange: number;
    }>;
    recentChanges: Array<{
        id: number;
        hardwareName: string;
        category: string;
        oldPrice: number;
        newPrice: number;
        changeAmount: number;
        changePercent: number;
        changedAt: string;
    }>;
}

const CATEGORY_LABELS: Record<string, string> = {
    cpu: 'CPU', gpu: '显卡', mainboard: '主板', ram: '内存',
    disk: '硬盘', psu: '电源', power: '电源', case: '机箱',
    cooler: '散热', cooling: '散热', fan: '风扇',
    monitor: '显示器', mouse: '鼠标', keyboard: '键盘',
    accessory: '配件'
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl min-w-[150px]">
                <p className="font-bold text-slate-800 dark:text-slate-200 mb-3 border-b border-slate-100 dark:border-slate-700 pb-2">{label}</p>
                <div className="space-y-2">
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center justify-between gap-6 text-sm">
                            <span className="flex items-center gap-2 font-medium" style={{ color: entry.color }}>
                                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
                                {entry.name === 'upCount' ? '涨价配件' : '降价配件'}
                            </span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{entry.value}件</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

interface Props {
    publicMode?: boolean;
}

export default function StreamerPriceTrend({ publicMode }: Props) {
    const [data, setData] = useState<PublicPriceTrendData | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string>(publicMode ? 'cpu' : 'all');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('/api/stats/public-price-trends?days=30');
                if (res.ok) {
                    setData(await res.json());
                }
            } catch (e) {
                console.error('Failed to load public price trends:', e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Helper specific to streaming view: smooth minimal layout instead of boxed modals
    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center py-32 text-indigo-500 w-full">
                <RefreshCw className="animate-spin mb-4" size={32} />
                <p className="text-sm font-medium animate-pulse">正在获取行情核心数据...</p>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex flex-col justify-center items-center py-32 text-slate-400 w-full">
                <AlertCircle size={48} className="mb-4 opacity-50" />
                <p className="font-bold mb-1 text-slate-500">无法拉取行情数据</p>
                <p className="text-xs text-slate-400">请检查网络连接后重试</p>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 animate-fade-in space-y-8 max-w-5xl mx-auto">
            {/* Headers Area */}
            <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    <TrendingUp className="text-purple-600 dark:text-purple-400" /> 
                    硬件行情雷达
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
                    全网价格波动监控，助你踩准装机节点
                </p>
            </div>

            {/* Today Summary */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/30 dark:from-emerald-900/20 dark:to-emerald-800/10 rounded-3xl p-6 border-2 border-emerald-400/20 dark:border-emerald-500/10 relative overflow-hidden group shadow-sm hover:shadow-md transition-shadow">
                    <div className="absolute right-[-10px] bottom-[-10px] opacity-20 group-hover:scale-125 transition-transform duration-700 ease-out">
                        <ArrowDownRight size={100} className="text-emerald-500" />
                    </div>
                    <p className="text-sm font-black text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>今日降价款数
                    </p>
                    <div className="text-5xl font-black text-emerald-600 dark:text-emerald-500 relative z-10 drop-shadow-sm tracking-tighter">
                        {data.todaySummary.downCount}
                    </div>
                </div>
                
                <div className="bg-gradient-to-br from-rose-50 to-rose-100/30 dark:from-rose-900/20 dark:to-rose-800/10 rounded-3xl p-6 border-2 border-rose-400/20 dark:border-rose-500/10 relative overflow-hidden group shadow-sm hover:shadow-md transition-shadow" style={{ animationDelay: '200ms' }}>
                    <div className="absolute right-[-10px] bottom-[-10px] opacity-20 group-hover:scale-125 transition-transform duration-700 ease-out">
                        <ArrowUpRight size={100} className="text-rose-500" />
                    </div>
                    <p className="text-sm font-black text-rose-700 dark:text-rose-400 mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>今日涨价款数
                    </p>
                    <div className="text-5xl font-black text-rose-600 dark:text-rose-500 relative z-10 drop-shadow-sm tracking-tighter">
                        {data.todaySummary.upCount}
                    </div>
                </div>
                
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-6 border border-slate-200/60 dark:border-slate-700 relative overflow-hidden col-span-2 md:col-span-1 hidden md:block">
                    <div className="absolute right-[-10px] bottom-[-10px] opacity-5">
                        <TrendingUp size={100} className="text-slate-500" />
                    </div>
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-2">今日变动总计</p>
                    <div className="text-4xl font-black text-slate-700 dark:text-slate-200 relative z-10">
                        {data.todaySummary.totalChanges}
                    </div>
                </div>
            </div>

            {/* Chart Container */}
            {data.chartData.length > 0 && !publicMode && (
                <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200/60 dark:border-slate-700 p-6 md:p-8 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6">30日价格异动水位图</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={data.chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }} barGap={6}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.5} />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                                tickFormatter={(v: string) => v.slice(5)}
                                axisLine={false}
                                tickLine={false}
                                dy={12}
                            />
                            <YAxis
                                tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                                axisLine={false}
                                tickLine={false}
                                dx={-10}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9', opacity: 0.4 }} />
                            <Legend
                                wrapperStyle={{ paddingTop: '15px' }}
                                formatter={(value: string) => {
                                    const labels: Record<string, string> = { upCount: '涨价数量', downCount: '降价数量' };
                                    return <span className="text-xs font-bold text-slate-600 dark:text-slate-400 ml-1">{labels[value] || value}</span>;
                                }}
                            />
                            <Bar dataKey="upCount" fill="#f43f5e" maxBarSize={24} radius={[6, 6, 0, 0]} />
                            <Bar dataKey="downCount" fill="#10b981" maxBarSize={24} radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Recent Changes List */}
            {data.recentChanges.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200/60 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="p-5 md:p-6 bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">最新异动明细</h3>
                            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5">监控全网各大平台最新调价行为</p>
                        </div>

                        {/* Filters */}
                        <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1 md:pb-0">
                            {publicMode ? (
                                <button
                                    className="px-4 py-1.5 text-[13px] font-bold rounded-full whitespace-nowrap transition-all bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-md"
                                >
                                    CPU
                                </button>
                            ) : (
                                ['all', ...Array.from(new Set(data.recentChanges.map(c => c.category)))].map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`px-4 py-1.5 text-[13px] font-bold rounded-full whitespace-nowrap transition-all ${selectedCategory === cat
                                            ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-md'
                                            : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                                            }`}
                                    >
                                        {cat === 'all' ? '全部品类' : CATEGORY_LABELS[cat] || cat}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                    
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {data.recentChanges.filter(c => selectedCategory === 'all' || c.category === selectedCategory).map((c, i) => (
                            <div key={i} className="p-5 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2.5 mb-1.5">
                                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                                            {CATEGORY_LABELS[c.category] || c.category}
                                        </span>
                                        <span className="text-[13px] text-slate-400 dark:text-slate-500 font-mono">
                                            {new Date(c.changedAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className="font-bold text-base text-slate-800 dark:text-slate-200 pr-4">
                                        {c.hardwareName}
                                    </div>
                                </div>
                                <div className="text-right shrink-0 bg-slate-50 dark:bg-slate-800/50 sm:bg-transparent sm:dark:bg-transparent rounded-xl p-3 sm:p-0">
                                    <div className="flex items-baseline justify-end gap-2.5">
                                        <span className="text-sm text-slate-400 dark:text-slate-500 line-through font-mono">¥{c.oldPrice}</span>
                                        <span className="font-black text-2xl text-slate-900 dark:text-white font-mono tracking-tight">¥{c.newPrice}</span>
                                    </div>
                                    <div className={`text-[13px] font-bold mt-1.5 flex items-center justify-end gap-1 ${c.changeAmount > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                        {c.changeAmount > 0 ? <ArrowUpRight size={14} className="stroke-[3px]"/> : <ArrowDownRight size={14} className="stroke-[3px]"/>}
                                        {Math.abs(c.changeAmount)}元 ({Math.abs(c.changePercent)}%)
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    {publicMode && (
                        <div className="p-6 bg-slate-50 border-t border-slate-100 dark:bg-slate-800/80 dark:border-slate-700 text-center flex flex-col items-center justify-center">
                            <span className="inline-flex items-center justify-center w-12 h-12 bg-amber-100 text-amber-500 rounded-full mb-3">
                                <TrendingUp strokeWidth={3} />
                            </span>
                            <h4 className="font-black text-slate-800 dark:text-slate-200 mb-1">解锁完整行情雷达</h4>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-md">
                                仅展示 CPU 版块异动数据。若需查看显卡、主板、内存等全部 <strong className="text-indigo-500">15</strong> 大类别及其趋势水位图，请您尊享 VIP 会员特权，并前往 <strong className="text-indigo-500">主播中心</strong>。
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
