import { useState } from 'react';
import { X, CheckCircle2, XCircle, Image as ImageIcon, Loader2 } from 'lucide-react';
import { storage } from '../../services/storage';
import { ConfigItem } from '../../types/adminTypes';

interface ShowcaseAuditModalProps {
    config: ConfigItem;
    onClose: () => void;
    onSuccess: () => void;
    showToast: (msg: string) => void;
}

export default function ShowcaseAuditModal({ config, onClose, onSuccess, showToast }: ShowcaseAuditModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    const images = config.showcaseImages || [];

    const handleAudit = async (status: 'approved' | 'rejected') => {
        setIsSubmitting(true);
        try {
            await storage.auditShowcase(config.id, status);
            onSuccess();
        } catch (error) {
            console.error('Audit showcase failed:', error);
            showToast('审核失败，请重试');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            {/* Image Lightbox */}
            {previewImage && (
                <div
                    className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4 animate-fade-in cursor-zoom-out"
                    onClick={() => setPreviewImage(null)}
                >
                    <img
                        src={previewImage}
                        alt="Preview"
                        className="max-w-full max-h-full object-contain cursor-default"
                        onClick={e => e.stopPropagation()}
                    />
                    <button
                        className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors p-2"
                        onClick={() => setPreviewImage(null)}
                    >
                        <X size={32} />
                    </button>
                </div>
            )}

            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-scale-up border border-white/20">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white relative z-10">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <span>🛡️</span> 晒单审核
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
                        disabled={isSubmitting}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
                    {/* Config Info */}
                    <div className="mb-6 grid grid-cols-2 gap-4">
                        <div>
                            <div className="text-xs font-bold text-slate-400 uppercase mb-1">查阅配置</div>
                            <div className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg truncate border border-indigo-100">
                                {config.title}
                            </div>
                        </div>
                        <div>
                            <div className="text-xs font-bold text-slate-400 uppercase mb-1">提交用户</div>
                            <div className="text-sm font-medium text-slate-700 bg-slate-50 px-3 py-2 rounded-lg truncate border border-slate-200">
                                {config.authorName} (ID: {config.userId})
                            </div>
                        </div>
                    </div>

                    {/* Images */}
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-3">
                            <ImageIcon size={18} className="text-indigo-500" />
                            <h3 className="text-base font-bold text-slate-800">实机图片 ({images.length})</h3>
                        </div>
                        {images.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {images.map((img, idx) => (
                                    <div
                                        key={idx}
                                        className="aspect-square rounded-xl border border-slate-200 overflow-hidden cursor-zoom-in hover:opacity-90 transition-opacity hover:shadow-md hover:border-indigo-300"
                                        onClick={() => setPreviewImage(img)}
                                    >
                                        <img src={img} alt={`Showcase ${idx + 1}`} className="w-full h-full object-cover" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                                用户未上传图片（异常数据）
                            </div>
                        )}
                    </div>

                    {/* Message */}
                    <div>
                        <h3 className="text-base font-bold text-slate-800 mb-3">心得体会</h3>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm text-slate-700 leading-relaxed min-h-[100px] whitespace-pre-wrap">
                            {config.showcaseMessage || <span className="text-slate-400 italic">用户未填写心得</span>}
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center gap-4">
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-6 py-2.5 rounded-xl font-bold text-sm text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition-all disabled:opacity-50"
                    >
                        暂不处理
                    </button>
                    <div className="flex gap-3">
                        <button
                            onClick={() => handleAudit('rejected')}
                            disabled={isSubmitting}
                            className="px-6 py-2.5 rounded-xl font-bold text-sm text-red-600 bg-white border border-red-200 hover:bg-red-50 hover:border-red-300 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 transition-all flex items-center gap-2"
                        >
                            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                            拒绝
                        </button>
                        <button
                            onClick={() => handleAudit('approved')}
                            disabled={isSubmitting}
                            className="px-8 py-2.5 rounded-xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200 disabled:bg-slate-300 disabled:shadow-none transition-all flex items-center gap-2"
                        >
                            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                            审核通过
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
