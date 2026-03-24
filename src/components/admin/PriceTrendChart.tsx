/**
 * 价格趋势图表组件
 * 展示硬件价格变化趋势和今日涨跌统计
 */
import { useState, useEffect } from 'react';
import {
    XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, BarChart, Bar, Legend,
    LineChart, Line
} from 'recharts';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, RefreshCw, Filter } from 'lucide-react';

interface PriceTrendData {
    todaySummary: {
        upCount: number;
        downCount: number;
        totalChanges: number;
        avgUpAmount: number;
        avgDownAmount: number;
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
        hardwareId: number;
        hardwareName: string;
        category: string;
        oldPrice: number;
        newPrice: number;
        changeAmount: number;
        changePercent: number;
        changedAt: string;
    }>;
    categories: string[];
}

interface ProductPriceTrendData {
    productTrends: Array<{
        hardwareId: string;
        name: string;
        points: Array<{ date: string; price: number; oldPrice: number }>;
    }>;
    categoryAvgTrend: Array<{
        date: string;
        avgPrice: number;
        count: number;
    }>;
    categoryTotalAvgTrend: Array<{
        date: string;
        avgPrice: number;
    }>;
    products: Array<{
        id: string;
        name: string;
        price: number;
        category: string;
    }>;
}

const CATEGORY_LABELS: Record<string, string> = {
    cpu: 'CPU', gpu: '显卡', mainboard: '主板', ram: '内存',
    disk: '硬盘/SSD', psu: '电源', power: '电源', case: '机箱',
    cooler: '散热器', cooling: '散热', fan: '风扇',
    monitor: '显示器', mouse: '鼠标', keyboard: '键盘',
    accessory: '配件', all: '全部品类'
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
                                {entry.name === 'upCount' ? '涨价数量' : '降价数量'}
                            </span>
                            <span className="font-bold text-slate-800">{entry.value}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

export default function PriceTrendChart() {
    const [data, setData] = useState<PriceTrendData | null>(null);
    const [trendData, setTrendData] = useState<ProductPriceTrendData | null>(null);
    const [loading, setLoading] = useState(true);
    const [category, setCategory] = useState('all');
    const [ramGeneration, setRamGeneration] = useState('');
    const [subcategory, setSubcategory] = useState('');
    const [subcategories, setSubcategories] = useState<string[]>([]);
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [days, setDays] = useState(30);
    const [magnitudeFilter, setMagnitudeFilter] = useState<'all' | 'large' | 'small'>('all'); // Magnitude filter

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('xiaoyu_token');
            const headers = { 'Authorization': `Bearer ${token}` };
            
            // If category is ram/disk, fetch the subcategories first if we don't have them
            let availableSubcats: string[] = [];
            if (['ram', 'disk'].includes(category)) {
                try {
                    const resSub = await fetch(`/api/stats/public-category-trends/${category}?days=${days}`, { headers });
                    if (resSub.ok) {
                        const subData = await resSub.json();
                        availableSubcats = subData.groups?.map((g: any) => g.label) || [];
                        setSubcategories(availableSubcats);
                    }
                } catch(e) { console.error('Failed to load subcategories', e) }
            } else {
                setSubcategories([]);
                setSubcategory('');
            }

            // Ensure current subcategory is still valid
            const currentSubcat = category === 'all' ? '' : (availableSubcats.includes(subcategory) ? subcategory : '');
            if (currentSubcat !== subcategory && ['ram', 'disk'].includes(category)) {
                setSubcategory(currentSubcat);
            }
            
            // Pass the most specific filter: if subcat exists, pass it; else if ramGen exists, pass it
            const backendFilter = currentSubcat || (category === 'ram' ? ramGeneration : '');

            const [resStats, resHistory] = await Promise.all([
                fetch(`/api/stats/price-trends?days=${days}&category=${category === 'all' ? '' : category}&subcategory=${backendFilter}`, { headers }),
                fetch(`/api/stats/product-price-history?days=${days}&category=${category === 'all' ? '' : category}&subcategory=${backendFilter}`, { headers })
            ]);

            if (resStats.ok && resHistory.ok) {
                setData(await resStats.json());
                const hData = await resHistory.json();
                setTrendData(hData);
                // Reset product selection if category changes, or auto-select first
                if (!hData.products.find((p: any) => String(p.id) === selectedProductId)) {
                    setSelectedProductId('');
                }
            }
        } catch (e) {
            console.error('Failed to load price trends:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { 
        // Whenever category changes, we should reset subcategory unless we want it sticky
        if (category !== 'ram') setRamGeneration('');
        fetchData(); 
    }, [category, subcategory, ramGeneration, days]);

    if (loading) {
        return (
            <div className="flex justify-center items-center py-16">
                <RefreshCw className="animate-spin text-indigo-500" size={24} />
            </div>
        );
    }

    if (!data) return null;

    const { todaySummary, chartData, recentChanges } = data;

    return (
        <div className="space-y-6">
            {/* 今日涨跌概览 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-rose-50 to-rose-100 p-5 rounded-2xl border border-rose-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-1">今日涨价</div>
                            <div className="text-3xl font-extrabold text-rose-600">{todaySummary.upCount}</div>
                            <div className="text-xs text-rose-400 mt-1">
                                {todaySummary.avgUpAmount > 0 ? `平均涨幅 ¥${todaySummary.avgUpAmount}` : '暂无涨价'}
                            </div>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-rose-200/60 flex items-center justify-center">
                            <ArrowUpRight size={24} className="text-rose-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-5 rounded-2xl border border-emerald-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">今日降价</div>
                            <div className="text-3xl font-extrabold text-emerald-600">{todaySummary.downCount}</div>
                            <div className="text-xs text-emerald-400 mt-1">
                                {todaySummary.avgDownAmount < 0 ? `平均降幅 ¥${Math.abs(todaySummary.avgDownAmount)}` : '暂无降价'}
                            </div>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-emerald-200/60 flex items-center justify-center">
                            <ArrowDownRight size={24} className="text-emerald-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-2xl border border-blue-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">今日总变动</div>
                            <div className="text-3xl font-extrabold text-blue-600">{todaySummary.totalChanges}</div>
                            <div className="text-xs text-blue-400 mt-1">件硬件价格调整</div>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-blue-200/60 flex items-center justify-center">
                            <TrendingUp size={24} className="text-blue-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* 筛选器 */}
            <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                    <Filter size={14} className="text-slate-400" />
                    <select
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                        className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    >
                        <option value="all">全部品类</option>
                        {data.categories.map(c => (
                            <option key={c} value={c}>{CATEGORY_LABELS[c] || c}</option>
                        ))}
                    </select>

                    {category === 'ram' && (
                        <select
                            value={ramGeneration}
                            onChange={e => {
                                setRamGeneration(e.target.value);
                                setSubcategory(''); // Reset specific spec when generation changes
                            }}
                            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        >
                            <option value="">全部代数 (DDR4/5)</option>
                            <option value="DDR4">DDR4 专区</option>
                            <option value="DDR5">DDR5 专区</option>
                        </select>
                    )}

                    {subcategories.length > 0 && (
                        <select
                            value={subcategory}
                            onChange={e => setSubcategory(e.target.value)}
                            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        >
                            <option value="">全部具体规格</option>
                            {subcategories
                                .filter(s => !ramGeneration || s.includes(ramGeneration))
                                .map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                        </select>
                    )}

                    {category !== 'all' && trendData && trendData.products && (
                        <select
                            value={selectedProductId}
                            onChange={e => setSelectedProductId(e.target.value)}
                            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none max-w-[200px]"
                        >
                            <option value="">查看单品走势...</option>
                            {trendData.products.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    )}
                </div>
                <div className="flex gap-1">
                    {[7, 14, 30].map(d => (
                        <button
                            key={d}
                            onClick={() => setDays(d)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${days === d
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            {d}天
                        </button>
                    ))}
                </div>
            </div>

            {/* 折线图 */}
            {chartData.length > 0 ? (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4">调价次数走势</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }} barGap={8}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }}
                                tickFormatter={(v: string) => v.slice(5)}
                                axisLine={false}
                                tickLine={false}
                                dy={10}
                            />
                            <YAxis
                                tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }}
                                axisLine={false}
                                tickLine={false}
                                dx={-10}
                            />
                            <Tooltip
                                content={<CustomTooltip />}
                                cursor={{ fill: '#f8fafc' }}
                            />
                            <Legend
                                wrapperStyle={{ paddingTop: '20px' }}
                                formatter={(value: string) => {
                                    const labels: Record<string, string> = {
                                        upCount: '涨价 (件)',
                                        downCount: '降价 (件)'
                                    };
                                    return <span className="text-sm font-medium text-slate-600 ml-1">{labels[value] || value}</span>;
                                }}
                            />
                            <Bar dataKey="upCount" fill="#f43f5e" maxBarSize={32} radius={[6, 6, 0, 0]} />
                            <Bar dataKey="downCount" fill="#10b981" maxBarSize={32} radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
                    <TrendingDown size={40} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-400 text-sm">暂无价格变动记录</p>
                    <p className="text-slate-300 text-xs mt-1">修改硬件价格后，变动记录将自动显示在此处</p>
                </div>
            )}

            {/* 品类均价走势 */}
            {trendData && trendData.categoryTotalAvgTrend && trendData.categoryTotalAvgTrend.length > 0 && category !== 'all' && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            {subcategory ? `${subcategory} ` : ramGeneration ? `${ramGeneration} ` : `${CATEGORY_LABELS[category] || category}品类`}历史基准均价走势
                        </h3>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                <span className="w-3 h-0.5 bg-indigo-500"></span> 真实平均价格 ({subcategory ? '该规格所有商品' : ramGeneration ? `所有${ramGeneration}商品` : '大类所有商品'})
                            </div>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart 
                            data={trendData.categoryTotalAvgTrend} 
                            margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis 
                                dataKey="date" 
                                tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }}
                                tickFormatter={(v: string) => v.slice(5)}
                                axisLine={false} tickLine={false} dy={10} 
                            />
                            <YAxis 
                                tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }}
                                axisLine={false} tickLine={false} dx={-10}
                                domain={['auto', 'auto']}
                                tickFormatter={(v) => `¥${v}`}
                            />
                            <Tooltip 
                                content={({ active, payload, label }: any) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        return (
                                            <div className="bg-white/95 backdrop-blur-md p-4 rounded-xl border border-slate-200 shadow-xl shadow-slate-200/50 min-w-[180px]">
                                                <p className="font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2">{label}</p>
                                                <div className="space-y-2.5">
                                                    <div className="flex items-center justify-between gap-4">
                                                        <span className="flex items-center gap-2 text-sm text-indigo-600">
                                                            <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                                            真实均价
                                                        </span>
                                                        <span className="font-bold text-indigo-600">¥{data.avgPrice}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Line 
                                type="monotone" 
                                dataKey="avgPrice" 
                                stroke="#6366f1" 
                                strokeWidth={3}
                                connectNulls={true}
                                dot={{ fill: '#6366f1', strokeWidth: 2, r: 3 }}
                                activeDot={{ r: 6, strokeWidth: 0 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* 单品走势 */}
            {selectedProductId && trendData && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    {(() => {
                        const productData = trendData.productTrends.find(p => String(p.hardwareId) === selectedProductId);
                        if (!productData || productData.points.length === 0) {
                            return (
                                <div className="text-center py-8">
                                    <TrendingDown size={32} className="mx-auto text-slate-300 mb-2" />
                                    <p className="text-slate-400 text-sm">该产品在此期间无价格变动记录</p>
                                </div>
                            );
                        }
                        return (
                            <>
                                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    {productData.name} 价格走势
                                </h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={productData.points} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis 
                                            dataKey="date" 
                                            tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }}
                                            tickFormatter={(v: string) => v.slice(5)}
                                            axisLine={false} tickLine={false} dy={10} 
                                        />
                                        <YAxis 
                                            tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }}
                                            axisLine={false} tickLine={false} dx={-10}
                                            domain={['auto', 'auto']}
                                            tickFormatter={(v) => `¥${v}`}
                                        />
                                        <Tooltip 
                                            content={({ active, payload, label }: any) => {
                                                if (active && payload && payload.length) {
                                                    const point = payload[0].payload;
                                                    const diff = point.price - point.oldPrice;
                                                    return (
                                                        <div className="bg-white/90 backdrop-blur-md p-4 rounded-xl border border-slate-200 shadow-xl shadow-slate-200/50">
                                                            <p className="font-bold text-slate-800 mb-2">{label}</p>
                                                            <div className="flex items-center justify-between gap-4 text-sm mb-1">
                                                                <span className="text-slate-600">调整后:</span>
                                                                <span className="font-bold text-slate-800">¥{point.price}</span>
                                                            </div>
                                                            <div className="flex items-center justify-between gap-4 text-sm mb-2 pb-2 border-b border-slate-100">
                                                                <span className="text-slate-600">调整前:</span>
                                                                <span className="text-slate-500 line-through">¥{point.oldPrice}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1 text-xs font-bold">
                                                                {diff > 0 ? (
                                                                    <span className="text-rose-500 flex items-center"><ArrowUpRight size={14} /> 涨 ¥{diff}</span>
                                                                ) : diff < 0 ? (
                                                                    <span className="text-emerald-500 flex items-center"><ArrowDownRight size={14} /> 降 ¥{Math.abs(diff)}</span>
                                                                ) : (
                                                                    <span className="text-slate-400">无变化</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Line 
                                            type="stepAfter" 
                                            dataKey="price" 
                                            stroke="#f59e0b" 
                                            strokeWidth={3}
                                            dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                                            activeDot={{ r: 6, strokeWidth: 0 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </>
                        );
                    })()}
                </div>
            )}

            {/* 最近变更记录 */}
            {recentChanges.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="font-bold text-slate-800">最近价格变更</h3>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 mr-2">变动幅度:</span>
                            <div className="flex bg-slate-100 p-1 rounded-lg">
                                {(['all', 'large', 'small'] as const).map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setMagnitudeFilter(f)}
                                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                                            magnitudeFilter === f 
                                            ? 'bg-white text-indigo-600 shadow-sm' 
                                            : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                    >
                                        {f === 'all' ? '全部' : f === 'large' ? '大额 (¥50+)' : '微调 (<¥50)'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="text-left px-4 py-2.5 text-xs font-bold text-slate-400 uppercase">硬件名称 (点击查看模型走势)</th>
                                    <th className="text-left px-4 py-2.5 text-xs font-bold text-slate-400 uppercase">品类</th>
                                    <th className="text-right px-4 py-2.5 text-xs font-bold text-slate-400 uppercase">原价</th>
                                    <th className="text-right px-4 py-2.5 text-xs font-bold text-slate-400 uppercase">新价</th>
                                    <th className="text-right px-4 py-2.5 text-xs font-bold text-slate-400 uppercase">变动</th>
                                    <th className="text-right px-4 py-2.5 text-xs font-bold text-slate-400 uppercase">时间</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {recentChanges
                                    .filter(c => {
                                        if (magnitudeFilter === 'all') return true;
                                        const absChange = Math.abs(c.changeAmount);
                                        return magnitudeFilter === 'large' ? absChange >= 50 : absChange < 50;
                                    })
                                    .map((c, i) => (
                                    <tr 
                                        key={i} 
                                        onClick={() => {
                                            setSelectedProductId(String(c.hardwareId));
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                        className={`group cursor-pointer hover:bg-indigo-50/50 transition-colors ${String(c.hardwareId) === selectedProductId ? 'bg-indigo-50 shadow-inner' : ''}`}
                                    >
                                        <td className="px-4 py-3 font-medium text-slate-700 group-hover:text-indigo-600 transition-colors">
                                            {c.hardwareName}
                                        </td>
                                        <td className="px-4 py-3 text-slate-500">{CATEGORY_LABELS[c.category] || c.category}</td>
                                        <td className="px-4 py-3 text-right text-slate-500">¥{c.oldPrice}</td>
                                        <td className="px-4 py-3 text-right font-bold text-slate-800">¥{c.newPrice}</td>
                                        <td className={`px-4 py-3 text-right font-bold ${c.changeAmount > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                            {c.changeAmount > 0 ? '+' : ''}{c.changeAmount}
                                            <span className="text-xs ml-1">({c.changePercent > 0 ? '+' : ''}{c.changePercent}%)</span>
                                        </td>
                                        <td className="px-4 py-3 text-right text-xs text-slate-400">
                                            {new Date(c.changedAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
