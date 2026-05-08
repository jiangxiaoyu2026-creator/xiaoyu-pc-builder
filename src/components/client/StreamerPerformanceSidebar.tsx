import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate as fmAnimate } from 'framer-motion';
import { Activity, Zap, Gamepad2, RefreshCw } from 'lucide-react';
import { BuildEntry, HardwareItem } from '../../types/clientTypes';
import { ThemeContext } from './StreamerThemeContext';
import { Resolution } from '../../data/gameFpsData';

// Bouncy number animation component
export const BouncyNumber = ({ value, className }: { value: number; className?: string }) => {
    const count = useMotionValue(0);
    const rounded = useTransform(count, (latest) => Math.round(latest));

    useEffect(() => {
        const controls = fmAnimate(count, value, {
            type: 'spring',
            stiffness: 100,
            damping: 15,
            restDelta: 0.5
        });
        return controls.stop;
    }, [value, count]);

    return <motion.span className={className}>{rounded}</motion.span>;
};

export function StreamerPerformanceSidebar({ buildList }: { buildList: BuildEntry[] }) {
    const { theme } = React.useContext(ThemeContext);
    
    // === Performance Sidebar State ===
    const [simResult, setSimResult] = useState<{
        totalLuScore: number;
        totalPowerDraw: number;
        recommendedPower: number;
        isValid: boolean;
        errors: string[];
        warnings: string[];
    } | null>(null);
    const [fpsData, setFpsData] = useState<any[]>([]);
    const [sidebarResolution, setSidebarResolution] = useState<number>(1080);
    const [loadingFps, setLoadingFps] = useState(false);

    // Get item IDs string for effect dependency to avoid unnecessary calls
    const itemIds = buildList
        .filter(b => b.item && !b.customName)
        .map(b => b.item!.id);
    const itemIdsKey = itemIds.join(',');

    // Simulator: validate build for Lu Master score & power
    useEffect(() => {
        if (itemIds.length === 0) { setSimResult(null); return; }

        import('../../services/api').then(({ ApiService }) => {
            ApiService.post('/simulator/validate', { item_ids: itemIds })
                .then((data: any) => {
                    setSimResult({
                        totalLuScore: data.total_lu_score,
                        totalPowerDraw: data.total_power_draw,
                        recommendedPower: data.recommended_power,
                        isValid: data.is_valid,
                        errors: data.errors || [],
                        warnings: data.warnings || [],
                    });
                })
                .catch(console.error);
        });
    }, [itemIdsKey]);

    const cpuItem = buildList.find(b => b.category === 'cpu')?.item;
    const gpuItem = buildList.find(b => b.category === 'gpu')?.item;
    const cpuItemId = cpuItem?.id || '';
    const gpuItemId = gpuItem?.id || '';

    // Simulator: FPS estimation using lazy loaded gamesFpsData
    useEffect(() => {
        if (!cpuItem && !gpuItem) { 
            import('../../data/gameFpsData').then(({ gamesList }) => {
                setFpsData(gamesList.slice(0, 12).map((gameName: string) => ({ name: gameName, fps: 0 })));
            });
            setLoadingFps(false);
            return; 
        }

        setLoadingFps(true);
        const resMap: Record<number, Resolution> = { 1080: '1080p', 1440: '1440p', 2160: '4K' };
        const resKey = resMap[sidebarResolution] || '1080p';

        import('../../data/gameFpsData').then(({ gamesFpsData }) => {
            // Match CPU/GPU model names to keys in gamesFpsData
            const findKey = (item: HardwareItem | null | undefined, type: 'cpu' | 'gpu') => {
                if (!item) return null;
                const modelStr = `${item.brand} ${item.model}`.toUpperCase().replace(/[^A-Z0-9]/g, '');
                const modelOnly = item.model.toUpperCase().replace(/[^A-Z0-9]/g, '');
                
                for (const game of Object.keys(gamesFpsData)) {
                    const entries = Object.keys(gamesFpsData[game][type] || {});
                    for (const key of entries) {
                        const cleanKey = key.toUpperCase().replace(/[^A-Z0-9]/g, '');
                        if (modelStr.includes(cleanKey) || cleanKey.includes(modelStr) || modelOnly.includes(cleanKey) || cleanKey.includes(modelOnly)) {
                            return key;
                        }
                    }
                }
                
                if (type === 'cpu') {
                    const match = item.model.toUpperCase().match(/\d{4,5}[A-Z]{0,3}/);
                    if (match) {
                        const identifier = match[0];
                        for (const game of Object.keys(gamesFpsData)) {
                            const entries = Object.keys(gamesFpsData[game][type] || {});
                            for (const key of entries) {
                                if (key.toUpperCase().includes(identifier)) return key;
                            }
                        }
                        const numMatch = identifier.match(/\d+/);
                        if (numMatch) {
                            for (const game of Object.keys(gamesFpsData)) {
                                const entries = Object.keys(gamesFpsData[game][type] || {});
                                for (const key of entries) {
                                    if (key.toUpperCase().includes(numMatch[0])) return key;
                                }
                            }
                        }
                    }
                }
                
                if (type === 'gpu') {
                    const numMatch = item.model.match(/\d{4}/);
                    if (numMatch) {
                        const num = numMatch[0];
                        const isTi = /TI/i.test(item.model);
                        const isSuper = /SUPER/i.test(item.model);
                        const isXTX = /XTX/i.test(item.model);
                        const isXT = /XT\b/i.test(item.model) && !isXTX;
                        const isGRE = /GRE/i.test(item.model);
                        
                        for (const game of Object.keys(gamesFpsData)) {
                            const entries = Object.keys(gamesFpsData[game][type] || {});
                            for (const key of entries) {
                                const upperKey = key.toUpperCase();
                                if (upperKey.includes(num)) {
                                    const keyTi = /TI/i.test(upperKey);
                                    const keySuper = /SUPER/i.test(upperKey);
                                    const keyXTX = /XTX/i.test(upperKey);
                                    const keyXT = /XT\b/i.test(upperKey) && !keyXTX;
                                    const keyGRE = /GRE/i.test(upperKey);
                                    
                                    if (isTi === keyTi && isSuper === keySuper && isXTX === keyXTX && isXT === keyXT && isGRE === keyGRE) {
                                        return key;
                                    }
                                }
                            }
                        }
                        for (const game of Object.keys(gamesFpsData)) {
                            const entries = Object.keys(gamesFpsData[game][type] || {});
                            for (const key of entries) {
                                if (key.toUpperCase().includes(num)) return key;
                            }
                        }
                    }
                }
                
                return null;
            };

            const cpuKey = findKey(cpuItem, 'cpu');
            const gpuKey = findKey(gpuItem, 'gpu');

            const results: { name: string; fps: number; lowFps?: number }[] = [];
            const preferredGames = [
                "黑神话：悟空", "赛博朋克 2077", "绝地求生", "无畏契约", "反恐精英 2", 
                "英雄联盟", "Apex 英雄", "荒野大镖客：救赎 2", "三角洲行动", "刀塔 2", 
                "侠盗猎车手 5", "艾尔登法环", "守望先锋 2", "使命召唤：战区 2.0", "我的世界", 
                "魔兽世界", "逃离塔科夫", "彩虹六号：围攻", "堡垒之夜", "命运 2", 
                "腐蚀", "火箭联盟"
            ];
            
            for (const gameName of preferredGames) {
                const gd = gamesFpsData[gameName];
                if (!gd) continue;
                const cData = cpuKey ? gd.cpu[cpuKey]?.[resKey] : null;
                const gData = gpuKey ? gd.gpu[gpuKey]?.[resKey] : null;
                if (cData && gData) {
                    results.push({ name: gameName, fps: Math.min(cData.avg, gData.avg), lowFps: Math.min(cData.low, gData.low) });
                } else if (gData) {
                    results.push({ name: gameName, fps: gData.avg, lowFps: gData.low });
                } else if (cData) {
                    results.push({ name: gameName, fps: cData.avg, lowFps: cData.low });
                }
            }

            setFpsData(results.slice(0, 12));
            setLoadingFps(false);
        });
    }, [cpuItemId, gpuItemId, sidebarResolution]);

    return (
        <div className="hidden xl:flex flex-col gap-4 w-[280px] shrink-0 border-l border-slate-200 dark:border-slate-700/80 p-4 bg-slate-50/50 dark:bg-slate-800/20 xl:sticky xl:top-0 xl:max-h-screen overflow-y-auto hide-scrollbar">

            {/* Module 1: 鲁大师跑分 */}
            <div className={`bg-white dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 shadow-sm rounded-2xl p-4 relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-600 transition-colors flex justify-between items-center`}>
                <div className={`absolute right-0 top-0 w-32 h-32 ${theme.bgPrimary} opacity-5 dark:opacity-10 rounded-full blur-3xl pointer-events-none translate-x-1/2 -translate-y-1/2 group-hover:opacity-10 dark:group-hover:opacity-20 transition-all duration-500`}></div>
                <div className={`absolute -right-4 -bottom-4 opacity-5 ${theme.primary} group-hover:scale-110 group-hover:opacity-10 transition-all duration-500 delay-75`}><Activity size={48} strokeWidth={1.5}/></div>
                <div className="relative z-10">
                    <h4 className="text-[12px] font-extrabold text-slate-500 dark:text-slate-400 mb-0.5 flex items-center gap-1.5"><Activity size={14} className={theme.primary}/> 综合性能跑分</h4>
                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${theme.bgPrimary} inline-block animate-pulse`}></span>
                        基于鲁大师评测
                    </div>
                </div>
                <div className={`text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r ${theme.gradient} font-display tracking-tighter relative z-10`}>
                    {simResult && simResult.totalLuScore > 0 ? <BouncyNumber value={simResult.totalLuScore} /> : '---'}
                </div>
            </div>

            {/* Module 2: 整机功耗 */}
            <div className="bg-white dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 shadow-sm rounded-2xl p-4 relative overflow-hidden group hover:border-amber-300 dark:hover:border-amber-500/50 transition-colors flex justify-between items-center">
                <div className="absolute left-0 bottom-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 translate-y-1/2 group-hover:bg-amber-500/20 transition-all duration-500"></div>
                <div className="absolute -right-2 -bottom-2 opacity-5 text-amber-500 group-hover:scale-110 group-hover:opacity-10 transition-all duration-500 delay-75"><Zap size={48} strokeWidth={1.5}/></div>
                <div className="relative z-10">
                    <h4 className="text-[12px] font-extrabold text-slate-500 dark:text-slate-400 mb-0.5 flex items-center gap-1.5"><Zap size={14} className="text-amber-500"/> 系统峰值功耗</h4>
                    {simResult && simResult.totalPowerDraw > 0 ? (
                        <div className="text-[9px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1">
                            推荐电源 {Math.ceil(simResult.totalPowerDraw * 1.3 / 50) * 50}W+
                        </div>
                    ) : (
                        <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 inline-block"></span>
                            完善配置后可见
                        </div>
                    )}
                </div>
                <div className="text-2xl font-black text-slate-800 dark:text-slate-200 font-display tracking-tighter flex items-baseline relative z-10">
                    {simResult && simResult.totalPowerDraw > 0 ? <><BouncyNumber value={simResult.totalPowerDraw} /><span className="text-sm ml-0.5 text-slate-500 font-bold">W</span></> : '---'}
                </div>
            </div>

            {/* Module 3: 游戏帧率 */}
            <div className={`bg-white dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 shadow-sm rounded-2xl p-5 relative overflow-hidden flex-1 flex flex-col group hover:border-slate-300 dark:hover:border-slate-600 transition-colors`}>
                <div className={`absolute right-0 top-0 w-48 h-48 ${theme.bgPrimary} opacity-5 dark:opacity-10 rounded-full blur-3xl pointer-events-none translate-x-1/2 -translate-y-1/2 group-hover:opacity-10 dark:group-hover:opacity-20 transition-all duration-500`}></div>
                <div className="flex items-center justify-between mb-4 relative z-10">
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-[13px] flex items-center gap-1.5 tracking-wide">
                        <Gamepad2 size={16} className={theme.primary} />
                        游戏FPS
                    </h3>
                    <div className="flex gap-0.5 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                        {[1080, 1440, 2160].map(res => (
                            <button
                                key={res}
                                onClick={() => setSidebarResolution(res)}
                                className={`text-[9px] font-black px-2.5 py-1 rounded-md transition-all uppercase tracking-wider ${sidebarResolution === res ? `${theme.bgPrimary} text-white shadow-sm scale-105` : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700/50'}`}
                            >
                                {res === 1080 ? '1080P' : res === 1440 ? '2K' : '4K'}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="space-y-3.5 relative z-10 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                    {loadingFps ? (
                        <div className={`py-8 flex flex-col items-center justify-center ${theme.primary} gap-3 h-full`}>
                            <RefreshCw size={24} className="animate-spin opacity-80" />
                            <div className="text-[10px] font-black tracking-widest uppercase opacity-80">AI 性能分析中...</div>
                        </div>
                    ) : fpsData.length > 0 ? (
                        fpsData.slice(0, 12).map((item, idx) => (
                            <div key={idx} className="group/item">
                                <div className="flex justify-between items-end text-[11px] mb-1.5">
                                    <span className="font-bold text-slate-700 dark:text-slate-300 group-hover/item:text-slate-900 dark:group-hover/item:text-white transition-colors flex items-center gap-1.5 flex-1 min-w-0 pr-2">
                                        <img src={`/images/games/icons/${item.name}.png`} alt="" className="w-4 h-4 rounded-[4px] object-cover bg-slate-100 dark:bg-slate-800 shadow-sm shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                        <span className="truncate">{item.name}</span>
                                    </span>
                                    <div className="flex items-baseline gap-2 justify-end shrink-0">
                                        {item.lowFps ? (
                                            <span className="flex items-baseline gap-0.5 text-slate-400 w-10 justify-end">
                                                <span className="text-[9px] uppercase font-bold tracking-wider opacity-80">Low</span>
                                                <span className="font-mono text-xs font-bold">{item.lowFps}</span>
                                            </span>
                                        ) : <span className="w-10"></span>}
                                        <div className="flex items-baseline gap-0.5 ml-1 w-14 justify-end">
                                            <span className={`font-display font-black text-sm ${
                                                item.fps === 0 ? 'text-slate-400 dark:text-slate-500' :
                                                item.fps >= 200 ? 'text-emerald-500 dark:text-emerald-400' : 
                                                item.fps >= 100 ? 'text-blue-500 dark:text-blue-400' :
                                                item.fps >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                                                'text-red-500 dark:text-red-400'
                                            }`}>{item.fps}</span>
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">FPS</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden border border-slate-200/50 dark:border-slate-700/50 relative">
                                    <div
                                        className={`h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden ${
                                            item.fps === 0 ? 'bg-slate-300 dark:bg-slate-600' :
                                            item.fps >= 200 ? 'bg-emerald-500' : 
                                            item.fps >= 100 ? 'bg-blue-500' :
                                            item.fps >= 60 ? 'bg-yellow-500' :
                                            'bg-red-500'
                                        }`}
                                        style={{ width: `${Math.min(100, (item.fps / 240) * 100)}%` }}
                                    >
                                        {item.fps > 0 && <div className="absolute top-0 bottom-0 left-0 right-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 animate-[shimmer_2s_infinite]"></div>}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-8 flex flex-col items-center justify-center text-slate-500 gap-3 opacity-60 h-full">
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700"><Gamepad2 size={24} className="text-slate-400" /></div>
                            <div className="text-[10px] font-black text-slate-400 mt-1 tracking-wide">添加 CPU/显卡 后展示帧率</div>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}
