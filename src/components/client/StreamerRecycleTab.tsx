import React, { useState, useEffect, useRef, useMemo, useContext } from 'react';
import { Trash2, X, Plus } from 'lucide-react';
import { ThemeContext } from './StreamerThemeContext';
import { getIconByCategory } from './Shared';

// Constants
export const RECYCLE_CATEGORIES = [
    { code: 'cpu', label: 'CPU' },
    { code: 'mainboard', label: '主板' },
    { code: 'ram', label: '内存' },
    { code: 'disk', label: '硬盘1' },
    { code: 'disk2', label: '硬盘2' },
    { code: 'gpu', label: '显卡' },
    { code: 'case', label: '机箱' },
    { code: 'power', label: '电源' },
    { code: 'cooling', label: '散热' },
    { code: 'monitor', label: '显示器' },
    { code: 'fan', label: '风扇' },
    { code: 'peripheral', label: '外设1' },
    { code: 'peripheral2', label: '外设2' }
];

export default function StreamerRecycleTab() {
    const { theme } = useContext(ThemeContext);
    
    // Each row represents a category just like VisualBuilder
    const [rows, setRows] = useState(() => {
        return RECYCLE_CATEGORIES.map(cat => ({
            id: `recycle_${cat.code}_${Math.random().toString(36).substring(2, 9)}`,
            category: cat.code,
            item: null as any,
            quantity: 1,
            profitRate: 15, // default 15% profit margin
            profitAmount: 0, // absolute profit value
            customQuote: 0,
            query: '',
            isDefault: true
        }));
    });

    const [activeDropdownIndex, setActiveDropdownIndex] = useState<number | null>(null);

    const onUpdateRow = (index: number, data: any) => {
        setRows(prev => {
            const next = [...prev];
            const oldRow = next[index];
            let newRow = { ...oldRow, ...data };

            // Dynamic logic for calculation when item changes
            if (data.item !== undefined) {
                if (data.item === null) {
                    newRow.customQuote = 0;
                    newRow.profitAmount = 0;
                } else {
                    // Item selected!
                    const resale = data.item.resalePrice || 0;
                    // Default profit 15% when selecting a new item
                    const pAmt = Math.max(0, Math.floor(resale * 0.15));
                    newRow.profitAmount = pAmt;
                    newRow.customQuote = Math.max(0, resale - pAmt);
                }
            } 
            // When user edits Profit amount explicitly
            else if (data.profitAmount !== undefined && oldRow.item) {
                const resale = oldRow.item.resalePrice || 0;
                const pAmt = Math.max(0, data.profitAmount);
                newRow.profitAmount = pAmt;
                newRow.customQuote = Math.max(0, resale - pAmt);
            }
            // When user edits custom Quote directly
            else if (data.customQuote !== undefined && oldRow.item) {
                const resale = oldRow.item.resalePrice || 0;
                const cq = Math.max(0, data.customQuote);
                newRow.customQuote = cq;
                newRow.profitAmount = Math.max(0, resale - cq);
            }

            next[index] = newRow;
            return next;
        });
    };

    const addRow = () => {
        setRows(prev => [
            ...prev,
            {
                id: `recycle_custom_${Math.random().toString(36).substring(2, 9)}`,
                category: 'gpu', // default
                item: null,
                quantity: 1,
                profitRate: 15,
                profitAmount: 0,
                customQuote: 0,
                query: '',
                isDefault: false
            }
        ]);
    };

    const removeRow = (index: number) => {
        setRows(prev => prev.filter((_, i) => i !== index));
    };

    const clearAll = () => {
        setRows(RECYCLE_CATEGORIES.map(cat => ({
            id: `recycle_${cat.code}_${Math.random().toString(36).substring(2, 9)}`,
            category: cat.code,
            item: null,
            quantity: 1,
            profitRate: 15,
            profitAmount: 0,
            customQuote: 0,
            query: '',
            isDefault: true
        })));
    };

    // Derived logic
    const summary = useMemo(() => {
        let totalXianyu = 0;
        let totalProfit = 0;
        let totalQuote = 0;
        
        for (const r of rows) {
            if (r.item && r.item.resalePrice) {
                const qty = r.quantity;
                const xr = r.item.resalePrice * qty;
                const pt = r.profitAmount * qty;
                const qt = r.customQuote * qty;
                
                totalXianyu += xr;
                totalProfit += pt;
                totalQuote += qt;
            }
        }
        return { totalXianyu, totalProfit, totalQuote };
    }, [rows]);

    return (
        <React.Fragment>
            <div className="overflow-x-auto w-full">
                <div className="min-w-[800px]">
                    {/* Header */}
                <div className={`grid grid-cols-[90px_1fr_60px_120px_100px_120px_40px] gap-2 md:gap-4 px-6 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-dashed ${theme.borderColor}`}>
                    <div className="text-center">类别</div>
                    <div className="text-slate-400">搜索配件 (智能搜索)</div>
                    <div className="text-center text-slate-400">数量</div>
                    <div className="text-right text-slate-400">回收价</div>
                    <div className="text-right text-slate-400">市场价</div>
                    <div className="text-right text-slate-400 pr-2">利润</div>
                    <div></div>
                </div>

                    {/* Rows */}
                    <div className={`divide-y ${theme.divider} ${theme.rowBg} transition-colors duration-300`}>
                        {rows.map((row, index) => (
                            <RecycleInlineRow 
                                key={row.id}
                                index={index}
                                row={row}
                                isOpen={activeDropdownIndex === index}
                                onOpen={() => setActiveDropdownIndex(index)}
                                onClose={() => { if (activeDropdownIndex === index) setActiveDropdownIndex(null) }}
                                onUpdate={(data: any) => onUpdateRow(index, data)}
                                onRemove={() => removeRow(index)}
                                onNextFocus={() => {
                                    if (index < rows.length - 1) setActiveDropdownIndex(index + 1);
                                    else setActiveDropdownIndex(null);
                                }}
                            />
                        ))}
                    </div>
                    
                    {/* Add Row Button */}
                    <div className="px-6 py-3 border-b border-dashed border-slate-200 dark:border-slate-800">
                        <button 
                            onClick={addRow}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-500/10 rounded-lg transition-colors border border-transparent hover:border-indigo-200 dark:hover:border-indigo-500/30"
                        >
                            <Plus size={14} /> 添加一行
                        </button>
                    </div>
                </div>
            </div>

            {/* Footer Summary Bar */}
            <div className={`sticky bottom-0 z-20 ${theme.cardBg} backdrop-blur-xl border-t ${theme.borderColor} shadow-[0_-10px_30px_rgba(0,0,0,0.05)] p-4 flex items-center justify-between`}>
                
                {/* Front: Final Customer Quote (Prominent) */}
                <div className="flex items-center gap-4">
                    <div className="text-left flex flex-col items-start pl-2 pr-4">
                        <p className={`text-[11px] font-black uppercase tracking-widest mb-1 ${theme.primary}`}>最终客户总报价（回收底价）</p>
                        <div className="flex items-baseline gap-1">
                            <span className={`text-2xl font-black ${theme.primary}`}>¥</span>
                            <span className={`text-5xl font-black font-mono tracking-tighter ${theme.primary}`}>{summary.totalQuote.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* Back (Far Right): Sensitive info for Streamer's eyes only */}
                <div className="flex items-center gap-6 text-right pr-2 group">
                    <div className="flex items-center gap-6 opacity-20 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="flex flex-col items-end">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">预估闲鱼总残值</p>
                            <div className="font-mono text-lg font-black text-slate-400">¥{summary.totalXianyu.toLocaleString()}</div>
                        </div>
                        <div className="flex flex-col items-end">
                            <p className="text-[10px] font-bold text-amber-500/80 uppercase tracking-widest mb-0.5">全部预留利润</p>
                            <div className="font-mono text-xl font-black text-amber-500/80">¥{summary.totalProfit.toLocaleString()}</div>
                        </div>
                    </div>
                    
                    <button 
                        onClick={clearAll}
                        className="ml-2 w-10 h-10 flex items-center justify-center bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-xl transition-colors shrink-0"
                        title="清空全部"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>
        </React.Fragment>
    );
}

// ----------------------------------------
// Internal Component for Row
// ----------------------------------------
function RecycleInlineRow({ row, isOpen, onOpen, onClose, onUpdate, onRemove, onNextFocus }: any) {
    const { theme } = useContext(ThemeContext);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [highlightIndex, setHighlightIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);
    const searchTimeout = useRef<any>(null);

    // Auto focus when opened via NextFocus
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    // Scroll active item into view during keyboard navigation
    useEffect(() => {
        if (isOpen && suggestionsRef.current) {
            const children = suggestionsRef.current.children;
            if (children && children[highlightIndex]) {
                const el = children[highlightIndex] as HTMLElement;
                el.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [highlightIndex, isOpen]);

    const handleSearch = (val: string) => {
        onUpdate({ query: val, item: null });
        onOpen();
        
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        if (!val.trim()) {
            setSuggestions([]);
            return;
        }

        setSearching(true);
        searchTimeout.current = setTimeout(async () => {
            try {
                // map frontend category to backend if needed
                const backendCatMap: Record<string, string> = {
                    'mainboard': 'motherboard',
                    'power': 'psu',
                    'cooling': 'cooler'
                };
                const searchCat = backendCatMap[row.category] || row.category;
                
                const res = await fetch(`/api/recycling-prices/estimate?category=${searchCat}&keyword=${encodeURIComponent(val)}`);
                const data = await res.json();
                const rawItems = data.items || [];
                const seenModels = new Set<string>();
                const dedupedItems = rawItems.filter((i: any) => {
                    const norm = i.model.trim().toLowerCase();
                    if (seenModels.has(norm)) return false;
                    seenModels.add(norm);
                    return true;
                });
                setSuggestions(dedupedItems);
                setHighlightIndex(0);
            } catch (e) {
                console.error(e);
            } finally {
                setSearching(false);
            }
        }, 300);
    };

    const selectItem = (item: any) => {
        onUpdate({ item, query: item.model });
        setSuggestions([]);
        onClose();
        onNextFocus();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightIndex(prev => Math.min(prev + 1, suggestions.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (suggestions.length > 0) {
                selectItem(suggestions[highlightIndex]);
            } else {
                onClose();
                onNextFocus();
            }
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    const hasItem = !!row.item;
    const resalePrice = row.item?.resalePrice || 0;

    return (
        <div className={`grid grid-cols-[90px_1fr_60px_120px_100px_120px_40px] gap-2 md:gap-4 px-6 items-center border-l-4 transition-all ${theme.rowBg} hover:bg-slate-50 dark:hover:bg-slate-800/10 py-1 relative ${isOpen ? 'z-50' : 'z-10'} ${hasItem ? theme.borderColor.replace('border-', 'border-l-') : 'border-l-transparent'}`}>
            
            {/* 1. Category Dropdown (Allows changing category) */}
            <div className="flex items-center justify-start pl-2 pr-1 relative group w-full h-full">
                <div className={`flex items-center gap-2 transition-all ${theme.primary}`}>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${theme.bgLight} ${hasItem ? 'shadow-sm' : ''}`}>
                        <div className="scale-[0.65]">
                            {getIconByCategory(row.category)}
                        </div>
                    </div>
                    <span className="text-[12px] font-black tracking-widest">{RECYCLE_CATEGORIES.find(c => c.code === row.category)?.label || row.category}</span>
                </div>
                <select 
                    value={row.category}
                    onChange={(e) => onUpdate({ category: e.target.value, item: null, query: '' })}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full appearance-none"
                    title="更改类别"
                >
                    {RECYCLE_CATEGORIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                </select>
            </div>

            {/* 2. Input with Dropdown */}
            <div className="relative z-10 py-1">
                <input
                    ref={inputRef}
                    type="text"
                    value={row.query}
                    onChange={(e) => handleSearch(e.target.value)}
                    onFocus={() => { if (row.query && !hasItem) onOpen(); }}
                    onKeyDown={handleKeyDown}
                    placeholder={`搜索型号...`}
                    className={`w-full bg-transparent text-sm md:text-base font-bold text-slate-800 dark:text-slate-100 placeholder-slate-300 dark:placeholder-slate-500 py-1 focus:outline-none transition-colors `}
                />
                
                {/* Suggestions Dropdown */}
                {isOpen && (row.query.trim().length > 0) && (
                    <div className="absolute top-full left-0 w-[400px] mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-[100] animate-in slide-in-from-top-2 duration-200">
                        {searching ? (
                            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700/50">
                                <span className="text-xs font-bold text-slate-500">正在检索二手底价库...</span>
                            </div>
                        ) : suggestions.length > 0 ? (
                            <div ref={suggestionsRef} className="max-h-[300px] overflow-y-auto custom-scrollbar bg-slate-50/50 dark:bg-slate-900/50 py-2">
                                {suggestions.map((item, i) => (
                                    <div 
                                        key={item.id} 
                                        onClick={() => selectItem(item)}
                                        className={`px-4 py-1.5 mx-2 my-0.5 rounded-lg cursor-pointer flex justify-between items-center transition-colors group ${i === highlightIndex ? 'bg-indigo-50 border border-indigo-200/50' : 'hover:bg-slate-100 border border-transparent'}`}
                                        onMouseEnter={() => setHighlightIndex(i)}
                                    >
                                        <div className="flex-1 min-w-0 pr-4">
                                            <div className="font-bold text-sm text-slate-800 truncate group-hover:text-indigo-700">{item.model}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="px-4 py-4 text-center">
                                <div className="text-sm font-bold text-slate-500 mb-1">未找到匹配的型号</div>
                                <div className="text-xs text-slate-400">请输入具体关键词，如 4060、13600 等</div>
                            </div>
                        )}
                        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 text-[10px] text-slate-400 font-bold flex justify-between">
                            <span>小鱼二手比价·自动对齐</span>
                            <span>↑↓ 切换 · Enter 选中</span>
                        </div>
                    </div>
                )}
            </div>

            {/* 3. Quantity */}
            <div className="flex items-center justify-center gap-1.5">
                <button 
                    onClick={() => row.quantity > 1 && onUpdate({ quantity: row.quantity - 1 })}
                    disabled={row.quantity <= 1 || !hasItem}
                    className="w-4 h-4 flex items-center justify-center rounded-sm bg-slate-100 text-slate-500 font-bold hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-slate-100"
                >-</button>
                <div className="w-4 text-center font-bold text-slate-700 text-[13px]">
                    {row.quantity}
                </div>
                <button 
                    onClick={() => onUpdate({ quantity: row.quantity + 1 })}
                    disabled={!hasItem}
                    className="w-4 h-4 flex items-center justify-center rounded-sm bg-slate-100 text-slate-500 font-bold hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-slate-100"
                >+</button>
            </div>

            {/* 4. Customer Quote (Recycle Price) - Editable */}
            <div className="flex items-center justify-end">
                <div className="relative w-full text-right">
                    <span className={`absolute left-2 top-1/2 -translate-y-1/2 font-bold text-[10px] pointer-events-none opacity-50 ${theme.primary}`}>¥</span>
                    <input 
                        type="number" 
                        disabled={!hasItem}
                        value={row.customQuote === 0 && !hasItem ? '' : row.customQuote} 
                        onChange={e => onUpdate({ customQuote: parseInt(e.target.value) || 0 })}
                        className={`w-full h-7 pl-4 pr-1.5 rounded ${theme.bgLight} border ${theme.borderColor} ${theme.primary} font-bold font-mono focus:outline-none focus:ring-1 ${theme.ring} disabled:opacity-50 text-right transition-colors appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-[13px]`}
                    />
                </div>
            </div>

            {/* 5. Resale Price (Market) - Read Only */}
            <div className="text-right">
                {hasItem ? (
                    <div className="font-mono text-sm font-black text-slate-800 dark:text-slate-200 relative group">
                        {resalePrice > 0 ? `¥${resalePrice}` : '--'}
                        <div className="absolute top-1/2 -translate-y-1/2 -right-2 w-1 h-3 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>
                ) : <div className="text-slate-300">-</div>}
            </div>

            {/* 6. Profit Amount - Editable */}
            <div className="flex items-center justify-end pr-2">
                <div className="relative w-full max-w-[90px] text-right">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-amber-600/50 font-bold text-xs pointer-events-none">¥</span>
                    <input 
                        type="number" 
                        disabled={!hasItem}
                        value={row.profitAmount === 0 && !hasItem ? '' : row.profitAmount} 
                        onChange={e => onUpdate({ profitAmount: parseInt(e.target.value) || 0 })}
                        className="w-full h-7 pl-5 pr-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 font-black font-mono focus:outline-none focus:ring-1 focus:ring-amber-500/30 disabled:opacity-50 text-right appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-colors hover:bg-amber-100/50 text-sm"
                    />
                </div>
            </div>

            {/* 8. Clear/Remove */}
            <div className="flex justify-center flex-1 h-full items-center">
                {(hasItem || row.query || !row.isDefault) && (
                    <button 
                        onClick={() => {
                            if (hasItem || row.query) {
                                onUpdate({ query: '', item: null, quantity: 1, profitRate: 15, customQuote: 0, profitAmount: 0 });
                            } else {
                                onRemove();
                            }
                        }}
                        className={`p-1.5 rounded-md transition-colors ${hasItem || row.query ? 'text-slate-400 hover:text-rose-500 hover:bg-rose-50' : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'}`}
                        title={hasItem || row.query ? '清空此行内容' : '删除此行'}
                    >
                        {hasItem || row.query ? <X size={14} strokeWidth={3} /> : <Trash2 size={14} />}
                    </button>
                )}
            </div>
        </div>
    );
}

