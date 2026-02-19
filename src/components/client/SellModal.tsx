import { useState, useEffect } from 'react';
import { X, Plus, ExternalLink, AlertTriangle, Tags } from 'lucide-react'; // Added Tags
import { UsedItem, UserItem, UsedCategory, UsedCondition } from '../../types/adminTypes';
import { storage } from '../../services/storage';
// Removed useAuth as we will pass user via props for consistency with existing code
// If useAuth is globally available we could use it, but let's stick to props if provided.

interface SellModalProps {
    onClose: () => void;
    onSuccess: () => void;
    currentUser: UserItem;
    showToast: (msg: string) => void;
    initialData?: UsedItem; // Added
}

const CONDITIONS: UsedCondition[] = ['全新/仅拆封', '99新 (准新)', '95新 (轻微使用)', '9成新 (明显使用)', '8成新 (伊拉克)', '功能机 (配件)'];
const CATEGORIES: { id: UsedCategory, label: string }[] = [
    { id: 'gpu', label: '显卡' },
    { id: 'host', label: '整机' },
    { id: 'accessory', label: '周边/配件' },
];

export default function SellModal({ onClose, onSuccess, currentUser, showToast, initialData }: SellModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<Partial<UsedItem>>({
        category: 'gpu',
        condition: '95新 (轻微使用)',
        brand: '',
        model: '',
        price: undefined,
        originalPrice: undefined,
        description: '',
        images: [],
        xianyuLink: '',
        contact: ''
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                category: initialData.category,
                condition: initialData.condition,
                brand: initialData.brand,
                model: initialData.model,
                price: initialData.price,
                originalPrice: initialData.originalPrice,
                description: initialData.description,
                images: initialData.images,
                xianyuLink: initialData.xianyuLink,
                contact: initialData.contact
            });
        }
    }, [initialData]);


    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (loading) return;

            setLoading(true);
            try {
                const res = await storage.uploadImage(file);
                if (res) {
                    setFormData(prev => ({
                        ...prev,
                        images: [...(prev.images || []), res.url]
                    }));
                } else {
                    showToast('图片上传失败，请重试');
                }
            } catch (error) {
                console.error('Upload error:', error);
                showToast('图片上传出错');
            } finally {
                setLoading(false);
            }
        }
    };

    const removeImage = (index: number) => {
        setFormData(prev => ({
            ...prev,
            images: prev.images?.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (!formData.brand || !formData.model || !formData.price || !formData.description) {
            showToast('请填写所有必填项');
            setLoading(false);
            return;
        }

        if (!formData.xianyuLink) {
            showToast('请输入闲鱼链接');
            setLoading(false);
            return;
        }

        const newItem: UsedItem = {
            id: `used_${Date.now()}`,
            type: 'personal', // Personal Used Item
            sellerId: currentUser.id,
            sellerName: currentUser.username,
            category: formData.category!,
            brand: formData.brand,
            model: formData.model,
            price: Number(formData.price),
            originalPrice: formData.originalPrice ? Number(formData.originalPrice) : undefined,
            condition: formData.condition as UsedCondition,
            images: formData.images || [],
            description: formData.description,
            status: 'pending', // Needs approval
            createdAt: Date.now(),
            xianyuLink: formData.xianyuLink,
            contact: formData.contact
        };

        storage.addUsedItem(newItem);

        setTimeout(() => {
            setLoading(false);
            showToast('发布成功！等待管理员审核。');
            onSuccess();
            onClose();
        }, 1000);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-up">
                <div className="p-4 border-b border-orange-100 flex justify-between items-center sticky top-0 bg-white/80 backdrop-blur-md z-10">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                            <Tags size={18} />
                        </div>
                        {initialData ? '编辑闲置' : '发布闲置'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={24} className="text-slate-400" />
                    </button>
                </div>

                {/* 免责提示 */}
                <div className="mx-6 mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3">
                    <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800">
                        <p className="font-bold mb-1">个人闲置交易指南</p>
                        <p>个人物品由用户自行发布，交易通过闲鱼进行。平台仅提供信息展示，不承担交易风险，请仔细甄别。</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* 闲鱼链接 - 重要必填项 */}
                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
                        <label className="block text-sm font-bold text-orange-700 mb-2 flex items-center gap-2">
                            <ExternalLink size={16} />
                            闲鱼宝贝链接 <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            placeholder="在此粘贴闲鱼分享口令或链接，例如：https://m.tb.cn/..."
                            value={formData.xianyuLink || ''}
                            onChange={e => setFormData({ ...formData, xianyuLink: e.target.value })}
                            className="w-full p-3 bg-white border border-orange-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 h-24 resize-none"
                            required
                        />
                        <p className="text-xs text-orange-600 mt-2">请直接从闲鱼APP复制分享内容。</p>
                    </div>

                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">硬件分类</label>
                            <select
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value as UsedCategory })}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
                            >
                                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">成色</label>
                            <select
                                value={formData.condition}
                                onChange={e => setFormData({ ...formData, condition: e.target.value as UsedCondition })}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
                            >
                                {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">品牌</label>
                            <input
                                type="text"
                                placeholder="例如: 华硕 (ASUS)"
                                value={formData.brand || ''}
                                onChange={e => setFormData({ ...formData, brand: e.target.value })}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">型号</label>
                            <input
                                type="text"
                                placeholder="例如: RTX 3070 TUF"
                                value={formData.model || ''}
                                onChange={e => setFormData({ ...formData, model: e.target.value })}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                required
                            />
                        </div>
                    </div>

                    {/* Price */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">期望价格 (¥)</label>
                            <input
                                type="number"
                                placeholder="0.00"
                                value={formData.price || ''}
                                onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono font-bold text-lg text-red-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">原价 (选填)</label>
                            <input
                                type="number"
                                placeholder="0.00"
                                value={formData.originalPrice || ''}
                                onChange={e => setFormData({ ...formData, originalPrice: Number(e.target.value) })}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">详细描述</label>
                        <textarea
                            placeholder="描述使用时间、来源、维修情况、包装配件等..."
                            value={formData.description || ''}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 h-32 resize-none"
                            required
                        ></textarea>
                    </div>

                    {/* Images */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">上传图片 (最多9张)</label>
                        <div className="grid grid-cols-4 gap-4">
                            {formData.images?.map((img, idx) => (
                                <div key={idx} className="aspect-square rounded-xl overflow-hidden relative group border border-slate-200">
                                    <img src={img} alt={`preview ${idx}`} className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => removeImage(idx)}
                                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                            {(formData.images?.length || 0) < 9 && (
                                <label className="aspect-square rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:text-indigo-500 hover:border-indigo-500 hover:bg-indigo-50 transition-colors cursor-pointer">
                                    <Plus size={24} />
                                    <span className="text-xs mt-1 font-bold">添加图片</span>
                                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                </label>
                            )}
                        </div>
                    </div>



                    {/* Submit */}
                    <div className="pt-4 flex gap-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors"
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-lg shadow-amber-500/30 transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? '提交中...' : '提交审核'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
