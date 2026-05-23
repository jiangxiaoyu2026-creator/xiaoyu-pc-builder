import React, { useState, useRef, useMemo, useEffect } from 'react';

import { X, Sparkles, RefreshCw } from 'lucide-react';
import { BuildEntry, HardwareItem } from '../../types/clientTypes';
import { CATEGORY_MAP } from '../../data/clientData';
import { storage } from '../../services/storage';
import { getIconByCategory } from './Shared';
import { ThemeContext } from './StreamerThemeContext';

export interface StreamerRowHandle {
    simulateType: (text: string) => void;
    simulateArrowDown: () => void;
    simulateEnter: () => void;
    focus: () => void;
    setValue: (val: string) => void;
    closeSuggestions: () => void;
}

const PIXEL_ICON_PATTERNS: Record<string, string[]> = {
    cpu: [
        '10101',
        '01110',
        '11111',
        '01110',
        '10101',
    ],
    mainboard: [
        '11110',
        '10010',
        '11110',
        '10100',
        '11111',
    ],
    gpu: [
        '11110',
        '10011',
        '11110',
        '00100',
        '01110',
    ],
    ram: [
        '11111',
        '10101',
        '11111',
        '01010',
        '01010',
    ],
    disk: [
        '11111',
        '10001',
        '10101',
        '10001',
        '11111',
    ],
    power: [
        '00100',
        '01110',
        '11100',
        '00110',
        '00100',
    ],
    cooling: [
        '00100',
        '10101',
        '01110',
        '10101',
        '00100',
    ],
    fan: [
        '10001',
        '01010',
        '00100',
        '01010',
        '10001',
    ],
    monitor: [
        '11111',
        '10001',
        '10001',
        '11111',
        '00100',
    ],
    case: [
        '11111',
        '10001',
        '10101',
        '10001',
        '11111',
    ],
    default: [
        '01110',
        '10001',
        '10101',
        '10001',
        '01110',
    ],
};

function PixelCategoryIcon({ category }: { category: string }) {
    const pattern = PIXEL_ICON_PATTERNS[category] || PIXEL_ICON_PATTERNS.default;
    return (
        <div className="grid grid-cols-5 gap-[1px] drop-shadow-[2px_2px_0_#050505]" aria-hidden="true">
            {pattern.flatMap((row, y) =>
                row.split('').map((cell, x) => (
                    <span
                        key={`${y}-${x}`}
                        className={`h-[3px] w-[3px] ${cell === '1' ? 'bg-current' : 'bg-transparent'}`}
                    />
                ))
            )}
        </div>
    );
}

export const StreamerRow = React.forwardRef<StreamerRowHandle, { entry: BuildEntry, index: number, onUpdate: (id: string, d: Partial<BuildEntry>) => void, onEnter: () => void, onPrev: () => void, onPreview: (img: string) => void }>(({ entry, index, onUpdate, onEnter, onPrev, onPreview }, ref) => {
    const { theme, isLiveMode, liveStyle, liveStyleConfig } = React.useContext(ThemeContext);
    const isPixelLiveStyle = liveStyle.startsWith('pixel');
    const [query, setQuery] = useState(entry.customName || entry.item?.model || '');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [highlightIndex, setHighlightIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const qtyRef = useRef<HTMLInputElement>(null);
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
            if (dropdownOpen) {
                if (highlightIndex < suggestions.length - 1) {
                    setHighlightIndex(prev => prev + 1);
                } else {
                    setShowSuggestions(false);
                    onEnter();
                }
            }
            else { onEnter(); } // Move to next row
        }
        else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (dropdownOpen) {
                if (highlightIndex > 0) {
                    setHighlightIndex(prev => prev - 1);
                } else {
                    setShowSuggestions(false);
                    onPrev();
                }
            }
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
            if (qtyRef.current && !entry.isLockedQty) {
                qtyRef.current.focus();
                qtyRef.current.select();
            } else {
                priceRef.current?.focus();
                priceRef.current?.select();
            }
        } else if (e.key === 'ArrowRight') {
            const target = e.target as HTMLInputElement;
            if (target.selectionStart === target.value.length && target.selectionEnd === target.value.length) {
                e.preventDefault();
                if (qtyRef.current && !entry.isLockedQty) {
                    qtyRef.current.focus();
                    qtyRef.current.select();
                } else {
                    priceRef.current?.focus();
                    priceRef.current?.select();
                }
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
                if (qtyRef.current && !entry.isLockedQty) {
                    qtyRef.current.focus();
                    qtyRef.current.select();
                } else {
                    inputRef.current?.focus();
                    setTimeout(() => {
                        if (inputRef.current) {
                            const len = inputRef.current.value.length;
                            inputRef.current.setSelectionRange(len, len);
                        }
                    }, 0);
                }
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            onPrev();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            onEnter();
        }
    };

    const handleQtyKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === 'Tab') {
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
            onUpdate(entry.id, { quantity: entry.quantity + 1 });
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            onUpdate(entry.id, { quantity: Math.max(1, entry.quantity - 1) });
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
                selectItem(suggestions[highlightIndex]);
            } else {
                onEnter();
            }
        },
        closeSuggestions: () => {
            setShowSuggestions(false);
        }
    }));

    const handlePriceChange = (newPrice: string) => {
        const num = parseInt(newPrice);
        if (!isNaN(num)) onUpdate(entry.id, { customPrice: num });
        else onUpdate(entry.id, { customPrice: 0 });
    };

    const displayPrice = entry.customPrice ?? entry.item?.price ?? 0;
    const hasRowContent = Boolean(entry.item || entry.customName || entry.customPrice || entry.quantity > 1);

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
    const canEditQuantity = !entry.isLockedQty || ['ram', 'disk', 'fan'].includes(entry.category);
    const clearEntry = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        onUpdate(entry.id, { item: null, customPrice: undefined, customName: undefined, quantity: 1 });
    };

    return (
        <div className={`grid ${isLiveMode ? 'grid-cols-[72px_minmax(0,1fr)_44px_76px] h-full px-3 py-0' : 'grid-cols-[68px_minmax(0,1fr)_56px_64px_18px] px-3 py-2'} gap-2 items-center group transition-colors relative ${showSuggestions ? 'z-[100]' : ''} ${isLiveMode ? 'bg-transparent hover:bg-white/[0.04] transition-colors' : (entry.item ? `${theme.bgLight} dark:bg-opacity-20` : 'hover:bg-slate-50 dark:hover:bg-slate-800/50')}`}>
            <div className={`flex items-center gap-1.5 font-bold whitespace-nowrap ${isLiveMode ? 'text-[14px]' : 'text-[13px]'} transition-all ${isLiveMode ? liveStyleConfig.categoryText : theme.primary}`}>
                <div
                    className={`${isLiveMode ? `w-8 h-8 ${isPixelLiveStyle ? `rounded-none border-2 ${liveStyleConfig.stampBorder} ${liveStyleConfig.panelBg} shadow-[2px_2px_0_#050505]` : 'rounded-lg'}` : 'w-7 h-7 rounded-lg'} flex items-center justify-center transition-all shadow-sm overflow-hidden relative group/icon ${entry.item?.image ? 'cursor-zoom-in hover:scale-110 hover:shadow-md' : ''} ${entry.item ? (isLiveMode ? liveStyleConfig.accentText + (isPixelLiveStyle ? '' : ' bg-white/[0.06] border border-white/10') : `bg-gradient-to-br ${theme.gradient} text-white shadow-md`) : (isLiveMode ? liveStyleConfig.mutedText + (isPixelLiveStyle ? '' : ' bg-white/[0.04]') : `${style.bg} ${style.text}`)} ${!entry.item && !isLiveMode && 'group-hover:bg-white dark:group-hover:bg-slate-800 group-hover:shadow-md'}`}
                    onClick={() => entry.item?.image && onPreview(entry.item.image)}
                >
                    {isLiveMode && isPixelLiveStyle ? <PixelCategoryIcon category={entry.category} /> : getIconByCategory(entry.category)}
                </div>
                <span>{CATEGORY_MAP[entry.category]}</span>
            </div>

            <div className="relative">
                <input ref={inputRef} type="text" className={`w-full bg-transparent border-none p-0 ${isLiveMode ? liveStyleConfig.modelText + ' text-[20px]' : 'text-slate-800 dark:text-slate-200 text-[15px]'} font-semibold tracking-wide ${isLiveMode ? 'placeholder-white/20' : 'placeholder-slate-300 dark:placeholder-slate-600'} focus:ring-0 focus:outline-none ${isLiveMode ? (hasRowContent ? 'pr-8' : 'pr-2') : (entry.item ? 'pr-14' : '')}`} placeholder={isLiveMode ? `${CATEGORY_MAP[entry.category]}...` : (entry.category === 'accessory' ? "输入配件名称..." : `输入/搜索 ${CATEGORY_MAP[entry.category]}...`)} value={query} onChange={e => { handleCustomInput(e.target.value); setShowSuggestions(true); setHighlightIndex(0); }} onFocus={() => { setShowSuggestions(true); loadCategoryProducts(); }} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} onKeyDown={handleKeyDown} />
                {isLiveMode && hasRowContent && (
                    <button
                        type="button"
                        onClick={clearEntry}
                        className={`absolute right-0 top-1/2 -translate-y-1/2 ${liveStyleConfig.mutedText} hover:text-red-400 w-7 h-7 rounded-md hover:bg-white/10 flex items-center justify-center opacity-70 group-hover:opacity-100 focus:opacity-100 transition-all`}
                        title="清空这一行"
                    >
                        <X size={18} />
                    </button>
                )}
                {entry.item && !isLiveMode && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
                        {entry.item.isRecommended && <span className="bg-orange-50 dark:bg-orange-500/20 text-orange-500 dark:text-orange-400 text-[9px] px-1 py-0.5 rounded-md font-bold border border-orange-100 dark:border-orange-500/30 flex items-center gap-0.5 whitespace-nowrap"><Sparkles size={10} /> 推荐</span>}
                        {entry.item.isDiscount && <span className="bg-rose-50 dark:bg-rose-500/20 text-rose-500 dark:text-rose-400 text-[9px] px-1 py-0.5 rounded-md font-bold border border-rose-100 dark:border-rose-500/30 whitespace-nowrap">特惠</span>}
                    </div>
                )}
                {showSuggestions && query.trim().length > 0 && (
                    <div ref={suggestionsRef} className={`absolute ${index >= 6 ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 right-0 ${isLiveMode ? `${isPixelLiveStyle ? `${liveStyleConfig.panelBg} ${liveStyleConfig.stampBorder} shadow-[5px_5px_0_#050505]` : 'bg-gray-900 border-gray-700 shadow-black/50'}` : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'} shadow-2xl ${isPixelLiveStyle && isLiveMode ? 'rounded-none border-2' : 'rounded-xl border'} z-[999] overflow-hidden max-h-[300px] overflow-y-auto`}>
                        {isLoading && <div className={`px-4 py-3 ${isLiveMode ? 'text-[14px] text-gray-400' : 'text-xs text-slate-400'} text-center flex items-center justify-center gap-2`}><RefreshCw size={12} className="animate-spin" /> 正在加载产品库...</div>}
                        {!isLoading && suggestions.map((item, idx) => (
                            <div key={item.id} className={`px-4 ${isLiveMode ? 'py-2.5 text-[15px]' : 'py-2 text-sm'} flex justify-between cursor-pointer ${idx === highlightIndex ? (isLiveMode ? (isPixelLiveStyle ? `${liveStyleConfig.glowBg} text-gray-950` : 'bg-gray-800 text-white') : `${theme.bgLight} ${theme.primary} transition-colors`) : (isLiveMode ? (isPixelLiveStyle ? `${liveStyleConfig.modelText} hover:brightness-110` : 'text-gray-300 hover:bg-gray-800') : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50')}`} onMouseDown={() => selectItem(item)}>
                                <span className="flex items-center">
                                    {item.brand} {item.model}
                                    {item.isRecommended && <span className={`ml-1.5 ${isLiveMode ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 'bg-orange-50 dark:bg-orange-500/20 text-orange-500 dark:text-orange-400 border-orange-100 dark:border-orange-500/30'} text-[9px] px-1 py-0.5 rounded-md font-bold border shrink-0 scale-90 origin-left flex items-center gap-0.5`}><Sparkles size={10} /> 推荐</span>}
                                    {item.isDiscount && <span className={`ml-1.5 ${isLiveMode ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-rose-50 dark:bg-rose-500/20 text-rose-500 dark:text-rose-400 border-rose-100 dark:border-rose-500/30'} text-[9px] px-1 py-0.5 rounded-md font-bold border shrink-0 scale-90 origin-left`}>特惠</span>}
                                </span>
                                <span className={`font-bold ${isLiveMode ? liveStyleConfig.priceText : ''}`}>¥{item.price}</span>
                            </div>
                        ))}
                        {!isLoading && suggestions.length === 0 && <div className={`px-4 py-3 ${isLiveMode ? 'text-[14px] text-gray-500' : 'text-xs text-slate-400'} text-center`}>未找到匹配项</div>}
                    </div>
                )}
            </div>

            <div className="flex justify-center">
                {entry.category === 'accessory' ? null : (
                    !canEditQuantity ? <span className={`${isLiveMode ? liveStyleConfig.mutedText + ' text-sm' : 'text-slate-400 text-sm'}`}>×{entry.quantity}</span> : (
                        <div className={`flex items-center ${isPixelLiveStyle && isLiveMode ? `rounded-none border-2 ${liveStyleConfig.panelBg} ${liveStyleConfig.stampBorder} shadow-[2px_2px_0_#050505]` : 'rounded border'} ${isLiveMode ? `${isPixelLiveStyle ? '' : 'bg-white/5 border-white/10'}` : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                            <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onUpdate(entry.id, { quantity: Math.max(1, entry.quantity - 1) }); }} className={`${isLiveMode ? liveStyleConfig.mutedText + ' hover:text-white text-sm px-1' : `text-slate-400 dark:text-slate-500 hover:${theme.primary} px-0.5`} transition-colors`}>-</button>
                            <input 
                                ref={qtyRef}
                                type="text"
                                inputMode="numeric"
                                className={`${isLiveMode ? 'w-7 text-[16px] font-black ' + liveStyleConfig.modelText + ' focus:bg-white/10' : 'w-5 text-[13px] dark:text-slate-200 focus:bg-slate-100 dark:focus:bg-slate-700/50'} text-center bg-transparent border-none p-0 focus:ring-0 [-moz-appearance:_textfield] [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none rounded`}
                                value={entry.quantity || ''} 
                                onChange={(e) => {
                                    const valStr = e.target.value.replace(/\D/g, '');
                                    if (valStr === '') {
                                        onUpdate(entry.id, { quantity: 1 });
                                        return;
                                    }
                                    const val = parseInt(valStr);
                                    if (!isNaN(val) && val > 0) onUpdate(entry.id, { quantity: val });
                                }} 
                                onKeyDown={handleQtyKeyDown}
                            />
                            <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onUpdate(entry.id, { quantity: entry.quantity + 1 }); }} className={`${isLiveMode ? liveStyleConfig.mutedText + ' hover:text-white text-sm px-1' : `text-slate-400 dark:text-slate-500 hover:${theme.primary} px-0.5`} transition-colors`}>+</button>
                        </div>
                    )
                )}
            </div>

            <div className="flex flex-col items-end justify-center leading-none">
                <div className="flex items-center gap-1 justify-end">
                    <span className={`${isLiveMode ? liveStyleConfig.priceText + ' opacity-60' : 'text-slate-300 dark:text-slate-600'} text-sm`}>¥</span>
                    <input ref={priceRef} type="text" className={`${isLiveMode ? 'w-[58px] text-[20px] font-black' : 'w-12 text-[14px]'} text-right bg-transparent border-b border-dashed border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-transparent ${theme.ring} focus:outline-none transition-colors ${isLiveMode ? liveStyleConfig.priceText : (entry.customPrice ? 'text-amber-600 font-bold' : 'text-slate-700 dark:text-slate-300')}`} value={displayPrice} onChange={(e) => handlePriceChange(e.target.value)} onFocus={(e) => e.target.select()} onKeyDown={handlePriceKeyDown} />
                </div>
            </div>

            {!isLiveMode && (
            <div className="flex justify-end">
                {hasRowContent && (
                    <button
                        type="button"
                        onClick={clearEntry}
                        className="text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 flex items-center justify-center transition-colors"
                        title="清空这一行"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>
            )}
        </div>
    );
});
