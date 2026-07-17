import { useState, useMemo, useEffect } from 'react';
import { Check, Cpu, Heart, MonitorPlay, Search, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { ConfigTemplate, HardwareItem } from '../../types/clientTypes';
import { TAGS_APPEARANCE, TAGS_USAGE, HARDWARE_DB } from '../../data/clientData';
import { ConfigDetailModal } from './ConfigDetailModal';
import { storage } from '../../services/storage';
import Pagination from '../common/Pagination';

import { UserItem } from '../../types/adminTypes';

type PriceRangeId = 'all' | 'under3000' | '3000-6000' | '6000-10000' | '10000-15000' | 'over15000' | 'custom';

const PRICE_RANGE_OPTIONS: Array<{ id: PriceRangeId; label: string; minPrice?: number; maxPrice?: number }> = [
    { id: 'all', label: '全部价格' },
    { id: 'under3000', label: '3K以内', maxPrice: 3000 },
    { id: '3000-6000', label: '3K-6K', minPrice: 3000, maxPrice: 6000 },
    { id: '6000-10000', label: '6K-1W', minPrice: 6000, maxPrice: 10000 },
    { id: '10000-15000', label: '1W-1.5W', minPrice: 10000, maxPrice: 15000 },
    { id: 'over15000', label: '1.5W以上', minPrice: 15000 }
];

const parsePriceInput = (value: string) => {
    const normalized = value.replace(/[^\d]/g, '');
    return normalized ? Number(normalized) : undefined;
};

function ConfigSquare({ settings, onLoadConfig, showToast, onToggleLike, currentUser }: { settings: import('../../types/adminTypes').PricingStrategy, onLoadConfig: (cfg: ConfigTemplate) => void, showToast: (msg: string) => void, onToggleLike: (id: string) => void, currentUser: UserItem | null }) {
    const [configs, setConfigs] = useState<ConfigTemplate[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(12); // Square usually shows more per page
    const [loading, setLoading] = useState(false);
    const [allProducts, setAllProducts] = useState<HardwareItem[]>([]);

    const [selectedTag, setSelectedTag] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'recommend' | 'hot' | 'new'>('recommend');
    const [priceRange, setPriceRange] = useState<PriceRangeId>('all');
    const [customMinPrice, setCustomMinPrice] = useState('');
    const [customMaxPrice, setCustomMaxPrice] = useState('');
    const [showFilterSheet, setShowFilterSheet] = useState(false);
    const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);

    const priceFilter = useMemo(() => {
        if (priceRange === 'custom') {
            const minPrice = parsePriceInput(customMinPrice);
            const maxPrice = parsePriceInput(customMaxPrice);
            const label = minPrice || maxPrice
                ? `${minPrice ? `¥${minPrice.toLocaleString()}` : '不限'}-${maxPrice ? `¥${maxPrice.toLocaleString()}` : '不限'}`
                : '自定义价格';
            return { minPrice, maxPrice, label };
        }

        const option = PRICE_RANGE_OPTIONS.find(item => item.id === priceRange) || PRICE_RANGE_OPTIONS[0];
        return { minPrice: option.minPrice, maxPrice: option.maxPrice, label: option.label };
    }, [priceRange, customMinPrice, customMaxPrice]);

    const activeFiltersCount = (selectedTag !== 'all' ? 1 : 0) + (priceRange !== 'all' ? 1 : 0);

    const loadData = async () => {
        setLoading(true);
        try {
            // Need products for spec mapping (though backend join would be better)
            // For now, fetch a large enough set of products or just what's needed
            const [cRes, pRes, userLikes] = await Promise.all([
                storage.getConfigs({
                    page,
                    pageSize,
                    tag: selectedTag,
                    search: searchQuery,
                    sortBy,
                    minPrice: priceFilter.minPrice,
                    maxPrice: priceFilter.maxPrice
                }),
                storage.getProducts(1, 1000), // Fetch public products without admin restriction
                currentUser ? storage.getUserLikes(currentUser.id) : Promise.resolve([])
            ]);

            setTotal(cRes.total);
            setAllProducts(pRes.items);

            // Map to client template
            const mappedList: ConfigTemplate[] = cRes.items.map(c => {
                const authorName = c.userName || c.authorName || 'Unknown User';
                let type: 'official' | 'streamer' | 'user' | 'help' = 'user';

                // Prioritize role-based identification
                if (c.authorRole === 'streamer') type = 'streamer';
                // Fallback to keyword matching and other flags
                else if (authorName.includes('主播') || (authorName.includes('分享者') === false && c.title.includes('主播'))) type = 'streamer';

                if (c.tags?.includes('求助')) type = 'help';
                if (c.isRecommended) type = 'official';

                return {
                    id: c.id,
                    userId: c.userId,
                    title: c.title,
                    author: authorName,
                    avatarColor: 'bg-zinc-500',
                    type: type,
                    tags: (Array.isArray(c.tags) ? c.tags : (typeof c.tags === 'string' ? JSON.parse(c.tags || '[]') : [])).map((t: string) => ({ type: 'usage' as const, label: t })),
                    price: c.totalPrice,
                    items: typeof c.items === 'string' ? JSON.parse(c.items) : (c.items || {}),
                    likes: c.likes || 0,
                    views: c.views || 0,
                    comments: 0,
                    date: c.createdAt,
                    isLiked: userLikes.includes(c.id),
                    serialNumber: c.serialNumber,
                    description: c.description,
                    showcaseImages: typeof c.showcaseImages === 'string' ? JSON.parse(c.showcaseImages) : (c.showcaseImages || []),
                    showcaseStatus: c.showcaseStatus
                    // isVip: handled if needed
                };
            });
            setConfigs(mappedList);

            // Fetch specific config from URL if present
            const params = new URLSearchParams(window.location.search);
            const urlConfigId = params.get('config');
            if (urlConfigId && !selectedConfigId) {
                const found = mappedList.find((c: ConfigTemplate) => c.id === urlConfigId);
                if (found) {
                    setSelectedConfigId(urlConfigId);
                } else {
                    try {
                        const directRes = await storage.getConfig(urlConfigId);
                        if (directRes) {
                            const authorName = directRes.userName || directRes.authorName || 'Unknown User';
                            let directType: 'official' | 'streamer' | 'user' | 'help' = 'user';
                            if (directRes.authorRole === 'streamer') directType = 'streamer';
                            else if (authorName.includes('主播') || (authorName.includes('分享者') === false && directRes.title.includes('主播'))) directType = 'streamer';
                            if (directRes.tags?.includes('求助')) directType = 'help';
                            if (directRes.isRecommended) directType = 'official';

                            const mappedDirect: ConfigTemplate = {
                                id: directRes.id,
                                userId: directRes.userId,
                                title: directRes.title,
                                author: authorName,
                                avatarColor: 'bg-zinc-500',
                                type: directType,
                                tags: (Array.isArray(directRes.tags) ? directRes.tags : (typeof directRes.tags === 'string' ? JSON.parse(directRes.tags || '[]') : [])).map((t: string) => ({ type: 'usage' as const, label: t })),
                                price: directRes.totalPrice,
                                items: typeof directRes.items === 'string' ? JSON.parse(directRes.items) : (directRes.items || {}),
                                likes: directRes.likes || 0,
                                views: directRes.views || 0,
                                comments: 0,
                                date: directRes.createdAt,
                                isLiked: userLikes.includes(directRes.id),
                                serialNumber: directRes.serialNumber,
                                description: directRes.description,
                                showcaseImages: typeof directRes.showcaseImages === 'string' ? JSON.parse(directRes.showcaseImages) : (directRes.showcaseImages || []),
                                showcaseStatus: directRes.showcaseStatus
                            };
                            setConfigs(prev => [mappedDirect, ...prev]);
                            setSelectedConfigId(urlConfigId);
                        }
                    } catch (e) {
                        console.error('Failed to load shared config', e);
                    }
                }
                
                params.delete('config');
                const newUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
                window.history.replaceState({}, '', newUrl);
            }
        } catch (error) {
            console.error('Failed to load configs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [page, sortBy, selectedTag, priceFilter.minPrice, priceFilter.maxPrice]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (page === 1) loadData();
            else setPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Derive the active config from the fresh list to ensure updates (like likes) are reflected immediately
    const activeConfig = useMemo(() => {
        return configs.find(c => c.id === selectedConfigId) || null;
    }, [configs, selectedConfigId]);

    const TAG_OPTIONS = [
        { id: 'all', label: '全部' },
        { id: 'showcase', label: '📸 玩家晒单' },
        ...TAGS_APPEARANCE.map(t => ({ id: t, label: t })),
        ...TAGS_USAGE.map(t => ({ id: t, label: t }))
    ];

    const selectedTagLabel = TAG_OPTIONS.find(opt => opt.id === selectedTag)?.label || '全部';

    const handleSortChange = (nextSort: 'recommend' | 'hot' | 'new') => {
        setSortBy(nextSort);
        setPage(1);
    };

    const handleTagChange = (nextTag: string) => {
        setSelectedTag(nextTag);
        setPage(1);
    };

    const handlePriceRangeChange = (nextRange: PriceRangeId) => {
        setPriceRange(nextRange);
        if (nextRange !== 'custom') {
            setCustomMinPrice('');
            setCustomMaxPrice('');
        }
        setPage(1);
    };

    const clearFilters = () => {
        setSelectedTag('all');
        setPriceRange('all');
        setCustomMinPrice('');
        setCustomMaxPrice('');
        setPage(1);
    };

    const sortedConfigs = configs; // Now sorted on server

    const getCoreSpecs = (cfg: ConfigTemplate) => {
        const getModel = (id: any, defaultText: string) => {
            if (!id) return defaultText;
            if (typeof id === 'object') {
                if (id.isCustom) return id.name;
                id = id.id;
            }
            const item = allProducts.find(i => i.id === id) || HARDWARE_DB.find(i => i.id === id);
            return item ? item.model : defaultText;
        };

        const cpu = getModel(cfg.items.cpu, 'CPU');
        const gpu = getModel(cfg.items.gpu, '集显');
        const monitor = getModel(cfg.items.monitor, '自备显示器');

        // Simplify names
        const cpuShort = cpu.replace(/Intel Core |AMD Ryzen /i, '').replace(/ Processor/i, '');
        const gpuShort = gpu.replace(/NVIDIA GeForce |AMD Radeon /i, '').replace(/ Graphics/i, '');
        const monitorShort = monitor;

        return { cpu: cpuShort, gpu: gpuShort, monitor: monitorShort };
    };

    const getTypeTheme = (type: ConfigTemplate['type']) => {
        switch (type) {
            case 'official': return { style: 'bg-black text-white border-black', label: '官方推荐' };
            case 'streamer': return { style: 'bg-indigo-600 text-white border-indigo-600', label: '主播力荐' };
            case 'user': return { style: 'bg-white text-slate-600 border-slate-200', label: '用户分享' };
            case 'help': return { style: 'bg-orange-500 text-white border-orange-500', label: '求助' };
            default: return { style: 'bg-slate-100 text-slate-400 border-slate-200', label: '未知' };
        }
    };

    // Check if author is VIP (now using pre-calculated flag from template)
    const isUserVip = (cfg: ConfigTemplate): boolean => {
        return !!cfg.isVip;
    };

    const handleToggleLikeClick = async (e: React.MouseEvent, cfg: ConfigTemplate) => {
        e.stopPropagation();
        if (!currentUser) {
            showToast("请先登录后收藏");
            return;
        }

        // Update local state immediately for snappy UI
        setConfigs(prev => prev.map(c => {
            if (c.id === cfg.id) {
                return { ...c, likes: c.isLiked ? c.likes - 1 : c.likes + 1, isLiked: !c.isLiked };
            }
            return c;
        }));

        // Call the parent which handles global state and backend saves
        onToggleLike(cfg.id);
    };

    return (
        <div className="space-y-3 md:space-y-12 pb-24 md:pb-20">
            {/* Dashboard Header Section */}
            <div className="relative pt-3 md:pt-16 pb-3 md:pb-10 md:mb-6 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
                <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row md:items-end justify-between gap-3 md:gap-6">
                    <div className="space-y-1.5 md:space-y-3">
                        <div className="hidden md:inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold tracking-widest uppercase border border-indigo-100 dark:border-indigo-500/20">
                            <Sparkles size={10} />
                            <span>Inspiration Hub</span>
                        </div>
                        <h2 className="text-lg md:text-3xl font-black md:font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
                            配置广场 <span className="hidden md:inline text-slate-400 font-medium ml-2 text-xl tracking-normal">CONFIG SQUARE</span>
                        </h2>
                        <p className="hidden md:block text-slate-500 dark:text-slate-400 text-sm max-w-xl font-medium">
                            汇聚海量真实装机方案，为您提供最专业、最高颜值的装机灵感参考。
                        </p>
                    </div>

                    {/* Integrated Search Bar - Compact SaaS Style */}
                    <div className="max-w-md w-full relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 md:pl-4 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors" />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="搜索配置、CPU、显卡型号..."
                            className="block w-full pl-9 md:pl-10 pr-4 py-2 md:py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Sticky Filter Bar (Sort & Tags) */}
            <div className="sticky top-0 md:top-20 z-40 md:z-30 max-w-7xl mx-auto px-0 md:px-4 md:mb-8">
                <div className="bg-white/95 md:bg-white/80 dark:bg-slate-900/95 md:dark:bg-slate-900/80 backdrop-blur-xl border-y md:border border-slate-200/80 md:border-slate-200/60 dark:border-slate-700/70 md:dark:border-slate-700/60 p-2 md:rounded-2xl md:shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-1.5 md:gap-4">

                    {/* Sort Options */}
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 md:p-1 rounded-xl w-full md:w-auto">
                        {[
                            { id: 'recommend', label: '推荐' },
                            { id: 'new', label: '最新' },
                            { id: 'hot', label: '热门' }
                        ].map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => handleSortChange(opt.id as 'recommend' | 'hot' | 'new')}
                                className={`flex-1 md:flex-none px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs font-bold transition-all ${sortBy === opt.id
                                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                    }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden md:block"></div>

                    <div className="flex md:hidden items-center gap-1.5 min-w-0 w-full">
                        <button
                            onClick={() => setShowFilterSheet(true)}
                            className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 md:py-2 rounded-xl text-xs font-bold border transition-all ${activeFiltersCount > 0
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                                }`}
                        >
                            <SlidersHorizontal size={14} />
                            筛选
                            {activeFiltersCount > 0 && <span className="min-w-4 h-4 rounded-full bg-white/20 text-[10px] leading-4">{activeFiltersCount}</span>}
                        </button>

                        {/* Tag Filters */}
                        <div className="flex gap-1.5 overflow-x-auto no-scrollbar w-full px-0.5 mask-linear-fade">
                            {TAG_OPTIONS.map(opt => {
                                const isActive = selectedTag === opt.id;
                                return (
                                    <button
                                        key={opt.id}
                                        onClick={() => handleTagChange(opt.id)}
                                        className={`whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${isActive
                                            ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-md'
                                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-transparent hover:border-slate-200 dark:hover:border-slate-600'
                                            }`}
                                    >
                                        {opt.id === 'all' ? '全部' : opt.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Desktop Tag Filters */}
                    <div className="hidden md:flex gap-2 overflow-x-auto no-scrollbar w-auto px-1 mask-linear-fade">
                        {TAG_OPTIONS.map(opt => {
                            const isActive = selectedTag === opt.id;
                            return (
                                <button
                                    key={opt.id}
                                    onClick={() => handleTagChange(opt.id)}
                                    className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all ${isActive
                                        ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-md'
                                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-transparent hover:border-slate-200 dark:hover:border-slate-600'
                                        }`}
                                >
                                    {opt.id === 'all' ? '全部' : opt.label}
                                </button>
                            );
                        })}
                    </div>

                    <div className={`items-center justify-between gap-2 px-1 md:hidden ${activeFiltersCount > 0 ? 'flex' : 'hidden'}`}>
                        <div className="min-w-0 truncate text-[11px] font-medium text-slate-400">
                            {selectedTagLabel} · {priceFilter.label}
                        </div>
                        <button onClick={clearFilters} className="shrink-0 text-[11px] font-bold text-indigo-600">
                            清空
                        </button>
                    </div>
                </div>
            </div>

            {showFilterSheet && (
                <div
                    className="fixed inset-0 z-[140] flex md:hidden items-start justify-center bg-slate-900/35 backdrop-blur-sm px-3 pt-[calc(76px+env(safe-area-inset-top))]"
                    onClick={() => setShowFilterSheet(false)}
                >
                    <div
                        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4 md:p-5"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-base font-black text-slate-900 dark:text-white">筛选配置</h3>
                                <p className="text-xs text-slate-400 mt-0.5">按预算快速缩小方案范围</p>
                            </div>
                            <button
                                onClick={() => setShowFilterSheet(false)}
                                className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 flex items-center justify-center"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">价格区间</div>
                                <div className="grid grid-cols-2 gap-2">
                                    {PRICE_RANGE_OPTIONS.map(option => {
                                        const isActive = priceRange === option.id;
                                        return (
                                            <button
                                                key={option.id}
                                                onClick={() => handlePriceRangeChange(option.id)}
                                                className={`h-10 px-3 rounded-xl border text-sm font-bold flex items-center justify-between transition-all ${isActive
                                                    ? 'bg-slate-900 dark:bg-indigo-600 text-white border-slate-900 dark:border-indigo-600'
                                                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                                    }`}
                                            >
                                                {option.label}
                                                {isActive && <Check size={14} />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">自定义价格</div>
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        type="tel"
                                        inputMode="numeric"
                                        value={customMinPrice}
                                        onChange={(e) => {
                                            setPriceRange('custom');
                                            setCustomMinPrice(e.target.value);
                                            setPage(1);
                                        }}
                                        placeholder="最低价"
                                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                    />
                                    <input
                                        type="tel"
                                        inputMode="numeric"
                                        value={customMaxPrice}
                                        onChange={(e) => {
                                            setPriceRange('custom');
                                            setCustomMaxPrice(e.target.value);
                                            setPage(1);
                                        }}
                                        placeholder="最高价"
                                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 mt-5">
                            <button
                                onClick={clearFilters}
                                className="flex-1 h-11 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900"
                            >
                                重置
                            </button>
                            <button
                                onClick={() => setShowFilterSheet(false)}
                                className="flex-1 h-11 rounded-xl text-sm font-bold text-white bg-indigo-600 shadow-lg shadow-indigo-200 dark:shadow-none"
                            >
                                查看结果
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Config Grid - Clean Cards */}
            <motion.div 
                initial="hidden"
                animate="visible"
                variants={{
                    hidden: { opacity: 0 },
                    visible: {
                        opacity: 1,
                        transition: { staggerChildren: 0.1 }
                    }
                } as any}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6 px-3 md:px-4 max-w-8xl mx-auto"
            >
                {sortedConfigs.map((cfg, index) => {
                    const specs = getCoreSpecs(cfg);
                    const theme = getTypeTheme(cfg.type);

                    // Keep card price aligned with server-side price filtering; recalc only as a fallback.
                    let base = 0;
                    Object.entries(cfg.items).forEach(([key, itemId]: [string, any]) => {
                        if (key.startsWith('__')) return;
                        if (!itemId) return;
                        if (typeof itemId === 'object') {
                            if (itemId.isCustom) {
                                base += (itemId.price || 0) * (itemId.quantity || 1);
                                return;
                            } else if (itemId.id) {
                                const localItem = allProducts.find(p => p.id === itemId.id) || HARDWARE_DB.find(p => p.id === itemId.id);
                                if (localItem) base += ((localItem as any).price || 0) * (itemId.quantity || 1);
                                return;
                            }
                        }
                        const item = allProducts.find(p => p.id === itemId) || HARDWARE_DB.find(p => p.id === itemId);
                        if (item) base += (item as any).price || 0;
                    });
                    const feeRate = settings?.serviceFeeRate ?? 0.06;
                    const recalculatedPrice = Math.floor(base * (1 + feeRate));
                    const savedPrice = Math.floor(cfg.price || 0);
                    const finalPrice = savedPrice > 0 ? savedPrice : recalculatedPrice;

                    const hasShowcaseCover = cfg.showcaseStatus === 'approved' && cfg.showcaseImages && cfg.showcaseImages.length > 0;
                    const coverImageUrl = hasShowcaseCover ? cfg.showcaseImages![0] : null;
                    const isHero = index === 0 && cfg.type === 'official';

                    return (
                        <motion.div
                            variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100, damping: 15 } } } as any}
                            key={cfg.id}
                            onClick={() => setSelectedConfigId(cfg.id)}
                            className={`group relative bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400/50 dark:hover:border-indigo-500/50 shadow-sm hover:shadow-md hover:-translate-y-1 active:scale-[0.99] transition-all duration-300 cursor-pointer overflow-hidden flex flex-col ${isHero ? 'md:col-span-2 md:h-[360px]' : 'md:h-[340px]'}`}
                        >
                            {/* Showcase Cover Background */}
                            {coverImageUrl ? (
                                <div className={`absolute top-0 left-0 w-full z-0 overflow-hidden h-28 ${isHero ? 'md:h-[180px]' : 'md:h-[130px]'}`}>
                                    <img src={coverImageUrl} alt={cfg.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent md:hidden"></div>
                                    <div className="hidden md:block absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent"></div>
                                </div>
                            ) : null}

                            <div className={`absolute top-2.5 left-3 md:top-3.5 md:left-3.5 z-10 px-2 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase border shadow-sm ${theme.style}`}>
                                {theme.label}
                            </div>

                            {/* Showcase Badge */}
                            {hasShowcaseCover && (
                                <div className="absolute top-8 left-3 md:top-10 md:left-3.5 z-10 px-1.5 py-0.5 rounded bg-white/90 dark:bg-slate-900/90 text-indigo-600 dark:text-indigo-400 text-[9px] font-bold border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-1 backdrop-blur-md uppercase tracking-wider">
                                    📸 PHOTO
                                </div>
                            )}

                            {/* Serial Number + VIP Badge (Top Right) */}
                            <div className="absolute top-2.5 right-3 md:top-3.5 md:right-3.5 z-10 flex items-center gap-1.5">
                                {isUserVip(cfg) && (
                                    <span className="flex items-center gap-0.5 bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm tracking-wider">
                                        VIP
                                    </span>
                                )}
                                <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded border shadow-sm backdrop-blur-md ${coverImageUrl ? 'bg-black/40 border-white/20 text-white/90' : 'bg-slate-50/80 dark:bg-slate-800/80 border-slate-200/60 dark:border-slate-700/60 text-slate-400'}`}>
                                    #{cfg.serialNumber ? cfg.serialNumber.split('-')[1] : cfg.id.slice(-4)}
                                </span>
                            </div>

                            {/* Card Header */}
                            <div className={`px-3.5 md:px-4 pb-0 flex flex-col relative z-10 ${coverImageUrl ? (isHero ? 'pt-[78px] md:pt-[110px]' : 'pt-[78px] md:pt-20') : 'pt-10 md:pt-12'}`}>
                                <h3 className={`text-[15px] md:text-sm font-black md:font-bold line-clamp-1 md:line-clamp-1 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors ${coverImageUrl ? 'text-white drop-shadow-sm md:drop-shadow-none' : 'text-slate-900 dark:text-slate-100'}`}>
                                    {cfg.title}
                                </h3>
                                {cfg.tags && cfg.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1.5 md:mt-2">
                                        {cfg.tags.slice(0, 2).map((tag: any, idx: number) => (
                                            <span key={idx} className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${coverImageUrl ? 'bg-white/15 md:bg-white/10 text-white/90 border-white/20' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}>
                                                {(tag.label || tag).toUpperCase()}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Card Body: Specs List */}
                            <div className="p-3 md:p-4 md:flex-1 grid grid-cols-2 md:flex md:flex-col content-start md:justify-center gap-2">
                                <div className="flex items-center gap-2 md:gap-2.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50 min-w-0">
                                    <div className="w-6 h-6 md:w-7 md:h-7 rounded bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 shadow-sm border border-slate-100 dark:border-slate-700">
                                        <Cpu size={14} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[8px] uppercase text-slate-400 font-bold tracking-widest">
                                            <span className="md:hidden">CPU</span>
                                            <span className="hidden md:inline">PROCESSOR</span>
                                        </div>
                                        <div className="text-[12px] md:text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">{specs.cpu}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 md:gap-2.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50 min-w-0">
                                    <div className="w-6 h-6 md:w-7 md:h-7 rounded bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 shadow-sm border border-slate-100 dark:border-slate-700">
                                        <MonitorPlay size={14} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[8px] uppercase text-slate-400 font-bold tracking-widest">
                                            <span className="md:hidden">GPU</span>
                                            <span className="hidden md:inline">GRAPHICS</span>
                                        </div>
                                        <div className="text-[12px] md:text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">{specs.gpu}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Card Footer */}
                            <div className="md:hidden px-3.5 py-2.5 border-t border-slate-100 dark:border-slate-800 flex items-end justify-between bg-white dark:bg-slate-900">
                                <div>
                                    <div className="text-[10px] font-bold text-slate-400 mb-0.5">参考总价</div>
                                    <div className="text-lg font-mono font-black text-slate-900 dark:text-white tracking-tighter">
                                        ¥{finalPrice.toLocaleString()}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1.5">
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <button
                                            onClick={(e) => handleToggleLikeClick(e, cfg)}
                                            className={`flex items-center gap-1 transition-colors ${cfg.isLiked ? 'text-pink-500' : 'hover:text-slate-600'}`}
                                        >
                                            <Heart size={12} className={cfg.isLiked ? 'fill-current' : ''} />
                                            <span className="text-[10px] font-bold">{cfg.likes}</span>
                                        </button>
                                        <span className="text-[10px] font-medium">{new Date(cfg.date).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="hidden md:flex px-4 py-3 border-t border-slate-100 dark:border-slate-800 items-center justify-between bg-white dark:bg-slate-900">
                                <div className="flex items-center gap-2">
                                    <div className={`w-6 h-6 rounded ${cfg.avatarColor} flex items-center justify-center text-[10px] text-white font-bold`}>
                                        {cfg.author[0].toUpperCase()}
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <button
                                            onClick={(e) => handleToggleLikeClick(e, cfg)}
                                            className={`flex items-center gap-1 transition-colors ${cfg.isLiked ? 'text-pink-500' : 'hover:text-slate-600'}`}
                                        >
                                            <Heart size={12} className={cfg.isLiked ? 'fill-current' : ''} />
                                            <span className="text-[10px] font-bold">{cfg.likes}</span>
                                        </button>
                                        <span className="text-[10px] font-medium">{new Date(cfg.date).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}</span>
                                    </div>
                                </div>
                                <div className="text-base font-mono font-bold text-slate-900 dark:text-white tracking-tighter">
                                    ¥{finalPrice.toLocaleString()}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </motion.div>

            {loading && (
                <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            )}

            {!loading && sortedConfigs.length === 0 && (
                <div className="text-center py-20">
                    <div className="text-slate-400 dark:text-slate-500 font-bold">未找到相关配置</div>
                </div>
            )}

            <div className="max-w-7xl mx-auto px-4 mt-12 mb-20 flex justify-center">
                <Pagination
                    currentPage={page}
                    totalItems={total}
                    pageSize={pageSize}
                    onPageChange={setPage}
                />
            </div>

            {activeConfig && (
                <ConfigDetailModal
                    config={activeConfig}
                    onClose={() => setSelectedConfigId(null)}
                    onLoad={() => { onLoadConfig(activeConfig); setSelectedConfigId(null); }}
                    showToast={showToast}
                    onToggleLike={onToggleLike}
                    currentUser={currentUser}
                />
            )}
        </div>
    );
}

export default ConfigSquare;
