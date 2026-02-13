
import { useState, useMemo } from 'react';
import { X, Share2, Save, Copy, Search, Cpu, Monitor, User, Heart, CheckCircle2 } from 'lucide-react';
import { ConfigTemplate, BuildEntry, Category, HardwareItem } from '../../types/clientTypes';
import { TAGS_APPEARANCE, TAGS_USAGE, ALL_SCENARIO_TAGS, CATEGORY_MAP, HARDWARE_DB } from '../../data/clientData';

export function ShareFormModal({ onClose, onPublish }: { onClose: () => void, onPublish: (data: { title: string, tags: string[], desc: string }) => void }) {
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

    const toggleTag = (tag: string) => {
        setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/60 backdrop-blur-md">
            <div className="bg-white w-full max-w-lg md:rounded-3xl rounded-t-[32px] p-6 shadow-2xl animate-slide-up md:animate-scale-up">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-800">分享配置单</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">标题 *</label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" placeholder="例如：13600K 白色海景房作业" />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">外观风格 (多选)</label>
                        <div className="flex flex-wrap gap-2">
                            {TAGS_APPEARANCE.map(tag => (<button key={tag} onClick={() => toggleTag(tag)} className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${selectedTags.includes(tag) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}>{tag}</button>))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">主要用途 (多选)</label>
                        <div className="flex flex-wrap gap-2">
                            {TAGS_USAGE.map(tag => (<button key={tag} onClick={() => toggleTag(tag)} className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${selectedTags.includes(tag) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}>{tag}</button>))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">描述 (可选)</label>
                        <textarea value={desc} onChange={e => setDesc(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none h-24 resize-none" placeholder="分享一下你的装机心得或配置亮点..." />
                    </div>
                </div>

                <div className="mt-8">
                    <button onClick={() => onPublish({ title, tags: selectedTags, desc })} disabled={!title.trim()} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-200 flex justify-center items-center gap-2 tap-active">
                        <Share2 size={18} /> 发布到配置广场
                    </button>
                </div>
            </div>
        </div>
    );
}

export function SavePreviewModal({ buildList, pricing, onClose, onCopy, onSave }: { buildList: BuildEntry[], pricing: any, onClose: () => void, onCopy: (text: string) => void, onSave?: () => void }) {
    const generateText = () => {
        const today = new Date().toLocaleDateString();
        const validItems = buildList.filter(e => e.item || (e.category === 'accessory' && e.customName));
        const itemsText = validItems.map(e => {
            const name = e.item ? `${e.item.brand} ${e.item.model}` : e.customName;
            const price = e.customPrice ?? e.item?.price ?? 0;
            return `[${CATEGORY_MAP[e.category]}] ${name} x${e.quantity} (¥${price})`;
        }).join('\n');
        return `📋 小鱼装机单 (${today})\n--------------------------\n${itemsText}\n--------------------------\n💰 总价：¥${pricing.finalPrice}`;
    };
    return (
        <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/60 backdrop-blur-md">
            <div className="bg-white w-full max-w-md md:rounded-2xl rounded-t-[32px] p-6 shadow-2xl animate-slide-up md:animate-scale-up">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Save size={20} /> 保存配置单</h3>
                <div className="bg-slate-50 p-4 rounded-xl text-xs font-mono text-slate-600 mb-6 whitespace-pre-wrap border border-slate-200 max-h-[60vh] overflow-y-auto">
                    {generateText()}
                </div>
                <div className="flex flex-col-reverse md:flex-row gap-3">
                    <button onClick={onClose} className="w-full md:w-auto py-3 md:py-2.5 px-6 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">取消</button>
                    {onSave && (
                        <button onClick={onSave} className="flex-1 w-full md:w-auto py-3 md:py-2.5 bg-white border-2 border-slate-100 text-slate-700 font-bold rounded-xl hover:border-indigo-500 hover:text-indigo-600 transition-all flex items-center justify-center gap-2">
                            <User size={16} /> 保存到个人中心
                        </button>
                    )}
                    <button onClick={() => onCopy(generateText())} className="flex-1 w-full md:w-auto py-3 md:py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-200">
                        <Copy size={16} /> 一键复制
                    </button>
                </div>
            </div>
        </div>
    );
}

export function ConfigLibraryModal({ configList, products, onClose, onSelectConfig }: { configList: ConfigTemplate[], products?: HardwareItem[], onClose: () => void, onSelectConfig: (cfg: ConfigTemplate) => void }) {
    const [filterTag, setFilterTag] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredConfigs = useMemo(() => {
        const searchStr = searchQuery.toLowerCase().trim();
        return configList.filter(cfg => {
            if (searchStr) {
                const searchTerms = searchStr.split(/\s+/);
                const searchableText = `${cfg.title} ${cfg.author}`.toLowerCase();
                if (!searchTerms.every(term => searchableText.includes(term))) return false;
            }
            if (filterTag !== 'all' && !cfg.tags.some(t => t.label === filterTag)) return false;
            return true;
        });
    }, [filterTag, searchQuery, configList]);

    return (
        <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
            <div className="bg-white w-full max-w-5xl h-[90vh] md:h-[85vh] md:rounded-[24px] rounded-t-[32px] shadow-2xl overflow-hidden flex flex-col relative animate-slide-up md:animate-scale-up">

                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white z-10 shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">快速装机库</h2>
                        <p className="text-slate-500 text-sm mt-1">选择一个模板快速开始您的装机之旅</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Toolbar */}
                <div className="px-8 py-4 bg-slate-50/50 border-b border-slate-100 flex flex-col md:flex-row gap-4 shrink-0">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="搜索配置单、CPU、显卡..."
                            className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mask-linear-fade">
                        {['all', ...ALL_SCENARIO_TAGS].map((tag) => (
                            <button
                                key={tag}
                                onClick={() => setFilterTag(tag)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${filterTag === tag
                                    ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
                            >
                                {tag === 'all' ? '全部场景' : tag}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Grid Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredConfigs.map(cfg => {
                            const sourceDB = products || HARDWARE_DB;
                            const cpuItem = sourceDB.find(h => h.id === cfg.items?.cpu);
                            const gpuItem = sourceDB.find(h => h.id === cfg.items?.gpu);
                            // Simpler names
                            const cpuName = cpuItem ? cpuItem.model.replace(/Intel Core |AMD Ryzen /i, '').replace(/ Processor/i, '') : 'CPU';
                            const gpuName = gpuItem ? gpuItem.model.replace(/NVIDIA GeForce |AMD Radeon /i, '').replace(/ Graphics/i, '') : '集成显卡';

                            return (
                                <div
                                    key={cfg.id}
                                    className="group bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col overflow-hidden h-full"
                                    onClick={() => onSelectConfig(cfg)}
                                >
                                    {/* Card Header */}
                                    <div className="p-5 pb-0 flex justify-between items-start gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide uppercase ${cfg.type === 'official'
                                                    ? 'bg-black text-white'
                                                    : 'bg-slate-100 text-slate-500'}`}>
                                                    {cfg.type === 'official' ? '官方严选' : '用户分享'}
                                                </span>
                                                {cfg.views > 100 && (
                                                    <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                        🔥 热度 {cfg.views}
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="font-bold text-slate-900 text-base leading-snug line-clamp-2 group-hover:text-indigo-600 transition-colors">
                                                {cfg.title}
                                            </h3>
                                        </div>
                                    </div>

                                    {/* Specs List */}
                                    <div className="px-5 py-4 flex-1 flex flex-col gap-2">
                                        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100/50 group-hover:bg-indigo-50/30 group-hover:border-indigo-100/50 transition-colors">
                                            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                                                <Cpu size={16} className="group-hover:text-indigo-500 transition-colors" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[10px] font-bold text-slate-400 uppercase">核心处理器</div>
                                                <div className="text-xs font-bold text-slate-700 truncate">{cpuName}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100/50 group-hover:bg-indigo-50/30 group-hover:border-indigo-100/50 transition-colors">
                                            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                                                <Monitor size={16} className="group-hover:text-indigo-500 transition-colors" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[10px] font-bold text-slate-400 uppercase">图形显卡</div>
                                                <div className="text-xs font-bold text-slate-700 truncate">{gpuName}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-5 h-5 rounded-full ${cfg.avatarColor} flex items-center justify-center text-[9px] text-white font-bold ring-2 ring-white`}>
                                                {cfg.author[0].toUpperCase()}
                                            </div>
                                            <span className="text-xs font-bold text-slate-500 truncate max-w-[80px]">{cfg.author}</span>
                                        </div>
                                        <div className="text-base font-mono font-bold text-slate-900">
                                            ¥{cfg.price.toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {filteredConfigs.length === 0 && (
                            <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400">
                                <Search size={48} className="mb-4 text-slate-200" />
                                <p>未找到相关配置</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Additional Modal specific to VisualBuilder's selector could be here or inside VisualBuilder
// For now, I'll extract the ItemSelector Modal logic if needed, but it was embedded in VisualBuilder in the original code.
// Let's keep the ItemSelector inside VisualBuilder or make it separate if it's large.

export function ConfigDetailModal({
    config,
    onClose,
    onLoad,
    showToast,
    onToggleLike,
    currentUser
}: {
    config: ConfigTemplate,
    onClose: () => void,
    onLoad: (cfg: ConfigTemplate) => void,
    showToast: (msg: string) => void,
    onToggleLike: (id: string) => void,
    currentUser: any
}) {
    const isLiked = currentUser?.likes?.includes(config.id);
    const itemCount = Object.keys(config.items).length;

    const handleShare = () => {
        navigator.clipboard.writeText(JSON.stringify(config));
        showToast("🔗 配置已复制到剪贴板");
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center md:p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in" onClick={onClose}>
            <div
                className="relative bg-white w-full md:max-w-xl md:rounded-[32px] rounded-t-[32px] shadow-2xl animate-slide-up flex flex-col overflow-hidden"
                style={{ height: '85vh', maxHeight: '85vh' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="shrink-0 px-5 py-4 bg-white border-b border-slate-100 rounded-t-[32px]">
                    <div className="flex justify-between items-start mb-1">
                        <h2 className="text-lg md:text-xl font-bold text-slate-900 line-clamp-1 pr-10">{config.title}</h2>
                        <button onClick={onClose} className="absolute top-3 right-3 p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors">
                            <X size={18} className="text-slate-500" />
                        </button>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold text-slate-600">配置清单</span>
                        <span>•</span>
                        <span>共 {itemCount} 件</span>
                    </div>
                </div>

                {/* Content - Scrollable area */}
                <div className="flex-1 min-h-0 overflow-y-auto bg-slate-50 p-4 space-y-3 custom-scrollbar">
                    {Object.entries(config.items).map(([cat, itemId]) => {
                        const item = HARDWARE_DB.find(h => h.id === itemId);
                        if (!item) return null;
                        return (
                            <div key={cat} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0 border border-slate-100">
                                    {cat === 'cpu' ? <Cpu size={20} /> :
                                        cat === 'gpu' ? <Monitor size={20} /> :
                                            <span className="font-bold text-[10px]">{CATEGORY_MAP[cat as Category]?.slice(0, 2) || cat}</span>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="inline-block px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 text-[9px] font-bold mb-1">
                                        {CATEGORY_MAP[cat as Category] || cat}
                                    </div>
                                    <div className="text-sm font-bold text-slate-900 leading-snug line-clamp-1">
                                        {item.brand} {item.model}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer - Stays at bottom via flex */}
                <div className="shrink-0 p-4 bg-white border-t border-slate-100 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] flex items-center gap-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); onToggleLike(config.id); }}
                        className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-all ${isLiked ? 'bg-red-50 border-red-100 text-red-500' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}
                    >
                        <Heart size={18} fill={isLiked ? "currentColor" : "none"} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleShare(); }}
                        className="w-11 h-11 rounded-xl border border-slate-200 bg-white text-slate-400 hover:bg-slate-50 flex items-center justify-center transition-all"
                    >
                        <Share2 size={18} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onLoad(config); }}
                        className="flex-1 h-11 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 text-sm tap-active"
                    >
                        <CheckCircle2 size={18} />
                        <span>加载此配置</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
