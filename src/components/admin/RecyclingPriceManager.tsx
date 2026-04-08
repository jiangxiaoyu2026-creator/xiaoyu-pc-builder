import { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Edit2, CheckCircle, XCircle, FileSpreadsheet, Loader2, ArrowUpRight, Upload, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { RecyclingPrice } from '../../types/adminTypes';

const CATEGORY_TABS = [
    { id: 'gpu', label: '显卡' },
    { id: 'cpu', label: '处理器' },
    { id: 'motherboard', label: '主板' },
    { id: 'ram', label: '内存' },
    { id: 'disk', label: '硬盘' },
    { id: 'psu', label: '电源' },
    { id: 'case', label: '机箱' },
    { id: 'monitor', label: '显示器' },
    { id: 'cooler', label: '散热' },
    { id: 'peripheral', label: '外设' }
];

export default function RecyclingPriceManager() {
    const [currentCat, setCurrentCat] = useState('gpu');
    const [search, setSearch] = useState('');
    const [items, setItems] = useState<RecyclingPrice[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState<any>(null);
    const [uploading, setUploading] = useState(false);
    const [sortBy, setSortBy] = useState<string | null>(null);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    // Edit state
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<Partial<RecyclingPrice>>({});

    const fetchItems = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('xiaoyu_token');
            const sortParams = sortBy ? `&sort_by=${sortBy}&sort_order=${sortOrder}` : '';
            const res = await fetch(`/api/recycling-prices/admin?page=${page}&category=${currentCat}&search=${encodeURIComponent(search)}${sortParams}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setItems(data.items || []);
            setTotal(data.total || 0);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('xiaoyu_token');
            const res = await fetch('/api/recycling-prices/admin/stats', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setStats(data);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    useEffect(() => {
        fetchItems();
    }, [currentCat, search, page, sortBy, sortOrder]);

    const toggleSort = (field: string) => {
        if (sortBy === field) {
            if (sortOrder === 'asc') {
                setSortOrder('desc');
            } else {
                // Third click: reset sort
                setSortBy(null);
                setSortOrder('asc');
            }
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
        setPage(1);
    };

    const formatDateAge = (dateStr: string | undefined) => {
        if (!dateStr) return { text: '-', color: 'text-slate-400', tag: '' };
        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        const dateText = date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
        
        if (diffDays > 60) return { text: dateText, color: 'text-rose-600', tag: `${diffDays}天前` };
        if (diffDays > 30) return { text: dateText, color: 'text-amber-600', tag: `${diffDays}天前` };
        if (diffDays > 14) return { text: dateText, color: 'text-amber-500', tag: `${diffDays}天前` };
        if (diffDays > 1) return { text: dateText, color: 'text-slate-500', tag: `${diffDays}天前` };
        if (diffDays === 1) return { text: dateText, color: 'text-emerald-600', tag: '昨天' };
        return { text: dateText, color: 'text-emerald-600', tag: '今天' };
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const token = localStorage.getItem('xiaoyu_token');
            const res = await fetch('/api/recycling-prices/admin/import', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                alert(`导入成功！新增 ${data.newCount} 条，更新 ${data.updatedCount} 条`);
                fetchItems();
                fetchStats();
            } else {
                alert('导入失败');
            }
        } catch (error) {
            alert('上传出错');
        } finally {
            setUploading(false);
            e.target.value = ''; // reset input
        }
    };

    const startEdit = (item: RecyclingPrice) => {
        setEditingId(item.id!);
        setEditForm(item);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm({});
    };

    const saveEdit = async () => {
        if (!editingId) return;
        try {
            const token = localStorage.getItem('xiaoyu_token');
            const res = await fetch(`/api/recycling-prices/admin/${editingId}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(editForm)
            });
            if (res.ok) {
                setEditingId(null);
                fetchItems();
                fetchStats();
            }
        } catch (e) {
            alert('保存失败');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('确定删除该报价吗？')) return;
        try {
            const token = localStorage.getItem('xiaoyu_token');
            const res = await fetch(`/api/recycling-prices/admin/${id}`, { 
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) fetchItems();
        } catch (e) {
            alert('删除失败');
        }
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-6 animate-fade-in">
            {/* Header & Stats */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">回收价格库</h1>
                    <p className="text-slate-500 mt-1">管理各品类二手物品回收指导价与闲鱼预估价，共 {stats?.totalItems || 0} 条 SKU 数据</p>
                </div>
                <div className="flex gap-3">
                    <label className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 cursor-pointer transition-colors font-medium border border-emerald-100 shadow-sm relative overflow-hidden">
                        {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                        导入 Excel 价格表 ({uploading ? '处理中...' : '.xlsm'})
                        <input type="file" accept=".xlsm,.xlsx" className="hidden" disabled={uploading} onChange={handleFileUpload} />
                    </label>
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20 font-medium btn-press">
                        <Plus size={18} />
                        新增报价
                    </button>
                </div>
            </div>

            {/* Top Cards */}
            <div className="grid grid-cols-4 gap-4">
                {stats?.categoryStats?.filter((s:any) => ['gpu', 'cpu', 'motherboard', 'ram'].includes(s.code)).map((stat: any) => (
                    <div key={stat.code} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-slate-500 font-medium">{stat.label}总数</span>
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full font-bold">{stat.activeCount} 活跃</span>
                        </div>
                        <div className="text-2xl font-black text-slate-800">{stat.total}</div>
                        <div className="text-xs text-slate-400 mt-2 flex justify-between">
                            <span>均利润 ¥{stat.avgProfit}</span>
                            <span className="text-blue-500 font-medium">{stat.avgMargin}% 盈利率</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Content */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col min-h-[600px]">
                {/* Toolbar */}
                <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="flex gap-1 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto hide-scrollbar">
                        {CATEGORY_TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => { setCurrentCat(tab.id); setPage(1); }}
                                className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${
                                    currentCat === tab.id 
                                        ? 'bg-blue-50 text-blue-600' 
                                        : 'text-slate-500 hover:bg-slate-50'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="输入型号搜索..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 text-sm"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 sticky top-0 z-10 backdrop-blur-sm">
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase">型号</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase">回收单价</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase">闲鱼预估</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase">利润空间</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase">
                                    <button onClick={() => toggleSort('updatedAt')} className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                                        修改日期
                                        {sortBy === 'updatedAt' ? (
                                            sortOrder === 'asc' ? <ArrowUp size={14} className="text-blue-600" /> : <ArrowDown size={14} className="text-blue-600" />
                                        ) : <ArrowUpDown size={14} className="opacity-40" />}
                                    </button>
                                </th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading && items.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-400">
                                        <Loader2 size={24} className="animate-spin mx-auto mb-2" />
                                        正在加载数据...
                                    </td>
                                </tr>
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center text-slate-400">
                                        <FileSpreadsheet size={48} className="mx-auto mb-4 opacity-20" />
                                        <p>暂无数据</p>
                                    </td>
                                </tr>
                            ) : (
                                items.map(item => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="p-4">
                                            {editingId === item.id ? (
                                                <input value={editForm.model || ''} onChange={e => setEditForm({...editForm, model: e.target.value})} className="w-full px-2 py-1 border rounded text-sm font-bold" />
                                            ) : (
                                                <span className="font-bold text-slate-700 text-sm">{item.model}</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            {editingId === item.id ? (
                                                <div className="flex items-center gap-1 font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded text-sm w-fit">
                                                    <span>¥{editForm.recyclePrice}</span>
                                                    <span className="text-[10px] opacity-70 ml-1">(自动)</span>
                                                </div>
                                            ) : (
                                                <span className="font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded text-sm">¥{item.recyclePrice}</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            {editingId === item.id ? (
                                                <input type="number" value={editForm.resalePrice || ''} onChange={e => {
                                                    const newResale = Number(e.target.value);
                                                    const currentProfit = (editForm.resalePrice || 0) - (editForm.recyclePrice || 0);
                                                    setEditForm({...editForm, resalePrice: newResale, recyclePrice: newResale - currentProfit});
                                                }} className="w-24 px-2 py-1 border rounded text-sm text-center font-bold text-slate-600" />
                                            ) : (
                                                <span className="font-bold text-slate-600 text-sm">¥{item.resalePrice}</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            {editingId === item.id ? (
                                                <input type="number" value={(editForm.resalePrice || 0) - (editForm.recyclePrice || 0)} onChange={e => {
                                                    const newProfit = Number(e.target.value);
                                                    setEditForm({...editForm, recyclePrice: (editForm.resalePrice || 0) - newProfit});
                                                }} className="w-24 px-2 py-1 border rounded text-sm text-center font-bold text-emerald-600 bg-emerald-50 outline-emerald-200" />
                                            ) : (
                                                <span className="font-bold text-emerald-600 text-sm flex items-center gap-1">
                                                    <ArrowUpRight size={14} />
                                                    ¥{((item.resalePrice || 0) - (item.recyclePrice || 0)).toFixed(1)}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            {(() => {
                                                const info = formatDateAge(item.updatedAt);
                                                return (
                                                    <div className="flex flex-col">
                                                        <span className={`text-sm font-medium whitespace-nowrap ${info.color}`}>{info.text}</span>
                                                        {info.tag && <span className={`text-[11px] ${info.color} opacity-70`}>{info.tag}</span>}
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        <td className="p-4 text-right">
                                            {editingId === item.id ? (
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={saveEdit} className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg"><CheckCircle size={16} /></button>
                                                    <button onClick={cancelEdit} className="p-1.5 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-lg"><XCircle size={16} /></button>
                                                </div>
                                            ) : (
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => startEdit(item)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                                                    <button onClick={() => handleDelete(item.id!)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 size={16} /></button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <span className="text-sm text-slate-500">
                        共 <span className="font-bold text-slate-700">{total}</span> 条数据
                    </span>
                    <div className="flex gap-2">
                        <button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50 font-medium">上一页</button>
                        <span className="px-4 py-1.5 text-sm font-bold text-slate-700">{page}</span>
                        <button disabled={page >= Math.ceil(total / 50)} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50 font-medium">下一页</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
