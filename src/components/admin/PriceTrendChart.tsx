/**
 * 价格趋势图表组件
 * 展示硬件价格变化趋势和今日涨跌统计
 */
import { useState, useEffect } from 'react';
import {
    XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer,
    LineChart, Line
} from 'recharts';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, RefreshCw, Filter, Minus } from 'lucide-react';

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
    const [magnitudeFilter, setMagnitudeFilter] = useState<'all' | 'large' | 'small'>('all');
    const [brandFilter, setBrandFilter] = useState<string>(''); // AMD / Intel / NVIDIA etc.
    const [gpuChipFilter, setGpuChipFilter] = useState<string>(''); // RTX 5060 / RTX 5070 etc.

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

    // --- Spec price comparison table data ---
    const specPriceTable = (() => {
        const isTargetCat = ['ram', 'disk', 'gpu'].includes(category);
        if (!isTargetCat || !trendData?.products?.length) return null;
        if (!trendData.categoryTotalAvgTrend?.length) return null;
        if (category === 'gpu' && !brandFilter) return null;

        const parseFn = category === 'ram' ? parseRamSpecs : category === 'disk' ? parseDiskSpecs : (name: string) => {
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
            if (category === 'gpu' && !matchesBrand(p.name)) continue;
            
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
            }
            return a.label.localeCompare(b.label);
        });

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

    const { todaySummary, recentChanges } = data;

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
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
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
                        <div className="flex gap-4">
                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                <span className="w-3 h-0.5 bg-indigo-500"></span> 真实平均价格 ({gpuChipFilter ? `所有${gpuChipFilter}商品` : subcategory ? '该规格所有商品' : ramGeneration ? `所有${ramGeneration}商品` : brandFilter ? `${brandFilter === 'NVIDIA' ? 'N卡' : brandFilter}商品` : '大类所有商品'})
                            </div>
                        </div>
                    </div>
                    {/* 平均X天涨幅/降幅标注 */}
                    <div className="mb-4 flex items-center gap-3">
                        <div className={`flex items-center gap-2 pl-2 pr-4 py-1.5 rounded-full border ${
                            isUp ? 'bg-rose-50/50 border-rose-100' : periodChange < 0 ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50 border-slate-100'
                        }`}>
                            {/* Status Icon with background */}
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                isUp ? 'bg-rose-100 text-rose-600' : periodChange < 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'
                            }`}>
                                {isUp ? <ArrowUpRight size={14} strokeWidth={3} /> : periodChange < 0 ? <ArrowDownRight size={14} strokeWidth={3} /> : <Minus size={14} strokeWidth={3} />}
                            </div>
                            
                            {/* Text content */}
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
                            <span>起: ¥{firstPrice?.toFixed(2)}</span>
                            <span className="text-slate-300">→</span>
                            <span>止: ¥{lastPrice?.toFixed(2)}</span>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart 
                            data={chartAvgTrend} 
                            margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis 
                                dataKey="date" 
                                tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }}
                                tickFormatter={(v: string) => v.slice(5)}
                                axisLine={false} tickLine={false} dy={10} 
                            />
                            <YAxis 
                                tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }}
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
                                                                {dailyDiff > 0 ? '↑' : '↓'} ¥{Math.abs(Math.round(dailyDiff * 100) / 100)}
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
                                strokeWidth={3}
                                connectNulls={true}
                                dot={{ fill: '#6366f1', strokeWidth: 2, r: 3 }}
                                activeDot={{ r: 6, strokeWidth: 0 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                );
            })()}

            {/* 规格价格对比表 (RAM/Disk/GPU) */}
            {specPriceTable && specPriceTable.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100">
                        <h3 className="font-bold text-slate-800">📊 {
                            category === 'gpu' ? `${brandFilter === 'NVIDIA' ? 'N卡' : 'A卡'}芯片组`
                            : ramGeneration || (category === 'disk' ? '硬盘' : '内存')
                        }实时均价与行情波动</h3>
                        <p className="text-xs text-slate-400 mt-1">基于当前在售产品均价计算（下方默认显示近30天完整对比）</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="text-left px-4 py-2.5 text-xs font-bold text-slate-400 uppercase">{category === 'gpu' ? '芯片组' : '规格'}</th>
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
                                        <td className="px-4 py-3 font-medium text-slate-700">
                                            <div className="flex items-center gap-2">
                                                <span className={`inline-block w-2 h-2 rounded-full ${
                                                    category === 'gpu' ? (brandFilter === 'NVIDIA' ? 'bg-green-500' : 'bg-red-500')
                                                    : row.label.includes('DDR5') ? 'bg-violet-500' : 'bg-blue-500'
                                                }`} />
                                                {row.label}
                                            </div>
                                        </td>
                                        <td className="text-center px-3 py-3 text-slate-400">{row.count}款</td>
                                        <td className="text-right px-4 py-3 font-bold text-slate-800">¥{row.currentAvg}</td>
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
                                                                        <span className="text-rose-500 flex items-center"><ArrowUpRight size={14} /> 较前日涨 ¥{diff}</span>
                                                                    ) : (
                                                                        <span className="text-emerald-500 flex items-center"><ArrowDownRight size={14} /> 较前日降 ¥{Math.abs(diff)}</span>
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

            {/* 最近变更记录 */}
            {recentChanges.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="font-bold text-slate-800">最近价格变更</h3>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 mr-2">变动幅度:</span>
                            <div className="flex bg-slate-100 p-1 rounded-lg">
                                {(['all', 'large', 'small'] as const).map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setMagnitudeFilter(f)}
                                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                                            magnitudeFilter === f 
                                            ? 'bg-white text-indigo-600 shadow-sm' 
                                            : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                    >
                                        {f === 'all' ? '全部' : f === 'large' ? '大额 (¥50+)' : '微调 (<¥50)'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="text-left px-4 py-2.5 text-xs font-bold text-slate-400 uppercase">硬件名称 (点击查看模型走势)</th>
                                    <th className="text-left px-4 py-2.5 text-xs font-bold text-slate-400 uppercase">品类</th>
                                    <th className="text-right px-4 py-2.5 text-xs font-bold text-slate-400 uppercase">原价</th>
                                    <th className="text-right px-4 py-2.5 text-xs font-bold text-slate-400 uppercase">新价</th>
                                    <th className="text-right px-4 py-2.5 text-xs font-bold text-slate-400 uppercase">变动</th>
                                    <th className="text-right px-4 py-2.5 text-xs font-bold text-slate-400 uppercase">时间</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {recentChanges
                                    .filter(c => {
                                        // Magnitude filter
                                        if (magnitudeFilter !== 'all') {
                                            const absChange = Math.abs(c.changeAmount);
                                            if (magnitudeFilter === 'large' ? absChange < 50 : absChange >= 50) return false;
                                        }
                                        // Brand filter (apply when a specific category is selected)
                                        if (brandFilter && ['cpu', 'gpu', 'mainboard'].includes(category)) {
                                            if (c.category !== category) return false;
                                            if (!matchesBrand(c.hardwareName)) return false;
                                        }
                                        // GPU chip filter
                                        if (gpuChipFilter && category === 'gpu') {
                                            if (c.category !== 'gpu') return false;
                                            if (!matchesChip(c.hardwareName)) return false;
                                        }
                                        return true;
                                    })
                                    .map((c, i) => (
                                    <tr 
                                        key={i} 
                                        onClick={() => {
                                            // Auto-switch category if needed so the chart loads this product's data
                                            if (category !== c.category) {
                                                setCategory(c.category);
                                            }
                                            setSelectedProductId(String(c.hardwareId));
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                        className={`group cursor-pointer hover:bg-indigo-50/50 transition-colors ${String(c.hardwareId) === selectedProductId ? 'bg-indigo-50 shadow-inner' : ''}`}
                                    >
                                        <td className="px-4 py-3 font-medium text-slate-700 group-hover:text-indigo-600 transition-colors">
                                            {c.hardwareName}
                                        </td>
                                        <td className="px-4 py-3 text-slate-500">{CATEGORY_LABELS[c.category] || c.category}</td>
                                        <td className="px-4 py-3 text-right text-slate-500">¥{c.oldPrice}</td>
                                        <td className="px-4 py-3 text-right font-bold text-slate-800">¥{c.newPrice}</td>
                                        <td className={`px-4 py-3 text-right font-bold ${c.changeAmount > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                            {c.changeAmount > 0 ? '+' : ''}{c.changeAmount}
                                            <span className="text-xs ml-1">({c.changePercent > 0 ? '+' : ''}{c.changePercent}%)</span>
                                        </td>
                                        <td className="px-4 py-3 text-right text-xs text-slate-400">
                                            {new Date(c.changedAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                        </td>
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
