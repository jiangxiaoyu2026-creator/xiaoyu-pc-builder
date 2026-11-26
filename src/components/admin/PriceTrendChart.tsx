/**
 * 价格趋势图表组件
 * 展示硬件价格变化趋势和今日涨跌统计
 */
import { Fragment, useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
    XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer,
    LineChart, Line
} from 'recharts';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, RefreshCw, Filter, Minus, Download, Calendar, Thermometer, Activity, Clock, Search, SlidersHorizontal, ChevronRight, X, Cpu, CircuitBoard, MemoryStick, HardDrive, ArrowUpDown } from 'lucide-react';
import { toPng } from 'html-to-image';

interface PriceTrendData {
    todaySummary: {
        upCount: number;
        downCount: number;
        totalChanges: number;
        avgUpAmount: number;
        avgDownAmount: number;
        monthUpCount?: number;
        todayUpCount?: number;
        monthDownCount?: number;
        todayDownCount?: number;
        monthTotalChanges?: number;
        todayTotalChanges?: number;
    };
    chartData: Array<{
        date: string;
        upCount: number;
        downCount: number;
        totalChanges: number;
        avgChange: number;
    }>;
    recentChanges: Array<{
        id: number;
        hardwareId: number;
        hardwareName: string;
        category: string;
        oldPrice: number;
        newPrice: number;
        changeAmount: number;
        changePercent: number;
        changedAt: string;
    }>;
    categories: string[];
}

interface ProductPriceTrendData {
    productTrends: Array<{
        hardwareId: string;
        name: string;
        points: Array<{ date: string; price: number; oldPrice: number }>;
    }>;
    categoryAvgTrend: Array<{
        date: string;
        avgPrice: number;
        count: number;
    }>;
    categoryTotalAvgTrend: Array<{
        date: string;
        avgPrice: number;
    }>;
    products: Array<{
        id: string;
        name: string;
        price: number;
        category: string;
    }>;
    historicalExtremes?: { minPrice: number | null; maxPrice: number | null };
    historicalLows?: Array<{
        hardwareId: string;
        name: string;
        category: string;
        currentPrice: number;
        changeAmount: number;
        changePercent: number;
    }>;
    historicalHighs?: Array<{
        hardwareId: string;
        name: string;
        category: string;
        currentPrice: number;
        changeAmount: number;
        changePercent: number;
    }>;
}

interface MarketOverviewData {
    todaySummary: {
        totalChanges: number;
        upCount: number;
        downCount: number;
        avgUpAmount: number;
        avgDownAmount: number;
    };
    categoryStats: Array<{
        category: string;
        productCount: number;
        currentAvg: number;
        todayUp: number;
        todayDown: number;
        change7dPct: number | null;
        change30dPct: number | null;
    }>;
    recentEvents: Array<{
        id: number;
        name: string;
        category: string;
        changeAmount: number;
        changePercent: number;
        oldPrice: number;
        newPrice: number;
        changedAt: string;
    }>;
    temperature: number;
    totalUp: number;
    totalDown: number;
}

const CATEGORY_LABELS: Record<string, string> = {
    cpu: 'CPU', gpu: '显卡', mainboard: '主板', ram: '内存',
    disk: '硬盘/SSD', psu: '电源', power: '电源', case: '机箱',
    cooler: '散热器', cooling: '散热', fan: '风扇',
    monitor: '显示器', mouse: '鼠标', keyboard: '键盘',
    accessory: '配件', all: '全部品类'
};

// Only show specific core components in the category filter
const ALLOWED_CATEGORIES = ['cpu', 'gpu', 'mainboard', 'ram', 'disk', 'all'];
const CATEGORY_ORDER = ['cpu', 'gpu', 'mainboard', 'ram', 'disk'];

const sortCategories = (categories: string[]) => {
    return categories
        .filter(c => ALLOWED_CATEGORIES.includes(c))
        .sort((a, b) => {
            if (a === 'all') return -1;
            if (b === 'all') return 1;
            const ia = CATEGORY_ORDER.indexOf(a);
            const ib = CATEGORY_ORDER.indexOf(b);
            if (ia !== -1 && ib !== -1) return ia - ib;
            if (ia !== -1) return -1;
            if (ib !== -1) return 1;
            return (CATEGORY_LABELS[a] || a).localeCompare(CATEGORY_LABELS[b] || b);
        });
};



function MarketDrawer({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
    const dialog = useRef<HTMLDialogElement>(null);
    useEffect(() => {
        const element = dialog.current;
        element?.showModal();
        return () => element?.close();
    }, []);
    return createPortal(
        <dialog ref={dialog} onCancel={onClose} onClick={event => {
            if (event.target === event.currentTarget) onClose();
        }} className="fixed inset-y-0 left-auto right-0 m-0 h-[100dvh] max-h-none w-full max-w-xl border-0 bg-white p-0 text-slate-800 shadow-2xl backdrop:bg-slate-900/25">
            <div className="min-h-full p-5 sm:p-7">
                <div className="mb-6 flex items-start justify-between gap-4">
                    <h3 className="text-lg font-bold">{title}</h3>
                    <button autoFocus onClick={onClose} aria-label="关闭面板" className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"><X size={18} /></button>
                </div>
                {children}
            </div>
        </dialog>, document.body
    );
}

function AnimatedMarketPriceLine({ points = [], prices }: {
    points?: ReadonlyArray<{ x: number | null; y: number | null }>;
    prices: Array<{ date: string; price: number }>;
}) {
    const reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const [progress, setProgress] = useState(reducedMotion ? 1 : 0);

    useEffect(() => {
        if (reducedMotion) {
            setProgress(1);
            return;
        }
        const start = performance.now();
        let frame = 0;
        const animate = (now: number) => {
            const fraction = Math.min(1, (now - start) / 2200);
            setProgress(fraction);
            if (fraction < 1) frame = requestAnimationFrame(animate);
        };
        frame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frame);
    }, [reducedMotion]);

    const coordinates = points.flatMap((point, index) => point.x === null || point.y === null || !prices[index]
        ? [] : [{ x: point.x, y: point.y, price: prices[index].price }]);
    if (coordinates.length < 2) return null;

    const corners = [{ ...coordinates[0], position: 'start', distance: 0 }];
    const addCorner = (x: number, y: number, price: number, position: string) => {
        const previous = corners[corners.length - 1];
        corners.push({ x, y, price, position, distance: previous.distance + Math.abs(x - previous.x) + Math.abs(y - previous.y) });
    };
    for (let index = 1; index < coordinates.length; index++) {
        const point = coordinates[index];
        const previous = coordinates[index - 1];
        if (point.price !== previous.price) {
            addCorner(point.x, previous.y, previous.price, 'before');
            addCorner(point.x, point.y, point.price, 'after');
        } else if (index === coordinates.length - 1) {
            addCorner(point.x, point.y, point.price, 'end');
        }
    }

    const last = corners[corners.length - 1];
    const path = corners.map((corner, index) => `${index === 0 ? 'M' : 'L'}${corner.x},${corner.y}`).join(' ');
    const distance = last.distance * progress;
    const nextIndex = corners.findIndex(corner => corner.distance > distance);
    const next = nextIndex > 0 ? corners[nextIndex] : null;
    const previous = nextIndex > 0 ? corners[nextIndex - 1] : null;
    const fraction = next && previous ? (distance - previous.distance) / (next.distance - previous.distance) : 0;
    const tip = next && previous ? {
        x: previous.x + (next.x - previous.x) * fraction,
        y: previous.y + (next.y - previous.y) * fraction,
        label: `¥${previous.price.toLocaleString('zh-CN')}`
    } : null;
    const tipLabelWidth = tip ? tip.label.length * 7 + 16 : 0;
    const tipLabelX = tip ? Math.max(corners[0].x, Math.min(tip.x - tipLabelWidth / 2, last.x - tipLabelWidth)) : 0;
    let lastUpperLabelX = -Infinity;
    let lastLowerLabelX = -Infinity;

    return <g pointerEvents="none">
        <path className="recharts-line-curve" d={path} fill="none" stroke="#4f46e5" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray={last.distance || undefined} strokeDashoffset={last.distance - distance} />
        {corners.filter(corner => corner.distance <= distance).map((corner, index) => {
            const isAfter = corner.position === 'after';
            const alignLeft = corner.position === 'before' || corner.position === 'end' || last.x - corner.x < 60;
            const previousLabelX = isAfter ? lastLowerLabelX : lastUpperLabelX;
            const showLabel = prices.length <= 91 || index === 0 || corner === last || (corner.x - previousLabelX >= 70 && last.x - corner.x >= 70);
            if (showLabel) {
                if (isAfter) lastLowerLabelX = corner.x;
                else lastUpperLabelX = corner.x;
            }
            return <g key={index}>
                <circle cx={corner.x} cy={corner.y} r={3} fill="white" stroke="#4f46e5" strokeWidth={1.5} />
                {showLabel && <text x={corner.x + (alignLeft ? -6 : 6)} y={corner.y + (isAfter ? 16 : -9)} textAnchor={alignLeft ? 'end' : 'start'} fontSize={11} fontWeight={600} fill="#4338ca" stroke="white" strokeWidth={3} paintOrder="stroke">¥{corner.price.toLocaleString('zh-CN')}</text>}
            </g>;
        })}
        {tip && <g>
            <circle cx={tip.x} cy={tip.y} r={8} fill="#4f46e5" opacity={0.14} />
            <circle cx={tip.x} cy={tip.y} r={4.5} fill="#4f46e5" stroke="white" strokeWidth={1.5} />
            <rect x={tipLabelX} y={tip.y - 34} width={tipLabelWidth} height={20} rx={5} fill="#4f46e5" />
            <text x={tipLabelX + tipLabelWidth / 2} y={tip.y - 20} textAnchor="middle" fontSize={11} fontWeight={600} fill="white">{tip.label}</text>
        </g>}
    </g>;
}

export default function PriceTrendChart({ hideSummaryPanel = false, publicMode = false, marketCenterMode = false }: { hideSummaryPanel?: boolean, publicMode?: boolean, marketCenterMode?: boolean }) {
    const [data, setData] = useState<PriceTrendData | null>(null);
    const [trendData, setTrendData] = useState<ProductPriceTrendData | null>(null);
    const [loading, setLoading] = useState(true);
    const [category, setCategory] = useState(publicMode ? 'cpu' : 'all');
    const [ramGeneration, setRamGeneration] = useState('');
    const [subcategory, setSubcategory] = useState('');
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [productSearchTerm, setProductSearchTerm] = useState('');
    const [showMarketFilters, setShowMarketFilters] = useState(false);
    const [marketVisibleCount, setMarketVisibleCount] = useState(40);
    const [marketScrollRequest, setMarketScrollRequest] = useState<'table' | 'product' | null>(null);
    const [marketProductDays, setMarketProductDays] = useState<number | null>(null);
    const [marketProductHistory, setMarketProductHistory] = useState<{
        productId: string;
        endDate: string;
        status: 'loading' | 'ready' | 'error';
        points: ProductPriceTrendData['productTrends'][number]['points'];
        historicalExtremes?: ProductPriceTrendData['historicalExtremes'];
    } | null>(null);
    const [marketProductHistoryRetry, setMarketProductHistoryRetry] = useState(0);
    const requestSequence = useRef(0);
    const [days, setDays] = useState(30);
    const [brandFilter, setBrandFilter] = useState<string>(''); // AMD / Intel / NVIDIA etc.
    const [actualBrandFilter, setActualBrandFilter] = useState<string>(''); // ASUS, Kingston, Samsung, etc.
    const [gpuChipFilter, setGpuChipFilter] = useState<string>(''); // RTX 5060 / RTX 5070 etc.

    // Custom date range
    const [useCustomRange, setUseCustomRange] = useState(false);
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const marketProductHistoryEndDate = useCustomRange && customEndDate ? customEndDate : '';

    // Market overview for "all" category
    const [marketOverview, setMarketOverview] = useState<MarketOverviewData | null>(null);

    // Refs for downloadable sections
    const chartRef = useRef<HTMLDivElement>(null);
    const tableRef = useRef<HTMLDivElement>(null);
    const marketProductDetailRef = useRef<HTMLDivElement>(null);
    const lowRef = useRef<HTMLDivElement>(null);
    const highRef = useRef<HTMLDivElement>(null);
    const [downloading, setDownloading] = useState<string | null>(null);
    const [sortConfig, setSortConfig] = useState<{key: '1d'|'7d'|'14d'|'30d', direction: 'asc'|'desc'} | null>(null);

    const handleDownloadImage = useCallback(async (ref: React.RefObject<HTMLDivElement | null>, filename: string) => {
        if (!ref.current) return;
        setDownloading(filename);
        try {
            const dataUrl = await toPng(ref.current, {
                pixelRatio: 2,
                backgroundColor: '#ffffff',
                style: { borderRadius: '0' }
            });
            const link = document.createElement('a');
            link.download = filename;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('下载图片失败:', err);
        } finally {
            setDownloading(null);
        }
    }, []);

    const fetchData = async () => {
        const requestId = ++requestSequence.current;
        setLoading(true);
        try {
            let token: string | null = null;
            try {
                token = localStorage.getItem('xiaoyu_token');
            } catch {
                // localStorage may throw in Safari private mode or restricted browsers
                console.warn('localStorage not available, using public mode');
            }
            const headers: Record<string, string> = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            // Pass the most specific filter: if subcat exists, pass it; else if ramGen exists, pass it
            const backendFilter = marketCenterMode ? '' : (category === 'all' ? '' : subcategory) || (category === 'ram' ? ramGeneration : '');

            // Build date params: custom range or fixed days (minimum 30 for comparison tables)
            const fetchDays = Math.max(days, 30);
            let dateParams = `days=${fetchDays}`;
            if (useCustomRange && customStartDate && customEndDate) {
                dateParams = `start_date=${customStartDate}&end_date=${customEndDate}`;
            }

            // If category is 'all', fetch market overview instead of per-product data
            if (category === 'all') {
                const overviewDateParams = useCustomRange && customStartDate && customEndDate ? dateParams : `days=${fetchDays}`;
                const overviewRes = await fetch(`/api/stats/market-overview?${overviewDateParams}`, { headers });
                const statsRes = await fetch(`/api/stats/price-trends?${dateParams}`, { headers });
                if (requestId !== requestSequence.current) return;
                if (!overviewRes.ok || !statsRes.ok) throw new Error('行情请求失败');
                if (overviewRes.ok) {
                    setMarketOverview(await overviewRes.json());
                }
                if (statsRes.ok) {
                    setData(await statsRes.json());
                }
                setTrendData(null);
            } else {
                setMarketOverview(null);
                const [resStats, resHistory] = await Promise.all([
                    fetch(`/api/stats/price-trends?${dateParams}&category=${category}&subcategory=${backendFilter}`, { headers }),
                    fetch(`/api/stats/product-price-history?${dateParams}&category=${category}&subcategory=${backendFilter}`, { headers })
                ]);

                if (requestId !== requestSequence.current) return;
                if (!resStats.ok || !resHistory.ok) throw new Error('行情请求失败');
                if (resStats.ok && resHistory.ok) {
                    setData(await resStats.json());
                    const hData = await resHistory.json();
                    
                    if (hData.products && hData.productTrends) {
                        const tMap = new Map();
                        for (const pt of hData.productTrends) {
                            tMap.set(String(pt.hardwareId), pt.points);
                        }
                    }
                    
                    setTrendData(hData);
                    if (!hData.products.find((p: any) => String(p.id) === selectedProductId)) {
                        setSelectedProductId('');
                    }
                }
            }
        } catch (e) {
            console.error('Failed to load price trends:', e);
            if (requestId === requestSequence.current) setData(null);
        } finally {
            if (requestId === requestSequence.current) setLoading(false);
        }
    };

    useEffect(() => { 
        // Whenever category changes, we should reset subcategory unless we want it sticky
        if (category !== 'ram') setRamGeneration('');
        if (!marketCenterMode) {
            setBrandFilter('');
            setActualBrandFilter('');
            setGpuChipFilter('');
        } else {
            setMarketProductDays(null);
        }
        fetchData(); 
    }, [category, marketCenterMode ? '' : subcategory, marketCenterMode ? '' : ramGeneration, days, useCustomRange, customStartDate, customEndDate]);



    useEffect(() => { setMarketVisibleCount(40); }, [category, productSearchTerm, brandFilter, actualBrandFilter, gpuChipFilter, ramGeneration, subcategory, sortConfig]);

    useEffect(() => {
        if (!marketCenterMode || loading || !marketScrollRequest) return;
        const target = marketScrollRequest === 'table' ? tableRef.current : marketProductDetailRef.current;
        target?.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
        setMarketScrollRequest(null);
    }, [marketCenterMode, loading, marketScrollRequest]);

    useEffect(() => {
        if (!marketCenterMode || !selectedProductId || loading) {
            setMarketProductHistory(null);
            return;
        }
        const controller = new AbortController();
        const historyKey = { productId: selectedProductId, endDate: marketProductHistoryEndDate };
        setMarketProductHistory({ ...historyKey, status: 'loading', points: [] });
        const params = new URLSearchParams({ hardware_id: selectedProductId, days: '365' });
        if (marketProductHistoryEndDate) {
            const startDate = new Date(Date.parse(marketProductHistoryEndDate) - 365 * 86400000).toISOString().slice(0, 10);
            params.set('start_date', startDate);
            params.set('end_date', marketProductHistoryEndDate);
        }
        fetch(`/api/stats/product-price-history?${params}`, { signal: controller.signal })
            .then(response => {
                if (!response.ok) throw new Error('单品历史请求失败');
                return response.json() as Promise<ProductPriceTrendData>;
            })
            .then(result => {
                if (controller.signal.aborted) return;
                const points = result.productTrends.find(trend => String(trend.hardwareId) === selectedProductId)?.points;
                if (!points?.length) throw new Error('单品历史数据为空');
                setMarketProductHistory({ ...historyKey, status: 'ready', points, historicalExtremes: result.historicalExtremes });
            })
            .catch(() => {
                if (!controller.signal.aborted) setMarketProductHistory({ ...historyKey, status: 'error', points: [] });
            });
        return () => controller.abort();
    }, [marketCenterMode, selectedProductId, loading, marketProductHistoryEndDate, marketProductHistoryRetry]);

    // Helper: does a product name match the actual hardware brand?
    const matchesActualBrand = (name: string): boolean => {
        if (!actualBrandFilter) return true;
        const m = name.match(/^([^\s\(（]+)/);
        const b = m ? m[1] : '';
        return b === actualBrandFilter;
    };

    // Helper: does a product name match current brand filter?
    const matchesBrand = (name: string): boolean => {
        if (!brandFilter) return true;
        
        if (name.toUpperCase().includes(brandFilter.toUpperCase())) return true;
        
        if (category === 'gpu') {
            const info = extractChipInfo(name);
            if (info) {
                const isAMD = info.num.startsWith('9') || info.num.startsWith('7') || info.num.startsWith('6');
                if (brandFilter === 'NVIDIA') return !isAMD;
                if (brandFilter === 'AMD') return isAMD;
            }
        }

        return (brandFilter === 'NVIDIA' && /RTX|GTX|nvidia|英伟达|GeForce/i.test(name))
            || (brandFilter === 'AMD' && /AMD|锐龙|Ryzen|RX\s|Radeon/i.test(name))
            || (brandFilter === 'Intel' && /Intel|英特尔|酷睿|Core/i.test(name));
    };

    // Helper: extract GPU chip info from a product name
    const extractChipInfo = (name: string): { num: string; isD: boolean; suffix: string } | null => {
        // Match 4-digit model number, optional D (only if followed by non-letter or end),
        // and optional suffix (TI/SUPER/XTX/XT/GRE)
        const m = name.toUpperCase().match(/(\d{4})(D(?![A-Z]))?\s*(TI|SUPER|XTX|XT|GRE)?/);
        if (!m) return null;
        return {
            num: m[1],
            isD: !!m[2],
            suffix: m[3] || ''
        };
    };

    // Helper: does a product name match current GPU chip filter?
    const matchesChip = (name: string): boolean => {
        if (!gpuChipFilter) return true;

        // Extract chip info from the filter label (e.g. "RTX 5060 TI", "RX 9070 XT")
        const filterInfo = extractChipInfo(gpuChipFilter);
        if (!filterInfo) return true; // safety fallback

        // Extract chip info from the product name
        const productInfo = extractChipInfo(name);
        if (!productInfo) return false; // no chip number found in product

        // All three fields must match exactly
        return productInfo.num === filterInfo.num
            && productInfo.isD === filterInfo.isD
            && productInfo.suffix === filterInfo.suffix;
    };

    // GPU chipset series extracted from product names
    const gpuChipSeries = (() => {
        if (category !== 'gpu' || !trendData?.products) return [];
        const seriesSet = new Set<string>();
        for (const p of trendData.products) {
            if (p.price <= 0) continue;
            if (!matchesBrand(p.name)) continue;
            
            const info = extractChipInfo(p.name);
            if (info) {
                // Determine AMD (RX) vs NVIDIA (RTX) prefix by first digit
                const prefix = info.num.startsWith('9') || info.num.startsWith('7') || info.num.startsWith('6')
                    ? 'RX' : 'RTX';
                const dSuffix = info.isD ? 'D' : '';
                const label = `${prefix} ${info.num}${dSuffix}${info.suffix ? ' ' + info.suffix : ''}`;
                seriesSet.add(label);
            }
        }
        return Array.from(seriesSet).sort((a, b) => {
            const na = parseInt(a.replace(/\D/g, '')) || 0;
            const nb = parseInt(b.replace(/\D/g, '')) || 0;
            if (nb !== na) return nb - na;
            return a.localeCompare(b);
        });
    })();

    // --- Spec label parser (mirrors backend _parse_ram_specs / _parse_disk_specs) ---
    const parseRamSpecs = (name: string): string => {
        const upper = name.toUpperCase();
        let capacity = 0;
        const mMul = upper.match(/(\d+)[G]?\*(\d+)/);
        if (mMul) {
            capacity = parseInt(mMul[1]) * parseInt(mMul[2]);
        } else {
            const mSingle = upper.match(/(\d+)G/);
            if (mSingle) capacity = parseInt(mSingle[1]);
        }
        let freq = '';
        const mFreq = upper.match(/(3200|3600|4800|5200|5600|6000|6400|6800|7200|7600|8000)/);
        if (mFreq) freq = mFreq[1];
        let ddr = '';
        if (upper.includes('DDR4')) ddr = 'DDR4';
        else if (upper.includes('DDR5')) ddr = 'DDR5';
        else if (freq) ddr = parseInt(freq) <= 4000 ? 'DDR4' : 'DDR5';
        const tags: string[] = [];
        if (ddr) tags.push(ddr);
        if (freq) tags.push(`${freq}MHz`);
        if (capacity) tags.push(`${capacity}GB`);
        return tags.length ? tags.join(' ') : '其他未分类规格';
    };

    const parseDiskSpecs = (name: string): string => {
        const m = name.toUpperCase().match(/(\d+)\s*(TB|T|GB|G)/);
        if (m) {
            let unit = m[2];
            if (unit === 'T') unit = 'TB';
            if (unit === 'G') unit = 'GB';
            return `${m[1]}${unit}`;
        }
        return '其他未分类规格';
    };

    const parseCpuSpecs = (name: string): string => {
        const upper = name.toUpperCase();
        
        // AMD parsing
        if (upper.includes('AMD') || upper.includes('R3-') || upper.includes('R5-') || upper.includes('R7-') || upper.includes('R9-') || /R\d\s/.test(upper) || /\d{4}X/.test(upper) || upper.includes('X3D')) {
            if (upper.includes('X3D')) return 'AMD X3D 系列';
            const m = upper.match(/(5|7|9)\d{3}/);
            if (m) return `AMD ${m[1]}000 系列`;
            return 'AMD 其他型号';
        }

        // Intel parsing (includes Core and Ultra)
        const intelMatch = upper.match(/(?:I\d-)?(12|13|14|15)\d{3}/) || upper.match(/(12|13|14|15)\d{2}F/);
        if (intelMatch) {
            const gen = intelMatch[1];
            return `Intel 第${gen === '12' ? '十二' : gen === '13' ? '十三' : gen === '14' ? '十四' : gen === '15' ? '十五' : gen}代`;
        }
        if (upper.includes('ULTRA')) return 'Intel Core Ultra 系列';
        
        return 'Intel 其他型号';
    };

    // --- Spec price comparison table data ---
    const specPriceTable = (() => {
        const isTargetCat = ['ram', 'disk', 'gpu', 'cpu'].includes(category);
        if (!isTargetCat || !trendData?.products?.length) return null;
        if (!trendData.categoryTotalAvgTrend?.length) return null;

        const parseFn = category === 'ram' ? parseRamSpecs 
                      : category === 'disk' ? parseDiskSpecs 
                      : category === 'cpu' ? parseCpuSpecs
                      : (name: string) => {
            const info = extractChipInfo(name);
            if (!info) return '其他芯片组';
            const prefix = info.num.startsWith('9') || info.num.startsWith('7') || info.num.startsWith('6') ? 'RX' : 'RTX';
            const dSuffix = info.isD ? 'D' : '';
            return `${prefix} ${info.num}${dSuffix}${info.suffix ? ' ' + info.suffix : ''}`;
        };
        const allDates = trendData.categoryTotalAvgTrend.map(t => t.date);
        const trendMap = new Map<string, Array<{date: string; price: number}>>();
        if (trendData.productTrends) {
            for (const pt of trendData.productTrends) {
                trendMap.set(String(pt.hardwareId), pt.points);
            }
        }

        // Group products by spec label, filtered by ramGeneration if set
        const groups = new Map<string, typeof trendData.products>();
        for (const p of trendData.products) {
            if (p.price <= 0) continue;
            if ((category === 'gpu' || category === 'cpu') && !matchesBrand(p.name)) continue;
            if (actualBrandFilter && !matchesActualBrand(p.name)) continue;
            
            const label = parseFn(p.name);
            if (ramGeneration && category === 'ram' && !label.includes(ramGeneration)) continue;
            
            if (!groups.has(label)) groups.set(label, []);
            groups.get(label)!.push(p);
        }

        // For each group, compute average price at each date
        const computeAvgAtDate = (products: typeof trendData.products, date: string): number => {
            let sum = 0, count = 0;
            for (const p of products) {
                const pts = trendMap.get(String(p.id));
                if (pts) {
                    const point = pts.find(pt => pt.date === date);
                    sum += point ? point.price : p.price;
                } else {
                    sum += p.price;
                }
                count++;
            }
            return count > 0 ? Math.round((sum / count) * 100) / 100 : 0;
        };

        const today = allDates[allDates.length - 1];
        const findDateAgo = (daysAgo: number): string | null => {
            const idx = allDates.length - 1 - daysAgo;
            return idx >= 0 ? allDates[idx] : null;
        };

        const rows: Array<{
            label: string;
            count: number;
            currentAvg: number;
            changes: { period: string; pct: number | null }[];
            todayUp: number;
            todayDown: number;
        }> = [];

        // Helper: compute individual product price at a given date
        const getProductPriceAtDate = (productId: string, fallbackPrice: number, date: string): number => {
            const pts = trendMap.get(productId);
            if (pts) {
                const point = pts.find(pt => pt.date === date);
                return point ? point.price : fallbackPrice;
            }
            return fallbackPrice;
        };

        const yesterday = findDateAgo(1);

        for (const [label, products] of groups) {
            const currentAvg = computeAvgAtDate(products, today);
            if (currentAvg <= 0) continue;
            const changes: { period: string; pct: number | null }[] = [];
            for (const [periodLabel, daysAgo] of [['1日', 1], ['7日', 7], ['14日', 14], ['30日', 30]] as const) {
                const pastDate = findDateAgo(daysAgo);
                if (pastDate) {
                    const pastAvg = computeAvgAtDate(products, pastDate);
                    if (pastAvg > 0) {
                        changes.push({ period: periodLabel, pct: Math.round(((currentAvg - pastAvg) / pastAvg) * 10000) / 100 });
                    } else {
                        changes.push({ period: periodLabel, pct: null });
                    }
                } else {
                    changes.push({ period: periodLabel, pct: null });
                }
            }

            // Count individual products that went up/down vs yesterday
            let todayUp = 0;
            let todayDown = 0;
            if (yesterday) {
                for (const p of products) {
                    const pId = String(p.id);
                    const todayPrice = getProductPriceAtDate(pId, p.price, today);
                    const yesterdayPrice = getProductPriceAtDate(pId, p.price, yesterday);
                    if (todayPrice > yesterdayPrice) todayUp++;
                    else if (todayPrice < yesterdayPrice) todayDown++;
                }
            }

            rows.push({ label, count: products.length, currentAvg, changes, todayUp, todayDown });
        }

        // Sort: by DDR generation then by frequency then capacity for RAM, else alphabetically
        rows.sort((a, b) => {
            if (category === 'ram') {
                const aHas5 = a.label.includes('DDR5');
                const bHas5 = b.label.includes('DDR5');
                if (aHas5 !== bHas5) return aHas5 ? -1 : 1;
            } else if (category === 'gpu') {
                const na = parseInt(a.label.replace(/\D/g, '')) || 0;
                const nb = parseInt(b.label.replace(/\D/g, '')) || 0;
                if (nb !== na) return nb - na;
            } else if (category === 'cpu') {
                // Determine order for CPU grouping
                const getCpuScore = (lbl: string) => {
                    if (lbl.includes('Intel')) {
                        if (lbl.includes('十五')) return 115;
                        if (lbl.includes('十四')) return 114;
                        if (lbl.includes('十三')) return 113;
                        if (lbl.includes('十二')) return 112;
                        if (lbl.includes('Ultra')) return 116;
                        return 100; // other intel
                    } else if (lbl.includes('AMD')) {
                        if (lbl.includes('9000')) return 209;
                        if (lbl.includes('X3D')) return 208; // X3D right near newest ones
                        if (lbl.includes('7000')) return 207;
                        if (lbl.includes('5000')) return 205;
                        return 200; // other amd
                    }
                    return 0;
                };
                const sa = getCpuScore(a.label);
                const sb = getCpuScore(b.label);
                if (sa !== sb) return sb - sa; // Descending (newest gen first)
            }
            return a.label.localeCompare(b.label);
        });

        return rows;
    })();

    const productTableData = (() => {
        if (!trendData?.products) return [];
        
        const allDates = trendData.categoryTotalAvgTrend?.map(t => t.date) || [];
        const today = allDates[allDates.length - 1];
        if (!today) return [];

        const findDateAgo = (daysAgo: number): string | null => {
            const idx = allDates.length - 1 - daysAgo;
            return idx >= 0 ? allDates[idx] : null;
        };

        const trendMap = new Map<string, Array<{date: string, price: number}>>();
        if (trendData.productTrends) {
            for (const pt of trendData.productTrends) {
                trendMap.set(String(pt.hardwareId), pt.points);
            }
        }

        const parseFn = category === 'ram' ? parseRamSpecs 
                      : category === 'disk' ? parseDiskSpecs 
                      : category === 'cpu' ? parseCpuSpecs
                      : (name: string) => {
            const info = extractChipInfo(name);
            if (!info) return '其他芯片组';
            const prefix = info.num.startsWith('9') || info.num.startsWith('7') || info.num.startsWith('6') ? 'RX' : 'RTX';
            const dSuffix = info.isD ? 'D' : '';
            return `${prefix} ${info.num}${dSuffix}${info.suffix ? ' ' + info.suffix : ''}`;
        };

        const rows = trendData.products.filter(p => {
            if (p.price <= 0) return false;
            if (category !== 'all' && p.category !== category) return false;
            if (category === 'all') return true; 

            if (brandFilter && ['cpu', 'gpu', 'mainboard'].includes(category) && !matchesBrand(p.name)) return false;
            if (actualBrandFilter && !matchesActualBrand(p.name)) return false;
            if (gpuChipFilter && category === 'gpu' && !matchesChip(p.name)) return false;
            
            const specLabel = parseFn(p.name);
            if (ramGeneration && category === 'ram' && !specLabel.includes(ramGeneration)) return false;
            if (subcategory && specLabel !== subcategory) return false; 
            
            return true;
        }).map(p => {
            const pts = trendMap.get(String(p.id)) || [];
            const getPriceAtDate = (date: string | null) => {
                if (!date) return p.price;
                const pt = pts.find(x => x.date === date);
                return pt ? pt.price : p.price;
            };
            
            const currentPrice = getPriceAtDate(today);
            
            const changes: Record<'1d'|'7d'|'14d'|'30d', {amt: number, pct: number}> = {
                '1d': {amt: 0, pct: 0},
                '7d': {amt: 0, pct: 0},
                '14d': {amt: 0, pct: 0},
                '30d': {amt: 0, pct: 0},
            };

            for (const [key, daysAgo] of Object.entries({'1d': 1, '7d': 7, '14d': 14, '30d': 30}) as Array<[keyof typeof changes, number]>) {
                const pastDate = findDateAgo(daysAgo);
                if (pastDate) {
                    const pastPrice = getPriceAtDate(pastDate);
                    const amt = currentPrice - pastPrice;
                    const pct = pastPrice > 0 ? (amt / pastPrice) * 100 : 0;
                    changes[key] = {amt, pct};
                }
            }
            
            return {
                id: p.id,
                name: p.name,
                category: p.category,
                currentPrice,
                changes
            };
        });

        if (sortConfig) {
            rows.sort((a, b) => {
                const aVal = a.changes[sortConfig.key].amt;
                const bVal = b.changes[sortConfig.key].amt;
                return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
            });
        } else {
            rows.sort((a, b) => {
                if (a.changes['1d'].amt !== b.changes['1d'].amt) return a.changes['1d'].amt - b.changes['1d'].amt;
                return a.changes['7d'].amt - b.changes['7d'].amt;
            });
        }

        if (category === 'all') {
            return rows.filter(r => r.changes['1d'].amt !== 0 || r.changes['7d'].amt !== 0 || r.changes['14d'].amt !== 0 || r.changes['30d'].amt !== 0);
        }

        return rows;
    })();

    if (loading) {
        return (
            <div className="flex justify-center items-center py-16">
                <RefreshCw className="animate-spin text-indigo-500" size={24} />
            </div>
        );
    }

    // 提供安全回退值，确保在无数据时右侧面板也能正常渲染
    const todaySummary = data?.todaySummary || {
        upCount: 0,
        downCount: 0,
        totalChanges: 0,
        avgUpAmount: 0,
        avgDownAmount: 0
    };

    const marketCenterCategoryTabs = ['all', ...sortCategories(data?.categories || []).filter(c => c !== 'all')];
    const marketCenterFilterCount = [brandFilter, actualBrandFilter, gpuChipFilter, ramGeneration, subcategory].filter(Boolean).length;
    const marketTrendMap = new Map(trendData?.productTrends.map(item => [String(item.hardwareId), item.points]) || []);
    const marketCenterCategoryTrend = marketCenterFilterCount > 0
        ? (trendData?.categoryTotalAvgTrend || []).map(point => ({
            date: point.date,
            avgPrice: productTableData.length ? productTableData.reduce((sum, product) => {
                const history = marketTrendMap.get(String(product.id));
                return sum + (history?.find(item => item.date === point.date)?.price ?? product.currentPrice);
            }, 0) / productTableData.length : 0
        }))
        : trendData?.categoryTotalAvgTrend || [];
    const marketCenterDateMatches = (date: string) => useCustomRange && customStartDate && customEndDate
        ? date >= customStartDate && date <= customEndDate
        : true;
    const marketCenterCategoryTrendWindow = useCustomRange && customStartDate && customEndDate
        ? marketCenterCategoryTrend.filter(point => marketCenterDateMatches(point.date))
        : marketCenterCategoryTrend.slice(-(days + 1));
    const marketCenterChartData = category === 'all'
        ? (data?.chartData || []).filter(point => useCustomRange && customStartDate && customEndDate
            ? marketCenterDateMatches(point.date)
            : point.date >= new Date(Date.now() - days * 86400000).toISOString().slice(0, 10))
        : productTableData.length ? marketCenterCategoryTrendWindow : [];
    const marketCenterCurrentAvg = productTableData.length ? marketCenterCategoryTrendWindow[marketCenterCategoryTrendWindow.length - 1]?.avgPrice ?? null : null;
    const marketCenterStartAvg = productTableData.length ? marketCenterCategoryTrendWindow[0]?.avgPrice ?? null : null;
    const marketCenterChange = marketCenterCurrentAvg !== null && marketCenterStartAvg !== null
        ? marketCenterCurrentAvg - marketCenterStartAvg : null;
    const marketCenterChangePct = marketCenterStartAvg && marketCenterChange !== null
        ? (marketCenterChange / marketCenterStartAvg) * 100 : null;
    const marketCenterUpCount = category === 'all' ? marketOverview?.todaySummary.upCount ?? 0 : todaySummary.todayUpCount ?? todaySummary.upCount;
    const marketCenterDownCount = category === 'all' ? marketOverview?.todaySummary.downCount ?? 0 : todaySummary.todayDownCount ?? todaySummary.downCount;
    const marketCenterTotalChanges = marketCenterUpCount + marketCenterDownCount;
    const marketCenterBrands = Array.from(new Set(trendData?.products.map(product => product.name.match(/^([^\s\(（]+)/)?.[1] || '').filter(Boolean) || [])).sort();
    const marketCenterMatchingRows = productTableData.filter(product => product.name.toLowerCase().includes(productSearchTerm.trim().toLowerCase()));
    const marketCenterProductRows = marketCenterMatchingRows.slice(0, marketVisibleCount);
    const marketCenterSelectedProduct = trendData?.products.find(item => String(item.id) === selectedProductId);
    const selectedHistory = marketProductHistory?.productId === selectedProductId && marketProductHistory.endDate === marketProductHistoryEndDate ? marketProductHistory : null;
    const marketProductHistoryStatus = selectedHistory?.status ?? 'loading';
    const marketCenterSelectedTrendPoints = selectedHistory?.status === 'ready' && selectedHistory.points.length
        ? selectedHistory.points : marketTrendMap.get(selectedProductId) || [];
    const activeMarketProductDays = marketProductDays ?? (useCustomRange ? null : days);
    const waitingForLongHistory = marketProductDays !== null && marketProductDays > 90 && marketProductHistoryStatus !== 'ready';
    const marketCenterSelectedTrend = waitingForLongHistory ? [] : marketProductDays !== null
        ? marketCenterSelectedTrendPoints.slice(-(marketProductDays + 1))
        : useCustomRange && customStartDate && customEndDate
        ? marketCenterSelectedTrendPoints.filter(point => marketCenterDateMatches(point.date))
        : marketCenterSelectedTrendPoints.slice(-(days + 1));
    const marketCenterDownRows = category !== 'all' ? productTableData.filter(row => {
        const points = marketTrendMap.get(String(row.id)) || [];
        const window = useCustomRange && customStartDate && customEndDate
            ? points.filter(point => marketCenterDateMatches(point.date))
            : points.slice(-(days + 1));
        return window.length > 1 && window[window.length - 1].price < window[0].price;
    }) : [];
    const marketCenterChartWithDownData = marketCenterChartData.map(point => {
        if (category === 'all' || !marketCenterDownRows.length) return point;
        const prices = marketCenterDownRows.map(row => marketTrendMap.get(String(row.id))?.find(item => item.date === point.date)?.price ?? row.currentPrice);
        return { ...point, downAvgPrice: prices.length ? prices.reduce((sum, price) => sum + price, 0) / prices.length : null };
    });
    const marketCenterWindowLabel = useCustomRange && customStartDate && customEndDate
        ? `${customStartDate} 至 ${customEndDate}`
        : `近 ${Math.max(days, 30)} 天`;
    const marketLastEvent = data?.recentChanges[0]?.changedAt;
    const marketRowIds = new Set(productTableData.map(item => String(item.id)));
    const marketLows = (trendData?.historicalLows || []).filter(item => marketRowIds.has(String(item.hardwareId)));
    const marketHighs = (trendData?.historicalHighs || []).filter(item => marketRowIds.has(String(item.hardwareId)));
    const clearMarketFilters = () => {
        setBrandFilter(''); setActualBrandFilter(''); setGpuChipFilter(''); setRamGeneration(''); setSubcategory('');
        setSelectedProductId('');
    };

    const changeMarketCenterCategory = (nextCategory: string) => {
        setCategory(nextCategory);
        setSubcategory('');
        setBrandFilter('');
        setActualBrandFilter('');
        setGpuChipFilter('');
        setRamGeneration('');
        setSelectedProductId('');
        setProductSearchTerm('');
    };

    const openMarketProduct = (id: string) => {
        const index = marketCenterMatchingRows.findIndex(row => String(row.id) === id);
        if (index >= marketVisibleCount) setMarketVisibleCount(index + 1);
        if (id !== selectedProductId) setMarketProductDays(null);
        setSelectedProductId(id);
        setMarketScrollRequest('product');
    };

    if (marketCenterMode && !data) {
        return (
            <div className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white text-center shadow-sm">
                <TrendingUp size={30} className="mb-4 text-slate-300" />
                <p className="text-sm font-black text-slate-600">暂时无法获取行情数据</p>
                <p className="mt-1 text-xs text-slate-400">请稍后重试，或检查行情服务是否正常。</p>
                <button onClick={() => fetchData()} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black text-white transition hover:bg-indigo-700"><RefreshCw size={14} /> 重新加载</button>
            </div>
        );
    }

    if (marketCenterMode) {
        const selectedChartData = marketCenterSelectedTrend;
        const historicalExtremes = selectedHistory?.historicalExtremes;
        const extremePrices = [
            { label: '区间最低', price: selectedChartData.length ? Math.min(...selectedChartData.map(point => point.price)) : null, color: 'text-emerald-600' },
            { label: '区间最高', price: selectedChartData.length ? Math.max(...selectedChartData.map(point => point.price)) : null, color: 'text-rose-600' },
            { label: '历史最低价', price: historicalExtremes?.minPrice ?? null, color: 'text-emerald-600' },
            { label: '历史最高价', price: historicalExtremes?.maxPrice ?? null, color: 'text-rose-600' },
        ];
        const productRangeLabel = activeMarketProductDays === 180 ? '近半年' : activeMarketProductDays === 365 ? '近一年' : activeMarketProductDays !== null ? `近 ${activeMarketProductDays} 天` : `${customStartDate} 至 ${customEndDate}`;
        const latestPricePoint = marketCenterSelectedTrendPoints[marketCenterSelectedTrendPoints.length - 1];
        const selectedPriceChanges = [7, 14, 30, 180, 365].map(period => {
            const date = latestPricePoint && new Date(Date.parse(latestPricePoint.date) - period * 86400000).toISOString().slice(0, 10);
            const previous = marketCenterSelectedTrendPoints.find(point => point.date === date);
            if (!latestPricePoint || !previous || previous.price <= 0) return { period, amount: null, percent: null };
            const amount = latestPricePoint.price - previous.price;
            return { period, amount, percent: amount / previous.price * 100 };
        });
        const marketProductDetails = marketCenterSelectedProduct && (
            <div ref={marketProductDetailRef} className="min-w-0 scroll-mt-4 bg-indigo-50/30 p-4 text-slate-800 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold text-indigo-500">单品价格档案</p>
                        <h3 className="mt-1 text-lg font-bold">{marketCenterSelectedProduct.name}</h3>
                        <div className="mt-2 text-3xl font-semibold tabular-nums text-slate-900">¥{marketCenterSelectedProduct.price.toLocaleString('zh-CN')}</div>
                        <p className="mt-1 text-xs text-slate-500">当前报价 · {productRangeLabel}日终价格</p>
                    </div>
                    <button onClick={() => setSelectedProductId('')} aria-label="收起单品价格走势" className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:border-indigo-300"><X size={14} />收起</button>
                </div>
                {useCustomRange && latestPricePoint && <p className="mt-3 text-xs text-slate-500">涨跌以 {latestPricePoint.date} 日终价格为基准</p>}
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
                    {selectedPriceChanges.map(({ period, amount, percent }) => {
                        const color = amount === null || amount === 0 ? 'text-slate-500' : amount > 0 ? 'text-rose-600' : 'text-emerald-600';
                        const sign = amount === null || amount === 0 ? '' : amount > 0 ? '+' : '−';
                        const active = activeMarketProductDays === period;
                        const label = period === 180 ? '近半年' : period === 365 ? '近一年' : `近 ${period} 天`;
                        const missingHistory = period > 90 && marketProductHistoryStatus !== 'ready';
                        return <button key={period} type="button" aria-pressed={active} onClick={() => {
                            setMarketProductDays(period);
                            if (period > 90 && marketProductHistoryStatus === 'error') setMarketProductHistoryRetry(value => value + 1);
                        }} className={`rounded-xl border p-3 text-left transition-colors sm:p-4 ${active ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500/30' : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30'}`}>
                            <p className={`flex items-center justify-between gap-1 text-xs font-semibold ${active ? 'text-indigo-600' : 'text-slate-500'}`}><span>{label}涨跌</span>{active && <span className="h-2 w-2 shrink-0 rounded-full bg-indigo-500" />}</p>
                            <div className={`mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1 tabular-nums ${color}`}>
                                <strong className="text-lg sm:text-xl">{amount === null ? '—' : `${sign}¥${Math.abs(amount).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`}</strong>
                                <span className="text-xs font-semibold">{missingHistory ? marketProductHistoryStatus === 'loading' ? '加载中' : '点击重试' : percent === null ? '数据不足' : `${sign}${Math.abs(percent).toFixed(2)}%`}</span>
                            </div>
                        </button>;
                    })}
                </div>
                <div className="mt-4 h-[280px] rounded-xl border border-slate-200 bg-white py-3 sm:h-[320px]">
                    {selectedChartData.length > 1 ? <ResponsiveContainer width="100%" height="100%">
                        <LineChart key={`${selectedProductId}-${productRangeLabel}`} data={selectedChartData} margin={{ top: 12, right: 18, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(value: string) => value.slice(5)} axisLine={false} tickLine={false} />
                            <YAxis domain={['auto', 'auto']} padding={{ top: 22, bottom: 24 }} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(value: number) => `¥${Math.round(value)}`} axisLine={false} tickLine={false} width={60} />
                            <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0' }} />
                            <Line type="stepAfter" dataKey="price" name="价格（元）" stroke="#4f46e5" strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} shape={<AnimatedMarketPriceLine prices={selectedChartData} />} />
                        </LineChart>
                    </ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm text-slate-500">{waitingForLongHistory ? marketProductHistoryStatus === 'loading' ? '正在加载历史价格…' : '历史价格加载失败，请点击时间卡片重试' : '当前范围没有调价历史可展示'}</div>}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4 rounded-xl bg-white p-4 text-sm sm:grid-cols-4">
                    {extremePrices.map(({ label, price, color }, index) => <div key={label} className={index === 2 ? 'sm:border-l sm:border-slate-200 sm:pl-4' : ''}>
                        <p className="text-xs text-slate-500">{label}</p>
                        <strong className={`mt-1 block tabular-nums ${price === null ? 'text-slate-400' : color}`}>{price === null ? '—' : `¥${price.toLocaleString('zh-CN')}`}</strong>
                        {index >= 2 && price === null && <span className="mt-1 block text-xs text-slate-400">{marketProductHistoryStatus === 'loading' ? '加载中' : marketProductHistoryStatus === 'error' ? '加载失败' : '数据不足'}</span>}
                    </div>)}
                </div>
                <p className="mt-4 text-xs leading-6 text-slate-400">价格走势由平台调价记录还原；无调价记录的日期沿用已知价格。历史最高、最低价基于本站保留的有效报价，排除异常调价记录。</p>
            </div>
        );
        return (
            <div className="market-center-shell min-h-full bg-[#f7f8fa] pb-16 text-slate-800 [color-scheme:light]">
                <div className="max-w-[1500px] mx-auto space-y-5">
                    <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-600">
                                <span className="h-2 w-2 rounded-full bg-indigo-500" />
                                Hardware market desk
                            </div>
                            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">行情中心</h2>
                            <p className="mt-1 text-sm text-slate-500">用真实调价记录，快速判断现在该买什么。</p>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                            <span>数据范围：{useCustomRange && customStartDate && customEndDate ? `${customStartDate} 至 ${customEndDate}` : `近 ${days} 天`}</span>
                            <button
                                onClick={() => fetchData()}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-600  transition hover:border-indigo-300 hover:text-indigo-600"
                            >
                                <RefreshCw size={13} /> 刷新行情
                            </button>
                        </div>
                    </header>

                    <section className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white md:grid-cols-[1.15fr_1fr]">
                        <div className="border-b border-slate-100 p-5 md:border-b-0 md:border-r">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><span className="h-1.5 w-1.5 rounded-full bg-indigo-500" /> 今日行情简报</div>
                            <h3 className="mt-3 text-xl font-bold tracking-tight text-slate-900">
                                {!marketCenterTotalChanges ? '今日暂无调价记录' : marketCenterUpCount > marketCenterDownCount ? '今日涨价记录更多' : marketCenterDownCount > marketCenterUpCount ? '今日降价记录更多' : '今日涨跌记录数相当'}
                            </h3>
                            <p className="mt-2 text-xs leading-6 text-slate-500">{category === 'all' ? '全品类' : CATEGORY_LABELS[category]}统计 · 同一型号多次调价分别计数</p>
                            <p className="text-xs text-slate-400">{marketLastEvent ? `最近调价记录：${marketLastEvent.slice(0, 16).replace('T', ' ')}` : '当前范围暂无调价记录'}</p>
                        </div>
                        <div className="grid grid-cols-3 items-center gap-3 p-5">
                            {[{ label: '涨价记录', value: marketCenterUpCount, color: 'text-rose-600', icon: TrendingUp }, { label: '降价记录', value: marketCenterDownCount, color: 'text-emerald-600', icon: TrendingDown }, { label: '调价总数', value: marketCenterTotalChanges, color: 'text-slate-900', icon: Activity }].map(item => (
                                <div key={item.label}>
                                    <div className="mb-3 flex items-center gap-1.5 text-xs text-slate-500"><item.icon size={13} />{item.label}</div>
                                    <span className={`text-3xl font-semibold tabular-nums ${item.color}`}>{item.value}</span><span className="ml-1 text-xs text-slate-400">次</span>
                                </div>
                            ))}
                        </div>
                    </section>

                    {category === 'all' && (
                        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                            {(marketOverview?.categoryStats || []).map(stat => {
                                const Icon = ({ cpu: Cpu, gpu: CircuitBoard, mainboard: CircuitBoard, ram: MemoryStick, disk: HardDrive })[stat.category] || Cpu;
                                return <button key={stat.category} onClick={() => changeMarketCenterCategory(stat.category)} className="rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-indigo-400 hover:bg-indigo-50/30">
                                    <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-sm font-bold"><Icon size={17} className="text-indigo-500" />{CATEGORY_LABELS[stat.category]}</span><ChevronRight size={15} className="text-slate-400" /></div>
                                    <div className="mt-4 text-xs text-slate-400">在售均价 · {stat.productCount} 款</div>
                                    <div className="mt-1 text-2xl font-semibold tabular-nums">¥{stat.currentAvg.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}</div>
                                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">{[['7天', stat.change7dPct], ['30天', stat.change30dPct]].map(([label, value]) => <span key={label}><span className="mr-1 text-slate-400">{label}</span><strong className={Number(value) > 0 ? 'text-rose-600' : Number(value) < 0 ? 'text-emerald-600' : 'text-slate-500'}>{value === null ? '—' : `${Number(value) > 0 ? '+' : ''}${value}%`}</strong></span>)}</div>
                                </button>;
                            })}
                        </div>
                    )}

                    {category === 'all' && marketOverview && (
                        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                                <div className="text-xs font-bold text-slate-400">今日总变动</div>
                                <div className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{marketOverview.todaySummary.totalChanges}</div>
                                <div className="mt-1 text-xs text-slate-400">涨 {marketOverview.todaySummary.upCount} · 降 {marketOverview.todaySummary.downCount}</div>
                            </div>
                            <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-4">
                                <div className="text-xs font-bold text-rose-500">平均涨幅</div>
                                <div className="mt-2 text-2xl font-semibold tabular-nums text-rose-600">¥{marketOverview.todaySummary.avgUpAmount.toFixed(2)}</div>
                                <div className="mt-1 text-xs text-rose-400">按今日涨价记录计算</div>
                            </div>
                            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                                <div className="text-xs font-bold text-emerald-600">平均降幅</div>
                                <div className="mt-2 text-2xl font-semibold tabular-nums text-emerald-600">¥{Math.abs(marketOverview.todaySummary.avgDownAmount).toFixed(2)}</div>
                                <div className="mt-1 text-xs text-emerald-500">按今日降价记录计算</div>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                                <div className="flex items-center justify-between text-xs font-bold text-slate-400"><span>市场温度</span><Thermometer size={14} className={marketOverview.temperature > 50 ? 'text-rose-500' : 'text-emerald-500'} /></div>
                                <div className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{marketOverview.temperature}°</div>
                                <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="bg-rose-500" style={{ width: `${marketOverview.temperature}%` }} /><div className="bg-emerald-500" style={{ width: `${100 - marketOverview.temperature}%` }} /></div>
                            </div>
                        </section>
                    )}

                    <nav aria-label="行情品类" className="flex items-center gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2  no-scrollbar">
                        {marketCenterCategoryTabs.map(tab => (
                            <button
                                key={tab}
                                aria-current={category === tab ? 'page' : undefined}
                                onClick={() => changeMarketCenterCategory(tab)}
                                className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${category === tab ? 'bg-indigo-600 text-white  ' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                            >
                                {tab === 'all' ? '全品类' : CATEGORY_LABELS[tab] || tab}
                            </button>
                        ))}
                    </nav>

                    <section className="rounded-2xl border border-slate-200 bg-white p-4  sm:p-5">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="relative min-w-[220px] flex-1 sm:flex-none">
                                    <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        value={productSearchTerm}
                                        onChange={event => { setProductSearchTerm(event.target.value); setSelectedProductId(''); }}
                                        disabled={category === 'all'}
                                        aria-label="搜索型号"
                                        placeholder={category === 'all' ? '先选择品类，再搜索型号' : '搜索型号，例如 9800X3D'}
                                        className="disabled:opacity-50 w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                                    />
                                </div>
                                <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
                                    {[7, 14, 30, 60, 90].map(value => (
                                        <button
                                            key={value}
                                            onClick={() => { setDays(value); setUseCustomRange(false); setShowDatePicker(false); }}
                                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${days === value && !useCustomRange ? 'bg-white text-indigo-600 ' : 'text-slate-500 hover:text-slate-900'}`}
                                        >
                                            {value}天
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setShowDatePicker(value => !value)}
                                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${useCustomRange ? 'bg-white text-indigo-600' : 'text-slate-500 hover:text-slate-900'}`}
                                    >
                                        <span className="inline-flex items-center gap-1"><Calendar size={12} />{useCustomRange && customStartDate && customEndDate ? `${customStartDate.slice(5)} → ${customEndDate.slice(5)}` : '自定义'}</span>
                                    </button>
                                </div>
                            </div>
                                    <button disabled={category === 'all'} onClick={() => setShowMarketFilters(true)} className="disabled:cursor-not-allowed disabled:opacity-40 flex cursor-pointer list-none items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600">
                                        <SlidersHorizontal size={14} /> 高级筛选 {marketCenterFilterCount > 0 ? `(${marketCenterFilterCount})` : ''}
                                    </button>
                            {showMarketFilters && <MarketDrawer title="筛选型号" onClose={() => setShowMarketFilters(false)}>
                                <p className="mb-5 text-sm text-slate-500">筛选同步应用于均价走势、阶段榜单和型号列表。</p>
                                <div className="grid gap-3">
                                    {['cpu', 'gpu'].includes(category) && (
                                        <div className="flex gap-1 rounded-xl bg-white p-1 ">
                                            {['', ...(category === 'gpu' ? ['NVIDIA', 'AMD'] : ['AMD', 'Intel'])].map(brand => (
                                                <button key={brand} onClick={() => { setBrandFilter(brand); setSelectedProductId(''); }} className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold ${brandFilter === brand ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                                                    {brand || '全部阵营'}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {category === 'ram' && (
                                        <select aria-label="内存代数" value={ramGeneration} onChange={event => { setRamGeneration(event.target.value); setSubcategory(''); setSelectedProductId(''); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold outline-none">
                                            <option value="">全部内存代数</option><option value="DDR4">DDR4</option><option value="DDR5">DDR5</option>
                                        </select>
                                    )}
                                    {category === 'gpu' && gpuChipSeries.length > 0 && (
                                        <select aria-label="芯片组" value={gpuChipFilter} onChange={event => { setGpuChipFilter(event.target.value); setSelectedProductId(''); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold outline-none">
                                            <option value="">全部芯片组</option>{gpuChipSeries.map(chip => <option key={chip} value={chip}>{chip}</option>)}
                                        </select>
                                    )}
                                    {marketCenterBrands.length > 0 && category !== 'all' && (
                                        <select aria-label="品牌" value={actualBrandFilter} onChange={event => { setActualBrandFilter(event.target.value); setSelectedProductId(''); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold outline-none">
                                            <option value="">全部品牌</option>{marketCenterBrands.map(brand => <option key={brand} value={brand}>{brand}</option>)}
                                        </select>
                                    )}
                                    {category !== 'gpu' && category !== 'all' && specPriceTable && specPriceTable.length > 0 && (
                                        <select aria-label="规格或代数" value={subcategory} onChange={event => { setSubcategory(event.target.value); setSelectedProductId(''); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold outline-none">
                                            <option value="">全部{category === 'cpu' ? '代数' : '规格'}</option>{specPriceTable.map(row => <option key={row.label} value={row.label}>{row.label}</option>)}
                                        </select>
                                    )}
                                    <button onClick={clearMarketFilters} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500 hover:text-indigo-600">清除筛选</button>
                                </div>
                                <button onClick={() => setShowMarketFilters(false)} className="mt-6 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white">查看结果</button>
                            </MarketDrawer>}
                        </div>
                        {showDatePicker && (
                            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                                <Calendar size={14} className="text-slate-400" />
                                <input aria-label="开始日期" type="date" value={customStartDate} onChange={event => setCustomStartDate(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 outline-none" />
                                <span className="text-xs font-bold text-slate-400">至</span>
                                <input aria-label="结束日期" type="date" value={customEndDate} onChange={event => setCustomEndDate(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 outline-none" />
                                <button
                                    onClick={() => { if (customStartDate && customEndDate && customStartDate <= customEndDate) { setUseCustomRange(true); setShowDatePicker(false); } }}
                                    disabled={!customStartDate || !customEndDate || customStartDate > customEndDate}
                                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                                >应用日期</button>
                                {useCustomRange && <button onClick={() => { setUseCustomRange(false); setShowDatePicker(false); }} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600">恢复快捷范围</button>}
                            </div>
                        )}
                    </section>

                    {category !== 'all' && marketCenterCurrentAvg !== null && (
                        <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-2xl border border-slate-200 bg-white p-4 "><div className="text-xs font-bold text-slate-400">当前在售均价</div><div className="mt-2 text-2xl font-semibold text-slate-900">¥{marketCenterCurrentAvg.toFixed(0)}</div><div className="mt-1 text-xs text-slate-400">{productTableData.length} 款匹配型号</div></div>
                            <div className={`rounded-2xl border p-4  ${marketCenterChange !== null && marketCenterChange > 0 ? 'border-rose-100 bg-rose-50/60' : 'border-emerald-100 bg-emerald-50/60'}`}><div className="text-xs font-bold text-slate-500">近 {days} 天均价变化</div><div className={`mt-2 text-2xl font-semibold ${marketCenterChange !== null && marketCenterChange > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{marketCenterChange === null ? '—' : `${marketCenterChange > 0 ? '+' : ''}¥${marketCenterChange.toFixed(0)}`}</div><div className="mt-1 text-xs font-bold text-slate-500">{marketCenterChangePct === null ? '数据不足' : `${marketCenterChangePct > 0 ? '+' : ''}${marketCenterChangePct.toFixed(2)}%`}</div></div>
                            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 "><div className="text-xs font-bold text-indigo-500">今日品类调价记录</div><div className="mt-2 text-2xl font-semibold text-indigo-700">{marketCenterTotalChanges}</div><div className="mt-1 text-xs font-bold text-indigo-500">涨 {marketCenterUpCount} · 降 {marketCenterDownCount}</div></div>
                        </div>
                    )}

                    {category !== 'all' && trendData && (
                        <section className="grid gap-3 sm:grid-cols-3">
                            {[
                                ['窗口涨价记录', todaySummary.monthUpCount ?? todaySummary.upCount, 'rose', todaySummary.todayUpCount ?? todaySummary.upCount],
                                ['窗口降价记录', todaySummary.monthDownCount ?? todaySummary.downCount, 'emerald', todaySummary.todayDownCount ?? todaySummary.downCount],
                                ['窗口总变动', todaySummary.monthTotalChanges ?? todaySummary.totalChanges, 'indigo', todaySummary.todayTotalChanges ?? todaySummary.totalChanges],
                            ].map(([label, value, tone, todayValue]) => (
                                <div key={String(label)} className={`rounded-2xl border p-4 ${tone === 'rose' ? 'border-rose-100 bg-rose-50/50' : tone === 'emerald' ? 'border-emerald-100 bg-emerald-50/50' : 'border-indigo-100 bg-indigo-50/50'}`}>
                                    <div className={`text-xs font-bold ${tone === 'rose' ? 'text-rose-500' : tone === 'emerald' ? 'text-emerald-600' : 'text-indigo-500'}`}>{label}</div>
                                    <div className={`mt-2 text-2xl font-semibold tabular-nums ${tone === 'rose' ? 'text-rose-600' : tone === 'emerald' ? 'text-emerald-600' : 'text-indigo-700'}`}>{value}</div>
                                    <div className="mt-1 text-xs text-slate-400">{marketCenterWindowLabel} · 今日 {todayValue}</div>
                                </div>
                            ))}
                        </section>
                    )}

                    {category !== 'all' && specPriceTable && specPriceTable.length > 0 && (
                        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                            <div className="flex items-center justify-between border-b border-slate-100 p-5">
                                <div><h3 className="text-lg font-bold text-slate-900">{CATEGORY_LABELS[category]} 规格行情对比</h3><p className="mt-1 text-xs text-slate-500">按规格聚合均价，点击一行可筛选型号列表</p></div>
                                <span className="text-xs text-slate-400">{specPriceTable.length} 组</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[720px] text-sm tabular-nums">
                                    <thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-5 py-3 text-left">规格 / 代数</th><th className="px-4 py-3 text-right">在售数</th><th className="px-4 py-3 text-right">当前均价</th><th className="px-4 py-3 text-right">今日涨跌</th>{['7日', '30日'].map(period => <th key={period} className="px-4 py-3 text-right">较{period}前</th>)}</tr></thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {specPriceTable.map(row => {
                                            const change7 = row.changes.find(item => item.period === '7日')?.pct;
                                            const change30 = row.changes.find(item => item.period === '30日')?.pct;
                                            const isSelected = (category === 'gpu' ? gpuChipFilter : subcategory) === row.label;
                                            return <tr key={row.label} onClick={() => { if (category === 'gpu') setGpuChipFilter(row.label); else setSubcategory(row.label); setSelectedProductId(''); setMarketScrollRequest('table'); }} className={`cursor-pointer transition hover:bg-indigo-50/50 ${isSelected ? 'bg-indigo-50' : ''}`}>
                                                <td className="px-5 py-3 font-semibold text-slate-700">{row.label}</td><td className="px-4 py-3 text-right text-slate-500">{row.count}</td><td className="px-4 py-3 text-right font-semibold text-slate-900">¥{row.currentAvg.toFixed(0)}</td>
                                                <td className="px-4 py-3 text-right"><span className="text-rose-600">↑{row.todayUp}</span><span className="mx-1 text-slate-300">/</span><span className="text-emerald-600">↓{row.todayDown}</span></td>
                                                {[change7, change30].map((value, index) => <td key={index} className={`px-4 py-3 text-right font-semibold ${value === null || value === undefined ? 'text-slate-300' : value > 0 ? 'text-rose-600' : value < 0 ? 'text-emerald-600' : 'text-slate-400'}`}>{value === null || value === undefined ? '—' : `${value > 0 ? '+' : ''}${value.toFixed(2)}%`}</td>)}
                                            </tr>;
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}

                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.7fr)]">
                        <section ref={chartRef} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4  sm:p-6">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400"><Activity size={14} className="text-indigo-500" /> 趋势观察</div><h3 className="mt-1 text-lg font-semibold text-slate-900">{category === 'all' ? '全品类调价节奏' : `${CATEGORY_LABELS[category] || category}均价走势`}</h3></div>
                                <button disabled={!!downloading} onClick={() => handleDownloadImage(chartRef, `行情走势_${CATEGORY_LABELS[category] || '全品类'}_${new Date().toISOString().slice(0, 10)}.png`)} className="inline-flex items-center gap-1.5 self-start rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-500 hover:border-indigo-300 hover:text-indigo-600"><Download size={13} /> 导出</button>
                            </div>
                            <p className="mt-2 text-xs text-slate-400">{category === 'all' ? '红色：涨价记录 · 绿色：降价记录' : `当前筛选：${[brandFilter, actualBrandFilter, ramGeneration, gpuChipFilter, subcategory].filter(Boolean).join(' / ') || '全部在售型号'} · ${marketCenterWindowLabel}`}</p>
                            {category !== 'all' && <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400"><span><i className="mr-1 inline-block h-2 w-5 rounded-full bg-indigo-500 align-middle" />整体均价</span><span><i className="mr-1 inline-block h-0 w-5 border-t-2 border-dashed border-emerald-500 align-middle" />降价商品均价（{marketCenterDownRows.length} 款）</span>{marketCenterChange !== null && <span className={marketCenterChange > 0 ? 'text-rose-600' : marketCenterChange < 0 ? 'text-emerald-600' : 'text-slate-500'}>区间变化 {marketCenterChange > 0 ? '+' : ''}¥{marketCenterChange.toFixed(0)} ({marketCenterChangePct === null ? '—' : `${marketCenterChangePct > 0 ? '+' : ''}${marketCenterChangePct.toFixed(2)}%`})</span>}</div>}
                            <div className="mt-5 h-[300px] w-full">
                                {marketCenterChartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={marketCenterChartWithDownData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(value: string) => value.slice(5)} axisLine={false} tickLine={false} />
                                            <YAxis domain={category === 'all' ? [0, 'auto'] : ['auto', 'auto']} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(value: number) => category === 'all' ? `${value}` : `¥${Math.round(value)}`} width={category === 'all' ? 32 : 54} />
                                            <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 12px 30px rgba(15,23,42,.10)' }} labelFormatter={(value) => `日期 ${value}`} />
                                            {category === 'all' ? <><Line type="linear" dataKey="upCount" name="涨价" stroke="#f43f5e" strokeWidth={2.5} dot={false} /><Line type="linear" dataKey="downCount" name="降价" stroke="#10b981" strokeWidth={2.5} dot={false} /></> : <><Line type="linear" dataKey="avgPrice" name="整体均价（元）" stroke="#4f46e5" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />{marketCenterDownRows.length > 0 && <Line type="linear" dataKey="downAvgPrice" name="降价商品均价（元）" stroke="#10b981" strokeWidth={2.5} strokeDasharray="5 5" dot={false} activeDot={{ r: 4 }} />}</>}
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-400">当前时间范围暂无足够趋势数据</div>}
                            </div>
                        </section>

                        <section className="rounded-2xl border border-slate-200 bg-white p-4  sm:p-6">
                            <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400"><TrendingDown size={14} className="text-emerald-500" /> 价格机会</div><h3 className="mt-1 text-lg font-semibold text-slate-900">{category === 'all' ? '最新调价动态' : '阶段高低位'}</h3></div><span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">{Math.max(days, 30)} 天</span></div>
                            {category !== 'all' && trendData ? (
                                <div className="mt-5 space-y-5">
                                    <div ref={lowRef}><div className="mb-2 flex items-center justify-between text-xs font-semibold text-emerald-700"><span>触及阶段低位</span><div className="flex items-center gap-2"><span>{marketLows.length} 款</span><button disabled={!!downloading} onClick={() => handleDownloadImage(lowRef, `史低榜单_${new Date().toISOString().slice(0, 10)}.png`)} className="rounded-md border border-emerald-200 px-2 py-1 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100">导出</button></div></div><div className="space-y-2">{marketLows.slice(0, 5).map((item, index) => <button key={item.hardwareId} onClick={() => openMarketProduct(String(item.hardwareId))} className="flex w-full items-center justify-between gap-2 rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-left transition hover:bg-emerald-100/70"><span className="flex min-w-0 items-center gap-2 truncate text-xs font-bold text-slate-700"><span className="text-emerald-600">{index + 1}.</span>{item.name}</span><span className="shrink-0 text-xs font-semibold text-emerald-600">¥{item.currentPrice}</span></button>)}{marketLows.length === 0 && <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-400">暂时没有阶段低位型号</div>}</div></div>
                                    <div ref={highRef}><div className="mb-2 flex items-center justify-between text-xs font-semibold text-rose-700"><span>触及阶段高位</span><div className="flex items-center gap-2"><span>{marketHighs.length} 款</span><button disabled={!!downloading} onClick={() => handleDownloadImage(highRef, `破价榜单_${new Date().toISOString().slice(0, 10)}.png`)} className="rounded-md border border-rose-200 px-2 py-1 text-[10px] font-bold text-rose-700 hover:bg-rose-100">导出</button></div></div><div className="space-y-2">{marketHighs.slice(0, 5).map((item, index) => <button key={item.hardwareId} onClick={() => openMarketProduct(String(item.hardwareId))} className="flex w-full items-center justify-between gap-2 rounded-xl border border-rose-100 bg-rose-50/60 px-3 py-2 text-left transition hover:bg-rose-100/70"><span className="flex min-w-0 items-center gap-2 truncate text-xs font-bold text-slate-700"><span className="text-rose-600">{index + 1}.</span>{item.name}</span><span className="shrink-0 text-xs font-semibold text-rose-600">¥{item.currentPrice}</span></button>)}{marketHighs.length === 0 && <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-400">暂时没有阶段高位型号</div>}</div></div>
                                </div>
                            ) : (
                                <div className="mt-5 space-y-2">{(marketOverview?.recentEvents || []).slice(0, 6).map((event, index) => <div key={`${event.id}-${index}`} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 last:border-0"><div className="min-w-0"><div className="truncate text-xs font-bold text-slate-700">{event.name}</div><div className="mt-1 text-[10px] text-slate-400">{CATEGORY_LABELS[event.category] || event.category} · {event.changedAt.slice(5, 16)}</div></div><span className={`shrink-0 text-xs font-semibold ${event.changeAmount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{event.changeAmount > 0 ? '+' : ''}¥{event.changeAmount.toFixed(0)}</span></div>)}{(!marketOverview?.recentEvents || marketOverview.recentEvents.length === 0) && <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-400">近期没有调价记录</div>}</div>
                            )}
                        </section>
                    </div>

                    {category !== 'all' && trendData && (
                        <section ref={tableRef} className="scroll-mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                            <div className="flex flex-col gap-2 border-b border-slate-100 p-5 sm:flex-row sm:items-end sm:justify-between">
                                <div><h3 className="text-lg font-bold">{subcategory || gpuChipFilter || CATEGORY_LABELS[category]} 在售型号</h3><p className="mt-1 text-xs text-slate-500">按涨跌金额排序 · 点击型号展开日终价格走势</p></div>
                                <span className="text-xs text-slate-500">已显示 {marketCenterProductRows.length} / {marketCenterMatchingRows.length} 款</span>
                            </div>
                            {marketCenterSelectedProduct && !marketCenterProductRows.some(row => String(row.id) === selectedProductId) && marketProductDetails}
                            <div className="overflow-x-auto [container-type:inline-size]">
                                <table className="w-full min-w-[700px] text-sm tabular-nums">
                                    <thead className="bg-slate-50 text-xs text-slate-500"><tr>
                                        <th className="px-5 py-3 text-left">型号</th>
                                        <th className="px-4 py-3 text-right">当前价格</th>
                                        <th className="px-4 py-3">近 {days} 天走势</th>
                                        {(['1d', '7d', '14d', '30d'] as const).map(key => <th key={key} className="px-4 py-3 text-right" aria-sort={sortConfig?.key === key ? sortConfig.direction === 'asc' ? 'ascending' : 'descending' : 'none'}>
                                            <button className="inline-flex items-center gap-1 whitespace-nowrap hover:text-indigo-600" onClick={() => setSortConfig(previous => ({ key, direction: previous?.key === key && previous.direction === 'asc' ? 'desc' : 'asc' }))}>
                                                近 {key.replace('d', '')} 天 <ArrowUpDown size={12} className={sortConfig?.key === key ? 'text-indigo-600' : 'text-slate-300'} />
                                            </button>
                                        </th>)}
                                    </tr></thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {marketCenterProductRows.map(row => {
                                            const points = (marketTrendMap.get(String(row.id)) || []).slice(-(days + 1));
                                            const values = points.map(point => point.price);
                                            const min = Math.min(...values), max = Math.max(...values);
                                            const range = max - min;
                                            const delta = values.length ? values[values.length - 1] - values[0] : 0;
                                            const path = values.map((value, index) => `${index / (values.length - 1) * 64},${range ? 20 - (value - min) / range * 16 : 11}`).join(' ');
                                            const isExpanded = String(row.id) === selectedProductId;
                                            return <Fragment key={row.id}>
                                                <tr className={isExpanded ? 'bg-indigo-50' : 'hover:bg-indigo-50/40'}>
                                                    <td className="max-w-[290px] px-5 py-3"><button aria-expanded={isExpanded} onClick={() => isExpanded ? setSelectedProductId('') : openMarketProduct(String(row.id))} className="flex items-center gap-2 text-left font-semibold text-slate-700 hover:text-indigo-600"><ChevronRight size={15} className={`shrink-0 text-indigo-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />{row.name}</button></td>
                                                    <td className="px-4 py-3 text-right font-semibold text-slate-900">¥{row.currentPrice.toLocaleString('zh-CN')}</td>
                                                    <td className="px-4 py-3 text-center">{values.length > 1 ? <svg width="64" height="22" viewBox="0 0 64 22" className="inline-block" aria-label="价格走势"><polyline fill="none" stroke={delta > 0 ? '#e11d48' : delta < 0 ? '#059669' : '#94a3b8'} strokeWidth="1.7" points={path} /></svg> : <span className="text-slate-400">暂无记录</span>}</td>
                                                    {(['1d', '7d', '14d', '30d'] as const).map(key => {
                                                        const change = row.changes[key];
                                                        const covered = (trendData.categoryTotalAvgTrend?.length || 0) > Number(key.replace('d', ''));
                                                        return <td key={key} className={`whitespace-nowrap px-4 py-3 text-right text-xs ${change.amt > 0 ? 'text-rose-600' : change.amt < 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                            <span className="font-semibold">{!covered ? '—' : change.amt === 0 ? '持平' : `${change.amt > 0 ? '+' : ''}${change.pct.toFixed(2)}%`}</span>
                                                            {covered && change.amt !== 0 && <span className="mt-1 block text-[10px]">{change.amt > 0 ? '+' : '−'}¥{Math.abs(change.amt).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}</span>}
                                                        </td>;
                                                    })}
                                                </tr>
                                                {isExpanded && <tr><td colSpan={7} className="p-0"><div className="sticky left-0 w-[100cqw] max-w-full">{marketProductDetails}</div></td></tr>}
                                            </Fragment>;
                                        })}
                                    </tbody>
                                </table>
                                {!marketCenterProductRows.length && <div className="p-12 text-center text-sm text-slate-500">没有符合条件的型号，请调整搜索或筛选。</div>}
                            </div>
                            {marketVisibleCount < marketCenterMatchingRows.length && <div className="border-t border-slate-100 p-4 text-center"><button onClick={() => setMarketVisibleCount(count => count + 40)} className="rounded-lg border border-slate-200 px-5 py-2 text-xs font-semibold text-slate-600 hover:border-indigo-400">加载更多型号</button></div>}
                        </section>
                    )}
                    <footer className="flex flex-wrap justify-between gap-2 border-t border-slate-200 pt-4 text-xs text-slate-400">
                        <span>DIYXX · 硬件价格观察</span><span>数据来自本站在售报价与调价记录 · 品类均价受在售型号构成影响</span>
                    </footer>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 mb-20 lg:mb-0 lg:h-[calc(100vh-8rem)] px-3 sm:px-4 lg:px-0">
            {/* ====== 中间主内容区（可滚动） ====== */}
            <div className="flex-1 lg:overflow-y-auto custom-scrollbar space-y-4 lg:space-y-5 lg:pr-2 min-w-0">
                {!data ? (
                    // 无数据时的空状态（替代原先占据全版的空白）
                    <div className="flex flex-col items-center justify-center py-32 text-slate-400 animate-page-enter h-full">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                            <TrendingUp size={28} className="text-slate-300" />
                        </div>
                        <p className="text-sm font-bold text-slate-500 mb-1">暂无价格趋势数据</p>
                        <p className="text-xs text-slate-400 mb-4">请确认后端服务运行正常后刷新</p>
                        <button
                            onClick={() => fetchData()}
                            className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors btn-press flex items-center gap-2"
                        >
                            <RefreshCw size={14} /> 重新加载
                        </button>
                    </div>
                ) : (
                    <>
                        {/* 筛选器 - 粘性顶部 (高级感响应式版) */}
                        <div className="sticky top-0 z-20 -mt-3 pt-3 pb-4 mb-6 bg-slate-50/85 dark:bg-slate-950/85 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 -mx-3 px-3 sm:mx-0 sm:px-0 transition-all duration-300">
                            <div className="flex flex-col xl:flex-row xl:justify-between gap-4 max-w-full">
                                {/* 第一组：品类与规格过滤 (横向滑动) */}
                                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0 shrink-0 w-full xl:w-auto">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100/50 dark:bg-indigo-900/30 hidden sm:flex items-center justify-center shrink-0 mr-1">
                                        <Filter size={14} className="text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    
                                    {publicMode ? (
                                        <div className="px-5 py-2 text-[13px] tracking-wider font-extrabold bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-200/50 dark:shadow-none rounded-xl flex items-center justify-center shrink-0">
                                            CPU 专区
                                        </div>
                                    ) : (
                                        <select
                                            value={category}
                                            onChange={e => {
                                                setCategory(e.target.value);
                                                setSubcategory('');
                                                setBrandFilter('');
                                                setActualBrandFilter('');
                                                setGpuChipFilter('');
                                                setRamGeneration('');
                                                setSelectedProductId('');
                                            }}
                                            className="px-4 py-2 text-sm font-semibold border border-slate-200/60 dark:border-slate-700/60 rounded-xl bg-white/90 dark:bg-slate-800/90 shadow-sm focus:ring-2 focus:ring-indigo-500/50 hover:border-indigo-300 transition-all outline-none shrink-0"
                                        >
                                            <option value="all">全部品类</option>
                                            {sortCategories(data.categories).map(c => (
                                                <option key={c} value={c}>{CATEGORY_LABELS[c] || c}</option>
                                            ))}
                                        </select>
                                    )}

                                    {category === 'ram' && (
                                        <select
                                            value={ramGeneration}
                                            onChange={e => {
                                                setRamGeneration(e.target.value);
                                                setSubcategory('');
                                            }}
                                            className="px-4 py-2 text-sm font-semibold border border-slate-200/60 dark:border-slate-700/60 rounded-xl bg-white/90 dark:bg-slate-800/90 shadow-sm focus:ring-2 focus:ring-indigo-500/50 hover:border-indigo-300 transition-all outline-none shrink-0"
                                        >
                                            <option value="">全部代数 (DDR4/5)</option>
                                            <option value="DDR4">DDR4 专区</option>
                                            <option value="DDR5">DDR5 专区</option>
                                        </select>
                                    )}

                                    {/* GPU Dropdown */}
                                    {category === 'gpu' && gpuChipSeries.length > 0 && (
                                        <select
                                            value={gpuChipFilter}
                                            onChange={e => { setGpuChipFilter(e.target.value); setSelectedProductId(''); }}
                                            className="px-4 py-2 text-sm font-semibold border border-slate-200/60 dark:border-slate-700/60 rounded-xl bg-white/90 dark:bg-slate-800/90 shadow-sm focus:ring-2 focus:ring-indigo-500/50 hover:border-indigo-300 transition-all outline-none shrink-0"
                                        >
                                            <option value="">全部芯片组</option>
                                            {gpuChipSeries.map(s => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                    )}

                                    {/* Dynamic OEM Brands */}
                                    {['ram', 'disk', 'gpu', 'mainboard', 'motherboard', 'monitor', 'cooler', 'power', 'case', 'peripheral'].includes(category) && trendData && trendData.products && (
                                        (() => {
                                            const brands = Array.from(new Set(
                                                trendData.products
                                                    .filter(p => p.price > 0 && p.category === category)
                                                    .map(p => {
                                                        const m = p.name.match(/^([^\s\(（]+)/);
                                                        return m ? m[1] : '';
                                                    })
                                                    .filter(b => b.length > 0 && b.length < 15)
                                            )).sort();
                                            if (brands.length === 0) return null;
                                            return (
                                                <select
                                                    value={actualBrandFilter}
                                                    onChange={e => { setActualBrandFilter(e.target.value); setSelectedProductId(''); }}
                                                    className="px-4 py-2 text-sm font-semibold border border-slate-200/60 dark:border-slate-700/60 rounded-xl bg-white/90 dark:bg-slate-800/90 shadow-sm focus:ring-2 focus:ring-indigo-500/50 hover:border-indigo-300 transition-all outline-none max-w-[150px] shrink-0"
                                                >
                                                    <option value="">全部品牌</option>
                                                    {brands.map(b => <option key={b} value={b}>{b}</option>)}
                                                </select>
                                            );
                                        })()
                                    )}

                                    {/* General Subcategory */}
                                    {category !== 'gpu' && category !== 'all' && specPriceTable && specPriceTable.length > 0 && (
                                        <select
                                            value={subcategory}
                                            onChange={e => setSubcategory(e.target.value)}
                                            className="px-4 py-2 text-sm font-semibold border border-slate-200/60 dark:border-slate-700/60 rounded-xl bg-white/90 dark:bg-slate-800/90 shadow-sm focus:ring-2 focus:ring-indigo-500/50 hover:border-indigo-300 transition-all outline-none shrink-0"
                                        >
                                            <option value="">全部{category === 'cpu' ? '代数' : '具体规格'}</option>
                                            {specPriceTable.map(row => (
                                                <option key={row.label} value={row.label}>{row.label}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                {/* 第二组：品牌组和单品列表 */}
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    {['cpu', 'gpu'].includes(category) && (
                                        <div className="flex gap-1 p-1 bg-slate-200/60 dark:bg-slate-800/60 rounded-xl shadow-inner shrink-0 cursor-pointer border border-transparent">
                                            {[
                                                { value: '', label: '全部' },
                                                ...(category === 'gpu'
                                                    ? [{ value: 'NVIDIA', label: 'N卡' }, { value: 'AMD', label: 'A卡' }]
                                                    : [{ value: 'AMD', label: 'AMD' }, { value: 'Intel', label: 'Intel' }]
                                                )
                                            ].map(b => (
                                                <button
                                                    key={b.value}
                                                    onClick={() => { setBrandFilter(b.value); setSelectedProductId(''); }}
                                                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 ${
                                                        brandFilter === b.value
                                                            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                                                    }`}
                                                >
                                                    {b.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {category !== 'all' && trendData && trendData.products && (
                                        <select
                                            value={selectedProductId}
                                            onChange={e => setSelectedProductId(e.target.value)}
                                            className="flex-1 sm:flex-none sm:w-[240px] px-4 py-2 text-sm font-semibold border border-slate-200/60 dark:border-slate-700/60 rounded-xl bg-white/90 dark:bg-slate-800/90 shadow-sm focus:ring-2 focus:ring-indigo-500/50 hover:border-indigo-300 transition-all outline-none truncate"
                                        >
                                            <option value="">查看单品走势...</option>
                                            {trendData.products
                                                .filter(p => matchesBrand(p.name) && matchesChip(p.name))
                                                .map(p => (
                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                ))}
                                        </select>
                                    )}
                                </div>
                            </div>

                            {/* 第三组：时间区间选择 */}
                            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-3 mt-3 w-full border-t border-slate-200/50 dark:border-slate-700/50">
                                <div className="flex gap-1 p-1 bg-slate-200/60 dark:bg-slate-800/60 rounded-xl shadow-inner shrink-0">
                                    {[7, 14, 30, 60, 90].map(d => (
                                        <button
                                            key={d}
                                            onClick={() => { setDays(d); setUseCustomRange(false); setShowDatePicker(false); }}
                                            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 ${
                                                days === d && !useCustomRange
                                                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                                            }`}
                                        >
                                            {d}天
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setShowDatePicker(!showDatePicker)}
                                        className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 flex items-center gap-1.5 ${
                                            useCustomRange
                                                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                                        }`}
                                    >
                                        <Calendar size={12} />
                                        {useCustomRange && customStartDate && customEndDate
                                            ? `${customStartDate.slice(5)} → ${customEndDate.slice(5)}`
                                            : '自定义'}
                                    </button>
                                </div>

                                {showDatePicker && (
                                    <div className="flex items-center gap-2 bg-white/90 dark:bg-slate-800/90 border border-slate-200/60 dark:border-slate-700/60 rounded-xl px-3 py-1.5 shadow-sm animate-page-enter">
                                        <input
                                            type="date"
                                            value={customStartDate}
                                            onChange={e => setCustomStartDate(e.target.value)}
                                            className="text-xs border-0 outline-none bg-transparent text-slate-700 dark:text-slate-200 font-semibold w-[100px] sm:w-auto"
                                        />
                                        <span className="text-slate-300 dark:text-slate-500 text-xs font-black">→</span>
                                        <input
                                            type="date"
                                            value={customEndDate}
                                            onChange={e => setCustomEndDate(e.target.value)}
                                            className="text-xs border-0 outline-none bg-transparent text-slate-700 dark:text-slate-200 font-semibold w-[100px] sm:w-auto"
                                        />
                                        <button
                                            onClick={() => {
                                                if (customStartDate && customEndDate && customStartDate <= customEndDate) {
                                                    setUseCustomRange(true);
                                                    setShowDatePicker(false);
                                                }
                                            }}
                                            disabled={!customStartDate || !customEndDate || customStartDate > customEndDate}
                                            className="px-3 py-1.5 bg-indigo-500 text-white text-xs font-bold rounded-lg flex-shrink-0 hover:bg-indigo-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed leading-none shadow-sm"
                                        >
                                            确定
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

            {/* 单品类迷你统计条 (高颜值毛玻璃/微光效卡片) */}
            {category !== 'all' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
                    {/* 涨价模块 */}
                    <div className="relative overflow-hidden group bg-gradient-to-br from-white to-rose-50/50 dark:from-slate-900 dark:to-rose-900/10 p-4 xl:p-5 rounded-2xl border border-rose-100/60 dark:border-rose-900/30 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-400/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700" />
                        <div className="relative z-10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-rose-100 dark:border-rose-800/50 text-rose-500 flex items-center justify-center transform group-hover:-translate-y-1 transition-transform duration-300">
                                    <TrendingUp size={20} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-1">本月涨价趋势</div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-2xl font-black text-rose-600 dark:text-rose-500 leading-none drop-shadow-sm">{todaySummary.monthUpCount ?? todaySummary.upCount}</span>
                                        <span className="text-[10px] font-bold text-rose-400 bg-rose-100/50 dark:bg-rose-900/50 px-2 py-0.5 rounded-full">今日: {todaySummary.todayUpCount ?? todaySummary.upCount}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* 降价模块 */}
                    <div className="relative overflow-hidden group bg-gradient-to-br from-white to-emerald-50/50 dark:from-slate-900 dark:to-emerald-900/10 p-4 xl:p-5 rounded-2xl border border-emerald-100/60 dark:border-emerald-900/30 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700" />
                        <div className="relative z-10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-emerald-100 dark:border-emerald-800/50 text-emerald-500 flex items-center justify-center transform group-hover:-translate-y-1 transition-transform duration-300">
                                    <TrendingDown size={20} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-1">本月降价趋势</div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-2xl font-black text-emerald-600 dark:text-emerald-500 leading-none drop-shadow-sm">{todaySummary.monthDownCount ?? todaySummary.downCount}</span>
                                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-100/50 dark:bg-emerald-900/50 px-2 py-0.5 rounded-full">今日: {todaySummary.todayDownCount ?? todaySummary.downCount}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 总变动模块 */}
                    <div className="relative overflow-hidden group bg-gradient-to-br from-white to-indigo-50/50 dark:from-slate-900 dark:to-indigo-900/10 p-4 xl:p-5 rounded-2xl border border-indigo-100/60 dark:border-indigo-900/30 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-400/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700" />
                        <div className="relative z-10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-indigo-100 dark:border-indigo-800/50 text-indigo-500 flex items-center justify-center transform group-hover:-translate-y-1 transition-transform duration-300">
                                    <Activity size={20} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-1">本月总变动数</div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 leading-none drop-shadow-sm">{todaySummary.monthTotalChanges ?? todaySummary.totalChanges}</span>
                                        <span className="text-[10px] font-bold text-indigo-400 bg-indigo-100/50 dark:bg-indigo-900/50 px-2 py-0.5 rounded-full">今日: {todaySummary.todayTotalChanges ?? todaySummary.totalChanges}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* 全部品类全局概览面板 */}
            {category === 'all' && marketOverview && (
                <div className="space-y-6 animate-page-enter">
                    {/* A. 顶部 KPI 指标卡片行 */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <div className="text-xs font-bold text-slate-400 mb-1 flex items-center justify-between">
                                今日变动 (件)
                                <Activity size={14} className="text-blue-500" />
                            </div>
                            <div className="text-2xl font-black text-slate-800">{marketOverview.todaySummary.totalChanges}</div>
                            <div className="mt-2 flex gap-2 text-[10px] font-bold">
                                <span className="text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded">涨 {marketOverview.todaySummary.upCount}</span>
                                <span className="text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded">降 {marketOverview.todaySummary.downCount}</span>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-rose-100 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-rose-50 rounded-full blur-xl -mr-4 -mt-4 transition-transform group-hover:scale-150 duration-500" />
                            <div className="text-xs font-bold text-rose-400 mb-1 flex items-center justify-between relative z-10">
                                涨价商品
                                <TrendingUp size={14} className="text-rose-500" />
                            </div>
                            <div className="text-2xl font-black text-rose-600 relative z-10">{marketOverview.todaySummary.upCount}</div>
                            <div className="text-[10px] text-rose-500/70 mt-2 relative z-10">
                                平均涨幅: ¥{marketOverview.todaySummary.avgUpAmount.toFixed(2)}
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-50 rounded-full blur-xl -mr-4 -mt-4 transition-transform group-hover:scale-150 duration-500" />
                            <div className="text-xs font-bold text-emerald-400 mb-1 flex items-center justify-between relative z-10">
                                降价商品
                                <TrendingDown size={14} className="text-emerald-500" />
                            </div>
                            <div className="text-2xl font-black text-emerald-600 relative z-10">{marketOverview.todaySummary.downCount}</div>
                            <div className="text-[10px] text-emerald-500/70 mt-2 relative z-10">
                                平均降幅: ¥{Math.abs(marketOverview.todaySummary.avgDownAmount).toFixed(2)}
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <div className="text-xs font-bold text-slate-400 mb-1 flex items-center justify-between">
                                市场温度
                                <Thermometer size={14} className={marketOverview.temperature > 50 ? "text-rose-500" : "text-emerald-500"} />
                            </div>
                            <div className="text-2xl font-black text-slate-800">{marketOverview.temperature}° <span className="text-xs text-slate-400 font-medium ml-1">涨跌比</span></div>
                            <div className="mt-2 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                                <div className="h-full bg-rose-500" style={{ width: `${marketOverview.temperature}%` }} />
                                <div className="h-full bg-emerald-500" style={{ width: `${100 - marketOverview.temperature}%` }} />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6">
                        {/* B. 品类涨跌热力概览 */}
                        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Activity size={16} className="text-indigo-500" />
                                核心大件行情热力 (均价)
                            </h3>
                            <div className="space-y-4">
                                {marketOverview.categoryStats.map(stat => (
                                    <div key={stat.category} className="group cursor-pointer hover:bg-slate-50 p-3 -mx-3 rounded-xl transition-colors" onClick={() => setCategory(stat.category)}>
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className="font-extrabold text-slate-700 w-16">{CATEGORY_LABELS[stat.category] || stat.category}</span>
                                                <span className="text-[10px] text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full shadow-sm">{stat.productCount} 款活跃</span>
                                            </div>
                                            <div className="font-black text-slate-800 text-lg">¥{stat.currentAvg.toFixed(2)}</div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 bg-white border border-slate-100 p-3 rounded-lg shadow-sm">
                                            <div>
                                                <div className="text-[10px] font-bold text-slate-400 mb-1.5">较 7 日前</div>
                                                {stat.change7dPct !== null ? (
                                                    <div className={`text-xs font-bold px-2 py-1 rounded inline-flex items-center gap-1 w-full ${
                                                        stat.change7dPct > 0 ? 'bg-rose-50 text-rose-600' : stat.change7dPct < 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-500'
                                                    }`}>
                                                        {stat.change7dPct > 0 ? '↑上涨' : stat.change7dPct < 0 ? '↓下降' : '—持平'} 
                                                        <span className="ml-auto">{Math.abs(stat.change7dPct)}%</span>
                                                    </div>
                                                ) : <span className="text-xs text-slate-300">—</span>}
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-bold text-slate-400 mb-1.5">较 30 日前</div>
                                                {stat.change30dPct !== null ? (
                                                    <div className={`text-xs font-bold px-2 py-1 rounded inline-flex items-center gap-1 w-full ${
                                                        stat.change30dPct > 0 ? 'bg-rose-50 text-rose-600' : stat.change30dPct < 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-500'
                                                    }`}>
                                                        {stat.change30dPct > 0 ? '↑上涨' : stat.change30dPct < 0 ? '↓下降' : '—持平'} 
                                                        <span className="ml-auto">{Math.abs(stat.change30dPct)}%</span>
                                                    </div>
                                                ) : <span className="text-xs text-slate-300">—</span>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* C. 全品类涨跌事件时间轴 */}
                        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col max-h-[500px]">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 shrink-0">
                                <Clock size={16} className="text-slate-400" />
                                最新调价动态
                            </h3>
                            <div className="overflow-y-auto custom-scrollbar flex-1 pr-2 space-y-4">
                                {marketOverview.recentEvents.map((evt, idx) => (
                                    <div key={`${evt.id}-${idx}`} className="flex items-start gap-3">
                                        <div className="mt-1 flex flex-col items-center">
                                            <div className={`w-2.5 h-2.5 rounded-full ${evt.changeAmount > 0 ? 'bg-rose-500 shadow-sm shadow-rose-200' : 'bg-emerald-500 shadow-sm shadow-emerald-200'}`} />
                                            {idx < marketOverview.recentEvents.length - 1 && <div className="w-0.5 h-full bg-slate-100 my-1 min-h-[30px]" />}
                                        </div>
                                        <div className="flex-1 pb-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[10px] font-bold text-slate-400">{evt.changedAt.slice(5, 16)}</span>
                                                <span className={`text-xs font-black ${evt.changeAmount > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                    {evt.changeAmount > 0 ? '涨' : '降'} ¥{Math.abs(evt.changeAmount).toFixed(0)}
                                                </span>
                                            </div>
                                            <div className="text-[13px] font-bold text-slate-700 leading-snug">
                                                <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded shadow-sm mr-1.5 inline-block align-text-bottom font-black">{CATEGORY_LABELS[evt.category] || evt.category}</span>
                                                {evt.name}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {marketOverview.recentEvents.length === 0 && (
                                    <div className="text-center py-8 text-sm font-medium text-slate-400">近期无调价记录</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 品类均价走势 */}
            {trendData && trendData.categoryTotalAvgTrend && trendData.categoryTotalAvgTrend.length > 0 && category !== 'all' && (() => {
                // When any filter is active, compute filtered average from per-product data
                const hasAnyFilter = !!(brandFilter || gpuChipFilter || subcategory || ramGeneration);
                let avgTrend: Array<{ date: string; avgPrice: number }>;

                if (hasAnyFilter && trendData.products && trendData.products.length > 0) {
                    // Build the same parseFn used by the spec table
                    const chartParseFn = category === 'ram' ? parseRamSpecs 
                                  : category === 'disk' ? parseDiskSpecs 
                                  : category === 'cpu' ? parseCpuSpecs
                                  : (name: string) => {
                        const info = extractChipInfo(name);
                        if (!info) return '其他芯片组';
                        const prefix = info.num.startsWith('9') || info.num.startsWith('7') || info.num.startsWith('6') ? 'RX' : 'RTX';
                        const dSuffix = info.isD ? 'D' : '';
                        return `${prefix} ${info.num}${dSuffix}${info.suffix ? ' ' + info.suffix : ''}`;
                    };

                    // Get all matching active products with ALL filters applied
                    const matchingProductsList = trendData.products.filter(p => {
                        if (p.price <= 0) return false;
                        if (!matchesBrand(p.name)) return false;
                        if (!matchesActualBrand(p.name)) return false;
                        if (!matchesChip(p.name)) return false;
                        const specLabel = chartParseFn(p.name);
                        if (ramGeneration && category === 'ram' && !specLabel.includes(ramGeneration)) return false;
                        if (subcategory && specLabel !== subcategory) return false;
                        return true;
                    });

                    if (matchingProductsList.length > 0) {
                        const allDates = trendData.categoryTotalAvgTrend.map(t => t.date);
                        
                        const trendMap = new Map<string, Array<{date: string, price: number}>>();
                        if (trendData.productTrends) {
                            for (const pt of trendData.productTrends) {
                                trendMap.set(String(pt.hardwareId), pt.points);
                            }
                        }

                        avgTrend = allDates.map(date => {
                            let sum = 0;
                            let count = 0;
                            for (const p of matchingProductsList) {
                                const pId = String(p.id);
                                const pTrend = trendMap.get(pId);
                                if (pTrend) {
                                    const point = pTrend.find(pt => pt.date === date);
                                    if (point) {
                                        sum += point.price;
                                        count++;
                                    } else {
                                        sum += p.price;
                                        count++;
                                    }
                                } else {
                                    sum += p.price;
                                    count++;
                                }
                            }
                            return {
                                date,
                                avgPrice: count > 0 ? Math.round((sum / count) * 100) / 100 : 0
                            };
                        });
                    } else {
                        avgTrend = trendData.categoryTotalAvgTrend;
                    }
                } else {
                    avgTrend = trendData.categoryTotalAvgTrend;
                }

                if (avgTrend.length === 0) return null;

                const chartAvgTrend = avgTrend.slice(-days); // Slice to match user selected days

                // ============ 降价产品均价线 ============
                // 筛选出在选定时段内「实际降价」的产品，单独计算它们的均价走势
                const trendMapForDown = new Map<string, Array<{date: string, price: number}>>();
                if (trendData.productTrends) {
                    for (const pt of trendData.productTrends) {
                        trendMapForDown.set(String(pt.hardwareId), pt.points);
                    }
                }

                // 判定「降价产品」: 时段内最后一天价格 < 第一天价格
                const allProductsForDown = trendData.products?.filter(p => p.price > 0 && matchesBrand(p.name) && matchesActualBrand(p.name) && matchesChip(p.name)) || [];
                const downProducts = allProductsForDown.filter(p => {
                    const pts = trendMapForDown.get(String(p.id));
                    if (!pts || pts.length < 2) return false;
                    const sliced = pts.slice(-days);
                    if (sliced.length < 2) return false;
                    return sliced[sliced.length - 1].price < sliced[0].price;
                });

                let downOnlyAvgTrend: Array<{date: string; downAvgPrice: number}> = [];
                const downCount = downProducts.length;
                if (downCount > 0) {
                    const allDatesForDown = chartAvgTrend.map(t => t.date);
                    downOnlyAvgTrend = allDatesForDown.map(date => {
                        let sum = 0;
                        let cnt = 0;
                        for (const p of downProducts) {
                            const pts = trendMapForDown.get(String(p.id));
                            if (pts) {
                                const point = pts.find(pt => pt.date === date);
                                if (point) { sum += point.price; cnt++; }
                                else { sum += p.price; cnt++; }
                            } else {
                                sum += p.price; cnt++;
                            }
                        }
                        return { date, downAvgPrice: cnt > 0 ? Math.round((sum / cnt) * 100) / 100 : 0 };
                    });
                }

                // 合并两条线的数据
                const chartData = chartAvgTrend.map((item, idx) => ({
                    ...item,
                    downAvgPrice: downOnlyAvgTrend[idx]?.downAvgPrice ?? null,
                }));

                const firstPrice = chartAvgTrend[0]?.avgPrice;
                const lastPrice = chartAvgTrend[chartAvgTrend.length - 1]?.avgPrice;
                const periodChange = lastPrice && firstPrice ? lastPrice - firstPrice : 0;
                const periodPct = firstPrice ? ((periodChange / firstPrice) * 100).toFixed(2) : '0';
                const isUp = periodChange > 0;

                return (
                <div ref={chartRef} className="bg-white dark:bg-slate-900 p-4 sm:p-6 lg:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm" style={{ minHeight: 400 }}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
                        <h3 className="text-sm sm:text-lg font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            {(() => {
                                // Build dynamic title based on active filters
                                const brandCampLabel = brandFilter === 'NVIDIA' ? 'N卡' : brandFilter === 'AMD' ? 'AMD' : brandFilter === 'Intel' ? 'Intel' : '';
                                const prefix = actualBrandFilter ? `${actualBrandFilter} ` : brandCampLabel ? `${brandCampLabel} ` : '';
                                if (gpuChipFilter) return `${prefix}${gpuChipFilter} 历史基准均价走势`;
                                if (subcategory) return `${prefix}${subcategory} 历史基准均价走势`;
                                if (ramGeneration) return `${prefix}${ramGeneration} 历史基准均价走势`;
                                return `${prefix}${CATEGORY_LABELS[category] || category}品类历史基准均价走势`;
                            })()}
                        </h3>
                        <div className="flex flex-wrap gap-2 sm:gap-4 items-center">
                            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-3 h-0.5 bg-indigo-500"></span> 
                                    整体均价 ({gpuChipFilter ? `所有${gpuChipFilter}` : subcategory ? '此规格' : ramGeneration ? `所有${ramGeneration}` : '此分类'})
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-3 h-0.5 bg-emerald-500 border-t border-dashed border-emerald-500" style={{ borderTopWidth: '2px' }}></span> 
                                    降价商品均价{downCount > 0 ? ` (${downCount}件降价中)` : ' (暂无降价品)'}
                                </div>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleDownloadImage(chartRef, `均价走势_${CATEGORY_LABELS[category] || category}_${new Date().toISOString().slice(0,10)}.png`); }}
                                disabled={downloading === '均价走势'}
                                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-all"
                                title="下载为高清图片 (适合视频插图)"
                            >
                                <Download size={13} />
                                {downloading ? '生成中...' : '下载图片'}
                            </button>
                        </div>
                    </div>
                    {/* 平均X天涨幅/降幅标注 */}
                    <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                        <div className={`flex items-center gap-2 pl-2 pr-4 py-1.5 rounded-full border ${
                            isUp ? 'bg-rose-50/50 border-rose-100' : periodChange < 0 ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50 border-slate-100'
                        }`}>
                            {/* Status Icon with background */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                isUp ? 'bg-rose-100 text-rose-600' : periodChange < 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'
                            }`}>
                                {isUp ? <ArrowUpRight size={18} strokeWidth={3} /> : periodChange < 0 ? <ArrowDownRight size={18} strokeWidth={3} /> : <Minus size={18} strokeWidth={3} />}
                            </div>
                            
                            {/* Text content */}
                            <div className="flex flex-wrap items-baseline gap-1 sm:gap-2">
                                <span className="text-xs sm:text-sm font-semibold text-slate-500">较 {days} 天前</span>
                                
                                {periodChange !== 0 ? (
                                    <>
                                        <span className={`text-base font-black ${isUp ? 'text-rose-600' : 'text-emerald-600'}`}>
                                            {isUp ? '上涨' : '下降'} ¥{Math.abs(Math.round(periodChange * 100) / 100).toFixed(2)}
                                        </span>
                                        <span className={`text-sm font-bold ${isUp ? 'text-rose-400' : 'text-emerald-400'}`}>
                                            ({Math.abs(parseFloat(periodPct))}%)
                                        </span>
                                    </>
                                ) : (
                                    <span className="text-sm font-extrabold text-slate-600">价格持平</span>
                                )}
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-400 bg-slate-50 dark:bg-slate-800 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-slate-100 dark:border-slate-700">
                            <span>起: ¥{firstPrice?.toFixed(2)}</span>
                            <span className="text-slate-300">→</span>
                            <span>止: ¥{lastPrice?.toFixed(2)}</span>
                        </div>
                    </div>
                    <div className="-mx-4 sm:mx-0">
                    <ResponsiveContainer width="100%" height={280}>
                        <LineChart 
                            data={chartData} 
                            margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis 
                                dataKey="date" 
                                tick={{ fontSize: 13, fill: '#64748b', fontWeight: 600 }}
                                tickFormatter={(v: string) => v.slice(5)}
                                axisLine={false} tickLine={false} dy={10} 
                            />
                            <YAxis 
                                tick={{ fontSize: 13, fill: '#64748b', fontWeight: 600 }}
                                axisLine={false} tickLine={false} dx={-10}
                                domain={['auto', 'auto']}
                                tickFormatter={(v) => `¥${v}`}
                            />
                            <Tooltip 
                                content={({ active, payload, label }: any) => {
                                    if (active && payload && payload.length) {
                                        const d = payload[0].payload;
                                        const idx = chartData.findIndex(p => p.date === d.date);
                                        const prevData = idx > 0 ? chartData[idx - 1] : d;
                                        
                                        const avgDailyDiff = d.avgPrice - prevData.avgPrice;
                                        const avgDailyPct = prevData.avgPrice > 0 ? ((avgDailyDiff / prevData.avgPrice) * 100).toFixed(2) : '0.00';
                                        
                                        const downDailyDiff = d.downAvgPrice ? d.downAvgPrice - (prevData.downAvgPrice || d.downAvgPrice) : 0;
                                        const downDailyPct = prevData.downAvgPrice && prevData.downAvgPrice > 0 ? ((downDailyDiff / prevData.downAvgPrice) * 100).toFixed(2) : '0.00';

                                        return (
                                            <div className="bg-white/95 backdrop-blur-md p-4 rounded-xl border border-slate-200 shadow-xl shadow-slate-200/50 min-w-[220px]">
                                                <p className="font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2">{label}</p>
                                                <div className="space-y-4">
                                                    {/* 大盘均价 */}
                                                    <div>
                                                        <div className="flex items-center justify-between gap-4 mb-1">
                                                            <span className="flex items-center gap-2 text-sm text-indigo-600 font-bold">
                                                                <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                                                整体均价
                                                            </span>
                                                            <span className="font-bold text-indigo-600">¥{d.avgPrice}</span>
                                                        </div>
                                                        {avgDailyDiff !== 0 && (
                                                            <div className="flex items-center justify-between pl-4">
                                                                <span className="text-[10px] text-slate-400">较前日</span>
                                                                <span className={`text-[10px] font-bold ${avgDailyDiff > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                                    {avgDailyDiff > 0 ? '↑' : '↓'} {Math.abs(Number(avgDailyPct))}% (¥{Math.abs(Math.round(avgDailyDiff * 100) / 100)})
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* 降价均价 */}
                                                    {d.downAvgPrice > 0 && (
                                                        <div className="pt-2 border-t border-slate-100">
                                                            <div className="flex items-center justify-between gap-4 mb-1">
                                                                <span className="flex items-center gap-2 text-sm text-emerald-600 font-bold">
                                                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                                                    降幅均价 (仅降价品)
                                                                </span>
                                                                <span className="font-bold text-emerald-600">¥{d.downAvgPrice}</span>
                                                            </div>
                                                            {downDailyDiff !== 0 && (
                                                                <div className="flex items-center justify-between pl-4">
                                                                    <span className="text-[10px] text-slate-400">较前日</span>
                                                                    <span className={`text-[10px] font-bold ${downDailyDiff > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                                        {downDailyDiff > 0 ? '↑' : '↓'} {Math.abs(Number(downDailyPct))}% (¥{Math.abs(Math.round(downDailyDiff * 100) / 100)})
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Line 
                                type="monotone" 
                                dataKey="avgPrice" 
                                name="整体均价"
                                stroke="#6366f1" 
                                strokeWidth={4}
                                connectNulls={true}
                                dot={{ fill: '#6366f1', strokeWidth: 2, r: 4 }}
                                activeDot={{ r: 6, strokeWidth: 0 }}
                            />
                            <Line 
                                type="monotone" 
                                dataKey="downAvgPrice" 
                                name="降幅均价"
                                stroke="#10b981" 
                                strokeWidth={3}
                                strokeDasharray="5 5"
                                connectNulls={true}
                                dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
                                activeDot={{ r: 5, strokeWidth: 0 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                    </div>
                    {/* 品牌水印 - 导出图片时显示 */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-400">
                            <div className="w-6 h-6 bg-indigo-500 rounded-md flex items-center justify-center text-white text-xs font-black">鱼</div>
                            DIYXX.COM 数据支持
                        </div>
                        <span className="text-xs text-slate-300 font-medium">数据来源：小鱼平台 · {new Date().toLocaleDateString('zh-CN')}</span>
                    </div>
                </div>
                );
            })()}

            {/* 规格价格对比表 (RAM/Disk/GPU/CPU) */}
            {specPriceTable && specPriceTable.length > 0 && (
                <div ref={tableRef} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-extrabold text-slate-800">📊 {
                                category === 'gpu' ? `${brandFilter === 'NVIDIA' ? 'N卡' : brandFilter === 'AMD' ? 'A卡' : ''}芯片组`
                                : category === 'cpu' ? `${brandFilter ? brandFilter : ''}处理器代数`
                                : ramGeneration || (category === 'disk' ? '硬盘' : '内存')
                            }实时均价与行情波动</h3>
                            <p className="text-xs text-slate-400 mt-1">基于当前在售产品均价计算（下方默认显示近30天完整对比）</p>
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleDownloadImage(tableRef, `行情对比表_${CATEGORY_LABELS[category] || category}_${new Date().toISOString().slice(0,10)}.png`); }}
                            disabled={!!downloading}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-all shrink-0"
                            title="下载为高清图片 (适合视频插图)"
                        >
                            <Download size={13} />
                            {downloading ? '生成中...' : '下载图片'}
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="text-left px-4 py-2.5 text-xs font-bold text-slate-400 uppercase">{category === 'gpu' ? '芯片组' : category === 'cpu' ? '代数 / 阵营' : '规格'}</th>
                                    <th className="text-center px-3 py-2.5 text-xs font-bold text-slate-400">在售数量</th>
                                    <th className="text-right px-4 py-2.5 text-xs font-bold text-slate-400">当前均价</th>
                                    <th className="text-center px-3 py-2.5 text-xs font-bold text-slate-400">今日涨跌</th>
                                    {specPriceTable[0]?.changes.map(c => (
                                        <th key={c.period} className="text-right px-3 py-2.5 text-xs font-bold text-slate-400">vs {c.period}前</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {specPriceTable.map((row) => (
                                    <tr 
                                        key={row.label} 
                                        className={`hover:bg-indigo-50/50 transition-colors cursor-pointer ${(category === 'gpu' ? gpuChipFilter : subcategory) === row.label ? 'bg-indigo-50' : ''}`}
                                        onClick={() => {
                                            if (category === 'gpu') {
                                                setGpuChipFilter(gpuChipFilter === row.label ? '' : row.label);
                                            } else {
                                                setSubcategory(subcategory === row.label ? '' : row.label);
                                            }
                                        }}
                                    >
                                        <td className="px-4 py-4 font-semibold text-slate-700">
                                            <div className="flex items-center gap-2">
                                                <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                                                    (category === 'gpu' || category === 'cpu') ? (row.label.includes('AMD') || row.label.includes('RX') ? 'bg-red-500' : 'bg-blue-500')
                                                    : row.label.includes('DDR5') ? 'bg-violet-500' : 'bg-emerald-500'
                                                }`} />
                                                {row.label}
                                            </div>
                                        </td>
                                        <td className="text-center px-3 py-4 text-slate-400 font-medium">{row.count}款</td>
                                        <td className="text-right px-4 py-4 font-extrabold text-slate-800 text-base">¥{row.currentAvg}</td>
                                        <td className="text-center px-3 py-3">
                                            {(row.todayUp > 0 || row.todayDown > 0) ? (
                                                <div className="flex items-center justify-center gap-1.5">
                                                    {row.todayUp > 0 && (
                                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-100">
                                                            ↑{row.todayUp}
                                                        </span>
                                                    )}
                                                    {row.todayDown > 0 && (
                                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                                                            ↓{row.todayDown}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-300">—持平</span>
                                            )}
                                        </td>
                                        {row.changes.map(c => (
                                            <td key={c.period} className="text-right px-3 py-3">
                                                {c.pct !== null ? (
                                                    <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold ${
                                                        c.pct > 0 ? 'bg-rose-50 text-rose-600' 
                                                        : c.pct < 0 ? 'bg-emerald-50 text-emerald-600' 
                                                        : 'bg-slate-50 text-slate-400'
                                                    }`}>
                                                        {c.pct > 0 ? '↑' : c.pct < 0 ? '↓' : '—'}
                                                        {c.pct !== 0 ? `${Math.abs(c.pct)}%` : '持平'}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-300">—</span>
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* 品牌水印 - 导出图片时显示 */}
                    <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-400">
                            <div className="w-6 h-6 bg-indigo-500 rounded-md flex items-center justify-center text-white text-xs font-black">鱼</div>
                            DIYXX.COM 数据支持
                        </div>
                        <span className="text-xs text-slate-300 font-medium">数据来源：小鱼平台 · {new Date().toLocaleDateString('zh-CN')}</span>
                    </div>
                </div>
            )}

            {/* 单品走势 */}
            {selectedProductId && trendData && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    {(() => {
                        const productData = trendData.productTrends.find(p => String(p.hardwareId) === selectedProductId);
                        if (!productData || productData.points.length === 0) {
                            return (
                                <div className="text-center py-8">
                                    <TrendingDown size={32} className="mx-auto text-slate-300 mb-2" />
                                    <p className="text-slate-400 text-sm">该产品在此期间无价格变动记录</p>
                                </div>
                            );
                        }
                        return (
                            <>
                                <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                                    {productData.name} 价格走势
                                </h3>
                                {(() => {
                                    const pts = productData.points.slice(-days);
                                    const firstPrice = pts[0]?.price;
                                    const lastPrice = pts[pts.length - 1]?.price;
                                    const periodChange = lastPrice && firstPrice ? lastPrice - firstPrice : 0;
                                    const periodPct = firstPrice ? ((periodChange / firstPrice) * 100).toFixed(2) : '0';
                                    const isUp = periodChange > 0;
                                    
                                    return (
                                        <div className="mb-4 flex items-center gap-3">
                                            <div className={`flex items-center gap-2 pl-2 pr-4 py-1.5 rounded-full border ${
                                                isUp ? 'bg-rose-50/50 border-rose-100' : periodChange < 0 ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50 border-slate-100'
                                            }`}>
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                                    isUp ? 'bg-rose-100 text-rose-600' : periodChange < 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'
                                                }`}>
                                                    {isUp ? <ArrowUpRight size={14} strokeWidth={3} /> : periodChange < 0 ? <ArrowDownRight size={14} strokeWidth={3} /> : <Minus size={14} strokeWidth={3} />}
                                                </div>
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-xs font-medium text-slate-500">较 {days} 天前</span>
                                                    {periodChange !== 0 ? (
                                                        <>
                                                            <span className={`text-sm font-extrabold ${isUp ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                                {isUp ? '上涨' : '下降'} ¥{Math.abs(Math.round(periodChange * 100) / 100).toFixed(2)}
                                                            </span>
                                                            <span className={`text-xs font-bold ${isUp ? 'text-rose-400' : 'text-emerald-400'}`}>
                                                                ({Math.abs(parseFloat(periodPct))}%)
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <span className="text-sm font-extrabold text-slate-600">价格持平</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs font-medium text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                                                <span>开始: ¥{firstPrice?.toFixed(2)}</span>
                                                <span className="text-slate-300">→</span>
                                                <span>结束: ¥{lastPrice?.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    );
                                })()}
                                <div className="-mx-4 sm:mx-0">
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={productData.points.slice(-days)} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis 
                                            dataKey="date" 
                                            tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }}
                                            tickFormatter={(v: string) => v.slice(5)}
                                            axisLine={false} tickLine={false} dy={10} 
                                        />
                                        <YAxis 
                                            tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }}
                                            axisLine={false} tickLine={false} dx={-10}
                                            domain={['auto', 'auto']}
                                            tickFormatter={(v) => `¥${v}`}
                                        />
                                        <Tooltip 
                                            content={({ active, payload, label }: any) => {
                                                if (active && payload && payload.length) {
                                                    const point = payload[0].payload;
                                                    const idx = productData.points.findIndex(p => p.date === point.date);
                                                    const prevPrice = idx > 0 ? productData.points[idx - 1].price : point.price;
                                                    const diff = point.price - prevPrice;
                                                    const pct = prevPrice > 0 ? ((diff / prevPrice) * 100).toFixed(2) : '0.00';
                                                    return (
                                                        <div className="bg-white/90 backdrop-blur-md p-4 rounded-xl border border-slate-200 shadow-xl shadow-slate-200/50">
                                                            <p className="font-bold text-slate-800 mb-2">{label}</p>
                                                            <div className="flex items-center justify-between gap-4 text-sm mb-2">
                                                                <span className="text-slate-600">当日价格:</span>
                                                                <span className="font-bold text-slate-800">¥{point.price}</span>
                                                            </div>
                                                            {diff !== 0 && (
                                                                <div className="flex items-center gap-1 text-xs font-bold pt-2 border-t border-slate-100">
                                                                    {diff > 0 ? (
                                                                        <span className="text-rose-500 flex items-center"><ArrowUpRight size={14} /> 较前日涨 {Math.abs(Number(pct))}% (¥{diff.toFixed(2)})</span>
                                                                    ) : (
                                                                        <span className="text-emerald-500 flex items-center"><ArrowDownRight size={14} /> 较前日降 {Math.abs(Number(pct))}% (¥{Math.abs(diff).toFixed(2)})</span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Line 
                                            type="monotone" 
                                            dataKey="price" 
                                            stroke="#f59e0b" 
                                            strokeWidth={3}
                                            dot={{ fill: '#f59e0b', strokeWidth: 2, r: 3 }}
                                            activeDot={{ r: 6, strokeWidth: 0 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                                </div>
                            </>
                        );
                    })()}
                </div>
            )}

            {productTableData.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="font-bold text-slate-800">具体型号行情清单</h3>
                        <p className="text-xs text-slate-400">点击表头中的涨跌指标即可排序</p>
                    </div>
                    <div className="overflow-x-auto" >
                        <table className="w-full text-sm relative">
                            <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="text-left px-4 py-2.5 text-xs font-bold text-slate-400 uppercase bg-slate-50">硬件名称 (点击查看)</th>
                                    <th className="text-right px-4 py-2.5 text-xs font-bold text-slate-400 uppercase bg-slate-50">当前价格</th>
                                    <th className="text-center px-4 py-2.5 text-xs font-bold text-slate-400 uppercase bg-slate-50">走势(近30天)</th>
                                    {(['1d', '7d', '14d', '30d'] as const).map(k => (
                                        <th 
                                            key={k} 
                                            className="text-right px-4 py-2.5 text-xs font-bold text-slate-400 uppercase cursor-pointer hover:bg-slate-100 transition-colors bg-slate-50"
                                            onClick={() => {
                                                setSortConfig(prev => {
                                                    if (prev?.key === k) {
                                                        return { key: k, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
                                                    }
                                                    return { key: k, direction: 'asc' };
                                                });
                                            }}
                                        >
                                            较{k.replace('d', '天')}前
                                            <span className={`inline-block w-4 text-center ml-1 ${sortConfig?.key === k ? 'text-indigo-500' : 'text-slate-300'}`}>
                                                {sortConfig?.key === k ? (sortConfig.direction === 'asc' ? '↓' : '↑') : '↕'}
                                            </span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {productTableData.map((p) => (
                                    <tr 
                                        key={p.id} 
                                        onClick={() => {
                                            if (category !== p.category && category !== 'all') {
                                                setCategory(p.category);
                                            }
                                            setSelectedProductId(String(p.id));
                                            // 自动滚动到顶部图表位置（兼容内部滚动容器）
                                            chartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                        }}
                                        className={`group cursor-pointer hover:bg-indigo-50/50 transition-colors ${String(p.id) === selectedProductId ? 'bg-indigo-50 shadow-inner' : ''}`}
                                    >
                                        <td className="px-4 py-3 font-medium text-slate-700 group-hover:text-indigo-600 transition-colors">
                                            {p.name}
                                        </td>
                                        <td className="px-4 py-3 text-right font-extrabold text-slate-800 text-base">¥{p.currentPrice}</td>
                                        <td className="px-4 py-3 text-center w-24">
                                            {(() => {
                                                const pt = trendData?.productTrends?.find((t: any) => t.hardwareId === p.id);
                                                const pts = pt?.points || [];
                                                if (pts.length < 2) return <span className="text-slate-300 text-xs">—</span>;
                                                const prices = pts.map((d: any) => d.price);
                                                const maxPrices = Math.max(...prices);
                                                const minPrices = Math.min(...prices);
                                                const range = maxPrices - minPrices || 1;
                                                const width = 60;
                                                const height = 20;
                                                const isUp = prices[prices.length - 1] > prices[0];
                                                const isDown = prices[prices.length - 1] < prices[0];
                                                const color = isUp ? '#f43f5e' : isDown ? '#10b981' : '#cbd5e1';
                                                const pathD = pts.map((d: any, idx: number) => {
                                                    const x = (idx / (pts.length - 1)) * width;
                                                    const y = height - ((d.price - minPrices) / range) * height;
                                                    return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                                                }).join(' ');
                                                
                                                return (
                                                    <svg width={width} height={height} className="inline-block overflow-visible" style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.05))'}}>
                                                        <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                );
                                            })()}
                                        </td>
                                        {(['1d', '7d', '14d', '30d'] as const).map(k => {
                                            const {amt, pct} = p.changes[k];
                                            return (
                                                <td key={k} className="px-4 py-3 text-right">
                                                    {amt !== 0 ? (
                                                        <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold ${
                                                            amt > 0 ? 'bg-rose-50 text-rose-600' 
                                                            : 'bg-emerald-50 text-emerald-600'
                                                        }`}>
                                                            {amt > 0 ? '↑' : '↓'} {Math.abs(pct).toFixed(2)}% (¥{Math.abs(amt)})
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-slate-300">—</span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
            {publicMode && (
                <div className="mt-8 p-6 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-2xl text-center flex flex-col items-center justify-center mb-8 mx-2">
                    <span className="inline-flex items-center justify-center w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-full mb-3 shadow-inner">
                        <TrendingUp strokeWidth={3} />
                    </span>
                    <h4 className="text-lg font-black text-indigo-900 dark:text-indigo-100 mb-2">解锁完整行情分析中心</h4>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400 max-w-xl mb-1 leading-relaxed">
                        当前仅为您提供 <strong className="text-indigo-600 dark:text-indigo-400">CPU 专区</strong> 的趋势测算与史低排榜。
                    </p>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
                        若需全览显卡、主板、内存、硬盘等全部 <strong className="text-indigo-600 dark:text-indigo-400">15 大类</strong> 硬件的完整价格波动、单品调价及破价明细，请您尊享 VIP 特权，并前往 <strong className="text-indigo-600 dark:text-indigo-400">主播中心</strong> 解锁。
                    </p>
                </div>
            )}

            </>
            )}
            </div>

            {/* ====== 右侧固定面板（30天榜单，独立滚动） ====== */}
            {!hideSummaryPanel && (
            <aside className="w-full lg:w-[340px] shrink-0 lg:overflow-y-auto custom-scrollbar space-y-4 lg:pr-2 lg:pl-4 lg:border-l border-slate-200">
                {/* ---------- 30天榜单（叠加在右侧） ---------- */}
                {trendData && trendData.historicalLows && trendData.historicalHighs && (
                    <div className="space-y-4">
                        {/* 史低榜单 */}
                        <div ref={lowRef} className="bg-[#f0fdf4] p-5 rounded-2xl border border-emerald-200 relative overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                            <div className="flex items-center justify-between mb-4 relative z-10 w-full">
                                <h3 className="text-[15px] font-black text-emerald-800 flex items-center gap-1.5 whitespace-nowrap">
                                    📉 30天·史低榜
                                </h3>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleDownloadImage(lowRef, `史低榜单_${new Date().toISOString().slice(0,10)}.png`); }}
                                    disabled={downloading === `史低榜单_${new Date().toISOString().slice(0,10)}.png`}
                                    className="px-2.5 py-1 bg-emerald-100/80 backdrop-blur text-emerald-700 text-[10px] font-black rounded-lg hover:bg-emerald-200 transition-colors shrink-0 btn-press uppercase"
                                >
                                    ⬇️ 海报
                                </button>
                            </div>
                            <div className="space-y-2.5 relative z-10">
                                {trendData.historicalLows.slice(0, 5).map((item, idx) => (
                                    <div key={item.hardwareId} className="flex flex-col bg-white/60 backdrop-blur-sm p-3 rounded-xl border border-emerald-100/50 hover:bg-white transition-colors">
                                        <div className="flex items-center gap-2.5 mb-2 overflow-hidden">
                                            <div className="w-5 h-5 shrink-0 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[11px] font-black shadow-sm">{idx + 1}</div>
                                            <div className="text-[13px] font-bold text-slate-800 truncate" title={item.name}>{item.name}</div>
                                        </div>
                                        <div className="flex items-end justify-between pl-[30px]">
                                            <div className="text-[11px] font-bold text-emerald-600/80 flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                                昨日跌 ¥{Math.abs(item.changeAmount).toFixed(0)}
                                            </div>
                                            <div className="text-right shrink-0">
                                                <div className="text-base font-black text-emerald-600 tracking-tight">¥{item.currentPrice}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {trendData.historicalLows.length === 0 && (
                                    <div className="text-center py-5 text-emerald-600/50 font-bold text-xs">无史低商品</div>
                                )}
                            </div>
                            {/* 水印 */}
                            <div className="mt-4 pt-3 flex items-center justify-between relative z-10 border-t border-emerald-100/60">
                                <div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-700/50 uppercase">
                                    <div className="w-4 h-4 bg-emerald-500/80 rounded-[4px] flex items-center justify-center text-white text-[9px]">鱼</div>
                                    DIYXX 数据
                                </div>
                                <span className="text-[10px] text-emerald-700/40 font-bold font-mono">{new Date().toLocaleDateString('zh-CN').replace(/\//g, '.')}</span>
                            </div>
                        </div>

                        {/* 史高榜单 */}
                        <div ref={highRef} className="bg-[#fff1f2] p-5 rounded-2xl border border-rose-200 relative overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                            <div className="flex items-center justify-between mb-4 relative z-10 w-full">
                                <h3 className="text-[15px] font-black text-rose-800 flex items-center gap-1.5 whitespace-nowrap">
                                    📈 30天·破价榜
                                </h3>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleDownloadImage(highRef, `史高榜单_${new Date().toISOString().slice(0,10)}.png`); }}
                                    disabled={downloading === `史高榜单_${new Date().toISOString().slice(0,10)}.png`}
                                    className="px-2.5 py-1 bg-rose-100/80 backdrop-blur text-rose-700 text-[10px] font-black rounded-lg hover:bg-rose-200 transition-colors shrink-0 btn-press uppercase"
                                >
                                    ⬇️ 海报
                                </button>
                            </div>
                            <div className="space-y-2.5 relative z-10">
                                {trendData.historicalHighs.slice(0, 5).map((item, idx) => (
                                    <div key={item.hardwareId} className="flex flex-col bg-white/60 backdrop-blur-sm p-3 rounded-xl border border-rose-100/50 hover:bg-white transition-colors">
                                        <div className="flex items-center gap-2.5 mb-2 overflow-hidden">
                                            <div className="w-5 h-5 shrink-0 rounded-full bg-rose-500 text-white flex items-center justify-center text-[11px] font-black shadow-sm">{idx + 1}</div>
                                            <div className="text-[13px] font-bold text-slate-800 truncate" title={item.name}>{item.name}</div>
                                        </div>
                                        <div className="flex items-end justify-between pl-[30px]">
                                            <div className="text-[11px] font-bold text-rose-600/80 flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                                                昨日涨 ¥{item.changeAmount.toFixed(0)}
                                            </div>
                                            <div className="text-right shrink-0">
                                                <div className="text-base font-black text-rose-600 tracking-tight">¥{item.currentPrice}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {trendData.historicalHighs.length === 0 && (
                                    <div className="text-center py-5 text-rose-600/50 font-bold text-xs">无破价商品</div>
                                )}
                            </div>
                            {/* 水印 */}
                            <div className="mt-4 pt-3 flex items-center justify-between relative z-10 border-t border-rose-100/60">
                                <div className="flex items-center gap-1.5 text-[10px] font-black text-rose-700/50 uppercase">
                                    <div className="w-4 h-4 bg-rose-500/80 rounded-[4px] flex items-center justify-center text-white text-[9px]">鱼</div>
                                    DIYXX 数据
                                </div>
                                <span className="text-[10px] text-rose-700/40 font-bold font-mono">{new Date().toLocaleDateString('zh-CN').replace(/\//g, '.')}</span>
                            </div>
                        </div>
                    </div>
                )}
            </aside>
            )}
        </div>
    );
}
