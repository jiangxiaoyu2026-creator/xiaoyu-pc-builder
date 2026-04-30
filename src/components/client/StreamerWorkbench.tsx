
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate as fmAnimate } from 'framer-motion';
import { Zap, X, Sparkles, Trash2, ChevronDown, Save, RefreshCw, Share2, Download, Monitor, TrendingUp, Recycle, Crown, MonitorPlay, BarChart3, Clock, Activity, Gamepad2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { BuildEntry, HardwareItem } from '../../types/clientTypes';
import { CATEGORY_MAP } from '../../data/clientData';
import { storage } from '../../services/storage';
import { aiBuilder, AIBuildResult } from '../../services/aiBuilder';
import { getIconByCategory } from './Shared';
import { AiGenerateModal } from './AiGenerateModal';
import { ChatSettingsModal } from '../admin/ChatSettingsModal';
import PriceTrendChart from '../admin/PriceTrendChart';
import StreamerRecycleTab from './StreamerRecycleTab';
import HardwareLeaderboard from './HardwareLeaderboard';
import { ThemeColor, THEMES, ThemeContext } from './StreamerThemeContext';
import { gamesFpsData, gamesList, Resolution } from '../../data/gameFpsData';
// --------------------

// Bouncy number animation component
const BouncyNumber = ({ value, className }: { value: number; className?: string }) => {
    const count = useMotionValue(0);
    const rounded = useTransform(count, (latest) => Math.round(latest));

    useEffect(() => {
        const controls = fmAnimate(count, value, {
            type: 'spring',
            stiffness: 100,
            damping: 15,
            restDelta: 0.5
        });
        return controls.stop;
    }, [value, count]);

    return <motion.span className={className}>{rounded}</motion.span>;
};

export function StreamerPermissionDenied() {
    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="max-w-md w-full p-8 bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 text-center">
                <div className="mb-6 inline-flex p-4 bg-rose-50 rounded-full text-rose-500">
                    <Zap size={32} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">访问被拒绝</h2>
                <p className="text-slate-500 mb-8">
                    当前账号没有访问主播中心的权限。<br />
                    请联系管理员开通权限：<span className="font-bold text-slate-900 select-all">15165066053</span>
                </p>

            </div>
        </div>
    );
}

function GhostCursor({ x, y, active, status }: { x: number, y: number, active: boolean, status: string }) {
    return (
        <motion.div
            className={`fixed pointer-events-none z-[100] flex items-center justify-center -translate-x-1/2 -translate-y-1/2`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ 
                left: x, 
                top: y, 
                opacity: active && status ? 1 : 0,
                scale: active && status ? 1 : 0.9
            }}
            transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.5 }}
        >
            <div className="bg-indigo-600/95 backdrop-blur-md text-white text-[11px] px-3 py-1.5 rounded-full shadow-xl shadow-indigo-600/20 whitespace-nowrap font-bold tracking-wide border border-indigo-400/30 flex items-center gap-1.5">
                <Sparkles size={12} className="animate-pulse" />
                {status || '...'}
            </div>
        </motion.div>
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

const StreamerRow = React.forwardRef<StreamerRowHandle, { entry: BuildEntry, index: number, onUpdate: (id: string, d: Partial<BuildEntry>) => void, onEnter: () => void, onPrev: () => void, onPreview: (img: string) => void }>(({ entry, index, onUpdate, onEnter, onPrev, onPreview }, ref) => {
    const { theme } = React.useContext(ThemeContext);
    const [query, setQuery] = useState(entry.customName || entry.item?.model || '');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [highlightIndex, setHighlightIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const priceRef = useRef<HTMLInputElement>(null);

    const [hardwareList, setHardwareList] = useState<HardwareItem[]>([]);
    const suggestionsRef = useRef<HTMLDivElement>(null);

    const [isLoading, setIsLoading] = useState(false);

    const loadCategoryProducts = async () => {
        if (hardwareList.length > 0 || isLoading) return;
        setIsLoading(true);
        try {
            const res = await storage.getProducts(1, 2000, entry.category);
            setHardwareList(res.items);
        } catch (error) {
            console.error("Failed to load products for category:", entry.category, error);
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-scroll suggestions list when highlightIndex changes
    useEffect(() => {
        if (showSuggestions && suggestionsRef.current) {
            const container = suggestionsRef.current;
            const highlightedItem = container.children[highlightIndex] as HTMLElement;
            if (highlightedItem) {
                // Ensure the item is visible within the container
                const containerTop = container.scrollTop;
                const containerBottom = containerTop + container.clientHeight;
                const itemTop = highlightedItem.offsetTop;
                const itemBottom = itemTop + highlightedItem.clientHeight;

                if (itemTop < containerTop) {
                    container.scrollTop = itemTop;
                } else if (itemBottom > containerBottom) {
                    container.scrollTop = itemBottom - container.clientHeight;
                }
            }
        }
    }, [highlightIndex, showSuggestions]);

    const suggestions = useMemo(() => {
        const searchStr = query.toLowerCase().trim();
        const searchTerms = searchStr ? searchStr.split(/\s+/) : [];

        const filtered = hardwareList.filter(item => {
            if (item.category !== entry.category) return false;
            if (!searchStr) return true;
            const searchableText = `${item.brand} ${item.model} ${CATEGORY_MAP[item.category] || item.category}`.toLowerCase();
            return searchTerms.every(term => searchableText.includes(term));
        });

        // 复合排序逻辑
        return filtered.sort((a, b) => {
            // 1. 价格为 0 的排在最后
            if (a.price === 0 && b.price !== 0) return 1;
            if (a.price !== 0 && b.price === 0) return -1;

            // 2. 推荐或折扣置顶
            const aIsSpecial = a.isRecommended || a.isDiscount;
            const bIsSpecial = b.isRecommended || b.isDiscount;
            if (aIsSpecial && !bIsSpecial) return -1;
            if (!aIsSpecial && bIsSpecial) return 1;

            // 3. 价格从低到高
            return a.price - b.price;
        }).slice(0, 20);
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
        // Stay on current row — don't call onEnter()
    };

    const handleCustomInput = (val: string) => {
        setQuery(val);
        onUpdate(entry.id, { customName: val, item: null });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        const dropdownOpen = showSuggestions && query.trim().length > 0 && suggestions.length > 0;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (dropdownOpen) { setHighlightIndex(prev => Math.min(prev + 1, suggestions.length - 1)); }
            else { onEnter(); } // Move to next row
        }
        else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (dropdownOpen) { setHighlightIndex(prev => Math.max(prev - 1, 0)); }
            else { onPrev(); } // Move to prev row
        }
        else if (e.key === 'Enter') {
            e.preventDefault();
            if (dropdownOpen) {
                selectItem(suggestions[highlightIndex]);
            } else {
                onEnter();
            }
        } else if (e.key === 'Tab') {
            e.preventDefault();
            priceRef.current?.focus();
            priceRef.current?.select();
        } else if (e.key === 'ArrowRight') {
            const target = e.target as HTMLInputElement;
            if (target.selectionStart === target.value.length && target.selectionEnd === target.value.length) {
                e.preventDefault();
                priceRef.current?.focus();
                priceRef.current?.select();
            }
        }
    };

    const handlePriceKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            // From price field, move to next row
            onEnter();
        } else if (e.key === 'ArrowLeft') {
            const target = e.target as HTMLInputElement;
            if (target.selectionStart === 0 && target.selectionEnd === 0) {
                e.preventDefault();
                inputRef.current?.focus();
                setTimeout(() => {
                    if (inputRef.current) {
                        const len = inputRef.current.value.length;
                        inputRef.current.setSelectionRange(len, len);
                    }
                }, 0);
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            onPrev();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            onEnter();
        }
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
        cpu: { bg: theme.bgLight, text: theme.primary },
        gpu: { bg: theme.bgLight, text: theme.primary },
        mainboard: { bg: theme.bgLight, text: theme.primary },
        ram: { bg: theme.bgLight, text: theme.primary },
        disk: { bg: theme.bgLight, text: theme.primary },
        power: { bg: theme.bgLight, text: theme.primary },
        cooling: { bg: theme.bgLight, text: theme.primary },
        case: { bg: theme.bgLight, text: theme.primary },
        monitor: { bg: theme.bgLight, text: theme.primary },
        mouse: { bg: theme.bgLight, text: theme.primary },
        keyboard: { bg: theme.bgLight, text: theme.primary },
        fan: { bg: theme.bgLight, text: theme.primary },
        accessory: { bg: theme.bgLight, text: theme.primary },
        default: { bg: theme.bgLight, text: theme.primary }
    };

    const style = CATEGORY_STYLES[entry.category] || CATEGORY_STYLES.default;

    return (
        <div className={`grid grid-cols-[75px_1fr_45px_50px_20px] gap-2 px-4 py-2.5 items-center group transition-colors relative ${showSuggestions ? 'z-[100]' : ''} ${entry.item ? `${theme.bgLight} dark:bg-opacity-20` : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>

            <div className={`flex items-center gap-3 font-bold text-sm transition-all ${theme.primary}`}>
                <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shadow-sm overflow-hidden relative group/icon ${entry.item?.image ? 'cursor-zoom-in hover:scale-110 hover:shadow-md' : ''} ${entry.item ? `bg-gradient-to-br ${theme.gradient} text-white shadow-md` : `${style.bg} ${style.text}`} ${!entry.item && 'group-hover:bg-white dark:group-hover:bg-slate-800 group-hover:shadow-md'}`}
                    onClick={() => entry.item?.image && onPreview(entry.item.image)}
                >
                    {getIconByCategory(entry.category)}
                </div>
                <span>{CATEGORY_MAP[entry.category]}</span>
            </div>

            <div className="relative">
                <input ref={inputRef} type="text" className={`w-full bg-transparent border-none p-0 text-slate-800 dark:text-slate-200 font-semibold text-base tracking-wide placeholder-slate-300 dark:placeholder-slate-600 focus:ring-0 focus:outline-none ${entry.item ? 'pr-14' : ''}`} placeholder={entry.category === 'accessory' ? "输入配件名称..." : `输入/搜索 ${CATEGORY_MAP[entry.category]}...`} value={query} onChange={e => { handleCustomInput(e.target.value); setShowSuggestions(true); setHighlightIndex(0); }} onFocus={() => { setShowSuggestions(true); loadCategoryProducts(); }} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} onKeyDown={handleKeyDown} />
                {entry.item && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
                        {entry.item.isRecommended && <span className="bg-orange-50 dark:bg-orange-500/20 text-orange-500 dark:text-orange-400 text-[9px] px-1 py-0.5 rounded-md font-bold border border-orange-100 dark:border-orange-500/30 flex items-center gap-0.5 whitespace-nowrap"><Sparkles size={10} /> 推荐</span>}
                        {entry.item.isDiscount && <span className="bg-rose-50 dark:bg-rose-500/20 text-rose-500 dark:text-rose-400 text-[9px] px-1 py-0.5 rounded-md font-bold border border-rose-100 dark:border-rose-500/30 whitespace-nowrap">特惠</span>}
                    </div>
                )}
                {showSuggestions && query.trim().length > 0 && (
                    <div ref={suggestionsRef} className={`absolute ${index >= 6 ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 right-0 bg-white dark:bg-slate-800 shadow-2xl rounded-xl border border-slate-100 dark:border-slate-700 z-[999] overflow-hidden max-h-[300px] overflow-y-auto`}>
                        {isLoading && <div className="px-4 py-3 text-xs text-slate-400 text-center flex items-center justify-center gap-2"><RefreshCw size={12} className="animate-spin" /> 正在加载产品库...</div>}
                        {!isLoading && suggestions.map((item, idx) => (
                            <div key={item.id} className={`px-4 py-2 text-sm flex justify-between cursor-pointer ${idx === highlightIndex ? `${theme.bgLight} ${theme.primary} transition-colors` : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`} onMouseDown={() => selectItem(item)}>
                                <span className="flex items-center">
                                    {item.brand} {item.model}
                                    {item.isRecommended && <span className="ml-1.5 bg-orange-50 dark:bg-orange-500/20 text-orange-500 dark:text-orange-400 text-[9px] px-1 py-0.5 rounded-md font-bold border border-orange-100 dark:border-orange-500/30 shrink-0 scale-90 origin-left flex items-center gap-0.5"><Sparkles size={10} /> 推荐</span>}
                                    {item.isDiscount && <span className="ml-1.5 bg-rose-50 dark:bg-rose-500/20 text-rose-500 dark:text-rose-400 text-[9px] px-1 py-0.5 rounded-md font-bold border border-rose-100 dark:border-rose-500/30 shrink-0 scale-90 origin-left">特惠</span>}
                                </span>
                                <span className="font-bold">¥{item.price}</span>
                            </div>
                        ))}
                        {!isLoading && suggestions.length === 0 && <div className="px-4 py-3 text-xs text-slate-400 text-center">未找到匹配项</div>}
                    </div>
                )}
            </div>

            <div className="flex justify-center">
                {entry.category === 'accessory' ? null : (
                    entry.isLockedQty ? <span className="text-slate-400 text-sm">× 1</span> : (
                        <div className="flex items-center bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                            <button onClick={() => onUpdate(entry.id, { quantity: Math.max(1, entry.quantity - 1) })} className={`text-slate-400 dark:text-slate-500 hover:${theme.primary} transition-colors px-1`}>-</button>
                            <span className="w-8 text-center text-sm dark:text-slate-200">{entry.quantity}</span>
                            <button onClick={() => onUpdate(entry.id, { quantity: entry.quantity + 1 })} className={`text-slate-400 dark:text-slate-500 hover:${theme.primary} transition-colors px-1`}>+</button>
                        </div>
                    )
                )}
            </div>

            <div className="flex items-center gap-1 justify-end">
                <span className="text-slate-300 dark:text-slate-600 text-sm">¥</span>
                <input ref={priceRef} type="text" className={`w-16 text-right bg-transparent border-b border-dashed border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-transparent ${theme.ring} focus:outline-none transition-colors ${entry.customPrice ? 'text-amber-600 font-bold' : 'text-slate-700 dark:text-slate-300'}`} value={displayPrice} onChange={(e) => handlePriceChange(e.target.value)} onFocus={(e) => e.target.select()} onKeyDown={handlePriceKeyDown} />
            </div>

            <div className="flex justify-end">
                <button onClick={() => onUpdate(entry.id, { item: null, customPrice: undefined, customName: '' })} className="text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors">
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

function StreamerWorkbench({
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
    const [activeTab, setActiveTab] = useState<'builder' | 'trends' | 'recycle' | 'leaderboard'>('builder');
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

    // === Performance Sidebar State ===
    const [simResult, setSimResult] = useState<{
        totalLuScore: number;
        totalPowerDraw: number;
        recommendedPower: number;
        isValid: boolean;
        errors: string[];
        warnings: string[];
    } | null>(null);
    const [fpsData, setFpsData] = useState<any[]>([]);
    const [sidebarResolution, setSidebarResolution] = useState<number>(1080);
    const [loadingFps, setLoadingFps] = useState(false);

    // Simulator: validate build for Lu Master score & power
    useEffect(() => {
        const itemIds = buildList
            .filter(b => b.item && !b.customName)
            .map(b => b.item!.id);
        if (itemIds.length === 0) { setSimResult(null); return; }

        import('../../services/api').then(({ ApiService }) => {
            ApiService.post('/simulator/validate', { item_ids: itemIds })
                .then((data: any) => {
                    setSimResult({
                        totalLuScore: data.total_lu_score,
                        totalPowerDraw: data.total_power_draw,
                        recommendedPower: data.recommended_power,
                        isValid: data.is_valid,
                        errors: data.errors || [],
                        warnings: data.warnings || [],
                    });
                })
                .catch(console.error);
        });
    }, [buildList]);

    // Simulator: FPS estimation using gamesFpsData (same source as Game FPS page)
    useEffect(() => {
        const cpuItem = buildList.find(b => b.category === 'cpu')?.item;
        const gpuItem = buildList.find(b => b.category === 'gpu')?.item;
        
        if (!cpuItem && !gpuItem) { 
            setFpsData(gamesList.slice(0, 8).map((gameName: string) => ({ name: gameName, fps: 0 })));
            setLoadingFps(false);
            return; 
        }

        setLoadingFps(true);
        const resMap: Record<number, Resolution> = { 1080: '1080p', 1440: '1440p', 2160: '4K' };
        const resKey = resMap[sidebarResolution] || '1080p';

        // Match CPU/GPU model names to keys in gamesFpsData
        const findKey = (item: HardwareItem | null | undefined, type: 'cpu' | 'gpu') => {
            if (!item) return null;
            const modelStr = `${item.brand} ${item.model}`.toUpperCase().replace(/[^A-Z0-9]/g, '');
            const modelOnly = item.model.toUpperCase().replace(/[^A-Z0-9]/g, '');
            
            for (const game of Object.keys(gamesFpsData)) {
                const entries = Object.keys(gamesFpsData[game][type] || {});
                for (const key of entries) {
                    const cleanKey = key.toUpperCase().replace(/[^A-Z0-9]/g, '');
                    if (modelStr.includes(cleanKey) || cleanKey.includes(modelStr) || modelOnly.includes(cleanKey) || cleanKey.includes(modelOnly)) {
                        return key;
                    }
                }
            }
            
            if (type === 'cpu') {
                const match = item.model.toUpperCase().match(/\d{4,5}[A-Z]{0,3}/);
                if (match) {
                    const identifier = match[0];
                    for (const game of Object.keys(gamesFpsData)) {
                        const entries = Object.keys(gamesFpsData[game][type] || {});
                        for (const key of entries) {
                            if (key.toUpperCase().includes(identifier)) return key;
                        }
                    }
                    const numMatch = identifier.match(/\d+/);
                    if (numMatch) {
                        for (const game of Object.keys(gamesFpsData)) {
                            const entries = Object.keys(gamesFpsData[game][type] || {});
                            for (const key of entries) {
                                if (key.toUpperCase().includes(numMatch[0])) return key;
                            }
                        }
                    }
                }
            }
            
            if (type === 'gpu') {
                const numMatch = item.model.match(/\d{4}/);
                if (numMatch) {
                    const num = numMatch[0];
                    const isTi = /TI/i.test(item.model);
                    const isSuper = /SUPER/i.test(item.model);
                    const isXTX = /XTX/i.test(item.model);
                    const isXT = /XT\b/i.test(item.model) && !isXTX;
                    const isGRE = /GRE/i.test(item.model);
                    
                    for (const game of Object.keys(gamesFpsData)) {
                        const entries = Object.keys(gamesFpsData[game][type] || {});
                        for (const key of entries) {
                            const upperKey = key.toUpperCase();
                            if (upperKey.includes(num)) {
                                const keyTi = /TI/i.test(upperKey);
                                const keySuper = /SUPER/i.test(upperKey);
                                const keyXTX = /XTX/i.test(upperKey);
                                const keyXT = /XT\b/i.test(upperKey) && !keyXTX;
                                const keyGRE = /GRE/i.test(upperKey);
                                
                                if (isTi === keyTi && isSuper === keySuper && isXTX === keyXTX && isXT === keyXT && isGRE === keyGRE) {
                                    return key;
                                }
                            }
                        }
                    }
                    for (const game of Object.keys(gamesFpsData)) {
                        const entries = Object.keys(gamesFpsData[game][type] || {});
                        for (const key of entries) {
                            if (key.toUpperCase().includes(num)) return key;
                        }
                    }
                }
            }
            
            return null;
        };

        const cpuKey = findKey(cpuItem, 'cpu');
        const gpuKey = findKey(gpuItem, 'gpu');

        const results: { name: string; fps: number; lowFps?: number }[] = [];
        const preferredGames = [
            "黑神话：悟空", "赛博朋克 2077", "绝地求生", "无畏契约", "反恐精英 2", 
            "英雄联盟", "Apex 英雄", "荒野大镖客：救赎 2", "三角洲行动", "刀塔 2", 
            "侠盗猎车手 5", "艾尔登法环", "守望先锋 2", "使命召唤：战区 2.0", "我的世界", 
            "魔兽世界", "逃离塔科夫", "彩虹六号：围攻", "堡垒之夜", "命运 2", 
            "腐蚀", "火箭联盟"
        ];
        
        for (const gameName of preferredGames) {
            const gd = gamesFpsData[gameName];
            if (!gd) continue;
            const cData = cpuKey ? gd.cpu[cpuKey]?.[resKey] : null;
            const gData = gpuKey ? gd.gpu[gpuKey]?.[resKey] : null;
            if (cData && gData) {
                results.push({ name: gameName, fps: Math.min(cData.avg, gData.avg), lowFps: Math.min(cData.low, gData.low) });
            } else if (gData) {
                results.push({ name: gameName, fps: gData.avg, lowFps: gData.low });
            } else if (cData) {
                results.push({ name: gameName, fps: cData.avg, lowFps: cData.low });
            }
        }

        setTimeout(() => {
            setFpsData(results.slice(0, 8));
            setLoadingFps(false);
        }, 300);
    }, [buildList, sidebarResolution]);

    const [showAiModal, setShowAiModal] = useState(false);
    const [showChatSettings, setShowChatSettings] = useState(false);

    const [isGeneratingPoster, setIsGeneratingPoster] = useState(false);
    const posterRef = useRef<HTMLDivElement>(null);

    const handleGeneratePoster = async () => {
        if (!posterRef.current || isGeneratingPoster) return;
        setIsGeneratingPoster(true);
        try {
            posterRef.current.style.display = 'block';
            await new Promise(resolve => setTimeout(resolve, 100)); // allow DOM refresh
            const canvas = await html2canvas(posterRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: null,
            });
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `小鱼主播装机单_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '')}.png`;
            link.click();
        } catch (error) {
            console.error('Failed to generate poster:', error);
            alert('生成图片失败，请稍后重试');
        } finally {
            if (posterRef.current) {
                posterRef.current.style.display = 'none';
            }
            setIsGeneratingPoster(false);
        }
    };

    const [isAiTyping, setIsAiTyping] = useState(false);
    const [aiResult, setAiResult] = useState<AIBuildResult | null>(null);
    const [ghostPos, setGhostPos] = useState({ x: 0, y: 0 });
    const [ghostStatus, setGhostStatus] = useState('');
    const { theme, currentThemeKey, setTheme: setCurrentThemeKey } = React.useContext(ThemeContext);

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

    const handlePrevFocus = (currentIndex: number) => {
        const prevInput = rowInputRefs.current[currentIndex - 1];
        if (prevInput) {
            prevInput.focus();
        }
    };

    const handleAiBuild = async (prompt: any, preResult?: any) => {
        try {
            let result = preResult;
            if (!result) {
                const request = typeof prompt === 'string' ? aiBuilder.parseRequest(prompt) : prompt;
                result = await aiBuilder.generateBuildWithLogs(request);
            }

            setShowAiModal(false);
            clearBuild();
            setIsAiTyping(true); // Enable Ghost

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

    const validPosterItems = buildList.filter(b => b.item || b.customName);

    return (
        <div className={`${theme.cardBg} rounded-xl shadow-xl ${theme.borderColor} border overflow-hidden relative transition-colors duration-300`}>
            
            {/* Hidden Poster Template */}
            <div style={{ position: 'fixed', top: -9999, left: -9999, zIndex: -9999 }}>
                <div ref={posterRef} className="bg-white text-slate-900 w-[600px] rounded-xl overflow-hidden font-sans border border-slate-200 shadow-xl relative">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/60 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-50/60 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="flex items-center gap-4 px-8 py-8 border-b border-indigo-50/50 relative z-10 bg-gradient-to-r from-white to-slate-50">
                        <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-900/20">
                            <Monitor size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">小鱼高端定制方案</h2>
                            <p className="text-indigo-600 font-bold opacity-80 uppercase tracking-widest text-[10px] mt-1">XIAOYU PC BUILDER</p>
                        </div>
                    </div>
                    <div className="px-8 py-6 flex flex-col gap-4 relative z-10">
                        {validPosterItems.map(row => {
                            const name = row.item ? `${row.item.brand} ${row.item.model}` : row.customName;
                            const prc = row.customPrice ?? (row.item?.price ?? 0);
                            return (
                                <div key={row.id} className="flex items-center gap-4 py-2 border-b border-slate-100 last:border-0 last:pb-0">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm relative overflow-hidden ${row.item ? 'bg-indigo-50 text-indigo-500 border border-indigo-100' : 'bg-slate-50 text-slate-400 border border-slate-200'}`}>
                                        {row.item?.image ? (
                                            <img src={row.item.image} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            getIconByCategory(row.category)
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                                            {CATEGORY_MAP[row.category]}
                                            {row.quantity > 1 ? ` × ${row.quantity}` : ''}
                                        </div>
                                        <div className="text-[14px] font-bold text-slate-800 leading-relaxed pb-1 truncate">
                                            {name}
                                        </div>
                                    </div>
                                    <div className="text-right pl-4">
                                        <div className="font-mono text-lg font-black text-slate-900 leading-relaxed pb-1">¥{(prc * (row.quantity || 1)).toLocaleString()}</div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    <div className="bg-slate-900 p-8 flex items-end justify-between relative z-10">
                        <div className="flex flex-col gap-1 text-white/50 text-[10px] uppercase font-bold tracking-widest">
                            <p>Powered by</p>
                            <p className="text-white/80">小鱼装机平台智能引擎</p>
                            <p className="text-white/40 text-[9px] mt-0.5 whitespace-nowrap tracking-wider">含 {((pricingStrategy?.serviceFeeRate || 0) * 100).toFixed(0)}% 装机售后服务费</p>
                            <p className="mt-2 font-mono">{new Date().toLocaleDateString('zh-CN')} 生成</p>
                        </div>
                        <div className="text-right">
                            <p className="text-white/50 text-xs font-bold mb-1">整机预算预估</p>
                            <div className="flex items-baseline gap-1 text-white">
                                <span className="text-2xl font-bold">¥</span>
                                <span className="text-5xl font-black font-mono tracking-tighter">{Math.floor(pricing.finalPrice).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Permission Overlay */}
            {!hasPermission && (
                <div className="fixed inset-0 z-[100] bg-[#0a0a0c]/50 backdrop-blur-[6px] flex items-center justify-center pb-10 px-4">
                    <div className="bg-[#0e0f13] p-8 rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.8),0_0_40px_rgba(212,175,55,0.1)] border border-[#362e1c] w-full max-w-xl transform scale-100 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#211a0c] via-[#d4af37] to-[#211a0c]"></div>
                        
                        {/* Close Button */}
                        <button 
                            onClick={() => window.location.href = '/'}
                            className="absolute top-5 right-5 text-[#8a7f6c] hover:text-white bg-[#1a1c23] hover:bg-rose-500/80 p-2 rounded-full transition-colors z-20 shadow-sm"
                            title="返回首页"
                        >
                            <X size={18} strokeWidth={2.5} />
                        </button>

                        {/* Header */}
                        <div className="text-center mb-8 relative pb-6 border-b border-[#2b2518]">
                            <div className="mx-auto w-16 h-16 mb-4 rounded-2xl bg-gradient-to-b from-[#1f1a10] to-[#0e0c08] flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] border border-[#40351f] relative overflow-hidden">
                                <Crown className="text-[#d4af37] filter drop-shadow-[0_0_8px_rgba(212,175,55,0.5)]" size={32} strokeWidth={1.5} />
                            </div>
                            <h3 className="text-3xl font-black text-white mb-3 tracking-tight flex items-center justify-center">
                                <span className="text-transparent bg-clip-text bg-gradient-to-b from-[#fce29f] to-[#b38b22]">商家专业版</span> <span className="text-[10px] bg-gradient-to-r from-[#d4af37] to-[#a3801c] text-[#0e0f13] px-2 py-0.5 rounded-sm align-top ml-2 font-black uppercase tracking-widest shadow-sm">PRO</span>
                            </h3>
                            <p className="text-[#968973] text-[13px] font-medium mt-3 leading-relaxed max-w-sm mx-auto">
                                极尽偷懒的商机获取方案，彻底释放您每天查价格、做报价、改清单的人工时间。
                            </p>
                        </div>

                        {/* Four Large Icons - Professional Stacked Layout */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                            <div className="flex items-center gap-4 bg-gradient-to-b from-[#1c1913] to-[#12100c] p-5 rounded-xl border border-[#302a1d] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-[#d4af37]/50 transition-all group">
                                <div className="bg-[#2a2416] text-[#cda434] p-3 rounded-xl border border-[#403520] group-hover:bg-[#d4af37] group-hover:text-[#0e0f13] transition-colors duration-300">
                                    <MonitorPlay size={22} strokeWidth={2} />
                                </div>
                                <div className="font-bold text-[#e0d6c8] text-sm tracking-wide">快速直播装机报价</div>
                            </div>
                            
                            <div className="flex items-center gap-4 bg-gradient-to-b from-[#1c1913] to-[#12100c] p-5 rounded-xl border border-[#302a1d] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-[#d4af37]/50 transition-all group">
                                <div className="bg-[#2a2416] text-[#cda434] p-3 rounded-xl border border-[#403520] group-hover:bg-[#d4af37] group-hover:text-[#0e0f13] transition-colors duration-300">
                                    <Recycle size={22} strokeWidth={2} />
                                </div>
                                <div className="font-bold text-[#e0d6c8] text-sm tracking-wide">二手回收快速报价</div>
                            </div>
                            
                            <div className="flex items-center gap-4 bg-gradient-to-b from-[#1c1913] to-[#12100c] p-5 rounded-xl border border-[#302a1d] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-[#d4af37]/50 transition-all group">
                                <div className="bg-[#2a2416] text-[#cda434] p-3 rounded-xl border border-[#403520] group-hover:bg-[#d4af37] group-hover:text-[#0e0f13] transition-colors duration-300">
                                    <BarChart3 size={22} strokeWidth={2} />
                                </div>
                                <div className="font-bold text-[#e0d6c8] text-sm tracking-wide">专业行情分析</div>
                            </div>
                            
                            <div className="flex items-center gap-4 bg-gradient-to-b from-[#1c1913] to-[#12100c] p-5 rounded-xl border border-[#302a1d] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-[#d4af37]/50 transition-all group">
                                <div className="bg-[#2a2416] text-[#cda434] p-3 rounded-xl border border-[#403520] group-hover:bg-[#d4af37] group-hover:text-[#0e0f13] transition-colors duration-300">
                                    <Clock size={22} strokeWidth={2} />
                                </div>
                                <div className="font-bold text-[#e0d6c8] text-sm tracking-wide">每日价格及时更新</div>
                            </div>
                        </div>

                        {/* Pricing and Action - 3 Tiers */}
                        <div className="grid grid-cols-3 gap-3 mb-6">
                            {/* Monthly */}
                            <div className="bg-[#14151a] rounded-xl py-5 px-2 border border-[#2b2518] text-center flex flex-col justify-center items-center hover:bg-[#1a1c23] transition-colors relative">
                                <div className="text-[11px] text-[#8a7f6c] font-bold tracking-widest mb-1.5 break-words max-w-[80px]">标准月度</div>
                                <div className="text-[#d8d0c3] font-black font-mono flex items-baseline justify-center">
                                    <span className="text-xs text-[#736856] mr-0.5">¥</span><span className="text-xl">99</span>
                                </div>
                            </div>

                            {/* Half-Year */}
                            <div className="bg-[#14151a] rounded-xl py-5 px-2 border border-[#2b2518] text-center flex flex-col justify-center items-center hover:bg-[#1a1c23] transition-colors relative">
                                <div className="text-[11px] text-[#8a7f6c] font-bold tracking-widest mb-1.5 break-words max-w-[80px]">超值半年</div>
                                <div className="text-[#d8d0c3] font-black font-mono flex items-baseline justify-center">
                                    <span className="text-xs text-[#736856] mr-0.5">¥</span><span className="text-xl">299</span>
                                </div>
                                <div className="text-[9px] text-[#6b6151] mt-1 font-medium">合 49.8/月</div>
                            </div>
                            
                            {/* Yearly - High End */}
                            <div className="bg-[#1a150c] rounded-xl py-5 px-2 border border-[#d4af37]/60 text-center flex flex-col justify-center items-center shadow-[0_0_25px_rgba(212,175,55,0.15)] relative overflow-hidden transform hover:-translate-y-1 transition-transform">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-[#d4af37] to-[#7a5c11] blur-2xl opacity-30 relative z-0"></div>
                                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#8f6d19] via-[#d4af37] to-[#8f6d19]"></div>
                                <div className="text-[11px] text-[#d4af37] font-black tracking-widest mb-1.5 relative z-10 break-words max-w-[80px]">旗舰首选</div>
                                <div className="text-white font-black font-mono flex items-baseline justify-center relative z-10">
                                    <span className="text-xs text-[#8f6d19] mr-0.5">¥</span><span className="text-xl text-transparent bg-clip-text bg-gradient-to-b from-[#ffedba] to-[#d4af37]">499</span>
                                </div>
                                <div className="text-[9px] text-[#9c844a] mt-1 font-bold relative z-10">
                                    合算每日 1.3元
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 text-center border-t border-[#2b2518] pt-6 relative">
                            <div className="text-[10px] text-[#8a7f6c] font-bold mb-3 uppercase tracking-[0.2em] relative inline-block px-4 bg-[#0e0f13] -mt-10 mb-5">业务直通专线 / 专属客服</div>
                            <div className="block mt-2">
                                <div className="inline-flex items-center justify-center bg-gradient-to-b from-[#1c1a17] to-[#12110e] text-[#d4af37] px-8 py-3 rounded-lg font-black font-mono text-xl tracking-widest border border-[#40351f] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_4px_10px_rgba(0,0,0,0.5)] cursor-pointer hover:bg-gradient-to-b hover:from-[#26221d] hover:to-[#1a1713] transition-all">
                                    151-6506-6053
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            )}

            <div className={!hasPermission ? 'filter blur-[2px] opacity-60 pointer-events-none select-none' : ''}>
                <GhostCursor x={ghostPos.x} y={ghostPos.y} active={isAiTyping} status={ghostStatus} />
                {isAiTyping && (
                    <div className={`absolute top-0 left-0 right-0 h-1 ${theme.bgLight} z-50`}>
                        <div className={`h-full ${theme.bgPrimary} animate-[loading_2s_ease-in-out_infinite]`}></div>
                    </div>
                )}
                <div className={`px-5 py-2.5 border-b ${theme.borderColor} ${theme.headerBg} flex items-center justify-between transition-colors duration-300`}>
                    <div className="flex items-center gap-3">
                        <h2 className={`text-base font-bold ${theme.textTitle} flex items-center gap-1.5`}>
                            <Zap className={theme.primary} size={18} />
                            {activeTab === 'builder' ? '专业装机控制台' : activeTab === 'recycle' ? '二手回收估价系统' : activeTab === 'trends' ? '全网行情雷达' : '硬件性价比天梯'}
                        </h2>
                        <div className="hidden md:flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm">
                            {(Object.keys(THEMES) as ThemeColor[]).map((tKey) => (
                                <button
                                    key={tKey}
                                    onClick={() => setCurrentThemeKey(tKey)}
                                    className={`w-3.5 h-3.5 rounded-full transition-all ${currentThemeKey === tKey ? 'scale-125 ring-2 ring-offset-1 ' + THEMES[tKey].bgLight.replace('bg-', 'ring-') : 'hover:scale-110 grayscale-[0.3] hover:grayscale-0'} ${THEMES[tKey].bgPrimary}`}
                                    title={THEMES[tKey].name}
                                />
                            ))}
                        </div>
                    </div>


                    <div className="flex gap-2">
                        {activeTab === 'builder' && (
                            <>
                                <button onClick={onOpenLibrary} className="flex items-center gap-1 px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold rounded-full transition-colors active:scale-95 border border-slate-200 dark:border-slate-700">
                                    <Zap size={12} className="text-amber-500" /> 快速装机
                                </button>
                                <button onClick={() => {
                                    if (onAiCheck && !onAiCheck()) return;
                                    setShowAiModal(true);
                                }} className={`flex items-center gap-1 px-3 py-1 bg-gradient-to-r ${theme.gradient} text-white text-[11px] font-bold rounded-full shadow-lg transition-all hover:-translate-y-0.5 active:scale-95 active:translate-y-0`}>
                                    <Sparkles size={12} /> AI装机
                                </button>
                            </>
                        )}
                        {activeTab === 'trends' && (
                            <div className="flex items-center px-4 py-1">
                                <span className={`text-xs font-bold ${theme.primary}`}>每日全网行情雷达</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* === Layout Container === */}
                <div className="flex flex-col md:flex-row flex-1">
                    {/* === Sidebar Navigation === */}
                    <div className="flex flex-row md:flex-col gap-2 p-3 md:p-4 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/20 md:w-[130px] lg:w-[160px] shrink-0 overflow-x-auto hide-scrollbar">
                        {/* 专业装机 Tab */}
                        <button
                            onClick={() => setActiveTab('builder')}
                            className={`group relative flex md:flex-col items-center gap-2 p-3 md:p-4 rounded-2xl transition-all duration-300 shrink-0 ${activeTab === 'builder'
                                ? `bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-600/50 text-indigo-600 dark:text-indigo-400 shadow-md ${theme.bgLight.replace('bg-', 'ring-')}/20 ring-4`
                                : 'bg-transparent text-slate-500 dark:text-slate-400 border-transparent hover:bg-white dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm'} border-2`}
                        >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${activeTab === 'builder' ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/10 group-hover:text-indigo-500'}`}>
                                <Zap size={20} />
                            </div>
                            <div className="text-left md:text-center shrink-0">
                                <div className={`text-sm md:text-sm font-black tracking-tight ${activeTab === 'builder' ? '' : 'text-slate-600 dark:text-slate-300'}`}>专业装机</div>
                                <div className={`text-[10px] md:text-[11px] font-medium mt-0.5 hidden lg:block ${activeTab === 'builder' ? 'text-indigo-500/80 dark:text-indigo-400/80' : 'text-slate-400 dark:text-slate-500'}`}>AI大模型驱动</div>
                            </div>
                            {activeTab === 'builder' && <div className="hidden md:block absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-indigo-500 rounded-r-md"></div>}
                        </button>

                        {/* 二手回收 Tab */}
                        <button
                            onClick={() => setActiveTab('recycle')}
                            className={`group relative flex md:flex-col items-center gap-2 p-3 md:p-4 rounded-2xl transition-all duration-300 shrink-0 ${activeTab === 'recycle'
                                ? `bg-white dark:bg-slate-800 border-teal-200 dark:border-teal-600/50 text-teal-600 dark:text-teal-400 shadow-md ring-4 ring-teal-100 dark:ring-teal-900/20`
                                : 'bg-transparent text-slate-500 dark:text-slate-400 border-transparent hover:bg-white dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm'} border-2`}
                        >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${activeTab === 'recycle' ? 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 group-hover:bg-teal-50 dark:group-hover:bg-teal-500/10 group-hover:text-teal-500'}`}>
                                <Recycle size={20} />
                            </div>
                            <div className="text-left md:text-center shrink-0">
                                <div className={`text-sm md:text-sm font-black tracking-tight ${activeTab === 'recycle' ? '' : 'text-slate-600 dark:text-slate-300'}`}>二手回收</div>
                                <div className={`text-[10px] md:text-[11px] font-medium mt-0.5 hidden lg:block ${activeTab === 'recycle' ? 'text-teal-500/80 dark:text-teal-400/80' : 'text-slate-400 dark:text-slate-500'}`}>底层残值测算</div>
                            </div>
                            {activeTab === 'recycle' && <div className="hidden md:block absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-teal-500 rounded-r-md"></div>}
                        </button>

                        {/* 行情分析 Tab */}
                        <button
                            onClick={() => setActiveTab('trends')}
                            className={`group relative flex md:flex-col items-center gap-2 p-3 md:p-4 rounded-2xl transition-all duration-300 shrink-0 ${activeTab === 'trends'
                                ? `bg-white dark:bg-slate-800 border-purple-200 dark:border-purple-600/50 text-purple-600 dark:text-purple-400 shadow-md ring-4 ring-purple-100 dark:ring-purple-900/20`
                                : 'bg-transparent text-slate-500 dark:text-slate-400 border-transparent hover:bg-white dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm'} border-2`}
                        >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${activeTab === 'trends' ? 'bg-gradient-to-br from-purple-500 to-violet-600 text-white shadow-lg shadow-purple-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 group-hover:bg-purple-50 dark:group-hover:bg-purple-500/10 group-hover:text-purple-500'}`}>
                                <TrendingUp size={20} />
                            </div>
                            <div className="text-left md:text-center shrink-0">
                                <div className={`text-sm md:text-sm font-black tracking-tight ${activeTab === 'trends' ? '' : 'text-slate-600 dark:text-slate-300'}`}>行情分析</div>
                                <div className={`text-[10px] md:text-[11px] font-medium mt-0.5 hidden lg:block ${activeTab === 'trends' ? 'text-purple-500/80 dark:text-purple-400/80' : 'text-slate-400 dark:text-slate-500'}`}>价格追踪监控</div>
                            </div>
                            {activeTab === 'trends' && <div className="hidden md:block absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-purple-500 rounded-r-md"></div>}
                        </button>

                        {/* 性价比榜 Tab */}
                        <button
                            onClick={() => setActiveTab('leaderboard')}
                            className={`group relative flex md:flex-col items-center gap-2 p-3 md:p-4 rounded-2xl transition-all duration-300 shrink-0 ${activeTab === 'leaderboard'
                                ? `bg-white dark:bg-slate-800 border-rose-200 dark:border-rose-600/50 text-rose-600 dark:text-rose-400 shadow-md ring-4 ring-rose-100 dark:ring-rose-900/20`
                                : 'bg-transparent text-slate-500 dark:text-slate-400 border-transparent hover:bg-white dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm'} border-2`}
                        >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${activeTab === 'leaderboard' ? 'bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-lg shadow-rose-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 group-hover:bg-rose-50 dark:group-hover:bg-rose-500/10 group-hover:text-rose-500'}`}>
                                <Crown size={20} />
                            </div>
                            <div className="text-left md:text-center shrink-0">
                                <div className={`text-sm md:text-sm font-black tracking-tight ${activeTab === 'leaderboard' ? '' : 'text-slate-600 dark:text-slate-300'}`}>性价比榜</div>
                                <div className={`text-[10px] md:text-[11px] font-medium mt-0.5 hidden lg:block ${activeTab === 'leaderboard' ? 'text-rose-500/80 dark:text-rose-400/80' : 'text-slate-400 dark:text-slate-500'}`}>核心性能战力</div>
                            </div>
                            {activeTab === 'leaderboard' && <div className="hidden md:block absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-rose-500 rounded-r-md"></div>}
                        </button>
                    </div>

                    {/* === Main Content Area === */}
                    <div className="flex-1 min-w-0 bg-white dark:bg-slate-900/50 flex flex-col relative">

                {activeTab === 'builder' ? (
                    <>
                    <div className="flex flex-col xl:flex-row">
                    {/* === Left: Config Table === */}
                    <div className="flex-1 min-w-0 max-w-[1550px]">
                        <div className="overflow-x-auto">
                            <div className="min-w-[600px]">
                                <div className={`grid grid-cols-[75px_1fr_45px_50px_20px] gap-2 px-4 py-1 ${theme.tableHeaderBg} border-b ${theme.borderColor} text-xs font-bold ${theme.primary} uppercase tracking-widest transition-colors duration-300`}>
                            <div>类别</div>
                            <div>硬件型号 (智能搜索 / 自定义)</div>
                            <div className="text-center">数量</div>
                            <div className="text-right">价格</div>
                            <div></div>
                        </div>

                        <div className={`divide-y ${theme.divider} transition-colors duration-300`}>
                            <AnimatePresence mode="popLayout">
                                {buildList.map((entry, index) => (
                                    <motion.div
                                        key={entry.id}
                                        layout
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.3, delay: index * 0.03, type: "spring", stiffness: 300, damping: 25 }}
                                    >
                                        <StreamerRow index={index} entry={entry} onUpdate={onUpdate} ref={(el) => (rowInputRefs.current[index] = el)} onEnter={() => handleNextFocus(index)} onPrev={() => handlePrevFocus(index)} onPreview={setPreviewImage} />
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                <div className={`${theme.footerBg} border-t ${theme.borderColor} px-4 py-3 flex flex-col md:flex-row justify-between items-center gap-4 transition-colors duration-300`}>
                    <div className="flex flex-col gap-0.5">
                        <div className="flex items-baseline gap-2">
                            <span className={`text-xl ${theme.textMuted} font-bold whitespace-nowrap line-through decoration-2`}>¥{Math.floor(pricing.standardPrice)}</span>
                            <div className="flex items-baseline gap-0.5">
                                <span className={`text-xl font-bold ${theme.textTitle}`}>¥</span>
                                <span className={`text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r ${theme.gradient} font-mono tracking-tight`}>
                                    <RollingPrice value={pricing.finalPrice} />
                                </span>
                            </div>
                            <span className="bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap self-start mt-1.5">省 ¥{pricing.savedAmount}</span>

                            <div className="relative group w-[100px] ml-1 self-center">
                                <select value={discountRate} onChange={(e) => setDiscountRate(parseFloat(e.target.value))} className={`w-full appearance-none bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300 text-[10px] font-bold py-1 pl-2 pr-6 rounded-md focus:outline-none focus:ring-2 ${theme.ring}/20 transition-all cursor-pointer text-center`}>
                                    {strategies.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                </select>
                                <ChevronDown className="absolute right-2 top-1.5 text-slate-400 dark:text-slate-500 pointer-events-none" size={12} />
                            </div>
                        </div>
                        <div className={`text-[10px] ${theme.textMuted} font-black pl-0.5 uppercase tracking-tight`}>
                            标准价格包含 {((pricingStrategy?.serviceFeeRate || 0) * 100).toFixed(0)}% 装机售后服务费
                        </div>
                    </div>

                    <div className="flex flex-col items-center justify-center">
                        {/* Discount Select Moved */}
                    </div>

                    <div className="flex items-center gap-2 h-10">
                        <button onClick={clearBuild} className="h-full aspect-square flex items-center justify-center bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg transition-all active:scale-95 border border-rose-100 dark:border-rose-500/20" title="清空配置">
                            <Trash2 size={18} />
                        </button>
                        <button onClick={handleSave} className="h-full aspect-square flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-all active:scale-95 border border-slate-200 dark:border-slate-700" title="保存配置">
                            <Save size={18} />
                        </button>
                        <button onClick={handleGeneratePoster} disabled={isGeneratingPoster} className="h-full aspect-square flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-all active:scale-95 border border-slate-200 dark:border-slate-700" title="生成海报">
                            {isGeneratingPoster ? <RefreshCw size={18} className="animate-spin" /> : <Download size={18} />}
                        </button>
                        <button onClick={handleShareTrigger} disabled={isSharing} className={`h-full aspect-square flex items-center justify-center ${theme.bgPrimary} hover:opacity-90 disabled:opacity-50 text-white rounded-lg shadow-md transition-all active:scale-95`} title="分享配置">
                            {isSharing ? <RefreshCw size={18} className="animate-spin" /> : <Share2 size={18} />}
                        </button>
                    </div>
                </div>



                {showAiModal && <AiGenerateModal onClose={() => setShowAiModal(false)} onSubmit={handleAiBuild} />}
                {showChatSettings && <ChatSettingsModal onClose={() => setShowChatSettings(false)} />}

                {/* AI Result Section */}
                {
                    aiResult && (
                        <div className={`mt-8 bg-white dark:bg-slate-900 rounded-2xl shadow-lg border ${theme.bgLight.replace('bg-', 'border-')} overflow-hidden animate-fade-in relative z-10 w-full mb-12`}>
                            <div className={`bg-gradient-to-r ${theme.gradient} px-6 py-4 flex items-center justify-between`}>
                                <div className="flex items-center gap-3 text-white">
                                    <Sparkles size={18} className="animate-pulse" />
                                    <h3 className="font-bold text-lg tracking-wide">AI 装机评测报告</h3>
                                    {aiResult.evaluation && (
                                        <span className="ml-2 px-2.5 py-0.5 bg-white/20 rounded-full text-sm font-bold backdrop-blur-sm">
                                            {aiResult.evaluation.verdict}
                                        </span>
                                    )}
                                </div>
                                <button onClick={() => setAiResult(null)} className="text-white/80 hover:text-white transition-colors">
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="p-6 space-y-5">
                                {/* Score + Description */}
                                <div className="flex gap-5 items-start">
                                    {aiResult.evaluation && (
                                        <div className="shrink-0 w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 shadow-md border border-slate-200 dark:border-slate-600 flex flex-col items-center justify-center">
                                            <span className={`text-3xl font-black ${aiResult.evaluation.score >= 90 ? 'text-emerald-600 dark:text-emerald-400' :
                                                aiResult.evaluation.score >= 75 ? theme.primary :
                                                    aiResult.evaluation.score >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
                                                }`}>{aiResult.evaluation.score}</span>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">分</span>
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed font-medium">{aiResult.description}</p>
                                    </div>
                                </div>

                                {/* Pros & Cons */}
                                {aiResult.evaluation && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {aiResult.evaluation.pros?.length > 0 && (
                                            <div className="bg-emerald-50/80 dark:bg-emerald-500/10 rounded-2xl p-4 border border-emerald-100 dark:border-emerald-500/20">
                                                <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-2.5">✓ 优点</h4>
                                                <ul className="space-y-1.5">
                                                    {aiResult.evaluation.pros.map((p: string, i: number) => (
                                                        <li key={i} className="text-sm text-emerald-800 dark:text-emerald-300 font-medium flex items-start gap-2">
                                                            <span className="text-emerald-500 mt-0.5 shrink-0">•</span> {p}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        {aiResult.evaluation.cons?.length > 0 && (
                                            <div className="bg-amber-50/80 dark:bg-amber-500/10 rounded-2xl p-4 border border-amber-100 dark:border-amber-500/20">
                                                <h4 className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-2.5">⚠ 不足</h4>
                                                <ul className="space-y-1.5">
                                                    {aiResult.evaluation.cons.map((c: string, i: number) => (
                                                        <li key={i} className="text-sm text-amber-800 dark:text-amber-300 font-medium flex items-start gap-2">
                                                            <span className="text-amber-500 mt-0.5 shrink-0">•</span> {c}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Detailed Summary */}
                                {aiResult.evaluation?.summary && (
                                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-700/50">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">📋 详细点评</h4>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">
                                            {aiResult.evaluation.summary}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                }
                    </div>

                    {/* === Right: Performance Sidebar === */}
                    <div className="hidden xl:flex flex-col gap-4 w-[280px] shrink-0 border-l border-slate-200 dark:border-slate-700/80 p-4 bg-slate-50/50 dark:bg-slate-800/20 xl:sticky xl:top-0 xl:max-h-screen overflow-y-auto hide-scrollbar">

                        {/* Module 1: 鲁大师跑分 */}
                        <div className={`bg-white dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 shadow-sm rounded-2xl p-4 relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-600 transition-colors flex justify-between items-center`}>
                            <div className={`absolute right-0 top-0 w-32 h-32 ${theme.bgPrimary} opacity-5 dark:opacity-10 rounded-full blur-3xl pointer-events-none translate-x-1/2 -translate-y-1/2 group-hover:opacity-10 dark:group-hover:opacity-20 transition-all duration-500`}></div>
                            <div className={`absolute -right-4 -bottom-4 opacity-5 ${theme.primary} group-hover:scale-110 group-hover:opacity-10 transition-all duration-500 delay-75`}><Activity size={48} strokeWidth={1.5}/></div>
                            <div className="relative z-10">
                                <h4 className="text-[12px] font-extrabold text-slate-500 dark:text-slate-400 mb-0.5 flex items-center gap-1.5"><Activity size={14} className={theme.primary}/> 综合性能跑分</h4>
                                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                    <span className={`w-1.5 h-1.5 rounded-full ${theme.bgPrimary} inline-block animate-pulse`}></span>
                                    基于鲁大师评测
                                </div>
                            </div>
                            <div className={`text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r ${theme.gradient} font-display tracking-tighter relative z-10`}>
                                {simResult && simResult.totalLuScore > 0 ? <BouncyNumber value={simResult.totalLuScore} /> : '---'}
                            </div>
                        </div>

                        {/* Module 2: 整机功耗 */}
                        <div className="bg-white dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 shadow-sm rounded-2xl p-4 relative overflow-hidden group hover:border-amber-300 dark:hover:border-amber-500/50 transition-colors flex justify-between items-center">
                            <div className="absolute left-0 bottom-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 translate-y-1/2 group-hover:bg-amber-500/20 transition-all duration-500"></div>
                            <div className="absolute -right-2 -bottom-2 opacity-5 text-amber-500 group-hover:scale-110 group-hover:opacity-10 transition-all duration-500 delay-75"><Zap size={48} strokeWidth={1.5}/></div>
                            <div className="relative z-10">
                                <h4 className="text-[12px] font-extrabold text-slate-500 dark:text-slate-400 mb-0.5 flex items-center gap-1.5"><Zap size={14} className="text-amber-500"/> 系统峰值功耗</h4>
                                {simResult && simResult.totalPowerDraw > 0 ? (
                                    <div className="text-[9px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                        推荐电源 {Math.ceil(simResult.totalPowerDraw * 1.3 / 50) * 50}W+
                                    </div>
                                ) : (
                                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 inline-block"></span>
                                        完善配置后可见
                                    </div>
                                )}
                            </div>
                            <div className="text-2xl font-black text-slate-800 dark:text-slate-200 font-display tracking-tighter flex items-baseline relative z-10">
                                {simResult && simResult.totalPowerDraw > 0 ? <><BouncyNumber value={simResult.totalPowerDraw} /><span className="text-sm ml-0.5 text-slate-500 font-bold">W</span></> : '---'}
                            </div>
                        </div>

                        {/* Module 3: 游戏帧率 */}
                        <div className={`bg-white dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 shadow-sm rounded-2xl p-5 relative overflow-hidden flex-1 flex flex-col group hover:border-slate-300 dark:hover:border-slate-600 transition-colors`}>
                            <div className={`absolute right-0 top-0 w-48 h-48 ${theme.bgPrimary} opacity-5 dark:opacity-10 rounded-full blur-3xl pointer-events-none translate-x-1/2 -translate-y-1/2 group-hover:opacity-10 dark:group-hover:opacity-20 transition-all duration-500`}></div>
                            <div className="flex items-center justify-between mb-4 relative z-10">
                                <h3 className="font-extrabold text-slate-900 dark:text-white text-[13px] flex items-center gap-1.5 tracking-wide">
                                    <Gamepad2 size={16} className={theme.primary} />
                                    游戏FPS
                                </h3>
                                <div className="flex gap-0.5 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                                    {[1080, 1440, 2160].map(res => (
                                        <button
                                            key={res}
                                            onClick={() => setSidebarResolution(res)}
                                            className={`text-[9px] font-black px-2.5 py-1 rounded-md transition-all uppercase tracking-wider ${sidebarResolution === res ? `${theme.bgPrimary} text-white shadow-sm scale-105` : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700/50'}`}
                                        >
                                            {res === 1080 ? '1080P' : res === 1440 ? '2K' : '4K'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-3.5 relative z-10 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                                {loadingFps ? (
                                    <div className={`py-8 flex flex-col items-center justify-center ${theme.primary} gap-3 h-full`}>
                                        <RefreshCw size={24} className="animate-spin opacity-80" />
                                        <div className="text-[10px] font-black tracking-widest uppercase opacity-80">AI 性能分析中...</div>
                                    </div>
                                ) : fpsData.length > 0 ? (
                                    fpsData.map((item, idx) => (
                                        <div key={idx} className="group/item">
                                            <div className="flex justify-between items-end text-[11px] mb-1.5">
                                                <span className="font-bold text-slate-700 dark:text-slate-300 group-hover/item:text-slate-900 dark:group-hover/item:text-white transition-colors flex items-center gap-1.5 flex-1 min-w-0 pr-2">
                                                    <img src={`/images/games/icons/${item.name}.png`} alt="" className="w-4 h-4 rounded-[4px] object-cover bg-slate-100 dark:bg-slate-800 shadow-sm shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                                    <span className="truncate">{item.name}</span>
                                                </span>
                                                <div className="flex items-baseline gap-2 justify-end shrink-0">
                                                    {item.lowFps ? (
                                                        <span className="flex items-baseline gap-0.5 text-slate-400 w-10 justify-end">
                                                            <span className="text-[9px] uppercase font-bold tracking-wider opacity-80">Low</span>
                                                            <span className="font-mono text-xs font-bold">{item.lowFps}</span>
                                                        </span>
                                                    ) : <span className="w-10"></span>}
                                                    <div className="flex items-baseline gap-0.5 ml-1 w-14 justify-end">
                                                        <span className={`font-display font-black text-sm ${
                                                            item.fps === 0 ? 'text-slate-400 dark:text-slate-500' :
                                                            item.fps >= 200 ? 'text-emerald-500 dark:text-emerald-400' : 
                                                            item.fps >= 100 ? 'text-blue-500 dark:text-blue-400' :
                                                            item.fps >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                                                            'text-red-500 dark:text-red-400'
                                                        }`}>{item.fps}</span>
                                                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">FPS</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden border border-slate-200/50 dark:border-slate-700/50 relative">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden ${
                                                        item.fps === 0 ? 'bg-slate-300 dark:bg-slate-600' :
                                                        item.fps >= 200 ? 'bg-emerald-500' : 
                                                        item.fps >= 100 ? 'bg-blue-500' :
                                                        item.fps >= 60 ? 'bg-yellow-500' :
                                                        'bg-red-500'
                                                    }`}
                                                    style={{ width: `${Math.min(100, (item.fps / 240) * 100)}%` }}
                                                >
                                                    {item.fps > 0 && <div className="absolute top-0 bottom-0 left-0 right-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 animate-[shimmer_2s_infinite]"></div>}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-8 flex flex-col items-center justify-center text-slate-500 gap-3 opacity-60 h-full">
                                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700"><Gamepad2 size={24} className="text-slate-400" /></div>
                                        <div className="text-[10px] font-black text-slate-400 mt-1 tracking-wide">添加 CPU/显卡 后展示帧率</div>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                    </div>
                </>
                ) : activeTab === 'trends' ? (
                    <div className="min-h-[600px] w-full bg-slate-50/50 dark:bg-slate-900/50 p-2 md:p-6 overflow-hidden">
                        <PriceTrendChart hideSummaryPanel={true} />
                    </div>
                ) : activeTab === 'leaderboard' ? (
                    <div className="min-h-[600px] w-full bg-slate-50/50 dark:bg-slate-900/50 relative overflow-hidden">
                        <HardwareLeaderboard />
                    </div>
                ) : (
                    <div className="min-h-[600px] w-full bg-slate-50/50 dark:bg-slate-900/50 relative overflow-hidden">
                        <StreamerRecycleTab />
                    </div>
                )}
                </div>
            </div>
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


export default function StreamerWorkbenchWrapper(props: any) {
    const [themeKey, setThemeKey] = useState<ThemeColor>('default');
    return (
        <ThemeContext.Provider value={{ theme: THEMES[themeKey], currentThemeKey: themeKey, setTheme: setThemeKey }}>
            <StreamerWorkbench {...props} />
        </ThemeContext.Provider>
    );
}


