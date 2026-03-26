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
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, RefreshCw, Filter, Minus, Download } from 'lucide-react';
import { toPng } from 'html-to-image';

interface PriceTrendData {
    todaySummary: {
        upCount: number;
        downCount: number;
        totalChanges: number;
        avgUpAmount: number;
        avgDownAmount: number;
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

const CATEGORY_LABELS: Record<string, string> = {
    cpu: 'CPU', gpu: '显卡', mainboard: '主板', ram: '内存',
    disk: '硬盘/SSD', psu: '电源', power: '电源', case: '机箱',
    cooler: '散热器', cooling: '散热', fan: '风扇',
    monitor: '显示器', mouse: '鼠标', keyboard: '键盘',
    accessory: '配件', all: '全部品类'
};

// Custom sort order for the category dropdown
const CATEGORY_ORDER = ['cpu', 'ram', 'disk', 'gpu', 'mainboard', 'monitor'];

const sortCategories = (categories: string[]) => {
    return [...categories].sort((a, b) => {
        const ia = CATEGORY_ORDER.indexOf(a);
        const ib = CATEGORY_ORDER.indexOf(b);
        if (ia !== -1 && ib !== -1) return ia - ib;
        if (ia !== -1) return -1;
        if (ib !== -1) return 1;
        return (CATEGORY_LABELS[a] || a).localeCompare(CATEGORY_LABELS[b] || b);
    });
};



export default function PriceTrendChart() {
    const [data, setData] = useState<PriceTrendData | null>(null);
    const [trendData, setTrendData] = useState<ProductPriceTrendData | null>(null);
    const [loading, setLoading] = useState(true);
    const [category, setCategory] = useState('all');
    const [ramGeneration, setRamGeneration] = useState('');
    const [subcategory, setSubcategory] = useState('');
    const [subcategories, setSubcategories] = useState<string[]>([]);
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [days, setDays] = useState(30);
    const [brandFilter, setBrandFilter] = useState<string>(''); // AMD / Intel / NVIDIA etc.
    const [gpuChipFilter, setGpuChipFilter] = useState<string>(''); // RTX 5060 / RTX 5070 etc.

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
            
            // If category is ram/disk, fetch the subcategories first if we don't have them
            let availableSubcats: string[] = [];
            if (['ram', 'disk'].includes(category)) {
                try {
                    const resSub = await fetch(`/api/stats/public-category-trends/${category}?days=${days}`, { headers });
                    if (resSub.ok) {
                        const subData = await resSub.json();
                        availableSubcats = subData.groups?.map((g: any) => g.label) || [];
                        setSubcategories(availableSubcats);
                    }
                } catch(e) { console.error('Failed to load subcategories', e) }
            } else {
                setSubcategories([]);
                setSubcategory('');
            }

            // Ensure current subcategory is still valid
            const currentSubcat = category === 'all' ? '' : (availableSubcats.includes(subcategory) ? subcategory : '');
            if (currentSubcat !== subcategory && ['ram', 'disk'].includes(category)) {
                setSubcategory(currentSubcat);
            }
            
            // Pass the most specific filter: if subcat exists, pass it; else if ramGen exists, pass it
            const backendFilter = currentSubcat || (category === 'ram' ? ramGeneration : '');

            const fetchDays = 30; // 强制获取 30 天数据以计算对比表

            const [resStats, resHistory] = await Promise.all([
                fetch(`/api/stats/price-trends?days=${fetchDays}&category=${category === 'all' ? '' : category}&subcategory=${backendFilter}`, { headers }),
                fetch(`/api/stats/product-price-history?days=${fetchDays}&category=${category === 'all' ? '' : category}&subcategory=${backendFilter}`, { headers })
            ]);

            if (resStats.ok && resHistory.ok) {
                setData(await resStats.json());
                const hData = await resHistory.json();
                setTrendData(hData);
                // Reset product selection if category changes, or auto-select first
                if (!hData.products.find((p: any) => String(p.id) === selectedProductId)) {
                    setSelectedProductId('');
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
        setGpuChipFilter('');
        fetchData(); 
    }, [category, subcategory, ramGeneration]);



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
            return count > 0 ? Math.round(sum / count) : 0;
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

        const rows = trendData.products.filter(p => {
            if (p.price <= 0) return false;
            if (category !== 'all' && p.category !== category) return false;
            if (category === 'all') return true; 

            if (brandFilter && ['cpu', 'gpu', 'mainboard'].includes(category) && !matchesBrand(p.name)) return false;
            if (gpuChipFilter && category === 'gpu' && !matchesChip(p.name)) return false;
            if (ramGeneration && category === 'ram' && !p.name.includes(ramGeneration)) return false;
            if (subcategory && !parseRamSpecs(p.name).includes(subcategory) && !parseDiskSpecs(p.name).includes(subcategory) && !parseCpuSpecs(p.name).includes(subcategory) && category !== 'gpu') return false; 
            
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

    if (!data) return null;

    const { todaySummary } = data;

    return (
        <div className="space-y-6">
            {/* 今日涨跌概览 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-rose-50 to-rose-100 p-5 rounded-2xl border border-rose-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-1">今日涨价</div>
                            <div className="text-3xl font-extrabold text-rose-600">{todaySummary.upCount}</div>
                            <div className="text-xs text-rose-400 mt-1">
                                {todaySummary.avgUpAmount > 0 ? `平均涨幅 ¥${todaySummary.avgUpAmount}` : '暂无涨价'}
                            </div>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-rose-200/60 flex items-center justify-center">
                            <ArrowUpRight size={24} className="text-rose-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-5 rounded-2xl border border-emerald-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">今日降价</div>
                            <div className="text-3xl font-extrabold text-emerald-600">{todaySummary.downCount}</div>
                            <div className="text-xs text-emerald-400 mt-1">
                                {todaySummary.avgDownAmount < 0 ? `平均降幅 ¥${Math.abs(todaySummary.avgDownAmount)}` : '暂无降价'}
                            </div>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-emerald-200/60 flex items-center justify-center">
                            <ArrowDownRight size={24} className="text-emerald-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-2xl border border-blue-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">今日总变动</div>
                            <div className="text-3xl font-extrabold text-blue-600">{todaySummary.totalChanges}</div>
                            <div className="text-xs text-blue-400 mt-1">件硬件价格调整</div>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-blue-200/60 flex items-center justify-center">
                            <TrendingUp size={24} className="text-blue-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* 30天史低 / 史高 预警榜 */}
            {trendData && trendData.historicalLows && trendData.historicalHighs && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 史低榜单 */}
                    <div ref={lowRef} className="bg-[#f0fdf4] p-6 rounded-2xl border border-emerald-200 relative overflow-hidden" style={{ minHeight: 460 }}>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10" />
                        <div className="flex items-center justify-between mb-4 relative z-10 w-full">
                            <h3 className="text-xl font-black text-emerald-800 flex items-center gap-2 whitespace-nowrap">
                                📉 30天·破冰底价榜
                            </h3>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleDownloadImage(lowRef, `史低榜单_${new Date().toISOString().slice(0,10)}.png`); }}
                                disabled={downloading === `史低榜单_${new Date().toISOString().slice(0,10)}.png`}
                                className="px-3 py-1.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg hover:bg-emerald-200 transition-colors shrink-0 whitespace-nowrap"
                            >
                                ⬇️ 下载素材
                            </button>
                        </div>
                        <div className="space-y-3 relative z-10">
                            {trendData.historicalLows.slice(0, 5).map((item, idx) => (
                                <div key={item.hardwareId} className="flex items-center justify-between bg-white/60 backdrop-blur-sm p-3 rounded-xl border border-emerald-100/50">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="w-6 h-6 shrink-0 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shadow-sm">{idx + 1}</div>
                                        <div className="overflow-hidden">
                                            <div className="text-sm font-bold text-slate-800 truncate" title={item.name}>{item.name}</div>
                                            <div className="text-xs text-emerald-600 font-medium">比昨日跌 ¥{Math.abs(item.changeAmount).toFixed(2)}</div>
                                        </div>
                                    </div>
                                    <div className="text-right pl-2 shrink-0">
                                        <div className="text-lg font-black text-emerald-600">¥{item.currentPrice}</div>
                                        <div className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">历史新低</div>
                                    </div>
                                </div>
                            ))}
                            {trendData.historicalLows.length === 0 && (
                                <div className="text-center py-6 text-emerald-600/60 font-medium text-sm">今日暂无跌破30天底价的商品</div>
                            )}
                        </div>
                        
                        {/* 水印 */}
                        <div className="mt-6 pt-3 flex items-center justify-between relative z-10 border-t border-emerald-100">
                            <div className="flex items-center gap-2 text-sm font-bold text-emerald-700/60">
                                <div className="w-5 h-5 bg-emerald-500/80 rounded flex items-center justify-center text-white text-[10px] font-black">鱼</div>
                                DIYXX.COM 数据支持
                            </div>
                            <span className="text-xs text-emerald-700/40 font-bold">{new Date().toLocaleDateString('zh-CN')}</span>
                        </div>
                    </div>

                    {/* 史高榜单 */}
                    <div ref={highRef} className="bg-[#fff1f2] p-6 rounded-2xl border border-rose-200 relative overflow-hidden" style={{ minHeight: 460 }}>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl -mr-10 -mt-10" />
                        <div className="flex items-center justify-between mb-4 relative z-10 w-full">
                            <h3 className="text-xl font-black text-rose-800 flex items-center gap-2 whitespace-nowrap">
                                📈 30天·高光预警榜
                            </h3>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleDownloadImage(highRef, `史高榜单_${new Date().toISOString().slice(0,10)}.png`); }}
                                disabled={downloading === `史高榜单_${new Date().toISOString().slice(0,10)}.png`}
                                className="px-3 py-1.5 bg-rose-100 text-rose-700 text-xs font-bold rounded-lg hover:bg-rose-200 transition-colors shrink-0 whitespace-nowrap"
                            >
                                ⬇️ 下载素材
                            </button>
                        </div>
                        <div className="space-y-3 relative z-10">
                            {trendData.historicalHighs.slice(0, 5).map((item, idx) => (
                                <div key={item.hardwareId} className="flex items-center justify-between bg-white/60 backdrop-blur-sm p-3 rounded-xl border border-rose-100/50">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="w-6 h-6 shrink-0 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs font-bold shadow-sm">{idx + 1}</div>
                                        <div className="overflow-hidden">
                                            <div className="text-sm font-bold text-slate-800 truncate" title={item.name}>{item.name}</div>
                                            <div className="text-xs text-rose-600 font-medium">比昨日涨 ¥{item.changeAmount.toFixed(2)}</div>
                                        </div>
                                    </div>
                                    <div className="text-right pl-2 shrink-0">
                                        <div className="text-lg font-black text-rose-600">¥{item.currentPrice}</div>
                                        <div className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-bold">历史新高</div>
                                    </div>
                                </div>
                            ))}
                            {trendData.historicalHighs.length === 0 && (
                                <div className="text-center py-6 text-rose-600/60 font-medium text-sm">今日暂无涨破30天最高价的商品</div>
                            )}
                        </div>
                        
                        {/* 水印 */}
                        <div className="mt-6 pt-3 flex items-center justify-between relative z-10 border-t border-rose-100">
                            <div className="flex items-center gap-2 text-sm font-bold text-rose-700/60">
                                <div className="w-5 h-5 bg-rose-500/80 rounded flex items-center justify-center text-white text-[10px] font-black">鱼</div>
                                DIYXX.COM 数据支持
                            </div>
                            <span className="text-xs text-rose-700/40 font-bold">{new Date().toLocaleDateString('zh-CN')}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* 筛选器 */}
            <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                    <Filter size={14} className="text-slate-400" />
                    <select
                        value={category}
                        onChange={e => setCategory(e.target.value)}
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

                    {subcategories.length > 0 && (
                        <select
                            value={subcategory}
                            onChange={e => setSubcategory(e.target.value)}
                            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        >
                            <option value="">全部具体规格</option>
                            {subcategories
                                .filter(s => !ramGeneration || s.includes(ramGeneration))
                                .map(s => (
                                    <option key={s} value={s}>{s}</option>
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
                <div className="flex gap-1">
                    {[7, 14, 30].map(d => (
                        <button
                            key={d}
                            onClick={() => setDays(d)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${days === d
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            {d}天
                        </button>
                    ))}
                </div>
            </div>


            {/* 品类均价走势 */}
            {trendData && trendData.categoryTotalAvgTrend && trendData.categoryTotalAvgTrend.length > 0 && category !== 'all' && (() => {
                // When brand/chip filter is active, compute filtered average from per-product data
                const hasBrandOrChipFilter = !!(brandFilter || gpuChipFilter);
                let avgTrend: Array<{ date: string; avgPrice: number }>;

                if (hasBrandOrChipFilter && trendData.products && trendData.products.length > 0) {
                    // Get all matching active products
                    const matchingProductsList = trendData.products.filter(p => matchesBrand(p.name) && matchesChip(p.name));

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
                                const brandLabel = brandFilter === 'NVIDIA' ? 'N卡' : brandFilter === 'AMD' ? 'AMD' : brandFilter === 'Intel' ? 'Intel' : '';
                                if (gpuChipFilter) return `${gpuChipFilter} 历史基准均价走势`;
                                if (subcategory) return `${subcategory} 历史基准均价走势`;
                                if (ramGeneration) return `${ramGeneration} 历史基准均价走势`;
                                if (brandLabel) return `${brandLabel} ${CATEGORY_LABELS[category] || category} 历史基准均价走势`;
                                return `${CATEGORY_LABELS[category] || category}品类历史基准均价走势`;
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
                                    const pts = productData.points;
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
        </div>
    );
}
