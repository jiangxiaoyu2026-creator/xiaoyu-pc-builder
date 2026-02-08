import { useState } from 'react';
import { X, Plus, ExternalLink, AlertTriangle } from 'lucide-react';
import { UsedItem, UserItem, UsedCategory, UsedCondition } from '../../types/adminTypes';
import { storage } from '../../services/storage';

interface SellModalProps {
    onClose: () => void;
    onSuccess: () => void;
    currentUser: UserItem;
    showToast: (msg: string) => void;
}

const CONDITIONS: UsedCondition[] = ['全新', '99新', '95新', '9成新', '8成新', '较旧'];
const CATEGORIES: { id: UsedCategory, label: string }[] = [
    { id: 'gpu', label: '显卡' },
    { id: 'host', label: '主机/整机' },
    { id: 'accessory', label: '其他配件' },
];

export default function SellModal({ onClose, onSuccess, currentUser, showToast }: SellModalProps) {
    const [formData, setFormData] = useState<Partial<UsedItem>>({
        category: 'gpu',
        condition: '95新',
        images: [],
        type: 'personal', // 个人闲置
        xianyuLink: ''
    });
    const [loading, setLoading] = useState(false);


    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({
                    ...prev,
                    images: [...(prev.images || []), reader.result as string]
                }));
            };
            reader.readAsDataURL(file);
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
            showToast('请填写完整信息');
            setLoading(false);
            return;
        }

        if (!formData.xianyuLink) {
            showToast('请填写闲鱼链接');
            setLoading(false);
            return;
        }

        const newItem: UsedItem = {
            id: `used_${Date.now()}`,
            type: 'personal', // 个人闲置
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
            showToast('发布成功！请等待管理员审核');
            onSuccess();
            onClose();
        }, 1000);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-up">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">发布个人闲置</h2>
                        <p className="text-xs text-slate-500">提交后需经管理员审核才可上架</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                {/* 免责提示 */}
                <div className="mx-6 mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3">
                    <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800">
                        <p className="font-bold mb-1">个人闲置交易说明</p>
                        <p>个人闲置商品由用户自行发布，平台仅提供展示服务。交易将通过闲鱼平台完成，请买卖双方自行核实商品信息，平台不承担担保责任。</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* 闲鱼链接 - 重要必填项 */}
                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
                        <label className="block text-sm font-bold text-orange-700 mb-2 flex items-center gap-2">
                            <ExternalLink size={16} />
                            闲鱼商品链接 <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            placeholder="直接粘贴闲鱼分享内容，例如：【闲鱼】https://m.tb.cn/... 点击链接直接打开"
                            value={formData.xianyuLink || ''}
                            onChange={e => setFormData({ ...formData, xianyuLink: e.target.value })}
                            className="w-full p-3 bg-white border border-orange-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 h-24 resize-none"
                            required
                        />
                        <p className="text-xs text-orange-600 mt-2">直接从闲鱼APP复制分享内容粘贴到这里即可</p>
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
                                placeholder="例如：ASUS 华硕"
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
                                placeholder="例如：RTX 3070 TUF"
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
                            <label className="block text-sm font-bold text-slate-700 mb-2">期望售价 (¥)</label>
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
                            <label className="block text-sm font-bold text-slate-700 mb-2">入手原价 (选填)</label>
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
                            placeholder="请描述硬件的使用时间、购买来源、是否有拆修、包装配件是否齐全等..."
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
