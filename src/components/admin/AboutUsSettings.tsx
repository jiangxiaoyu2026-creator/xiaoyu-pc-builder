
import { useState } from 'react';
import { Save, Image as ImageIcon, Sparkles, Heart, Zap, Plus, Trash2 } from 'lucide-react';
import { AboutUsConfig, AboutUsCard } from '../../types/adminTypes';
import { storage } from '../../services/storage';

const ICON_MAP: Record<string, any> = { Zap, Heart, Sparkles };

export default function AboutUsSettings() {
    const [config, setConfig] = useState<AboutUsConfig>(() => storage.getAboutUsConfig());
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = () => {
        setIsSaving(true);
        storage.saveAboutUsConfig(config);
        setTimeout(() => {
            setIsSaving(false);
            alert('配置已成功更新并发布到前台。');
        }, 500);
    };

    const updateTopCard = (index: number, field: keyof AboutUsCard, value: string) => {
        const newTopCards = [...config.topCards];
        newTopCards[index] = { ...newTopCards[index], [field]: value };
        setConfig({ ...config, topCards: newTopCards });
    };

    const updateBrandImage = (index: number, field: string, value: string) => {
        const newBrandImages = [...config.brandImages];
        newBrandImages[index] = { ...newBrandImages[index], [field]: value };
        setConfig({ ...config, brandImages: newBrandImages });
    };

    const handleImageUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                updateBrandImage(index, 'url', reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">“关于我们”页面管理</h2>
                    <p className="text-sm text-slate-500">定制前台品牌介绍页面的文案与视觉素材</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-indigo-600 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                >
                    {isSaving ? '正在保存...' : <><Save size={18} /> 保存并发布</>}
                </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Top Cards Configuration */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <Zap size={20} className="text-indigo-600" /> 顶部优势位 (Core Values)
                        </h3>

                        <div className="space-y-8">
                            {config.topCards.map((card, idx) => {
                                const Icon = ICON_MAP[card.icon || 'Zap'] || Zap;
                                return (
                                    <div key={idx} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-indigo-600 shadow-sm border border-slate-100">
                                                <Icon size={24} />
                                            </div>
                                            <input
                                                type="text"
                                                value={card.title}
                                                onChange={(e) => updateTopCard(idx, 'title', e.target.value)}
                                                className="flex-1 bg-transparent border-none text-lg font-bold text-slate-800 focus:ring-0 placeholder:text-slate-300"
                                                placeholder="卡片标题"
                                            />
                                        </div>
                                        <textarea
                                            value={card.description}
                                            onChange={(e) => updateTopCard(idx, 'description', e.target.value)}
                                            rows={2}
                                            className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm text-slate-600 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                            placeholder="简短的描述文案..."
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Brand Images Configuration */}
                <div className="space-y-6">
                    <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <ImageIcon size={20} className="text-amber-500" /> 品牌展示图 (Awards/Stats)
                        </h3>

                        <div className="space-y-12">
                            {config.brandImages.map((img, idx) => (
                                <div key={idx} className="space-y-4">
                                    <div className="relative aspect-square bg-slate-100 rounded-3xl overflow-hidden group border-2 border-dashed border-slate-200 hover:border-indigo-400 transition-colors">
                                        {img.url ? (
                                            <>
                                                <img src={img.url} className="w-full h-full object-cover" alt="品牌图" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                    <label className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white cursor-pointer hover:bg-white/40 transition-all">
                                                        <ImageIcon size={24} />
                                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(idx, e)} />
                                                    </label>
                                                    <button
                                                        onClick={() => updateBrandImage(idx, 'url', '')}
                                                        className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-red-500/60 transition-all"
                                                    >
                                                        <Trash2 size={24} />
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <label className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:text-indigo-500 transition-colors">
                                                <Plus size={48} className="mb-2" />
                                                <span className="text-xs font-bold uppercase tracking-wider">上传展示图片</span>
                                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(idx, e)} />
                                            </label>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <input
                                            type="text"
                                            value={img.title}
                                            onChange={(e) => updateBrandImage(idx, 'title', e.target.value)}
                                            className="w-full bg-slate-50 border-none px-3 py-2 rounded-lg text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20"
                                            placeholder="主要标题 (如: 行业奖项)"
                                        />
                                        <input
                                            type="text"
                                            value={img.desc}
                                            onChange={(e) => updateBrandImage(idx, 'desc', e.target.value)}
                                            className="w-full bg-slate-50 border-none px-3 py-2 rounded-lg text-xs text-slate-500 focus:ring-2 focus:ring-indigo-500/20"
                                            placeholder="辅助说明 (如: 连续三年蝉联)"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
