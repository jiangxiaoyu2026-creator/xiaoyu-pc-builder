import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCw, RotateCcw, Search, Sparkles, X } from 'lucide-react';
import { BuildEntry, Category, HardwareItem } from '../../types/clientTypes';
import { CATEGORY_MAP } from '../../data/clientData';
import { storage } from '../../services/storage';
import { getBuildItem, getHardwareCompatibility, hasOverlap } from '../../utils/hardwareCompatibility';
import { ThemeContext } from './StreamerThemeContext';

type SortOrder = 'default' | 'asc' | 'desc';

interface StreamerHardwarePickerProps {
    anchorElement: HTMLElement;
    buildList: BuildEntry[];
    entry: BuildEntry;
    onClose: () => void;
    onSelect: (item: HardwareItem) => void;
}

interface PickerPosition {
    left: number;
    maxHeight: number;
    top: number;
    width: number;
}

const productRequests = new Map<Category, Promise<HardwareItem[]>>();

function loadProducts(category: Category) {
    const cached = productRequests.get(category);
    if (cached) return cached;
    const request = storage.getProducts(1, 2000, category).then((result) => result.items);
    productRequests.set(category, request);
    return request;
}

function getCpuBrand(item: HardwareItem) {
    const text = `${item.brand} ${item.model}`.toUpperCase();
    if (/AMD|RYZEN/.test(text)) return 'AMD';
    if (/INTEL|CORE|ULTRA/.test(text)) return 'Intel';
    return '其他';
}

function getCpuSeries(item: HardwareItem) {
    const text = item.model.toUpperCase();
    if (/X3D/.test(text)) return 'X3D';
    if (/CORE\s*ULTRA|\bULTRA\b/.test(text)) return 'Ultra';
    if (/CORE\s*I9|\bI9[-\s]?/.test(text)) return 'Core i9';
    if (/CORE\s*I7|\bI7[-\s]?/.test(text)) return 'Core i7';
    if (/CORE\s*I5|\bI5[-\s]?/.test(text)) return 'Core i5';
    if (/RYZEN\s*[579]|\bR[579]\b/.test(text)) return `Ryzen ${text.match(/(?:RYZEN\s*|R)([579])/)?.[1] || ''}`.trim();
    return '其他';
}

function getRamCapacity(item: HardwareItem) {
    const text = `${item.model} ${JSON.stringify(item.specs || {})}`.toUpperCase();
    const match = text.match(/(?:^|\D)(16|32|64|128)\s*(?:GB|G)(?:\D|$)/);
    return match ? `${match[1]}G` : '其他';
}

function getFormFactor(item: HardwareItem) {
    const specs = item.specs as unknown as Record<string, unknown>;
    return String(specs.formFactor || specs.form_factor || '').toUpperCase().replace('-', '');
}

function productMeta(item: HardwareItem) {
    const compatibility = getHardwareCompatibility(item);
    const meta = [
        ...compatibility.sockets,
        ...compatibility.memoryTypes,
        compatibility.cores ? `${compatibility.cores}核` : '',
        compatibility.threads ? `${compatibility.threads}线程` : '',
    ].filter(Boolean);
    return meta.slice(0, 3);
}

function calculatePosition(anchorElement: HTMLElement): PickerPosition {
    const rect = anchorElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const width = Math.min(620, Math.max(440, rect.width + 176), viewportWidth - 16);
    const spaceBelow = viewportHeight - rect.bottom - 12;
    const openUpward = spaceBelow < 300 && rect.top > spaceBelow;
    const availableHeight = openUpward ? rect.top - 12 : spaceBelow;
    const maxHeight = Math.max(220, Math.min(420, availableHeight));
    const left = Math.min(Math.max(8, rect.left - 84), viewportWidth - width - 8);
    const top = openUpward
        ? Math.max(8, rect.top - maxHeight - 8)
        : Math.min(rect.bottom + 8, viewportHeight - maxHeight - 8);
    return { left, maxHeight, top, width };
}

export function StreamerHardwarePicker({ anchorElement, buildList, entry, onClose, onSelect }: StreamerHardwarePickerProps) {
    const { theme, isLiveMode, liveStyle, liveStyleConfig } = React.useContext(ThemeContext);
    const isPixelLiveStyle = liveStyle.startsWith('pixel');
    const pickerRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const [position, setPosition] = useState<PickerPosition | null>(null);
    const [products, setProducts] = useState<HardwareItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadFailed, setLoadFailed] = useState(false);
    const [search, setSearch] = useState('');
    const [brand, setBrand] = useState('全部');
    const [sortOrder, setSortOrder] = useState<SortOrder>('default');
    const [cpuBrand, setCpuBrand] = useState('全部');
    const [cpuSocket, setCpuSocket] = useState('全部');
    const [cpuSeries, setCpuSeries] = useState('全部');
    const [boardFormFactor, setBoardFormFactor] = useState('全部');
    const [ramCapacity, setRamCapacity] = useState('全部');

    const selectedCpu = getBuildItem(buildList, 'cpu');
    const selectedMainboard = getBuildItem(buildList, 'mainboard');
    const selectedRam = getBuildItem(buildList, 'ram');
    const requiredSockets = entry.category === 'mainboard' ? getHardwareCompatibility(selectedCpu).sockets : [];
    const requiredMemoryTypes = entry.category === 'mainboard'
        ? getHardwareCompatibility(selectedRam).memoryTypes
        : entry.category === 'ram'
            ? getHardwareCompatibility(selectedMainboard).memoryTypes
            : [];

    useLayoutEffect(() => {
        const updatePosition = () => setPosition(calculatePosition(anchorElement));
        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [anchorElement]);

    useEffect(() => {
        let active = true;
        setIsLoading(true);
        setLoadFailed(false);
        loadProducts(entry.category)
            .then((items) => {
                if (active) setProducts(items);
            })
            .catch(() => {
                if (active) setLoadFailed(true);
            })
            .finally(() => {
                if (active) setIsLoading(false);
            });
        return () => {
            active = false;
        };
    }, [entry.category]);

    useEffect(() => {
        const timer = window.setTimeout(() => searchRef.current?.focus(), 0);
        return () => window.clearTimeout(timer);
    }, []);

    useEffect(() => {
        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target as Node;
            if (pickerRef.current?.contains(target) || anchorElement.contains(target)) return;
            onClose();
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [anchorElement, onClose]);

    const strictItems = useMemo(() => products.filter((item) => {
        const compatibility = getHardwareCompatibility(item);
        if (entry.category === 'mainboard') {
            if (requiredSockets.length > 0 && !hasOverlap(compatibility.sockets, requiredSockets)) return false;
            if (requiredMemoryTypes.length > 0 && !hasOverlap(compatibility.memoryTypes, requiredMemoryTypes)) return false;
        }
        if (entry.category === 'ram' && requiredMemoryTypes.length > 0 && !hasOverlap(compatibility.memoryTypes, requiredMemoryTypes)) return false;
        return true;
    }), [entry.category, products, requiredMemoryTypes, requiredSockets]);

    const brands = useMemo(() => ['全部', ...Array.from(new Set(strictItems.map((item) => item.brand))).sort()], [strictItems]);
    const sockets = useMemo(() => ['全部', ...Array.from(new Set(strictItems.flatMap((item) => getHardwareCompatibility(item).sockets))).sort()], [strictItems]);
    const filteredItems = useMemo(() => {
        const terms = search.toLowerCase().trim().split(/\s+/).filter(Boolean);
        const next = strictItems.filter((item) => {
            const compatibility = getHardwareCompatibility(item);
            const searchable = `${item.brand} ${item.model} ${JSON.stringify(item.specs || {})}`.toLowerCase();
            if (terms.length > 0 && !terms.every((term) => searchable.includes(term))) return false;
            if (brand !== '全部' && item.brand !== brand) return false;
            if (entry.category === 'cpu') {
                if (cpuBrand !== '全部' && getCpuBrand(item) !== cpuBrand) return false;
                if (cpuSocket !== '全部' && !compatibility.sockets.includes(cpuSocket)) return false;
                if (cpuSeries !== '全部' && getCpuSeries(item) !== cpuSeries) return false;
            }
            if (entry.category === 'mainboard' && boardFormFactor !== '全部' && !getFormFactor(item).includes(boardFormFactor.replace('-', ''))) return false;
            if (entry.category === 'ram' && ramCapacity !== '全部' && getRamCapacity(item) !== ramCapacity) return false;
            return true;
        });
        return next.sort((left, right) => {
            if (sortOrder === 'asc') return left.price - right.price;
            if (sortOrder === 'desc') return right.price - left.price;
            const leftSpecial = Boolean(left.isRecommended || left.isDiscount);
            const rightSpecial = Boolean(right.isRecommended || right.isDiscount);
            if (leftSpecial !== rightSpecial) return leftSpecial ? -1 : 1;
            return left.price - right.price;
        });
    }, [boardFormFactor, brand, cpuBrand, cpuSeries, cpuSocket, entry.category, ramCapacity, search, sortOrder, strictItems]);

    const resetFilters = () => {
        setSearch('');
        setBrand('全部');
        setSortOrder('default');
        setCpuBrand('全部');
        setCpuSocket('全部');
        setCpuSeries('全部');
        setBoardFormFactor('全部');
        setRamCapacity('全部');
    };

    const panelClass = isLiveMode
        ? isPixelLiveStyle
            ? `${liveStyleConfig.panelBg} ${liveStyleConfig.stampBorder} border-2 shadow-[6px_6px_0_#050505] rounded-none`
            : `${liveStyleConfig.panelBg} ${liveStyleConfig.border} border shadow-2xl rounded-xl backdrop-blur-xl`
        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-xl';
    const modelText = isLiveMode ? liveStyleConfig.modelText : theme.textTitle;
    const mutedText = isLiveMode ? liveStyleConfig.mutedText : theme.textMuted;
    const controlClass = isLiveMode
        ? isPixelLiveStyle
            ? `${liveStyleConfig.panelBg} ${liveStyleConfig.stampBorder} border-2 rounded-none`
            : 'bg-black/15 border border-white/10 rounded-lg'
        : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg';
    const chipClass = (active: boolean) => active
        ? `${liveStyleConfig.glowBg} ${isPixelLiveStyle ? 'text-gray-950' : 'text-white'} border-transparent`
        : `${controlClass} ${modelText} hover:brightness-110`;

    if (!position || typeof document === 'undefined') return null;

    return createPortal(
        <div
            ref={pickerRef}
            className={`fixed z-[180] flex flex-col overflow-hidden ${panelClass}`}
            style={{ left: position.left, maxHeight: position.maxHeight, top: position.top, width: position.width }}
        >
            <div className={`flex items-start justify-between gap-3 border-b px-4 py-3 ${isLiveMode ? liveStyleConfig.border : 'border-slate-200 dark:border-slate-700'}`}>
                <div className="min-w-0">
                    <div className={`text-sm font-black ${modelText}`}>筛选{CATEGORY_MAP[entry.category]}</div>
                    <div className={`mt-1 flex flex-wrap gap-1.5 text-[10px] font-bold ${mutedText}`}>
                        {requiredSockets.map((socket) => <span key={socket} className={`px-1.5 py-0.5 ${controlClass}`}>已锁定 {socket}</span>)}
                        {requiredMemoryTypes.map((memoryType) => <span key={memoryType} className={`px-1.5 py-0.5 ${controlClass}`}>已锁定 {memoryType}</span>)}
                        {requiredSockets.length === 0 && requiredMemoryTypes.length === 0 && <span>点击商品后直接写入当前行</span>}
                    </div>
                </div>
                <button type="button" onClick={onClose} className={`h-7 w-7 shrink-0 ${mutedText} hover:text-red-400 transition-colors`} title="关闭筛选">
                    <X size={18} />
                </button>
            </div>

            <div className={`space-y-2 border-b px-4 py-3 ${isLiveMode ? liveStyleConfig.border : 'border-slate-200 dark:border-slate-700'}`}>
                <div className="flex gap-2">
                    <label className={`flex h-9 min-w-0 flex-1 items-center gap-2 px-3 ${controlClass}`}>
                        <Search size={15} className={mutedText} />
                        <input ref={searchRef} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`搜索${CATEGORY_MAP[entry.category]}型号`} className={`min-w-0 flex-1 bg-transparent text-xs font-bold outline-none ${modelText} placeholder:opacity-50`} />
                    </label>
                    <button type="button" onClick={() => setSortOrder((current) => current === 'default' ? 'asc' : current === 'asc' ? 'desc' : 'default')} className={`h-9 shrink-0 px-3 text-xs font-black ${controlClass} ${modelText}`}>
                        {sortOrder === 'default' ? '排序' : sortOrder === 'asc' ? '低价' : '高价'}
                    </button>
                    <button type="button" onClick={resetFilters} className={`h-9 w-9 shrink-0 flex items-center justify-center ${controlClass} ${mutedText}`} title="重置筛选">
                        <RotateCcw size={15} />
                    </button>
                </div>

                <div className="flex gap-1.5 overflow-x-auto pb-0.5 hide-scrollbar">
                    {brands.map((value) => (
                        <button key={value} type="button" onClick={() => setBrand(value)} className={`shrink-0 border px-2 py-1 text-[10px] font-black transition-colors ${chipClass(brand === value)}`}>
                            {value}
                        </button>
                    ))}
                </div>

                {entry.category === 'cpu' && (
                    <>
                        <div className="flex gap-1.5 overflow-x-auto pb-0.5 hide-scrollbar">
                            {['全部', 'Intel', 'AMD'].map((value) => (
                                <button key={value} type="button" onClick={() => setCpuBrand(value)} className={`shrink-0 border px-2 py-1 text-[10px] font-black transition-colors ${chipClass(cpuBrand === value)}`}>{value}</button>
                            ))}
                            {sockets.map((value) => (
                                <button key={value} type="button" onClick={() => setCpuSocket(value)} className={`shrink-0 border px-2 py-1 text-[10px] font-black transition-colors ${chipClass(cpuSocket === value)}`}>{value}</button>
                            ))}
                        </div>
                        <div className="flex gap-1.5 overflow-x-auto pb-0.5 hide-scrollbar">
                            {['全部', 'Core i5', 'Core i7', 'Core i9', 'Ultra', 'Ryzen 5', 'Ryzen 7', 'Ryzen 9', 'X3D'].map((value) => (
                                <button key={value} type="button" onClick={() => setCpuSeries(value)} className={`shrink-0 border px-2 py-1 text-[10px] font-black transition-colors ${chipClass(cpuSeries === value)}`}>{value}</button>
                            ))}
                        </div>
                    </>
                )}

                {entry.category === 'mainboard' && (
                    <div className="flex gap-1.5 overflow-x-auto pb-0.5 hide-scrollbar">
                        {['全部', 'ATX', 'MATX', 'ITX'].map((value) => (
                            <button key={value} type="button" onClick={() => setBoardFormFactor(value)} className={`shrink-0 border px-2 py-1 text-[10px] font-black transition-colors ${chipClass(boardFormFactor === value)}`}>{value}</button>
                        ))}
                    </div>
                )}

                {entry.category === 'ram' && (
                    <div className="flex gap-1.5 overflow-x-auto pb-0.5 hide-scrollbar">
                        {['全部', '16G', '32G', '64G', '128G'].map((value) => (
                            <button key={value} type="button" onClick={() => setRamCapacity(value)} className={`shrink-0 border px-2 py-1 text-[10px] font-black transition-colors ${chipClass(ramCapacity === value)}`}>{value}</button>
                        ))}
                    </div>
                )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2 hide-scrollbar">
                {isLoading && <div className={`flex items-center justify-center gap-2 py-10 text-xs font-bold ${mutedText}`}><RefreshCw size={15} className="animate-spin" /> 正在加载产品库…</div>}
                {!isLoading && loadFailed && <div className={`py-10 text-center text-xs font-bold ${mutedText}`}>产品库加载失败，请稍后重试</div>}
                {!isLoading && !loadFailed && filteredItems.map((item) => {
                    const meta = productMeta(item);
                    return (
                        <button key={item.id} type="button" onClick={() => onSelect(item)} className={`mb-1.5 flex w-full items-center gap-3 border px-3 py-2 text-left transition-colors ${isPixelLiveStyle ? `${liveStyleConfig.panelBg} ${liveStyleConfig.stampBorder} border-2 hover:brightness-110 rounded-none` : `${controlClass} hover:bg-white/10`}`}>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                    <span className={`text-[10px] font-black ${isLiveMode ? liveStyleConfig.accentText : theme.primary}`}>{item.brand}</span>
                                    {item.isRecommended && <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-amber-400"><Sparkles size={10} /> 推荐</span>}
                                    {item.isDiscount && <span className="text-[9px] font-black text-rose-400">特惠</span>}
                                </div>
                                <div className={`truncate text-sm font-black ${modelText}`}>{item.model}</div>
                                {meta.length > 0 && <div className={`mt-0.5 flex flex-wrap gap-1 text-[9px] font-bold ${mutedText}`}>{meta.map((value) => <span key={value}>{value}</span>)}</div>}
                            </div>
                            <span className={`shrink-0 text-base font-black ${isLiveMode ? liveStyleConfig.priceText : theme.primary}`}>¥{item.price}</span>
                        </button>
                    );
                })}
                {!isLoading && !loadFailed && filteredItems.length === 0 && <div className={`py-10 text-center text-xs font-bold ${mutedText}`}>没有符合条件的{CATEGORY_MAP[entry.category]}</div>}
            </div>
            {!isLoading && (requiredSockets.length > 0 || requiredMemoryTypes.length > 0) && <div className={`border-t px-4 py-2 text-[10px] font-bold ${isLiveMode ? liveStyleConfig.border : 'border-slate-200 dark:border-slate-700'} ${mutedText}`}>已隐藏 {products.length - strictItems.length} 个不兼容或规格不完整型号</div>}
        </div>,
        document.body,
    );
}
