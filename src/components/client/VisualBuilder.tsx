
import { useState, useMemo, useCallback, useEffect } from 'react';
import { ArrowRight, Zap, CreditCard, FileText, CheckCircle2, AlertCircle, X, Search, Sparkles, Share2, ChevronDown, ChevronUp } from 'lucide-react';
import { BuildEntry, HardwareItem, Category, SystemAnnouncementSettings } from '../../types/clientTypes';
import { CATEGORY_MAP } from '../../data/clientData';
import { storage } from '../../services/storage';
import { aiBuilder } from '../../services/aiBuilder';
import { getIconByCategory } from './Shared';
import { AiGenerateModal } from './AiGenerateModal';

// Mock "Ghost Cursor" component
function GhostCursor({ x, y, active, status }: { x: number, y: number, active: boolean, status: string }) {
    if (!active || !status) return null;
    return (
        <div
            className="fixed pointer-events-none z-50 transition-all duration-300 ease-out flex items-center justify-center -translate-x-1/2 -translate-y-1/2"
            style={{
                left: x,
                top: y,
                opacity: active ? 1 : 0
            }}
        >
            <div className="bg-indigo-600/95 backdrop-blur-md text-white text-[11px] px-3 py-1.5 rounded-full shadow-xl shadow-indigo-600/20 whitespace-nowrap animate-fade-in font-bold tracking-wide border border-indigo-400/30 flex items-center gap-1.5">
                <Sparkles size={12} className="animate-pulse" />
                {status}
            </div>
        </div>
    );
}

function VisualBuilder({
    buildList,
    onUpdate,
    health,
    onOpenLibrary,
    pricing,
    onAiCheck,
    openAiModal,
    onAiModalClose,
    onSave,
    onShare,
    onReset
}: {
    buildList: BuildEntry[],
    onUpdate: (id: string, d: Partial<BuildEntry>) => void,
    health: { status: string, issues: string[] },
    onOpenLibrary: () => void,
    pricing: any,
    onAiCheck?: () => boolean,
    openAiModal?: boolean,
    onAiModalClose?: () => void,
    onSave?: () => void,
    onShare?: () => void,
    onReset?: () => void
}) {
    const [modalCategory, setModalCategory] = useState<Category | null>(null);
    const [modalEntryId, setModalEntryId] = useState<string | null>(null);
    const [modalSearch, setModalSearch] = useState('');

    const [modalBrand, setModalBrand] = useState('all');
    const [sortOrder, setSortOrder] = useState<'default' | 'asc' | 'desc'>('default');
    const [isBrandsExpanded, setIsBrandsExpanded] = useState(false);
    const [showAiModal, setShowAiModal] = useState(false);

    // Category-specific items for the selector
    const [modalItems, setModalItems] = useState<HardwareItem[]>([]);
    const [isModalLoading, setIsModalLoading] = useState(false);

    // Handle external trigger for AI Modal
    useEffect(() => {
        if (openAiModal) {
            setShowAiModal(true);
            if (onAiModalClose) onAiModalClose();
        }
    }, [openAiModal, onAiModalClose]);
    const [aiActiveCategory, setAiActiveCategory] = useState<Category | null>(null);
    const [ghostPos, setGhostPos] = useState({ x: 0, y: 0 });
    const [ghostStatus, setGhostStatus] = useState('');
    const [isAiExecuting, setIsAiExecuting] = useState(false);
    const [aiResult, setAiResult] = useState<{ description: string } | null>(null);

    // Track row elements for ghost cursor target
    const rowRefs = useState<Record<string, HTMLDivElement | null>>({})[0];
    const modalSearchInputRef = useState<{ current: HTMLInputElement | null }>({ current: null })[0];
    const modalItemRefs = useState<Record<string, HTMLDivElement | null>>({})[0];

    const updateGhost = (el: HTMLElement | null, status: string = '') => {
        if (el) {
            const rect = el.getBoundingClientRect();
            const offsetX = rect.width / 2 + (Math.random() * 20 - 10);
            const offsetY = rect.height / 2 + (Math.random() * 10 - 5);
            setGhostPos({ x: rect.left + offsetX, y: rect.top + offsetY });
            setGhostStatus(status);
        }
    };


    const [sysAnnouncement, setSysAnnouncement] = useState<SystemAnnouncementSettings | null>(null);

    useEffect(() => {
        storage.getSystemAnnouncement().then(setSysAnnouncement);

        const handleUpdate = () => {
            storage.getSystemAnnouncement().then(setSysAnnouncement);
        };
        window.addEventListener('xiaoyu-announcement-update', handleUpdate);
        return () => window.removeEventListener('xiaoyu-announcement-update', handleUpdate);
    }, []);

    const openSelector = async (entry: BuildEntry) => {
        setModalCategory(entry.category);
        setModalEntryId(entry.id);
        setModalSearch('');
        setModalBrand('all');
        setSortOrder('default');
        setIsBrandsExpanded(false);

        // Fetch items for this specific category
        setIsModalLoading(true);
        try {
            const res = await storage.getProducts(1, 200, entry.category);
            setModalItems(res.items);
        } catch (e) {
            console.error('Failed to load category products', e);
            setModalItems([]);
        } finally {
            setIsModalLoading(false);
        }
    };

    const handleSelect = (item: HardwareItem) => {
        if (modalEntryId) {
            onUpdate(modalEntryId, { item, customPrice: undefined, customName: undefined });
            setModalCategory(null);
            setModalEntryId(null);
        }
    };

    const handleAiBuild = useCallback(async (prompt: string, preCalculatedResult?: any) => {
        try {
            let result = preCalculatedResult;

            if (!result) {
                const request = aiBuilder.parseRequest(prompt);
                result = aiBuilder.generateBuildWithLogs(request);
            }

            setShowAiModal(false);
            setIsAiExecuting(true);

            setGhostPos({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
            setGhostStatus('AI 介入中...');
            await new Promise(r => setTimeout(r, 400));

            for (const entry of buildList) {
                const cat = entry.category;
                const targetItem = result.items[cat as keyof typeof result.items];

                if (targetItem) {
                    const rowEl = rowRefs[entry.id];

                    if (rowEl) {
                        updateGhost(rowEl, `正在规划 ${CATEGORY_MAP[entry.category]}...`);
                        await new Promise(r => setTimeout(r, 300));

                        openSelector(entry);
                        await new Promise(r => setTimeout(r, 800)); // Increased wait for category fetch

                        const searchEl = modalSearchInputRef.current;
                        if (searchEl) {
                            updateGhost(searchEl, '搜索型号中...');
                            await new Promise(r => setTimeout(r, 200));

                            const searchTerm = targetItem.model.split(' ')[0];
                            for (let i = 0; i < searchTerm.length; i++) {
                                setModalSearch(prev => prev + searchTerm[i]);
                                await new Promise(r => setTimeout(r, 40));
                            }
                            await new Promise(r => setTimeout(r, 300));
                        }

                        await new Promise(r => setTimeout(r, 200));

                        const itemEl = modalItemRefs[targetItem.id];
                        if (itemEl) {
                            updateGhost(itemEl, '目标锁定');
                            await new Promise(r => setTimeout(r, 300));

                            onUpdate(entry.id, { item: targetItem, customPrice: undefined, customName: undefined });

                            setModalCategory(null);
                            setModalEntryId(null);

                            setGhostStatus('已确认');
                            await new Promise(r => setTimeout(r, 200));
                        } else {
                            onUpdate(entry.id, { item: targetItem, customPrice: undefined, customName: undefined });
                            setModalCategory(null);
                            await new Promise(r => setTimeout(r, 100));
                        }

                        setModalSearch('');

                    } else {
                        onUpdate(entry.id, { item: targetItem, customPrice: undefined, customName: undefined });
                    }
                }
            }

            setAiActiveCategory(null);
            setGhostStatus('配置清单已生成');
            await new Promise(r => setTimeout(r, 600));
            setIsAiExecuting(false);
            setAiResult({ description: result.description });

        } catch (error) {
            console.error("AI Generation Failed:", error);
            setShowAiModal(false);
            setAiActiveCategory(null);
            setIsAiExecuting(false);
            alert("AI 生成失败，请重试");
        }
    }, [buildList, onUpdate, rowRefs, modalSearchInputRef, modalItemRefs]);

    const filteredItems = useMemo(() => {
        if (!modalCategory) return [];

        const searchStr = modalSearch.toLowerCase().trim();
        const searchTerms = searchStr ? searchStr.split(/\s+/) : [];

        let items = modalItems.filter(i =>
            i.category === modalCategory &&
            (modalBrand === 'all' || i.brand === modalBrand) &&
            (() => {
                if (!searchStr) return true;
                const searchableText = `${i.brand} ${i.model} ${CATEGORY_MAP[i.category] || i.category}`.toLowerCase();
                return searchTerms.every(term => searchableText.includes(term));
            })()
        );

        // 核心排序逻辑
        items.sort((a, b) => {
            // 1. 价格为 0 的排在最后（不论那种排序模式）
            if (a.price === 0 && b.price !== 0) return 1;
            if (a.price !== 0 && b.price === 0) return -1;

            if (sortOrder === 'asc') {
                return a.price - b.price;
            } else if (sortOrder === 'desc') {
                return b.price - a.price;
            } else {
                // 默认排序：推荐/折扣 置顶
                const aIsSpecial = a.isRecommended || a.isDiscount;
                const bIsSpecial = b.isRecommended || b.isDiscount;
                if (aIsSpecial && !bIsSpecial) return -1;
                if (!aIsSpecial && bIsSpecial) return 1;
                return a.price - b.price; // 特殊标签内也按价格升序
            }
        });

        return items;
    }, [modalCategory, modalItems, modalBrand, modalSearch, sortOrder]);

    const availableBrands = useMemo(() => {
        if (!modalCategory) return [];
        const brands = new Set(modalItems.filter(i => i.category === modalCategory).map(i => i.brand));
        return ['all', ...Array.from(brands)];
    }, [modalCategory, modalItems]);

    const [previewImage, setPreviewImage] = useState<string | null>(null);

    return (
        <div className="flex flex-col lg:flex-row gap-8 relative">
            {/* Image Preview Modal */}
            {previewImage && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setPreviewImage(null)}>
                    <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl p-2 shadow-2xl animate-scale-up">
                        <img src={previewImage} alt="Preview" className="w-full h-full object-contain rounded-xl max-h-[85vh]" />
                        <button className="absolute -top-4 -right-4 bg-white rounded-full p-2 text-slate-800 shadow-lg hover:text-red-500 transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                </div>
            )}

            <GhostCursor x={ghostPos.x} y={ghostPos.y} active={isAiExecuting} status={ghostStatus} />

            {/* Mobile Column View (Compact & Premium) */}
            <div className="lg:hidden flex flex-col bg-slate-50/50 relative">
                {/* Premium Mobile Header: Functional Buttons */}
                <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-3xl border-b border-slate-100 p-2.5 pb-3 shadow-[0_4px_30px_rgba(0,0,0,0.03)]">
                    <div className="flex gap-2.5 relative w-full items-center justify-between">
                        {/* 智能装机 PRO AI Button */}
                        <button
                            onClick={() => { if (onAiCheck && !onAiCheck()) return; setShowAiModal(true); }}
                            className="flex-[1.1] relative overflow-hidden bg-slate-900 border border-slate-800 text-white font-extrabold py-3.5 px-3 rounded-[20px] shadow-lg shadow-slate-900/15 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 text-[14px] tracking-wide group"
                        >
                            {/* Inner subtle glow */}
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 opacity-0 group-active:opacity-100 transition-opacity"></div>
                            <Sparkles size={16} className="text-indigo-400 animate-pulse shrink-0" />
                            <span className="flex items-center gap-1.5 whitespace-nowrap">智能装机 <span className="text-[10px] bg-white/15 px-1.5 py-0.5 rounded-lg flex items-center justify-center font-black">AI</span></span>
                        </button>

                        {/* Recommendation Button */}
                        <button
                            onClick={onOpenLibrary}
                            className="flex-[0.9] bg-white hover:bg-slate-50 text-slate-700 font-extrabold py-3.5 px-3 rounded-[20px] border-[1.5px] border-slate-200/80 shadow-sm shadow-slate-200/50 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 text-[14px] tracking-wide whitespace-nowrap"
                        >
                            <FileText size={16} className="text-slate-400" /> 推荐方案
                        </button>
                    </div>
                </div>

                {/* Elegant Mobile List Items */}
                <div className="p-2 space-y-1">
                    {buildList.map((entry) => (
                        <div
                            key={entry.id}
                            ref={(el) => { if (el) rowRefs[entry.id] = el; }}
                            onClick={() => openSelector(entry)}
                            className={`relative group bg-white rounded-xl border transition-all duration-300 active:scale-[0.98] flex items-center p-2 gap-2 ${entry.item || entry.customName
                                ? 'border-indigo-100 shadow-sm'
                                : 'border-slate-100 border-dashed bg-slate-50/50'
                                }`}
                        >
                            {/* Category Text Column */}
                            <div className="w-12 shrink-0">
                                <span className="text-[11px] font-black tracking-tight text-slate-400">
                                    {CATEGORY_MAP[entry.category]}
                                </span>
                            </div>

                            {/* Content Column */}
                            <div className="flex-1 min-w-0">
                                {entry.category === 'accessory' ? (
                                    <input
                                        type="text"
                                        className="w-full bg-transparent border-none p-0 text-[13px] text-slate-800 font-bold placeholder-slate-300 focus:ring-0 truncate"
                                        placeholder={`配件名称...`}
                                        value={entry.customName || ''}
                                        onChange={(e) => onUpdate(entry.id, { customName: e.target.value })}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                ) : entry.item ? (
                                    <div className="text-[13px] font-bold text-slate-700 truncate leading-tight tracking-tight">
                                        {entry.item.brand} {entry.item.model}
                                    </div>
                                ) : (
                                    <div className="text-[12px] text-slate-300 font-medium italic">未配备</div>
                                )}
                            </div>

                            {/* Price & Actions Column */}
                            <div className="flex items-center gap-2">
                                {(entry.item || entry.customName) && (
                                    <div className="text-[13px] font-black font-mono text-slate-900">
                                        ¥{(entry.customPrice ?? entry.item?.price ?? 0) * (entry.quantity || 1)}
                                    </div>
                                )}

                                <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                                    {entry.category === 'fan' && entry.item && (
                                        <div className="flex items-center bg-slate-50 rounded-lg p-0.5 border border-slate-100 scale-90 origin-right">
                                            <button onClick={() => onUpdate(entry.id, { quantity: Math.max(1, entry.quantity - 1) })} className="w-4 h-4 flex items-center justify-center hover:bg-white rounded text-slate-400 font-bold transition-all text-[10px]">-</button>
                                            <span className="w-4 text-center text-[10px] font-bold text-slate-600">{entry.quantity}</span>
                                            <button onClick={() => onUpdate(entry.id, { quantity: entry.quantity + 1 })} className="w-4 h-4 flex items-center justify-center hover:bg-white rounded text-slate-400 font-bold transition-all text-[10px]">+</button>
                                        </div>
                                    )}
                                    {(entry.item || entry.customName) && (
                                        <button
                                            className="w-5 h-5 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors"
                                            onClick={() => onUpdate(entry.id, { item: null, customName: '', customPrice: undefined, quantity: 1 })}
                                        >
                                            <X size={12} strokeWidth={3} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Desktop List View (Hidden on mobile) */}
            <div className="hidden lg:flex flex-1 flex-col pb-20">
                {/* Brand New Feature Header: AI & Quick Build */}
                <div className="flex gap-4 mb-6">
                    <div onClick={() => {
                        if (onAiCheck && !onAiCheck()) return;
                        setShowAiModal(true);
                    }} className="flex-1 group relative cursor-pointer transition-all duration-500 hover:-translate-y-1">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 rounded-[24px] blur-md opacity-20 group-hover:opacity-40 transition duration-500"></div>
                        <div className="relative flex items-center gap-4 bg-white/90 backdrop-blur-xl rounded-[20px] p-4 md:p-5 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                            <div className="w-12 h-12 rounded-[16px] bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 shadow-lg shadow-indigo-500/30">
                                <Sparkles size={22} className="animate-pulse" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2 mb-1">
                                    <h3 className="font-extrabold text-base text-slate-900 tracking-tight">AI 智能装机</h3>
                                    <span className="text-[9px] font-black bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-1.5 py-0.5 rounded uppercase tracking-wider shadow-sm">Pro</span>
                                </div>
                                <p className="text-slate-500 text-xs font-medium leading-none tracking-wide">智能语义分析，一挥而就</p>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                            </div>
                        </div>
                    </div>

                    <div onClick={onOpenLibrary} className="flex-1 group relative cursor-pointer transition-all duration-500 hover:-translate-y-1">
                        <div className="absolute -inset-0.5 bg-slate-200 rounded-[24px] blur-md opacity-0 group-hover:opacity-50 transition duration-500"></div>
                        <div className="relative flex items-center gap-4 bg-white/80 backdrop-blur-xl rounded-[20px] p-4 md:p-5 border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] group-hover:border-indigo-100 transition-all overflow-hidden">
                            <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-[16px] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-500 group-hover:bg-indigo-50 group-hover:text-indigo-600">
                                <FileText size={22} />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-extrabold text-slate-800 text-base mb-1 tracking-tight">快速装机</h3>
                                <p className="text-slate-500 text-xs font-medium leading-none tracking-wide">浏览社区精选优质配置单</p>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col space-y-2.5">
                    {buildList.map((entry) => (
                        <div
                            key={entry.id}
                            ref={(el) => { if (el) rowRefs[entry.id] = el; }}
                            onClick={() => openSelector(entry)}
                            className={`relative rounded-[20px] p-3 border transition-all duration-300 cursor-pointer group flex items-center gap-4 ${entry.item || entry.customName
                                ? 'bg-white/80 backdrop-blur-md border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(99,102,241,0.12)] hover:border-indigo-200/50 hover:-translate-y-0.5'
                                : 'bg-white/40 backdrop-blur-sm border-dashed border-slate-300/60 hover:bg-white hover:border-indigo-300 hover:shadow-sm'
                                }`}
                        >
                            <div className={`w-11 h-11 rounded-[16px] flex items-center justify-center text-xl shrink-0 transition-all duration-500 shadow-sm relative overflow-hidden ${entry.item ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white group-hover:scale-105 group-hover:shadow-indigo-500/25 group-hover:shadow-lg' : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-400'}`}>
                                {entry.item && <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>}
                                {getIconByCategory(entry.category)}
                            </div>
                            <div className={`text-[13px] font-black w-14 tracking-wider ${entry.item ? 'text-indigo-900' : 'text-slate-400 group-hover:text-slate-500'}`}>{CATEGORY_MAP[entry.category]}</div>

                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                {entry.category === 'accessory' ? (
                                    <input
                                        type="text"
                                        className="w-full bg-transparent border-none p-0 text-slate-800 font-extrabold placeholder-slate-300 focus:ring-0 truncate text-sm"
                                        placeholder="快捷输入附件..."
                                        value={entry.customName || ''}
                                        onChange={(e) => onUpdate(entry.id, { customName: e.target.value })}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                ) : entry.item ? (
                                    <div className="font-extrabold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors truncate tracking-tight">{entry.item.brand} {entry.item.model}</div>
                                ) : entry.category === aiActiveCategory ? (
                                    <div className="text-indigo-500 text-xs font-bold flex items-center gap-2 animate-pulse bg-indigo-50 w-max px-3 py-1.5 rounded-full">
                                        <Sparkles size={14} className="animate-spin-slow" />
                                        AI 正在为您挑选...
                                    </div>
                                ) : (
                                    <div className="text-slate-300/80 text-xs font-bold italic tracking-wide">未挑选 {CATEGORY_MAP[entry.category]}</div>
                                )}
                            </div>
                            <div className="flex items-center gap-4 w-40 justify-end shrink-0">
                                <div className="hidden md:flex" onClick={e => e.stopPropagation()}>
                                    {entry.category === 'accessory' ? null : (
                                        !entry.isLockedQty ? (
                                            <div className="flex items-center bg-slate-100/80 rounded-xl p-1 border border-slate-200/60 shadow-inner">
                                                <button onClick={() => onUpdate(entry.id, { quantity: Math.max(1, entry.quantity - 1) })} className="w-6 h-6 flex items-center justify-center hover:bg-white rounded-lg text-slate-500 font-black hover:shadow-sm transition-all">-</button>
                                                <span className="w-6 text-center text-xs font-black text-slate-700">{entry.quantity}</span>
                                                <button onClick={() => onUpdate(entry.id, { quantity: entry.quantity + 1 })} className="w-6 h-6 flex items-center justify-center hover:bg-white rounded-lg text-slate-500 font-black hover:shadow-sm transition-all">+</button>
                                            </div>
                                        ) : null
                                    )}
                                </div>
                                <div className="text-right font-black text-slate-900 text-sm font-mono tracking-tight">
                                    {entry.item || entry.customName ? `¥${(entry.customPrice ?? entry.item?.price ?? 0) * (entry.quantity || 1)}` : <span className="text-slate-200">-</span>}
                                </div>
                            </div>
                            {(entry.item || (entry.category === 'accessory' && entry.customName)) && (
                                <button
                                    className="absolute -top-1.5 -right-1.5 p-1 bg-white text-slate-200 hover:text-red-500 hover:bg-red-50 border border-slate-100 rounded-full transition-all opacity-0 group-hover:opacity-100 shadow-sm"
                                    onClick={(e) => { e.stopPropagation(); onUpdate(entry.id, { item: null, customName: '', customPrice: undefined, quantity: 1 }); }}
                                >
                                    <X size={10} strokeWidth={3} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {/* AI Analysis Report Card - Moved to Bottom & Enlarged */}
                {aiResult && (
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-3xl p-8 border border-indigo-100 relative overflow-hidden animate-fade-in mt-6 shadow-lg shadow-indigo-100/50">
                        <div className="relative z-10">
                            <div className="prose prose-indigo max-w-none">
                                <p className="text-slate-700 leading-loose text-base font-medium whitespace-pre-wrap">
                                    {aiResult.description}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {/* Merged Sidebar */}
            <div className="w-full lg:w-[380px] shrink-0">
                <div className="bg-white/90 backdrop-blur-2xl rounded-[32px] border border-white/60 shadow-2xl shadow-indigo-100/50 flex flex-col relative overflow-hidden mt-2 lg:mt-0 mb-28 lg:mb-0">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

                    <div className="p-4 md:p-8 flex flex-col gap-4 lg:gap-6 relative z-10">
                        {/* Box 0: Announcements (Newly Moved to Top) */}
                        <div className="relative p-6 rounded-[28px] bg-sky-50/30 border border-sky-100 shadow-sm overflow-hidden mb-2">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-3xl -mr-12 -mt-12"></div>
                            <h3 className="font-extrabold text-slate-900 mb-4 flex items-center gap-2 text-sm">
                                <FileText size={16} className="text-sky-500" />
                                系统公告
                            </h3>
                            <div className="space-y-3">
                                {sysAnnouncement?.items && sysAnnouncement.items.length > 0 ? (
                                    sysAnnouncement.items.map((item: any) => (
                                        <div key={item.id} className="text-[12px] leading-relaxed text-slate-600 bg-white border border-slate-100 p-3 rounded-xl shadow-sm">
                                            {item.content}
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-[12px] text-slate-400 italic py-2 text-center">{sysAnnouncement?.content || '暂无发布公告'}</div>
                                )}
                            </div>
                        </div>

                        {/* Box 2: Price Details (Hidden on Mobile) */}
                        <div className="hidden lg:block">
                            <h3 className="font-extrabold text-slate-800 mb-4 flex items-center gap-2 text-sm"><CreditCard size={18} className="text-indigo-500" /> 价格明细</h3>
                            <div className="space-y-3 mb-5">
                                <div className="flex justify-between items-center text-xs font-medium">
                                    <span className="text-slate-500">基础总价</span>
                                    <span className="font-black text-slate-700">¥{pricing.totalHardware}</span>
                                </div>
                                <div className="flex justify-between items-end bg-slate-50 rounded-2xl border border-slate-100 p-4 shadow-sm">
                                    <span className="text-slate-600 font-extrabold text-[13px] mb-1">实付预估</span>
                                    <span className="text-3xl font-black text-indigo-600 tracking-tight">¥{pricing.finalPrice}</span>
                                </div>
                            </div>

                            <div className="relative mb-5">
                                <select
                                    value={pricing.discountRate}
                                    onChange={(e) => pricing.onDiscountChange?.(parseFloat(e.target.value))}
                                    className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500/20 outline-none cursor-pointer"
                                >
                                    {pricing.discountTiers?.map((tier: any) => (
                                        <option key={tier.id} value={tier.multiplier}>
                                            {tier.name}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                            </div>

                            <div className="grid grid-cols-2 gap-2 mb-6">
                                <button onClick={onSave} className="bg-slate-900 text-white font-bold h-12 rounded-[18px] active:scale-95 transition-all flex items-center justify-center gap-2 text-sm">
                                    <FileText size={16} /> 保存
                                </button>
                                <button onClick={onShare} className="bg-white border border-slate-200 text-slate-700 font-bold h-12 rounded-[18px] active:scale-95 transition-all flex items-center justify-center gap-2 text-sm">
                                    <Share2 size={16} className="text-indigo-500" /> 分享
                                </button>
                                <button onClick={onReset} className="col-span-2 bg-rose-50 text-rose-500 font-bold h-10 rounded-[14px] active:scale-95 hover:bg-rose-100 transition-all flex items-center justify-center gap-2 text-xs border border-rose-100">
                                    <X size={14} /> 清空配置
                                </button>
                            </div>
                        </div>

                        {/* Health Check */}
                        <div className={`relative p-5 rounded-[28px] border transition-all duration-500 ${health.status === 'perfect'
                            ? 'bg-emerald-50/30 border-emerald-100/60'
                            : 'bg-amber-50/30 border-amber-100/60'
                            }`}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                                    <Zap size={16} className={health.status === 'perfect' ? 'text-emerald-500' : 'text-amber-500'} />
                                    兼容性检测
                                </h3>
                                {health.status === 'perfect' ? (
                                    <div className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[8px] font-black uppercase">Passed</div>
                                ) : (
                                    <div className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[8px] font-black uppercase">Review</div>
                                )}
                            </div>
                            <div className="text-[12px] font-bold">
                                {health.status === 'perfect' ? (
                                    <div className="text-emerald-700 flex items-center gap-2">
                                        <CheckCircle2 size={14} /> 核心组件完美兼容
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {health.issues.map((issue: string, idx: number) => (
                                            <div key={idx} className="flex gap-2 text-amber-800">
                                                <AlertCircle size={14} className="shrink-0 mt-0.5" /> <span>{issue}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Premium Modal Category Selector */}
            {modalCategory && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
                    <div className="bg-slate-50 rounded-[36px] w-full max-w-3xl h-[88vh] flex flex-col shadow-[0_32px_120px_rgba(0,0,0,0.5)] overflow-hidden animate-scale-up border border-white/20">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-200/60 flex flex-col gap-5 bg-white/80 backdrop-blur-xl sticky top-0 z-10">
                            <div className="flex justify-between items-center text-slate-900">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-200">
                                        {getIconByCategory(modalCategory)}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black tracking-tight leading-none">选择 {CATEGORY_MAP[modalCategory]}</h2>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">产品选择</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setModalCategory(null)}
                                    className="w-10 h-10 flex items-center justify-center bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all text-slate-400 hover:text-slate-900 active:scale-90"
                                >
                                    <X size={20} strokeWidth={2.5} />
                                </button>
                            </div>

                            <div className="flex flex-col gap-4">
                                <div className="flex gap-3 items-center">
                                    <div className="relative flex-1 group">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                        <input
                                            ref={(el) => modalSearchInputRef.current = el}
                                            type="text"
                                            value={modalSearch}
                                            onChange={(e) => setModalSearch(e.target.value)}
                                            placeholder={`在 ${CATEGORY_MAP[modalCategory]} 中搜寻方案...`}
                                            className="w-full bg-white border border-slate-200/60 rounded-[22px] py-3.5 pl-12 pr-4 text-sm font-bold placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all shadow-sm"
                                        />
                                    </div>
                                    <button
                                        onClick={() => setSortOrder(prev => prev === 'default' ? 'asc' : prev === 'asc' ? 'desc' : 'default')}
                                        className={`h-[52px] px-5 rounded-[22px] font-black text-xs flex items-center gap-2 transition-all shrink-0 active:scale-95 ${sortOrder !== 'default'
                                            ? 'bg-slate-900 text-white shadow-xl shadow-slate-200 border border-slate-800'
                                            : 'bg-white text-slate-500 border border-slate-200/60 shadow-sm hover:bg-slate-50'
                                            }`}
                                    >
                                        <ArrowRight size={16} className={`transition-transform duration-500 ${sortOrder === 'asc' ? '-rotate-90' : sortOrder === 'desc' ? 'rotate-90' : 'rotate-0'}`} />
                                        <span className="tracking-wider">
                                            {sortOrder === 'default' ? '价格排序' : sortOrder === 'asc' ? '价格最低' : '价格最高'}
                                        </span>
                                    </button>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className={`flex-1 flex gap-2 ${isBrandsExpanded ? 'flex-wrap' : 'overflow-x-auto no-scrollbar scroll-smooth'} items-center pb-2 px-1 mask-linear-fade`}>
                                        {availableBrands.map(brand => (
                                            <button
                                                key={brand}
                                                onClick={() => setModalBrand(brand)}
                                                className={`px-4 py-2 rounded-xl text-[11px] font-black tracking-wide whitespace-nowrap transition-all border shrink-0 tap-active uppercase ${modalBrand === brand
                                                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-100'
                                                    : 'bg-white text-slate-400 border-slate-200/60 hover:border-indigo-200 hover:text-slate-600'
                                                    }`}
                                            >
                                                {brand === 'all' ? '全部品牌' : brand}
                                            </button>
                                        ))}
                                    </div>
                                    {availableBrands.length > 5 && (
                                        <button
                                            onClick={() => setIsBrandsExpanded(!isBrandsExpanded)}
                                            className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all shrink-0 mt-0.5 shadow-sm border ${isBrandsExpanded ? 'bg-slate-100 text-slate-900 border-slate-200' : 'bg-white text-slate-400 border-slate-100'}`}
                                        >
                                            {isBrandsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Product List Content */}
                        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
                            <div className="grid gap-4">
                                {isModalLoading ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg mb-4 ring-1 ring-slate-100">
                                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-200 border-t-indigo-600"></div>
                                        </div>
                                        <p className="text-xs font-black uppercase tracking-widest text-slate-300">正在同步数据库...</p>
                                    </div>
                                ) : (
                                    <>
                                        {filteredItems.map(item => {
                                            const isOutOfStock = item.price === 0;
                                            return (
                                                <div
                                                    key={item.id}
                                                    ref={(el) => { if (el) modalItemRefs[item.id] = el; }}
                                                    onClick={() => !isOutOfStock && handleSelect(item)}
                                                    className={`group relative flex items-center gap-5 p-4 rounded-[28px] bg-white/60 backdrop-blur-md border border-white/60 shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all duration-300 active:scale-[0.98] ${isOutOfStock
                                                        ? 'opacity-50 grayscale cursor-not-allowed'
                                                        : 'hover:bg-white hover:border-indigo-100/80 hover:shadow-[0_12px_40px_rgba(79,70,229,0.08)] cursor-pointer hover:-translate-y-0.5'
                                                        }`}
                                                >
                                                    {/* Product Image Wrapper */}
                                                    <div className="w-20 h-20 bg-slate-50 rounded-[22px] flex items-center justify-center text-slate-200 group-hover:bg-indigo-50/50 group-hover:text-indigo-300 transition-all overflow-hidden border border-slate-100/60 shadow-inner shrink-0 relative">
                                                        {item.image ? (
                                                            <img
                                                                src={item.image}
                                                                alt={item.model}
                                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setPreviewImage(item.image!);
                                                                }}
                                                            />
                                                        ) : (
                                                            <div className="opacity-40">{getIconByCategory(modalCategory)}</div>
                                                        )}
                                                        {item.isRecommended && (
                                                            <div className="absolute top-0 left-0 bg-orange-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-br-lg shadow-sm">TOP</div>
                                                        )}
                                                    </div>

                                                    {/* Product Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1.5">
                                                            <span className="text-[9px] font-black uppercase text-indigo-500 tracking-widest bg-indigo-50 px-2 py-0.5 rounded-md">
                                                                {item.brand}
                                                            </span>
                                                            {isOutOfStock && <span className="text-[9px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded-md font-black uppercase">暂无现货</span>}
                                                            {item.isDiscount && <span className="text-[9px] bg-rose-500 text-white px-2 py-0.5 rounded-md font-black uppercase shadow-sm shadow-rose-200">特价</span>}
                                                            {item.createdAt && (new Date().getTime() - new Date(item.createdAt).getTime() < 30 * 24 * 60 * 60 * 1000) && (
                                                                <span className="text-[9px] bg-emerald-500 text-white px-2 py-0.5 rounded-md font-black uppercase shadow-sm shadow-emerald-200">新品</span>
                                                            )}
                                                        </div>
                                                        <h4 className="font-extrabold text-slate-900 text-[15px] group-hover:text-indigo-600 transition-colors leading-snug tracking-tight mb-2">
                                                            {item.model}
                                                        </h4>
                                                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-400 font-bold">
                                                            {(() => {
                                                                let specsObj = item.specs;
                                                                if (typeof specsObj === 'string') {
                                                                    try { specsObj = JSON.parse(specsObj); } catch { specsObj = {}; }
                                                                }
                                                                if (!specsObj || typeof specsObj !== 'object') specsObj = {};

                                                                const specEntries = Object.entries(specsObj).filter(([_, val]) => val && String(val).trim() !== '');
                                                                if (specEntries.length === 0) return null;

                                                                return specEntries.slice(0, 2).map(([key, val]) => (
                                                                    <div key={key} className="flex items-center gap-1">
                                                                        <div className="w-1 h-1 rounded-full bg-slate-200"></div>
                                                                        <span>{String(val)}</span>
                                                                    </div>
                                                                ));
                                                            })()}
                                                        </div>
                                                    </div>

                                                    {/* Price Tag */}
                                                    <div className="flex flex-col items-end gap-3 shrink-0 ml-2">
                                                        <div className={`font-black font-mono tracking-tighter transition-all ${isOutOfStock ? 'text-slate-300 text-base' : 'text-xl text-slate-900 italic group-hover:scale-105'}`}>
                                                            {isOutOfStock ? '—' : `¥${item.price}`}
                                                        </div>
                                                        {!isOutOfStock && (
                                                            <div className="w-8 h-8 rounded-xl bg-slate-50 group-hover:bg-slate-900 text-slate-300 group-hover:text-white flex items-center justify-center transition-all shadow-sm group-hover:shadow-lg group-hover:shadow-slate-200 border border-slate-100 group-hover:border-slate-800">
                                                                <ArrowRight size={16} />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {filteredItems.length === 0 && (
                                            <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                                                <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 opacity-50">
                                                    <Search size={32} strokeWidth={1.5} />
                                                </div>
                                                <p className="text-sm font-black uppercase tracking-widest italic">未找到匹配的产品</p>
                                                <button onClick={() => { setModalSearch(''); setModalBrand('all'); }} className="mt-4 text-xs font-bold text-indigo-500 hover:text-indigo-700 underline underline-offset-4">重置筛选条件</button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div >
            )
            }

            {showAiModal && <AiGenerateModal key="ai-modal" onClose={() => setShowAiModal(false)} onSubmit={handleAiBuild} />}
        </div >
    );
}

export default VisualBuilder;
