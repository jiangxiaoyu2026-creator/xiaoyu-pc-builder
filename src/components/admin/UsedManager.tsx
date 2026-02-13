import { useState, useMemo, useEffect } from 'react';
import { Search, X, Trash2, Eye, FileText, User, Plus, Shield } from 'lucide-react';
import { UsedItem, UsedCategory, UsedCondition } from '../../types/adminTypes';
import { storage } from '../../services/storage';
import ConfirmModal from '../common/ConfirmModal';
import Pagination from '../common/Pagination';

const CONDITIONS: UsedCondition[] = ['全新', '99新', '95新', '9成新', '8成新', '较旧'];
const CATEGORIES: { id: UsedCategory, label: string }[] = [
    { id: 'gpu', label: '显卡' },
    { id: 'host', label: '主机/整机' },
    { id: 'accessory', label: '其他配件' },
];

export default function UsedManager() {
    const [usedItems, setUsedItems] = useState<UsedItem[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(20);
    const [loading, setLoading] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [search, setSearch] = useState('');
    const [selectedItem, setSelectedItem] = useState<UsedItem | null>(null);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [isOfficialPublishModalOpen, setIsOfficialPublishModalOpen] = useState(false);

    // Confirm Modal State
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);

    // Dynamic confirmation for status changes
    const [statusConfirm, setStatusConfirm] = useState<{ id: string, status: import('../../types/adminTypes').UsedItem['status'], title: string, desc: string } | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const result = await storage.getAdminUsedItems(page, pageSize, filterStatus);
            setUsedItems(result.items);
            setTotal(result.total);
        } catch (error) {
            console.error('Failed to load used items:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [page, filterStatus]);


    // Filter items (client side on the current page for search, or we could trigger re-fetch)
    const filteredItems = useMemo(() => {
        return usedItems.filter(item => {
            const matchStatus = filterStatus === 'all' || item.status === filterStatus;
            const matchSearch = (item.model || '').toLowerCase().includes(search.toLowerCase()) ||
                (item.brand || '').toLowerCase().includes(search.toLowerCase()) ||
                (item.sellerName || '').toLowerCase().includes(search.toLowerCase());
            return matchStatus && matchSearch;
        });
    }, [usedItems, filterStatus, search]);

    // Actions
    const handleStatusChange = async (id: string, newStatus: UsedItem['status']) => {
        const item = usedItems.find(i => i.id === id || (i as any)._id === id);
        if (item) {
            setIsActionLoading(true);
            try {
                const updatedItem = { ...item, status: newStatus };
                await storage.updateUsedItem(updatedItem);
                loadData(); // Re-fetch
                setStatusConfirm(null);
            } catch (error) {
                console.error('Failed to change status:', error);
                alert('操作失败');
            } finally {
                setIsActionLoading(false);
            }
        }
    };

    const confirmDelete = (id: string) => {
        setDeleteId(id);
        setIsDeleteModalOpen(true);
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        setIsActionLoading(true);
        try {
            await storage.deleteUsedItem(deleteId);
            loadData(); // Re-fetch
            setIsDeleteModalOpen(false);
            setDeleteId(null);
        } catch (error) {
            console.error('Failed to delete item:', error);
            alert('删除失败');
        } finally {
            setIsActionLoading(false);
        }
    };

    const openReviewModal = (item: UsedItem) => {
        setSelectedItem(item);
        setIsReviewModalOpen(true);
    };

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex justify-between items-center gap-4 bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex gap-2 overflow-x-auto pb-1">
                    <button onClick={() => setFilterStatus('all')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${filterStatus === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>全部</button>
                    <button onClick={() => setFilterStatus('pending')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${filterStatus === 'pending' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>待审核</button>
                    <button onClick={() => setFilterStatus('published')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${filterStatus === 'published' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>已上架</button>
                    <button onClick={() => setFilterStatus('rejected')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${filterStatus === 'rejected' ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>已驳回</button>
                    <button onClick={() => setFilterStatus('sold')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${filterStatus === 'sold' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>已售出</button>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="搜索标题、卖家..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none w-64"
                        />
                    </div>
                    <button
                        onClick={() => setIsOfficialPublishModalOpen(true)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition-colors flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                    >
                        <Plus size={16} />
                        发布官方二手
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                        <tr>
                            <th className="px-6 py-4">商品信息</th>
                            <th className="px-6 py-4">卖家</th>
                            <th className="px-6 py-4">价格</th>
                            <th className="px-6 py-4">成色</th>
                            <th className="px-6 py-4">状态</th>
                            <th className="px-6 py-4">发布时间</th>
                            <th className="px-6 py-4 text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredItems.map(item => {
                            const itemId = item.id || (item as any)._id;
                            return (
                                <tr key={itemId} className="hover:bg-slate-50/50">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 shrink-0">
                                                {item.images[0] ? (
                                                    <img src={item.images[0]} alt={item.model} className="w-full h-full object-cover" />
                                                ) : (
                                                    <FileText size={20} className="text-slate-400" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900">{item.brand} {item.model}</div>
                                                <div className="text-xs text-slate-500">{item.category}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <User size={14} />
                                            <span>{item.sellerName}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-indigo-600">¥{item.price}</td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">{item.condition}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={item.status} />
                                    </td>
                                    <td className="px-6 py-4 text-slate-500 text-xs">
                                        {new Date(item.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            {item.status === 'pending' && (
                                                <button
                                                    onClick={() => openReviewModal(item)}
                                                    className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors"
                                                >
                                                    审核
                                                </button>
                                            )}
                                            {item.status !== 'pending' && (
                                                <button
                                                    onClick={() => openReviewModal(item)}
                                                    className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                                                    title="查看详情"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => confirmDelete(itemId)}
                                                className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                                                title="删除"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredItems.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                    暂无相关数据
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
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

            {/* Review Modal */}
            {isReviewModalOpen && selectedItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                            <h3 className="text-xl font-bold text-slate-900">商品审核详情</h3>
                            <button onClick={() => setIsReviewModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                            <div className="space-y-4">
                                <div className="aspect-square bg-slate-50 rounded-xl overflow-hidden border border-slate-200">
                                    <img src={selectedItem.images[0]} alt={selectedItem.model} className="w-full h-full object-cover" />
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                    {Array.isArray(selectedItem.images) && selectedItem.images.slice(1).map((img, idx) => (
                                        <div key={idx} className="aspect-square bg-slate-50 rounded-lg overflow-hidden border border-slate-200">
                                            <img src={img} alt="" className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">{selectedItem.category}</span>
                                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-xs">{selectedItem.condition}</span>
                                    </div>
                                    <h2 className="text-2xl font-bold text-slate-900 mb-2">{selectedItem.brand} {selectedItem.model}</h2>
                                    <div className="text-3xl font-bold text-indigo-600">¥{selectedItem.price}</div>
                                </div>

                                <div className="bg-slate-50 p-4 rounded-xl space-y-3 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">卖家</span>
                                        <span className="font-medium text-slate-900">{selectedItem.sellerName}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">联系方式</span>
                                        <span className="font-medium text-slate-900">{selectedItem.contact}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">发布时间</span>
                                        <span className="font-medium text-slate-900">{new Date(selectedItem.createdAt).toLocaleString()}</span>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="font-bold text-slate-900 mb-2">商品描述</h4>
                                    <p className="text-slate-600 text-sm leading-relaxed bg-slate-50 p-3 rounded-xl">
                                        {selectedItem.description}
                                    </p>
                                </div>
                                {selectedItem.xianyuLink && (
                                    <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                                        <h4 className="font-bold text-orange-900 mb-2 flex items-center gap-2">
                                            闲鱼链接
                                        </h4>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                readOnly
                                                value={selectedItem.xianyuLink}
                                                className="flex-1 bg-white border border-orange-200 rounded-lg px-3 py-2 text-xs text-orange-800 focus:outline-none"
                                            />
                                            <button
                                                onClick={() => navigator.clipboard.writeText(selectedItem.xianyuLink || '')}
                                                className="px-3 py-2 bg-white border border-orange-200 text-orange-700 rounded-lg text-xs font-bold hover:bg-orange-100 transition-colors"
                                            >
                                                复制
                                            </button>
                                            <button
                                                onClick={() => window.open(selectedItem.xianyuLink, '_blank')}
                                                className="px-3 py-2 bg-orange-500 text-white rounded-lg text-xs font-bold hover:bg-orange-600 transition-colors"
                                            >
                                                打开
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {selectedItem.inspectionReport && (
                                    <div>
                                        <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                                            <FileText size={16} className="text-emerald-600" />
                                            检测报告
                                        </h4>
                                        <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl text-sm text-emerald-800">
                                            <div>检测得分: <span className="font-bold">{selectedItem.inspectionReport.score}</span></div>
                                            <div>检测师: {selectedItem.inspectionReport.inspectorName}</div>
                                            <div>总结: {selectedItem.inspectionReport.summary}</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-4 border-t border-slate-100 pt-6">
                            {selectedItem.status === 'pending' ? (
                                <>
                                    <button
                                        onClick={() => {
                                            setStatusConfirm({
                                                id: selectedItem.id || (selectedItem as any)._id,
                                                status: 'rejected',
                                                title: '确认拒绝发布',
                                                desc: '您确定要拒绝该商品的发布申请吗？'
                                            });
                                        }}
                                        className="flex-1 py-3 bg-white border border-red-200 text-red-600 rounded-xl font-bold hover:bg-red-50 transition-colors"
                                    >
                                        拒绝发布
                                    </button>
                                    <button
                                        onClick={async () => {
                                            await handleStatusChange(selectedItem.id || (selectedItem as any)._id, 'published');
                                            setIsReviewModalOpen(false);
                                        }}
                                        className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-200"
                                    >
                                        通过审核并上架
                                    </button>
                                </>
                            ) : (
                                <div className="flex-1 flex gap-4">
                                    <button
                                        onClick={() => setIsReviewModalOpen(false)}
                                        className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                                    >
                                        关闭
                                    </button>
                                    {selectedItem.status === 'published' && (
                                        <button
                                            onClick={() => {
                                                setStatusConfirm({
                                                    id: selectedItem.id || (selectedItem as any)._id,
                                                    status: 'rejected',
                                                    title: '确认下架商品',
                                                    desc: '您确定要下架该商品吗？'
                                                });
                                            }}
                                            className="flex-1 py-3 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-colors"
                                        >
                                            下架商品
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Official Publish Modal */}
            {isOfficialPublishModalOpen && (
                <OfficialPublishModal
                    onClose={() => setIsOfficialPublishModalOpen(false)}
                    onSuccess={async () => {
                        loadData(); // Re-fetch
                        setIsOfficialPublishModalOpen(false);
                    }}
                />
            )}

            {/* Confirm Delete Modal */}
            <ConfirmModal
                isOpen={isDeleteModalOpen}
                title="确认删除二手商品"
                description="您确定要删除这个商品吗？此操作不可恢复。"
                confirmText="确认删除"
                isDangerous={true}
                isLoading={isActionLoading}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDelete}
            />

            {/* Confirm Status Change Modal */}
            <ConfirmModal
                isOpen={!!statusConfirm}
                title={statusConfirm?.title || ''}
                description={statusConfirm?.desc || ''}
                confirmText="确定操作"
                isDangerous={true}
                isLoading={isActionLoading}
                onClose={() => setStatusConfirm(null)}
                onConfirm={() => {
                    if (statusConfirm) {
                        handleStatusChange(statusConfirm.id, statusConfirm.status);
                    }
                }}
            />
        </div>
    );
}

function StatusBadge({ status }: { status: UsedItem['status'] }) {
    const config: Record<UsedItem['status'], { label: string; bg: string; text: string }> = {
        pending: { label: '待审核', bg: 'bg-amber-100', text: 'text-amber-700' },
        published: { label: '已上架', bg: 'bg-emerald-100', text: 'text-emerald-700' },
        rejected: { label: '已驳回', bg: 'bg-red-100', text: 'text-red-700' },
        sold: { label: '已售出', bg: 'bg-blue-100', text: 'text-blue-700' },
    };
    const c = config[status] || config.pending;
    return <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${c.bg} ${c.text}`}>{c.label}</span>;
}

// 官方发布二手模态框
function OfficialPublishModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (item: UsedItem) => void }) {
    const [formData, setFormData] = useState<Partial<UsedItem>>({
        category: 'gpu',
        condition: '95新',
        images: [],
        type: 'official',
        inspectionReport: {
            inspectedAt: new Date().toISOString(),
            grade: 'A',
            score: 90,
            stressTest: true,
            functionTest: true,
            appearance: '',
            notes: '',
        }
    });
    const [loading, setLoading] = useState(false);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({
                    ...prev,
                    images: [...(prev.images || []), reader.result as string]
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (!formData.brand || !formData.model || !formData.price || !formData.description) {
            alert('请填写完整信息');
            setLoading(false);
            return;
        }

        const newItem: any = {
            type: 'official',
            sellerId: 'admin',
            sellerName: '小鱼官方',
            category: formData.category,
            brand: formData.brand,
            model: formData.model,
            price: Number(formData.price),
            originalPrice: formData.originalPrice ? Number(formData.originalPrice) : undefined,
            condition: formData.condition,
            images: formData.images || [],
            description: formData.description,
            status: 'published',
            inspectionReport: formData.inspectionReport,
        };

        try {
            await storage.addUsedItem(newItem);
            onSuccess(newItem);
        } catch (error) {
            alert('发布失败');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <Shield size={20} className="text-emerald-600" />
                            发布官方二手
                        </h2>
                        <p className="text-xs text-slate-500">官方二手直接上架，包含质检报告</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">硬件分类</label>
                            <select
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value as UsedItem['category'] })}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
                            >
                                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">成色</label>
                            <select
                                value={formData.condition}
                                onChange={e => setFormData({ ...formData, condition: e.target.value })}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
                            >
                                {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">品牌 *</label>
                            <input
                                type="text"
                                placeholder="例如：ASUS 华硕"
                                value={formData.brand || ''}
                                onChange={e => setFormData({ ...formData, brand: e.target.value })}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">型号 *</label>
                            <input
                                type="text"
                                placeholder="例如：RTX 3070 TUF"
                                value={formData.model || ''}
                                onChange={e => setFormData({ ...formData, model: e.target.value })}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                required
                            />
                        </div>
                    </div>

                    {/* Price */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">售价 (¥) *</label>
                            <input
                                type="number"
                                placeholder="0.00"
                                value={formData.price || ''}
                                onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono font-bold text-lg text-red-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">原价 (选填)</label>
                            <input
                                type="number"
                                placeholder="0.00"
                                value={formData.originalPrice || ''}
                                onChange={e => setFormData({ ...formData, originalPrice: Number(e.target.value) })}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono"
                            />
                        </div>
                    </div>

                    {/* Inspection Report */}
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-4">
                        <h3 className="font-bold text-emerald-800 flex items-center gap-2">
                            <FileText size={16} />
                            质检报告
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-emerald-700 mb-1">评级</label>
                                <select
                                    value={formData.inspectionReport?.grade || 'A'}
                                    onChange={e => setFormData({
                                        ...formData,
                                        inspectionReport: { ...formData.inspectionReport!, grade: e.target.value as 'A' | 'B' | 'C' | 'D' }
                                    })}
                                    className="w-full p-2 bg-white border border-emerald-200 rounded-lg text-sm"
                                >
                                    <option value="A">A级 (极好)</option>
                                    <option value="B">B级 (良好)</option>
                                    <option value="C">C级 (一般)</option>
                                    <option value="D">D级 (较差)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-emerald-700 mb-1">评分</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={formData.inspectionReport?.score || 90}
                                    onChange={e => setFormData({
                                        ...formData,
                                        inspectionReport: { ...formData.inspectionReport!, score: Number(e.target.value) }
                                    })}
                                    className="w-full p-2 bg-white border border-emerald-200 rounded-lg text-sm"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={formData.inspectionReport?.stressTest}
                                    onChange={e => setFormData({
                                        ...formData,
                                        inspectionReport: { ...formData.inspectionReport!, stressTest: e.target.checked }
                                    })}
                                    className="w-4 h-4 text-emerald-600"
                                />
                                <label className="text-xs text-emerald-700">压力测试通过</label>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={formData.inspectionReport?.functionTest}
                                    onChange={e => setFormData({
                                        ...formData,
                                        inspectionReport: { ...formData.inspectionReport!, functionTest: e.target.checked }
                                    })}
                                    className="w-4 h-4 text-emerald-600"
                                />
                                <label className="text-xs text-emerald-700">功能检测通过</label>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-emerald-700 mb-1">质检总结</label>
                            <input
                                type="text"
                                placeholder="例如：外观完好，性能稳定"
                                value={formData.inspectionReport?.summary || ''}
                                onChange={e => setFormData({
                                    ...formData,
                                    inspectionReport: { ...formData.inspectionReport!, summary: e.target.value }
                                })}
                                className="w-full p-2 bg-white border border-emerald-200 rounded-lg text-sm"
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">详细描述 *</label>
                        <textarea
                            placeholder="描述硬件来源、使用情况、配件等..."
                            value={formData.description || ''}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 h-24 resize-none"
                            required
                        ></textarea>
                    </div>

                    {/* Images */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">商品图片</label>
                        <div className="flex gap-3 flex-wrap">
                            {formData.images?.map((img, idx) => (
                                <div key={idx} className="w-20 h-20 rounded-lg overflow-hidden relative group border border-slate-200">
                                    <img src={img} alt="" className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, images: prev.images?.filter((_, i) => i !== idx) }))}
                                        className="absolute inset-0 bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                            <label className="w-20 h-20 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-colors">
                                <Plus size={24} className="text-slate-400" />
                                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                            </label>
                        </div>
                    </div>

                    {/* Submit */}
                    <div className="pt-4 flex gap-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors"
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30 transition-all flex items-center justify-center gap-2"
                        >
                            <Shield size={18} />
                            {loading ? '发布中...' : '发布上架'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
