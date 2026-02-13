import { Package, AlertCircle, FileText, CheckCircle2, Zap, Users, Crown, TrendingUp, ShoppingBag, RefreshCw } from 'lucide-react';
import { SystemStats } from '../../types/adminTypes';
import { StatCard } from './Shared';
import { storage } from '../../services/storage';
import { useState, useEffect } from 'react';
import PriceTrendChart from './PriceTrendChart';

export default function DashboardView() {
    const [stats, setStats] = useState<SystemStats>({ totalAiGenerations: 0, dailyStats: [] });
    const [extra, setExtra] = useState<any>({});
    const [counts, setCounts] = useState({ products: 0, configs: 0, users: 0, recycle: 0, activeProducts: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [s, pRes, cRes, uRes, rRes] = await Promise.all([
                    storage.getSystemStats(),
                    storage.getAdminProducts(1, 1),
                    storage.getAdminConfigs(1, 1),
                    storage.getUsers(),
                    storage.getRecycleRequests(1, 1)
                ]);
                setStats(s);
                setExtra(s); // s now contains all the extra real-time stats
                setCounts({
                    products: pRes.total,
                    configs: cRes.total,
                    users: uRes.length,
                    recycle: rRes.total,
                    activeProducts: pRes.total
                });
            } catch (error) {
                console.error('Failed to load dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    const today = new Date().toISOString().split('T')[0];
    const todayStat = stats.dailyStats.find(d => d.date === today);

    return (
        <div className="space-y-6">
            {/* 第一行：核心运营数据 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="AI 写配置次数"
                    value={stats.totalAiGenerations}
                    unit="次"
                    desc={`今日新增: ${todayStat?.aiGenerations || 0}`}
                    icon={<Zap size={24} />}
                    color="indigo"
                    trend={todayStat?.aiGenerations && todayStat.aiGenerations > 0 ? { value: todayStat.aiGenerations, isUp: true } : undefined}
                />
                <StatCard
                    title="社区配置总量"
                    value={counts.configs}
                    unit="单"
                    desc={`今日新增: ${extra.todayNewConfigs || 0}`}
                    icon={<FileText size={24} />}
                    color="purple"
                />
                <StatCard
                    title="注册用户总数"
                    value={counts.users}
                    unit="人"
                    desc={`今日新增: ${todayStat?.newUsers || 0}`}
                    icon={<Users size={24} />}
                    color="emerald"
                />
                <StatCard
                    title="活跃 VIP 数量"
                    value={extra.activeVipCount || 0}
                    unit="人"
                    desc="当前有效会员"
                    icon={<Crown size={24} />}
                    color="amber"
                />
            </div>

            {/* 第二行：硬件与商品数据 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="上架硬件总数"
                    value={extra.activeHardware || counts.products}
                    unit="SPU"
                    desc={`今日新增: ${extra.todayNewHardware || 0}`}
                    icon={<Package size={24} />}
                    color="blue"
                />
                <StatCard
                    title="二手闲置总数"
                    value={extra.totalUsed || 0}
                    unit="件"
                    desc={`今日新增: ${extra.todayNewUsed || 0}`}
                    icon={<ShoppingBag size={24} />}
                    color="orange"
                />
                <StatCard
                    title="待审核二手"
                    value={extra.pendingUsed || 0}
                    unit="件"
                    desc="等待审核发布"
                    icon={<RefreshCw size={24} />}
                    color="yellow"
                />
                <StatCard
                    title="待处理回收"
                    value={extra.pendingRecycle || 0}
                    unit="项"
                    desc="回收及个性化申请"
                    icon={<AlertCircle size={24} />}
                    color="red"
                />
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <TrendingUp size={18} className="text-indigo-600" /> 系统公告 / 运营建议
                </h3>
                <div className="space-y-3">
                    {stats.totalAiGenerations > 0 && (
                        <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg text-sm text-indigo-800 border border-indigo-100">
                            <Zap size={16} />
                            <span>AI 引擎本月已为用户提供了 {stats.totalAiGenerations} 次专业配置建议。</span>
                        </div>
                    )}
                    {(extra.pendingUsed > 0 || extra.pendingRecycle > 0) && (
                        <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg text-sm text-amber-800 border border-amber-100">
                            <AlertCircle size={16} />
                            <span>
                                提醒：共有 {extra.pendingUsed || 0} 件二手商品和 {extra.pendingRecycle || 0} 条回收申请待处理。
                            </span>
                        </div>
                    )}
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg text-sm text-blue-700 border border-blue-100">
                        <CheckCircle2 size={16} />
                        <span>今日新增 {todayStat?.newUsers || 0} 位注册用户，{extra.todayNewHardware || 0} 件硬件上架，系统运行平稳。</span>
                    </div>
                </div>
            </div>

            {/* 价格趋势图表 */}
            <PriceTrendChart />
        </div>
    );
}
