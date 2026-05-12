import { useState, useMemo, useEffect } from 'react';
import { Search, Sparkles, Cpu, Heart, MonitorPlay } from 'lucide-react';
import { motion } from 'framer-motion';
import { ConfigTemplate, HardwareItem } from '../../types/clientTypes';
import { TAGS_APPEARANCE, TAGS_USAGE, HARDWARE_DB } from '../../data/clientData';
import { ConfigDetailModal } from './ConfigDetailModal';
import { storage } from '../../services/storage';
import Pagination from '../common/Pagination';

import { UserItem } from '../../types/adminTypes';

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
    const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);

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
                    sortBy
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
    }, [page, sortBy, selectedTag]);

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
        <div className="space-y-12 pb-20">
            {/* Dashboard Header Section */}
            <div className="relative pt-16 pb-10 mb-6 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
                <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold tracking-widest uppercase border border-indigo-100 dark:border-indigo-500/20">
                            <Sparkles size={10} />
                            <span>Inspiration Hub</span>
                        </div>
                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                            配置广场 <span className="text-slate-400 font-medium ml-2 text-xl tracking-normal">CONFIG SQUARE</span>
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xl font-medium">
                            汇聚海量真实装机方案，为您提供最专业、最高颜值的装机灵感参考。
                        </p>
                    </div>

                    {/* Integrated Search Bar - Compact SaaS Style */}
                    <div className="max-w-md w-full relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors" />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="搜索配置、CPU、显卡型号..."
                            className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Sticky Filter Bar (Sort & Tags) */}
            <div className="sticky top-20 z-30 max-w-7xl mx-auto px-4 mb-8">
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/60 dark:border-slate-700/60 p-2 rounded-2xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">

                    {/* Sort Options */}
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full md:w-auto">
                        {[
                            { id: 'recommend', label: '推荐' },
                            { id: 'new', label: '最新' },
                            { id: 'hot', label: '热门' }
                        ].map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => setSortBy(opt.id as any)}
                                className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${sortBy === opt.id
                                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                    }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden md:block"></div>

                    {/* Tag Filters */}
                    <div className="flex gap-2 overflow-x-auto no-scrollbar w-full md:w-auto px-1 mask-linear-fade">
                        {TAG_OPTIONS.map(opt => {
                            const isActive = selectedTag === opt.id;
                            return (
                                <button
                                    key={opt.id}
                                    onClick={() => setSelectedTag(opt.id)}
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
                </div>
            </div>

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
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-4 max-w-8xl mx-auto"
            >
                {sortedConfigs.map((cfg, index) => {
                    const specs = getCoreSpecs(cfg);
                    const theme = getTypeTheme(cfg.type);

                    // Recalculate price for accuracy (sum of parts + dynamic fee)
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
                    const finalPrice = Math.floor(base * (1 + feeRate));

                    const hasShowcaseCover = cfg.showcaseStatus === 'approved' && cfg.showcaseImages && cfg.showcaseImages.length > 0;
                    const coverImageUrl = hasShowcaseCover ? cfg.showcaseImages![0] : null;
                    const isHero = index === 0 && cfg.type === 'official';

                    return (
                        <motion.div
                            variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100, damping: 15 } } } as any}
                            key={cfg.id}
                            onClick={() => setSelectedConfigId(cfg.id)}
                            className={`group relative bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400/50 dark:hover:border-indigo-500/50 shadow-sm hover:shadow-md hover:-translate-y-1 active:scale-[0.99] transition-all duration-300 cursor-pointer overflow-hidden flex flex-col ${isHero ? 'md:col-span-2 h-[360px]' : 'h-[340px]'}`}
                        >
                            {/* Showcase Cover Background */}
                            {coverImageUrl ? (
                                <div className={`absolute top-0 left-0 w-full z-0 overflow-hidden ${isHero ? 'h-[180px]' : 'h-[130px]'}`}>
                                    <img src={coverImageUrl} alt={cfg.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent"></div>
                                </div>
                            ) : null}

                            <div className={`absolute top-3.5 left-3.5 z-10 px-2 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase border shadow-sm ${theme.style}`}>
                                {theme.label}
                            </div>

                            {/* Showcase Badge */}
                            {hasShowcaseCover && (
                                <div className="absolute top-10 left-3.5 z-10 px-1.5 py-0.5 rounded bg-white/90 dark:bg-slate-900/90 text-indigo-600 dark:text-indigo-400 text-[9px] font-bold border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-1 backdrop-blur-md uppercase tracking-wider">
                                    📸 PHOTO
                                </div>
                            )}

                            {/* Serial Number + VIP Badge (Top Right) */}
                            <div className="absolute top-3.5 right-3.5 z-10 flex items-center gap-1.5">
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
                            <div className={`p-4 pb-0 flex flex-col relative z-10 ${coverImageUrl ? (isHero ? 'pt-[110px]' : 'pt-20') : 'pt-12'}`}>
                                <h3 className={`text-sm font-bold line-clamp-1 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors ${coverImageUrl ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>
                                    {cfg.title}
                                </h3>
                                {cfg.tags && cfg.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {cfg.tags.slice(0, 2).map((tag: any, idx: number) => (
                                            <span key={idx} className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${coverImageUrl ? 'bg-white/10 text-white/90 border-white/20' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}>
                                                {(tag.label || tag).toUpperCase()}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Card Body: Specs List */}
                            <div className="p-4 flex-1 flex flex-col justify-center gap-2">
                                <div className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50">
                                    <div className="w-7 h-7 rounded bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 shadow-sm border border-slate-100 dark:border-slate-700">
                                        <Cpu size={14} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[8px] uppercase text-slate-400 font-bold tracking-widest">PROCESSOR</div>
                                        <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">{specs.cpu}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50">
                                    <div className="w-7 h-7 rounded bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 shadow-sm border border-slate-100 dark:border-slate-700">
                                        <MonitorPlay size={14} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[8px] uppercase text-slate-400 font-bold tracking-widest">GRAPHICS</div>
                                        <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">{specs.gpu}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Card Footer */}
                            <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
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
