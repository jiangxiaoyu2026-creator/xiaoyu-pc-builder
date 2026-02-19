
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Zap, X, Sparkles, Trash2, ChevronDown, Save, RefreshCw, Share2 } from 'lucide-react';
import { BuildEntry, HardwareItem } from '../../types/clientTypes';
import { CATEGORY_MAP } from '../../data/clientData';
import { storage } from '../../services/storage';
import { aiBuilder, AIBuildResult } from '../../services/aiBuilder';
import { getIconByCategory } from './Shared';
import { AiGenerateModal } from './AiGenerateModal';
import { ChatSettingsModal } from '../admin/ChatSettingsModal';




export function StreamerPermissionDenied() {
    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="max-w-md w-full p-8 bg-white/80 backdrop-blur-xl rounded-[24px] shadow-2xl border border-white/50 text-center">
                <div className="mb-6 inline-flex p-4 bg-rose-50 rounded-full text-rose-500">
                    <Zap size={32} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">访问被拒绝</h2>
                <p className="text-slate-500 mb-8">
                    当前账号没有访问主播/商家工作台的权限。<br />
                    请联系管理员开通权限：<span className="font-bold text-slate-900 select-all">13793195989</span>
                </p>

            </div>
        </div>
    );
}

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

// Define simulation handle interface
export interface StreamerRowHandle {
    simulateType: (text: string) => void;
    simulateArrowDown: () => void;
    simulateEnter: () => void;
    focus: () => void;
    setValue: (val: string) => void;
    closeSuggestions: () => void;
}

const StreamerRow = React.forwardRef<StreamerRowHandle, { entry: BuildEntry, index: number, onUpdate: (id: string, d: Partial<BuildEntry>) => void, onEnter: () => void, onPreview: (img: string) => void }>(({ entry, onUpdate, onEnter, onPreview }, ref) => {
    const [query, setQuery] = useState(entry.customName || entry.item?.model || '');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [highlightIndex, setHighlightIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const [hardwareList, setHardwareList] = useState<HardwareItem[]>([]);

    useEffect(() => {
        storage.getProducts(1, 1000).then(res => setHardwareList(res.items));
    }, []);

    const suggestions = useMemo(() => {
        const searchStr = query.toLowerCase().trim();
        if (!searchStr) {
            return hardwareList.filter(item => item.category === entry.category).slice(0, 20);
        }

        const searchTerms = searchStr.split(/\s+/);
        return hardwareList.filter(item => {
            if (item.category !== entry.category) return false;
            const searchableText = `${item.brand} ${item.model} ${CATEGORY_MAP[item.category] || item.category}`.toLowerCase();
            return searchTerms.every(term => searchableText.includes(term));
        });
    }, [query, entry.category, hardwareList]);

    useEffect(() => {
        if (entry.item) setQuery(`${entry.item.brand} ${entry.item.model}`);
        else if (entry.customName) setQuery(entry.customName);
        else setQuery('');
    }, [entry.item, entry.customName]);

    const selectItem = (item: HardwareItem) => {
        onUpdate(entry.id, { item, customPrice: undefined, customName: undefined });
        setQuery(`${item.brand} ${item.model}`);
        setShowSuggestions(false);
        onEnter();
    };

    const handleCustomInput = (val: string) => {
        setQuery(val);
        onUpdate(entry.id, { customName: val, item: null });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIndex(prev => Math.min(prev + 1, suggestions.length - 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightIndex(prev => Math.max(prev - 1, 0)); }
        else if (e.key === 'Enter') { e.preventDefault(); if (showSuggestions && suggestions.length > 0) selectItem(suggestions[highlightIndex]); else onEnter(); }
    };

    // Imperative Handle for AI Simulation
    React.useImperativeHandle(ref, () => ({
        focus: () => {
            inputRef.current?.focus();
            inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        },
        setValue: (val: string) => {
            setQuery(val);
            setShowSuggestions(true);
        },
        simulateType: (text: string) => {
            setQuery(text);
            setShowSuggestions(true);
            setHighlightIndex(0);
        },
        simulateArrowDown: () => {
            setHighlightIndex(prev => {
                const next = Math.min(prev + 1, suggestions.length - 1);
                // Auto-scroll logic if needed could go here
                return next;
            });
        },
        simulateEnter: () => {
            if (suggestions.length > 0) {
                // Must read current highlightIndex from state ref or similar if closed over? 
                // Actually inside functional component, accessing state directly in imperative handle *might* be stale if not careful.
                // But since we call this function fresh, it sees current closure? No, closure is formed at render. 
                // We use a ref to track index for imperative access to be safe
                selectItem(suggestions[highlightIndex]);
            } else {
                onEnter();
            }
        },
        closeSuggestions: () => {
            setShowSuggestions(false);
        }
    }));

    // Keep highlightIndex in ref for stable access in imperative handle if needed,
    // but React.useImperativeHandle dependencies array usually solves this if we pass [suggestions, highlightIndex]
    // However, simplicity: just allow it to re-bind.

    const handlePriceChange = (newPrice: string) => {
        const num = parseInt(newPrice);
        if (!isNaN(num)) onUpdate(entry.id, { customPrice: num });
        else onUpdate(entry.id, { customPrice: 0 });
    };

    const displayPrice = entry.customPrice ?? entry.item?.price ?? 0;

    const CATEGORY_STYLES: Record<string, { bg: string, text: string }> = {
        cpu: { bg: 'bg-indigo-50', text: 'text-indigo-600' },
        gpu: { bg: 'bg-indigo-50', text: 'text-purple-600' },
        mainboard: { bg: 'bg-indigo-50', text: 'text-blue-600' },
        ram: { bg: 'bg-indigo-50', text: 'text-amber-600' },
        disk: { bg: 'bg-indigo-50', text: 'text-cyan-600' },
        power: { bg: 'bg-indigo-50', text: 'text-rose-600' },
        cooling: { bg: 'bg-indigo-50', text: 'text-sky-600' },
        case: { bg: 'bg-indigo-50', text: 'text-slate-600' },
        monitor: { bg: 'bg-indigo-50', text: 'text-emerald-600' },
        default: { bg: 'bg-indigo-50', text: 'text-slate-400' }
    };

    const style = CATEGORY_STYLES[entry.category] || CATEGORY_STYLES.default;
    const isMainPart = ['cpu', 'gpu', 'mainboard'].includes(entry.category);

    return (
        <div className={`grid grid-cols-[80px_1fr_80px_100px_50px] gap-4 px-6 py-2.5 items-center group transition-colors ${entry.item ? 'bg-indigo-50/30' : 'hover:bg-slate-50'}`}>

            <div className={`flex items-center gap-3 font-medium text-sm transition-all ${isMainPart ? 'text-slate-800' : 'text-slate-500'}`}>
                <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all shadow-sm overflow-hidden relative group/icon ${entry.item?.image ? 'cursor-zoom-in hover:scale-110 hover:shadow-md' : ''} ${style.bg} ${style.text} ${!entry.item && 'group-hover:bg-white group-hover:shadow-md'}`}
                    onClick={() => entry.item?.image && onPreview(entry.item.image)}
                >
                    {getIconByCategory(entry.category)}
                </div>
                <span className={isMainPart ? 'font-bold' : ''}>{CATEGORY_MAP[entry.category]}</span>
            </div>

            <div className="relative">
                <input ref={inputRef} type="text" className="w-full bg-transparent border-none p-0 text-slate-800 font-medium placeholder-slate-300 focus:ring-0 focus:outline-none" placeholder={entry.category === 'accessory' ? "输入配件名称..." : `输入/搜索 ${CATEGORY_MAP[entry.category]}...`} value={query} onChange={e => { handleCustomInput(e.target.value); setShowSuggestions(true); setHighlightIndex(0); }} onFocus={() => setShowSuggestions(true)} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} onKeyDown={handleKeyDown} />
                {showSuggestions && (
                    <div className="absolute top-full left-0 right-0 bg-white shadow-xl rounded-xl border border-slate-100 z-50 mt-2 overflow-hidden max-h-[300px] overflow-y-auto">
                        {suggestions.map((item, idx) => (
                            <div key={item.id} className={`px-4 py-2 text-sm flex justify-between cursor-pointer ${idx === highlightIndex ? 'bg-indigo-50 text-indigo-700 transition-colors' : 'text-slate-600 hover:bg-slate-50'}`} onMouseDown={() => selectItem(item)}>
                                <span className="flex items-center">
                                    {item.brand} {item.model}
                                    {item.isDiscount && <span className="ml-1.5 bg-rose-50 text-rose-500 text-[9px] px-1 py-0.5 rounded-md font-bold border border-rose-100 shrink-0 scale-90 origin-left">特惠</span>}
                                </span>
                                <span className="font-bold">¥{item.price}</span>
                            </div>
                        ))}
                        {suggestions.length === 0 && <div className="px-4 py-3 text-xs text-slate-400 text-center">未找到匹配项</div>}
                    </div>
                )}
            </div>

            <div className="flex justify-center">
                {entry.category === 'accessory' ? null : (
                    entry.isLockedQty ? <span className="text-slate-400 text-sm">× 1</span> : (
                        <div className="flex items-center bg-white rounded border border-slate-200">
                            <button onClick={() => onUpdate(entry.id, { quantity: Math.max(1, entry.quantity - 1) })} className="text-slate-400 hover:text-indigo-600 transition-colors px-1">-</button>
                            <span className="w-8 text-center text-sm">{entry.quantity}</span>
                            <button onClick={() => onUpdate(entry.id, { quantity: entry.quantity + 1 })} className="text-slate-400 hover:text-indigo-600 transition-colors px-1">+</button>
                        </div>
                    )
                )}
            </div>

            <div className="flex items-center gap-1 justify-end">
                <span className="text-slate-300 text-sm">¥</span>
                <input type="text" className={`w-16 text-right bg-transparent border-b border-dashed border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none transition-colors ${entry.customPrice ? 'text-amber-600 font-bold' : 'text-slate-700'}`} value={displayPrice} onChange={(e) => handlePriceChange(e.target.value)} onFocus={(e) => e.target.select()} />
            </div>

            <div className="flex justify-end">
                <button onClick={() => onUpdate(entry.id, { item: null, customPrice: undefined, customName: '' })} className="text-slate-300 hover:text-red-500 transition-colors">
                    <X size={16} />
                </button>
            </div>
        </div>
    );
});

// Helper for sound effect (simulated ticker)
// Removed upon user request

function RollingPrice({ value }: { value: number }) {
    const [display, setDisplay] = useState(value);

    useEffect(() => {
        let startTime: number;
        const duration = 800; // 800ms animation
        const startValue = display;
        const endValue = value;

        if (startValue === endValue) return;

        const animate = (currentTime: number) => {
            if (!startTime) startTime = currentTime;
            const progress = Math.min((currentTime - startTime) / duration, 1);

            // Easing function (easeOutQuart)
            const ease = 1 - Math.pow(1 - progress, 4);

            const current = Math.floor(startValue + (endValue - startValue) * ease);
            setDisplay(current);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                setDisplay(endValue);
            }
        };

        requestAnimationFrame(animate);
    }, [value]);

    return <span>{display}</span>;
}


export default function StreamerWorkbench({
    buildList,
    onUpdate,
    pricing,
    discountRate,
    setDiscountRate,
    isSharing,
    handleShareTrigger,
    handleSave,
    clearBuild,
    hasPermission,
    onAiCheck,
    onOpenLibrary
}: {
    buildList: BuildEntry[],
    onUpdate: (id: string, data: Partial<BuildEntry>) => void,
    pricing: any,
    discountRate: number,
    setDiscountRate: (rate: number) => void,
    isSharing: boolean,
    handleShareTrigger: () => void,
    handleSave: () => void,
    clearBuild: () => void,
    hasPermission: boolean,
    onAiCheck?: () => boolean,
    onOpenLibrary: () => void

}) {
    const [pricingStrategy, setPricingStrategy] = useState<import('../../types/adminTypes').PricingStrategy | null>(null);
    const [strategies, setStrategies] = useState<{ value: number; label: string }[]>([]);

    useEffect(() => {
        const load = async () => {
            const [p] = await Promise.all([
                storage.getPricingStrategy()
            ]);
            setPricingStrategy(p);

            if (p.discountTiers) {
                const opts = p.discountTiers
                    .sort((a: any, b: any) => a.sortOrder - b.sortOrder)
                    .map((tier: any) => ({
                        value: tier.multiplier,
                        label: tier.name
                    }));
                setStrategies(opts);
            }
        };
        load();
    }, []);

    const [showAiModal, setShowAiModal] = useState(false);
    const [showChatSettings, setShowChatSettings] = useState(false);
    const [isAiTyping, setIsAiTyping] = useState(false);
    const [aiResult, setAiResult] = useState<AIBuildResult | null>(null);
    const [ghostPos, setGhostPos] = useState({ x: 0, y: 0 });
    const [ghostStatus, setGhostStatus] = useState('');

    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const rowInputRefs = useRef<(StreamerRowHandle | null)[]>([]);

    // ... (keep existing methods: updateGhost, handleNextFocus, handleAiBuild)

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

    const handleNextFocus = (currentIndex: number) => {
        const nextInput = rowInputRefs.current[currentIndex + 1];
        if (nextInput) {
            nextInput.focus();
        }
    };

    const handleAiBuild = async (prompt: any) => {
        try {
            const request = typeof prompt === 'string' ? aiBuilder.parseRequest(prompt) : prompt;
            const result = await aiBuilder.generateBuildWithLogs(request);

            setShowAiModal(false);
            clearBuild();
            setIsAiTyping(true); // Enable Ghost

            // Move ghost to random start position
            setGhostPos({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
            setGhostStatus('思考中...');
            await new Promise(r => setTimeout(r, 600));

            const cats = Object.keys(result.items);

            for (let i = 0; i < cats.length; i++) {
                const cat = cats[i];
                const targetItem = (result.items as any)[cat];
                const entry = buildList.find(e => e.category === cat);

                if (entry && targetItem) {
                    const rowIndex = buildList.findIndex(e => e.id === entry.id);
                    const row = rowInputRefs.current[rowIndex];

                    if (row) {
                        row.focus();

                        // Wait for focus and move ghost to active element
                        await new Promise(r => setTimeout(r, 50));
                        const activeEl = document.activeElement as HTMLElement;
                        updateGhost(activeEl, '搜索中...');

                        // Initial hesitation
                        await new Promise(r => setTimeout(r, 100 + Math.random() * 200));

                        if (!row) continue;

                        // 2. Type Keyword with "Mistakes"
                        const keywords = (targetItem as any).model.split(' ');
                        const keyword = keywords[0].length > 3 ? keywords[0] : (keywords[1] || keywords[0]);

                        let currentText = "";
                        setGhostStatus('输入中...');

                        for (let charIndex = 0; charIndex < keyword.length; charIndex++) {
                            // Mistake Logic: 10% chance to typo
                            if (Math.random() < 0.1 && charIndex > 1) {
                                const wrongChar = String.fromCharCode(97 + Math.floor(Math.random() * 26));
                                row.simulateType(currentText + wrongChar);
                                await new Promise(r => setTimeout(r, 80)); // Realize mistake
                                row.simulateType(currentText); // Backspace
                                await new Promise(r => setTimeout(r, 80)); // Correction pause
                            }

                            currentText += keyword[charIndex];
                            row.simulateType(currentText);
                            await new Promise(r => setTimeout(r, 30 + Math.random() * 40)); // Typing speed
                        }

                        // 3. Simulate "Browsing"
                        updateGhost(activeEl, '比对价格...');
                        await new Promise(r => setTimeout(r, 150));

                        const browseCount = 1 + Math.floor(Math.random() * 2);
                        for (let k = 0; k < browseCount; k++) {
                            row.simulateArrowDown();
                            await new Promise(r => setTimeout(r, 100));
                        }

                        // 5. Final Selection
                        setGhostStatus('已锁定');
                        row.simulateType(`${(targetItem as any).brand} ${(targetItem as any).model}`);
                        await new Promise(r => setTimeout(r, 150));
                        onUpdate(entry.id, { item: targetItem as any });

                        // row.simulateEnter(); 
                        await new Promise(r => setTimeout(r, 150));
                        row.closeSuggestions();
                    }
                }
            }

            setGhostStatus('生成报告中...');
            await new Promise(r => setTimeout(r, 400)); // Finish hesitation

            setIsAiTyping(false);
            setAiResult(result);
        } catch (error) {
            console.error(error);
            setIsAiTyping(false);
            alert("AI Generation Failed");
        }
    };

    return (
        <div className="bg-white rounded-[32px] shadow-xl border border-slate-200/60 overflow-hidden relative">

            {/* Permission Overlay */}
            {!hasPermission && (
                <div className="absolute inset-0 z-50 bg-white/40 backdrop-blur-sm flex items-center justify-center">
                    <div className="bg-white p-8 rounded-3xl shadow-2xl border border-indigo-100 text-center max-w-md mx-4 transform scale-100 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
                        <div className="mb-6 inline-flex p-4 bg-indigo-50 rounded-full text-indigo-600 ring-4 ring-indigo-50/50">
                            <Zap size={40} />
                        </div>
                        <h3 className="text-2xl font-extrabold text-slate-900 mb-2">专业装机工作台</h3>
                        <p className="text-slate-500 mb-8 font-medium px-4">
                            专为高效装机打造的强大工具。
                        </p>

                        <div className="text-left space-y-3 mb-8 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                            <div className="flex items-center gap-3 text-slate-700 font-medium">
                                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0"><span className="text-xs font-bold">✓</span></div>
                                快速报价 & 装机单生成
                            </div>
                            <div className="flex items-center gap-3 text-slate-700 font-medium">
                                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0"><span className="text-xs font-bold">✓</span></div>
                                多级折扣方案管理
                            </div>
                            <div className="flex items-center gap-3 text-slate-700 font-medium">
                                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0"><span className="text-xs font-bold">✓</span></div>
                                一键生成配置图
                            </div>
                            <div className="flex items-center gap-3 text-slate-700 font-medium">
                                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0"><span className="text-xs font-bold">✓</span></div>
                                营销海报生成器
                            </div>
                        </div>

                        <div className="bg-indigo-50 rounded-xl p-4 mb-6 border border-indigo-100">
                            <p className="text-indigo-900 text-sm font-bold mb-1">联系管理员开通权限</p>
                            <p className="text-indigo-600 font-mono text-lg font-bold select-all">手机: 13793195989</p>
                        </div>

                    </div>
                </div>
            )}

            <div className={!hasPermission ? 'filter blur-[2px] opacity-60 pointer-events-none select-none' : ''}>
                <GhostCursor x={ghostPos.x} y={ghostPos.y} active={isAiTyping} status={ghostStatus} />
                {isAiTyping && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-100 z-50">
                        <div className="h-full bg-indigo-600 animate-[loading_2s_ease-in-out_infinite]"></div>
                    </div>
                )}
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Zap className="text-indigo-600" />
                        极速录入模式
                    </h2>
                    <div className="flex gap-3">
                        <button onClick={onOpenLibrary} className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-full transition-colors active:scale-95 border border-slate-200">
                            <Zap size={14} className="text-amber-500" /> 快速装机
                        </button>
                        <button onClick={() => {
                            if (onAiCheck && !onAiCheck()) return;
                            setShowAiModal(true);
                        }} className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold rounded-full shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all hover:-translate-y-0.5 active:scale-95 active:translate-y-0">
                            <Sparkles size={14} /> AI装机
                        </button>
                        <div className="text-xs font-medium text-slate-500 bg-white text-indigo-700 px-3 py-1.5 rounded-full border border-indigo-100 shadow-sm">
                            按 Enter 跳过
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <div className="min-w-[600px]">
                        <div className="grid grid-cols-[80px_1fr_80px_100px_50px] gap-4 px-6 py-3 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                            <div>类别</div>
                            <div>硬件型号 (智能搜索 / 自定义)</div>
                            <div className="text-center">数量</div>
                            <div className="text-right">价格</div>
                            <div></div>
                        </div>

                        <div className="divide-y divide-slate-100">
                            {buildList.map((entry, index) => (
                                <StreamerRow key={entry.id} index={index} entry={entry} onUpdate={onUpdate} ref={(el) => (rowInputRefs.current[index] = el)} onEnter={() => handleNextFocus(index)} onPreview={setPreviewImage} />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="bg-white/90 border-t border-slate-100 px-4 py-3 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex flex-col gap-0.5">
                        <div className="flex items-baseline gap-2">
                            <span className="text-xl text-slate-400 font-bold whitespace-nowrap line-through decoration-2 decoration-slate-300">¥{Math.floor(pricing.standardPrice)}</span>
                            <div className="flex items-baseline gap-0.5">
                                <span className="text-xl font-bold text-slate-900">¥</span>
                                <span className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 font-mono tracking-tight">
                                    <RollingPrice value={pricing.finalPrice} />
                                </span>
                            </div>
                            <span className="bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap self-start mt-1.5">省 ¥{pricing.savedAmount}</span>

                            <div className="relative group w-[100px] ml-1 self-center">
                                <select value={discountRate} onChange={(e) => setDiscountRate(parseFloat(e.target.value))} className="w-full appearance-none bg-slate-100 border border-slate-200 hover:border-indigo-300 text-slate-700 text-[10px] font-bold py-1 pl-2 pr-6 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer text-center">
                                    {strategies.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                </select>
                                <ChevronDown className="absolute right-2 top-1.5 text-slate-400 pointer-events-none" size={12} />
                            </div>
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium pl-0.5">标准价格包含 {((pricingStrategy?.serviceFeeRate || 0) * 100).toFixed(0)}% 服务费</div>
                    </div>

                    <div className="flex flex-col items-center justify-center">
                        {/* Discount Select Moved */}
                    </div>

                    <div className="flex items-center gap-2 h-10">
                        <button onClick={clearBuild} className="h-full aspect-square flex items-center justify-center bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-all active:scale-95 border border-rose-100" title="清空配置">
                            <Trash2 size={18} />
                        </button>
                        <button onClick={handleSave} className="h-full aspect-square flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all active:scale-95 border border-slate-200" title="保存配置">
                            <Save size={18} />
                        </button>
                        <button onClick={handleShareTrigger} disabled={isSharing} className="h-full aspect-square flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg shadow-md shadow-indigo-200 transition-all active:scale-95" title="分享配置">
                            {isSharing ? <RefreshCw size={18} className="animate-spin" /> : <Share2 size={18} />}
                        </button>
                    </div>
                </div>



                {showAiModal && <AiGenerateModal onClose={() => setShowAiModal(false)} onSubmit={handleAiBuild} />}
                {showChatSettings && <ChatSettingsModal onClose={() => setShowChatSettings(false)} />}

                {/* AI Result Static Section */}
                {
                    aiResult && (
                        <div className="mt-8 bg-white rounded-[24px] shadow-lg border border-purple-100 overflow-hidden animate-fade-in relative z-10 w-full mb-12">
                            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-white">
                                    <Sparkles size={18} className="animate-pulse" />
                                    <h3 className="font-bold text-lg tracking-wide">AI 装机分析</h3>
                                </div>
                                <button onClick={() => setAiResult(null)} className="text-white/80 hover:text-white transition-colors">
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="p-8">
                                <div className="flex flex-col gap-6 items-start">
                                    <div className="flex-1 w-full">
                                        <p className="text-slate-700 text-base leading-relaxed font-medium">{aiResult.description}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }
                {/* Image Preview Modal */}
                {previewImage && (
                    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setPreviewImage(null)}>
                        <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center">
                            <img src={previewImage} alt="Preview" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl scale-100 animate-in zoom-in-95 duration-200" />
                            <button className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors bg-black/20 hover:bg-black/40 rounded-full p-2">
                                <X size={24} />
                            </button>
                        </div>
                    </div>
                )}
            </div >
        </div>
    );
}


