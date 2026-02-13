/**
 * 价格趋势图表组件
 * 展示硬件价格变化趋势和今日涨跌统计
 */
import { useState, useEffect } from 'react';
import {
    XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, BarChart, Bar, Legend
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

const CATEGORY_LABELS: Record<string, string> = {
    cpu: 'CPU', gpu: '显卡', mainboard: '主板', ram: '内存',
    disk: '硬盘/SSD', psu: '电源', power: '电源', case: '机箱',
    cooler: '散热器', cooling: '散热', fan: '风扇',
    monitor: '显示器', mouse: '鼠标', keyboard: '键盘',
    accessory: '配件', all: '全部品类'
};

export default function PriceTrendChart() {
    const [data, setData] = useState<PriceTrendData | null>(null);
    const [loading, setLoading] = useState(true);
    const [category, setCategory] = useState('all');
    const [days, setDays] = useState(30);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('xiaoyu_token');
            const res = await fetch(
                `/api/stats/price-trends?days=${days}&category=${category === 'all' ? '' : category}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            if (res.ok) {
                setData(await res.json());
            }
        } catch (e) {
            console.error('Failed to load price trends:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [category, days]);

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
                    <h3 className="font-bold text-slate-800 mb-4">价格变动趋势</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 11, fill: '#94a3b8' }}
                                tickFormatter={(v: string) => v.slice(5)}
                            />
                            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                            <Tooltip
                                contentStyle={{
                                    borderRadius: '12px',
                                    border: '1px solid #e2e8f0',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                    fontSize: '12px'
                                }}
                                formatter={((value: any, name: string) => {
                                    const labels: Record<string, string> = {
                                        upCount: '涨价数量',
                                        downCount: '降价数量',
                                        avgChange: '平均变动 (¥)'
                                    };
                                    return [value, labels[name] || name];
                                }) as any}
                            />
                            <Legend
                                formatter={(value: string) => {
                                    const labels: Record<string, string> = {
                                        upCount: '涨价',
                                        downCount: '降价'
                                    };
                                    return labels[value] || value;
                                }}
                            />
                            <Bar dataKey="upCount" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="downCount" fill="#10b981" radius={[4, 4, 0, 0]} />
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

            {/* 最近变更记录 */}
            {recentChanges.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100">
                        <h3 className="font-bold text-slate-800">最近价格变更</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="text-left px-4 py-2.5 text-xs font-bold text-slate-400 uppercase">硬件名称</th>
                                    <th className="text-left px-4 py-2.5 text-xs font-bold text-slate-400 uppercase">品类</th>
                                    <th className="text-right px-4 py-2.5 text-xs font-bold text-slate-400 uppercase">原价</th>
                                    <th className="text-right px-4 py-2.5 text-xs font-bold text-slate-400 uppercase">新价</th>
                                    <th className="text-right px-4 py-2.5 text-xs font-bold text-slate-400 uppercase">变动</th>
                                    <th className="text-right px-4 py-2.5 text-xs font-bold text-slate-400 uppercase">时间</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {recentChanges.map((c, i) => (
                                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3 font-medium text-slate-700">{c.hardwareName}</td>
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
