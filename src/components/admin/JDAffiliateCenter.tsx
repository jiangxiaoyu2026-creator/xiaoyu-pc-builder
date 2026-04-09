import { useState, useEffect } from 'react';
import { ApiService } from '../../services/api';
import { HardwareItem } from '../../types/adminTypes';
import { useToast } from '../common/Toast';
import { Search, Link2, CheckCircle2 } from 'lucide-react';

export default function JDAffiliateCenter() {
    const [hardwareList, setHardwareList] = useState<(HardwareItem & { catKey: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'unbound' | 'bound'>('unbound');
    const [searchTerm, setSearchTerm] = useState('');
    const { showToast } = useToast();

    // The inputs being typed for each hardware item
    const [inputValues, setInputValues] = useState<Record<string, string>>({});
    const [savingStates, setSavingStates] = useState<Record<string, boolean>>({});

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await ApiService.get('/products/admin?page_size=3000');
            const flatList: (HardwareItem & { catKey: string })[] = [];
            
            if (res && res.items) {
                res.items.forEach((item: HardwareItem) => {
                    flatList.push({ ...item, catKey: item.category || 'unknown' });
                });
            }

            // Sort logic: if 'unbound', unbound ones are naturally filtered. 
            // If all, we put unbound ones at top just for better workflow.
            flatList.sort((a, b) => {
                const aBound = !!a.specs?.jd_url;
                const bBound = !!b.specs?.jd_url;
                if (aBound === bBound) return 0;
                return aBound ? 1 : -1; // unbound comes first
            });

            setHardwareList(flatList);
        } catch (e: any) {
            showToast('获取硬件列表失败: ' + e.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCopyAndSearch = (brand: string, model: string, target: 'union' | 'jd' = 'union') => {
        let keyword = `${brand} ${model}`.trim();
        // Remove dashes for better search
        keyword = keyword.replace(/-/g, ' ');

        try {
            navigator.clipboard.writeText(keyword);
            showToast(`已复制: ${keyword}，正在跳转...`);
        } catch (e) {
            // fallback
        }
        setTimeout(() => {
            if (target === 'union') {
                window.open(`https://union.jd.com/proManager/index?keywords=${encodeURIComponent(keyword)}`, '_blank');
            } else {
                window.open(`https://search.jd.com/Search?enc=utf-8&keyword=${encodeURIComponent(keyword)}`, '_blank');
            }
        }, 800);
    };

    const handleSaveLink = async (productId: string) => {
        const urlToBind = inputValues[productId]?.trim();
        if (!urlToBind) return;

        setSavingStates(prev => ({ ...prev, [productId]: true }));
        try {
            const res = await ApiService.post('/products/admin/bind-jd', {
                product_id: productId,
                jd_input: urlToBind,
            });

            if (res.success) {
                showToast(`绑定成功! 佣金链接已生成`);
                // Clear the input and update the list locally to mark as bound
                setInputValues(prev => {
                    const next = { ...prev };
                    delete next[productId];
                    return next;
                });
                
                setHardwareList(prev => prev.map(hw => {
                    if (hw.id === productId) {
                        return {
                            ...hw,
                            specs: {
                                ...(hw.specs || {}),
                                jd_url: res.data?.jd_url || urlToBind
                            }
                        };
                    }
                    return hw;
                }));
                
                // Note: The UI cursor jump could be tricky, using standard focus flow usually works better.
            } else {
                showToast(res.message || '绑定失败', 'error');
            }
        } catch (e: any) {
            showToast(e.message || '网络请求错误', 'error');
        } finally {
            setSavingStates(prev => ({ ...prev, [productId]: false }));
        }
    };

    // Filtered data
    const displayList = hardwareList.filter(item => {
        // filter by boundary
        const isBound = !!item.specs?.jd_url;
        if (filter === 'unbound' && isBound) return false;
        if (filter === 'bound' && !isBound) return false;
        
        // filter by search term
        if (searchTerm) {
            const fullText = `${item.brand} ${item.model} ${item.catKey}`.toLowerCase();
            if (!fullText.includes(searchTerm.toLowerCase())) return false;
        }

        return true;
    });

    return (
        <div className="flex flex-col h-full bg-slate-50 relative">
            {/* Header Area */}
            <div className="bg-white px-6 py-4 border-b border-slate-200 flex justify-between items-center shrink-0">
                <div>
                    <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                        <Link2 size={24} className="text-red-600" />
                        京东联盟极速带货中心
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">流水线作业模式：【复制跳转】 {'>'} 【粘贴链接】 {'>'} 【回车保存】</p>
                </div>
                {/* 方案B: Excel 导出占位 - 暂未实现 */}
                {/* 
                <div className="flex gap-2">
                    <button className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                        <Download size={16} /> 导出未绑定 Excel
                    </button>
                    <button className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors">
                        <Upload size={16} /> 导入已绑定 Excel
                    </button>
                </div> 
                */}
            </div>

            {/* Filter / Controls */}
            <div className="px-6 py-3 bg-slate-100 flex gap-4 shrink-0 shadow-inner z-10 items-center">
                <div className="flex bg-white rounded-lg p-1 border border-slate-200">
                    <button 
                        onClick={() => setFilter('unbound')}
                        className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${filter === 'unbound' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        待绑定 ({hardwareList.filter(h => !h.specs?.jd_url).length})
                    </button>
                    <button 
                        onClick={() => setFilter('bound')}
                        className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${filter === 'bound' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        已完成
                    </button>
                    <button 
                        onClick={() => setFilter('all')}
                        className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${filter === 'all' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        全部商品
                    </button>
                </div>

                <div className="flex-1 max-w-xs relative ml-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="搜索型号、品牌..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
                    />
                </div>
            </div>

            {/* Table Area */}
            <div className="flex-1 overflow-y-auto px-6 py-6" style={{ scrollbarWidth: 'thin' }}>
                {loading ? (
                    <div className="text-center text-slate-400 py-12">正在拉取全量商品库...</div>
                ) : (
                    <div className="space-y-3 pb-24">
                        {displayList.map((item) => {
                            const isBound = !!item.specs?.jd_url;
                            const isSaving = savingStates[item.id] || false;
                            
                            return (
                                <div key={item.id} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${isBound ? 'bg-green-50/30 border-green-100' : 'bg-white border-slate-200 shadow-sm hover:shadow-md'}`}>
                                    
                                    {/* Info Sector */}
                                    <div className="w-[30%] shrink-0">
                                        <div className="text-xs text-slate-400 font-bold uppercase mb-1">{item.catKey}</div>
                                        <div className="text-sm font-extrabold text-slate-800 line-clamp-2" title={`${item.brand} ${item.model}`}>
                                            {item.brand} {item.model}
                                        </div>
                                    </div>

                                    {/* Search Action Sector */}
                                    <div className="w-[28%] shrink-0 flex flex-col gap-2 justify-center border-l border-r border-slate-100 px-4">
                                        <button 
                                            onClick={() => handleCopyAndSearch(item.brand, item.model, 'union')}
                                            className="w-full py-2 px-3 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 border border-red-100 transition-colors shadow-sm flex items-center justify-center gap-2 group"
                                        >
                                            <Search size={14} className="group-hover:scale-110 transition-transform" />
                                            <span>一键去联盟搜</span>
                                        </button>
                                        <button 
                                            onClick={() => handleCopyAndSearch(item.brand, item.model, 'jd')}
                                            className="w-full py-1.5 px-3 bg-slate-50 text-slate-600 rounded-lg text-[11px] font-bold hover:bg-slate-100 border border-slate-200 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <span>备用：去京东商城搜</span>
                                        </button>
                                    </div>

                                    {/* Input & Save Sector */}
                                    <div className="flex-1 relative pl-2">
                                        {isBound ? (
                                            <div className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg border border-green-200">
                                                <CheckCircle2 size={16} />
                                                <span className="text-xs font-bold overflow-hidden text-ellipsis whitespace-nowrap">
                                                    已绑定: {item.specs.jd_url}
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="flex gap-2 relative">
                                                <input 
                                                    type="text" 
                                                    placeholder="粘贴京东商品链接或短链接，并按回车保存..."
                                                    value={inputValues[item.id] || ''}
                                                    onChange={e => setInputValues({ ...inputValues, [item.id]: e.target.value })}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') handleSaveLink(item.id);
                                                    }}
                                                    disabled={isSaving}
                                                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-xs focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 focus:outline-none transition-shadow disabled:bg-slate-50 disabled:text-slate-400"
                                                />
                                                {inputValues[item.id] && (
                                                    <button 
                                                        onClick={() => handleSaveLink(item.id)}
                                                        disabled={isSaving}
                                                        className="absolute right-1 top-1 bottom-1 px-4 bg-slate-900 text-white text-xs font-bold rounded-md hover:bg-indigo-600 transition-colors shadow-sm"
                                                    >
                                                        {isSaving ? '绑定中...' : '保存'}
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                </div>
                            );
                        })}
                        {displayList.length === 0 && (
                            <div className="text-center py-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl">
                                <span className="text-2xl mb-2 inline-block">🎉</span>
                                <h3 className="text-lg font-bold text-slate-600">太棒了！</h3>
                                <p className="text-slate-400 mt-1">此状态下的京东带货链接已经全部绑定完毕。</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
