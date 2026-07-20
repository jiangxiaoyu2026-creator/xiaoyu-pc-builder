import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate as fmAnimate } from 'framer-motion';
import { Activity, Zap, Gamepad2, RefreshCw, ChevronDown } from 'lucide-react';
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

// Rolling price animation for sidebar
function SidebarRollingPrice({ value }: { value: number }) {
    const count = useMotionValue(0);
    const rounded = useTransform(count, (latest) => Math.round(latest));
    useEffect(() => {
        const controls = fmAnimate(count, value, { type: 'spring', stiffness: 80, damping: 20, restDelta: 0.5 });
        return controls.stop;
    }, [value, count]);
    return <motion.span>{rounded}</motion.span>;
}

const GAME_OFFICIAL_IMAGE_PATHS: Record<string, string> = {
    'Apex 英雄': '/data/howmanyfps/2026-06-26/official-images/12-apex-legends-steam_library_hero.jpg',
    '使命召唤：战区 2.0': '/data/howmanyfps/2026-06-26/official-images/09-call-of-duty-warzone-20-steam_library_hero.jpg',
    '侠盗猎车手 5': '/data/howmanyfps/2026-06-26/official-images/03-grand-theft-auto-v-steam_library_hero.jpg',
    '刀塔 2': '/data/howmanyfps/2026-06-26/official-images/07-dota-2-steam_library_hero.jpg',
    '反恐精英 2': '/data/howmanyfps/2026-06-26/official-images/05-counter-strike-2-steam_library_hero.jpg',
    '命运 2': '/data/howmanyfps/2026-06-26/official-images/16-destiny-2-steam_library_hero.jpg',
    '堡垒之夜': '/data/howmanyfps/2026-06-26/official-images/01-fortnite-playstation_hero_desktop.webp',
    '守望先锋 2': '/data/howmanyfps/2026-06-26/official-images/08-overwatch-2-steam_library_hero.jpg',
    '彩虹六号：围攻': '/data/howmanyfps/2026-06-26/official-images/11-tom-clancys-rainbow-six-siege-steam_library_hero.jpg',
    '我的世界': '/data/howmanyfps/2026-06-26/official-images/02-minecraft-official_primary.jpg',
    '无畏契约': '/data/howmanyfps/2026-06-26/official-images/06-valorant-official_primary.jpg',
    '英雄联盟': '/data/howmanyfps/2026-06-26/official-images/04-league-of-legends-fallback-cover.png',
    '荒野大镖客：救赎 2': '/data/howmanyfps/2026-06-26/official-images/23-red-dead-redemption-2-steam_library_hero.jpg',
    '赛博朋克 2077': '/data/howmanyfps/2026-06-26/official-images/26-cyberpunk-2077-steam_library_hero.jpg',
    '逃离塔科夫': '/data/howmanyfps/2026-06-26/official-images/13-escape-from-tarkov-fallback-cover.jpg',
    '魔兽世界': '/data/howmanyfps/2026-06-26/official-images/10-world-of-warcraft-official_primary.png',
    '腐蚀': '/data/howmanyfps/2026-06-26/official-images/18-rust-steam_library_hero.jpg',
    '艾尔登法环': '/data/howmanyfps/2026-06-26/official-images/19-elden-ring-steam_library_hero.jpg',
    '火箭联盟': '/data/howmanyfps/2026-06-26/official-images/15-rocket-league-steam_library_hero.jpg',
    '绝地求生': '/data/howmanyfps/2026-06-26/official-images/17-playerunknowns-battlegrounds-steam_library_hero.jpg',
};

const GAME_COVER_NAMES = new Set([
    '黑神话：悟空',
    '守望先锋 2',
    '反恐精英 2',
    '我的世界',
    'Apex 英雄',
    '三角洲行动',
    '绝地求生',
    '赛博朋克 2077',
    '无畏契约',
    '刀塔 2',
    '荒野大镖客：救赎 2',
]);

function getGameImageSources(name: string) {
    const sources = [
        `/images/games/icons/${name}.png`,
        GAME_COVER_NAMES.has(name) ? `/images/games/covers/${name}.jpg` : null,
        GAME_OFFICIAL_IMAGE_PATHS[name] || null,
    ].filter((source): source is string => Boolean(source));
    return Array.from(new Set(sources));
}

function GameFpsIcon({ name, className }: { name: string; className: string }) {
    const [sourceIndex, setSourceIndex] = useState(0);
    const sources = getGameImageSources(name);
    const source = sources[sourceIndex];

    useEffect(() => {
        setSourceIndex(0);
    }, [name]);

    if (!source) {
        return (
            <div className={`${className} flex items-center justify-center bg-slate-800 text-[10px] font-black text-white`}>
                {name.slice(0, 1)}
            </div>
        );
    }

    return (
        <img
            src={source}
            alt={name}
            className={className}
            onError={() => setSourceIndex(index => index + 1)}
        />
    );
}

export interface SidebarPricingProps {
    pricing: { standardPrice: number; finalPrice: number; savedAmount: number };
    discountRate: number;
    setDiscountRate: (rate: number) => void;
    strategies: { value: number; label: string }[];
    serviceFeeRate: number;
    clearBuild: () => void;
    handleSave: () => void;
    handleGeneratePoster: () => void;
    isGeneratingPoster: boolean;
    handleShareTrigger: () => void;
    isSharing: boolean;
}

export function StreamerPerformanceSidebar({ buildList, pricingProps }: { buildList: BuildEntry[], pricingProps?: SidebarPricingProps }) {
    const { theme, isLiveMode, liveStyle, liveStyleConfig } = React.useContext(ThemeContext);
    const isPixelLiveStyle = liveStyle.startsWith('pixel') && liveStyle !== 'pixel';
    const isMarioLiveStyle = liveStyle === 'pixel';
    const isLightLiveStyle = liveStyleConfig.surface === 'light';
    const liveControlBg = isPixelLiveStyle ? `${liveStyleConfig.panelBg} ${liveStyleConfig.stampBorder} shadow-[2px_2px_0_#050505]` : isLightLiveStyle ? 'bg-white/55 border-slate-950/10' : 'bg-white/[0.06] border-white/10';
    const liveControlHover = isPixelLiveStyle ? 'hover:brightness-110' : isLightLiveStyle ? 'hover:bg-white/75' : 'hover:bg-white/[0.1]';
    const fpsTrackBg = isPixelLiveStyle ? `${liveStyleConfig.panelBg} ${liveStyleConfig.stampBorder}` : isLightLiveStyle ? 'bg-slate-950/12 border-slate-950/10' : 'bg-white/12 border-white/10';
    const activeResolutionText = isPixelLiveStyle ? 'text-gray-950' : isLightLiveStyle ? 'text-white' : 'text-gray-950';
    const optionClassName = isLightLiveStyle ? 'bg-white text-slate-950' : 'bg-gray-900 text-white';
    const placeholderBoxClassName = isPixelLiveStyle ? `${liveStyleConfig.panelBg} ${liveStyleConfig.stampBorder} shadow-[3px_3px_0_#050505]` : isLightLiveStyle ? 'bg-white border-slate-200' : 'bg-white/[0.06] border-white/12';
    const placeholderDashClassName = isLightLiveStyle ? 'border-slate-200 opacity-45' : 'border-white/15 opacity-60';
    const placeholderTitleTextClassName = isLightLiveStyle ? 'text-slate-500' : 'text-slate-200';
    const placeholderMainTextClassName = isLightLiveStyle ? 'text-slate-600' : 'text-slate-100';
    const placeholderAccentTextClassName = isLightLiveStyle ? 'text-slate-400' : 'text-slate-300';
    
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
    const [resolutionFxKey, setResolutionFxKey] = useState(0);
    const [discountFxKey, setDiscountFxKey] = useState(0);
    const [loadingFps, setLoadingFps] = useState(false);

    const changeSidebarResolution = (resolution: number) => {
        setSidebarResolution(resolution);
        setResolutionFxKey(key => key + 1);
    };

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
                setFpsData(gamesList.map((gameName: string) => ({ name: gameName, fps: 0 })));
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
                const rawModel = item.model.toUpperCase();
                const modelStr = `${item.brand} ${item.model}`.toUpperCase().replace(/[^A-Z0-9]/g, '');
                const modelOnly = rawModel.replace(/[^A-Z0-9]/g, '');
                const canUseKey = (key: string) => {
                    const upperKey = key.toUpperCase();
                    if (type === 'gpu' && /\b[45]090D\b|RTX\s*[45]090D/.test(rawModel) && !/\b[45]090\s*D\b/.test(upperKey)) return false;
                    if (type === 'cpu' && /13400EF/.test(rawModel) && !/13400EF|13400F/.test(upperKey)) return false;
                    return true;
                };
                
                for (const game of Object.keys(gamesFpsData)) {
                    const entries = Object.keys(gamesFpsData[game][type] || {});
                    for (const key of entries) {
                        const cleanKey = key.toUpperCase().replace(/[^A-Z0-9]/g, '');
                        if (modelStr.includes(cleanKey) || cleanKey.includes(modelStr) || modelOnly.includes(cleanKey) || cleanKey.includes(modelOnly)) {
                            if (canUseKey(key)) return key;
                        }
                    }
                }
                
                if (type === 'cpu') {
                    const match = rawModel.match(/\d{4,5}[A-Z]{0,3}/);
                    if (match) {
                        const identifier = match[0];
                        for (const game of Object.keys(gamesFpsData)) {
                            const entries = Object.keys(gamesFpsData[game][type] || {});
                            for (const key of entries) {
                                if (key.toUpperCase().includes(identifier) && canUseKey(key)) return key;
                            }
                        }
                        const numMatch = identifier.match(/\d+/);
                        if (numMatch) {
                            for (const game of Object.keys(gamesFpsData)) {
                                const entries = Object.keys(gamesFpsData[game][type] || {});
                                for (const key of entries) {
                                    if (key.toUpperCase().includes(numMatch[0]) && canUseKey(key)) return key;
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
                                        if (canUseKey(key)) return key;
                                    }
                                }
                            }
                        }
                        for (const game of Object.keys(gamesFpsData)) {
                            const entries = Object.keys(gamesFpsData[game][type] || {});
                            for (const key of entries) {
                                if (key.toUpperCase().includes(num) && canUseKey(key)) return key;
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
                } else {
                    results.push({ name: gameName, fps: 0 });
                }
            }

            setFpsData(results);
            setLoadingFps(false);
        });
    }, [cpuItemId, gpuItemId, sidebarResolution]);

    const displayFpsData = isLiveMode ? fpsData.slice(0, 10) : fpsData.slice(0, 12);

    const productImages = buildList
        .filter(e => e.item?.image)
        .map(e => ({ src: e.item!.image!, label: e.item!.model }));
    const productImagesKey = productImages.map(image => image.src).join('|');
    const [productImageIndex, setProductImageIndex] = useState(0);

    useEffect(() => {
        setProductImageIndex(0);
    }, [productImagesKey]);

    useEffect(() => {
        if (!isLiveMode || productImages.length <= 1) return;
        const timer = window.setInterval(() => {
            setProductImageIndex(index => (index + 1) % productImages.length);
        }, 3200);
        return () => window.clearInterval(timer);
    }, [isLiveMode, productImages.length, productImagesKey]);

    const activeProductImage = productImages[productImageIndex];

    // Format current time
    const now = new Date();
    const timeString = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    return (
        <div className={`${isLiveMode ? 'flex' : 'hidden xl:flex'} flex-col shrink-0 border-l ${isMarioLiveStyle ? 'live-mario-sidebar' : ''} ${isLiveMode ? `h-full w-[240px] gap-2 p-2 ${liveStyleConfig.sectionBg} ${liveStyleConfig.stampBorder} ${isPixelLiveStyle ? 'border-l-4 shadow-[6px_0_0_#050505]' : 'border-l-2 shadow-2xl'} overflow-hidden` : 'w-[260px] gap-2.5 p-3 border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/20 xl:sticky xl:top-0 xl:max-h-screen overflow-y-auto hide-scrollbar'}`}>

            {/* In Live Mode: Special Layout Order */}
            {isLiveMode ? (
                <>
                    {/* 1. Product Image Stamp */}
                    <div className={`${activeProductImage ? `bg-white ${liveStyleConfig.stampBorder} border-4` : placeholderBoxClassName} ${isPixelLiveStyle ? 'rounded-none' : 'rounded-lg'} p-2 relative shadow-lg overflow-hidden mb-1 flex items-center justify-center min-h-[120px] ${isMarioLiveStyle ? 'live-mario-product-stage' : ''}`}>
                        {/* Stamp inner dashed border */}
                        <div className={`absolute inset-2 border border-dashed ${activeProductImage ? liveStyleConfig.border : placeholderDashClassName} pointer-events-none ${isPixelLiveStyle ? 'rounded-none' : 'rounded-md'} ${activeProductImage ? 'opacity-30' : ''}`}></div>
                        
                        {activeProductImage ? (
                            <motion.img
                                key={activeProductImage.src}
                                src={activeProductImage.src}
                                alt={activeProductImage.label}
                                className="w-full h-full max-h-[105px] object-contain relative z-10"
                                initial={{ opacity: 0, x: 18 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.35 }}
                            />
                        ) : isMarioLiveStyle ? (
                            <div className="live-mario-sidebar-art">
                                <div className="live-mario-sidebar-mascot" aria-hidden="true">
                                    <span className="live-mario-sidebar-coin" />
                                    <img src="/assets/themes/mario-game/pixel-mushroom.svg" alt="" />
                                </div>
                                <div>
                                    <strong>冒险装机站</strong>
                                    <span>选择硬件，开启新关卡</span>
                                </div>
                            </div>
                        ) : (
                            <div className="relative z-10 flex h-full min-h-[96px] w-full flex-col items-center justify-center gap-1 px-3 text-center">
                                <div className={`text-[18px] font-black leading-tight ${placeholderTitleTextClassName} drop-shadow-[0_1px_3px_rgba(148,163,184,0.25)]`}>
                                    欢迎加入粉丝群
                                </div>
                                <div className={`text-[14px] font-black leading-tight ${placeholderMainTextClassName} drop-shadow-[0_1px_3px_rgba(148,163,184,0.25)]`}>
                                    免费使用蒋小鱼装机平台
                                </div>
                                <div className={`flex flex-col gap-0.5 text-[12px] font-black leading-tight ${placeholderAccentTextClassName} drop-shadow-[0_1px_3px_rgba(148,163,184,0.25)]`}>
                                    <span>直播间的各位彦祖</span>
                                    <span>可以关注点赞支持一下</span>
                                </div>
                            </div>
                        )}
                        {productImages.length > 1 && (
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex gap-1">
                                {productImages.map((image, index) => (
                                    <button
                                        key={image.src}
                                        onClick={() => setProductImageIndex(index)}
                                        className={`w-1.5 h-1.5 rounded-full transition-all ${index === productImageIndex ? 'bg-slate-900 w-4' : 'bg-slate-300 hover:bg-slate-500'}`}
                                        title={image.label}
                                    />
                                ))}
                            </div>
                        )}
                        
                        {/* Stamp corner cutouts effect (CSS trick) */}
                        <div className={`absolute -top-3 -left-3 w-6 h-6 ${liveStyleConfig.wrapperBg.split(' ')[0]} rounded-full z-20`}></div>
                        <div className={`absolute -top-3 -right-3 w-6 h-6 ${liveStyleConfig.wrapperBg.split(' ')[0]} rounded-full z-20`}></div>
                        <div className={`absolute -bottom-3 -left-3 w-6 h-6 ${liveStyleConfig.wrapperBg.split(' ')[0]} rounded-full z-20`}></div>
                        <div className={`absolute -bottom-3 -right-3 w-6 h-6 ${liveStyleConfig.wrapperBg.split(' ')[0]} rounded-full z-20`}></div>
                    </div>

                    {/* 2. Score & Power Cards Side-by-Side */}
                    <div className="flex flex-row gap-2 shrink-0">
                        {/* 鲁大师跑分 */}
                        <div className={`flex-1 ${liveStyleConfig.panelBg} border ${liveStyleConfig.border} ${isPixelLiveStyle ? 'rounded-none border-2 shadow-[3px_3px_0_#050505]' : 'shadow-sm rounded-lg'} p-2 relative overflow-hidden group flex flex-col justify-end items-center h-[68px]`}>
                            <div className={`absolute right-0 top-0 w-32 h-32 ${liveStyleConfig.glowBg} opacity-10 rounded-full blur-3xl pointer-events-none translate-x-1/2 -translate-y-1/2`}></div>
                            <div className={`absolute left-2 top-1.5 flex items-center gap-1 text-[10px] font-black ${liveStyleConfig.modelText}`}>
                                <Activity size={12} className={liveStyleConfig.accentText}/>
                                鲁大师跑分
                            </div>
                            <div className="flex items-center gap-1 mb-1 z-10">
                                <span className={`${liveStyleConfig.accentText} text-xl font-black font-display tracking-tighter`}>
                                    {simResult && simResult.totalLuScore > 0 ? <BouncyNumber value={Math.floor(simResult.totalLuScore/10000)} /> : '---'}
                                </span>
                                {simResult && simResult.totalLuScore > 0 && <span className={`text-xs ${liveStyleConfig.accentText} font-bold`}>W+</span>}
                            </div>
                        </div>

                        {/* 整机功耗 */}
                        <div className={`flex-1 ${liveStyleConfig.panelBg} border ${liveStyleConfig.border} ${isPixelLiveStyle ? 'rounded-none border-2 shadow-[3px_3px_0_#050505]' : 'shadow-sm rounded-lg'} p-2 relative overflow-hidden group flex flex-col justify-end items-center h-[68px]`}>
                            <div className="absolute left-0 bottom-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 translate-y-1/2"></div>
                            <div className={`absolute left-2 top-1.5 flex items-center gap-1 text-[10px] font-black ${liveStyleConfig.modelText}`}>
                                <Zap size={12} className={liveStyleConfig.accentText}/>
                                整机功耗
                            </div>
                            <div className="flex items-center gap-1 mb-1 z-10">
                                <span className={`${liveStyleConfig.accentText} text-xl font-black font-display tracking-tighter`}>
                                    {simResult && simResult.totalPowerDraw > 0 ? <BouncyNumber value={simResult.totalPowerDraw} /> : '---'}
                                </span>
                                {simResult && simResult.totalPowerDraw > 0 && <span className={`text-xs ${liveStyleConfig.accentText} font-bold`}>W</span>}
                            </div>
                        </div>
                    </div>

                    {/* 3. FPS single column */}
                        <div className={`${liveStyleConfig.panelBg} border ${liveStyleConfig.border} ${isPixelLiveStyle ? 'rounded-none border-2 shadow-[3px_3px_0_#050505]' : 'shadow-sm rounded-lg'} p-2 relative flex-1 flex flex-col min-h-[330px]`}>
                        <div className="flex items-center justify-between mb-2 relative z-10">
                            <div className={`text-[12px] font-black tracking-widest ${liveStyleConfig.accentText}`}>游戏实测FPS</div>
                            <div className={`grid grid-cols-3 gap-1 w-[122px] ${liveControlBg} border p-0.5 ${isPixelLiveStyle ? 'rounded-none' : 'rounded-lg'} shadow-sm ${isMarioLiveStyle ? 'live-mario-resolution-switch' : ''}`} title="切换分辨率">
                                {[1080, 1440, 2160].map(res => (
                                    <button
                                        key={res}
                                        onClick={() => changeSidebarResolution(res)}
                                        className={`text-[10px] font-black py-1 ${isPixelLiveStyle ? 'rounded-none' : 'rounded-md'} transition-all uppercase tracking-wider ${isMarioLiveStyle ? `live-mario-resolution-button ${sidebarResolution === res ? 'is-active' : ''}` : ''} ${sidebarResolution === res ? `${liveStyleConfig.glowBg} ${activeResolutionText} shadow-sm scale-105` : `${liveStyleConfig.modelText} opacity-75 hover:opacity-100 ${liveControlHover}`}`}
                                    >
                                        {isMarioLiveStyle && sidebarResolution === res && resolutionFxKey > 0 && <span key={resolutionFxKey} className="live-mario-resolution-burst" />}
                                        {res === 1080 ? '1K' : res === 1440 ? '2K' : '4K'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className={`relative z-10 flex-1 overflow-hidden pr-1 space-y-2`}>
                            {loadingFps ? (
                                <div className={`py-8 flex flex-col items-center justify-center text-white/50 gap-3 h-full`}>
                                    <RefreshCw size={24} className="animate-spin opacity-80" />
                                </div>
                            ) : fpsData.length > 0 ? (
                                displayFpsData.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <div className="relative shrink-0">
                                            <GameFpsIcon name={item.name} className={`w-8 h-8 rounded-full object-cover border-2 ${liveStyleConfig.border}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className={`text-[11px] font-black ${liveStyleConfig.modelText} truncate mb-0.5`}>{item.name}</div>
                                            <div className={`w-full ${fpsTrackBg} border ${isPixelLiveStyle ? 'rounded-none h-2' : 'rounded-full h-1.5'} overflow-hidden relative`}>
                                                <div className={`h-full ${isPixelLiveStyle ? 'rounded-none' : 'rounded-full'} transition-all duration-1000 ease-out relative overflow-hidden ${liveStyleConfig.fpsBarColor}`} style={{ width: `${Math.min(100, (item.fps / 240) * 100)}%` }}></div>
                                            </div>
                                        </div>
                                        <div className={`font-display font-black text-sm ${item.fps === 0 ? `${liveStyleConfig.modelText} opacity-70` : liveStyleConfig.modelText} shrink-0 w-[42px] text-right`}>
                                            {item.fps}<span className="text-[9px] ml-0.5">FPS</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-8 flex flex-col items-center justify-center text-gray-600 gap-2 h-full">
                                    <Gamepad2 size={24} />
                                    <span className="text-[10px] font-bold">暂无帧率数据</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 4. Pricing at bottom */}
                    {pricingProps && (
                        <div className={`${liveStyleConfig.panelBg} border ${liveStyleConfig.border} ${isPixelLiveStyle ? 'rounded-none border-2 shadow-[3px_3px_0_#050505]' : 'rounded-lg shadow-sm'} p-2.5 relative mt-auto shrink-0 flex flex-col gap-1.5 ${isMarioLiveStyle ? 'live-mario-pricing-panel' : ''}`}>
                            <div className="flex items-center justify-between gap-2">
                                <div className={`text-[12px] font-black ${liveStyleConfig.modelText}`}>优惠方案</div>
                                <div className={`relative group w-[118px] ${isMarioLiveStyle ? 'live-mario-discount-control' : ''}`}>
                                    <select
                                        value={pricingProps.discountRate}
                                        onChange={(e) => {
                                            pricingProps.setDiscountRate(parseFloat(e.target.value));
                                            setDiscountFxKey(key => key + 1);
                                        }}
                                        className={`w-full appearance-none ${liveControlBg} ${liveStyleConfig.modelText} border text-[11px] font-black py-1 pl-2.5 pr-7 ${isPixelLiveStyle ? 'rounded-none' : 'rounded-md'} focus:outline-none focus:ring-1 focus:ring-slate-950/10 transition-all cursor-pointer shadow-sm`}
                                    >
                                        {pricingProps.strategies.map(opt => <option key={opt.value} value={opt.value} className={optionClassName}>{opt.label}</option>)}
                                    </select>
                                    {isMarioLiveStyle && discountFxKey > 0 && <span key={discountFxKey} className="live-mario-discount-coin" aria-hidden="true">★</span>}
                                    <ChevronDown className={`absolute right-2 top-1.5 ${liveStyleConfig.accentText} opacity-80 pointer-events-none`} size={14} />
                                </div>
                            </div>

                            <div className="grid grid-cols-[70px_1fr] gap-2 items-end">
                                <div className="flex flex-col gap-0.5">
                                    <span className={`text-[10px] font-black ${liveStyleConfig.mutedText}`}>原价</span>
                                    <span className={`text-lg font-black line-through decoration-2 ${liveStyleConfig.mutedText}`}>¥{Math.floor(pricingProps.pricing.standardPrice)}</span>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className={`text-[10px] font-black ${liveStyleConfig.accentText}`}>优惠后</span>
                                    <div className="flex items-baseline gap-1 leading-none">
                                        <span className={`text-xl font-bold ${liveStyleConfig.totalPriceText}`}>¥</span>
                                        <span className={`text-4xl font-black drop-shadow-md ${liveStyleConfig.totalPriceText} font-mono tracking-tighter`}>
                                            <SidebarRollingPrice value={pricingProps.pricing.finalPrice} />
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                                <span className={`${pricingProps.pricing.savedAmount > 0 ? liveStyleConfig.savedBadge : `bg-white/20 ${liveStyleConfig.modelText} opacity-75`} px-2 py-0.5 rounded-full text-[11px] font-black`}>
                                    已省 ¥{pricingProps.pricing.savedAmount}
                                </span>
                                <span className={`text-[9px] ${liveStyleConfig.accentText} opacity-80 tracking-widest`}>
                                    {timeString}
                                </span>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                // === Normal Mode: Kept as original ===
                <>
                    <div className="flex gap-2.5">
                        {/* Module 1: 鲁大师跑分 */}
                        <div className={`flex-1 bg-white dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm rounded-xl p-3 relative overflow-hidden group transition-colors flex flex-col justify-between items-start`}>
                            <div className={`absolute right-0 top-0 w-32 h-32 ${theme.bgPrimary} opacity-5 dark:opacity-10 rounded-full blur-3xl pointer-events-none translate-x-1/2 -translate-y-1/2 group-hover:opacity-10 dark:group-hover:opacity-20 transition-all duration-500`}></div>
                            <div className={`absolute -right-4 -bottom-4 opacity-5 ${theme.primary} group-hover:scale-110 group-hover:opacity-10 transition-all duration-500 delay-75`}><Activity size={48} strokeWidth={1.5}/></div>
                            <div className="relative z-10 w-full flex justify-between items-center mb-1.5">
                                <h4 className={`text-[12px] font-extrabold text-slate-500 dark:text-slate-400 flex items-center gap-1.5`}><Activity size={14} className={theme.primary}/> 性能</h4>
                                <div className={`w-1.5 h-1.5 rounded-full ${theme.bgPrimary} inline-block animate-pulse`}></div>
                            </div>
                            <div className={`text-xl font-black text-transparent bg-clip-text bg-gradient-to-r ${theme.gradient} font-display tracking-tighter relative z-10 w-full`}>
                                {simResult && simResult.totalLuScore > 0 ? <BouncyNumber value={Math.floor(simResult.totalLuScore/10000)} /> : '---'}
                                {simResult && simResult.totalLuScore > 0 && <span className={`text-sm text-slate-400 ml-1`}>万</span>}
                            </div>
                        </div>

                        {/* Module 2: 整机功耗 */}
                        <div className={`flex-1 bg-white dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 hover:border-amber-300 dark:hover:border-amber-500/50 shadow-sm rounded-xl p-3 relative overflow-hidden group transition-colors flex flex-col justify-between items-start`}>
                            <div className="absolute left-0 bottom-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 translate-y-1/2 group-hover:bg-amber-500/20 transition-all duration-500"></div>
                            <div className="absolute -right-2 -bottom-2 opacity-5 text-amber-500 group-hover:scale-110 group-hover:opacity-10 transition-all duration-500 delay-75"><Zap size={48} strokeWidth={1.5}/></div>
                            <div className="relative z-10 w-full flex justify-between items-center mb-1.5">
                                <h4 className={`text-[12px] font-extrabold text-slate-500 dark:text-slate-400 flex items-center gap-1.5`}><Zap size={14} className={"text-amber-500"}/> 功耗</h4>
                            </div>
                            <div className={`text-xl text-slate-800 dark:text-slate-200 font-black font-display tracking-tighter relative z-10 w-full`}>
                                {simResult && simResult.totalPowerDraw > 0 ? <><BouncyNumber value={simResult.totalPowerDraw} /><span className="text-sm ml-0.5 text-slate-500 font-bold">W</span></> : '---'}
                            </div>
                        </div>
                    </div>

                    {/* Module 3: 游戏帧率 */}
                    <div className={`bg-white dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm rounded-xl p-3.5 relative overflow-hidden flex-1 flex flex-col group transition-colors`}>
                        <div className={`absolute right-0 top-0 w-48 h-48 ${theme.bgPrimary} opacity-5 dark:opacity-10 rounded-full blur-3xl pointer-events-none translate-x-1/2 -translate-y-1/2 group-hover:opacity-10 dark:group-hover:opacity-20 transition-all duration-500`}></div>
                        <div className="flex items-center justify-between mb-3 relative z-10">
                            <h3 className={`font-extrabold text-slate-900 dark:text-white text-[13px] flex items-center gap-1.5 tracking-wide`}>
                                <Gamepad2 size={16} className={theme.primary} />
                                游戏FPS
                            </h3>
                            <div className={`flex gap-0.5 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 p-0.5 rounded-lg border`}>
                                {[1080, 1440, 2160].map(res => (
                                    <button
                                        key={res}
                                        onClick={() => setSidebarResolution(res)}
                                        className={`text-[9px] font-black px-2 py-0.5 rounded-md transition-all uppercase tracking-wider ${sidebarResolution === res ? `${theme.bgPrimary} text-white shadow-sm scale-105` : `text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700/50`}`}
                                    >
                                        {res === 1080 ? '1080P' : res === 1440 ? '2K' : '4K'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className={`relative z-10 flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-2.5`}>
                            {loadingFps ? (
                                <div className={`py-8 flex flex-col items-center justify-center ${theme.primary} gap-3 h-full`}>
                                    <RefreshCw size={24} className="animate-spin opacity-80" />
                                    <div className="text-[10px] font-black tracking-widest uppercase opacity-80">AI 性能分析中...</div>
                                </div>
                            ) : fpsData.length > 0 ? (
                                displayFpsData.map((item, idx) => (
                                    <div key={idx} className="group/item">
                                        <div className="flex justify-between items-end text-[11px] mb-1.5">
                                            <span className={`font-bold text-slate-700 dark:text-slate-300 group-hover/item:text-slate-900 dark:group-hover/item:text-white transition-colors flex items-center gap-1.5 flex-1 min-w-0 pr-2`}>
                                                <GameFpsIcon name={item.name} className="w-4 h-4 rounded-[4px] object-cover bg-slate-100 dark:bg-slate-800 shadow-sm shrink-0" />
                                                <span className="truncate">{item.name}</span>
                                            </span>
                                            <div className="flex items-baseline gap-2 justify-end shrink-0">
                                                {item.lowFps ? (
                                                    <span className="flex items-baseline gap-0.5 text-slate-400 w-10 justify-end">
                                                        <span className="text-[9px] uppercase font-bold tracking-wider opacity-80">Low</span>
                                                        <span className="font-mono text-xs font-bold">{item.lowFps}</span>
                                                    </span>
                                                ) : <span className="w-10"></span>}
                                                <div className={`flex items-baseline gap-0.5 ml-1 w-14 justify-end`}>
                                                    <span className={`font-display font-black text-sm ${
                                                        item.fps === 0 ? 'text-slate-400 dark:text-slate-500' :
                                                        item.fps >= 200 ? 'text-emerald-500 dark:text-emerald-400' : 
                                                        item.fps >= 100 ? 'text-blue-500 dark:text-blue-400' :
                                                        item.fps >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                                                        'text-red-500 dark:text-red-400'
                                                    }`}>{item.fps}</span>
                                                    <span className={`text-[8px] font-bold text-slate-400 uppercase tracking-widest`}>FPS</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`w-full bg-slate-100 dark:bg-slate-800 border-slate-200/50 dark:border-slate-700/50 rounded-full h-1.5 overflow-hidden border relative`}>
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
                </>
            )}

        </div>
    );
}
