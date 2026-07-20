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
    if (/CORE\s*ULTRA|\bULTRA\b|\b(?:245|250|265|270|285)[A-Z]{0,6}\b/.test(text)) return 'Ultra';
    if (/CORE\s*I9|\bI9[-\s]?/.test(text)) return 'Core i9';
    if (/CORE\s*I7|\bI7[-\s]?/.test(text)) return 'Core i7';
    if (/CORE\s*I5|\bI5[-\s]?/.test(text)) return 'Core i5';
    if (/RYZEN\s*[579]|\bR[579]\b/.test(text)) return `Ryzen ${text.match(/(?:RYZEN\s*|R)([579])/)?.[1] || ''}`.trim();
    if (/\b(?:3400|3500|3600|4500|5500|5600|7500|7600|8400|8500|8600|9600)[A-Z0-9]*\b/.test(text)) return 'Ryzen 5';
    if (/\b(?:3700|5700|5800|7700|7800|8700|9700|9800)[A-Z0-9]*\b/.test(text)) return 'Ryzen 7';
    if (/\b(?:3900|5900|5950|7900|7950|9900|9950)[A-Z0-9]*\b/.test(text)) return 'Ryzen 9';
    return '其他';
}

function getRamCapacity(item: HardwareItem) {
    const text = `${item.model} ${JSON.stringify(item.specs || {})}`.toUpperCase();
    const kitMatch = text.match(/(?:^|\D)(4|8|16|24|32|48|64)\s*(?:GB|G)?\s*[*X×]\s*(2|4)(?:\D|$)/);
    if (kitMatch) return `${Number(kitMatch[1]) * Number(kitMatch[2])}G`;
    const totalMatch = text.match(/(?:^|\D)(8|16|24|32|48|64|96|128)\s*(?:GB|G)(?:\D|$)/);
    return totalMatch ? `${totalMatch[1]}G` : '其他';
}

function parseHardwareSpecs(item: HardwareItem) {
    let specs = item.specs as unknown;
    if (typeof specs === 'string') {
        try { specs = JSON.parse(specs); } catch { specs = {}; }
    }
    return specs && typeof specs === 'object' && !Array.isArray(specs) ? specs as Record<string, unknown> : {};
}

function getSpecValue(item: HardwareItem, keys: string[]) {
    const specs = parseHardwareSpecs(item);
    for (const key of keys) {
        const value = specs[key];
        if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
    }
    return '';
}

function buildFilterOptions(items: HardwareItem[], getValue: (item: HardwareItem) => string, compare?: (left: string, right: string) => number) {
    const values = Array.from(new Set(items.map(getValue).filter(Boolean)));
    return ['全部', ...values.sort(compare)];
}

function getFormFactor(item: HardwareItem) {
    const specRecord = parseHardwareSpecs(item);
    const explicit = String(specRecord.formFactor || specRecord.form_factor || '').toUpperCase().replace('-', '');
    if (explicit) return explicit;

    const model = item.model.toUpperCase();
    if (/\b(?:MINI[-\s]?ITX|ITX)\b|\b(?:A|B|H|X|Z)\d{3}E?I\b/.test(model)) return 'ITX';
    if (/\bM[-\s]?ATX\b|\b(?:A|B|H|X|Z)\d{3}E?M\b/.test(model)) return 'MATX';
    if (/大板|\b(?:A|B|H|X|Z)\d{3}/.test(model)) return 'ATX';
    return '';
}

function getMonitorSize(item: HardwareItem) {
    const modelMatch = item.model.toUpperCase().match(/(?:^|\D)(\d{2}(?:\.\d+)?)\s*(?:寸|英寸|INCH)/);
    if (modelMatch) return `${Number(modelMatch[1])}寸`;
    const explicit = getSpecValue(item, ['screenSize', 'screen_size', 'size']);
    const match = explicit.match(/\d+(?:\.\d+)?/);
    return match?.[0] ? `${Number(match[0])}寸` : '';
}

function getMonitorResolution(item: HardwareItem) {
    const model = item.model.toUpperCase();
    const explicit = getSpecValue(item, ['resolution']).toUpperCase();
    for (const text of [model, explicit]) {
        if (/8K|7680\s*[*X×]\s*4320/.test(text)) return '8K';
        if (/5K|5120\s*[*X×]\s*2880/.test(text)) return '5K';
        if (/4K|3840\s*[*X×]\s*2160|2160P/.test(text)) return '4K';
        if (/2K|2560\s*[*X×]\s*1440|1440P/.test(text)) return '2K';
        if (/1K|1920\s*[*X×]\s*1080|1080P/.test(text)) return '1K';
    }
    return '';
}

function getMonitorRefreshRate(item: HardwareItem) {
    const model = item.model.toUpperCase();
    const modelRates = [
        ...Array.from(model.matchAll(/(?:^|\D)(\d{2,3})\s*HZ/g), (match) => Number(match[1])),
        ...Array.from(model.matchAll(/[12458]K\s*(\d{2,3})(?!\d)/g), (match) => Number(match[1])),
    ].filter(Boolean);
    if (modelRates.length > 0) return `${Math.max(...modelRates)}Hz`;
    const explicit = getSpecValue(item, ['refreshRate', 'refresh_rate']);
    const match = explicit.match(/\d{2,3}/);
    return match?.[0] ? `${Number(match[0])}Hz` : '';
}

function getMonitorRefreshBand(item: HardwareItem) {
    const rate = Number(getMonitorRefreshRate(item).replace('Hz', ''));
    if (!rate) return '';
    if (rate <= 100) return '≤100';
    if (rate <= 180) return '120–180';
    if (rate <= 280) return '200–280';
    return '300+';
}

function getCoolerType(item: HardwareItem) {
    const text = `${getSpecValue(item, ['type', 'coolerType'])} ${item.model}`;
    if (/水冷|AIO/i.test(text)) return '水冷';
    if (/风冷|塔式|下压/i.test(text)) return '风冷';
    return '';
}

function getCoolerSize(item: HardwareItem) {
    const text = `${getSpecValue(item, ['dimensions', 'radiatorSize', 'radiator_size'])} ${getSpecValue(item, ['type', 'coolerType'])} ${item.model}`.toUpperCase();
    const match = text.match(/(?:^|\D)(120|240|280|360|420)\s*MM(?:\D|$)/);
    return match ? `${match[1]}mm` : '';
}

function getDiskProtocol(item: HardwareItem) {
    const text = `${getSpecValue(item, ['protocol'])} ${getSpecValue(item, ['interface', 'interfaceType'])} ${item.model}`.toUpperCase();
    if (/SATA/.test(text)) return 'SATA';
    if (/PCIE\s*5(?:\.0)?/.test(text)) return 'PCIe 5.0';
    if (/PCIE\s*4(?:\.0)?/.test(text)) return 'PCIe 4.0';
    if (/PCIE\s*3(?:\.0)?/.test(text)) return 'PCIe 3.0';
    if (/NVME|M\.2/.test(text)) return 'NVMe';
    return '';
}

function getDiskCapacity(item: HardwareItem) {
    const text = `${getSpecValue(item, ['capacity', 'size'])} ${item.model}`.toUpperCase();
    const match = text.match(/(?:^|\D)(\d+(?:\.\d+)?)\s*(TB|T|GB|G)(?:\D|$)/);
    if (!match) return '';
    return `${Number(match[1])}${match[2].startsWith('T') ? 'T' : 'G'}`;
}

function productMeta(item: HardwareItem) {
    const compatibility = getHardwareCompatibility(item);
    if (item.category === 'monitor') return [getMonitorSize(item), getMonitorResolution(item), getMonitorRefreshRate(item)].filter(Boolean);
    if (item.category === 'cooling') return [getCoolerType(item), getCoolerSize(item)].filter(Boolean);
    if (item.category === 'ram') return [...compatibility.memoryTypes, getRamCapacity(item)].filter(Boolean).slice(0, 3);
    if (item.category === 'disk') return [getDiskProtocol(item), getDiskCapacity(item)].filter(Boolean);
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
    const boundary = anchorElement.closest<HTMLElement>('[data-hardware-picker-boundary]');
    const boundaryRect = boundary?.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const availableWidth = boundaryRect ? boundaryRect.width - 16 : Math.max(760, rect.width + 460);
    const width = Math.min(920, Math.max(320, availableWidth), viewportWidth - 24);
    const spaceBelow = viewportHeight - rect.bottom - 12;
    const openUpward = spaceBelow < 300 && rect.top > spaceBelow;
    const availableHeight = openUpward ? rect.top - 12 : spaceBelow;
    const maxHeight = Math.max(260, Math.min(560, availableHeight));
    const preferredLeft = boundaryRect ? boundaryRect.left + 8 : rect.left - 120;
    const left = Math.min(Math.max(12, preferredLeft), viewportWidth - width - 12);
    const top = openUpward
        ? Math.max(12, rect.top - maxHeight - 8)
        : Math.min(rect.bottom + 8, viewportHeight - maxHeight - 12);
    return { left, maxHeight, top, width };
}

export function StreamerHardwarePicker({ anchorElement, buildList, entry, onClose, onSelect }: StreamerHardwarePickerProps) {
    const { theme, isLiveMode, liveStyle, liveStyleConfig } = React.useContext(ThemeContext);
    const isPixelLiveStyle = liveStyle.startsWith('pixel') && liveStyle !== 'pixel';
    const isSoftLightLiveStyle = liveStyleConfig.surface === 'light' && liveStyleConfig.frameTreatment === 'soft';
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
    const [ramMemoryType, setRamMemoryType] = useState('全部');
    const [ramCapacity, setRamCapacity] = useState('全部');
    const [monitorSize, setMonitorSize] = useState('全部');
    const [monitorResolution, setMonitorResolution] = useState('全部');
    const [monitorRefreshBand, setMonitorRefreshBand] = useState('全部');
    const [coolerType, setCoolerType] = useState('全部');
    const [coolerSize, setCoolerSize] = useState('全部');
    const [diskProtocol, setDiskProtocol] = useState('全部');
    const [diskCapacity, setDiskCapacity] = useState('全部');

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
    const ramCapacities = useMemo(() => {
        const values = Array.from(new Set(strictItems.map(getRamCapacity)));
        return ['全部', ...values.filter((value) => value !== '其他').sort((left, right) => Number(left.replace('G', '')) - Number(right.replace('G', ''))), ...values.filter((value) => value === '其他')];
    }, [strictItems]);
    const ramMemoryTypes = useMemo(() => ['全部', ...Array.from(new Set(strictItems.flatMap((item) => getHardwareCompatibility(item).memoryTypes))).sort()], [strictItems]);
    const monitorSizes = useMemo(() => buildFilterOptions(strictItems, getMonitorSize, (left, right) => Number(left.replace('寸', '')) - Number(right.replace('寸', ''))), [strictItems]);
    const monitorResolutions = useMemo(() => buildFilterOptions(strictItems, getMonitorResolution, (left, right) => Number(left.replace('K', '')) - Number(right.replace('K', ''))), [strictItems]);
    const monitorRefreshBands = useMemo(() => {
        const order = ['≤100', '120–180', '200–280', '300+'];
        const values = new Set<string>(strictItems.map(getMonitorRefreshBand).filter(Boolean));
        return ['全部', ...order.filter((value) => values.has(value))];
    }, [strictItems]);
    const coolerTypes = useMemo(() => buildFilterOptions(strictItems, getCoolerType), [strictItems]);
    const coolerSizes = useMemo(() => buildFilterOptions(strictItems, getCoolerSize, (left, right) => Number(left.replace('mm', '')) - Number(right.replace('mm', ''))), [strictItems]);
    const diskProtocols = useMemo(() => {
        const order = ['PCIe 5.0', 'PCIe 4.0', 'PCIe 3.0', 'NVMe', 'SATA'];
        const values = new Set<string>(strictItems.map(getDiskProtocol).filter(Boolean));
        return ['全部', ...order.filter((value) => values.has(value))];
    }, [strictItems]);
    const diskCapacities = useMemo(() => buildFilterOptions(strictItems, getDiskCapacity, (left, right) => {
        const toGigabytes = (value: string) => Number(value.slice(0, -1)) * (value.endsWith('T') ? 1024 : 1);
        return toGigabytes(left) - toGigabytes(right);
    }), [strictItems]);
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
            if (entry.category === 'ram') {
                if (ramMemoryType !== '全部' && !compatibility.memoryTypes.includes(ramMemoryType)) return false;
                if (ramCapacity !== '全部' && getRamCapacity(item) !== ramCapacity) return false;
            }
            if (entry.category === 'monitor') {
                if (monitorSize !== '全部' && getMonitorSize(item) !== monitorSize) return false;
                if (monitorResolution !== '全部' && getMonitorResolution(item) !== monitorResolution) return false;
                if (monitorRefreshBand !== '全部' && getMonitorRefreshBand(item) !== monitorRefreshBand) return false;
            }
            if (entry.category === 'cooling') {
                if (coolerType !== '全部' && getCoolerType(item) !== coolerType) return false;
                if (coolerSize !== '全部' && getCoolerSize(item) !== coolerSize) return false;
            }
            if (entry.category === 'disk') {
                if (diskProtocol !== '全部' && getDiskProtocol(item) !== diskProtocol) return false;
                if (diskCapacity !== '全部' && getDiskCapacity(item) !== diskCapacity) return false;
            }
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
    }, [boardFormFactor, brand, coolerSize, coolerType, cpuBrand, cpuSeries, cpuSocket, diskCapacity, diskProtocol, entry.category, monitorRefreshBand, monitorResolution, monitorSize, ramCapacity, ramMemoryType, search, sortOrder, strictItems]);

    const resetFilters = () => {
        setSearch('');
        setBrand('全部');
        setSortOrder('default');
        setCpuBrand('全部');
        setCpuSocket('全部');
        setCpuSeries('全部');
        setBoardFormFactor('全部');
        setRamMemoryType('全部');
        setRamCapacity('全部');
        setMonitorSize('全部');
        setMonitorResolution('全部');
        setMonitorRefreshBand('全部');
        setCoolerType('全部');
        setCoolerSize('全部');
        setDiskProtocol('全部');
        setDiskCapacity('全部');
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
            : isSoftLightLiveStyle
                ? 'bg-white/65 border border-slate-900/10 rounded-lg'
                : 'bg-black/15 border border-white/10 rounded-lg'
        : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg';
    const chipClass = (active: boolean) => active
        ? `${liveStyleConfig.glowBg} ${isPixelLiveStyle ? 'text-gray-950 rounded-none' : 'text-white rounded-md'} border-transparent shadow-sm`
        : `${controlClass} ${modelText} hover:brightness-110`;
    const hiddenCompatibilityCount = products.length - strictItems.length;
    const renderFilterGroup = (
        label: string,
        values: string[],
        selected: string,
        onChange: (value: string) => void,
        className = '',
    ) => (
        <div className={`flex min-w-0 items-center gap-1.5 ${className}`}>
            <span className={`w-8 shrink-0 text-[9px] font-black ${mutedText}`}>{label}</span>
            <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto hide-scrollbar">
                {values.map((value) => (
                    <button
                        key={value}
                        type="button"
                        onClick={() => onChange(value)}
                        className={`h-6 shrink-0 border px-2 text-[10px] font-black leading-none transition-all ${chipClass(selected === value)}`}
                    >
                        {value}
                    </button>
                ))}
            </div>
        </div>
    );

    if (!position || typeof document === 'undefined') return null;

    return createPortal(
        <div
            ref={pickerRef}
            data-hardware-picker
            className={`fixed z-[180] flex flex-col overflow-hidden ${panelClass}`}
            style={{ left: position.left, maxHeight: position.maxHeight, top: position.top, width: position.width }}
        >
            <div className={`space-y-2 border-b px-3 py-2 ${isLiveMode ? liveStyleConfig.border : 'border-slate-200 dark:border-slate-700'}`}>
                <div className="flex items-center gap-1.5">
                    <label className={`flex h-8 min-w-0 flex-1 items-center gap-2 px-2.5 ${controlClass}`}>
                        <Search size={14} className={mutedText} />
                        <input ref={searchRef} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`搜索${CATEGORY_MAP[entry.category]}型号或品牌`} className={`min-w-0 flex-1 bg-transparent text-xs font-bold outline-none ${modelText} placeholder:opacity-50`} />
                    </label>
                    <div className={`hidden shrink-0 items-center gap-1.5 text-[9px] font-bold min-[720px]:flex ${mutedText}`}>
                        {requiredSockets.map((socket) => <span key={socket} className={`px-1.5 py-1 ${controlClass}`}>锁定 {socket}</span>)}
                        {requiredMemoryTypes.map((memoryType) => <span key={memoryType} className={`px-1.5 py-1 ${controlClass}`}>锁定 {memoryType}</span>)}
                        <span>{filteredItems.length} 项</span>
                        {hiddenCompatibilityCount > 0 && <span>已隐藏 {hiddenCompatibilityCount}</span>}
                    </div>
                    <button type="button" onClick={() => setSortOrder((current) => current === 'default' ? 'asc' : current === 'asc' ? 'desc' : 'default')} className={`h-8 shrink-0 px-2.5 text-[10px] font-black ${controlClass} ${modelText}`}>
                        {sortOrder === 'default' ? '价格排序' : sortOrder === 'asc' ? '价格 ↑' : '价格 ↓'}
                    </button>
                    <button type="button" onClick={resetFilters} className={`flex h-8 w-8 shrink-0 items-center justify-center ${controlClass} ${mutedText}`} title="重置筛选">
                        <RotateCcw size={14} />
                    </button>
                    <button type="button" onClick={onClose} className={`flex h-8 w-8 shrink-0 items-center justify-center ${controlClass} ${mutedText} hover:text-red-400 transition-colors`} title="关闭筛选">
                        <X size={17} />
                    </button>
                </div>

                {entry.category === 'cpu' && (
                    <div className="grid grid-cols-1 gap-x-3 gap-y-1.5 min-[720px]:grid-cols-2">
                        {renderFilterGroup('品牌', ['全部', 'Intel', 'AMD'], cpuBrand, setCpuBrand, 'min-[720px]:col-span-2')}
                        {renderFilterGroup('接口', sockets, cpuSocket, setCpuSocket)}
                        {renderFilterGroup('系列', ['全部', 'Core i5', 'Core i7', 'Core i9', 'Ultra', 'Ryzen 5', 'Ryzen 7', 'Ryzen 9', 'X3D'], cpuSeries, setCpuSeries)}
                    </div>
                )}

                {entry.category === 'mainboard' && (
                    <div className="grid grid-cols-1 gap-x-3 gap-y-1.5 min-[720px]:grid-cols-2">
                        {renderFilterGroup('品牌', brands, brand, setBrand)}
                        {renderFilterGroup('规格', ['全部', 'ATX', 'M-ATX', 'ITX'], boardFormFactor, setBoardFormFactor)}
                    </div>
                )}

                {entry.category === 'ram' && (
                    <div className="grid grid-cols-1 gap-x-3 gap-y-1.5 min-[720px]:grid-cols-2">
                        {renderFilterGroup('品牌', brands, brand, setBrand, 'min-[720px]:col-span-2')}
                        {renderFilterGroup('代际', ramMemoryTypes, ramMemoryType, setRamMemoryType)}
                        {renderFilterGroup('容量', ramCapacities, ramCapacity, setRamCapacity)}
                    </div>
                )}

                {entry.category === 'monitor' && (
                    <div className="grid grid-cols-1 gap-x-3 gap-y-1.5 min-[720px]:grid-cols-2">
                        {renderFilterGroup('品牌', brands, brand, setBrand)}
                        {renderFilterGroup('尺寸', monitorSizes, monitorSize, setMonitorSize)}
                        {renderFilterGroup('分辨率', monitorResolutions, monitorResolution, setMonitorResolution)}
                        {renderFilterGroup('刷新率', monitorRefreshBands, monitorRefreshBand, setMonitorRefreshBand)}
                    </div>
                )}

                {entry.category === 'cooling' && (
                    <div className="grid grid-cols-1 gap-x-3 gap-y-1.5 min-[720px]:grid-cols-2">
                        {renderFilterGroup('品牌', brands, brand, setBrand, 'min-[720px]:col-span-2')}
                        {renderFilterGroup('类型', coolerTypes, coolerType, setCoolerType)}
                        {renderFilterGroup('冷排', coolerSizes, coolerSize, setCoolerSize)}
                    </div>
                )}

                {entry.category === 'disk' && (
                    <div className="grid grid-cols-1 gap-x-3 gap-y-1.5 min-[720px]:grid-cols-2">
                        {renderFilterGroup('品牌', brands, brand, setBrand, 'min-[720px]:col-span-2')}
                        {renderFilterGroup('协议', diskProtocols, diskProtocol, setDiskProtocol)}
                        {renderFilterGroup('容量', diskCapacities, diskCapacity, setDiskCapacity)}
                    </div>
                )}

                {!['cpu', 'mainboard', 'ram', 'monitor', 'cooling', 'disk'].includes(entry.category) && renderFilterGroup('品牌', brands, brand, setBrand)}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2 hide-scrollbar">
                {isLoading && <div className={`flex items-center justify-center gap-2 py-10 text-xs font-bold ${mutedText}`}><RefreshCw size={15} className="animate-spin" /> 正在加载产品库…</div>}
                {!isLoading && loadFailed && <div className={`py-10 text-center text-xs font-bold ${mutedText}`}>产品库加载失败，请稍后重试</div>}
                {!isLoading && !loadFailed && (
                    <div className="grid grid-cols-1 gap-1.5">
                        {filteredItems.map((item) => {
                            const meta = productMeta(item);
                            return (
                                <button key={item.id} type="button" onClick={() => onSelect(item)} className={`flex min-h-[52px] w-full items-center gap-2 border px-2.5 py-1.5 text-left transition-colors ${isPixelLiveStyle ? `${liveStyleConfig.panelBg} ${liveStyleConfig.stampBorder} border-2 hover:brightness-110 rounded-none` : `${controlClass} hover:bg-white/10`}`}>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex min-w-0 items-center gap-1.5">
                                            <span className={`shrink-0 text-[9px] font-black ${isLiveMode ? liveStyleConfig.accentText : theme.primary}`}>{item.brand}</span>
                                            <span className={`truncate text-[13px] font-black ${modelText}`}>{item.model}</span>
                                            {item.isRecommended && <span className="inline-flex shrink-0 items-center gap-0.5 text-[8px] font-black text-amber-400"><Sparkles size={9} /> 推荐</span>}
                                            {item.isDiscount && <span className="shrink-0 text-[8px] font-black text-rose-400">特惠</span>}
                                        </div>
                                        {meta.length > 0 && <div className={`mt-0.5 flex flex-wrap gap-1 text-[8px] font-bold leading-none ${mutedText}`}>{meta.map((value) => <span key={value}>{value}</span>)}</div>}
                                    </div>
                                    <span className={`shrink-0 text-sm font-black ${isLiveMode ? liveStyleConfig.priceText : theme.primary}`}>¥{item.price}</span>
                                </button>
                            );
                        })}
                    </div>
                )}
                {!isLoading && !loadFailed && filteredItems.length === 0 && <div className={`py-10 text-center text-xs font-bold ${mutedText}`}>没有符合条件的{CATEGORY_MAP[entry.category]}</div>}
            </div>
        </div>,
        document.body,
    );
}
