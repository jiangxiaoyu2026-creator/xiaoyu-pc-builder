import { useState, useEffect } from 'react';
import {
    XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, BarChart, Bar, Legend
} from 'recharts';
import { TrendingUp, ArrowUpRight, ArrowDownRight, RefreshCw, X, AlertCircle } from 'lucide-react';

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
            <div className="bg-white/90 backdrop-blur-md p-4 rounded-xl border border-slate-200 shadow-xl shadow-slate-200/50 min-w-[150px]">
                <p className="font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2">{label}</p>
                <div className="space-y-2">
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center justify-between gap-6 text-sm">
                            <span className="flex items-center gap-2 font-medium" style={{ color: entry.color }}>
                                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
                                {entry.name === 'upCount' ? '涨价配件' : '降价配件'}
                            </span>
                            <span className="font-bold text-slate-800">{entry.value}件</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

interface Props {
    onClose: () => void;
}

export default function ClientPriceTrendModal({ onClose }: Props) {
    const [data, setData] = useState<PublicPriceTrendData | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('/api/stats/public-price-trends?days=14');
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

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 pb-20 sm:pb-6 animate-fade-in">
            <div className="bg-white rounded-[32px] w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-full border border-slate-100 relative">

                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <TrendingUp size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">硬件行情雷达</h2>
                            <p className="text-xs text-slate-500 font-medium">近14天价格波动趋势</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col justify-center items-center py-20 text-indigo-500">
                            <RefreshCw className="animate-spin mb-4" size={32} />
                            <p className="text-sm font-medium animate-pulse">正在获取最新行情数据...</p>
                        </div>
                    ) : !data ? (
                        <div className="flex flex-col justify-center items-center py-20 text-slate-400 flex-1">
                            <AlertCircle size={48} className="mb-4 opacity-50" />
                            <p className="font-bold mb-1 text-slate-500">无法拉取行情数据</p>
                            <p className="text-xs text-slate-400">请检查网络连接后重试</p>
                        </div>
                    ) : (
                        <div className="space-y-6">

                            {/* Today Summary */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100/50 relative overflow-hidden group">
                                    <div className="absolute right-[-10px] bottom-[-10px] opacity-10 group-hover:scale-110 transition-transform duration-500">
                                        <ArrowDownRight size={80} className="text-emerald-500" />
                                    </div>
                                    <p className="text-xs font-bold text-emerald-600/80 mb-1">今日降价 (件)</p>
                                    <div className="text-3xl font-black text-emerald-600 relative z-10">{data.todaySummary.downCount}</div>
                                </div>
                                <div className="bg-rose-50 rounded-2xl p-4 border border-rose-100/50 relative overflow-hidden group">
                                    <div className="absolute right-[-10px] bottom-[-10px] opacity-10 group-hover:scale-110 transition-transform duration-500">
                                        <ArrowUpRight size={80} className="text-rose-500" />
                                    </div>
                                    <p className="text-xs font-bold text-rose-600/80 mb-1">今日涨价 (件)</p>
                                    <div className="text-3xl font-black text-rose-600 relative z-10">{data.todaySummary.upCount}</div>
                                </div>
                                <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100/50 relative overflow-hidden group col-span-2 md:col-span-1 hidden md:block">
                                    <div className="absolute right-[-10px] bottom-[-10px] opacity-10 group-hover:scale-110 transition-transform duration-500">
                                        <TrendingUp size={80} className="text-indigo-500" />
                                    </div>
                                    <p className="text-xs font-bold text-indigo-600/80 mb-1">今日变动总计</p>
                                    <div className="text-3xl font-black text-indigo-600 relative z-10">{data.todaySummary.totalChanges}</div>
                                </div>
                            </div>

                            {/* Chart */}
                            {data.chartData.length > 0 && (
                                <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm">
                                    <ResponsiveContainer width="100%" height={260}>
                                        <BarChart data={data.chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }} barGap={8}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis
                                                dataKey="date"
                                                tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 500 }}
                                                tickFormatter={(v: string) => v.slice(5)}
                                                axisLine={false}
                                                tickLine={false}
                                                dy={10}
                                            />
                                            <YAxis
                                                tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 500 }}
                                                axisLine={false}
                                                tickLine={false}
                                                dx={-10}
                                            />
                                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                                            <Legend
                                                wrapperStyle={{ paddingTop: '10px' }}
                                                formatter={(value: string) => {
                                                    const labels: Record<string, string> = { upCount: '涨价数量', downCount: '降价数量' };
                                                    return <span className="text-xs font-medium text-slate-500 ml-1">{labels[value] || value}</span>;
                                                }}
                                            />
                                            <Bar dataKey="upCount" fill="#f43f5e" maxBarSize={28} radius={[6, 6, 0, 0]} />
                                            <Bar dataKey="downCount" fill="#10b981" maxBarSize={28} radius={[6, 6, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}

                            {/* Recent Changes List */}
                            {data.recentChanges.length > 0 && (
                                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mt-6">
                                    <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div>
                                            <div className="font-bold text-sm text-slate-700">最新降价监控</div>
                                            <div className="text-[10px] text-slate-400 font-medium">看准时机，抄底入手</div>
                                        </div>

                                        {/* Filters */}
                                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
                                            {['all', ...Array.from(new Set(data.recentChanges.map(c => c.category)))].map(cat => (
                                                <button
                                                    key={cat}
                                                    onClick={() => setSelectedCategory(cat)}
                                                    className={`px-3 py-1 text-xs font-bold rounded-full whitespace-nowrap transition-colors ${selectedCategory === cat
                                                            ? 'bg-slate-800 text-white shadow-sm'
                                                            : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                                                        }`}
                                                >
                                                    {cat === 'all' ? '全部零件' : CATEGORY_LABELS[cat] || cat}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="divide-y divide-slate-50">
                                        {data.recentChanges.filter(c => selectedCategory === 'all' || c.category === selectedCategory).map((c, i) => (
                                            <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                                                <div className="flex-1 min-w-0 pr-4">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase">
                                                            {CATEGORY_LABELS[c.category] || c.category}
                                                        </span>
                                                        <span className="text-xs text-slate-400">
                                                            {new Date(c.changedAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <div className="font-bold text-sm text-slate-800 truncate" title={c.hardwareName}>
                                                        {c.hardwareName}
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <div className="flex items-baseline justify-end gap-1.5">
                                                        <span className="text-xs text-slate-400 line-through">¥{c.oldPrice}</span>
                                                        <span className="font-black text-lg text-slate-800">¥{c.newPrice}</span>
                                                    </div>
                                                    <div className={`text-xs font-bold mt-0.5 flex items-center justify-end gap-1 ${c.changeAmount > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                        {c.changeAmount > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                                        {Math.abs(c.changeAmount)}元 ({Math.abs(c.changePercent)}%)
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
