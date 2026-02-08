import { Zap, Heart, Sparkles, Globe, Award } from 'lucide-react';
import { useState, useEffect } from 'react';
import { storage } from '../../services/storage';
import { AboutUsConfig } from '../../types/adminTypes';

const ICON_MAP: Record<string, any> = { Zap, Heart, Sparkles };

export default function AboutUs() {
    const [config, setConfig] = useState<AboutUsConfig>(() => storage.getAboutUsConfig());

    useEffect(() => {
        const handleUpdate = () => {
            setConfig(storage.getAboutUsConfig());
        };
        window.addEventListener('xiaoyu-aboutus-update', handleUpdate);
        return () => window.removeEventListener('xiaoyu-aboutus-update', handleUpdate);
    }, []);

    return (
        <div className="max-w-6xl mx-auto px-4 py-20 space-y-24">
            {/* Hero Section */}
            <header className="text-center space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 text-white text-[10px] font-bold tracking-[0.2em] uppercase">
                    <Sparkles size={12} className="text-indigo-400" />
                    <span>Our Philosophy</span>
                </div>
                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 leading-tight">
                    装机不是零件的堆砌，<br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">而是对生活品质的追求。</span>
                </h1>
                <p className="text-xl text-slate-500 max-w-2xl mx-auto font-medium">
                    小鱼装机（Xiaoyu DIY）致力于通过 AI 驱动的算法，为每一位追求卓越的用户打造独一无二的数字化生产力。
                </p>
            </header>

            {/* Core Values - Gallery Style */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {config.topCards.map((card, idx) => {
                    const Icon = ICON_MAP[card.icon || 'Zap'] || Zap;
                    const colors = [
                        'bg-indigo-50 text-indigo-600',
                        'bg-rose-50 text-rose-600',
                        'bg-sky-50 text-sky-600'
                    ];
                    return (
                        <div key={idx} className="group p-8 bg-white rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${colors[idx % colors.length]}`}>
                                <Icon size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">{card.title}</h3>
                            <p className="text-slate-500 leading-relaxed text-sm">
                                {card.description}
                            </p>
                        </div>
                    );
                })}
            </section>

            {/* Brand Story - Immersive Row */}
            <section className="relative p-12 md:p-20 bg-slate-900 rounded-[48px] overflow-hidden text-white">
                <div className="absolute top-0 right-0 w-1/2 h-full opacity-20 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-radial from-indigo-500 to-transparent blur-3xl"></div>
                </div>
                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div className="space-y-6">
                        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">我们的故事</h2>
                        <div className="space-y-4">
                            <p className="text-xl text-indigo-400 font-bold">15 年装机生涯，初心未改。</p>
                            <p className="text-lg text-slate-400 leading-relaxed">
                                从 2011 年的第一台电脑组装至今，我们见证了硬件行业的数次变革。小鱼装机不仅积累了深厚的行业经验，更建立了一套透明、高效的评价体系。我们将“懂电脑”这件事，从门槛变成了每一位用户的常识。
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-8 pt-6">
                            <div className="space-y-1">
                                <div className="text-3xl font-mono font-bold text-white">50,000+</div>
                                <div className="text-xs text-slate-500 font-bold uppercase tracking-widest">精品装机案例</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-3xl font-mono font-bold text-white">10m+</div>
                                <div className="text-xs text-slate-500 font-bold uppercase tracking-widest">AI 模拟计算</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-3xl font-mono font-bold text-white">99.9%</div>
                                <div className="text-xs text-slate-500 font-bold uppercase tracking-widest">用户好评率</div>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {config.brandImages.map((img, idx) => (
                            <div key={idx} className={`aspect-square bg-white/5 rounded-3xl border border-white/10 overflow-hidden relative group hover:bg-white/10 transition-all cursor-default ${idx === 1 ? 'mt-8' : ''}`}>
                                {img.url ? (
                                    <img src={img.url} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" alt={img.title} />
                                ) : (
                                    <div className="flex flex-col justify-end p-6 h-full gap-2">
                                        {idx === 0 ? <Award className="text-amber-400 mb-2 group-hover:scale-110 transition-transform" size={32} /> : <Globe className="text-sky-400 mb-2 group-hover:scale-110 transition-transform" size={32} />}
                                    </div>
                                )}
                                <div className="absolute inset-0 p-6 flex flex-col justify-end bg-gradient-to-t from-slate-950/80 to-transparent">
                                    <span className="text-sm font-bold">{img.title}</span>
                                    <span className="text-[10px] text-slate-400 font-medium">{img.desc}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer Tagline */}
            <footer className="text-center py-20 border-t border-slate-100">
                <div className="text-sm font-bold text-slate-400 mb-2 uppercase tracking-[0.3em]">Ready to Build?</div>
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-8">开启您的次世代装机体验</h2>
                <div className="flex flex-col items-center gap-4">
                    <button
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        className="group relative px-12 py-4 bg-slate-900 text-white font-bold rounded-full transition-all shadow-xl hover:shadow-2xl active:scale-95 overflow-hidden"
                    >
                        <span className="relative z-10">立即定制您的专属主机</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </button>
                    <p className="text-slate-400 text-sm font-medium">15年行业底蕴，只为您的那一份极致享受</p>
                </div>
            </footer>
        </div>
    );
}
