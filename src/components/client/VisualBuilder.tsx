
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
    if (!active) return null;
    return (
        <div
            className="fixed pointer-events-none z-50 transition-all duration-300 ease-out flex items-start -ml-3 -mt-3"
            style={{
                left: x,
                top: y,
                opacity: active ? 1 : 0
            }}
        >
            <div className="relative">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-xl text-black fill-black">
                    <path d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z" fill="currentColor" stroke="white" strokeWidth="1" />
                </svg>
                {status && (
                    <div className="absolute left-6 top-0 bg-black/80 backdrop-blur text-white text-[10px] px-2 py-1 rounded-md whitespace-nowrap animate-fade-in font-medium tracking-wide border border-white/20">
                        {status}
                    </div>
                )}
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
        let items = modalItems.filter(i =>
            i.category === modalCategory &&
            (modalBrand === 'all' || i.brand === modalBrand) &&
            (() => {
                const searchStr = modalSearch.toLowerCase().trim();
                if (!searchStr) return true;
                const searchTerms = searchStr.split(/\s+/);
                const searchableText = `${i.brand} ${i.model} ${CATEGORY_MAP[i.category] || i.category}`.toLowerCase();
                return searchTerms.every(term => searchableText.includes(term));
            })()
        );

        if (sortOrder === 'asc') {
            items.sort((a, b) => a.price - b.price);
        } else if (sortOrder === 'desc') {
            items.sort((a, b) => b.price - a.price);
        }

        return items;
    }, [modalCategory, modalBrand, modalSearch, modalItems, sortOrder]);

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
            <div className="lg:hidden flex flex-col bg-slate-50 min-h-screen">
                {/* Premium Mobile Header: Functional Buttons */}
                <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 p-3 flex gap-2 shadow-sm">
                    <button
                        onClick={() => { if (onAiCheck && !onAiCheck()) return; setShowAiModal(true); }}
                        className="flex-1 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 font-bold py-2.5 px-4 rounded-2xl shadow-lg shadow-orange-200/50 active:scale-95 transition-all flex items-center justify-center gap-2 border border-amber-300"
                    >
                        <Sparkles size={16} className="animate-pulse" /> 智能装机 (AI)
                    </button>
                    <button
                        onClick={onOpenLibrary}
                        className="flex-1 bg-white hover:bg-slate-50 text-slate-700 font-bold py-2.5 px-4 rounded-2xl border border-slate-200 shadow-sm active:scale-95 transition-all text-sm"
                    >
                        推荐方案
                    </button>
                </div>

                {/* Elegant Mobile List Items */}
                <div className="p-2 space-y-1 pb-20">
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
            <div className="hidden lg:flex flex-1 flex-col space-y-2 pb-20">
                {buildList.map((entry) => (
                    <div
                        key={entry.id}
                        ref={(el) => { if (el) rowRefs[entry.id] = el; }}
                        onClick={() => openSelector(entry)}
                        className={`relative rounded-3xl p-3 border transition-all duration-300 cursor-pointer group flex items-center gap-4 ${entry.item || entry.customName
                            ? 'bg-gradient-to-r from-white to-slate-50/80 border-slate-200/60 shadow-md hover:shadow-xl hover:border-indigo-300 hover:-translate-y-1'
                            : 'bg-white/60 backdrop-blur-sm border-dashed border-slate-300 hover:bg-white hover:border-indigo-400 hover:shadow-md hover:-translate-y-0.5'
                            }`}
                    >
                        <div className={`w-12 h-12 rounded-[18px] flex items-center justify-center text-2xl shrink-0 transition-all duration-500 shadow-sm ${entry.item ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-indigo-200/50 group-hover:shadow-indigo-300 group-hover:scale-105' : 'bg-slate-100/80 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-400 group-hover:scale-105'}`}>
                            {getIconByCategory(entry.category)}
                        </div>
                        <div className={`text-sm font-extrabold w-12 ${entry.item ? 'text-indigo-900' : 'text-slate-400 group-hover:text-slate-600 transition-colors'}`}>{CATEGORY_MAP[entry.category]}</div>

                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                            {entry.category === 'accessory' ? (
                                <input
                                    type="text"
                                    className="w-full bg-transparent border-none p-0 text-slate-800 font-bold placeholder-slate-400 focus:ring-0 truncate"
                                    placeholder="输入配件名称..."
                                    value={entry.customName || ''}
                                    onChange={(e) => onUpdate(entry.id, { customName: e.target.value })}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            ) : entry.item ? (
                                <div>
                                    <div className="font-extrabold text-slate-800 text-base lg:text-lg group-hover:text-indigo-600 transition-colors tracking-tight truncate">{entry.item.brand} {entry.item.model}</div>
                                </div>
                            ) : entry.category === aiActiveCategory ? (
                                <div className="text-indigo-500 font-medium flex items-center gap-2 animate-pulse">
                                    <Sparkles size={14} className="animate-spin-slow" />
                                    AI 正在挑选...
                                </div>
                            ) : (
                                <div className="text-slate-400 font-medium">选择 {CATEGORY_MAP[entry.category]}</div>
                            )}
                        </div>
                        <div className="flex items-center gap-2 md:gap-8 md:w-48 justify-end shrink-0">
                            <div className="hidden md:flex w-20 justify-center" onClick={e => e.stopPropagation()}>
                                {entry.category === 'accessory' ? null : (
                                    !entry.isLockedQty ? (
                                        <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                                            <button onClick={() => onUpdate(entry.id, { quantity: Math.max(1, entry.quantity - 1) })} className="w-6 h-6 flex items-center justify-center hover:bg-white rounded text-slate-500 font-bold transition-all">-</button>
                                            <span className="w-6 text-center text-xs font-bold text-slate-700">{entry.quantity}</span>
                                            <button onClick={() => onUpdate(entry.id, { quantity: entry.quantity + 1 })} className="w-6 h-6 flex items-center justify-center hover:bg-white rounded text-slate-500 font-bold transition-all">+</button>
                                        </div>
                                    ) : (
                                        (entry.item || entry.customName) && <span className="text-xs text-slate-300 font-medium">x 1</span>
                                    )
                                )}
                            </div>
                            <div className="w-auto md:w-20 text-right font-black text-slate-800 text-base md:text-xl tracking-tight">
                                {entry.item || entry.customName ? `¥${entry.customPrice ?? entry.item?.price ?? 0}` : <span className="text-slate-300 font-medium">-</span>}
                            </div>
                        </div>
                        {(entry.item || (entry.category === 'accessory' && entry.customName)) && (
                            <button
                                className="absolute -top-2 -right-2 p-1.5 bg-white text-slate-300 hover:text-red-500 hover:bg-red-50 border border-slate-100 rounded-full transition-all opacity-0 group-hover:opacity-100 shadow-sm"
                                onClick={(e) => { e.stopPropagation(); onUpdate(entry.id, { item: null, customName: '', customPrice: undefined, quantity: 1 }); }}
                            >
                                <X size={14} strokeWidth={3} />
                            </button>
                        )}
                    </div>
                ))}

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
                <div className="bg-white/90 backdrop-blur-2xl rounded-[32px] border border-white/60 shadow-2xl shadow-indigo-100/50 flex flex-col relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

                    <div className="p-6 md:p-8 flex flex-col gap-8 relative z-10">
                        {/* Box 1: AI & Quick Build (Hidden on Mobile as it's in the list header) */}
                        <div className="hidden lg:flex flex-col gap-5">
                            <div onClick={() => {
                                if (onAiCheck && !onAiCheck()) return;
                                setShowAiModal(true);
                            }} className="group relative w-full cursor-pointer transition-all hover:-translate-y-1">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 rounded-3xl blur opacity-15 group-hover:opacity-30 transition duration-500"></div>
                                <div className="relative flex items-center gap-4 bg-white/90 backdrop-blur-sm rounded-[22px] p-5 border border-indigo-100/80 shadow-lg shadow-indigo-100/50 overflow-hidden">
                                    <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:20px_20px] [mask-image:radial-gradient(ellipse_at_center,black_70%,transparent_100%)] pointer-events-none"></div>
                                    <div className="relative z-10 w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-200 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                                        <Sparkles size={24} className="drop-shadow-sm animate-pulse-slow" />
                                    </div>
                                    <div className="relative z-10 flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-extrabold text-lg text-slate-900 tracking-tight">AI 智能装机</h3>
                                            <span className="text-[10px] font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-1.5 py-0.5 rounded shadow-sm shadow-indigo-200">体验版</span>
                                        </div>
                                        <p className="text-slate-500 text-xs font-medium group-hover:text-indigo-600 transition-colors leading-relaxed">
                                            智能语义分析，一键生成配置
                                        </p>
                                    </div>
                                    <div className="relative z-10 w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-600 transition-all duration-300 transform group-hover:translate-x-1 shadow-sm">
                                        <ArrowRight size={14} className="text-indigo-600 group-hover:text-white" />
                                    </div>
                                </div>
                            </div>

                            <div onClick={onOpenLibrary} className="bg-slate-50/80 hover:bg-indigo-50/50 rounded-[20px] p-4 border border-slate-100 cursor-pointer group hover:border-indigo-200 transition-all flex items-center gap-4">
                                <div className="w-10 h-10 bg-white shadow-sm text-indigo-500 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110">
                                    <FileText size={18} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-extrabold text-slate-800 text-[15px]">快速装机</h3>
                                        <ArrowRight className="text-slate-300 group-hover:text-indigo-500 transition-colors" size={16} />
                                    </div>
                                    <p className="text-slate-500 text-xs mt-0.5 font-medium">浏览精选配置，一键引用。</p>
                                </div>
                            </div>
                        </div>

                        <div className="hidden lg:block h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>

                        {/* Box 2: Price Details (Hidden on Mobile) */}
                        <div className="hidden lg:block">
                            <h3 className="font-extrabold text-slate-800 mb-5 flex items-center gap-2"><CreditCard size={18} className="text-indigo-500" /> 价格明细</h3>
                            <div className="space-y-4 mb-6">
                                <div className="flex justify-between items-center text-sm font-medium">
                                    <span className="text-slate-500">基础总价 <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-400 ml-1">含6%服务费</span></span>
                                    <span className="font-black text-slate-700">¥{pricing.totalHardware}</span>
                                </div>
                                {pricing.savedAmount > 0 && (<div className="flex justify-between text-emerald-600 font-bold text-sm bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100/50"><span>已优惠</span><span>- ¥{pricing.savedAmount}</span></div>)}
                                <div className="flex justify-between items-end bg-slate-50 rounded-2xl border border-slate-100 p-4 shadow-inner">
                                    <span className="text-slate-600 font-extrabold text-sm mb-1">预估到手价</span>
                                    <span className="text-4xl font-black text-indigo-600 tracking-tight">¥{pricing.finalPrice}</span>
                                </div>
                            </div>

                            <div className="relative mb-6 group">
                                <select
                                    value={pricing.discountRate}
                                    onChange={(e) => pricing.onDiscountChange?.(parseFloat(e.target.value))}
                                    className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all cursor-pointer hover:border-indigo-300"
                                >
                                    {pricing.discountTiers?.map((tier: any) => (
                                        <option key={tier.id} value={tier.multiplier}>
                                            {tier.name.replace(/\s*\(.*?\)/g, '')}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-indigo-500 transition-colors" size={18} />
                            </div>

                            <div className="flex flex-wrap gap-2 mb-6">
                                <button onClick={onSave} className="flex-1 bg-slate-900 shadow-xl shadow-slate-200 text-white font-bold py-3.5 px-4 rounded-[22px] active:scale-95 hover:bg-black transition-all flex items-center justify-center gap-2 border border-white/10 group">
                                    <FileText size={18} className="group-hover:translate-x-0.5 transition-transform" /> 保存配置
                                </button>
                                <button onClick={onShare} className="flex-1 bg-white border border-slate-200 shadow-sm text-slate-700 font-bold py-3.5 px-4 rounded-[22px] active:scale-95 hover:bg-slate-50 transition-all flex items-center justify-center gap-2 group">
                                    <Share2 size={18} className="group-hover:rotate-12 transition-transform text-indigo-500" /> 分享配置
                                </button>
                                <button onClick={onReset} className="bg-rose-50 border border-rose-100 text-rose-500 font-bold p-3.5 rounded-[22px] active:scale-95 hover:bg-rose-100 transition-all group">
                                    <X size={18} className="group-hover:rotate-90 transition-transform" />
                                </button>
                            </div>
                        </div>

                        {/* Premium Announcements and Health */}
                        <div className="space-y-6 mt-2">
                            <div className="relative p-6 rounded-[30px] bg-gradient-to-br from-white to-slate-50/50 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
                                <h3 className="font-extrabold text-slate-900 mb-5 flex items-center gap-2.5 text-base tracking-tight">
                                    <div className="w-8 h-8 rounded-xl bg-sky-50 flex items-center justify-center">
                                        <FileText size={16} className="text-sky-500" />
                                    </div>
                                    系统公告
                                </h3>

                                <div className="space-y-3 relative z-10">
                                    {sysAnnouncement?.items && sysAnnouncement.items.length > 0 ? (
                                        sysAnnouncement.items.map((item: any) => (
                                            <div key={item.id} className={`group w-full border rounded-2xl p-4 transition-all hover:translate-x-1 ${item.type === 'warning' ? 'bg-red-50/40 text-red-900 border-red-100/60' :
                                                item.type === 'promo' ? 'bg-amber-50/40 text-amber-900 border-amber-100/60' :
                                                    'bg-white text-slate-900 border-slate-100 group-hover:border-sky-100 shadow-sm'
                                                }`}>
                                                <div className="flex gap-3">
                                                    <div className="shrink-0 text-base">
                                                        {item.pinned && <span className="mr-1 shadow-sm">📌</span>}
                                                        {item.type === 'warning' ? '⚠️' : item.type === 'promo' ? '🎉' : '📢'}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-[13px] leading-relaxed text-slate-600 font-medium whitespace-pre-wrap">{item.content}</div>
                                                        {item.linkUrl && (
                                                            <a href={item.linkUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-indigo-500 hover:text-indigo-700 mt-2 inline-flex items-center gap-1 font-black uppercase tracking-wider">
                                                                更多详情 <ArrowRight size={10} />
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="w-full bg-slate-50/50 border border-slate-100 border-dashed rounded-2xl p-6 text-center text-slate-400 font-medium italic text-[13px]">
                                            {sysAnnouncement?.content || '暂无发布公告'}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className={`relative p-6 rounded-[30px] border transition-all duration-500 ${health.status === 'perfect'
                                ? 'bg-gradient-to-br from-emerald-50/50 to-white border-emerald-100/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)]'
                                : 'bg-gradient-to-br from-amber-50/50 to-white border-amber-100/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)]'
                                }`}>
                                <div className="flex items-center justify-between mb-5">
                                    <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2.5 tracking-tight">
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${health.status === 'perfect' ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                                            <Zap size={16} className={health.status === 'perfect' ? 'text-emerald-500' : 'text-amber-500'} />
                                        </div>
                                        兼容性实验室检测
                                    </h3>
                                    {health.status === 'perfect' ? (
                                        <div className="px-3 py-1 rounded-full bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20">Passed</div>
                                    ) : (
                                        <div className="px-3 py-1 rounded-full bg-amber-500 text-white text-[9px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20 animate-pulse">Review</div>
                                    )}
                                </div>
                                <div className="relative z-10">
                                    {health.status === 'perfect' ? (
                                        <div className="text-[13px] text-emerald-700 font-bold flex items-center gap-3 bg-white/60 border border-emerald-100/50 px-4 py-3 rounded-2xl shadow-sm">
                                            <CheckCircle2 size={16} className="text-emerald-500" />
                                            <span className="leading-none">核心算法检测通过：配置完美兼容</span>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {health.issues.map((issue: string, idx: number) => (
                                                <div key={idx} className="group text-[13px] text-amber-800 font-bold bg-white/60 border border-amber-100/50 p-4 rounded-2xl flex gap-3 shadow-sm hover:translate-x-1 transition-transform">
                                                    <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                                                    <div className="leading-relaxed">{issue}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
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
                                                    className={`group relative flex items-center gap-5 p-4 rounded-[28px] bg-white border border-slate-100/80 transition-all duration-300 active:scale-[0.98] ${isOutOfStock
                                                        ? 'opacity-50 grayscale cursor-not-allowed'
                                                        : 'hover:border-indigo-100 hover:shadow-[0_12px_40px_rgba(79,70,229,0.06)] cursor-pointer'
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
                                                            {Object.entries(item.specs).slice(0, 2).map(([key, val]) => (
                                                                <div key={key} className="flex items-center gap-1">
                                                                    <div className="w-1 h-1 rounded-full bg-slate-200"></div>
                                                                    <span className="truncate max-w-[120px]">{val}</span>
                                                                </div>
                                                            ))}
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
                </div>
            )}

            {showAiModal && <AiGenerateModal key="ai-modal" onClose={() => setShowAiModal(false)} onSubmit={handleAiBuild} />}
        </div>
    );
}

export default VisualBuilder;
