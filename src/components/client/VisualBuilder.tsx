
import { useState, useMemo, useCallback, useEffect } from 'react';
import { ArrowRight, CreditCard, FileText, CheckCircle2, AlertCircle, X, Search, Sparkles, Share2, ChevronDown, ChevronUp } from 'lucide-react';
import { BuildEntry, HardwareItem, Category, SystemAnnouncementSettings } from '../../types/clientTypes';
import { CATEGORY_MAP } from '../../data/clientData';
import { storage } from '../../services/storage';
import { aiBuilder } from '../../services/aiBuilder';
import { getIconByCategory } from './Shared';
import { AiGenerateModal } from './AiGenerateModal';

// Forced update for localization


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
    remark,
    // setRemark, // Unused after replacing with System Announcement
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
    remark: string,
    setRemark: (s: string) => void,
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
            // Add some random offset to make it look "organic"
            const offsetX = rect.width / 2 + (Math.random() * 20 - 10);
            const offsetY = rect.height / 2 + (Math.random() * 10 - 5);
            setGhostPos({ x: rect.left + offsetX, y: rect.top + offsetY });
            setGhostStatus(status);
        }
    };

    // Fetch hardware list from storage
    const [hardwareList, setHardwareList] = useState<HardwareItem[]>([]);

    useEffect(() => {
        const loadHardware = async () => {
            const list = await storage.getProducts(1, 1000); // Fetch all products for client-side filtering
            console.log("VisualBuilder: Loaded hardware list", list);
            console.log("VisualBuilder: Category counts", list.items.reduce((acc, item) => {
                acc[item.category] = (acc[item.category] || 0) + 1;
                return acc;
            }, {} as any));
            setHardwareList(list.items);
        };
        loadHardware();
    }, []);

    const [sysAnnouncement, setSysAnnouncement] = useState<SystemAnnouncementSettings | null>(null);

    useEffect(() => {
        storage.getSystemAnnouncement().then(setSysAnnouncement);

        // Listen for real-time updates
        const handleUpdate = () => {
            storage.getSystemAnnouncement().then(setSysAnnouncement);
        };
        window.addEventListener('xiaoyu-announcement-update', handleUpdate);
        return () => window.removeEventListener('xiaoyu-announcement-update', handleUpdate);
    }, []);

    const openSelector = (entry: BuildEntry) => {
        setModalCategory(entry.category);
        setModalEntryId(entry.id);
        setModalEntryId(entry.id);
        setModalSearch('');
        setModalBrand('all');
        setSortOrder('default');
        setIsBrandsExpanded(false);
    };

    const handleSelect = (item: HardwareItem) => { if (modalEntryId) { onUpdate(modalEntryId, { item, customPrice: undefined, customName: undefined }); setModalCategory(null); setModalEntryId(null); } };

    const handleAiBuild = useCallback(async (prompt: string, preCalculatedResult?: any) => {
        try {
            let result = preCalculatedResult;

            if (!result) {
                // Simulate "thinking" implicitly during parse? No, just start.
                const request = aiBuilder.parseRequest(prompt);
                result = aiBuilder.generateBuildWithLogs(request);
            }

            setShowAiModal(false);
            setIsAiExecuting(true);

            // Start Ghost Logic - Reduced initial delay to feel more responsive
            setGhostPos({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
            setGhostStatus('AI 介入中...');
            await new Promise(r => setTimeout(r, 400)); // Shorter start

            // Iterate build list order
            for (const entry of buildList) {
                const cat = entry.category;
                const targetItem = result.items[cat as keyof typeof result.items];

                if (targetItem) {
                    const rowEl = rowRefs[entry.id];

                    if (rowEl) {
                        // 1. Move to Card
                        updateGhost(rowEl, `正在规划 ${CATEGORY_MAP[entry.category]}...`);
                        await new Promise(r => setTimeout(r, 300)); // Fast move

                        // 2. Open Modal (Simulate Click)
                        openSelector(entry);
                        await new Promise(r => setTimeout(r, 300));

                        // 3. Search for Item
                        const searchEl = modalSearchInputRef.current;
                        if (searchEl) {
                            updateGhost(searchEl, '搜索型号中...');
                            await new Promise(r => setTimeout(r, 200));

                            // Simulate typing search
                            const searchTerm = targetItem.model.split(' ')[0];
                            for (let i = 0; i < searchTerm.length; i++) {
                                setModalSearch(prev => prev + searchTerm[i]);
                                await new Promise(r => setTimeout(r, 40)); // Fast typing
                            }
                            await new Promise(r => setTimeout(r, 300));
                        }

                        // 4. Find Item in List
                        await new Promise(r => setTimeout(r, 200));

                        const itemEl = modalItemRefs[targetItem.id];
                        if (itemEl) {
                            updateGhost(itemEl, '目标锁定');
                            await new Promise(r => setTimeout(r, 300));

                            // 5. Select Item
                            onUpdate(entry.id, { item: targetItem, customPrice: undefined, customName: undefined });

                            // Close modal
                            setModalCategory(null);
                            setModalEntryId(null);

                            setGhostStatus('已确认');
                            await new Promise(r => setTimeout(r, 200));
                        } else {
                            // Fallback
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

            // Show result in dedicated card instead of remark
            setAiResult({ description: result.description });

        } catch (error) {
            console.error("AI Generation Failed:", error);
            setShowAiModal(false);
            setAiActiveCategory(null);
            setIsAiExecuting(false);
            alert("AI 生成失败，请重试");
        }
    }, [buildList, onUpdate, rowRefs, remark, modalSearchInputRef, modalItemRefs]);



    const filteredItems = useMemo(() => {
        if (!modalCategory) return [];
        let items = hardwareList.filter(i =>
            i.category === modalCategory &&
            (modalBrand === 'all' || i.brand === modalBrand) &&
            (() => {
                const searchStr = modalSearch.toLowerCase().trim();
                if (!searchStr) return true;
                const searchTerms = searchStr.split(/\s+/);
                // Combine brand, model, and category for better matching
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
    }, [modalCategory, modalBrand, modalSearch, hardwareList, sortOrder]);

    const availableBrands = useMemo(() => {
        if (!modalCategory) return [];
        const brands = new Set(hardwareList.filter(i => i.category === modalCategory).map(i => i.brand));
        return ['all', ...Array.from(brands)];
    }, [modalCategory, hardwareList]);

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

            <div className="flex-1 space-y-2 pb-20">
                {buildList.map((entry) => (
                    <div
                        key={entry.id}
                        ref={(el) => { if (el) rowRefs[entry.id] = el; }}
                        onClick={() => openSelector(entry)}
                        className={`relative rounded-2xl p-2 border transition-all cursor-pointer group flex items-center gap-3 ${entry.item || entry.customName
                            ? 'bg-white border-white/60 shadow-sm hover:shadow-lg hover:border-indigo-200'
                            : 'bg-slate-50 border-dashed border-slate-300 hover:bg-white hover:border-indigo-300'
                            }`}
                    >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 transition-colors ${entry.item ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-200 text-slate-400'}`}>
                            {getIconByCategory(entry.category)}
                        </div>
                        <div className={`text-sm font-bold w-12 ${entry.item ? 'text-indigo-900' : 'text-slate-500'}`}>{CATEGORY_MAP[entry.category]}</div>

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
                                    <div className="font-bold text-slate-800 truncate text-base">{entry.item.brand} {entry.item.model}</div>
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
                            <div className="w-auto md:w-16 text-right font-bold text-slate-800 text-sm md:text-lg">
                                {entry.item || entry.customName ? `¥${entry.customPrice ?? entry.item?.price ?? 0}` : '-'}
                            </div>
                        </div>
                        {(entry.item || (entry.category === 'accessory' && entry.customName)) && (
                            <button
                                className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all opacity-0 group-hover:opacity-100"
                                onClick={(e) => { e.stopPropagation(); onUpdate(entry.id, { item: null, customName: '', customPrice: undefined, quantity: 1 }); }}
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                ))}

                {/* AI Analysis Report Card - Moved to Bottom & Enlarged */}
                {aiResult && (
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-3xl p-8 border border-indigo-100 relative overflow-hidden animate-fade-in mt-6 shadow-lg shadow-indigo-100/50">
                        {/* ... (existing content) ... */}
                        <div className="relative z-10">
                            {/* ... */}
                            <div className="prose prose-indigo max-w-none">
                                <p className="text-slate-700 leading-loose text-base font-medium whitespace-pre-wrap">
                                    {aiResult.description}
                                </p>
                            </div>
                        </div>
                    </div>
                )}


            </div>
            <div className="w-full lg:w-80 shrink-0 space-y-6">
                {/* Prominent AI Button */}
                {/* Refined AI Button - Tech Style */}
                <div onClick={() => {
                    if (onAiCheck && !onAiCheck()) return;
                    setShowAiModal(true);
                }} className="hidden lg:block group relative w-full cursor-pointer transition-all hover:scale-[1.02]">
                    {/* Glowing Backdrop */}
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 rounded-2xl blur opacity-20 group-hover:opacity-60 transition duration-500"></div>

                    {/* Main Card */}
                    <div className="relative flex items-center gap-4 bg-slate-950 rounded-xl p-5 border border-slate-800 shadow-2xl overflow-hidden ring-1 ring-white/10">
                        {/* High-tech Background Grid */}
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px] [mask-image:radial-gradient(ellipse_at_center,black_60%,transparent_100%)] pointer-events-none"></div>

                        {/* Icon Container */}
                        <div className="relative z-10 w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
                            <Sparkles size={24} className="text-indigo-400 drop-shadow-[0_0_8px_rgba(129,140,248,0.6)] animate-pulse-slow" />
                        </div>

                        {/* Text Content */}
                        <div className="relative z-10 flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-bold text-lg text-white tracking-wide font-sans">AI 智能装机</h3>
                                <span className="text-[10px] font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-1.5 py-0.5 rounded shadow-[0_0_10px_rgba(79,70,229,0.3)] border border-white/10">测试版</span>
                            </div>
                            <p className="text-slate-400 text-xs font-medium group-hover:text-slate-300 transition-colors leading-relaxed">
                                智能语义分析，一键生成配置
                            </p>
                        </div>

                        {/* Arrow Action */}
                        <div className="relative z-10 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-indigo-600 group-hover:border-indigo-500 transition-all duration-300 transform group-hover:translate-x-1 shadow-lg">
                            <ArrowRight size={14} className="text-slate-500 group-hover:text-white" />
                        </div>
                    </div>
                </div>

                <div onClick={onOpenLibrary} className="hidden lg:flex bg-white rounded-[24px] p-4 border border-slate-100 shadow-lg cursor-pointer group hover:border-indigo-200 hover:shadow-xl transition-all items-center gap-4">
                    <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110">
                        <FileText size={18} />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-slate-800 text-base">快速装机</h3>
                            <ArrowRight className="text-slate-300 group-hover:text-blue-500 transition-colors" size={16} />
                        </div>
                        <p className="text-slate-500 text-xs mt-0.5">浏览精选配置，一键引用。</p>
                    </div>
                </div>

                <div className="bg-white/80 backdrop-blur rounded-[24px] p-6 border border-slate-100 shadow-lg">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><CreditCard size={18} /> 价格明细</h3>
                    <div className="space-y-3 mb-6">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500">基础总价 <span className="text-xs scale-90 text-slate-400">含6%服务费</span></span>
                            <span className="font-bold text-slate-900">¥{pricing.totalHardware}</span>
                        </div>    {pricing.savedAmount > 0 && (<div className="flex justify-between text-emerald-600 font-medium"><span>优惠</span><span>- ¥{pricing.savedAmount}</span></div>)}
                        <div className="h-px bg-slate-100 my-2"></div>
                        <div className="flex justify-between items-end"><span className="text-slate-800 font-bold">预估到手价</span><span className="text-3xl font-extrabold text-indigo-600">¥{pricing.finalPrice}</span></div>
                    </div>

                    <div className="relative mb-4 group">
                        <select
                            value={pricing.discountRate}
                            onChange={(e) => pricing.onDiscountChange?.(parseFloat(e.target.value))}
                            className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl px-4 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer hover:border-indigo-300"
                        >
                            {pricing.discountTiers?.map((tier: { id: string; name: string; multiplier: number }) => (
                                <option key={tier.id} value={tier.multiplier}>
                                    {tier.name.replace(/\s*\(.*?\)/g, '')}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-indigo-500 transition-colors" size={16} />
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-2">
                        <button onClick={onShare} className="py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 tap-active">
                            <Share2 size={16} /> 分享配置
                        </button>
                        <button onClick={onSave} className="py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg shadow-slate-200 transition-all flex items-center justify-center gap-2 tap-active">
                            <FileText size={16} /> 保存方案
                        </button>
                        <button onClick={onReset} className="col-span-2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all flex items-center justify-center gap-2 tap-active">
                            <X size={16} /> 重置
                        </button>
                    </div>
                </div>
                {/* Discount Selector - Mobile only (Removed or kept? User said remove Export option, and RED BOX position add discount. Since desktop sidebar handles it now, maybe I should hide this mobile one if it's redundant? But the sidebar might be hidden on mobile? 
                Wait, the sidebar is `w-full lg:w-80`. On mobile it is stacked.
                The previous code had `className="md:hidden ..."` for the separate mobile discount card.
                If I add it to the main Price Details card (which is in the sidebar div), does that appear on mobile?
                Yes, `div className="w-full lg:w-80 shrink-0 space-y-6"` is visible on mobile (flex-col layout).
                
                The `md:hidden` block at line 427 was explicit for mobile.
                If I add it to the Price Details card (line 400), which is visible on both, then I have duplication if I keep the `md:hidden` block.
                I should probably remove the `md:hidden` block if the Price Details card now contains it.
                However, looking at line 453 (end of sidebar), the Price Details card is inside the sidebar.
                So if I add it to Price Details, it serves both.
                
                Let's check if the Price Details card is hidden on mobile?
                Line 258: `flex-1 space-y-2 pb-20` (Main content)
                Line 349: `w-full lg:w-80 shrink-0 space-y-6` (Sidebar)
                
                Product list is in `flex-1`. Sidebar is below it on mobile (`flex-col`).
                So yes, adding it to Price Details card makes it available on mobile too.
                I should remove the separate `md:hidden` mobile discount component to avoid duplication.
                */
                }                {/* Remark Section - Hidden on mobile */}
                {/* System Announcement Section - Hidden on mobile if desired, currently replacing Remark */}
                {sysAnnouncement && sysAnnouncement.enabled && (sysAnnouncement.content || (sysAnnouncement.items && sysAnnouncement.items.length > 0)) && (
                    <div className="hidden md:block bg-white/80 backdrop-blur rounded-[24px] p-6 border border-slate-100 shadow-lg">
                        <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><FileText size={18} /> 系统公告</h3>
                        <div className="space-y-3">
                            {sysAnnouncement.items && sysAnnouncement.items.length > 0 ? (
                                sysAnnouncement.items.map(item => (
                                    <div key={item.id} className={`w-full border rounded-xl p-3 text-sm font-medium leading-relaxed flex gap-3 ${item.type === 'warning' ? 'bg-red-50 text-red-900 border-red-100' :
                                        item.type === 'promo' ? 'bg-amber-50 text-amber-900 border-amber-100' :
                                            'bg-indigo-50/50 text-indigo-900 border-indigo-100'
                                        }`}>
                                        <div className="shrink-0 mt-0.5">
                                            {item.pinned && <span className="mr-1 text-indigo-600">📌</span>}
                                            {item.type === 'warning' ? '⚠️' : item.type === 'promo' ? '🎉' : '📢'}
                                        </div>
                                        <div className="flex-1">
                                            <div className="whitespace-pre-wrap">{item.content}</div>
                                            {item.linkUrl && (
                                                <a href={item.linkUrl} target="_blank" rel="noopener noreferrer" className="text-xs opacity-70 hover:opacity-100 underline mt-1 inline-block">
                                                    查看详情 &rarr;
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="w-full bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 text-sm text-indigo-900 font-medium leading-relaxed whitespace-pre-wrap">
                                    {sysAnnouncement.content || '暂无公告'}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className={`bg-white/80 backdrop-blur rounded-[24px] p-6 border ${health.status === 'perfect' ? 'border-emerald-100 shadow-emerald-50' : 'border-amber-100 shadow-amber-50'} shadow-lg`}>
                    <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-slate-800">系统健康度</h3>{health.status === 'perfect' ? <CheckCircle2 className="text-emerald-500" /> : <AlertCircle className="text-amber-500" />}</div>
                    {health.status === 'perfect' ? <div className="text-sm text-slate-500 bg-emerald-50 p-3 rounded-xl border border-emerald-100">配置完美兼容，未发现问题。</div> : <div className="space-y-2">{health.issues.map((issue, idx) => <div key={idx} className="text-xs text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-100 flex gap-2"><div className="shrink-0 mt-0.5">•</div><div>{issue}</div></div>)}</div>}
                </div>
            </div>
            {
                modalCategory && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-fade-in">
                        <div className="bg-white rounded-[32px] w-full max-w-3xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
                            <div className="p-5 border-b border-slate-100 flex flex-col gap-4 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
                                <div className="flex justify-between items-center"><h2 className="text-xl font-bold text-slate-800">选择 {CATEGORY_MAP[modalCategory]}</h2><button onClick={() => setModalCategory(null)} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors text-slate-500"><X size={20} /></button></div>
                                <div className="flex flex-col gap-3">
                                    <div className="flex gap-3 items-center">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                            <input
                                                ref={(el) => modalSearchInputRef.current = el}
                                                type="text"
                                                value={modalSearch}
                                                onChange={(e) => setModalSearch(e.target.value)}
                                                placeholder={`搜索 ${CATEGORY_MAP[modalCategory]}...`}
                                                className="w-full bg-slate-50 border-none rounded-xl py-3 pl-10 pr-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner"
                                            />
                                        </div>
                                        <button
                                            onClick={() => setSortOrder(prev => prev === 'default' ? 'asc' : prev === 'asc' ? 'desc' : 'default')}
                                            className={`h-11 px-4 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shrink-0 ${sortOrder !== 'default'
                                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                                                : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                                                }`}
                                        >
                                            <ArrowRight size={14} className={`transition-transform duration-300 ${sortOrder === 'asc' ? '-rotate-90' : sortOrder === 'desc' ? 'rotate-90' : 'rotate-0'}`} />
                                            {sortOrder === 'default' ? '价格排序' : sortOrder === 'asc' ? '价格：从低到高' : '价格：从高到低'}
                                        </button>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <div className={`flex-1 flex gap-2 ${isBrandsExpanded ? 'flex-wrap' : 'overflow-x-auto no-scrollbar'} items-center pb-1 transition-all`}>
                                            {availableBrands.map(brand => (
                                                <button
                                                    key={brand}
                                                    onClick={() => setModalBrand(brand)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border shrink-0 tap-active ${modalBrand === brand
                                                        ? 'bg-slate-800 text-white border-slate-800 shadow-md'
                                                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                                        }`}
                                                >
                                                    {brand === 'all' ? '全部品牌' : brand}
                                                </button>
                                            ))}
                                        </div>
                                        {availableBrands.length > 5 && (
                                            <button
                                                onClick={() => setIsBrandsExpanded(!isBrandsExpanded)}
                                                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors shrink-0 mt-0.5"
                                                title={isBrandsExpanded ? "Collapse" : "Expand More"}
                                            >
                                                {isBrandsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
                                <div className="grid gap-3">
                                    {filteredItems.map(item => {
                                        const isOutOfStock = item.price === 0;
                                        return (
                                            <div
                                                key={item.id}
                                                ref={(el) => { if (el) modalItemRefs[item.id] = el; }}
                                                onClick={() => !isOutOfStock && handleSelect(item)}
                                                className={`bg-white p-4 rounded-2xl border border-slate-100 flex justify-between items-center group transition-all duration-200 relative overflow-hidden ${isOutOfStock ? 'opacity-60 cursor-not-allowed grayscale-[0.5]' : 'hover:border-indigo-500 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer'}`}
                                            >

                                                <div className="flex items-center gap-4">
                                                    <div className="w-16 h-16 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 group-hover:text-indigo-500 group-hover:bg-indigo-50 transition-colors overflow-hidden border border-slate-100 relative shrink-0">
                                                        {item.image ? (
                                                            <img
                                                                src={item.image}
                                                                alt={item.model}
                                                                className="w-full h-full object-cover hover:scale-110 transition-transform cursor-zoom-in"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setPreviewImage(item.image!);
                                                                }}
                                                            />
                                                        ) : (
                                                            getIconByCategory(modalCategory)
                                                        )}

                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-bold text-slate-800 text-lg group-hover:text-indigo-600 transition-colors flex items-center gap-2 truncate">
                                                            {item.model}
                                                            {isOutOfStock && <span className="text-[10px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded font-bold">缺货</span>}
                                                        </div>
                                                        <div className="text-xs text-slate-400 mt-1 font-medium flex items-center gap-2 flex-wrap">
                                                            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 shrink-0">{item.brand}</span>
                                                            {Object.entries(item.specs).slice(0, 3).map(([key, val]) => (<span key={key} className="hidden sm:inline opacity-75 truncate max-w-[100px]">• {val}</span>))}

                                                            {/* Badges Inline */}
                                                            {item.isRecommended && <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-bold">REC</span>}
                                                            {item.isDiscount && <span className="text-[10px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded font-bold">SALE</span>}
                                                            {item.createdAt && (new Date().getTime() - new Date(item.createdAt).getTime() < 30 * 24 * 60 * 60 * 1000) && (
                                                                <span className="text-[10px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded font-bold">NEW</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-1 shrink-0 ml-4">
                                                    <div className={`font-bold font-mono ${isOutOfStock ? 'text-slate-400 text-base' : 'text-xl text-slate-900'}`}>
                                                        {isOutOfStock ? '无库存' : `¥${item.price}`}
                                                    </div>
                                                    {!isOutOfStock && (
                                                        <button className="text-xs font-bold text-white bg-slate-900 px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg shadow-indigo-200/50">选择</button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {filteredItems.length === 0 && <div className="flex flex-col items-center justify-center py-20 text-slate-400"><Search size={48} className="mb-4 opacity-20" /><p>未找到结果，请尝试其他关键词？</p></div>}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {showAiModal && <AiGenerateModal key="ai-modal" onClose={() => setShowAiModal(false)} onSubmit={handleAiBuild} />}
        </div >
    );
}

export default VisualBuilder;
