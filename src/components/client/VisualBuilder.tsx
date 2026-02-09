
import { useState, useMemo, useCallback, useEffect } from 'react';
import { ArrowRight, CreditCard, FileText, CheckCircle2, AlertCircle, X, Search, Sparkles, Tag, Share2 } from 'lucide-react';
import { BuildEntry, HardwareItem, Category } from '../../types/clientTypes';
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
    remark,
    setRemark,
    pricing,
    onAiCheck,
    openAiModal,
    onAiModalClose,
    onSave,
    onShare,
    onExport,
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
    onExport?: () => void,
    onReset?: () => void
}) {
    const [modalCategory, setModalCategory] = useState<Category | null>(null);
    const [modalEntryId, setModalEntryId] = useState<string | null>(null);
    const [modalSearch, setModalSearch] = useState('');
    const [modalBrand, setModalBrand] = useState('all');
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
            const list = await storage.getProducts();
            setHardwareList(list);
        };
        loadHardware();
    }, []);

    const openSelector = (entry: BuildEntry) => {
        setModalCategory(entry.category);
        setModalEntryId(entry.id);
        setModalSearch('');
        setModalBrand('all');
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
                        updateGhost(rowEl, `规划 ${CATEGORY_MAP[entry.category]}...`);
                        await new Promise(r => setTimeout(r, 300)); // Fast move

                        // 2. Open Modal (Simulate Click)
                        openSelector(entry);
                        await new Promise(r => setTimeout(r, 300));

                        // 3. Search for Item
                        const searchEl = modalSearchInputRef.current;
                        if (searchEl) {
                            updateGhost(searchEl, '检索对应型号...');
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
                            updateGhost(itemEl, '锁定目标');
                            await new Promise(r => setTimeout(r, 300));

                            // 5. Select Item
                            onUpdate(entry.id, { item: targetItem, customPrice: undefined, customName: undefined });

                            // Close modal
                            setModalCategory(null);
                            setModalEntryId(null);

                            setGhostStatus('配置确认');
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
            setGhostStatus('方案生成完毕');
            await new Promise(r => setTimeout(r, 600));
            setIsAiExecuting(false);

            // Show result in dedicated card instead of remark
            setAiResult({ description: result.description });

        } catch (error) {
            console.error("AI Generation Failed:", error);
            setShowAiModal(false);
            setAiActiveCategory(null);
            setIsAiExecuting(false);
            alert("AI 生成失败，请稍后重试");
        }
    }, [buildList, onUpdate, rowRefs, remark, modalSearchInputRef, modalItemRefs]);



    const filteredItems = useMemo(() => {
        if (!modalCategory) return [];
        return hardwareList.filter(i =>
            i.category === modalCategory &&
            (modalBrand === 'all' || i.brand === modalBrand) &&
            (i.model.toLowerCase().includes(modalSearch.toLowerCase()) || i.brand.toLowerCase().includes(modalSearch.toLowerCase()))
        );
    }, [modalCategory, modalBrand, modalSearch, hardwareList]);

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
                                <div className="text-slate-400 font-medium">点击选择{CATEGORY_MAP[entry.category]}</div>
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
                        <div className="absolute top-0 right-0 p-32 bg-white/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-6">
                                <h3 className="font-bold text-2xl text-indigo-900 flex items-center gap-3">
                                    <Sparkles size={28} className="text-indigo-600" />
                                    AI 装机分析报告
                                </h3>
                                <button onClick={() => setAiResult(null)} className="p-2 hover:bg-black/5 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                                    <X size={24} />
                                </button>
                            </div>
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
                                <h3 className="font-bold text-lg text-white tracking-wide font-sans">AI 帮我写</h3>
                                <span className="text-[10px] font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-1.5 py-0.5 rounded shadow-[0_0_10px_rgba(79,70,229,0.3)] border border-white/10">BETA</span>
                            </div>
                            <p className="text-slate-400 text-xs font-medium group-hover:text-slate-300 transition-colors leading-relaxed">
                                智能语义分析，一键生成配置单
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
                            <h3 className="font-bold text-slate-800 text-base">快速方案</h3>
                            <ArrowRight className="text-slate-300 group-hover:text-blue-500 transition-colors" size={16} />
                        </div>
                        <p className="text-slate-500 text-xs mt-0.5">浏览大神方案，一键复用。</p>
                    </div>
                </div>

                <div className="bg-white/80 backdrop-blur rounded-[24px] p-6 border border-slate-100 shadow-lg">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><CreditCard size={18} /> 价格详情</h3>
                    <div className="space-y-3 mb-6">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500">配置总价 (优惠前) <span className="text-xs scale-90 text-slate-400">含6%服务费</span></span>
                            <span className="font-bold text-slate-900">¥{pricing.totalHardware}</span>
                        </div>    {pricing.savedAmount > 0 && (<div className="flex justify-between text-emerald-600 font-medium"><span>优惠立减</span><span>- ¥{pricing.savedAmount}</span></div>)}
                        <div className="h-px bg-slate-100 my-2"></div>
                        <div className="flex justify-between items-end"><span className="text-slate-800 font-bold">预估到手</span><span className="text-3xl font-extrabold text-indigo-600">¥{pricing.finalPrice}</span></div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-2">
                        <button onClick={onShare} className="py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 active:scale-95">
                            <Share2 size={16} /> 分享配置
                        </button>
                        <button onClick={onSave} className="py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg shadow-slate-200 transition-all flex items-center justify-center gap-2 active:scale-95">
                            <FileText size={16} /> 保存方案
                        </button>
                        <button onClick={onReset} className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95">
                            <X size={16} /> 清空
                        </button>
                        <button onClick={onExport} className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95">
                            <ArrowRight size={16} /> 导出
                        </button>
                    </div>
                </div>
                {/* Discount Selector - Mobile only */}
                <div className="md:hidden bg-white/80 backdrop-blur rounded-[24px] p-5 border border-slate-100 shadow-lg">
                    <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><Tag size={18} /> 优惠方案</h3>
                    <div className="flex flex-wrap gap-2">
                        {pricing.discountTiers?.map((tier: { id: string; name: string; multiplier: number }) => (
                            <button
                                key={tier.id}
                                onClick={() => pricing.onDiscountChange?.(tier.multiplier)}
                                className={`px-3 py-2 rounded-xl text-sm font-bold transition-all ${pricing.discountRate === tier.multiplier
                                    ? 'bg-indigo-600 text-white shadow-lg'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                            >
                                {tier.name}
                            </button>
                        ))}
                    </div>
                </div>
                {/* Remark Section - Hidden on mobile */}
                <div className="hidden md:block bg-white/80 backdrop-blur rounded-[24px] p-6 border border-slate-100 shadow-lg">
                    <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><FileText size={18} /> 整机备注</h3>
                    <textarea value={remark} onChange={(e) => setRemark(e.target.value)} className="w-full h-24 bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none" placeholder="例如：显卡需要不拆封、发顺丰到付..." />
                </div>
                <div className={`bg-white/80 backdrop-blur rounded-[24px] p-6 border ${health.status === 'perfect' ? 'border-emerald-100 shadow-emerald-50' : 'border-amber-100 shadow-amber-50'} shadow-lg`}>
                    <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-slate-800">系统健康度</h3>{health.status === 'perfect' ? <CheckCircle2 className="text-emerald-500" /> : <AlertCircle className="text-amber-500" />}</div>
                    {health.status === 'perfect' ? <div className="text-sm text-slate-500 bg-emerald-50 p-3 rounded-xl border border-emerald-100">配置完美兼容，未发现硬件冲突。</div> : <div className="space-y-2">{health.issues.map((issue, idx) => <div key={idx} className="text-xs text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-100 flex gap-2"><div className="shrink-0 mt-0.5">•</div><div>{issue}</div></div>)}</div>}
                </div>
            </div>
            {
                modalCategory && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-fade-in">
                        <div className="bg-white rounded-[32px] w-full max-w-3xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
                            <div className="p-5 border-b border-slate-100 flex flex-col gap-4 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
                                <div className="flex justify-between items-center"><h2 className="text-xl font-bold text-slate-800">选择 {CATEGORY_MAP[modalCategory]}</h2><button onClick={() => setModalCategory(null)} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors text-slate-500"><X size={20} /></button></div>
                                <div className="flex gap-3">
                                    <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input ref={(el) => modalSearchInputRef.current = el} type="text" value={modalSearch} onChange={(e) => setModalSearch(e.target.value)} placeholder={`搜索 ${CATEGORY_MAP[modalCategory]} 型号...`} className="w-full bg-slate-50 border-none rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 transition-all" /></div>
                                    <div className="flex gap-2 overflow-x-auto no-scrollbar items-center">{availableBrands.map(brand => (<button key={brand} onClick={() => setModalBrand(brand)} className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${modalBrand === brand ? 'bg-slate-800 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>{brand === 'all' ? '全部' : brand}</button>))}</div>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
                                <div className="grid gap-3">
                                    {filteredItems.map(item => (
                                        <div key={item.id} ref={(el) => { if (el) modalItemRefs[item.id] = el; }} onClick={() => handleSelect(item)} className="bg-white p-4 rounded-2xl border border-slate-100 hover:border-indigo-500 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer flex justify-between items-center group transition-all duration-200 relative overflow-hidden">

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
                                                    </div>
                                                    <div className="text-xs text-slate-400 mt-1 font-medium flex items-center gap-2 flex-wrap">
                                                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 shrink-0">{item.brand}</span>
                                                        {Object.entries(item.specs).slice(0, 3).map(([key, val]) => (<span key={key} className="hidden sm:inline opacity-75 truncate max-w-[100px]">• {val}</span>))}

                                                        {/* Badges Inline */}
                                                        {item.isRecommended && <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-bold">推荐</span>}
                                                        {item.isDiscount && <span className="text-[10px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded font-bold">折扣</span>}
                                                        {item.createdAt && (new Date().getTime() - new Date(item.createdAt).getTime() < 30 * 24 * 60 * 60 * 1000) && (
                                                            <span className="text-[10px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded font-bold">新品</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1 shrink-0 ml-4">
                                                <div className="text-xl font-bold text-slate-900 font-mono">¥{item.price}</div>
                                                <button className="text-xs font-bold text-white bg-slate-900 px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg shadow-indigo-200/50">选择</button>
                                            </div>
                                        </div>
                                    ))}
                                    {filteredItems.length === 0 && <div className="flex flex-col items-center justify-center py-20 text-slate-400"><Search size={48} className="mb-4 opacity-20" /><p>未找到相关硬件，换个关键词试试？</p></div>}
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
