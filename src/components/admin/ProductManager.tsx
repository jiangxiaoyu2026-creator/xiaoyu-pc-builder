
import React, { useState, useEffect } from 'react';
import { Search, Download, Plus, ListFilter, Package, Edit3, Trash2, X, Sparkles, Upload, CheckCircle2, Zap } from 'lucide-react';
import { HardwareItem, Category } from '../../types/adminTypes';
import { CATEGORY_MAP, COMPATIBILITY_FIELDS } from '../../data/adminData';
import { SortIcon } from './Shared';
import { storage } from '../../services/storage';
import { ApiService } from '../../services/api';
import ConfirmModal from '../common/ConfirmModal';
import Pagination from '../common/Pagination';
import { useToast } from '../common/Toast';

// 参数字段中文映射（用于列表展示）
const SPEC_LABELS: Record<string, string> = {
    // 通用
    socket: '插槽', socket_type: '插槽类型', cores: '核心数', threads: '线程数', frequency: '频率(GHz)',
    wattage: '功耗(W)', memoryType: '内存类型', ram_type: '内存代数', integratedGpu: '核显',
    architecture: '架构', lithography: '制程', l2Cache: 'L2缓存', l3Cache: 'L3缓存',
    tdpMax: '最大TDP', pcie: 'PCIe版本',
    // 跑分
    master_lu_score: '鲁大师跑分(预测)', power_draw: '标准功耗(W)',
    cinebenchR23_single: 'CB R23单核', cinebenchR23_multi: 'CB R23多核',
    cinebench2024_single: 'CB 2024单核', cinebench2024_multi: 'CB 2024多核',
    passmark_single: 'PM单核', passmark_multi: 'PM多核',
    geekbench6_single: 'GB6单核', geekbench6_multi: 'GB6多核', blender: 'Blender',
    // 显卡
    vram: '显存', vramType: '显存类型', boostClock: '加速频率', tdp: '功耗',
    // 内存
    capacity: '容量', speed: '频率', type: '类型', latency: '时序',
    // 硬盘
    interface: '接口', readSpeed: '读速', writeSpeed: '写速', formFactor: '规格',
    // 主板
    chipset: '芯片组', formFactorSize: '板型', memorySlots: '内存槽', maxMemory: '最大内存',
    // 其他
    wattageRated: '额定功率', efficiency: '效率', modular: '模组',
    cpu: '处理器', gpu: '显卡',
};

// 各品类优先显示的字段顺序
const CATEGORY_PRIORITY: Record<string, string[]> = {
    cpu: ['master_lu_score', 'power_draw', 'socket_type', 'cores', 'threads', 'frequency', 'socket', 'memoryType', 'wattage'],
    gpu: ['master_lu_score', 'power_draw', 'vram', 'vramType', 'boostClock', 'tdp'],
    motherboard: ['socket_type', 'ram_type', 'form_factor', 'socket', 'chipset', 'memorySlots', 'maxMemory'],
    ram: ['master_lu_score', 'power_draw', 'capacity', 'speed', 'type', 'latency'],
    disk: ['master_lu_score', 'capacity', 'interface', 'readSpeed', 'writeSpeed'],
    psu: ['wattageRated', 'efficiency', 'modular'],
    default: [],
};

function getDisplaySpecs(specs: Record<string, any>, category: string): { label: string; value: string }[] {
    const priority = CATEGORY_PRIORITY[category] || CATEGORY_PRIORITY.default;
    const result: { label: string; value: string }[] = [];
    
    // First add priority fields in order
    for (const key of priority) {
        if (key in specs && specs[key] !== null && specs[key] !== undefined && specs[key] !== '') {
            result.push({ label: SPEC_LABELS[key] || key, value: String(specs[key]) });
        }
        if (result.length >= 4) break;
    }
    
    // Fill remaining slots with other fields (skip benchmark fields for list view)
    const benchmarkKeys = ['cinebenchR23_single','cinebenchR23_multi','cinebench2024_single','cinebench2024_multi','passmark_single','passmark_multi','geekbench6_single','geekbench6_multi','blender'];
    if (result.length < 4) {
        for (const [key, val] of Object.entries(specs)) {
            if (result.length >= 4) break;
            if (priority.includes(key) || benchmarkKeys.includes(key) || key === 'cpu' || key === 'gpu' || key.startsWith('jd_')) continue;
            if (val !== null && val !== undefined && val !== '') {
                result.push({ label: SPEC_LABELS[key] || key, value: String(val) });
            }
        }
    }
    
    return result;
}

const roundPriceValue = (value: number) => Number(value.toFixed(2));

const withManualPrice = <T extends Partial<HardwareItem>>(item: T, price: number): T => {
    const costPrice = Number(item.costPrice || 0);
    const profitType = item.profitType || 'fixed';
    const profitValue = profitType === 'percent'
        ? (costPrice > 0 ? roundPriceValue(((price - costPrice) / costPrice) * 100) : 0)
        : roundPriceValue(price - costPrice);

    return {
        ...item,
        price,
        profitType,
        profitValue
    };
};

const isUnsafePriceChangeError = (error: unknown) =>
    error instanceof Error && error.message.includes('force_price_update');


export default function ProductManager() {
    const { showToast } = useToast();
    const [products, setProducts] = useState<HardwareItem[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(20);
    const [loading, setLoading] = useState(false);

    const [isAutofillingSpecs, setIsAutofillingSpecs] = useState(false);
    const [search, setSearch] = useState('');
    const [filterCat, setFilterCat] = useState('all');
    const [filterBrand, setFilterBrand] = useState('all');
    const [filterAi, setFilterAi] = useState(false);
    const [brands, setBrands] = useState<string[]>([]);
    const [sortConfig, setSortConfig] = useState<{ key: keyof HardwareItem, direction: 'asc' | 'desc' } | null>({ key: 'sortOrder', direction: 'asc' });
    const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});

    // loadProducts 接受覆盖参数，解决 React 状态异步更新时的竞态问题
    const loadProducts = async (overrides?: { brand?: string; category?: string; pg?: number }) => {
        setLoading(true);
        const cat = overrides?.category ?? filterCat;
        const brand = overrides?.brand ?? filterBrand;
        const pg = overrides?.pg ?? page;
        try {
            const result = await storage.getAdminProducts(
                pg,
                pageSize,
                cat,
                brand,
                search,
                sortConfig?.key,
                sortConfig?.direction,
                filterAi
            );
            setProducts(result.items);
            setTotal(result.total);

            // 切换分类时刷新品牌列表
            const brandList = await storage.getBrands(cat);
            setBrands(brandList);
        } catch (error) {
            console.error('Failed to load products:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadCategoryCounts = async () => {
        const counts = await storage.getCategoryCounts();
        setCategoryCounts(counts);
    };

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (page !== 1) setPage(1);
            else loadProducts();
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    // 切换分类：重置品牌为 all 并立即用新分类+all 品牌请求，避免竞态
    useEffect(() => {
        setPage(1);
        setFilterBrand('all');
        loadProducts({ category: filterCat, brand: 'all', pg: 1 });
    }, [filterCat]);

    // 品牌筛选变化（不包含由 filterCat 触发的重置，因为上面已经处理）
    useEffect(() => {
        setPage(1);
        loadProducts({ pg: 1 });
    }, [filterBrand]);

    useEffect(() => {
        loadProducts();
        loadCategoryCounts();
    }, [page, sortConfig, filterAi]);

    // 价格编辑：onChange 只更新本地状态，onBlur 时才保存到后端
    const handlePriceChange = (id: string, newPrice: number) => {
        setProducts(prev => prev.map(x => String(x.id) === String(id) ? withManualPrice(x, newPrice) : x));
    };

    const handlePriceBlur = async (id: string, e?: React.FocusEvent<HTMLInputElement>) => {
        const p = products.find(x => String(x.id) === String(id));
        if (!p) return;
        const saved = await saveProductWithPriceGuard(p);
        if (!saved) {
            loadProducts();
            return;
        }
        // Save flash feedback
        if (e?.target) {
            e.target.classList.add('animate-save-flash');
            setTimeout(() => e.target.classList.remove('animate-save-flash'), 600);
        }
    };

    const handleSortOrderBlur = async (id: string) => {
        const p = products.find(x => String(x.id) === String(id));
        if (!p) return;
        await saveProductWithPriceGuard(p);
    };

    const toggleStatus = async (id: string) => {
        const p = products.find(x => String(x.id) === String(id));
        if (!p) return;
        const newStatus = p.status === 'active' ? 'archived' : 'active';
        setProducts(prev => prev.map(x => String(x.id) === String(id) ? { ...x, status: newStatus as any } : x));
        await storage.patchProduct(id, { status: newStatus as any });
        loadCategoryCounts();
    };

    const toggleRecommended = async (id: string, current: boolean) => {
        const p = products.find(x => String(x.id) === String(id));
        if (!p) return;
        setProducts(prev => prev.map(x => String(x.id) === String(id) ? { ...x, isRecommended: !current } : x));
        await storage.patchProduct(id, { isRecommended: !current });
    };

    const toggleDiscount = async (id: string, current: boolean) => {
        const p = products.find(x => String(x.id) === String(id));
        if (!p) return;
        setProducts(prev => prev.map(x => String(x.id) === String(id) ? { ...x, isDiscount: !current } : x));
        await storage.patchProduct(id, { isDiscount: !current });
    };

    const handleSort = (key: keyof HardwareItem) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setPage(1); // Reset to first page when sort changes
        setSortConfig({ key, direction });
    };

    const filtered = products; // Sorting is now handled on the server

    const handleExportHardware = () => {
        const headers = ['ID', '分类', '品牌', '型号', '售价', '成本价', '利润类型', '利润值', '毛利率%', '状态', '排序', '规格参数'];
        const rows = filtered.map(p => [
            p.id,
            (CATEGORY_MAP[p.category]?.label || p.category),
            p.brand,
            p.model,
            p.price,
            p.costPrice ?? 0,
            p.profitType === 'percent' ? '百分比' : '固定金额',
            p.profitValue ?? 0,
            p.price ? (((p.price - (p.costPrice ?? 0)) / p.price) * 100).toFixed(1) : 0,
            p.status === 'active' ? '上架' : '下架',
            p.sortOrder,
            `"${JSON.stringify(p.specs).replace(/"/g, "'")}"`
        ]);

        const csvContent = "\ufeff" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `硬件报价表_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<HardwareItem | null>(null);

    // Inline Spec Editor State
    const [specEditingId, setSpecEditingId] = useState<string | null>(null);
    const [specEditingText, setSpecEditingText] = useState<string>('');

    // Confirm Modal State
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleInlineImageUpload = async (id: string, file: File) => {
        const p = products.find(x => String(x.id) === String(id));
        if (!p) return;

        const res = await storage.uploadImage(file);
        if (res && res.url) {
            const updated = { ...p, image: res.url };
            setProducts(prev => prev.map(x => String(x.id) === String(id) ? updated : x));
            await storage.saveProduct(updated);
        } else {
            showToast('图片上传失败，请稍后重试', 'error');
        }
    };

    const handlePaste = async (e: React.ClipboardEvent, id: string) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if (file) {
                    await handleInlineImageUpload(id, file);
                }
            } else if (items[i].type === 'text/plain') {
                // If it's a plain text, check if it's an image URL
                items[i].getAsString(async (text) => {
                    if (text.match(/\.(jpg|jpeg|png|gif|webp|heic|heif)(\?.*)?$/i) || text.startsWith('http')) {
                        const res = await storage.uploadImageUrl(text);
                        if (res && res.url) {
                            const p = products.find(x => String(x.id) === String(id));
                            if (p) {
                                const updated = { ...p, image: res.url };
                                setProducts(prev => prev.map(x => String(x.id) === String(id) ? updated : x));
                                await storage.saveProduct(updated);
                            }
                        }
                    }
                });
            }
        }
    };

    const handleInlineSpecSave = async (id: string) => {
        const p = products.find(x => String(x.id) === String(id));
        if (!p) return;

        let parsedSpecs = p.specs;
        try {
            parsedSpecs = JSON.parse(specEditingText);
            const updated = { ...p, specs: parsedSpecs };
            setProducts(prev => prev.map(x => String(x.id) === String(id) ? updated : x));
            await storage.saveProduct(updated);
            setSpecEditingId(null);
        } catch (e) {
            showToast('JSON 格式错误，请检查！', 'error');
        }
    };


    const saveProductWithPriceGuard = async (product: HardwareItem) => {
        try {
            await storage.saveProduct(product);
            return true;
        } catch (error) {
            if (!isUnsafePriceChangeError(error)) {
                showToast(error instanceof Error ? error.message : '保存失败，请重试', 'error');
                return false;
            }

            const confirmed = window.confirm('这次价格变动超过 30%，系统默认会拦截以防误操作。\n\n确认要按当前价格保存吗？');
            if (!confirmed) return false;

            try {
                await storage.saveProduct(product, { forcePriceUpdate: true });
                showToast('已确认并保存大幅改价', 'success');
                return true;
            } catch (retryError) {
                showToast(retryError instanceof Error ? retryError.message : '保存失败，请重试', 'error');
                return false;
            }
        }
    };

    const handleSaveProduct = async (product: HardwareItem, keepOpen = false) => {
        const saved = await saveProductWithPriceGuard(product);
        if (!saved) return;
        loadProducts(); // Re-fetch to see changes
        loadCategoryCounts(); // Update counts
        if (!keepOpen) {
            setIsEditModalOpen(false);
        }
    };

    const confirmDelete = (id: string) => {
        setDeleteId(id);
        setIsDeleteModalOpen(true);
    };


    const confirmAiImage = async (id: string) => {
        const p = products.find(x => String(x.id) === String(id));
        if (!p) return;
        setProducts(prev => prev.map(x => String(x.id) === String(id) ? { ...x, imageSource: 'user' as any } : x));
        await storage.patchProduct(id, { imageSource: 'user' as any });
    };

    const rejectAiImage = async (id: string) => {
        const p = products.find(x => String(x.id) === String(id));
        if (!p) return;
        setProducts(prev => prev.map(x => String(x.id) === String(id) ? { ...x, image: null as any, imageSource: 'user' as any } : x));
        await storage.patchProduct(id, { image: null as any, imageSource: 'user' as any });
    };

    const handleAutofillSpecs = async () => {
        if (!confirm('此操作将为所有【缺少核心参数】的商品自动分析并匹配技术规格，并标记为“AI建议”供您核对。是否继续？')) return;
        
        setIsAutofillingSpecs(true);
        try {
            const res = await storage.autofillSpecs();
            if (res) {
                showToast(res.message, 'success');
                loadProducts();
            }
        } catch (e) {
            showToast('参数自动补全失败', 'error');
        } finally {
            setIsAutofillingSpecs(false);
        }
    };

    const confirmAiSpecs = async (id: string) => {
        const p = products.find(x => String(x.id) === String(id));
        if (!p) return;
        setProducts(prev => prev.map(x => String(x.id) === String(id) ? { ...x, specsSource: 'user' as any } : x));
        await storage.patchProduct(id, { specsSource: 'user' as any });
    };

    const rejectAiSpecs = async (id: string) => {
        const p = products.find(x => String(x.id) === String(id));
        if (!p) return;
        setProducts(prev => prev.map(x => String(x.id) === String(id) ? { ...x, specs: {} as any, specsSource: 'user' as any } : x));
        await storage.patchProduct(id, { specs: {} as any, specsSource: 'user' as any });
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        setIsDeleting(true);
        try {
            await ApiService.delete(`/products/${deleteId}`);
            loadProducts(); // Re-fetch
            loadCategoryCounts(); // Update counts
            setIsDeleteModalOpen(false);
            setDeleteId(null);
        } catch (error) {
            console.error('删除失败:', error);
            showToast('删除失败，请重试', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex flex-col gap-2">
                    <div className="flex gap-2 overflow-x-auto pb-2 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:bg-transparent">
                        <button onClick={() => setFilterCat('all')} className={`shrink-0 px-4 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${filterCat === 'all' && !filterAi ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>全部 ({categoryCounts['total'] || 0})</button>
                        <button 
                            onClick={() => { setFilterAi(!filterAi); setPage(1); }} 
                            title="筛选由 AI 自动补全图片/参数但尚未人工确认的产品，审核后可手动调整或直接保留"
                            className={`shrink-0 px-4 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border-2 flex items-center gap-1 ${filterAi ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-200' : 'bg-white border-slate-200 text-slate-500 hover:border-amber-300 hover:text-amber-600'}`}
                        >
                            <Sparkles size={12} className={filterAi ? 'animate-pulse' : ''} />
                            AI 待审核
                        </button>
                        {Object.entries(CATEGORY_MAP).map(([k, v]) => (
                            <button key={k} onClick={() => setFilterCat(k)} className={`shrink-0 px-4 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${filterCat === k ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{v.label} ({categoryCounts[k] || 0})</button>
                        ))}
                    </div>
                    {/* Brand Filter */}
                    <div className="flex gap-2 overflow-x-auto pb-2 border-t border-slate-100 pt-2 items-center [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:bg-transparent">
                        <span className="text-xs font-bold text-slate-400 self-center shrink-0">品牌:</span>
                        <button onClick={() => setFilterBrand('all')} className={`shrink-0 px-3 py-1 rounded text-xs font-bold whitespace-nowrap transition-colors ${filterBrand === 'all' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}>全部</button>
                        {brands.map(b => (
                            <button key={b} onClick={() => setFilterBrand(b)} className={`shrink-0 px-3 py-1 rounded text-xs font-bold whitespace-nowrap transition-colors ${filterBrand === b ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}>{b}</button>
                        ))}
                    </div>
                </div>
                
                <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input type="text" placeholder="搜型号/品牌..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                    </div>
                    <button onClick={handleExportHardware} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 shadow-md">
                        <Download size={16} /> 导出数据
                    </button>
                    <button onClick={() => { setEditingProduct(null); setIsEditModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors shadow-lg">
                        <Plus size={16} /> 录入
                    </button>

                    <button 
                        onClick={handleAutofillSpecs}
                        disabled={isAutofillingSpecs}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm whitespace-nowrap ${
                            isAutofillingSpecs ? 'bg-slate-100 text-slate-400' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                        title="为缺少参数的商品自动生成建议参数"
                    >
                        {isAutofillingSpecs ? <span className="animate-spin text-lg">⏳</span> : <Zap size={16} />}
                        <span>AI 补全参数</span>
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                        <tr>
                            <th className="px-6 py-4 w-20 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('status')}>
                                <div className="flex items-center gap-1">状态 <SortIcon active={sortConfig?.key === 'status'} dir={sortConfig?.direction} /></div>
                            </th>
                            <th className="px-6 py-4">硬件信息</th>
                            <th className="px-6 py-4">关键参数</th>
                            <th className="px-6 py-4 text-right w-40 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('price')}>
                                <div className="flex items-center justify-end gap-1">售价 (预览) <SortIcon active={sortConfig?.key === 'price'} dir={sortConfig?.direction} /></div>
                            </th>
                            <th className="px-6 py-4 text-right w-36">成本/利润</th>
                            <th className="px-6 py-4 text-center cursor-pointer hover:bg-slate-100" onClick={() => handleSort('sortOrder')}>
                                <div className="flex items-center justify-center gap-1">排序 <SortIcon active={sortConfig?.key === 'sortOrder'} dir={sortConfig?.direction} /></div>
                            </th>
                            <th className="px-6 py-4 text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filtered.map(p => {
                            let parsedSpecs = p.specs;
                            if (typeof parsedSpecs === 'string') {
                                try { parsedSpecs = JSON.parse(parsedSpecs); } catch (e) { parsedSpecs = {}; }
                            }
                            if (parsedSpecs && typeof parsedSpecs === 'object' && !Array.isArray(parsedSpecs) && '0' in parsedSpecs && typeof (parsedSpecs as any)['0'] === 'string' && (parsedSpecs as any)['0'] === '{') {
                                try {
                                    const str = Object.values(parsedSpecs).join('');
                                    parsedSpecs = JSON.parse(str);
                                } catch (e) {
                                    // Keep as is if parsing fails
                                }
                            }

                            return (
                                <tr key={p.id} className={`table-row-hover ${p.status === 'archived' ? 'opacity-60 grayscale' : ''}`}>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-2">
                                            <button onClick={() => toggleStatus(p.id)} className={`px-2 py-1 rounded text-xs font-bold w-fit ${p.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                                                {p.status === 'active' ? '上架中' : '已下架'}
                                            </button>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => toggleRecommended(p.id, !!p.isRecommended)}
                                                    className={`p-1 rounded ${p.isRecommended ? 'text-orange-500 bg-orange-50' : 'text-slate-300 hover:text-slate-500'}`}
                                                    title="设为推荐"
                                                >
                                                    <Sparkles size={14} fill={p.isRecommended ? "currentColor" : "none"} />
                                                </button>
                                                <button
                                                    onClick={() => toggleDiscount(p.id, !!p.isDiscount)}
                                                    className={`p-1 rounded ${p.isDiscount ? 'text-rose-500 bg-rose-50' : 'text-slate-300 hover:text-slate-500'}`}
                                                    title="设为折扣"
                                                >
                                                    <span className="text-[10px] font-bold border border-current px-1 rounded">折</span>
                                                </button>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="relative group/img z-20">
                                                <div 
                                                    className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden border border-slate-200 group cursor-pointer"
                                                    onPaste={(e) => handlePaste(e, p.id)}
                                                    tabIndex={0}
                                                    title="点击上传，或在此处直接粘贴图片/链接"
                                                >
                                                    {p.image ? (
                                                        (p.image.includes('bing.com') || p.image.includes('google.com') || p.image.includes('search')) ? (
                                                            <a 
                                                                href={p.image} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                className="flex flex-col items-center justify-center w-full h-full bg-blue-50 hover:bg-blue-100 transition-colors z-20"
                                                                onClick={(e) => e.stopPropagation()}
                                                                title="点击打开搜索页面，找到图片后粘贴回来"
                                                            >
                                                                <Search size={14} className="text-blue-500" />
                                                                <span className="text-[8px] text-blue-600 font-bold">搜图</span>
                                                            </a>
                                                        ) : (
                                                            <img src={p.image} alt={p.model} className="w-full h-full object-cover" />
                                                        )
                                                    ) : (
                                                        <div className="flex items-center justify-center w-full h-full bg-slate-50 text-slate-300 font-bold text-sm">
                                                            {p.brand?.[0] || '?'}
                                                        </div>
                                                    )}
                                                    {p.imageSource === 'ai_suggested' && (
                                                        <div className="absolute top-0 right-0 bg-amber-500 text-[8px] text-white px-1 font-bold z-10" title="AI建议图片，点击确认或手动更改">
                                                            AI
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Upload size={14} className="text-white" />
                                                    </div>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-[0]"
                                                        onClick={(e) => e.stopPropagation()}
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) {
                                                                handleInlineImageUpload(p.id, file);
                                                            }
                                                            e.target.value = ''; // reset
                                                        }}
                                                    />
                                                </div>
                                                
                                                {/* Hover Large Preview */}
                                                {p.image && !(p.image.includes('bing.com') || p.image.includes('google.com') || p.image.includes('search')) && (
                                                    <div className="absolute left-14 top-0 z-[100] w-56 h-56 bg-white border-2 border-white shadow-2xl rounded-xl overflow-hidden opacity-0 invisible group-hover/img:opacity-100 group-hover/img:visible pointer-events-none transition-all duration-200 scale-95 group-hover/img:scale-100 origin-left">
                                                        <img src={p.image} alt="Preview" className="w-full h-full object-contain bg-slate-50" />
                                                    </div>
                                                )}
                                            </div>
                                            {p.imageSource === 'ai_suggested' && (
                                                <div className="flex flex-col gap-0.5">
                                                    <button 
                                                        onClick={() => confirmAiImage(p.id)}
                                                        className="p-1 text-slate-400 hover:text-green-600 transition-colors"
                                                        title="确认此图片"
                                                    >
                                                        <CheckCircle2 size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => rejectAiImage(p.id)}
                                                        className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                                        title="拒绝：清空此图片"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            )}
                                            <div>
                                                <div className="font-bold text-slate-900 flex items-center gap-2">
                                                    {p.model}
                                                    {p.isRecommended && <span className="text-[10px] bg-orange-100 text-orange-600 px-1 rounded">荐</span>}
                                                    {p.isDiscount && <span className="text-[10px] bg-rose-100 text-rose-600 px-1 rounded">折</span>}
                                                </div>
                                                <div className="text-xs text-slate-500">{p.brand} · {CATEGORY_MAP[p.category]?.label || p.category}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 relative">
                                        <div className="flex items-center gap-2">
                                            {p.specsSource === 'ai_suggested' && (
                                                <div className="flex flex-col gap-0.5 shrink-0">
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); confirmAiSpecs(String(p.id)); }}
                                                        className="p-1 text-slate-400 hover:text-emerald-600 transition-colors"
                                                        title="确认此参数"
                                                    >
                                                        <CheckCircle2 size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); rejectAiSpecs(String(p.id)); }}
                                                        className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                                        title="拒绝：清空此参数"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div 
                                                    className={`text-xs p-1.5 rounded-lg border transition-colors cursor-pointer group relative ${p.specsSource === 'ai_suggested' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:border-emerald-300' : 'bg-slate-50 border-slate-100 text-slate-500 hover:border-slate-200'}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSpecEditingId(String(p.id));
                                                        setSpecEditingText(JSON.stringify(parsedSpecs || {}, null, 2));
                                                    }}
                                                    title="点击快速修改参数"
                                                >
                                                    {p.specsSource === 'ai_suggested' && (
                                                        <div className="absolute top-0 right-1 -translate-y-1/2 bg-emerald-500 text-[8px] text-white px-1 font-bold rounded">AI生成</div>
                                                    )}
                                                    {specEditingId === String(p.id) ? (
                                                        <div className="p-1" onClick={e => e.stopPropagation()}>
                                                            <textarea
                                                                value={specEditingText}
                                                                onChange={(e) => setSpecEditingText(e.target.value)}
                                                                className="w-full h-32 p-2 text-[10px] font-mono border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                                                rows={4}
                                                            />
                                                            <div className="flex justify-end gap-1 mt-1">
                                                                <button onClick={(e) => { e.stopPropagation(); setSpecEditingId(null); }} className="px-2 py-0.5 text-[8px] bg-slate-100 text-slate-600 rounded">取消</button>
                                                                <button onClick={(e) => { e.stopPropagation(); handleInlineSpecSave(String(p.id)); }} className="px-2 py-0.5 text-[8px] bg-slate-900 text-white rounded">保存</button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                                                            {getDisplaySpecs(parsedSpecs || {}, p.category).map(({ label, value }) => (
                                                                <div key={label} className="truncate flex items-center gap-1">
                                                                    <span className="opacity-60">{label}:</span>
                                                                    <span className="font-medium">{value}</span>
                                                                </div>
                                                            ))}
                                                            {Object.keys(parsedSpecs || {}).length > 4 && (
                                                                <div className="text-[10px] opacity-40 italic col-span-2">+ 更多参数</div>
                                                            )}
                                                            {Object.keys(parsedSpecs || {}).length === 0 && (
                                                                <div className="text-[10px] opacity-40 italic">点击添加参数</div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <span className="text-slate-400 text-xs">¥</span>
                                            <input
                                                type="number"
                                                className="w-24 text-right font-bold text-indigo-600 bg-indigo-50/30 border border-indigo-100 rounded px-2 py-1 focus:border-indigo-500 focus:outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                value={p.price}
                                                onChange={(e) => handlePriceChange(p.id, Number(e.target.value))}
                                                onBlur={(e) => handlePriceBlur(p.id, e)}
                                                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                            />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex flex-col items-end gap-0.5">
                                            <div className="text-[10px] text-slate-400">成本: ¥{p.costPrice || 0}</div>
                                            <div className="text-xs font-bold text-emerald-600">
                                                利润: {p.profitType === 'percent' ? `${p.profitValue}%` : `¥${p.profitValue}`}
                                            </div>
                                            <div className="text-[9px] bg-slate-100 px-1 rounded text-slate-400">
                                                毛利率: {p.price ? (((p.price - (p.costPrice || 0)) / p.price) * 100).toFixed(1) : 0}%
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center">
                                            <input
                                                type="number"
                                                className="w-16 text-center font-mono text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                value={p.sortOrder}
                                                onChange={(e) => {
                                                    const newVal = Number(e.target.value);
                                                    setProducts(prev => prev.map(item => String(item.id) === String(p.id) ? { ...item, sortOrder: newVal } : item));
                                                }}
                                                onBlur={() => handleSortOrderBlur(p.id)}
                                                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                            />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => { setEditingProduct(p); setIsEditModalOpen(true); }} className="text-slate-400 hover:text-indigo-600 p-2" title="编辑"><Edit3 size={18} /></button>
                                        <button onClick={(e) => { e.stopPropagation(); confirmDelete(p.id); }} className="text-slate-400 hover:text-red-600 p-2" title="删除" type="button"><Trash2 size={18} /></button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
                {loading && (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                )}
            </div>

            <Pagination
                currentPage={page}
                totalItems={total}
                pageSize={pageSize}
                onPageChange={setPage}
            />

            {isEditModalOpen && <ProductEditModal product={editingProduct} onClose={() => setIsEditModalOpen(false)} onSave={handleSaveProduct} />}

            <ConfirmModal
                isOpen={isDeleteModalOpen}
                title="确认删除硬件"
                description="您确定要下架并删除该硬件商品吗？此操作无法撤销。"
                confirmText="确认删除"
                isDangerous={true}
                isLoading={isDeleting}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDelete}
            />
        </div>
    )
}

function ProductEditModal({ product, onClose, onSave }: { product: HardwareItem | null, onClose: () => void, onSave: (p: HardwareItem, keepOpen?: boolean) => void }) {
    const { showToast } = useToast();
    const [formData, setFormData] = useState<Partial<HardwareItem>>(
        product || { category: 'cpu', brand: '', model: '', price: 0, sortOrder: 99, status: 'active', specs: {}, costPrice: 0, profitType: 'fixed', profitValue: 0 }
    );

    const [brandSuggestions, setBrandSuggestions] = useState<string[]>([]);
    const [specSuggestions, setSpecSuggestions] = useState<Record<string, string[]>>({});

    useEffect(() => {
        if (formData.category) {
            loadSuggestions();
        }
    }, [formData.category]);

    const loadSuggestions = async () => {
        if (!formData.category) return;

        // Load brands for this category
        const brands = await storage.getBrands(formData.category);
        setBrandSuggestions(brands);

        // Load suggestions for text-type specs
        const fields = COMPATIBILITY_FIELDS[formData.category] || [];
        const newSpecSuggestions: Record<string, string[]> = {};

        for (const field of fields) {
            if (field.type === 'text') {
                const values = await storage.getSpecValues(formData.category, field.key);
                newSpecSuggestions[field.key] = values;
            }
        }
        setSpecSuggestions(newSpecSuggestions);
    };

    const handleSpecChange = (key: string, value: any) => {
        setFormData(prev => {
            let currentSpecs: any = prev.specs || {};
            if (typeof currentSpecs === 'string') {
                try { currentSpecs = JSON.parse(currentSpecs); } catch (e) { currentSpecs = {}; }
            } else if (currentSpecs && typeof currentSpecs === 'object' && !Array.isArray(currentSpecs) && '0' in currentSpecs && typeof currentSpecs['0'] === 'string' && currentSpecs['0'] === '{') {
                try { currentSpecs = JSON.parse(Object.values(currentSpecs).join('')); } catch (e) { currentSpecs = {}; }
            }
            return {
                ...prev,
                specs: { ...currentSpecs, [key]: value }
            };
        });
    };

    const currentCatSpecs = formData.category ? COMPATIBILITY_FIELDS[formData.category] : null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData as HardwareItem, false);
    };

    const handleSaveAndContinue = (e: React.MouseEvent) => {
        e.preventDefault();
        onSave(formData as HardwareItem, true);
        // Reset form for next entry (keep category for convenience)
        setFormData({
            category: formData.category,
            brand: '',
            model: '',
            price: 0,
            sortOrder: 99,
            status: 'active',
            specs: {},
            isRecommended: false,
            isDiscount: false,
            image: undefined,
            costPrice: 0,
            profitType: 'fixed',
            profitValue: 0
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-scale-up max-h-[90vh] flex flex-col overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-slate-100 shrink-0">
                    <h3 className="text-lg font-bold text-slate-800">{product ? '编辑硬件' : '录入新硬件'}</h3>
                    <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-slate-600" /></button>
                </div>
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                        <div className="space-y-4 border-b border-slate-100 pb-4">
                            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><Package size={14} /> 基础信息</h4>

                        {/* Image Upload */}
                        <div className="flex gap-4 items-start">
                            <div className="w-24 h-24 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center relative overflow-hidden group">
                                {formData.image ? (
                                    <>
                                        <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, image: undefined })}
                                            className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </>
                                ) : (
                                    <div className="text-center text-slate-400">
                                        <Upload size={20} className="mx-auto mb-1" />
                                        <span className="text-[10px]">上传图片</span>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    accept="image/*"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            const res = await storage.uploadImage(file);
                                            if (res) {
                                                setFormData({ ...formData, image: res.url });
                                            } else {
                                                showToast('上传失败', 'error');
                                            }
                                        }
                                    }}
                                />
                            </div>
                            <div className="flex-1 space-y-3">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">分类</label>
                                        <select className="w-full border border-slate-200 rounded-lg p-2 text-sm" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value as Category, specs: {} })}>
                                            {Object.entries(CATEGORY_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">品牌</label>
                                        <input
                                            className="w-full border border-slate-200 rounded-lg p-2 text-sm"
                                            value={formData.brand}
                                            onChange={e => setFormData({ ...formData, brand: e.target.value })}
                                            required
                                            placeholder="例如：Intel"
                                            list="brand-suggestions"
                                        />
                                        <datalist id="brand-suggestions">
                                            {brandSuggestions.map(b => <option key={b} value={b} />)}
                                        </datalist>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">型号</label>
                                    <input className="w-full border border-slate-200 rounded-lg p-2 text-sm" value={formData.model} onChange={e => setFormData({ ...formData, model: e.target.value })} required placeholder="例如：i5-13600KF" />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-4 border-r border-slate-100 pr-4">
                                <label className="block text-xs font-bold text-slate-500 mb-1">成本价 (¥)</label>
                                <input 
                                    type="number" 
                                    className="w-full border border-slate-200 rounded-lg p-2 text-sm font-mono" 
                                    value={formData.costPrice} 
                                    onChange={e => {
                                        const cp = Number(e.target.value);
                                        // 联动逻辑：重计售价
                                        let newPrice = formData.price || 0;
                                        if (formData.profitType === 'fixed') {
                                            newPrice = cp + (formData.profitValue || 0);
                                        } else {
                                            newPrice = cp * (1 + (formData.profitValue || 0) / 100);
                                        }
                                        setFormData({ ...formData, costPrice: cp, price: Number(newPrice.toFixed(2)) });
                                    }} 
                                    placeholder="输入进货价"
                                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                />
                                
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">利润类型</label>
                                        <select 
                                            className="w-full border border-slate-200 rounded-lg p-2 text-xs"
                                            value={formData.profitType}
                                            onChange={e => {
                                                const pt = e.target.value as 'fixed' | 'percent';
                                                let newPrice = formData.price || 0;
                                                if (pt === 'fixed') {
                                                    newPrice = (formData.costPrice || 0) + (formData.profitValue || 0);
                                                } else {
                                                    newPrice = (formData.costPrice || 0) * (1 + (formData.profitValue || 0) / 100);
                                                }
                                                setFormData({ ...formData, profitType: pt, price: Number(newPrice.toFixed(2)) });
                                            }}
                                        >
                                            <option value="fixed">固定金额</option>
                                            <option value="percent">百分比</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">
                                            {formData.profitType === 'fixed' ? '利润值 (¥)' : '利润率 (%)'}
                                        </label>
                                        <input 
                                            type="number" 
                                            className="w-full border border-slate-200 rounded-lg p-2 text-sm font-mono" 
                                            value={formData.profitValue}
                                            onChange={e => {
                                                const pv = Number(e.target.value);
                                                let newPrice = formData.price || 0;
                                                if (formData.profitType === 'fixed') {
                                                    newPrice = (formData.costPrice || 0) + pv;
                                                } else {
                                                    newPrice = (formData.costPrice || 0) * (1 + pv / 100);
                                                }
                                                setFormData({ ...formData, profitValue: pv, price: Number(newPrice.toFixed(2)) });
                                            }}
                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1 flex justify-between">
                                        <span>最终售价 (¥)</span>
                                        <span className="text-[10px] text-indigo-500 font-normal">基于成本+利润联动</span>
                                    </label>
                                    <input 
                                        type="number" 
                                        className="w-full border-2 border-indigo-100 bg-indigo-50/30 rounded-lg p-2 text-lg font-mono font-bold text-indigo-600 focus:border-indigo-500 outline-none" 
                                        value={formData.price} 
                                        onChange={e => setFormData(withManualPrice(formData, Number(e.target.value)))}
                                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                        required 
                                    />
                                    <div className="mt-2 p-2 bg-slate-50 rounded-lg border border-slate-100 space-y-1.5">
                                        <div className="flex justify-between text-[10px] text-slate-400">
                                            <span>预估毛利:</span>
                                            <span className="font-bold text-emerald-600">¥{Number(( (formData.price || 0) - (formData.costPrice || 0) ).toFixed(2))}</span>
                                        </div>
                                        <div className="flex justify-between text-[10px] text-slate-400">
                                            <span>毛利率:</span>
                                            <span className="font-bold text-emerald-600">{formData.price ? (( (formData.price - (formData.costPrice || 0)) / formData.price ) * 100).toFixed(1) : 0}%</span>
                                        </div>
                                    </div>
                                    {formData.specs?.jdPrice && (
                                        <div className="mt-2 p-2.5 bg-red-50/50 rounded-lg border border-red-100/50 flex items-center justify-between">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[11px] font-bold text-red-600">🐶 京东官方现价</span>
                                                <span className="text-[9px] px-1 py-0.5 bg-red-100 text-red-600 rounded">自动实时</span>
                                            </div>
                                            <span className="font-bold font-mono text-red-600 text-sm">¥{formData.specs.jdPrice}</span>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">排序权重</label>
                                    <input type="number" className="w-full border border-slate-200 rounded-lg p-2 text-sm font-mono text-slate-500" value={formData.sortOrder} onChange={e => setFormData({ ...formData, sortOrder: Number(e.target.value) })} onWheel={(e) => (e.target as HTMLInputElement).blur()} />
                                </div>
                            </div>
                        </div>

                        {/* Badge Toggles */}
                        <div className="flex gap-4 py-2">
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.isRecommended || false}
                                    onChange={e => setFormData({ ...formData, isRecommended: e.target.checked })}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                设为推荐
                            </label>
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.isDiscount || false}
                                    onChange={e => setFormData({ ...formData, isDiscount: e.target.checked })}
                                    className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                                />
                                设为折扣
                            </label>
                        </div>
                        
                        <div className="space-y-4">
                        {/* 京东关联 */}
                        <JDLinkBinder 
                            productId={product?.id || ''} 
                            productName={`${formData.brand || ''} ${formData.model || ''}`.trim()}
                            specs={formData.specs || {}} 
                            onUpdate={(newSpecs: any) => setFormData({ ...formData, specs: newSpecs })}
                            isEditing={!!product}
                        />

                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><ListFilter size={14} /> 关键兼容性参数</h4>
                        {currentCatSpecs ? (
                            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl">
                                {currentCatSpecs.map(field => (
                                    <div key={field.key} className={field.type === 'select' ? '' : ''}>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">{field.label}</label>
                                        {field.type === 'select' ? (
                                            <select
                                                className="w-full border border-slate-200 rounded-lg p-2 text-xs"
                                                value={formData.specs?.[field.key] || ''}
                                                onChange={e => handleSpecChange(field.key, e.target.value)}
                                            >
                                                <option value="">请选择</option>
                                                {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                            </select>
                                        ) : (
                                            <>
                                                <input
                                                    type={field.type}
                                                    className="w-full border border-slate-200 rounded-lg p-2 text-xs"
                                                    value={formData.specs?.[field.key] || ''}
                                                    onChange={e => handleSpecChange(field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                                                    placeholder={`输入${field.label}`}
                                                    list={field.type === 'text' ? `spec-list-${field.key}` : undefined}
                                                />
                                                {field.type === 'text' && specSuggestions[field.key] && (
                                                    <datalist id={`spec-list-${field.key}`}>
                                                        {specSuggestions[field.key].map(val => <option key={val} value={val} />)}
                                                    </datalist>
                                                )}
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-xs text-slate-400 italic">该分类暂无特定兼容性参数，请使用下方自由录入。</div>
                        )}

                        <details className="group">
                            <summary className="list-none cursor-pointer text-xs font-bold text-slate-400 flex items-center gap-1 mb-2 hover:text-slate-600 transition-colors">
                                <span className="group-open:rotate-90 transition-transform">▶</span>
                                <span>其他规格 (自由JSON) - 高级模式</span>
                            </summary>
                            <textarea
                                className="w-full border border-slate-200 rounded-lg p-2 text-xs font-mono h-20"
                                value={JSON.stringify(formData.specs, null, 2)}
                                onChange={e => {
                                    try {
                                        setFormData({ ...formData, specs: JSON.parse(e.target.value) })
                                    } catch (err) { }
                                }}
                                placeholder="这里显示最终合并的JSON数据，也可手动修改"
                            />
                        </details>
                    </div>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 flex gap-3 shrink-0 bg-slate-50/50">
                        <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 transition-colors">取消</button>
                        <button type="button" onClick={handleSaveAndContinue} className="flex-1 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl font-bold hover:bg-indigo-100 transition-colors border border-indigo-200">保存并继续录入</button>
                        <button type="submit" className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-200">保存</button>
                    </div>
                </form>
            </div >
        </div >
    )
}

// ═══════════════════════════════════════════
// 京东联盟链接绑定组件
// ═══════════════════════════════════════════
function JDLinkBinder({ productId, productName, specs, onUpdate, isEditing }: {
    productId: string;
    productName: string;
    specs: Record<string, any>;
    onUpdate: (newSpecs: Record<string, any>) => void;
    isEditing: boolean;
}) {
    const [jdInput, setJdInput] = useState('');
    const [isBinding, setIsBinding] = useState(false);
    const [bindResult, setBindResult] = useState<{ success: boolean; message: string } | null>(null);
    const { showToast } = useToast();

    const currentJdUrl = specs?.jd_url || '';
    const currentJdPageUrl = specs?.jd_page_url || '';

    const handleBind = async () => {
        if (!jdInput.trim()) return;
        if (!isEditing) {
            // 新建产品时直接存入 specs（保存后才会真正调用API）
            showToast('请先保存产品，再绑定京东链接', 'error');
            return;
        }

        setIsBinding(true);
        setBindResult(null);
        try {
            const res = await ApiService.post('/products/admin/bind-jd', {
                product_id: productId,
                jd_url: jdInput.trim()
            });
            if (res.success) {
                onUpdate({
                    ...specs,
                    jd_url: res.click_url,
                    jd_sku_id: res.product?.specs?.jd_sku_id || '',
                    jd_page_url: res.product?.specs?.jd_page_url || ''
                });
                setBindResult({ success: true, message: '推广链接生成成功！' });
                setJdInput('');
                showToast('京东推广链接已生成', 'success');
            } else {
                setBindResult({ success: false, message: res.message || '绑定失败' });
            }
        } catch (e: any) {
            setBindResult({ success: false, message: e.message || '请求失败' });
        } finally {
            setIsBinding(false);
        }
    };

    const handleUnbind = () => {
        const { jd_url, jd_sku_id, jd_page_url, ...rest } = specs;
        onUpdate(rest);
        setBindResult(null);
        showToast('已解除京东关联', 'success');
    };

    return (
        <div className="p-4 bg-red-50/40 rounded-xl border border-red-100/60">
            <h4 className="text-sm font-bold text-red-700 mb-3 flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-red-600"><path d="M19.451 4.926c-.398-.354-.93-.561-1.49-.561h-.001c-.563 0-1.092.207-1.49.561L12 8.926l-4.47-4c-.398-.354-.93-.561-1.49-.561-.563 0-1.092.207-1.49.561L2 7.076V18.5a1.5 1.5 0 001.5 1.5h17a1.5 1.5 0 001.5-1.5V7.076l-2.549-2.15z"/></svg>
                京东联盟推广
                {currentJdUrl && <span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.5 rounded font-bold">已绑定</span>}
            </h4>

            {currentJdUrl ? (
                <div className="space-y-2">
                    <div className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-red-100">
                        <div className="flex-1 min-w-0">
                            <div className="text-[10px] text-slate-400 font-bold mb-0.5">推广链接</div>
                            <div className="text-[11px] text-slate-600 truncate font-mono">{currentJdUrl.slice(0, 60)}...</div>
                        </div>
                        <a
                            href={currentJdPageUrl || currentJdUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 px-3 py-1.5 bg-[#E2231A] text-white text-[11px] font-bold rounded-lg hover:bg-[#C81912] transition-colors"
                        >
                            打开京东
                        </a>
                        <button
                            type="button"
                            onClick={handleUnbind}
                            className="shrink-0 px-2 py-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors text-[11px] font-bold"
                        >
                            解绑
                        </button>
                    </div>
                    <p className="text-[10px] text-slate-400">客户点击购买 → 跳转京东下单 → 你赚佣金 💰</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {productName && (
                        <div className="mb-3">
                            <button
                                type="button"
                                onClick={() => {
                                    navigator.clipboard.writeText(productName);
                                    showToast('已复制搜索词，正前往京东联盟...');
                                    setTimeout(() => {
                                        window.open(`https://union.jd.com/proManager/index`, '_blank');
                                    }, 800);
                                }}
                                className="flex items-center gap-2 w-full px-4 py-2.5 bg-white border border-red-200 text-red-600 rounded-lg text-xs font-bold hover:bg-red-50 hover:border-red-300 transition-colors shadow-sm group"
                            >
                                <Search size={14} className="group-hover:scale-110 transition-transform" />
                                <span>一键直达京东搜索：<span className="text-slate-800 bg-slate-100 px-1 rounded">{productName}</span></span>
                                <span className="ml-auto text-[10px] bg-red-100 px-1.5 py-0.5 rounded text-red-600 font-normal">点击自动复制并打开网页</span>
                            </button>
                        </div>
                    )}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={jdInput}
                            onChange={e => setJdInput(e.target.value)}
                            placeholder="搜索完毕后，粘贴京东商品链接..."
                            className="flex-1 border border-red-200 rounded-lg px-3 py-2 text-xs placeholder:text-slate-300 focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleBind())}
                        />
                        <button
                            type="button"
                            onClick={handleBind}
                            disabled={isBinding || !jdInput.trim() || !isEditing}
                            className="shrink-0 px-4 py-2 bg-[#E2231A] text-white text-xs font-bold rounded-lg hover:bg-[#C81912] disabled:bg-slate-200 disabled:text-slate-400 transition-colors flex items-center gap-1.5"
                        >
                            {isBinding ? (
                                <><span className="animate-spin">⏳</span> 生成中...</>
                            ) : (
                                '生成推广链接'
                            )}
                        </button>
                    </div>
                    {bindResult && (
                        <div className={`text-[11px] font-bold px-3 py-1.5 rounded-lg ${bindResult.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                            {bindResult.message}
                        </div>
                    )}
                    <p className="text-[10px] text-slate-400">支持: jingfen.jd.com 链接 / 联盟商品ID（暂不支持纯 SKU ID）</p>
                </div>
            )}
        </div>
    );
}
