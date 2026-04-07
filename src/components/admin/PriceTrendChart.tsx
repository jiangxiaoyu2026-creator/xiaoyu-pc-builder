/**
 * 价格趋势图表组件
 * 展示硬件价格变化趋势和今日涨跌统计
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import {
    XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer,
    LineChart, Line
} from 'recharts';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, RefreshCw, Filter, Minus, Download, Calendar, Thermometer, Activity, Clock } from 'lucide-react';
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
const ALLOWED_CATEGORIES = ['cpu', 'ram', 'disk', 'gpu', 'all'];
const CATEGORY_ORDER = ['cpu', 'ram', 'disk', 'gpu'];

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



export default function PriceTrendChart({ hideSummaryPanel = false }: { hideSummaryPanel?: boolean }) {
    const [data, setData] = useState<PriceTrendData | null>(null);
    const [trendData, setTrendData] = useState<ProductPriceTrendData | null>(null);
    const [loading, setLoading] = useState(true);
    const [category, setCategory] = useState('all');
    const [ramGeneration, setRamGeneration] = useState('');
    const [subcategory, setSubcategory] = useState('');
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [days, setDays] = useState(30);
    const [brandFilter, setBrandFilter] = useState<string>(''); // AMD / Intel / NVIDIA etc.
    const [actualBrandFilter, setActualBrandFilter] = useState<string>(''); // ASUS, Kingston, Samsung, etc.
    const [gpuChipFilter, setGpuChipFilter] = useState<string>(''); // RTX 5060 / RTX 5070 etc.

    // Custom date range
    const [useCustomRange, setUseCustomRange] = useState(false);
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Market overview for "all" category
    const [marketOverview, setMarketOverview] = useState<MarketOverviewData | null>(null);

    // Refs for downloadable sections
    const chartRef = useRef<HTMLDivElement>(null);
    const tableRef = useRef<HTMLDivElement>(null);
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
        setLoading(true);
        try {
            const token = localStorage.getItem('xiaoyu_token');
            const headers = { 'Authorization': `Bearer ${token}` };
            
            // Pass the most specific filter: if subcat exists, pass it; else if ramGen exists, pass it
            const backendFilter = (category === 'all' ? '' : subcategory) || (category === 'ram' ? ramGeneration : '');

            // Build date params: custom range or fixed days (minimum 30 for comparison tables)
            const fetchDays = Math.max(days, 30);
            let dateParams = `days=${fetchDays}`;
            if (useCustomRange && customStartDate && customEndDate) {
                dateParams = `start_date=${customStartDate}&end_date=${customEndDate}`;
            }

            // If category is 'all', fetch market overview instead of per-product data
            if (category === 'all') {
                const overviewRes = await fetch(`/api/stats/market-overview?days=${fetchDays}`, { headers });
                const statsRes = await fetch(`/api/stats/price-trends?${dateParams}`, { headers });
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
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { 
        // Whenever category changes, we should reset subcategory unless we want it sticky
        if (category !== 'ram') setRamGeneration('');
        setBrandFilter('');
        setActualBrandFilter('');
        setGpuChipFilter('');
        fetchData(); 
    }, [category, subcategory, ramGeneration, days, useCustomRange, customStartDate, customEndDate]);



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
        }> = [];

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
            rows.push({ label, count: products.length, currentAvg, changes });
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

    return (
        <div className="flex gap-6" style={{ height: 'calc(100vh - 8rem)' }}>
            {/* ====== 中间主内容区（可滚动） ====== */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-5 pr-2">
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
                        {/* 筛选器 - 粘性顶部 */}
                        <div className="flex items-center gap-4 flex-wrap sticky top-0 z-10 bg-slate-50 py-3 -mt-3 border-b border-slate-100 mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                                <Filter size={14} className="text-slate-400 shrink-0" />
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
                        className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    >
                        <option value="all">全部品类</option>
                        {sortCategories(data.categories).map(c => (
                            <option key={c} value={c}>{CATEGORY_LABELS[c] || c}</option>
                        ))}
                    </select>

                    {category === 'ram' && (
                        <select
                            value={ramGeneration}
                            onChange={e => {
                                setRamGeneration(e.target.value);
                                setSubcategory(''); // Reset specific spec when generation changes
                            }}
                            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        >
                            <option value="">全部代数 (DDR4/5)</option>
                            <option value="DDR4">DDR4 专区</option>
                            <option value="DDR5">DDR5 专区</option>
                        </select>
                    )}

                    

                    {/* GPU Dropdown is explicitly Chipset */}
                    {category === 'gpu' && gpuChipSeries.length > 0 && (
                        <select
                            value={gpuChipFilter}
                            onChange={e => { setGpuChipFilter(e.target.value); setSelectedProductId(''); }}
                            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        >
                            <option value="">全部芯片组</option>
                            {gpuChipSeries.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    )}

                    {/* Dynamic Brand Dropdown for specific OEM brands */}
                    {['ram', 'disk', 'gpu', 'motherboard', 'monitor', 'cooler', 'power', 'case', 'peripheral'].includes(category) && trendData && trendData.products && (
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
                                    className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none max-w-[150px]"
                                >
                                    <option value="">全部品牌</option>
                                    {brands.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                            );
                        })()
                    )}

                    {/* General Subcategory Dropdown for CPU, Disk, RAM derived from specPriceTable */}
                    {category !== 'gpu' && category !== 'all' && specPriceTable && specPriceTable.length > 0 && (
                        <select
                            value={subcategory}
                            onChange={e => setSubcategory(e.target.value)}
                            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        >
                            <option value="">全部{category === 'cpu' ? '代数' : '具体规格'}</option>
                            {specPriceTable.map(row => (
                                <option key={row.label} value={row.label}>{row.label}</option>
                            ))}
                        </select>
                    )}

                    {['cpu', 'gpu', 'mainboard'].includes(category) && (
                        <div className="flex gap-1 border border-slate-200 rounded-lg p-0.5 bg-slate-50">
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
                                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                                        brandFilter === b.value
                                            ? 'bg-indigo-600 text-white shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700 hover:bg-white'
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
                            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none max-w-[200px]"
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
                <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                        {[7, 14, 30, 60, 90].map(d => (
                            <button
                                key={d}
                                onClick={() => { setDays(d); setUseCustomRange(false); setShowDatePicker(false); }}
                                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${days === d && !useCustomRange
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                            >
                                {d}天
                            </button>
                        ))}
                        <button
                            onClick={() => setShowDatePicker(!showDatePicker)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                                useCustomRange
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            <Calendar size={12} />
                            {useCustomRange && customStartDate && customEndDate
                                ? `${customStartDate.slice(5)} → ${customEndDate.slice(5)}`
                                : '自定义'}
                        </button>
                    </div>
                    {showDatePicker && (
                        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm animate-page-enter">
                            <input
                                type="date"
                                value={customStartDate}
                                onChange={e => setCustomStartDate(e.target.value)}
                                className="text-xs border-0 outline-none bg-transparent text-slate-700 font-medium"
                            />
                            <span className="text-slate-300 text-xs">→</span>
                            <input
                                type="date"
                                value={customEndDate}
                                onChange={e => setCustomEndDate(e.target.value)}
                                className="text-xs border-0 outline-none bg-transparent text-slate-700 font-medium"
                            />
                            <button
                                onClick={() => {
                                    if (customStartDate && customEndDate && customStartDate <= customEndDate) {
                                        setUseCustomRange(true);
                                        setShowDatePicker(false);
                                    }
                                }}
                                disabled={!customStartDate || !customEndDate || customStartDate > customEndDate}
                                className="px-2.5 py-1 bg-indigo-600 text-white text-xs font-bold rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                应用
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* 单品类迷你统计条 */}
            {category !== 'all' && (
                <div className="flex bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
                    <div className="flex-1 p-3 px-4 flex items-center justify-between border-r border-slate-100 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                                <TrendingUp size={16} />
                            </div>
                            <div>
                                <div className="text-[10px] sm:text-xs text-slate-500 font-bold mb-0.5">本月涨价趋势</div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-xl font-black text-rose-600 leading-none">{todaySummary.monthUpCount ?? todaySummary.upCount}</span>
                                    <span className="text-[10px] text-rose-400">今日: {todaySummary.todayUpCount ?? todaySummary.upCount}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex-1 p-3 px-4 flex items-center justify-between border-r border-slate-100 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                <TrendingDown size={16} />
                            </div>
                            <div>
                                <div className="text-[10px] sm:text-xs text-slate-500 font-bold mb-0.5">本月降价趋势</div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-xl font-black text-emerald-600 leading-none">{todaySummary.monthDownCount ?? todaySummary.downCount}</span>
                                    <span className="text-[10px] text-emerald-400">今日: {todaySummary.todayDownCount ?? todaySummary.downCount}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 p-3 px-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                                <Activity size={16} />
                            </div>
                            <div>
                                <div className="text-[10px] sm:text-xs text-slate-500 font-bold mb-0.5">本月总变动数</div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-xl font-black text-blue-600 leading-none">{todaySummary.monthTotalChanges ?? todaySummary.totalChanges}</span>
                                    <span className="text-[10px] text-blue-400">今日: {todaySummary.todayTotalChanges ?? todaySummary.totalChanges}</span>
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
                    <div className="grid grid-cols-4 gap-4">
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

                    <div className="grid grid-cols-3 gap-6">
                        {/* B. 品类涨跌热力概览 */}
                        <div className="col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
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
                        <div className="col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col max-h-[500px]">
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

                const firstPrice = chartAvgTrend[0]?.avgPrice;
                const lastPrice = chartAvgTrend[chartAvgTrend.length - 1]?.avgPrice;
                const periodChange = lastPrice && firstPrice ? lastPrice - firstPrice : 0;
                const periodPct = firstPrice ? ((periodChange / firstPrice) * 100).toFixed(2) : '0';
                const isUp = periodChange > 0;

                return (
                <div ref={chartRef} className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm" style={{ minHeight: 520 }}>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
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
                        <div className="flex gap-4 items-center">
                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                <span className="w-3 h-0.5 bg-indigo-500"></span> 真实平均价格 ({gpuChipFilter ? `所有${gpuChipFilter}商品` : subcategory ? '该规格所有商品' : ramGeneration ? `所有${ramGeneration}商品` : brandFilter ? `${brandFilter === 'NVIDIA' ? 'N卡' : brandFilter}商品` : '大类所有商品'})
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleDownloadImage(chartRef, `均价走势_${CATEGORY_LABELS[category] || category}_${new Date().toISOString().slice(0,10)}.png`); }}
                                disabled={downloading === '均价走势'}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-all"
                                title="下载为高清图片 (适合视频插图)"
                            >
                                <Download size={13} />
                                {downloading ? '生成中...' : '下载图片'}
                            </button>
                        </div>
                    </div>
                    {/* 平均X天涨幅/降幅标注 */}
                    <div className="mb-4 flex items-center gap-3">
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
                            <div className="flex items-baseline gap-2">
                                <span className="text-sm font-semibold text-slate-500">较 {days} 天前</span>
                                
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
                        
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-400 bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
                            <span>起: ¥{firstPrice?.toFixed(2)}</span>
                            <span className="text-slate-300">→</span>
                            <span>止: ¥{lastPrice?.toFixed(2)}</span>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={380}>
                        <LineChart 
                            data={chartAvgTrend} 
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
                                        const idx = avgTrend.findIndex(p => p.date === d.date);
                                        const prevAvg = idx > 0 ? avgTrend[idx - 1].avgPrice : d.avgPrice;
                                        const dailyDiff = d.avgPrice - prevAvg;
                                        const dailyPct = prevAvg > 0 ? ((dailyDiff / prevAvg) * 100).toFixed(2) : '0.00';
                                        return (
                                            <div className="bg-white/95 backdrop-blur-md p-4 rounded-xl border border-slate-200 shadow-xl shadow-slate-200/50 min-w-[180px]">
                                                <p className="font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2">{label}</p>
                                                <div className="space-y-2.5">
                                                    <div className="flex items-center justify-between gap-4">
                                                        <span className="flex items-center gap-2 text-sm text-indigo-600">
                                                            <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                                            真实均价
                                                        </span>
                                                        <span className="font-bold text-indigo-600">¥{d.avgPrice}</span>
                                                    </div>
                                                    {dailyDiff !== 0 && (
                                                        <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-100">
                                                            <span className="text-xs text-slate-500">较前日</span>
                                                            <span className={`text-xs font-bold ${dailyDiff > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                                {dailyDiff > 0 ? '↑' : '↓'} {Math.abs(Number(dailyPct))}% (¥{Math.abs(Math.round(dailyDiff * 100) / 100)})
                                                            </span>
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
                                stroke="#6366f1" 
                                strokeWidth={4}
                                connectNulls={true}
                                dot={{ fill: '#6366f1', strokeWidth: 2, r: 5 }}
                                activeDot={{ r: 8, strokeWidth: 0 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
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
                    <div className="overflow-x-auto" style={{ maxHeight: '600px', overflowY: 'auto' }}>
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
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
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
            </>
            )}
            </div>

            {/* ====== 右侧固定面板（30天榜单，独立滚动） ====== */}
            {!hideSummaryPanel && (
            <aside className="w-[340px] shrink-0 overflow-y-auto custom-scrollbar space-y-4 pr-2 pl-4 border-l border-slate-200">
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
