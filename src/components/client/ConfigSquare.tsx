import { useState, useMemo, useEffect } from 'react';
import { Search, Sparkles, Cpu, Zap, Crown } from 'lucide-react';
import { ConfigTemplate, HardwareItem } from '../../types/clientTypes';
import { TAGS_APPEARANCE, TAGS_USAGE, HARDWARE_DB } from '../../data/clientData';
import { ConfigDetailModal } from './ConfigDetailModal';
import { storage } from '../../services/storage';
import Pagination from '../common/Pagination';

import { UserItem } from '../../types/adminTypes';

function ConfigSquare({ onLoadConfig, showToast, onToggleLike, currentUser }: { onLoadConfig: (cfg: ConfigTemplate) => void, showToast: (msg: string) => void, onToggleLike: (id: string) => void, currentUser: UserItem | null }) {
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
            const [cRes, pRes] = await Promise.all([
                storage.getConfigs({
                    page,
                    pageSize,
                    tag: selectedTag,
                    search: searchQuery,
                    sortBy
                }),
                storage.getAdminProducts(1, 1000) // Products still needed for spec names
            ]);

            setTotal(cRes.total);
            setAllProducts(pRes.items);

            // Map to client template
            const mappedList: ConfigTemplate[] = cRes.items.map(c => {
                const authorName = c.userName || c.authorName || 'Unknown User';
                let type: 'official' | 'streamer' | 'user' | 'help' = 'user';
                if (authorName.includes('官方')) type = 'official';
                if (authorName.includes('主播')) type = 'streamer';
                if (c.tags.includes('求助')) type = 'help';
                if (c.isRecommended) type = 'official';

                return {
                    id: c.id,
                    userId: c.userId,
                    title: c.title,
                    author: authorName,
                    avatarColor: 'bg-zinc-500',
                    type: type,
                    tags: (c.tags || []).map((t: string) => ({ type: 'usage' as const, label: t })),
                    price: c.totalPrice,
                    items: c.items || {},
                    likes: c.likes || 0,
                    views: c.views || 0,
                    comments: 0,
                    date: c.createdAt,
                    isLiked: false,
                    serialNumber: c.serialNumber,
                    description: c.description
                    // isVip: handled if needed
                };
            });
            setConfigs(mappedList);
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
        ...TAGS_APPEARANCE.map(t => ({ id: t, label: t })),
        ...TAGS_USAGE.map(t => ({ id: t, label: t }))
    ];

    const sortedConfigs = configs; // Now sorted on server

    const getCoreSpecs = (cfg: ConfigTemplate) => {
        const getModel = (id: string | undefined, defaultText: string) => {
            if (!id) return defaultText;
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

    return (
        <div className="space-y-12 pb-20">
            {/* Hero Header & Search */}
            <div className="relative pt-20 pb-12 mb-8 bg-gradient-to-b from-white via-white to-slate-50/50 border-b border-slate-100">
                <div className="max-w-4xl mx-auto px-4 text-center space-y-8 relative z-10">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold tracking-wide uppercase border border-indigo-100">
                            <Sparkles size={12} />
                            <span>装机灵感</span>
                        </div>
                        <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
                            配置广场
                        </h2>
                        <p className="text-slate-500 text-lg max-w-2xl mx-auto font-medium">
                            "装机不仅是堆砌硬件，更是对品质生活的追求。"
                        </p>
                    </div>

                    {/* Integrated Search Bar */}
                    <div className="max-w-xl mx-auto relative group">
                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="搜索配置、CPU、显卡..."
                            className="block w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-full text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_25px_rgba(0,0,0,0.08)] text-base"
                        />
                        <div className="absolute inset-y-2 right-2 flex items-center">
                            <button className="bg-slate-900 hover:bg-black text-white px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow-md active:scale-95">
                                搜索
                            </button>
                        </div>
                    </div>
                </div>

                {/* Decorative Background Elements */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-full overflow-hidden pointer-events-none opacity-40">
                    <div className="absolute top-[20%] left-[10%] w-64 h-64 bg-indigo-200/20 rounded-full blur-3xl mix-blend-multiply animate-blob"></div>
                    <div className="absolute top-[10%] right-[10%] w-64 h-64 bg-purple-200/20 rounded-full blur-3xl mix-blend-multiply animate-blob animation-delay-2000"></div>
                </div>
            </div>

            {/* Sticky Filter Bar (Sort & Tags) */}
            <div className="sticky top-20 z-30 max-w-7xl mx-auto px-4 mb-8">
                <div className="bg-white/80 backdrop-blur-xl border border-slate-200/60 p-2 rounded-2xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">

                    {/* Sort Options */}
                    <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto">
                        {[
                            { id: 'recommend', label: '推荐' },
                            { id: 'new', label: '最新' },
                            { id: 'hot', label: '热门' }
                        ].map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => setSortBy(opt.id as any)}
                                className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${sortBy === opt.id
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-900'
                                    }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    <div className="h-6 w-px bg-slate-200 hidden md:block"></div>

                    {/* Tag Filters */}
                    <div className="flex gap-2 overflow-x-auto no-scrollbar w-full md:w-auto px-1 mask-linear-fade">
                        {TAG_OPTIONS.map(opt => {
                            const isActive = selectedTag === opt.id;
                            return (
                                <button
                                    key={opt.id}
                                    onClick={() => setSelectedTag(opt.id)}
                                    className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all ${isActive
                                        ? 'bg-slate-900 text-white shadow-md'
                                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-transparent hover:border-slate-200'
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-4 max-w-8xl mx-auto">
                {sortedConfigs.map((cfg) => {
                    const specs = getCoreSpecs(cfg);
                    const theme = getTypeTheme(cfg.type);

                    // Recalculate price for accuracy (sum of parts + 6% fee)
                    let base = 0;
                    Object.values(cfg.items).forEach(itemId => {
                        if (!itemId) return;
                        const item = allProducts.find(p => p.id === itemId) || HARDWARE_DB.find(p => p.id === itemId);
                        if (item) base += (item as any).price || 0;
                    });
                    // Wait, let's stick to 1.06 as in the previous file content I saw.
                    // Actually, I'll use 1.06 to be consistent with the other parts of the app.
                    const finalPrice = Math.floor(base * 1.06);

                    return (
                        <div
                            key={cfg.id}
                            onClick={() => setSelectedConfigId(cfg.id)}
                            className="group relative bg-white rounded-2xl border border-slate-200 hover:border-slate-300 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.06)] hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 cursor-pointer overflow-hidden flex flex-col ripple h-[320px]"
                        >
                            {/* Corner Badge (Top Left) */}
                            <div className={`absolute top-4 left-4 z-10 px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide uppercase border shadow-sm ${theme.style}`}>
                                {theme.label}
                            </div>

                            {/* Serial Number + VIP Badge (Top Right) */}
                            <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5">
                                {isUserVip(cfg) && (
                                    <span className="flex items-center gap-0.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                                        <Crown size={10} />
                                        VIP
                                    </span>
                                )}
                                <span className="font-mono text-[9px] text-slate-400 bg-slate-50/80 backdrop-blur-sm px-1.5 py-1 rounded border border-slate-200/60 shadow-sm">
                                    {cfg.serialNumber ? `NO.${cfg.serialNumber.split('-')[1]}` : `NO.${cfg.id.slice(-3)}`}
                                </span>
                            </div>

                            {/* Card Header: Title Only */}
                            <div className="p-5 pb-0 pt-14 flex justify-between items-start gap-3">
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-base font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors">
                                        {cfg.title}
                                    </h3>
                                </div>
                            </div>

                            {/* Card Body: Specs List */}
                            <div className="p-5 flex-1 flex flex-col justify-center gap-3">
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 group-hover:bg-slate-50/80 transition-colors border border-slate-100/50">
                                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-400 shadow-sm border border-slate-100">
                                        <Cpu size={16} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[10px] uppercase text-slate-400 font-bold">处理器</div>
                                        <div className="text-xs font-bold text-slate-700 truncate" title={specs.cpu}>{specs.cpu}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 group-hover:bg-slate-50/80 transition-colors border border-slate-100/50">
                                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-400 shadow-sm border border-slate-100">
                                        <Zap size={16} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[10px] uppercase text-slate-400 font-bold">显卡</div>
                                        <div className="text-xs font-bold text-slate-700 truncate" title={specs.gpu}>{specs.gpu}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Card Footer: Price & Social */}
                            <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between bg-white group-hover:bg-slate-50/30 transition-colors">
                                <div className="flex items-center gap-2">
                                    <div className={`w-6 h-6 rounded-full ${cfg.avatarColor} flex items-center justify-center text-[10px] text-white font-bold ring-2 ring-white shadow-sm`}>
                                        {cfg.author[0].toUpperCase()}
                                    </div>
                                    <div className="text-xs text-slate-500 font-medium">
                                        {cfg.likes} <span className="text-[10px]">赞</span>
                                    </div>
                                </div>
                                <div className="text-lg font-mono font-bold text-slate-900 tracking-tight">
                                    ¥{finalPrice.toLocaleString()}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {loading && (
                <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            )}

            {!loading && sortedConfigs.length === 0 && (
                <div className="text-center py-20">
                    <div className="text-slate-400 font-bold">未找到相关配置</div>
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
