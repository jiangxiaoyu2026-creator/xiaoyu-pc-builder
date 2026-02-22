import React, { useState, useRef } from 'react';
import { X, Upload, Image as ImageIcon, Send, Loader2, FileText } from 'lucide-react';
import { storage } from '../../services/storage';
import { ConfigTemplate } from '../../types/clientTypes';

interface ShowcaseModalProps {
    config: ConfigTemplate;
    onClose: () => void;
    onSuccess: () => void;
    showToast: (msg: string) => void;
}

export default function ShowcaseModal({ config, onClose, onSuccess, showToast }: ShowcaseModalProps) {
    const [images, setImages] = useState<string[]>(config.showcaseImages || []);
    const [message, setMessage] = useState(config.showcaseMessage || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        if (images.length + files.length > 9) {
            showToast('最多只能上传9张图片');
            return;
        }

        setIsUploading(true);
        try {
            const uploadPromises = files.map(file => storage.uploadImage(file));
            const results = await Promise.all(uploadPromises);

            const newUrls = results
                .filter(res => res !== null)
                .map(res => res!.url);

            if (newUrls.length > 0) {
                setImages(prev => [...prev, ...newUrls]);
                if (newUrls.length < files.length) {
                    showToast(`成功上传 ${newUrls.length} 张，失败 ${files.length - newUrls.length} 张`);
                }
            } else {
                showToast('上传失败，请稍后重试');
            }
        } catch (error) {
            console.error('Image upload failed:', error);
            showToast('图片上传发生错误');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleRemoveImage = (indexToRemove: number) => {
        setImages(images.filter((_, idx) => idx !== indexToRemove));
    };

    const handleSubmit = async () => {
        if (images.length === 0) {
            showToast('请至少上传一张实机照片');
            return;
        }

        setIsSubmitting(true);
        try {
            await storage.submitShowcase(config.id, images, message);
            onSuccess();
        } catch (error) {
            console.error('Submit showcase failed:', error);
            showToast('提交失败，请重试');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-scale-up border border-white/20">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white relative z-10">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <span>📸</span> 提交实机晒单
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
                    <div className="mb-6">
                        <div className="text-sm font-bold text-slate-700 mb-2">配置方案</div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-sm text-slate-600 truncate">
                            {config.title}
                        </div>
                    </div>

                    {/* Image Upload Area */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                                <ImageIcon size={16} className="text-indigo-500" />
                                实机照片 <span className="text-red-500">*</span>
                            </label>
                            <span className="text-xs text-slate-400">{images.length}/9</span>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            {images.map((img, idx) => (
                                <div key={idx} className="aspect-square rounded-xl border border-slate-200 overflow-hidden relative group">
                                    <img src={img} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
                                    <button
                                        onClick={() => handleRemoveImage(idx)}
                                        className="absolute top-1 right-1 bg-black/50 hover:bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}

                            {images.length < 9 && (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading || isSubmitting}
                                    className="aspect-square rounded-xl border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 bg-slate-50 flex flex-col items-center justify-center text-slate-400 hover:text-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isUploading ? (
                                        <Loader2 size={24} className="animate-spin text-indigo-500" />
                                    ) : (
                                        <>
                                            <Upload size={24} className="mb-2" />
                                            <span className="text-xs font-medium">上传图片</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageUpload}
                            multiple
                            accept="image/*"
                            className="hidden"
                        />
                        <p className="text-[10px] text-slate-400 mt-2">支持 JPG, PNG 格式，最多上传9张实机靓照。</p>
                    </div>

                    {/* Message Area */}
                    <div className="mb-2">
                        <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5 mb-2">
                            <FileText size={16} className="text-indigo-500" />
                            心得体会
                        </label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="分享一下你的装机体验、性能测试结果或者是理线心得吧..."
                            className="w-full h-32 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                            maxLength={500}
                        />
                        <div className="text-right text-[10px] text-slate-400 mt-1">
                            {message.length}/500
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-6 py-2.5 rounded-xl font-bold text-sm text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-all disabled:opacity-50"
                    >
                        取消
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || images.length === 0}
                        className="px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 transition-all flex items-center gap-2 shadow-sm"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                提交审核中...
                            </>
                        ) : (
                            <>
                                <Send size={16} />
                                提交审核
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
