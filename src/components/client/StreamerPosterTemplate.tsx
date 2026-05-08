import React from 'react';
import { Monitor } from 'lucide-react';
import { BuildEntry } from '../../types/clientTypes';
import { CATEGORY_MAP } from '../../data/clientData';
import { getIconByCategory } from './Shared';

export const StreamerPosterTemplate = React.forwardRef<HTMLDivElement, { 
    validPosterItems: BuildEntry[], 
    pricingStrategy: any, 
    pricing: any 
}>(({ validPosterItems, pricingStrategy, pricing }, ref) => {
    return (
        <div style={{ position: 'fixed', top: -9999, left: -9999, zIndex: -9999 }}>
            <div ref={ref} className="bg-white text-slate-900 w-[600px] rounded-xl overflow-hidden font-sans border border-slate-200 shadow-xl relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/60 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-50/60 rounded-full blur-3xl pointer-events-none"></div>
                <div className="flex items-center gap-4 px-8 py-8 border-b border-indigo-50/50 relative z-10 bg-gradient-to-r from-white to-slate-50">
                    <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-900/20">
                        <Monitor size={28} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">小鱼高端定制方案</h2>
                        <p className="text-indigo-600 font-bold opacity-80 uppercase tracking-widest text-[10px] mt-1">XIAOYU PC BUILDER</p>
                    </div>
                </div>
                <div className="px-8 py-6 flex flex-col gap-4 relative z-10">
                    {validPosterItems.map(row => {
                        const name = row.item ? `${row.item.brand} ${row.item.model}` : row.customName;
                        const prc = row.customPrice ?? (row.item?.price ?? 0);
                        return (
                            <div key={row.id} className="flex items-center gap-4 py-2 border-b border-slate-100 last:border-0 last:pb-0">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm relative overflow-hidden ${row.item ? 'bg-indigo-50 text-indigo-500 border border-indigo-100' : 'bg-slate-50 text-slate-400 border border-slate-200'}`}>
                                    {row.item?.image ? (
                                        <img src={row.item.image} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        getIconByCategory(row.category)
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                                        {CATEGORY_MAP[row.category]}
                                        {row.quantity > 1 ? ` × ${row.quantity}` : ''}
                                    </div>
                                    <div className="text-[14px] font-bold text-slate-800 leading-relaxed pb-1 truncate">
                                        {name}
                                    </div>
                                </div>
                                <div className="text-right pl-4">
                                    <div className="font-mono text-lg font-black text-slate-900 leading-relaxed pb-1">¥{(prc * (row.quantity || 1)).toLocaleString()}</div>
                                </div>
                            </div>
                        )
                    })}
                </div>
                <div className="bg-slate-900 p-8 flex items-end justify-between relative z-10">
                    <div className="flex flex-col gap-1 text-white/50 text-[10px] uppercase font-bold tracking-widest">
                        <p>Powered by</p>
                        <p className="text-white/80">小鱼装机平台智能引擎</p>
                        <p className="text-white/40 text-[9px] mt-0.5 whitespace-nowrap tracking-wider">含 {((pricingStrategy?.serviceFeeRate || 0) * 100).toFixed(0)}% 装机售后服务费</p>
                        <p className="mt-2 font-mono">{new Date().toLocaleDateString('zh-CN')} 生成</p>
                    </div>
                    <div className="text-right">
                        <p className="text-white/50 text-xs font-bold mb-1">整机预算预估</p>
                        <div className="flex items-baseline gap-1 text-white">
                            <span className="text-2xl font-bold">¥</span>
                            <span className="text-5xl font-black font-mono tracking-tighter">{Math.floor(pricing.finalPrice).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});
