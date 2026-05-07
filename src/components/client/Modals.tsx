
import React, { useState, useMemo, useRef } from 'react';
import { X, Share2, Save, Copy, Search, Cpu, Monitor, User, Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import { ConfigTemplate, BuildEntry, HardwareItem } from '../../types/clientTypes';
import { TAGS_APPEARANCE, TAGS_USAGE, ALL_SCENARIO_TAGS, CATEGORY_MAP, HARDWARE_DB } from '../../data/clientData';
import { storage } from '../../services/storage';

export function ShareFormModal({ onClose, onPublish }: { onClose: () => void, onPublish: (data: { title: string, tags: string[], desc: string, showcaseImages?: string[] }) => void }) {
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [images, setImages] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const toggleTag = (tag: string) => {
        setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        if (images.length + files.length > 9) return;

        setIsUploading(true);
        try {
            for (const file of files) {
                const res = await storage.uploadImage(file);
                if (res && res.url) {
                    setImages(prev => [...prev, res.url]);
                }
            }
        } catch (error) {
            console.error('Image upload failed:', error);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRemoveImage = (idx: number) => {
        setImages(prev => prev.filter((_, i) => i !== idx));
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/60 backdrop-blur-md">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg md:rounded-3xl rounded-t-[32px] shadow-2xl animate-slide-up md:animate-scale-up flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center px-6 pt-6 pb-4 shrink-0">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">分享配置单</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
                </div>

                <div className="px-6 pb-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">标题 *</label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" placeholder="例如：13600K 白色海景房作业" />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">外观风格 (多选)</label>
                        <div className="flex flex-wrap gap-2">
                            {TAGS_APPEARANCE.map(tag => (<button key={tag} onClick={() => toggleTag(tag)} className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${selectedTags.includes(tag) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500'}`}>{tag}</button>))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">主要用途 (多选)</label>
                        <div className="flex flex-wrap gap-2">
                            {TAGS_USAGE.map(tag => (<button key={tag} onClick={() => toggleTag(tag)} className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${selectedTags.includes(tag) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500'}`}>{tag}</button>))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">描述 (可选)</label>
                        <textarea value={desc} onChange={e => setDesc(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none h-24 resize-none" placeholder="分享一下你的装机心得或配置亮点..." />
                    </div>

                    {/* Showcase Image Upload (Optional) */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                                <ImageIcon size={14} className="text-indigo-500" />
                                晒单图片 (可选)
                            </label>
                            {images.length > 0 && <span className="text-[10px] text-slate-400">{images.length}/9</span>}
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                            {images.map((img, idx) => (
                                <div key={idx} className="aspect-square rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden relative group">
                                    <img src={img} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
                                    <button
                                        onClick={() => handleRemoveImage(idx)}
                                        className="absolute top-1 right-1 bg-black/50 hover:bg-red-500 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}

                            {images.length < 9 && (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    className="aspect-square rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 bg-slate-50 dark:bg-slate-800/50 flex flex-col items-center justify-center text-slate-400 hover:text-indigo-500 transition-all disabled:opacity-50"
                                >
                                    {isUploading ? (
                                        <Loader2 size={20} className="animate-spin text-indigo-500" />
                                    ) : (
                                        <>
                                            <Upload size={18} className="mb-1" />
                                            <span className="text-[9px] font-medium">上传</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageUpload}
                            multiple
                            accept="image/*"
                            className="hidden"
                        />
                        <p className="text-[10px] text-slate-400 mt-2">上传实机照片即可同步完成晒单，发布后自动进入审核流程。</p>
                    </div>
                </div>

                <div className="px-6 pb-6 pt-2 shrink-0 border-t border-slate-100 dark:border-slate-800">
                    <button onClick={() => onPublish({ title, tags: selectedTags, desc, showcaseImages: images.length > 0 ? images : undefined })} disabled={!title.trim() || isUploading} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 dark:disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-200 dark:shadow-none flex justify-center items-center gap-2 tap-active">
                        <Share2 size={18} /> {images.length > 0 ? '发布并提交晒单' : '发布到配置广场'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export function SavePreviewModal({ buildList, pricing, onClose, onCopy, onSave }: { buildList: BuildEntry[], pricing: any, onClose: () => void, onCopy: (text: string) => void, onSave?: () => void }) {
    const generateText = () => {
        const today = new Date().toLocaleDateString();
        const validItems = buildList.filter(e => e.item || e.customName);
        const itemsText = validItems.map(e => {
            const name = e.item ? `${e.item.brand} ${e.item.model}` : e.customName;
            const price = e.customPrice ?? e.item?.price ?? 0;
            return `【${CATEGORY_MAP[e.category]}】${name} x${e.quantity}（¥${price}）`;
        }).join('\n');
        const standardPrice = Math.floor(pricing.standardPrice);
        const finalPrice = pricing.finalPrice;
        const savedAmount = pricing.savedAmount;
        const priceLine = savedAmount > 0
            ? `**💰 总价：¥${standardPrice}，优惠后 ¥${finalPrice}**`
            : `**💰 总价：¥${finalPrice}**`;
        return `📋 小鱼装机单（${today}）\n🌐 在线配置：diyxx.com\n━━━━━━━━━━━━━━━━━━━━\n${itemsText}\n━━━━━━━━━━━━━━━━━━━━\n✅ 装机 + 系统 + 调试 + 整机三年质保\n📦 含 ${((pricing.serviceFeeRate || 0.06) * 100).toFixed(0)}% 装机售后服务费，不包邮\n${priceLine}`;
    };
    return (
        <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/60 backdrop-blur-md">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md md:rounded-2xl rounded-t-[32px] p-6 shadow-2xl animate-slide-up md:animate-scale-up">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2"><Save size={20} /> 保存配置单</h3>
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl text-xs font-mono text-slate-600 dark:text-slate-300 mb-6 whitespace-pre-wrap border border-slate-200 dark:border-slate-700 max-h-[60vh] overflow-y-auto">
                    {generateText()}
                </div>
                <div className="flex flex-col-reverse md:flex-row gap-3">
                    <button onClick={onClose} className="w-full md:w-auto py-3 md:py-2.5 px-6 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">取消</button>
                    {onSave && (
                        <button onClick={onSave} className="flex-1 w-full md:w-auto py-3 md:py-2.5 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:border-indigo-500 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all flex items-center justify-center gap-2">
                            <User size={16} /> 保存到个人中心
                        </button>
                    )}
                    <button onClick={() => onCopy(generateText())} className="flex-1 w-full md:w-auto py-3 md:py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-none">
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
            <div className="bg-white dark:bg-slate-900 w-full max-w-5xl h-[90vh] md:h-[85vh] md:rounded-[24px] rounded-t-[32px] shadow-2xl overflow-hidden flex flex-col relative animate-slide-up md:animate-scale-up">

                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 z-10 shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">快速装机库</h2>
                        <p className="text-slate-500 text-sm mt-1">选择一个模板快速开始您的装机之旅</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Toolbar */}
                <div className="px-8 py-4 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-4 shrink-0">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="搜索配置单、CPU、显卡..."
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mask-linear-fade">
                        {['all', ...ALL_SCENARIO_TAGS].map((tag) => (
                            <button
                                key={tag}
                                onClick={() => setFilterTag(tag)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${filterTag === tag
                                    ? 'bg-slate-900 dark:bg-indigo-600 text-white border-slate-900 dark:border-indigo-600 shadow-md'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                            >
                                {tag === 'all' ? '全部场景' : tag}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Grid Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-950 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredConfigs.map(cfg => {
                            const sourceDB = products || HARDWARE_DB;
                            const cpuItem = typeof cfg.items?.cpu === 'object' && (cfg.items.cpu as any).isCustom ? { model: (cfg.items.cpu as any).name } : sourceDB.find(h => h.id === cfg.items?.cpu);
                            const gpuItem = typeof cfg.items?.gpu === 'object' && (cfg.items.gpu as any).isCustom ? { model: (cfg.items.gpu as any).name } : sourceDB.find(h => h.id === cfg.items?.gpu);
                            // Simpler names
                            const cpuName = cpuItem ? cpuItem.model.replace(/Intel Core |AMD Ryzen /i, '').replace(/ Processor/i, '') : 'CPU';
                            const gpuName = gpuItem ? gpuItem.model.replace(/NVIDIA GeForce |AMD Radeon /i, '').replace(/ Graphics/i, '') : '集成显卡';

                            return (
                                <div
                                    key={cfg.id}
                                    className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-600 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col overflow-hidden h-full"
                                    onClick={() => onSelectConfig(cfg)}
                                >
                                    {/* Card Header */}
                                    <div className="p-5 pb-0 flex justify-between items-start gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide uppercase ${cfg.type === 'official'
                                                    ? 'bg-black dark:bg-indigo-600 text-white'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                                                    {cfg.type === 'official' ? '官方严选' : '用户分享'}
                                                </span>
                                                {cfg.views > 100 && (
                                                    <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                        🔥 热度 {cfg.views}
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug line-clamp-2 group-hover:text-indigo-600 transition-colors">
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


