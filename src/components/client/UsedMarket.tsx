import { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Recycle, ShoppingBag, Eye, Shield, User, ExternalLink } from 'lucide-react';
import { UsedItem, UserItem, UsedCategory } from '../../types/adminTypes';
import { storage } from '../../services/storage';

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

// 3天的毫秒数
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export default function UsedMarket({ currentUser, onLogin, onViewDetail, onSell, onRecycle }: UsedMarketProps) {
    const [selectedCategory, setSelectedCategory] = useState<UsedCategory | 'all'>('all');
    const [selectedType, setSelectedType] = useState<'all' | 'official' | 'personal'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [items, setItems] = useState<UsedItem[]>([]);

    // Load data
    const loadData = async () => {
        try {
            const data = await storage.getUsedItems();
            setItems(data);
        } catch (error) {
            console.error('Failed to load used items:', error);
        }
    };

    // Listen for storage updates
    useEffect(() => {
        loadData();
        window.addEventListener('storage', loadData);
        window.addEventListener('xiaoyu-storage-update', loadData);
        return () => {
            window.removeEventListener('storage', loadData);
            window.removeEventListener('xiaoyu-storage-update', loadData);
        };
    }, []);

    const filteredItems = useMemo(() => {
        const now = Date.now();
        return items.filter(item => {
            // 只显示已发布或已售出的商品
            if (item.status !== 'published' && item.status !== 'sold') return false;

            // 已售出超过3天的商品不显示
            if (item.status === 'sold' && item.soldAt && (now - item.soldAt > THREE_DAYS_MS)) {
                return false;
            }

            // 类型筛选
            if (selectedType !== 'all' && item.type !== selectedType) return false;

            // 分类筛选
            if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;

            // 搜索
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                return item.brand.toLowerCase().includes(q) ||
                    item.model.toLowerCase().includes(q) ||
                    item.description.toLowerCase().includes(q);
            }
            return true;
        });
    }, [items, selectedCategory, selectedType, searchQuery]);

    return (
        <div className="space-y-8 pb-20">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <div className="absolute bottom-0 left-0 w-56 h-56 bg-amber-500/15 rounded-full blur-3xl -ml-14 -mb-14"></div>
                <div className="absolute top-1/2 right-1/3 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl"></div>

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-4 mb-3">
                            <h2 className="text-3xl font-bold">二手闲置</h2>
                            <span className="px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full text-xs font-bold shadow-lg shadow-amber-500/30">
                                让价值流动
                            </span>
                        </div>
                        <p className="text-slate-300 max-w-lg text-sm leading-relaxed">
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                                <Shield size={14} /> 官方二手
                            </span>
                            <span className="mx-1.5">经平台严格质检，品质保障售后无忧；</span>
                            <span className="inline-flex items-center gap-1 text-amber-400 font-bold">
                                <User size={14} /> 个人闲置
                            </span>
                            <span className="mx-1.5">由用户自行发布，交易通过闲鱼完成。</span>
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={currentUser ? onRecycle : onLogin}
                            className="px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-xl font-bold transition-all flex items-center gap-2"
                        >
                            <Recycle size={18} />
                            我要回收
                        </button>
                        <button
                            onClick={currentUser ? onSell : onLogin}
                            className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/30 rounded-xl font-bold transition-all flex items-center gap-2"
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
                        className={`px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${selectedType === type.id
                            ? type.id === 'official'
                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                                : type.id === 'personal'
                                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                                    : 'bg-slate-900 text-white shadow-md'
                            : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                            }`}
                    >
                        {type.id === 'official' && <Shield size={14} />}
                        {type.id === 'personal' && <User size={14} />}
                        {type.label}
                    </button>
                ))}
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between sticky top-[72px] z-30 bg-white/80 backdrop-blur-md py-4 -my-4 px-4 rounded-xl border border-slate-100 shadow-sm">
                <div className="flex gap-2 overflow-x-auto no-scrollbar w-full md:w-auto pb-2 md:pb-0">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${selectedCategory === cat.id
                                ? 'bg-slate-900 text-white shadow-md'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium"
                    />
                </div>
            </div>

            {/* Items Grid */}
            {filteredItems.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredItems.map(item => (
                        <div
                            key={item.id}
                            onClick={() => onViewDetail(item)}
                            className={`rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer overflow-hidden group ${item.type === 'official'
                                ? 'bg-gradient-to-br from-emerald-50 to-white border-2 border-emerald-200 ring-1 ring-emerald-100'
                                : 'bg-white border border-slate-100'
                                }`}
                        >
                            <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
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
                                    <div className="absolute top-3 left-3 bg-gradient-to-r from-emerald-600 to-teal-500 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-lg shadow-emerald-500/30">
                                        <Shield size={12} /> 官方质保
                                    </div>
                                ) : (
                                    <div className="absolute top-3 left-3 bg-amber-500/90 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1">
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
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                        <div className="w-20 h-20 rounded-full border-4 border-white text-white flex items-center justify-center font-bold text-xl -rotate-12">
                                            已售出
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className={`p-4 ${item.type === 'official' ? 'bg-gradient-to-b from-emerald-50/50 to-transparent' : ''}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-slate-900 line-clamp-2">{item.brand} {item.model}</h3>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
                                    <span className={`px-1.5 py-0.5 rounded ${item.type === 'official' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100'}`}>
                                        {CATEGORIES.find(c => c.id === item.category)?.label}
                                    </span>
                                    <span>•</span>
                                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="text-lg font-bold text-red-500">
                                        ¥{item.price}
                                        {item.originalPrice && <span className="text-xs text-slate-400 font-normal line-through ml-2">¥{item.originalPrice}</span>}
                                    </div>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${item.type === 'official'
                                        ? 'bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200'
                                        : 'bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600'
                                        }`}>
                                        <Eye size={16} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-20 text-center">
                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                        <ShoppingBag size={40} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 mb-2">暂无相关商品</h3>
                    <p className="text-slate-400 max-w-xs mx-auto mb-6">没有找到符合条件的二手硬件，您可以尝试切换分类或发布您的闲置。</p>
                    <button
                        onClick={currentUser ? onSell : onLogin}
                        className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all"
                    >
                        发布闲置
                    </button>
                </div>
            )}
        </div>
    );
}
