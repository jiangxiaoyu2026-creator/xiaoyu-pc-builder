
import { Package, AlertCircle, FileText, CheckCircle2, Zap, Users, Crown, TrendingUp } from 'lucide-react';
import { HardwareItem, ConfigItem, UserItem } from '../../types/adminTypes';
import { StatCard } from './Shared';
import { storage } from '../../services/storage';
import { useMemo } from 'react';

export default function DashboardView({ products, configs, users }: { products: HardwareItem[], configs: ConfigItem[], users?: UserItem[] }) {
    const stats = useMemo(() => storage.getSystemStats(), []);
    const today = new Date().toISOString().split('T')[0];
    const todayStat = stats.dailyStats.find(d => d.date === today);

    const archivedProducts = products.filter(p => p.status === 'archived').length;

    // VIP Stats
    const allUsers = users || storage.getUsers();
    const vipUsers = allUsers.filter(u => u.vipExpireAt && u.vipExpireAt > Date.now()).length;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* AI Stats */}
                <StatCard
                    title="AI 写配置次数"
                    value={stats.totalAiGenerations}
                    unit="次"
                    desc={`今日新增: ${todayStat?.aiGenerations || 0}`}
                    icon={<Zap size={24} />}
                    color="indigo"
                    trend={todayStat?.aiGenerations && todayStat.aiGenerations > 0 ? { value: todayStat.aiGenerations, isUp: true } : undefined}
                />

                {/* Config Stats */}
                <StatCard
                    title="社区配置总量"
                    value={configs.length}
                    unit="单"
                    desc={`今日新增: ${todayStat?.newConfigs || 0}`}
                    icon={<FileText size={24} />}
                    color="purple"
                />

                {/* User Stats */}
                <StatCard
                    title="注册用户总数"
                    value={allUsers.length}
                    unit="人"
                    desc={`今日新增: ${todayStat?.newUsers || 0}`}
                    icon={<Users size={24} />}
                    color="emerald"
                />

                {/* VIP Stats */}
                <StatCard
                    title="活跃 VIP 数量"
                    value={vipUsers}
                    unit="人"
                    desc="当前有效会员"
                    icon={<Crown size={24} />}
                    color="amber"
                />

                {/* Hardware Stats */}
                <StatCard
                    title="上架硬件总数"
                    value={products.filter(p => p.status === 'active').length}
                    unit="SPU"
                    desc={`${archivedProducts} 个已停售`}
                    icon={<Package size={24} />}
                    color="blue"
                />

                {/* Quality Stats */}
                <StatCard
                    title="待审核请求"
                    value={storage.getRecycleRequests().filter(r => !r.isRead).length}
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
                    <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg text-sm text-amber-800 border border-amber-100">
                        <AlertCircle size={16} />
                        <span>提醒：共有 {storage.getRecycleRequests().filter(r => !r.isRead).length} 条新回收申请待处理。</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg text-sm text-blue-700 border border-blue-100">
                        <CheckCircle2 size={16} />
                        <span>今日新增 {todayStat?.newUsers || 0} 位注册用户，系统运行平稳。</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
