import { useState, useEffect, useRef, useMemo } from 'react';
import { X, Search, CheckCircle2, Camera, AlertCircle, Plus, Trash2, ChevronRight, Zap } from 'lucide-react';
import { UserItem } from '../../types/adminTypes';
import { storage } from '../../services/storage';
import { getIconByCategory } from './Shared';

interface RecycleEstimatorProps {
    onClose: () => void;
    onSuccess: () => void;
    currentUser: UserItem;
    showToast: (msg: string) => void;
}

// Ensure the same categories as used in visual builder or recycle categories
const RECYCLE_CATEGORIES = [
    { code: 'cpu', label: 'CPU' },
    { code: 'gpu', label: '显卡' },
    { code: 'mainboard', label: '主板' },
    { code: 'ram', label: '内存' },
    { code: 'disk', label: '硬盘' },
    { code: 'power', label: '电源' },
    { code: 'cooling', label: '散热' },
    { code: 'case', label: '机箱' },
    { code: 'monitor', label: '显示器' },
    { code: 'peripheral', label: '外设' }
];

export default function RecycleEstimator({ onClose, onSuccess, currentUser, showToast }: RecycleEstimatorProps) {
    const [step, setStep] = useState<'list' | 'success'>('list');
    
    // selected components by category code
    const [selectedItems, setSelectedItems] = useState<Record<string, any>>({});
    
    // Search modal state
    const [modalCategory, setModalCategory] = useState<{code: string, label: string} | null>(null);
    const [keyword, setKeyword] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    
    // Form states
    const [description, setDescription] = useState('');
    const [wechat, setWechat] = useState('');
    const [image, setImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const searchTimeout = useRef<any>(null);
    const modalInputRef = useRef<HTMLInputElement>(null);

    // Auto focus search input when modal opens
    useEffect(() => {
        if (modalCategory && modalInputRef.current) {
            modalInputRef.current.focus();
        }
    }, [modalCategory]);

    const handleSearch = (kw: string) => {
        setKeyword(kw);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        
        if (!kw.trim()) {
            setResults([]);
            return;
        }

        setSearching(true);
        searchTimeout.current = setTimeout(async () => {
            try {
                // Map local category code to backend code if needed
                const backendCatMap: Record<string, string> = {
                    'mainboard': 'motherboard',
                    'power': 'psu',
                    'cooling': 'cooler'
                };
                
                const searchCat = modalCategory ? (backendCatMap[modalCategory.code] || modalCategory.code) : 'all';
                
                const res = await fetch(`/api/recycling-prices/estimate?category=${searchCat}&keyword=${encodeURIComponent(kw)}`);
                const data = await res.json();
                setResults(data.items || []);
            } catch (e) {
                console.error(e);
            } finally {
                setSearching(false);
            }
        }, 300);
    };

    const handleSelectCategory = (cat: {code: string, label: string}) => {
        setModalCategory(cat);
        setKeyword('');
        setResults([]);
    };

    const handleSelectItem = (item: any) => {
        if (!modalCategory) return;
        
        setSelectedItems(prev => ({
            ...prev,
            [modalCategory.code]: item
        }));
        
        setModalCategory(null);
        setKeyword('');
    };
    
    const handleRemoveItem = (catCode: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedItems(prev => {
            const next = { ...prev };
            delete next[catCode];
            return next;
        });
    };

    const handleManualSubmit = () => {
        if (!modalCategory) return;
        
        setSelectedItems(prev => ({
            ...prev,
            [modalCategory.code]: {
                id: `manual_${Date.now()}`,
                model: '人工估价型号',
                recyclePrice: 0,
                isManual: true
            }
        }));
        setModalCategory(null);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (loading) return;
            setLoading(true);
            try {
                const res = await storage.uploadImage(file);
                if (res) setImage(res.url);
                else showToast('图片上传失败，请重试');
            } catch (error) {
                showToast('图片上传出错');
            } finally {
                setLoading(false);
            }
        }
    };

    const totalPrice = useMemo(() => {
        return Object.values(selectedItems).reduce((sum, item) => sum + (item.recyclePrice || 0), 0);
    }, [selectedItems]);

    const submitRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const hasItems = Object.keys(selectedItems).length > 0;
        
        if (!hasItems && !description.trim()) {
            return showToast('请选择至少一个配件或填写物品描述');
        }
        
        if (!wechat.trim()) return showToast('请输入微信号');

        setLoading(true);
        
        // Build auto description from selected items
        let finalDescription = '';
        if (hasItems) {
            const itemsText = RECYCLE_CATEGORIES
                .filter(cat => selectedItems[cat.code])
                .map(cat => {
                    const item = selectedItems[cat.code];
                    return `${cat.label}: ${item.model} (¥${item.recyclePrice})`;
                })
                .join('\\n');
                
            finalDescription = `已选配置 (总预估: ¥${totalPrice}):\\n${itemsText}\\n`;
            if (description) {
                finalDescription += `\\n补充描述:\\n${description}`;
            }
        } else {
            finalDescription = description.trim();
        }

        const recycleRequest = {
            id: `recycle_${Date.now()}`,
            userId: currentUser.id,
            userName: currentUser.username,
            description: finalDescription,
            wechat: wechat.trim(),
            image: image || '',
            status: 'pending' as const,
            isRead: false,
            createdAt: new Date().toISOString()
        };
        await storage.addRecycleRequest(recycleRequest);
        
        setTimeout(() => {
            setLoading(false);
            setStep('success');
        }, 800);
    };

    if (step === 'success') {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-3xl w-full max-w-sm p-8 text-center animate-scale-up shadow-2xl">
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500">
                        <CheckCircle2 size={48} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">申请已提交</h2>
                    <p className="text-slate-500 mb-8">我们的客服人员会尽快通过微信联系您进行复核与最终估价。</p>
                    <button onClick={() => { onClose(); onSuccess(); }} className="w-full py-3.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/30">
                        完成
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl animate-scale-up flex flex-col h-[85vh] md:h-[800px] overflow-hidden relative">
                
                {/* Header */}
                <div className="p-6 pb-4 border-b border-slate-100 flex justify-between items-center bg-white z-10 shrink-0">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                            <Zap className="text-indigo-500" size={24} />
                            整机回收估价
                        </h2>
                        <p className="text-sm font-medium text-slate-500 mt-1">
                            选择您的闲置配件，系统将实时计算回收整机预估价
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors self-start">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                {/* Main Content (Table + Form) */}
                <div className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6 custom-scrollbar">
                    
                    {/* Components Table */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
                        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800">硬件清单</h3>
                            <button 
                                onClick={() => setSelectedItems({})} 
                                className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
                                disabled={Object.keys(selectedItems).length === 0}
                            >
                                <Trash2 size={12} /> 清空已选
                            </button>
                        </div>
                        
                        <div className="divide-y divide-slate-100">
                            {RECYCLE_CATEGORIES.map(cat => {
                                const isSelected = !!selectedItems[cat.code];
                                const item = selectedItems[cat.code];
                                
                                return (
                                    <div 
                                        key={cat.code}
                                        onClick={() => handleSelectCategory(cat)}
                                        className={`p-3 md:p-4 flex items-center gap-3 md:gap-4 transition-all cursor-pointer group ${isSelected ? 'bg-indigo-50/30' : 'hover:bg-slate-50'}`}
                                    >
                                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors shadow-sm ${isSelected ? 'bg-indigo-50 text-indigo-500' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                                            <div className="scale-90 md:scale-100">
                                                {getIconByCategory(cat.code)}
                                            </div>
                                        </div>
                                        
                                        <div className="w-12 md:w-16 shrink-0">
                                            <div className={`text-xs md:text-sm font-bold tracking-wider ${isSelected ? 'text-indigo-900' : 'text-slate-500'}`}>
                                                {cat.label}
                                            </div>
                                        </div>
                                        
                                        <div className="flex-1 min-w-0 flex items-center">
                                            {isSelected ? (
                                                <div className="font-bold text-sm md:text-base text-slate-800 truncate leading-tight group-hover:text-indigo-600 transition-colors">
                                                    {item.model}
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-lg border border-dashed border-slate-300 text-slate-400 group-hover:border-indigo-300 group-hover:text-indigo-500 transition-colors bg-white">
                                                    <Plus size={14} strokeWidth={2.5} />
                                                    <span className="text-xs font-bold">去挑选</span>
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="shrink-0 flex items-center gap-2 md:gap-3 justify-end text-right min-w-[70px] md:min-w-[100px]">
                                            <div className="font-mono font-black text-sm md:text-lg text-slate-900">
                                                {isSelected ? (item.isManual ? <span className="text-xs text-slate-400 font-sans">人工估价</span> : `¥${item.recyclePrice}`) : <span className="text-slate-300">-</span>}
                                            </div>
                                            
                                            {isSelected && (
                                                <button
                                                    className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                                    onClick={(e) => handleRemoveItem(cat.code, e)}
                                                >
                                                    <X size={14} strokeWidth={3} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Submission Form */}
                    <form id="recycleForm" onSubmit={submitRequest} className="space-y-6">
                        <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                补充联系方式与细节
                            </h3>
                            
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">
                                        微信号，稍后客服根据微信号联系您<span className="text-red-500 ml-1">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={wechat}
                                        onChange={e => setWechat(e.target.value)}
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 font-medium text-slate-800 transition-all"
                                        placeholder="请输入微信号"
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">
                                        补充物品描述 (如成色、购买时间等) <span className="text-slate-400 font-normal">({Object.keys(selectedItems).length > 0 ? '选填' : '必填'})</span>
                                    </label>
                                    <textarea
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 h-28 resize-none text-sm font-medium text-slate-800 transition-all"
                                        placeholder={Object.keys(selectedItems).length > 0 ? "未选择配件的请在此补充，或描述产品的成色情况、有无包装或暗病等..." : "请描述要回收的物品详情..."}
                                        required={Object.keys(selectedItems).length === 0}
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">上传整机或配件照片 <span className="text-slate-400 font-normal">(选填)</span></label>
                                    {image ? (
                                        <div className="relative w-full h-40 rounded-xl border border-slate-200 overflow-hidden group">
                                            <img src={image} alt="preview" className="w-full h-full object-cover" />
                                            <button type="button" onClick={() => setImage(null)} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg backdrop-blur-sm">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="flex flex-col items-center justify-center w-full h-28 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50 transition-colors cursor-pointer text-slate-400 hover:text-indigo-500">
                                            <Camera size={28} className="mb-2" />
                                            <span className="text-sm font-bold">点击上传图片</span>
                                            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                        </label>
                                    )}
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Footer fixed */}
                <div className="p-4 md:p-6 border-t border-slate-100 bg-white z-10 shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] pb-[calc(1rem+env(safe-area-inset-bottom))] md:pb-6">
                    <div className="flex items-center justify-between gap-4 md:gap-6">
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">最高预估总价</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-lg md:text-xl font-bold text-indigo-600">¥</span>
                                <span className="text-3xl md:text-4xl font-black font-mono text-indigo-600 tracking-tighter">{totalPrice.toLocaleString()}</span>
                            </div>
                        </div>
                        
                        <button 
                            type="submit" 
                            form="recycleForm"
                            disabled={loading}
                            className="flex-1 max-w-[200px] md:max-w-xs py-3.5 md:py-4 bg-slate-900 hover:bg-indigo-600 text-white font-black text-sm md:text-base rounded-2xl shadow-lg shadow-slate-900/20 transition-all disabled:opacity-50 active:scale-[0.98]"
                        >
                            {loading ? '正在提交...' : '提交估价申请'}
                        </button>
                    </div>
                </div>

                {/* Search Modal Overlay */}
                {modalCategory && (
                    <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="p-6 pb-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                            <div>
                                <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                                    搜索 {modalCategory.label}
                                </h2>
                                <p className="text-xs text-slate-500 font-medium mt-1">请输入产品的具体型号关键词</p>
                            </div>
                            <button onClick={() => setModalCategory(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                <X size={20} className="text-slate-500" />
                            </button>
                        </div>
                        
                        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar flex flex-col">
                            <div className="relative shrink-0 mb-4">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input 
                                    ref={modalInputRef}
                                    type="text" 
                                    placeholder={`输入如：${modalCategory.code === 'gpu' ? '4060' : modalCategory.code === 'cpu' ? '13600' : '关键词'}...`}
                                    value={keyword}
                                    onChange={e => handleSearch(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 font-medium text-slate-800 shadow-sm text-lg transition-all"
                                />
                                {searching && <div className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin"></div>}
                            </div>

                            <div className="flex-1 overflow-y-auto">
                                {results.length > 0 ? (
                                    <div className="space-y-2">
                                        {results.map(item => (
                                            <button 
                                                key={item.id}
                                                onClick={() => handleSelectItem(item)}
                                                className="w-full flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl hover:border-indigo-300 hover:shadow-md transition-all text-left group active:scale-[0.99]"
                                            >
                                                <div className="flex-1 min-w-0 pr-4">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md uppercase tracking-wider">{item.categoryLabel}</span>
                                                        {item.validity === 'expired' && <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100">价格供参考</span>}
                                                    </div>
                                                    <h3 className="font-bold text-slate-800 text-base md:text-lg truncate group-hover:text-indigo-600 transition-colors">{item.model}</h3>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">预估回收价</div>
                                                    <div className="text-xl md:text-2xl font-black font-mono text-indigo-600 drop-shadow-sm">¥{item.recyclePrice}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ) : keyword ? (
                                    !searching && (
                                        <div className="py-16 text-center flex flex-col items-center justify-center">
                                            <AlertCircle size={48} className="text-slate-300 mb-4" />
                                            <h3 className="text-slate-600 font-black text-lg mb-2">未找到匹配的型号估价</h3>
                                            <p className="text-sm text-slate-500 mb-8 max-w-xs">系统数据库可能暂未收录该型号，或输入的关键词有误。您可以尝试更简短的关键词，或选择人工辅助估价。</p>
                                            <button onClick={handleManualSubmit} className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20 active:scale-[0.98]">
                                                选择此类型，走人工估价
                                            </button>
                                        </div>
                                    )
                                ) : (
                                    <div className="py-20 text-center flex flex-col items-center justify-center">
                                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 ring-8 ring-white shadow-inner">
                                            <Search size={32} className="text-slate-300" />
                                        </div>
                                        <h3 className="text-slate-600 font-bold mb-2">搜索想要回收的具体型号</h3>
                                        <p className="text-xs text-slate-400">输入核心关键词，如显卡只需输入 4060、3070 等</p>
                                        
                                        <button onClick={handleManualSubmit} className="mt-12 text-sm font-bold text-indigo-600 hover:text-indigo-700 flex items-center justify-center gap-1 mx-auto bg-indigo-50 px-4 py-2 rounded-full transition-colors">
                                            搜不到？直接走人工估价通道 <ChevronRight size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
