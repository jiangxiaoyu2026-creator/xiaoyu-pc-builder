import { useState } from 'react';
import { X, CheckCircle2, Camera } from 'lucide-react';
import { UserItem } from '../../types/adminTypes';
import { storage } from '../../services/storage';

interface RecycleModalProps {
    onClose: () => void;
    onSuccess: () => void;
    currentUser: UserItem;
    showToast: (msg: string) => void;
}

export default function RecycleModal({ onClose, onSuccess, currentUser, showToast }: RecycleModalProps) {
    const [description, setDescription] = useState('');
    const [wechat, setWechat] = useState('');
    const [image, setImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!description.trim()) {
            showToast('请填写回收物品描述');
            return;
        }
        if (!wechat.trim()) {
            showToast('请填写微信号');
            return;
        }

        setLoading(true);

        // Save to storage with simplified structure
        const recycleRequest = {
            id: `recycle_${Date.now()}`,
            userId: currentUser.id,
            userName: currentUser.username,
            description: description.trim(),
            wechat: wechat.trim(),
            image: image || '',
            status: 'pending' as const,
            isRead: false,
            createdAt: new Date().toISOString()
        };

        storage.addRecycleRequest(recycleRequest);

        setTimeout(() => {
            setLoading(false);
            setSuccess(true);
        }, 800);
    };

    if (success) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-2xl w-full max-w-sm p-8 text-center animate-scale-up">
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500">
                        <CheckCircle2 size={48} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">提交成功</h2>
                    <p className="text-slate-500 mb-8">
                        我们会尽快通过微信联系您
                    </p>
                    <button
                        onClick={() => { onClose(); onSuccess(); }}
                        className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors"
                    >
                        知道了
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-scale-up overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">我要回收</h2>
                        <p className="text-xs text-slate-500">告诉我们您想回收什么，我们会联系您</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Description */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            回收物品描述 <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            placeholder="请描述您要回收的物品，例如：整机一台，i5-12400 + RTX 3060，16G内存，用了一年..."
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 h-28 resize-none text-sm"
                            required
                        />
                    </div>

                    {/* Image Upload */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            上传图片 <span className="text-slate-400 font-normal">(配置单/产品图)</span>
                        </label>
                        {image ? (
                            <div className="relative w-full h-40 rounded-xl overflow-hidden border border-slate-200 group">
                                <img src={image} alt="preview" className="w-full h-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => setImage(null)}
                                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ) : (
                            <label className="flex flex-col items-center justify-center w-full h-32 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer">
                                <Camera size={28} className="text-slate-400 mb-2" />
                                <span className="text-sm text-slate-500 font-medium">点击上传图片</span>
                                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                            </label>
                        )}
                    </div>

                    {/* WeChat */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            微信号 <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            placeholder="请输入您的微信号，方便我们联系您"
                            value={wechat}
                            onChange={e => setWechat(e.target.value)}
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 text-sm"
                            required
                        />
                    </div>

                    {/* Submit */}
                    <div className="pt-2 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors border border-slate-200"
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50"
                        >
                            {loading ? '提交中...' : '提交'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
