
import { X, Crown, MonitorPlay, Recycle, BarChart3, Clock } from 'lucide-react';

export function StreamerPermissionWall() {
    return (
        <div className="fixed inset-0 z-[100] bg-[#0a0a0c]/50 backdrop-blur-[6px] flex items-center justify-center pb-10 px-4">
            <div className="bg-[#0e0f13] p-8 rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.8),0_0_40px_rgba(212,175,55,0.1)] border border-[#362e1c] w-full max-w-xl transform scale-100 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#211a0c] via-[#d4af37] to-[#211a0c]"></div>
                
                {/* Close Button */}
                <button 
                    onClick={() => window.location.href = '/'}
                    className="absolute top-5 right-5 text-[#8a7f6c] hover:text-white bg-[#1a1c23] hover:bg-rose-500/80 p-2 rounded-full transition-colors z-20 shadow-sm"
                    title="返回首页"
                >
                    <X size={18} strokeWidth={2.5} />
                </button>

                {/* Header */}
                <div className="text-center mb-8 relative pb-6 border-b border-[#2b2518]">
                    <div className="mx-auto w-16 h-16 mb-4 rounded-2xl bg-gradient-to-b from-[#1f1a10] to-[#0e0c08] flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] border border-[#40351f] relative overflow-hidden">
                        <Crown className="text-[#d4af37] filter drop-shadow-[0_0_8px_rgba(212,175,55,0.5)]" size={32} strokeWidth={1.5} />
                    </div>
                    <h3 className="text-3xl font-black text-white mb-3 tracking-tight flex items-center justify-center">
                        <span className="text-transparent bg-clip-text bg-gradient-to-b from-[#fce29f] to-[#b38b22]">商家专业版</span> <span className="text-[10px] bg-gradient-to-r from-[#d4af37] to-[#a3801c] text-[#0e0f13] px-2 py-0.5 rounded-sm align-top ml-2 font-black uppercase tracking-widest shadow-sm">PRO</span>
                    </h3>
                    <p className="text-[#968973] text-[13px] font-medium mt-3 leading-relaxed max-w-sm mx-auto">
                        极尽偷懒的商机获取方案，彻底释放您每天查价格、做报价、改清单的人工时间。
                    </p>
                </div>

                {/* Four Large Icons - Professional Stacked Layout */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                    <div className="flex items-center gap-4 bg-gradient-to-b from-[#1c1913] to-[#12100c] p-5 rounded-xl border border-[#302a1d] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-[#d4af37]/50 transition-all group">
                        <div className="bg-[#2a2416] text-[#cda434] p-3 rounded-xl border border-[#403520] group-hover:bg-[#d4af37] group-hover:text-[#0e0f13] transition-colors duration-300">
                            <MonitorPlay size={22} strokeWidth={2} />
                        </div>
                        <div className="font-bold text-[#e0d6c8] text-sm tracking-wide">快速直播装机报价</div>
                    </div>
                    
                    <div className="flex items-center gap-4 bg-gradient-to-b from-[#1c1913] to-[#12100c] p-5 rounded-xl border border-[#302a1d] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-[#d4af37]/50 transition-all group">
                        <div className="bg-[#2a2416] text-[#cda434] p-3 rounded-xl border border-[#403520] group-hover:bg-[#d4af37] group-hover:text-[#0e0f13] transition-colors duration-300">
                            <Recycle size={22} strokeWidth={2} />
                        </div>
                        <div className="font-bold text-[#e0d6c8] text-sm tracking-wide">二手回收快速报价</div>
                    </div>
                    
                    <div className="flex items-center gap-4 bg-gradient-to-b from-[#1c1913] to-[#12100c] p-5 rounded-xl border border-[#302a1d] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-[#d4af37]/50 transition-all group">
                        <div className="bg-[#2a2416] text-[#cda434] p-3 rounded-xl border border-[#403520] group-hover:bg-[#d4af37] group-hover:text-[#0e0f13] transition-colors duration-300">
                            <BarChart3 size={22} strokeWidth={2} />
                        </div>
                        <div className="font-bold text-[#e0d6c8] text-sm tracking-wide">专业行情分析</div>
                    </div>
                    
                    <div className="flex items-center gap-4 bg-gradient-to-b from-[#1c1913] to-[#12100c] p-5 rounded-xl border border-[#302a1d] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-[#d4af37]/50 transition-all group">
                        <div className="bg-[#2a2416] text-[#cda434] p-3 rounded-xl border border-[#403520] group-hover:bg-[#d4af37] group-hover:text-[#0e0f13] transition-colors duration-300">
                            <Clock size={22} strokeWidth={2} />
                        </div>
                        <div className="font-bold text-[#e0d6c8] text-sm tracking-wide">每日价格及时更新</div>
                    </div>
                </div>

                {/* Pricing and Action - 3 Tiers */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                    {/* Monthly */}
                    <div className="bg-[#14151a] rounded-xl py-5 px-2 border border-[#2b2518] text-center flex flex-col justify-center items-center hover:bg-[#1a1c23] transition-colors relative">
                        <div className="text-[11px] text-[#8a7f6c] font-bold tracking-widest mb-1.5 break-words max-w-[80px]">标准月度</div>
                        <div className="text-[#d8d0c3] font-black font-mono flex items-baseline justify-center">
                            <span className="text-xs text-[#736856] mr-0.5">¥</span><span className="text-xl">99</span>
                        </div>
                    </div>

                    {/* Half-Year */}
                    <div className="bg-[#14151a] rounded-xl py-5 px-2 border border-[#2b2518] text-center flex flex-col justify-center items-center hover:bg-[#1a1c23] transition-colors relative">
                        <div className="text-[11px] text-[#8a7f6c] font-bold tracking-widest mb-1.5 break-words max-w-[80px]">超值半年</div>
                        <div className="text-[#d8d0c3] font-black font-mono flex items-baseline justify-center">
                            <span className="text-xs text-[#736856] mr-0.5">¥</span><span className="text-xl">299</span>
                        </div>
                        <div className="text-[9px] text-[#6b6151] mt-1 font-medium">合 49.8/月</div>
                    </div>
                    
                    {/* Yearly - High End */}
                    <div className="bg-[#1a150c] rounded-xl py-5 px-2 border border-[#d4af37]/60 text-center flex flex-col justify-center items-center shadow-[0_0_25px_rgba(212,175,55,0.15)] relative overflow-hidden transform hover:-translate-y-1 transition-transform">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-[#d4af37] to-[#7a5c11] blur-2xl opacity-30 relative z-0"></div>
                        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#8f6d19] via-[#d4af37] to-[#8f6d19]"></div>
                        <div className="text-[11px] text-[#d4af37] font-black tracking-widest mb-1.5 relative z-10 break-words max-w-[80px]">旗舰首选</div>
                        <div className="text-white font-black font-mono flex items-baseline justify-center relative z-10">
                            <span className="text-xs text-[#8f6d19] mr-0.5">¥</span><span className="text-xl text-transparent bg-clip-text bg-gradient-to-b from-[#ffedba] to-[#d4af37]">499</span>
                        </div>
                        <div className="text-[9px] text-[#9c844a] mt-1 font-bold relative z-10">
                            合算每日 1.3元
                        </div>
                    </div>
                </div>

                <div className="mt-8 text-center border-t border-[#2b2518] pt-6 relative">
                    <div className="text-[10px] text-[#8a7f6c] font-bold mb-3 uppercase tracking-[0.2em] relative inline-block px-4 bg-[#0e0f13] -mt-10 mb-5">业务直通专线 / 专属客服</div>
                    <div className="block mt-2">
                        <div className="inline-flex items-center justify-center bg-gradient-to-b from-[#1c1a17] to-[#12110e] text-[#d4af37] px-8 py-3 rounded-lg font-black font-mono text-xl tracking-widest border border-[#40351f] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_4px_10px_rgba(0,0,0,0.5)] cursor-pointer hover:bg-gradient-to-b hover:from-[#26221d] hover:to-[#1a1713] transition-all">
                            151-6506-6053
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
