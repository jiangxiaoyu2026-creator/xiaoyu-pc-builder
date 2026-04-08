import { useState, useEffect } from 'react';
import { Network, TrendingUp, TrendingDown, ArrowRight, Minus, RefreshCw, Layers } from 'lucide-react';

interface TrendItem {
    id: number;
    sku_id: string;
    name: string;
    brand: string;
    category: string;
    url: string;
    current_price: number | null;
    previous_price: number | null;
    change_amount: number | null;
    change_percent: number | null;
    last_date: string | null;
    min_price: number | null;
    max_price: number | null;
    total_records: number;
}

interface TrendCategories {
    [category: string]: TrendItem[];
}

export default function JDTrendsMonitor() {
    const [categories, setCategories] = useState<TrendCategories>({});
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editingPrices, setEditingPrices] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/jd-trends');
            if (res.ok) {
                const data = await res.json();
                setCategories(data.categories || {});
            }
        } catch (error) {
            console.error('Failed to fetch JD trends:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handlePriceChange = (skuId: string, value: string) => {
        // Only allow numbers and one decimal point
        if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
            setEditingPrices(prev => ({ ...prev, [skuId]: value }));
        }
    };

    const handleBatchSave = async () => {
        const entries = Object.entries(editingPrices)
            .map(([sku_id, price]) => ({ sku_id, price: parseFloat(price) }))
            .filter(entry => !isNaN(entry.price) && entry.price > 0);

        if (entries.length === 0) {
            setIsEditing(false);
            return;
        }

        setSaving(true);
        try {
            const res = await fetch('/api/jd-trends/price/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ entries })
            });
            
            if (res.ok) {
                setEditingPrices({});
                setIsEditing(false);
                await fetchData(); // Refresh data to show new prices and trends
            } else {
                alert('保存失败，请检查网络或后端日志。');
            }
        } catch (error) {
            console.error('Failed to batch save prices:', error);
            alert('保存出错。');
        } finally {
            setSaving(false);
        }
    };

    const getTrendBadge = (item: TrendItem) => {
        if (item.change_amount === null || item.change_amount === 0) {
            return (
                <div className="flex items-center gap-1 text-slate-400 bg-slate-100 px-2 py-1 rounded-md text-sm font-semibold">
                    <Minus size={14} /> 持平
                </div>
            );
        }
        
        // 国内习惯：红涨绿跌
        if (item.change_amount > 0) {
            return (
                <div className="flex items-center gap-1 text-red-600 bg-red-50 text-red-600 px-2 py-1 rounded-md text-sm font-bold border border-red-100 shadow-sm">
                    <TrendingUp size={14} /> 涨 ¥{item.change_amount.toFixed(2)}
                </div>
            );
        } else {
            return (
                <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md text-sm font-bold border border-emerald-100 shadow-sm">
                    <TrendingDown size={14} /> 降 ¥{Math.abs(item.change_amount).toFixed(2)}
                </div>
            );
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20 text-slate-400 gap-2">
                <RefreshCw className="animate-spin" size={24} />
                <span>正在加载大盘数据...</span>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-page-enter max-w-7xl mx-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <Network className="text-brand-500" /> 京东核心部件价格风向标
                    </h2>
                    <p className="text-slate-500 mt-1 text-sm">京东反爬极严，自动化抓取易被封锁。点击“录入今日价格”即可快速手动更新大盘。</p>
                </div>
                <div className="flex items-center gap-3">
                    {isEditing ? (
                        <>
                            <button
                                onClick={() => { setIsEditing(false); setEditingPrices({}); }}
                                className="px-4 py-2 text-slate-500 hover:text-slate-700 text-sm font-medium transition-colors"
                                disabled={saving}
                            >
                                取消
                            </button>
                            <button
                                onClick={handleBatchSave}
                                disabled={saving}
                                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-sm font-bold transition-all shadow-md shadow-indigo-200 active:scale-95 disabled:opacity-70"
                            >
                                {saving ? <RefreshCw className="animate-spin" size={16} /> : '💾 保存价格'}
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-5 py-2 rounded-xl text-sm font-bold transition-all shadow-md active:scale-95"
                        >
                            <TrendingUp size={16} />
                            录入今日价格
                        </button>
                    )}
                    <button
                        onClick={fetchData}
                        disabled={isEditing || saving}
                        className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-sm active:scale-95 disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                        刷新
                    </button>
                </div>
            </div>

            {Object.keys(categories).length === 0 ? (
                <div className="text-center p-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
                    <p className="text-slate-500">暂无监控数据。请验证爬虫脚本是否已被执行。</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* 按分类渲染独立区块 */}
                    {Object.entries(categories).map(([catName, items]) => (
                        <div key={catName} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 card-hover-lift">
                            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 pb-3 border-b border-slate-100">
                                <Layers size={20} className="text-indigo-500" /> {catName}
                                <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full text-xs font-semibold ml-2">
                                    {items.length} 款
                                </span>
                            </h3>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b-2 border-slate-100">
                                            <th className="pb-3 pl-2">品牌</th>
                                            <th className="pb-3">商品型号名称</th>
                                            <th className="pb-3 text-right">历史最低/最高</th>
                                            <th className="pb-3 text-right">今日实时价</th>
                                            <th className="pb-3 text-right pr-2">24H 趋势</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((item) => (
                                            <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                                                <td className="py-4 pl-2 font-semibold text-slate-700">
                                                    {item.brand}
                                                </td>
                                                <td className="py-4">
                                                    <a 
                                                        href={item.url} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="text-slate-800 font-medium hover:text-indigo-600 transition-colors flex items-center gap-1 group-hover:underline"
                                                    >
                                                        {item.name}
                                                        <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </a>
                                                    <div className="text-xs text-slate-400 mt-0.5 font-mono">SKU: {item.sku_id}</div>
                                                </td>
                                                <td className="py-4 text-right">
                                                    <div className="flex flex-col items-end justify-center text-xs">
                                                        <span className="text-emerald-500 font-medium whitespace-nowrap">最低 ¥{item.min_price || '--'}</span>
                                                        <span className="text-red-500/70 whitespace-nowrap">最高 ¥{item.max_price || '--'}</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 text-right font-black text-lg text-slate-800 tabular-nums">
                                                    {isEditing ? (
                                                        <div className="flex justify-end">
                                                            <div className="relative w-28">
                                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">¥</span>
                                                                <input
                                                                    type="text"
                                                                    value={editingPrices[item.sku_id] !== undefined ? editingPrices[item.sku_id] : (item.current_price || '')}
                                                                    onChange={(e) => handlePriceChange(item.sku_id, e.target.value)}
                                                                    className="w-full pl-7 pr-3 py-1.5 border-2 border-indigo-200 rounded-lg text-right font-bold text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-300 placeholder:font-normal"
                                                                    placeholder="留空忽略"
                                                                />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        item.current_price ? `¥${item.current_price.toFixed(2)}` : '--'
                                                    )}
                                                </td>
                                                <td className="py-4 pr-2 text-right">
                                                    <div className="flex justify-end">
                                                        {getTrendBadge(item)}
                                                    </div>
                                                    {item.last_date && (
                                                        <div className="text-[10px] text-slate-400 mt-1 uppercase">
                                                            {item.last_date}更新
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
