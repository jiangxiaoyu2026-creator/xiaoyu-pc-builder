import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, Recycle, ShoppingBag, Eye, Shield, User, ExternalLink } from 'lucide-react';
import { UsedItem, UserItem, UsedCategory } from '../../types/adminTypes';
import { storage } from '../../services/storage';
import Pagination from '../common/Pagination';

interface UsedMarketProps {
    currentUser: UserItem | null;
    onLogin: () => void;
    onViewDetail: (item: UsedItem) => void;
    onSell: () => void;
    onRecycle: () => void;
}

const CATEGORIES: { id: UsedCategory | 'all', label: string }[] = [
    { id: 'all', label: '全部' },
    { id: 'host', label: '主机' },
    { id: 'gpu', label: '显卡' },
    { id: 'accessory', label: '配件' }
];

const TYPE_FILTERS: { id: 'all' | 'official' | 'personal', label: string }[] = [
    { id: 'all', label: '全部' },
    { id: 'official', label: '官方二手' },
    { id: 'personal', label: '个人闲置' }
];

// Component used market

export default function UsedMarket({ currentUser, onLogin, onViewDetail, onSell, onRecycle }: UsedMarketProps) {
    const [selectedCategory, setSelectedCategory] = useState<UsedCategory | 'all'>('all');
    const [selectedType, setSelectedType] = useState<'all' | 'official' | 'personal'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [items, setItems] = useState<UsedItem[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(12);
    const [loading, setLoading] = useState(false);

    // Load data
    const loadData = async () => {
        setLoading(true);
        try {
            const result = await storage.getUsedItems({
                page,
                pageSize,
                type: selectedType,
                category: selectedCategory
                // search: not yet on backend, but could be added
            });
            setItems(result.items);
            setTotal(result.total);
        } catch (error) {
            console.error('Failed to load used items:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [page, selectedCategory, selectedType]);

    // Listen for storage updates (could be optimized)
    useEffect(() => {
        window.addEventListener('xiaoyu-storage-update', loadData);
        return () => {
            window.removeEventListener('xiaoyu-storage-update', loadData);
        };
    }, []);

    const filteredItems = useMemo(() => {
        return items.filter(item => {
            // 只显示已发布或已售出的商品
            if (item.status !== 'published' && item.status !== 'sold') return false;

            // Client-side search for now
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                return item.brand.toLowerCase().includes(q) ||
                    item.model.toLowerCase().includes(q) ||
                    item.description.toLowerCase().includes(q);
            }
            return true;
        });
    }, [items, searchQuery]);

    return (
        <div className="space-y-8 pb-20">
            {/* Header Section */}
            <div className="bg-white dark:bg-[#121218] rounded-2xl p-6 md:p-8 relative overflow-hidden border border-slate-200 dark:border-[#1E293B] shadow-sm dark:shadow-none">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">二手闲置</h2>
                            <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                                让价值流动
                            </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 max-w-lg text-sm leading-relaxed">
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                                <Shield size={14} /> 官方二手
                            </span>
                            <span className="mx-1.5">经平台严格质检，品质保障售后无忧；</span>
                            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                                <User size={14} /> 个人闲置
                            </span>
                            <span className="mx-1.5">由用户自行发布，交易通过闲鱼完成。</span>
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={currentUser ? onRecycle : onLogin}
                            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl font-bold transition-all flex items-center gap-2 text-sm"
                        >
                            <Recycle size={16} />
                            我要回收
                        </button>
                        <button
                            onClick={currentUser ? onSell : onLogin}
                            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm rounded-xl font-bold transition-all flex items-center gap-2 text-sm"
                        >
                            <Plus size={18} />
                            发布闲置
                        </button>
                    </div>
                </div>
            </div>

            {/* Type Filter */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                {TYPE_FILTERS.map(type => (
                    <button
                        key={type.id}
                        onClick={() => setSelectedType(type.id)}
                        className={`px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition-all flex items-center gap-1.5 ${selectedType === type.id
                            ? 'bg-indigo-600 dark:bg-indigo-500/20 text-white dark:text-indigo-300 border border-indigo-600 dark:border-indigo-500/30 shadow-sm'
                            : 'bg-white dark:bg-[#121218] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1A1A24] border border-slate-200 dark:border-[#2D3748]'
                            }`}
                    >
                        {type.id === 'official' && <Shield size={14} />}
                        {type.id === 'personal' && <User size={14} />}
                        {type.label}
                    </button>
                ))}
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between sticky top-[72px] z-30 bg-white/80 dark:bg-[#0B0B10]/80 backdrop-blur-md py-4 -my-4 px-4 rounded-xl border border-slate-200/50 dark:border-[#1E293B]/50 shadow-sm dark:shadow-none">
                <div className="flex gap-2 overflow-x-auto no-scrollbar w-full md:w-auto pb-2 md:pb-0">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${selectedCategory === cat.id
                                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md dark:shadow-none'
                                : 'bg-slate-100 dark:bg-[#121218] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#1A1A24] border border-transparent dark:border-[#2D3748]'
                                }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>

                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="搜索品牌、型号..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-[#121218] border border-slate-200 dark:border-[#2D3748] text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-500 transition-all text-sm font-medium"
                    />
                </div>
            </div>

            {/* Items Grid */}
            {filteredItems.length > 0 ? (
                <motion.div 
                    initial="hidden"
                    animate="visible"
                    variants={{
                        hidden: { opacity: 0 },
                        visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
                    }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                >
                    {filteredItems.map(item => (
                        <motion.div
                            variants={{
                                hidden: { opacity: 0, y: 20 },
                                visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
                            }}
                            key={item.id}
                            onClick={() => onViewDetail(item)}
                            className={`rounded-2xl shadow-sm dark:shadow-none transition-all cursor-pointer overflow-hidden group border 
                                ${item.status === 'sold' 
                                    ? 'bg-slate-50 dark:bg-[#121218]/50 border-slate-200 dark:border-[#1E293B]/50 grayscale opacity-60' 
                                    : 'bg-white dark:bg-[#121218] border-slate-200 dark:border-[#1E293B] hover:border-indigo-400/50 dark:hover:border-indigo-500/50 hover:-translate-y-0.5 hover:shadow-md dark:hover:shadow-none'
                                }`}
                        >
                            <div className="aspect-[4/3] bg-slate-100 dark:bg-[#1A1A24] relative overflow-hidden">
                                {item.images[0] ? (
                                    <img src={item.images[0]} alt={item.model} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                        <ShoppingBag size={48} />
                                    </div>
                                )}
                                {/* 成色标签 */}
                                <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white text-xs font-bold px-2 py-1 rounded-lg">
                                    {item.condition}
                                </div>
                                {/* 类型标签 */}
                                {item.type === 'official' ? (
                                    <div className="absolute top-2 left-2 bg-emerald-600 text-white text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded flex items-center gap-1 shadow-sm">
                                        <Shield size={10} /> 官方质保
                                    </div>
                                ) : (
                                    <div className="absolute top-2 left-2 bg-amber-500 text-white text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded flex items-center gap-1 shadow-sm">
                                        <User size={10} /> 个人闲置
                                    </div>
                                )}
                                {/* 验机报告标签 */}
                                {item.type === 'official' && item.inspectionReport && (
                                    <div className="absolute bottom-3 left-3 bg-blue-500/90 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-lg">
                                        已验机 · {item.inspectionReport.grade}级
                                    </div>
                                )}
                                {/* 闲鱼标签 */}
                                {item.type === 'personal' && item.xianyuLink && (
                                    <div className="absolute bottom-3 right-3 bg-orange-500/90 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                                        <ExternalLink size={10} /> 闲鱼
                                    </div>
                                )}
                                {/* 已售出遮罩 */}
                                {item.status === 'sold' && (
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
                                        <div className="w-24 h-24 rounded-full border-4 border-slate-200 text-slate-200 bg-black/40 flex items-center justify-center font-black text-2xl -rotate-12 shadow-xl">
                                            已售出
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className={`font-bold text-sm line-clamp-2 ${item.status === 'sold' ? 'text-slate-500' : 'text-slate-900 dark:text-slate-100'}`}>{item.brand} {item.model}</h3>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4">
                                    <span className={`px-1.5 py-0.5 rounded ${item.type === 'official' && item.status !== 'sold' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20' : 'bg-slate-50 dark:bg-[#1A1A24] text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-[#2D3748]'}`}>
                                        {CATEGORIES.find(c => c.id === item.category)?.label}
                                    </span>
                                    <span>•</span>
                                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center justify-between border-t border-slate-100 dark:border-[#2D3748] pt-2.5">
                                    <div className="text-lg font-bold font-mono tracking-tight text-slate-900 dark:text-white">
                                        ¥{item.price}
                                        {item.originalPrice && <span className="text-[10px] text-slate-400 font-normal line-through ml-2">¥{item.originalPrice}</span>}
                                    </div>
                                    <div className={`w-7 h-7 rounded flex items-center justify-center transition-colors border ${item.type === 'official'
                                        ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-500/20'
                                        : 'bg-slate-50 dark:bg-[#1A1A24] border-slate-100 dark:border-[#2D3748] text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                                        }`}>
                                        <Eye size={14} />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            ) : (
                <div className="py-20 text-center">
                    <div className="w-24 h-24 bg-slate-50 dark:bg-[#1A1A24] rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300 dark:text-slate-600 border border-slate-200 dark:border-[#2D3748]">
                        <ShoppingBag size={40} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-2">暂无相关商品</h3>
                    <p className="text-slate-400 max-w-xs mx-auto mb-6">没有找到符合条件的二手硬件，您可以尝试切换分类或发布您的闲置。</p>
                    <button
                        onClick={currentUser ? onSell : onLogin}
                        className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all"
                    >
                        发布闲置
                    </button>
                </div>
            )}

            {loading && (
                <div className="flex justify-center items-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
                </div>
            )}

            <div className="flex justify-center mt-12 pb-20">
                <Pagination
                    currentPage={page}
                    totalItems={total}
                    pageSize={pageSize}
                    onPageChange={setPage}
                />
            </div>
        </div>
    );
}
