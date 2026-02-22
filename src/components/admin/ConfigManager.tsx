
import { useState, useMemo, useEffect } from 'react';
import { Download, Star, Eye, Search } from 'lucide-react';
import { ConfigItem, HardwareItem, Category } from '../../types/adminTypes';
import { CATEGORY_MAP } from '../../data/adminData';
import { SortIcon } from './Shared';
import { ApiService } from '../../services/api';
import { storage } from '../../services/storage';
import Pagination from '../common/Pagination';
import ShowcaseAuditModal from './ShowcaseAuditModal';

export default function ConfigManager() {
    const [configs, setConfigs] = useState<ConfigItem[]>([]);
    const [products, setProducts] = useState<HardwareItem[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(20);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'hidden' | 'pending_showcase' | 'approved_showcase' | 'rejected_showcase'>('all');
    const [sortConfig, setSortConfig] = useState<{ key: keyof ConfigItem, direction: 'asc' | 'desc' } | null>({ key: 'createdAt', direction: 'desc' });
    const [searchTerm, setSearchTerm] = useState('');
    const [auditConfig, setAuditConfig] = useState<ConfigItem | null>(null);
    const loadData = async () => {
        setLoading(true);
        try {
            const [cResult, pResult] = await Promise.all([
                storage.getAdminConfigs(page, pageSize, statusFilter),
                storage.getAdminProducts(1, 1000) // Products still needed for mapping display
            ]);
            setConfigs(cResult.items);
            setTotal(cResult.total);
            setProducts(pResult.items);
        } catch (error) {
            console.error('Failed to load configs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [page, statusFilter]);

    const handleStatusChange = async (id: string, newStatus: ConfigItem['status']) => {
        const config = configs.find(c => c.id === id);
        if (!config) return;
        const updated = { ...config, status: newStatus };
        setConfigs(configs.map(c => c.id === id ? updated : c));
        await storage.updateConfig(updated);
    };

    const toggleRecommend = async (id: string) => {
        const config = configs.find(c => c.id === id);
        if (!config) return;

        const updated = { ...config, isRecommended: !config.isRecommended };
        setConfigs(configs.map(c => c.id === id ? updated : c));
        await storage.updateConfig(updated);
    };

    const updateSortOrder = async (id: string, order: number) => {
        const config = configs.find(c => c.id === id);
        if (!config || config.sortOrder === order) return;

        const updated = { ...config, sortOrder: order };
        setConfigs(configs.map(c => c.id === id ? updated : c));
        try {
            await ApiService.put(`/configs/${id}`, { sortOrder: order });
        } catch (error) {
            console.error('Failed to update sort order:', error);
            alert('更新排序失败');
            // Revert on failure
            setConfigs(configs.map(c => c.id === id ? config : c));
        }
    };

    const handleSort = (key: keyof ConfigItem) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const filtered = useMemo(() => {
        let res = configs;

        if (statusFilter === 'pending_showcase') {
            res = res.filter(c => c.showcaseStatus === 'pending');
        } else if (statusFilter === 'approved_showcase') {
            res = res.filter(c => c.showcaseStatus === 'approved');
        } else if (statusFilter === 'rejected_showcase') {
            res = res.filter(c => c.showcaseStatus === 'rejected');
        } else if (statusFilter !== 'all') {
            res = res.filter(c => c.status === statusFilter);
        }

        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            res = res.filter(c =>
                c.title.toLowerCase().includes(lower) ||
                c.authorName.toLowerCase().includes(lower) ||
                (c.tags && c.tags.some(t => t.toLowerCase().includes(lower)))
            );
        }

        if (sortConfig) {
            res.sort((a, b) => {
                const valA = a[sortConfig.key] ?? 0;
                const valB = b[sortConfig.key] ?? 0;
                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return res;
    }, [configs, statusFilter, sortConfig, searchTerm]);

    const handleExportConfigs = () => {
        const hardwareCols: Category[] = ['cpu', 'mainboard', 'gpu', 'ram', 'disk', 'power', 'case'];
        const hwHeaders = hardwareCols.map(c => CATEGORY_MAP[c].label);
        const headers = ['配置ID', '标题', '作者', '总价', '状态', '推荐', '排序权重', ...hwHeaders];

        const rows = filtered.map(c => {
            const hwData = hardwareCols.map(cat => {
                const pid = c.items[cat];
                if (!pid) return '-';
                const p = products.find(x => x.id === pid);
                return p ? `"${p.brand} ${p.model}"` : pid;
            });
            return [
                c.id,
                `"${c.title.replace(/"/g, '""')}"`,
                c.authorName,
                c.totalPrice,
                c.status === 'published' ? '已发布' : '隐藏',
                c.isRecommended ? '是' : '否',
                c.sortOrder || 0,
                ...hwData
            ];
        });

        const csvContent = "\ufeff" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `配置单清单_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const deleteConfig = async (id: string) => {
        try {
            await ApiService.delete(`/configs/${id}`);
            const newConfigs = configs.filter(c => c.id !== id);
            setConfigs(newConfigs);
        } catch (error) {
            console.error('删除配置单失败:', error);
            alert('删除失败，请重试');
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
                <div className="flex items-center gap-4 flex-1 w-full">
                    {/* Status Tabs */}
                    <div className="bg-slate-100 p-1 rounded-xl flex shrink-0 custom-scrollbar overflow-x-auto">
                        {['all', 'published', 'hidden', 'pending_showcase', 'approved_showcase', 'rejected_showcase'].map(status => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status as any)}
                                className={`px-4 py-2 rounded-lg font-bold text-xs transition-all whitespace-nowrap ${statusFilter === status ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {status === 'all' && '全部'}
                                {status === 'published' && '已发布'}
                                {status === 'hidden' && '已隐藏'}
                                {status === 'pending_showcase' && '待审晒单'}
                                {status === 'approved_showcase' && '过审晒单'}
                                {status === 'rejected_showcase' && '打回晒单'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="搜索标题、作者、标签..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-full shadow-sm text-sm"
                        />
                    </div>
                    <button onClick={handleExportConfigs} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-md transition-all active:scale-95">
                        <Download size={16} /> 导出
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex text-sm font-semibold text-slate-500">
                        <div className="flex-1">配置信息</div>
                        <div className="w-32 text-right cursor-pointer hover:text-indigo-600 flex justify-end gap-1" onClick={() => handleSort('totalPrice')}>
                            总价 <SortIcon active={sortConfig?.key === 'totalPrice'} dir={sortConfig?.direction} />
                        </div>
                        <div className="w-32 text-right cursor-pointer hover:text-indigo-600 flex justify-end gap-1" onClick={() => handleSort('views')}>
                            浏览/赞 <SortIcon active={sortConfig?.key === 'views'} dir={sortConfig?.direction} />
                        </div>
                        <div className="w-24 text-right cursor-pointer hover:text-indigo-600 flex justify-end gap-1" onClick={() => handleSort('sortOrder')}>
                            排序 <SortIcon active={sortConfig?.key === 'sortOrder'} dir={sortConfig?.direction} />
                        </div>
                        <div className="w-40 text-right cursor-pointer hover:text-indigo-600 flex justify-end gap-1" onClick={() => handleSort('createdAt')}>
                            提交时间 <SortIcon active={sortConfig?.key === 'createdAt'} dir={sortConfig?.direction} />
                        </div>
                        <div className="w-40 text-right">操作</div>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {filtered.map(config => (
                            <div key={config.id} className={`p-5 flex items-start gap-5 hover:bg-slate-50 transition-colors ${config.status === 'hidden' ? 'bg-slate-50/50 opacity-75' : ''}`}>
                                {/* Status Bar */}
                                <div className={`w-1 self-stretch rounded-full ${config.status === 'published' ? 'bg-emerald-500' : 'bg-slate-400'
                                    }`}></div>

                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className={`text-lg font-bold flex items-center gap-2 ${config.status === 'hidden' ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                                                {config.title}
                                                {config.isRecommended && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full flex items-center gap-1 no-underline"><Star size={10} fill="currentColor" /> 官方推荐</span>}
                                            </h3>
                                            <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                                                <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-full font-bold text-slate-600">
                                                    作者: {config.authorName}
                                                </span>
                                                {config.tags && config.tags.length > 0 && (
                                                    <div className="flex gap-1">
                                                        {config.tags.map(tag => (
                                                            <span key={tag} className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded text-[10px]">#{tag}</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right flex items-start">
                                            <div className="w-32 text-right">
                                                <div className="font-mono font-bold text-indigo-600 text-lg">¥{config.totalPrice}</div>
                                                <div className="text-[10px] text-slate-400 mt-1">总价</div>
                                            </div>
                                            <div className="w-32 text-right">
                                                <div className="font-bold text-slate-600 flex items-center justify-end gap-1"><Eye size={12} />{config.views}</div>
                                                <div className="text-[10px] mt-1">浏览</div>
                                                {/* <div><ThumbsUp size={12} className="inline mr-1" />{config.likes}</div> */}
                                            </div>
                                            <div className="w-24 text-right flex flex-col items-end">
                                                <div className="flex items-center gap-1 border border-slate-200 rounded px-1 w-16 bg-white">
                                                    <input
                                                        type="number"
                                                        value={config.sortOrder || 0}
                                                        onChange={(e) => updateSortOrder(config.id, parseInt(e.target.value) || 0)}
                                                        className="w-full text-right text-xs font-bold text-slate-600 outline-none py-0.5"
                                                    />
                                                </div>
                                                <div className="text-[10px] text-slate-400 mt-1">权重(大靠前)</div>
                                            </div>
                                            <div className="w-40 text-right">
                                                <div className="font-bold text-slate-600">{new Date(config.createdAt).toLocaleDateString()}</div>
                                                <div className="text-[10px] mt-1">{new Date(config.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                            </div>
                                            <div className="w-40 text-right">
                                                {/* Placeholder for alignment, buttons are below */}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                                        {['cpu', 'gpu', 'mainboard'].map(cat => {
                                            const itemId = config.items[cat as Category] as string;
                                            if (!itemId) return null;
                                            const product = products.find(p => p.id === itemId);
                                            return (
                                                <div key={cat} className="flex items-center gap-2 bg-slate-100 px-2 py-1 rounded border border-slate-200 min-w-[120px]">
                                                    <div className="text-[10px] text-slate-400 w-8">{CATEGORY_MAP[cat as Category].label}</div>
                                                    <div className="text-xs font-medium text-slate-700 truncate">{product ? product.model : itemId}</div>
                                                </div>
                                            )
                                        })}
                                    </div>

                                    <div className="mt-4 flex justify-end gap-3 pt-3 border-t border-slate-50">
                                        {config.showcaseStatus && config.showcaseStatus !== 'none' && (
                                            <button
                                                onClick={() => setAuditConfig(config)}
                                                className={`px-3 py-1 text-xs font-bold rounded border ${config.showcaseStatus === 'pending'
                                                    ? 'border-amber-200 text-amber-600 bg-amber-50 animate-pulse'
                                                    : 'border-slate-200 text-slate-500 hover:bg-slate-100'
                                                    }`}
                                            >
                                                {config.showcaseStatus === 'pending' ? '审核晒单' : '查看晒单'}
                                            </button>
                                        )}
                                        <button onClick={() => toggleRecommend(config.id)} className={`px-3 py-1 text-xs font-bold rounded border ${config.isRecommended ? 'border-red-200 text-red-600 bg-red-50' : 'border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
                                            {config.isRecommended ? '取消推荐' : '设为推荐'}
                                        </button>
                                        <button onClick={() => handleStatusChange(config.id, config.status === 'published' ? 'hidden' : 'published')} className="px-3 py-1 border border-slate-200 text-slate-500 text-xs font-bold rounded hover:bg-slate-50">
                                            {config.status === 'published' ? '下架/隐藏' : '重新上架'}
                                        </button>
                                        <button onClick={() => deleteConfig(config.id)} className="px-3 py-1 border border-red-200 text-red-600 text-xs font-bold rounded hover:bg-red-50">
                                            删除
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    {filtered.length === 0 && <div className="text-center py-10 text-slate-400">列表为空</div>}
                </div>
                {loading && (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                )}
            </div>

            <Pagination
                currentPage={page}
                totalItems={total}
                pageSize={pageSize}
                onPageChange={setPage}
            />

            {auditConfig && (
                <ShowcaseAuditModal
                    config={auditConfig}
                    onClose={() => setAuditConfig(null)}
                    onSuccess={() => {
                        setAuditConfig(null);
                        loadData();
                    }}
                    showToast={(msg) => alert(msg)}
                />
            )}
        </div>
    )
}
