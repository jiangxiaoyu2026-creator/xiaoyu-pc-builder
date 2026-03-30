import React, { useState, useEffect, useRef, useMemo, useContext } from 'react';
import { Trash2, X } from 'lucide-react';
import { ThemeContext } from './StreamerWorkbench';
import { getIconByCategory } from './Shared';

// Constants
const RECYCLE_CATEGORIES = [
    { code: 'cpu', label: 'CPU' },
    { code: 'gpu', label: '显卡' },
    { code: 'mainboard', label: '主板' },
    { code: 'ram', label: '内存' },
    { code: 'disk', label: '硬盘' },
    { code: 'power', label: '电源' },
    { code: 'cooling', label: '散热' },
    { code: 'case', label: '机箱' },
    { code: 'monitor', label: '显示器' },
    { code: 'peripheral', label: '外设' }
];

export default function StreamerRecycleTab() {
    const { theme } = useContext(ThemeContext);
    
    // Each row represents a category just like VisualBuilder
    const [rows, setRows] = useState(() => {
        return RECYCLE_CATEGORIES.map(cat => ({
            id: `recycle_${cat.code}_${Date.now()}`,
            category: cat.code,
            item: null as any,
            quantity: 1,
            profitMargin: 50, // default 50 profit margin
            query: ''
        }));
    });

    const [activeDropdownIndex, setActiveDropdownIndex] = useState<number | null>(null);

    const onUpdateRow = (index: number, data: any) => {
        setRows(prev => {
            const next = [...prev];
            next[index] = { ...next[index], ...data };
            return next;
        });
    };

    const clearAll = () => {
        setRows(RECYCLE_CATEGORIES.map(cat => ({
            id: `recycle_${cat.code}_${Date.now()}`,
            category: cat.code,
            item: null,
            quantity: 1,
            profitMargin: 50,
            query: ''
        })));
    };

    // Derived logic
    const summary = useMemo(() => {
        let totalXianyu = 0;
        let totalProfit = 0;
        let totalQuote = 0;
        for (const r of rows) {
            if (r.item && r.item.resalePrice) {
                const xr = r.item.resalePrice * r.quantity;
                const pt = r.profitMargin * r.quantity;
                const qt = Math.max(0, Math.floor(xr - pt));
                totalXianyu += xr;
                totalProfit += pt;
                totalQuote += qt;
            }
        }
        return { totalXianyu, totalProfit, totalQuote };
    }, [rows]);

    return (
        <div className="flex flex-col h-full absolute inset-0 pb-16">
            <div className="flex-1 overflow-y-auto w-full custom-scrollbar">
                <div className="min-w-[800px]">
                    {/* Header */}
                    <div className={`grid grid-cols-[80px_1fr_90px_90px_100px_90px_40px] gap-2 md:gap-4 px-6 py-2 border-b ${theme.borderColor} ${theme.headerBg} text-[11px] font-bold ${theme.primary} uppercase tracking-wider sticky top-0 z-20`}>
                        <div>类别</div>
                        <div>硬件型号 (智能搜索)</div>
                        <div className="text-center">数量</div>
                        <div className="text-right">闲鱼参考价</div>
                        <div className="text-center">预留利润/件</div>
                        <div className="text-right">客户报价</div>
                        <div></div>
                    </div>

                    {/* Rows */}
                    <div className={`divide-y ${theme.divider}`}>
                        {rows.map((row, index) => (
                            <RecycleInlineRow 
                                key={row.id}
                                index={index}
                                row={row}
                                isOpen={activeDropdownIndex === index}
                                onOpen={() => setActiveDropdownIndex(index)}
                                onClose={() => { if (activeDropdownIndex === index) setActiveDropdownIndex(null) }}
                                onUpdate={(data) => onUpdateRow(index, data)}
                                onNextFocus={() => {
                                    if (index < rows.length - 1) setActiveDropdownIndex(index + 1);
                                    else setActiveDropdownIndex(null);
                                }}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className={`${theme.footerBg} border-t ${theme.borderColor} px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 fixed bottom-0 max-w-[calc(100vw-40px)] w-full`}>
                <div className="flex gap-6">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">闲鱼总残值</span>
                        <span className="text-sm font-bold text-slate-600 font-mono tracking-tight">¥{summary.totalXianyu.toLocaleString()}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest leading-none mb-1">总预留利润</span>
                        <span className="text-sm font-bold text-orange-500 font-mono tracking-tight">¥{summary.totalProfit.toLocaleString()}</span>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <p className={`text-[11px] font-black ${theme.primary} uppercase tracking-widest mb-1`}>最终回收总报价 (无小数)</p>
                        <div className="flex items-baseline gap-1 text-slate-800 dark:text-slate-100">
                            <span className="text-xl font-bold">¥</span>
                            <span className="text-4xl font-black font-mono tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-emerald-600">
                                {summary.totalQuote.toLocaleString()}
                            </span>
                        </div>
                    </div>

                    <button 
                        onClick={clearAll}
                        className="h-12 px-6 flex items-center justify-center gap-2 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl transition-all font-bold text-sm"
                    >
                        <Trash2 size={16} /> <span className="hidden sm:inline">清空重算</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

// ----------------------------------------
// Internal Component for Row
// ----------------------------------------
function RecycleInlineRow({ index, row, isOpen, onOpen, onClose, onUpdate, onNextFocus }: any) {
    const { theme } = useContext(ThemeContext);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [highlightIndex, setHighlightIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const searchTimeout = useRef<any>(null);

    // Auto focus when opened via NextFocus
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

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
                setSuggestions(data.items || []);
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
    const finalPrice = Math.max(0, Math.floor(resalePrice - row.profitMargin));

    return (
        <div className={`grid grid-cols-[80px_1fr_90px_90px_100px_90px_40px] gap-2 md:gap-4 px-6 items-center border-l-4 transition-all hover:bg-slate-50/50 dark:hover:bg-slate-800/20 py-1 ${hasItem ? theme.borderColor.replace('border-', 'border-l-') : 'border-l-transparent'}`}>
            {/* Category */}
            <div className="flex flex-col items-center justify-center gap-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${hasItem ? theme.primary + ' ' + theme.bgLight + ' ' + theme.borderColor : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                    <div className="scale-75">{getIconByCategory(row.category)}</div>
                </div>
                <div className="text-[10px] font-bold text-slate-400 tracking-wider">
                    {RECYCLE_CATEGORIES.find(c => c.code === row.category)?.label}
                </div>
            </div>

            {/* Input with Dropdown */}
            <div className="relative z-10 py-2">
                <input
                    ref={inputRef}
                    type="text"
                    value={row.query}
                    onChange={(e) => handleSearch(e.target.value)}
                    onFocus={() => { if (row.query && !hasItem) onOpen(); }}
                    onKeyDown={handleKeyDown}
                    placeholder={`搜索/输入 ${RECYCLE_CATEGORIES.find(c => c.code === row.category)?.label}...`}
                    className={`w-full bg-transparent text-[13px] md:text-sm font-bold text-slate-800 dark:text-slate-100 placeholder-slate-300 dark:placeholder-slate-600 py-2 focus:outline-none transition-colors `}
                />
                
                {/* Suggestions Dropdown */}
                {isOpen && (row.query.trim().length > 0) && (
                    <div className="absolute top-full left-0 w-[400px] mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-[100] animate-in slide-in-from-top-2 duration-200">
                        {searching ? (
                            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700/50">
                                <span className="text-xs font-bold text-slate-500">正在检索二手底价库...</span>
                            </div>
                        ) : suggestions.length > 0 ? (
                            <div className="max-h-[300px] overflow-y-auto custom-scrollbar bg-slate-50/50 dark:bg-slate-900/50 py-2">
                                {suggestions.map((item, i) => (
                                    <div 
                                        key={item.id} 
                                        onClick={() => selectItem(item)}
                                        className={`px-4 py-2.5 mx-2 my-1 rounded-lg cursor-pointer flex justify-between items-center transition-colors group ${i === highlightIndex ? 'bg-indigo-50 border border-indigo-200/50' : 'hover:bg-slate-100 border border-transparent'}`}
                                        onMouseEnter={() => setHighlightIndex(i)}
                                    >
                                        <div className="flex-1 min-w-0 pr-4">
                                            <div className="font-bold text-sm text-slate-800 truncate mb-0.5 group-hover:text-indigo-700">{item.model}</div>
                                        </div>
                                        <div className="text-right shrink-0 flex items-center gap-3">
                                            <div className="flex flex-col items-end">
                                                <div className="text-[10px] text-slate-400 font-bold uppercase">闲鱼/挂牌价</div>
                                                <div className="font-mono text-base font-black text-rose-600">¥{item.resalePrice || item.recyclePrice}</div>
                                            </div>
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

            {/* Quantity */}
            <div className="flex items-center justify-center gap-2">
                <button 
                    onClick={() => row.quantity > 1 && onUpdate({ quantity: row.quantity - 1 })}
                    disabled={row.quantity <= 1 || !hasItem}
                    className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-slate-100"
                >-</button>
                <div className="w-4 text-center font-bold text-slate-700 text-sm">
                    {row.quantity}
                </div>
                <button 
                    onClick={() => onUpdate({ quantity: row.quantity + 1 })}
                    disabled={!hasItem}
                    className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-slate-100"
                >+</button>
            </div>

            {/* Resale Price (Xianyu) */}
            <div className="text-right">
                {hasItem ? (
                    <div className="font-mono text-sm font-black text-slate-800 dark:text-slate-200">
                        {resalePrice > 0 ? `¥${resalePrice}` : '--'}
                    </div>
                ) : <div className="text-slate-300">-</div>}
            </div>

            {/* Profit Margin */}
            <div className="flex items-center justify-center">
                <div className="relative w-20">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">¥</span>
                    <input 
                        type="number" 
                        disabled={!hasItem}
                        value={row.profitMargin === 0 ? '' : row.profitMargin} 
                        onChange={e => onUpdate({ profitMargin: parseInt(e.target.value) || 0 })}
                        className="w-full h-8 pl-5 pr-2 rounded-lg bg-orange-50 border border-orange-200 text-orange-600 font-bold font-mono focus:outline-none focus:ring-2 disabled:opacity-50 text-right appearance-none"
                    />
                </div>
            </div>

            {/* Final Quote */}
            <div className="text-right pr-2">
                {hasItem ? (
                    <div className="font-mono text-lg font-black text-teal-600">
                        ¥{finalPrice}
                    </div>
                ) : <div className="text-slate-300">-</div>}
            </div>

            {/* Clear Input */}
            <div className="flex justify-center">
                <button 
                    onClick={() => onUpdate({ query: '', item: null, quantity: 1 })}
                    className={`p-1.5 rounded-full transition-colors ${hasItem || row.query ? 'text-slate-400 hover:text-rose-500 hover:bg-rose-50' : 'text-slate-200 pointer-events-none'}`}
                >
                    <X size={14} strokeWidth={3} />
                </button>
            </div>
        </div>
    );
}
