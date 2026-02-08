
import React, { useState, useMemo } from 'react';
import { Search, Download, Plus, ListFilter, Package, Edit3, Trash2, X, Sparkles, Image as ImageIcon, Upload } from 'lucide-react';
import { HardwareItem, Category } from '../../types/adminTypes';
import { CATEGORY_MAP, COMPATIBILITY_FIELDS } from '../../data/adminData';
import { SortIcon } from './Shared';

export default function ProductManager({ products, setProducts }: { products: HardwareItem[], setProducts: any }) {
    const [search, setSearch] = useState('');
    const [filterCat, setFilterCat] = useState('all');
    const [sortConfig, setSortConfig] = useState<{ key: keyof HardwareItem, direction: 'asc' | 'desc' } | null>({ key: 'sortOrder', direction: 'asc' });

    const updatePrice = (id: string, newPrice: number) => {
        setProducts(products.map(p => p.id === id ? { ...p, price: newPrice } : p));
    };

    // const updateSortOrder = (id: string, newSortOrder: number) => {
    //     setProducts((prev: HardwareItem[]) => prev.map(p => p.id === id ? { ...p, sortOrder: newSortOrder } : p));
    // };

    const toggleStatus = (id: string) => {
        setProducts(products.map(p => p.id === id ? {
            ...p,
            status: p.status === 'active' ? 'archived' : 'active'
        } : p));
    };

    const handleSort = (key: keyof HardwareItem) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const filtered = useMemo(() => {
        let res = products.filter(p => {
            const matchCat = filterCat === 'all' || p.category === filterCat;
            const matchSearch = p.model.toLowerCase().includes(search.toLowerCase()) || p.brand.toLowerCase().includes(search.toLowerCase());
            return matchCat && matchSearch;
        });

        if (sortConfig) {
            res.sort((a, b) => {
                const valA = a[sortConfig.key] ?? 0;
                const valB = b[sortConfig.key] ?? 0;
                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return res;
    }, [products, search, filterCat, sortConfig]);

    const handleExportHardware = () => {
        const headers = ['ID', '分类', '品牌', '型号', '售价', '状态', '排序', '规格参数'];
        const rows = filtered.map(p => [
            p.id,
            CATEGORY_MAP[p.category].label,
            p.brand,
            p.model,
            p.price,
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

    const handleSaveProduct = (product: HardwareItem, keepOpen = false) => {
        if (editingProduct) {
            setProducts(products.map(p => p.id === product.id ? product : p));
        } else {
            setProducts([{ ...product, id: `new-${Date.now()}`, createdAt: new Date().toISOString() }, ...products]);
        }
        if (!keepOpen) {
            setIsEditModalOpen(false);
        }
    };

    const handleDelete = (id: string) => {
        if (confirm('确认删除？此操作不可恢复。')) {
            setProducts(products.filter(p => p.id !== id));
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center gap-4 bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex-1 min-w-0 flex gap-2 overflow-x-auto pb-1 mask-gradient-right">
                    <button onClick={() => setFilterCat('all')} className={`shrink-0 px-4 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${filterCat === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>全部</button>
                    {Object.entries(CATEGORY_MAP).map(([k, v]) => (
                        <button key={k} onClick={() => setFilterCat(k)} className={`shrink-0 px-4 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${filterCat === k ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{v.label}</button>
                    ))}
                </div>
                <div className="flex gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input type="text" placeholder="搜型号/品牌..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                    </div>
                    <button onClick={handleExportHardware} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 shadow-md">
                        <Download size={16} /> 导出数据
                    </button>
                    <button onClick={() => { setEditingProduct(null); setIsEditModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-200">
                        <Plus size={16} /> 录入
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
                                <div className="flex items-center justify-end gap-1">售价 (可编辑) <SortIcon active={sortConfig?.key === 'price'} dir={sortConfig?.direction} /></div>
                            </th>
                            <th className="px-6 py-4 text-center cursor-pointer hover:bg-slate-100" onClick={() => handleSort('sortOrder')}>
                                <div className="flex items-center justify-center gap-1">排序 <SortIcon active={sortConfig?.key === 'sortOrder'} dir={sortConfig?.direction} /></div>
                            </th>
                            <th className="px-6 py-4 text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filtered.map(p => {
                            const specSummary = Object.entries(p.specs).slice(0, 3).map(([k, v]) => `${k}:${v}`).join(', ');
                            return (
                                <tr key={p.id} className={`hover:bg-slate-50/50 ${p.status === 'archived' ? 'opacity-60 grayscale' : ''}`}>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-2">
                                            <button onClick={() => toggleStatus(p.id)} className={`px-2 py-1 rounded text-xs font-bold w-fit ${p.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                                                {p.status === 'active' ? '上架中' : '已下架'}
                                            </button>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => setProducts(products.map(x => x.id === p.id ? { ...x, isRecommended: !x.isRecommended } : x))}
                                                    className={`p-1 rounded ${p.isRecommended ? 'text-orange-500 bg-orange-50' : 'text-slate-300 hover:text-slate-500'}`}
                                                    title="设为推荐"
                                                >
                                                    <Sparkles size={14} fill={p.isRecommended ? "currentColor" : "none"} />
                                                </button>
                                                <button
                                                    onClick={() => setProducts(products.map(x => x.id === p.id ? { ...x, isDiscount: !x.isDiscount } : x))}
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
                                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden border border-slate-200">
                                                {p.image ? (
                                                    <img src={p.image} alt={p.model} className="w-full h-full object-cover" />
                                                ) : (
                                                    <ImageIcon size={20} className="text-slate-400" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900 flex items-center gap-2">
                                                    {p.model}
                                                    {p.isRecommended && <span className="text-[10px] bg-orange-100 text-orange-600 px-1 rounded">荐</span>}
                                                    {p.isDiscount && <span className="text-[10px] bg-rose-100 text-rose-600 px-1 rounded">折</span>}
                                                </div>
                                                <div className="text-xs text-slate-500">{p.brand} · {CATEGORY_MAP[p.category].label}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-xs text-slate-500 truncate max-w-xs">{specSummary}</div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <span className="text-slate-400 text-xs">¥</span>
                                            <input
                                                type="number"
                                                className="w-24 text-right font-bold text-indigo-600 bg-slate-50 border border-slate-200 rounded px-2 py-1 focus:border-indigo-500 focus:outline-none transition-colors"
                                                value={p.price}
                                                onChange={(e) => updatePrice(p.id, Number(e.target.value))}
                                            />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center">
                                            <input
                                                type="number"
                                                className="w-16 text-center font-mono text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-all"
                                                value={p.sortOrder}
                                                onChange={(e) => {
                                                    setProducts(products.map(item => item.id === p.id ? { ...item, sortOrder: Number(e.target.value) } : item));
                                                }}
                                            />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => { setEditingProduct(p); setIsEditModalOpen(true); }} className="text-slate-400 hover:text-indigo-600 p-2" title="编辑"><Edit3 size={18} /></button>
                                        <button onClick={() => handleDelete(p.id)} className="text-slate-400 hover:text-red-600 p-2" title="删除"><Trash2 size={18} /></button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {isEditModalOpen && <ProductEditModal product={editingProduct} onClose={() => setIsEditModalOpen(false)} onSave={handleSaveProduct} />}
        </div>
    )
}

function ProductEditModal({ product, onClose, onSave }: { product: HardwareItem | null, onClose: () => void, onSave: (p: HardwareItem, keepOpen?: boolean) => void }) {
    const [formData, setFormData] = useState<Partial<HardwareItem>>(
        product || { category: 'cpu', brand: '', model: '', price: 0, sortOrder: 99, status: 'active', specs: {} }
    );

    const handleSpecChange = (key: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            specs: { ...prev.specs, [key]: value }
        }));
    };

    const currentCatSpecs = formData.category ? COMPATIBILITY_FIELDS[formData.category] : null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Default to close (keepOpen=false)
        onSave({ ...formData, stock: 0, costPrice: 0 } as HardwareItem, false);
    };

    const handleSaveAndContinue = (e: React.MouseEvent) => {
        e.preventDefault();
        onSave({ ...formData, stock: 0, costPrice: 0 } as HardwareItem, true);
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
            image: undefined
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl animate-scale-up max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800">{product ? '编辑硬件' : '录入新硬件'}</h3>
                    <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-slate-600" /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
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
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            // Image Compression Logic
                                            const reader = new FileReader();
                                            reader.onload = (event) => {
                                                const img = new Image();
                                                img.onload = () => {
                                                    const canvas = document.createElement('canvas');
                                                    let width = img.width;
                                                    let height = img.height;

                                                    // Max dimension 600px
                                                    const MAX_SIZE = 600;
                                                    if (width > height) {
                                                        if (width > MAX_SIZE) {
                                                            height *= MAX_SIZE / width;
                                                            width = MAX_SIZE;
                                                        }
                                                    } else {
                                                        if (height > MAX_SIZE) {
                                                            width *= MAX_SIZE / height;
                                                            height = MAX_SIZE;
                                                        }
                                                    }

                                                    canvas.width = width;
                                                    canvas.height = height;
                                                    const ctx = canvas.getContext('2d');
                                                    ctx?.drawImage(img, 0, 0, width, height);

                                                    // Compress to JPEG 0.7
                                                    const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                                                    setFormData({ ...formData, image: compressedBase64 });
                                                };
                                                img.src = event.target?.result as string;
                                            };
                                            reader.readAsDataURL(file);
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
                                        <input className="w-full border border-slate-200 rounded-lg p-2 text-sm" value={formData.brand} onChange={e => setFormData({ ...formData, brand: e.target.value })} required placeholder="例如：Intel" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">型号</label>
                                    <input className="w-full border border-slate-200 rounded-lg p-2 text-sm" value={formData.model} onChange={e => setFormData({ ...formData, model: e.target.value })} required placeholder="例如：i5-13600KF" />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">售价 (¥)</label>
                                <input type="number" className="w-full border border-slate-200 rounded-lg p-2 text-sm font-mono font-bold text-indigo-600" value={formData.price} onChange={e => setFormData({ ...formData, price: Number(e.target.value) })} required />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">排序权重</label>
                                <input type="number" className="w-full border border-slate-200 rounded-lg p-2 text-sm font-mono" value={formData.sortOrder} onChange={e => setFormData({ ...formData, sortOrder: Number(e.target.value) })} />
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
                    </div>

                    <div className="space-y-4">
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
                                            <input
                                                type={field.type}
                                                className="w-full border border-slate-200 rounded-lg p-2 text-xs"
                                                value={formData.specs?.[field.key] || ''}
                                                onChange={e => handleSpecChange(field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                                                placeholder={`输入${field.label}`}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-xs text-slate-400 italic">该分类暂无特定兼容性参数，请使用下方自由录入。</div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">其他规格 (自由JSON)</label>
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
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 transition-colors">取消</button>
                        <button type="button" onClick={handleSaveAndContinue} className="flex-1 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl font-bold hover:bg-indigo-100 transition-colors border border-indigo-200">保存并继续录入</button>
                        <button type="submit" className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-200">保存</button>
                    </div>
                </form>
            </div >
        </div >
    )
}
