import sys

def rewrite_sidebar():
    with open('/Users/mac/new/src/components/client/VisualBuilder.tsx', 'r') as f:
        lines = f.readlines()
        
    start_idx = -1
    end_idx = -1
    
    for i in range(len(lines)):
        if 'className="w-full lg:w-80 shrink-0 space-y-6"' in lines[i]:
            start_idx = i
            break
            
    if start_idx == -1:
        print("Could not find start index")
        return
        
    stack = 0
    for i in range(start_idx, len(lines)):
        if '<div' in lines[i]:
            stack += lines[i].count('<div')
        if '</div' in lines[i]:
            stack -= lines[i].count('</div')
            
        if stack == 0:
            end_idx = i
            break

    if end_idx == -1:
        print("Could not find end index")
        return

    replacement = """            {/* Merged Sidebar */}
            <div className="w-full lg:w-[380px] shrink-0">
                <div className="bg-white/90 backdrop-blur-2xl rounded-[32px] border border-white/60 shadow-2xl shadow-indigo-100/50 flex flex-col relative overflow-hidden">
                    {/* Decorative Background Effects */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

                    <div className="p-6 md:p-8 flex flex-col gap-8 relative z-10">
                        {/* Box 1: AI & Quick Build */}
                        <div className="flex flex-col gap-5">
                            {/* Prominent AI Button */}
                            <div onClick={() => {
                                if (onAiCheck && !onAiCheck()) return;
                                setShowAiModal(true);
                            }} className="hidden lg:block group relative w-full cursor-pointer transition-all hover:-translate-y-1">
                                {/* Glowing Backdrop - Softer */}
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 rounded-3xl blur opacity-15 group-hover:opacity-30 transition duration-500"></div>

                                {/* Main Card */}
                                <div className="relative flex items-center gap-4 bg-white/90 backdrop-blur-sm rounded-[22px] p-5 border border-indigo-100/80 shadow-lg shadow-indigo-100/50 overflow-hidden">
                                    {/* Light High-tech Background Grid */}
                                    <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:20px_20px] [mask-image:radial-gradient(ellipse_at_center,black_70%,transparent_100%)] pointer-events-none"></div>

                                    {/* Icon Container */}
                                    <div className="relative z-10 w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-200 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                                        <Sparkles size={24} className="drop-shadow-sm animate-pulse-slow" />
                                    </div>

                                    {/* Text Content */}
                                    <div className="relative z-10 flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-extrabold text-lg text-slate-900 tracking-tight">AI 智能装机</h3>
                                            <span className="text-[10px] font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-1.5 py-0.5 rounded shadow-sm shadow-indigo-200">体验版</span>
                                        </div>
                                        <p className="text-slate-500 text-xs font-medium group-hover:text-indigo-600 transition-colors leading-relaxed">
                                            智能语义分析，一键生成配置
                                        </p>
                                    </div>

                                    {/* Arrow Action */}
                                    <div className="relative z-10 w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-600 transition-all duration-300 transform group-hover:translate-x-1 shadow-sm">
                                        <ArrowRight size={14} className="text-indigo-600 group-hover:text-white" />
                                    </div>
                                </div>
                            </div>
                            
                            {/* Quick Build */}
                            <div onClick={onOpenLibrary} className="hidden lg:flex bg-slate-50/80 hover:bg-indigo-50/50 rounded-[20px] p-4 border border-slate-100 cursor-pointer group hover:border-indigo-200 transition-all items-center gap-4">
                                <div className="w-10 h-10 bg-white shadow-sm text-indigo-500 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110">
                                    <FileText size={18} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-extrabold text-slate-800 text-[15px]">快速装机</h3>
                                        <ArrowRight className="text-slate-300 group-hover:text-indigo-500 transition-colors" size={16} />
                                    </div>
                                    <p className="text-slate-500 text-xs mt-0.5 font-medium">浏览精选配置，一键引用。</p>
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>

                        {/* Box 2: Price Details */}
                        <div>
                            <h3 className="font-extrabold text-slate-800 mb-5 flex items-center gap-2"><CreditCard size={18} className="text-indigo-500" /> 价格明细</h3>
                            <div className="space-y-4 mb-6">
                                <div className="flex justify-between items-center text-sm font-medium">
                                    <span className="text-slate-500">基础总价 <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-400 ml-1">含6%服务费</span></span>
                                    <span className="font-black text-slate-700">¥{pricing.totalHardware}</span>
                                </div>    
                                {pricing.savedAmount > 0 && (<div className="flex justify-between text-emerald-600 font-bold text-sm bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100/50"><span>已优惠</span><span>- ¥{pricing.savedAmount}</span></div>)}
                                <div className="flex justify-between items-end bg-slate-50 rounded-2xl border border-slate-100 p-4 shadow-inner">
                                    <span className="text-slate-600 font-extrabold text-sm mb-1">预估到手价</span>
                                    <span className="text-4xl font-black text-indigo-600 tracking-tight">¥{pricing.finalPrice}</span>
                                </div>
                            </div>

                            <div className="relative mb-6 group">
                                <select
                                    value={pricing.discountRate}
                                    onChange={(e) => pricing.onDiscountChange?.(parseFloat(e.target.value))}
                                    className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all cursor-pointer hover:border-indigo-300"
                                >
                                    {pricing.discountTiers?.map((tier: any) => (
                                        <option key={tier.id} value={tier.multiplier}>
                                            {tier.name.replace(/\s*\\(.*?\\)/g, '')}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-indigo-500 transition-colors" size={18} />
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-2">
                                <button onClick={onShare} className="py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl shadow-[0_8px_16px_-6px_rgba(79,70,229,0.5)] hover:shadow-[0_12px_20px_-8px_rgba(79,70,229,0.6)] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 tap-active">
                                    <Share2 size={16} /> 分享配置
                                </button>
                                <button onClick={onSave} className="py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl shadow-[0_8px_16px_-6px_rgba(15,23,42,0.4)] hover:shadow-[0_12px_20px_-8px_rgba(15,23,42,0.5)] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 tap-active">
                                    <FileText size={16} /> 保存方案
                                </button>
                                <button onClick={onReset} className="col-span-2 py-3 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-red-500 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 tap-active group">
                                    <X size={16} className="group-hover:rotate-90 transition-transform" /> 重新配置
                                </button>
                            </div>
                        </div>

                        {/* Sys Announcements */}
                        {sysAnnouncement && sysAnnouncement.enabled && (sysAnnouncement.content || (sysAnnouncement.items && sysAnnouncement.items.length > 0)) && (
                            <>
                                <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent hidden md:block"></div>
                                <div className="hidden md:block">
                                    <h3 className="font-extrabold text-slate-800 mb-4 flex items-center gap-2"><FileText size={18} className="text-indigo-500" /> 系统公告</h3>
                                    <div className="space-y-3">
                                        {sysAnnouncement.items && sysAnnouncement.items.length > 0 ? (
                                            sysAnnouncement.items.map((item: any) => (
                                                <div key={item.id} className={`w-full border rounded-xl p-3 text-sm font-medium leading-relaxed flex gap-3 ${item.type === 'warning' ? 'bg-red-50/80 text-red-900 border-red-100' :
                                                    item.type === 'promo' ? 'bg-amber-50/80 text-amber-900 border-amber-100' :
                                                        'bg-indigo-50/50 text-indigo-900 border-indigo-100'
                                                    }`}>
                                                    <div className="shrink-0 mt-0.5">
                                                        {item.pinned && <span className="mr-1 text-indigo-600">📌</span>}
                                                        {item.type === 'warning' ? '⚠️' : item.type === 'promo' ? '🎉' : '📢'}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="whitespace-pre-wrap text-[13px] text-slate-700">{item.content}</div>
                                                        {item.linkUrl && (
                                                            <a href={item.linkUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:text-indigo-800 mt-1.5 inline-block font-bold">
                                                                查看详情 &rarr;
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-[13px] text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">
                                                {sysAnnouncement.content || '暂无公告'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                        
                        {/* System Health */}
                        <>
                            <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>
                            <div className={`rounded-2xl p-4 border transition-colors ${health.status === 'perfect' ? 'bg-emerald-50/50 border-emerald-100/60' : 'bg-amber-50/50 border-amber-200/60'}`}>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                                        系统健康状态
                                    </h3>
                                    {health.status === 'perfect' ? <CheckCircle2 size={18} className="text-emerald-500" /> : <AlertCircle size={18} className="text-amber-500 animate-pulse" />}
                                </div>
                                {health.status === 'perfect' ? (
                                    <div className="text-[13px] text-emerald-700 font-bold flex items-center gap-2 bg-emerald-100/50 px-3 py-2 rounded-lg">
                                        <Sparkles size={14} className="text-emerald-500" /> 配置完美兼容，未发现问题
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {health.issues.map((issue: string, idx: number) => (
                                            <div key={idx} className="text-xs text-amber-800 font-bold bg-amber-100/50 p-2.5 rounded-lg flex gap-2">
                                                <div className="shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full bg-amber-400"></div>
                                                <div className="leading-snug">{issue}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    </div>
                </div>
            </div>\n"""

    new_lines = lines[:start_idx] + [replacement] + lines[end_idx+1:]
    
    with open('/Users/mac/new/src/components/client/VisualBuilder.tsx', 'w') as f:
        f.writelines(new_lines)

    print("Success")

if __name__ == "__main__":
    rewrite_sidebar()
