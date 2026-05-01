
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Sparkles, X, Download, Share2, Search, Zap, CheckCircle2, AlertCircle, RefreshCw, FileText, ChevronDown, ArrowRight, Trash2, Plus, CreditCard, ChevronUp, Monitor, Info, Activity, Gamepad2, Bell } from 'lucide-react';
import html2canvas from 'html2canvas';
import { BuildEntry, HardwareItem, Category, SystemAnnouncementSettings } from '../../types/clientTypes';
import { CATEGORY_MAP } from '../../data/clientData';
import { storage } from '../../services/storage';
import { aiBuilder } from '../../services/aiBuilder';
import { getIconByCategory } from './Shared';
import { AiGenerateModal } from './AiGenerateModal';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { gamesFpsData, gamesList, Resolution } from '../../data/gameFpsData';

// Component for bouncy number counting
const BouncyNumber = ({ value, className }: { value: number; className?: string }) => {
    const count = useMotionValue(0);
    const rounded = useTransform(count, (latest) => Math.round(latest));

    useEffect(() => {
        const controls = animate(count, value, {
            type: 'spring',
            stiffness: 100,
            damping: 15,
            restDelta: 0.5
        });
        return controls.stop;
    }, [value, count]);

    return <motion.span className={className}>{rounded}</motion.span>;
};

function VisualBuilder({
    buildList,
    onUpdate,
    health,
    onOpenLibrary,
    pricing,
    onAiCheck,
    openAiModal,
    onAiModalClose,
    onSave,
    onShare,
    onReset
}: {
    buildList: BuildEntry[],
    onUpdate: (id: string, d: Partial<BuildEntry>) => void,
    health: { status: string, issues: string[] },
    onOpenLibrary: () => void,
    pricing: any,
    onAiCheck?: () => boolean,
    openAiModal?: boolean,
    onAiModalClose?: () => void,
    onSave?: () => void,
    onShare?: () => void,
    onReset?: () => void
}) {
    const [modalCategory, setModalCategory] = useState<Category | null>(null);
    const [modalEntryId, setModalEntryId] = useState<string | null>(null);
    const [modalSearch, setModalSearch] = useState('');

    const [modalBrand, setModalBrand] = useState('all');
    const [ramTypeFilter, setRamTypeFilter] = useState<'all' | 'DDR4' | 'DDR5'>('all');
    const [diskCapFilter, setDiskCapFilter] = useState<'all' | '500G' | '1T' | '2T' | '4T'>('all');
    const [cpuTypeFilter, setCpuTypeFilter] = useState<'all' | 'X3D'>('all');
    const [mbPlatformFilter, setMbPlatformFilter] = useState<'all' | 'AMD' | 'Intel'>('all');
    const [coolingTypeFilter, setCoolingTypeFilter] = useState<'all' | 'air' | '240' | '360'>('all');
    const [sortOrder, setSortOrder] = useState<'default' | 'asc' | 'desc'>('default');
    const [isBrandsExpanded, setIsBrandsExpanded] = useState(false);
    const [showAiModal, setShowAiModal] = useState(false);

    const [isGeneratingPoster, setIsGeneratingPoster] = useState(false);
    const posterRef = useRef<HTMLDivElement>(null);

    // Category-specific items for the selector
    const [modalItems, setModalItems] = useState<HardwareItem[]>([]);
    const [isModalLoading, setIsModalLoading] = useState(false);

    // Handle external trigger for AI Modal
    useEffect(() => {
        if (openAiModal) {
            setShowAiModal(true);
            if (onAiModalClose) onAiModalClose();
        }
    }, [openAiModal, onAiModalClose]);
    const [aiActiveCategory, setAiActiveCategory] = useState<Category | null>(null);
    const [aiResult, setAiResult] = useState<{ description: string } | null>(null);

    // Track row elements for ghost cursor target
    const rowRefs = useState<Record<string, HTMLDivElement | null>>({})[0];
    const modalSearchInputRef = useState<{ current: HTMLInputElement | null }>({ current: null })[0];
    const modalItemRefs = useState<Record<string, HTMLDivElement | null>>({})[0];


    const [sysAnnouncement, setSysAnnouncement] = useState<SystemAnnouncementSettings | null>(null);
    const [pricingStrategy, setPricingStrategy] = useState<import('../../types/adminTypes').PricingStrategy | null>(null);

    // Simulator Widgets States
    const [simResult, setSimResult] = useState<{
        totalLuScore: number;
        totalPowerDraw: number;
        recommendedPower: number;
        isValid: boolean;
        errors: string[];
        warnings: string[];
    } | null>(null);
    const [fpsData, setFpsData] = useState<any[]>([]);
    const [resolution, setResolution] = useState<number>(1080);
    const [loadingFps, setLoadingFps] = useState(false);

    useEffect(() => {
        storage.getSystemAnnouncement().then(setSysAnnouncement);
        storage.getPricingStrategy().then(setPricingStrategy);

        const handleUpdate = () => {
            storage.getSystemAnnouncement().then(setSysAnnouncement);
        };
        window.addEventListener('xiaoyu-announcement-update', handleUpdate);
        return () => window.removeEventListener('xiaoyu-announcement-update', handleUpdate);
    }, []);

    // Simulator API Hooks
    useEffect(() => {
        // Collect product IDs from buildList
        const itemIds = buildList
            .filter(b => b.item && !b.customName)
            .map(b => b.item!.id);
            
        if (itemIds.length === 0) {
            setSimResult(null);
            return;
        }

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
    }, [buildList]);

    useEffect(() => {
        const cpuItem = buildList.find(b => b.category === 'cpu')?.item;
        const gpuItem = buildList.find(b => b.category === 'gpu')?.item;
        
        if (!cpuItem && !gpuItem) { 
            setFpsData(gamesList.slice(0, 8).map((gameName: string) => ({ name: gameName, fps: 0 })));
            setLoadingFps(false);
            return; 
        }

        setLoadingFps(true);
        const resMap: Record<number, Resolution> = { 1080: '1080p', 1440: '1440p', 2160: '4K' };
        const resKey = resMap[resolution] || '1080p';

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
        const preferredGames = ["黑神话：悟空", "赛博朋克 2077", "荒野大镖客：救赎 2", "三角洲行动", "反恐精英 2", "无畏契约", "绝地求生", "Apex 英雄", "刀塔 2", "守望先锋 2"];
        
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

        setTimeout(() => {
            setFpsData(results.slice(0, 8));
            setLoadingFps(false);
        }, 300);
    }, [buildList, resolution]);

    const openSelector = async (entry: BuildEntry) => {
        setModalCategory(entry.category);
        setModalEntryId(entry.id);
        setModalSearch('');
        setModalBrand('all');
        setSortOrder('default');
        setIsBrandsExpanded(false);

        // Fetch items for this specific category
        setIsModalLoading(true);
        try {
            const res = await storage.getProducts(1, 2000, entry.category);
            setModalItems(res.items);
        } catch (e) {
            console.error('Failed to load category products', e);
            setModalItems([]);
        } finally {
            setIsModalLoading(false);
        }
    };

    const handleSelect = (item: HardwareItem) => {
        if (modalEntryId) {
            onUpdate(modalEntryId, { item, customPrice: undefined, customName: undefined });
            setModalCategory(null);
            setModalEntryId(null);
        }
    };

    const handleAiBuild = useCallback(async (prompt: string, preCalculatedResult?: any) => {
        try {
            let result = preCalculatedResult;

            if (!result) {
                const request = aiBuilder.parseRequest(prompt);
                result = await aiBuilder.generateBuildWithLogs(request);
            }

            setShowAiModal(false);

            // 仪式感：逐个类别依次填入，每个间隔 250ms（没有混乱光标，干净利落）
            await new Promise(r => setTimeout(r, 200));

            for (const entry of buildList) {
                const cat = entry.category;
                const targetItem = result.items[cat as keyof typeof result.items];

                if (targetItem && typeof targetItem === 'object' && typeof targetItem.model === 'string') {
                    // 短暂高亮当前类别
                    setAiActiveCategory(entry.category);
                    await new Promise(r => setTimeout(r, 200));

                    // 填入配置
                    onUpdate(entry.id, { item: targetItem, customPrice: undefined, customName: undefined });
                    await new Promise(r => setTimeout(r, 150));
                }
            }

            setAiActiveCategory(null);
            await new Promise(r => setTimeout(r, 400));
            setAiResult({ description: result.description });

        } catch (error) {
            console.error("AI Generation Failed:", error);
            setShowAiModal(false);
            setAiActiveCategory(null);
            alert("AI 生成失败，请重试");
        }
    }, [buildList, onUpdate, rowRefs, modalSearchInputRef, modalItemRefs]);

    const handleShareClick = () => {
        // Execute external checks/hooks before proceeding
        if (onShare) onShare();
    };

    const handleGeneratePoster = async () => {
        if (!posterRef.current || isGeneratingPoster) return;
        setIsGeneratingPoster(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 100)); // allow DOM refresh
            const canvas = await html2canvas(posterRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: null,
            });
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `小鱼装机单_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '')}.png`;
            link.click();
        } catch (error) {
            console.error('Failed to generate poster:', error);
            alert('生成图片失败，请稍后重试');
        } finally {
            setIsGeneratingPoster(false);
        }
    };

    const validPosterItems = buildList.filter(b => b.item || b.customName);

    const filteredItems = useMemo(() => {
        if (!modalCategory) return [];

        const searchStr = modalSearch.toLowerCase().trim();
        const searchTerms = searchStr ? searchStr.split(/\s+/) : [];

        let items = modalItems.filter(i => {
            if (i.category !== modalCategory) return false;
            if (modalBrand !== 'all' && i.brand !== modalBrand) return false;
            if (searchStr) {
                const searchableText = `${i.brand} ${i.model} ${CATEGORY_MAP[i.category] || i.category}`.toLowerCase();
                if (!searchTerms.every(term => searchableText.includes(term))) return false;
            }
            // 解析 specs 为对象，修复 TypeScript 严格模式下的类型检查 (防止 never type 报错)
            const rawSpecs: any = i.specs;
            const specsObj: Record<string, any> = typeof rawSpecs === 'object' && rawSpecs !== null 
                ? rawSpecs 
                : (typeof rawSpecs === 'string' ? (() => { try { return JSON.parse(rawSpecs) } catch { return {} } })() : {});
            const modelLower = (i.model || '').toLowerCase();
            const specsStr = typeof rawSpecs === 'string' ? rawSpecs.toLowerCase() : JSON.stringify(rawSpecs || {}).toLowerCase();
            const combined = `${modelLower} ${specsStr}`;

            // DDR4/DDR5 filter for RAM
            if (modalCategory === 'ram' && ramTypeFilter !== 'all') {
                const memType = specsObj.memoryType || specsObj.type;
                if (memType) {
                    if (String(memType).toUpperCase() !== ramTypeFilter) return false;
                } else if (ramTypeFilter === 'DDR4') {
                    if (!combined.includes('ddr4') && !combined.includes('d4')) return false;
                } else if (ramTypeFilter === 'DDR5') {
                    if (!combined.includes('ddr5') && !combined.includes('d5')) return false;
                }
            }
            
            // Disk capacity filter
            if (modalCategory === 'disk' && diskCapFilter !== 'all') {
                const cap = specsObj.capacity;
                const targetMatch = cap ? String(cap).toLowerCase() : combined;
                if (diskCapFilter === '500G') {
                    if (!(/480g|500g|480gb|500gb|512g|512gb/.test(targetMatch))) return false;
                } else if (diskCapFilter === '1T') {
                    if (!(/(?:^|\D)1t(?:b|\b)|1000g|1024g/.test(targetMatch))) return false;
                } else if (diskCapFilter === '2T') {
                    if (!(/(?:^|\D)2t(?:b|\b)|2000g|2048g/.test(targetMatch))) return false;
                } else if (diskCapFilter === '4T') {
                    if (!(/(?:^|\D)4t(?:b|\b)|4000g|4096g/.test(targetMatch))) return false;
                }
            }
            
            // CPU X3D filter
            if (modalCategory === 'cpu' && cpuTypeFilter === 'X3D') {
                // CPU is usually in the model name (e.g. 7800X3D)
                if (!modelLower.includes('x3d')) return false;
            }
            
            // Motherboard platform filter (AMD: AM4/AM5, Intel: LGA)
            if (modalCategory === 'mainboard' && mbPlatformFilter !== 'all') {
                const socket = specsObj.socket;
                if (socket) {
                    const sockUpper = String(socket).toUpperCase();
                    if (mbPlatformFilter === 'AMD' && !sockUpper.startsWith('AM')) return false;
                    if (mbPlatformFilter === 'Intel' && !sockUpper.startsWith('LGA')) return false;
                } else {
                    if (mbPlatformFilter === 'AMD' && !(/am4|am5|a520|b450|b550|x570|a620|b650|x670|x870/.test(combined))) return false;
                    if (mbPlatformFilter === 'Intel' && !(/lga|b460|b560|b660|b760|b860|z490|z590|z690|z790|z890|h510|h610|h670|h770/.test(combined))) return false;
                }
            }
            
            // Cooling type filter
            if (modalCategory === 'cooling' && coolingTypeFilter !== 'all') {
                const type = specsObj.type;
                if (type) {
                    const typeLower = String(type).toLowerCase();
                    if (coolingTypeFilter === 'air' && !typeLower.includes('风冷') && !typeLower.includes('塔') && !typeLower.includes('air')) return false;
                    if (coolingTypeFilter === '240' && !typeLower.includes('240')) return false;
                    if (coolingTypeFilter === '360' && !typeLower.includes('360')) return false;
                } else {
                    if (coolingTypeFilter === 'air' && !combined.includes('风冷') && !combined.includes('air') && !combined.includes('塔式')) return false;
                    if (coolingTypeFilter === '240' && !(/240/.test(combined))) return false;
                    if (coolingTypeFilter === '360' && !(/360/.test(combined))) return false;
                }
            }
            return true;
        });

        // 核心排序逻辑
        items.sort((a, b) => {
            // 1. 价格为 0 的排在最后（不论那种排序模式）
            if (a.price === 0 && b.price !== 0) return 1;
            if (a.price !== 0 && b.price === 0) return -1;

            if (sortOrder === 'asc') {
                return a.price - b.price;
            } else if (sortOrder === 'desc') {
                return b.price - a.price;
            } else {
                // 默认排序：推荐/折扣 置顶
                const aIsSpecial = a.isRecommended || a.isDiscount;
                const bIsSpecial = b.isRecommended || b.isDiscount;
                if (aIsSpecial && !bIsSpecial) return -1;
                if (!aIsSpecial && bIsSpecial) return 1;
                return a.price - b.price; // 特殊标签内也按价格升序
            }
        });

        return items;
    }, [modalCategory, modalItems, modalBrand, modalSearch, sortOrder, ramTypeFilter, diskCapFilter, cpuTypeFilter, mbPlatformFilter, coolingTypeFilter]);

    const availableBrands = useMemo(() => {
        if (!modalCategory) return [];
        const brands = new Set(modalItems.filter(i => i.category === modalCategory).map(i => i.brand));
        return ['all', ...Array.from(brands)];
    }, [modalCategory, modalItems]);

    const [previewImage, setPreviewImage] = useState<string | null>(null);

    return (
        <div className="flex flex-col lg:flex-row gap-5 relative">

            {/* Hidden Poster Template */}
            <div style={{ position: 'fixed', top: -9999, left: -9999, zIndex: -9999 }}>
                <div ref={posterRef} className="bg-white text-slate-900 w-[600px] rounded-[24px] overflow-hidden font-sans border border-slate-200 shadow-xl relative">
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
                            <p className="text-white/40 text-[9px] mt-0.5 whitespace-nowrap tracking-wider">含 {((pricingStrategy?.serviceFeeRate ?? 0.06) * 100).toFixed(0)}% 装机售后服务费</p>
                            <p className="mt-2 font-mono">{new Date().toLocaleDateString('zh-CN')} 生成</p>
                        </div>
                        <div className="text-right">
                            <p className="text-white/50 text-xs font-bold mb-1">整机预算预估</p>
                            <div className="flex items-baseline gap-1 text-white">
                                <span className="text-2xl font-bold">¥</span>
                                <span className="text-5xl font-black font-mono tracking-tighter"><BouncyNumber value={Math.floor(pricing.finalPrice)} /></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Image Preview Modal */}
            {previewImage && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setPreviewImage(null)}>
                    <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl p-2 shadow-2xl animate-scale-up">
                        <img src={previewImage} alt="Preview" className="w-full h-full object-contain rounded-xl max-h-[85vh]" />
                        <button className="absolute -top-4 -right-4 bg-white rounded-full p-2 text-slate-800 shadow-lg hover:text-red-500 transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                </div>
            )}



            {/* Mobile Column View (Compact & Premium) */}
            <div className="lg:hidden flex flex-col bg-[#FAFAFA] dark:bg-[#0B0B10] relative pb-28">
                {/* Premium Mobile Header: Functional Buttons */}
                <div className="sticky top-0 z-20 bg-white/95 dark:bg-[#121218]/95 backdrop-blur-3xl border-b border-slate-200 dark:border-[#1E293B] p-2.5 pb-3 shadow-[0_4px_30px_rgba(0,0,0,0.03)] dark:shadow-none">
                    <div className="flex gap-2.5 relative w-full items-center justify-between">
                        {/* 智能装机 PRO AI Button */}
                        <button
                            onClick={() => { if (onAiCheck && !onAiCheck()) return; setShowAiModal(true); }}
                            className="flex-[1.1] relative overflow-hidden bg-slate-900 border border-slate-800 text-white font-extrabold py-3.5 px-3 rounded-[20px] shadow-lg shadow-slate-900/15 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 text-[14px] tracking-wide group"
                        >
                            {/* Inner subtle glow */}
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 opacity-0 group-active:opacity-100 transition-opacity"></div>
                            <Sparkles size={16} className="text-indigo-400 animate-pulse shrink-0" />
                            <span className="flex items-center gap-1.5 whitespace-nowrap">智能装机 <span className="text-[10px] bg-white/15 px-1.5 py-0.5 rounded-lg flex items-center justify-center font-black">AI</span></span>
                        </button>

                        {/* Recommendation Button */}
                        <button
                            onClick={onOpenLibrary}
                            className="flex-[0.9] bg-white hover:bg-slate-50 text-slate-700 font-extrabold py-3.5 px-3 rounded-[20px] border-[1.5px] border-slate-200/80 shadow-sm shadow-slate-200/50 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 text-[14px] tracking-wide whitespace-nowrap"
                        >
                            <FileText size={16} className="text-slate-400" /> 推荐方案
                        </button>
                    </div>

                </div>

                {/* Elegant Mobile List Items */}
                <div className="p-2 space-y-1">
                    {buildList.map((entry) => (
                        <div
                            key={entry.id}
                            ref={(el) => { if (el) rowRefs[entry.id] = el; }}
                            onClick={() => openSelector(entry)}
                            className={`relative group bg-white dark:bg-[#121218] rounded-xl border transition-all duration-300 active:scale-[0.98] flex items-center p-2 gap-2 ${entry.item || entry.customName
                                ? 'border-indigo-100 dark:border-indigo-500/20 shadow-sm dark:shadow-none'
                                : 'border-slate-200 dark:border-[#2D3748] border-dashed bg-slate-50/50 dark:bg-[#1A1A24]/50'
                                }`}
                        >
                            {/* Category Icon & Text Column */}
                            <div className="w-12 sm:w-14 shrink-0 flex flex-col items-center justify-center gap-1">
                                <div 
                                    className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-sm relative overflow-hidden transition-all ${entry.item ? 'bg-indigo-50 text-indigo-500 group-hover:bg-indigo-100' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100'} ${entry.item?.image ? 'cursor-zoom-in active:scale-95 hover:ring-2 hover:ring-indigo-300 hover:ring-offset-1' : ''}`}
                                    onClick={(e) => {
                                        if (entry.item?.image) {
                                            e.stopPropagation();
                                            setPreviewImage(entry.item.image);
                                        }
                                    }}
                                >
                                    {entry.item && <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>}
                                    <div className="scale-[0.8]">
                                        {getIconByCategory(entry.category)}
                                    </div>
                                </div>
                                <span className="text-[10px] font-black tracking-tight text-slate-400 text-center w-full line-clamp-1 scale-90 sm:scale-100 origin-center">
                                    {CATEGORY_MAP[entry.category]}
                                </span>
                            </div>

                            {/* Content Column */}
                            <div className="flex-1 min-w-0">
                                {entry.category === 'accessory' ? (
                                    <input
                                        type="text"
                                        className="w-full bg-transparent border-none p-0 text-[13px] text-slate-800 font-bold placeholder-slate-300 focus:ring-0 truncate"
                                        placeholder={`配件名称...`}
                                        value={entry.customName || ''}
                                        onChange={(e) => onUpdate(entry.id, { customName: e.target.value })}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                ) : entry.item ? (
                                    <div className="text-[13px] font-bold text-slate-700 truncate leading-tight tracking-tight">
                                        {entry.item.brand} {entry.item.model}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1 w-fit px-2 py-0.5 rounded-md bg-slate-100/80 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                                        <Plus size={12} strokeWidth={2.5} />
                                        <span className="text-[11px] font-bold tracking-wider">去挑选</span>
                                    </div>
                                )}
                            </div>

                            {/* Price & Actions Column */}
                            <div className="flex items-center gap-2">
                                {(entry.item || entry.customName) && (
                                    <div className="text-[13px] font-black font-mono text-slate-900">
                                        ¥{(entry.customPrice ?? entry.item?.price ?? 0) * (entry.quantity || 1)}
                                    </div>
                                )}

                                <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                                    {entry.category === 'fan' && entry.item && (
                                        <div className="flex items-center bg-slate-50 rounded-lg p-0.5 border border-slate-100 scale-90 origin-right">
                                            <button onClick={() => onUpdate(entry.id, { quantity: Math.max(1, entry.quantity - 1) })} className="w-4 h-4 flex items-center justify-center hover:bg-white rounded text-slate-400 font-bold transition-all text-[10px]">-</button>
                                            <span className="w-4 text-center text-[10px] font-bold text-slate-600">{entry.quantity}</span>
                                            <button onClick={() => onUpdate(entry.id, { quantity: entry.quantity + 1 })} className="w-4 h-4 flex items-center justify-center hover:bg-white rounded text-slate-400 font-bold transition-all text-[10px]">+</button>
                                        </div>
                                    )}
                                    {(entry.item || entry.customName) && (
                                        <button
                                            className="w-5 h-5 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors"
                                            onClick={() => onUpdate(entry.id, { item: null, customName: '', customPrice: undefined, quantity: 1 })}
                                        >
                                            <X size={12} strokeWidth={3} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Desktop List View (Hidden on mobile) */}
            <div className="hidden lg:flex flex-1 max-w-[800px] mx-auto flex-col pb-20 relative">
                {/* Top Bar: Announcement + AI Build + Quick Build in one row */}
                <div className="flex gap-2.5 mb-3 items-stretch">
                    {/* System Announcement - takes most space */}
                    {sysAnnouncement?.enabled && sysAnnouncement.items && sysAnnouncement.items.length > 0 && (
                        <div className="flex-1 relative overflow-hidden bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-indigo-200/50 dark:border-indigo-500/20 rounded-2xl py-2 px-3 shadow-[0_0_15px_-3px_rgba(99,102,241,0.1)] dark:shadow-[0_0_15px_-3px_rgba(99,102,241,0.05)] flex items-center gap-2.5 group">
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                            <div className="shrink-0 relative z-20 flex items-center justify-center w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                 <Bell size={14} className="animate-[wiggle_3s_ease-in-out_infinite]" />
                            </div>
                            <div className="flex-1 overflow-hidden relative h-5">
                                <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white dark:from-slate-900 to-transparent z-10 pointer-events-none"></div>
                                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-slate-900 to-transparent z-10 pointer-events-none"></div>
                                <style>{`
                                    @keyframes marquee-rtl {
                                        0% { transform: translateX(100%); }
                                        100% { transform: translateX(-100%); }
                                    }
                                    @keyframes wiggle {
                                        0%, 100% { transform: rotate(-10deg); }
                                        50% { transform: rotate(10deg); }
                                    }
                                    .animate-marquee-rtl {
                                        display: inline-block;
                                        animation: marquee-rtl 18s linear infinite;
                                        white-space: nowrap;
                                    }
                                `}</style>
                                <div className="animate-marquee-rtl text-[12px] font-bold text-slate-700 dark:text-slate-300 flex gap-16 leading-5">
                                    {sysAnnouncement.items.map((item: any) => (
                                        <span key={item.id} className="flex items-center gap-1.5 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors whitespace-nowrap" onClick={() => item.linkUrl && window.open(item.linkUrl, '_blank')}>
                                            {item.type === 'promo' && <Sparkles size={13} className="text-amber-500" />}
                                            {item.type === 'warning' && <AlertCircle size={13} className="text-red-500" />}
                                            {item.type === 'info' && <Info size={13} className="text-indigo-500 dark:text-indigo-400" />}
                                            {item.content}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* AI Smart Build - compact */}
                    <motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.95 }} onClick={() => {
                        if (onAiCheck && !onAiCheck()) return;
                        setShowAiModal(true);
                    }} className="group relative cursor-pointer shrink-0">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 rounded-2xl blur-md opacity-15 group-hover:opacity-35 transition duration-500"></div>
                        <div className="relative flex items-center gap-2 bg-white/90 dark:bg-[#121218]/90 backdrop-blur-xl rounded-2xl px-3 py-2 border border-slate-200 dark:border-[#2D3748] shadow-sm dark:shadow-none h-full">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-sm shadow-indigo-500/30">
                                <Sparkles size={13} className="animate-pulse" />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-1">
                                    <span className="font-extrabold text-[11px] text-slate-900 dark:text-white whitespace-nowrap">AI 装机</span>
                                    <span className="text-[7px] font-black bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-1 py-0.5 rounded uppercase tracking-wider shadow-sm">Pro</span>
                                </div>
                            </div>
                            <ArrowRight size={11} className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                        </div>
                    </motion.div>

                    {/* Quick Build - compact */}
                    <motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.95 }} onClick={onOpenLibrary} className="group relative cursor-pointer shrink-0">
                        <div className="relative flex items-center gap-2 bg-white/80 dark:bg-[#121218]/80 backdrop-blur-xl rounded-2xl px-3 py-2 border border-slate-200 dark:border-[#2D3748] shadow-sm dark:shadow-none group-hover:border-indigo-200 dark:group-hover:border-indigo-500/30 transition-all h-full">
                            <div className="w-7 h-7 bg-slate-100 text-slate-500 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300 group-hover:bg-indigo-50 group-hover:text-indigo-600">
                                <FileText size={13} />
                            </div>
                            <span className="font-extrabold text-slate-800 dark:text-white text-[11px] whitespace-nowrap">快速装机</span>
                            <ArrowRight size={11} className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                        </div>
                    </motion.div>
                </div>

                <motion.div 
                    initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
                    className="flex flex-col space-y-1.5"
                >
                    {buildList.map((entry) => (
                        <motion.div
                            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } } }}
                            whileHover={{ y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            layout
                            key={entry.id}
                            ref={(el: any) => { if (el) rowRefs[entry.id] = el; }}
                            onClick={() => openSelector(entry)}
                            className={`relative rounded-xl px-3 py-2.5 border transition-colors duration-300 cursor-pointer group flex items-center gap-4 ${entry.item || entry.customName
                                ? 'bg-white dark:bg-[#121218] border-slate-200 dark:border-[#1E293B] shadow-sm dark:shadow-none hover:border-indigo-200 dark:hover:border-indigo-500/30 hover:shadow-md dark:hover:shadow-none'
                                : 'bg-white/60 dark:bg-[#121218]/60 border-dashed border-slate-300/60 dark:border-[#2D3748] hover:bg-white dark:hover:bg-[#121218] hover:border-indigo-300 dark:hover:border-indigo-500/30 hover:shadow-sm dark:hover:shadow-none'
                                }`}
                        >
                            <div 
                                className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 transition-all duration-500 shadow-sm dark:shadow-none relative overflow-hidden ${entry.item ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white group-hover:scale-105 group-hover:shadow-indigo-500/25 group-hover:shadow-lg dark:group-hover:shadow-none' : 'bg-slate-100 dark:bg-[#1A1A24] text-slate-400 dark:text-slate-500 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/10 group-hover:text-indigo-400'} ${entry.item?.image ? 'cursor-zoom-in hover:ring-2 hover:ring-indigo-300 hover:ring-offset-1 hover:z-10' : ''}`}
                                onClick={(e) => {
                                    if (entry.item?.image) {
                                        e.stopPropagation();
                                        setPreviewImage(entry.item.image);
                                    }
                                }}
                            >
                                {entry.item && <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>}
                                {getIconByCategory(entry.category)}
                            </div>
                            <div className={`text-[13px] font-black w-14 tracking-wider ${entry.item ? 'text-indigo-900' : 'text-slate-400 group-hover:text-slate-500'}`}>{CATEGORY_MAP[entry.category]}</div>

                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                {entry.category === 'accessory' ? (
                                    <input
                                        type="text"
                                        className="w-full bg-transparent border-none p-0 text-slate-800 dark:text-slate-200 font-extrabold placeholder-slate-300 dark:placeholder-slate-600 focus:ring-0 truncate text-sm"
                                        placeholder="快捷输入附件..."
                                        value={entry.customName || ''}
                                        onChange={(e) => onUpdate(entry.id, { customName: e.target.value })}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                ) : entry.item ? (
                                    <div className="font-extrabold text-slate-800 dark:text-slate-100 text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-snug tracking-tight">{entry.item.brand} {entry.item.model}</div>
                                ) : entry.category === aiActiveCategory ? (
                                    <div className="text-indigo-500 text-xs font-bold flex items-center gap-2 animate-pulse bg-indigo-50 w-max px-3 py-1.5 rounded-full">
                                        <Sparkles size={14} className="animate-spin-slow" />
                                        AI 正在为您挑选...
                                    </div>
                                ) : (
                                    <div className="text-slate-300/80 text-xs font-bold italic tracking-wide">未挑选 {CATEGORY_MAP[entry.category]}</div>
                                )}
                            </div>
                            <div className="flex items-center gap-4 w-40 justify-end shrink-0">
                                <div className="hidden md:flex" onClick={e => e.stopPropagation()}>
                                    {entry.category === 'accessory' ? null : (
                                        !entry.isLockedQty ? (
                                            <div className="flex items-center bg-slate-100/80 rounded-xl p-1 border border-slate-200/60 shadow-inner">
                                                <button onClick={() => onUpdate(entry.id, { quantity: Math.max(1, entry.quantity - 1) })} className="w-6 h-6 flex items-center justify-center hover:bg-white rounded-lg text-slate-500 font-black hover:shadow-sm transition-all">-</button>
                                                <span className="w-6 text-center text-xs font-black text-slate-700">{entry.quantity}</span>
                                                <button onClick={() => onUpdate(entry.id, { quantity: entry.quantity + 1 })} className="w-6 h-6 flex items-center justify-center hover:bg-white rounded-lg text-slate-500 font-black hover:shadow-sm transition-all">+</button>
                                            </div>
                                        ) : null
                                    )}
                                </div>
                                <div className="text-right font-black text-slate-900 dark:text-slate-200 text-sm font-mono tracking-tight">
                                    {entry.item || entry.customName ? `¥${(entry.customPrice ?? entry.item?.price ?? 0) * (entry.quantity || 1)}` : <span className="text-slate-200">-</span>}
                                </div>
                            </div>
                            {(entry.item || (entry.category === 'accessory' && entry.customName)) && (
                                <button
                                    className="absolute -top-1.5 -right-1.5 p-1 bg-white text-slate-200 hover:text-red-500 hover:bg-red-50 border border-slate-100 rounded-full transition-all opacity-0 group-hover:opacity-100 shadow-sm"
                                    onClick={(e) => { e.stopPropagation(); onUpdate(entry.id, { item: null, customName: '', customPrice: undefined, quantity: 1 }); }}
                                >
                                    <X size={10} strokeWidth={3} />
                                </button>
                            )}
                        </motion.div>
                    ))}
                </motion.div>

                {/* AI Analysis Report Card - Moved to Bottom & Enlarged */}
                {aiResult && (
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-3xl p-8 border border-indigo-100 relative overflow-hidden animate-fade-in mt-6 shadow-lg shadow-indigo-100/50">
                        <div className="relative z-10">
                            <div className="prose prose-indigo max-w-none">
                                <p className="text-slate-700 leading-loose text-base font-medium whitespace-pre-wrap">
                                    {aiResult.description}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

            </div>
            {/* Merged Sidebar */}
            <div className="w-full lg:w-[320px] xl:w-[340px] shrink-0 flex flex-col gap-4 mt-2 lg:mt-0 mb-28 lg:mb-0 relative z-10">
                {/* Box 1: Price Details (Hidden on Mobile) */}
                <div className="hidden lg:block bg-white dark:bg-[#121218] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-sm dark:shadow-none p-5 md:p-6 overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>
                    
                    <h3 className="font-extrabold text-slate-800 dark:text-white mb-2 flex items-center gap-2 text-sm relative z-10"><CreditCard size={18} className="text-indigo-500" /> 价格明细</h3>
                    <div className="space-y-1.5 mb-3 relative z-10">
                        <div className="flex justify-between items-center text-xs font-medium px-1">
                            <span className="text-slate-500">基础总价</span>
                            <span className="font-black text-slate-700">¥{pricing.totalHardware || 0}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-medium px-1">
                            <span className="text-slate-500">优惠前金额</span>
                            <span className="font-black text-slate-400 line-through decoration-slate-300">¥{Math.floor(pricing.standardPrice || 0)}</span>
                        </div>
                        <div className="flex flex-col gap-1 bg-slate-50 dark:bg-[#1A1A24] rounded-2xl border border-slate-200 dark:border-[#2D3748] p-4 shadow-sm dark:shadow-none relative overflow-hidden mt-1">
                            <div className="flex items-center gap-2">
                                <span className="text-slate-600 dark:text-slate-300 font-extrabold text-[12px]">实付预估</span>
                                {(pricing.savedAmount || 0) > 0 && (
                                    <div className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-md font-bold self-start">
                                        已省 ¥{pricing.savedAmount}
                                    </div>
                                )}
                            </div>
                            <span className="text-[28px] font-black text-indigo-600 dark:text-indigo-400 font-display tracking-tight leading-none">¥<BouncyNumber value={pricing.finalPrice || 0} /></span>
                        </div>
                    </div>

                    <div className="mb-4 relative z-10">
                        <div className="relative">
                            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
                                <div className="bg-orange-100 text-orange-600 text-[10px] font-black px-1.5 py-0.5 rounded shadow-sm">优惠</div>
                            </div>
                            <select
                                value={pricing.discountRate}
                                onChange={(e) => pricing.onDiscountChange?.(parseFloat(e.target.value))}
                                className="w-full appearance-none bg-slate-50 dark:bg-[#1A1A24] border border-slate-200 dark:border-[#2D3748] text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl pl-12 pr-8 py-2 focus:ring-2 focus:ring-indigo-500/20 outline-none cursor-pointer"
                            >
                                {pricing.discountTiers?.map((tier: any) => (
                                    <option key={tier.id} value={tier.multiplier}>
                                        {tier.name}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                        </div>
                        <div className="text-[9px] text-slate-400 font-bold mt-1.5 text-center uppercase tracking-wide">
                            标准价格包含 {((pricingStrategy?.serviceFeeRate ?? 0.06) * 100).toFixed(0)}% 装机售后服务费
                        </div>
                    </div>

                    <div className="flex items-center gap-2 h-10 shrink-0 relative z-10">
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onReset} className="h-full aspect-square flex items-center justify-center bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all border border-rose-100" title="清空配置">
                            <Trash2 size={18} />
                        </motion.button>
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleGeneratePoster} disabled={isGeneratingPoster} className="h-full aspect-square flex items-center justify-center bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition-all border border-indigo-100" title="生成海报">
                            {isGeneratingPoster ? <RefreshCw size={20} className="animate-spin" /> : <Download size={20} />}
                        </motion.button>
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} onClick={onSave} className="h-full px-5 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all text-sm border border-slate-200">
                            保存
                        </motion.button>
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} onClick={handleShareClick} className="h-full flex-1 flex items-center justify-center bg-slate-900 dark:bg-white hover:bg-black dark:hover:bg-slate-200 text-white dark:text-slate-900 font-bold rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.1)] dark:shadow-none transition-all text-sm">
                            <Share2 size={16} className="mr-2 opacity-80" /> 分享
                        </motion.button>
                    </div>
                </div>

                {/* Box 2: Health Check */}
                <div className={`relative p-5 rounded-2xl border transition-all duration-500 overflow-hidden shadow-sm dark:shadow-none ${(health.status === 'perfect' && (!simResult || (simResult.errors?.length === 0 && simResult.warnings?.length === 0)))
                    ? 'bg-emerald-50 dark:bg-[#121218] border-emerald-200 dark:border-emerald-500/20'
                    : 'bg-amber-50 dark:bg-[#121218] border-amber-200 dark:border-amber-500/20'
                    }`}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                            <Zap size={16} className={(health.status === 'perfect' && (!simResult || (simResult.errors?.length === 0 && simResult.warnings?.length === 0))) ? 'text-emerald-500' : 'text-amber-500'} />
                            兼容性检测
                        </h3>
                        {(health.status === 'perfect' && (!simResult || (simResult.errors?.length === 0 && simResult.warnings?.length === 0))) ? (
                            <div className="px-2 py-0.5 rounded-lg bg-emerald-500 text-white text-[8px] font-black uppercase shadow-sm">通过</div>
                        ) : (
                            <div className="px-2 py-0.5 rounded-lg bg-amber-500 text-white text-[8px] font-black uppercase shadow-sm">待检查</div>
                        )}
                    </div>
                    <div className="text-[12px] font-bold">
                        {(health.status === 'perfect' && (!simResult || (simResult.errors?.length === 0 && simResult.warnings?.length === 0))) ? (
                            <div className="text-emerald-700 dark:text-emerald-400 flex items-center gap-2 bg-emerald-100/50 dark:bg-emerald-500/10 p-3 rounded-xl border border-transparent dark:border-emerald-500/20">
                                <CheckCircle2 size={16} /> <span>核心组件完美兼容，方案健康</span>
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {health.issues.map((issue: string, idx: number) => (
                                    <div key={`health-${idx}`} className="flex gap-2.5 text-amber-800 bg-amber-100/30 p-2.5 rounded-[12px]">
                                        <AlertCircle size={14} className="shrink-0 mt-0.5" /> <span className="leading-tight">{issue}</span>
                                    </div>
                                ))}
                                {simResult?.errors?.map((issue: string, idx: number) => (
                                    <div key={`err-${idx}`} className="flex gap-2.5 text-rose-700 bg-rose-100/30 p-2.5 rounded-[12px]">
                                        <AlertCircle size={14} className="shrink-0 mt-0.5" /> <span className="leading-tight">{issue}</span>
                                    </div>
                                ))}
                                {simResult?.warnings?.map((issue: string, idx: number) => (
                                    <div key={`warn-${idx}`} className="flex gap-2.5 text-amber-700 bg-amber-100/30 p-2.5 rounded-[12px]">
                                        <AlertCircle size={14} className="shrink-0 mt-0.5" /> <span className="leading-tight">{issue}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Box 3: 鲁大师跑分与功耗 Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-[#121218] border border-slate-200 dark:border-[#1E293B] shadow-sm dark:shadow-none rounded-2xl p-5 relative overflow-hidden group">
                                <div className="absolute -right-4 -bottom-4 opacity-5 text-indigo-500 group-hover:scale-110 transition-transform duration-500 delay-75"><Activity size={72}/></div>
                                <h4 className="text-[12px] font-extrabold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1.5"><Activity size={14} className="text-indigo-500"/> 鲁大师跑分</h4>
                                <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-display tracking-tighter mt-2">
                                    {simResult && simResult.totalLuScore > 0 ? <BouncyNumber value={simResult.totalLuScore} /> : '---'}
                                </div>
                    </div>
                    <div className="bg-white dark:bg-[#121218] border border-slate-200 dark:border-[#1E293B] shadow-sm dark:shadow-none rounded-2xl p-5 relative overflow-hidden group">
                        <div className="absolute -right-2 -bottom-2 opacity-5 text-amber-500 group-hover:scale-110 transition-transform duration-500 delay-75"><Zap size={72}/></div>
                        <h4 className="text-[12px] font-extrabold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1.5"><Zap size={14} className="text-amber-500"/> 系统峰值功耗</h4>
                        <div className="text-2xl font-black text-slate-800 dark:text-slate-300 font-display tracking-tighter flex items-center mt-2">
                            {simResult && simResult.totalPowerDraw > 0 ? <><BouncyNumber value={simResult.totalPowerDraw} />W</> : '---'}
                        </div>
                        {simResult && simResult.totalPowerDraw > 0 && <div className="text-[9px] text-slate-400 font-bold mt-1 bg-slate-50 dark:bg-slate-800 py-1 px-2 rounded-lg inline-block">推荐电源 {Math.ceil(simResult.totalPowerDraw * 1.3 / 50) * 50}W+</div>}
                        {(!simResult || simResult.totalPowerDraw <= 0) && <div className="text-[9px] text-slate-400/80 font-bold mt-1 whitespace-nowrap">完善配置后可见</div>}
                    </div>
                </div>

                {/* Box 4: 游戏帧率体验测算 */}
                <div className="bg-white dark:bg-[#121218] border border-slate-200 dark:border-[#1E293B] rounded-2xl p-5 shadow-sm dark:shadow-none relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
                    
                    <div className="flex items-center justify-between mb-5 relative z-10">
                        <h3 className="font-extrabold text-slate-900 dark:text-white text-[13px] flex items-center gap-2 tracking-wide">
                            <Gamepad2 size={16} className="text-indigo-400" />
                            游戏试玩体验
                        </h3>
                        <div className="flex gap-1 bg-slate-50 dark:bg-[#1A1A24] p-1 rounded-xl border border-slate-200 dark:border-[#2D3748] shadow-sm dark:shadow-none">
                            {[1080, 1440, 2160].map(res => (
                                <button
                                    key={res}
                                    onClick={() => setResolution(res)}
                                    className={`text-[9px] font-black px-3 py-1 rounded-[8px] transition-all uppercase tracking-wider ${resolution === res ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700/50'}`}
                                >
                                    {res === 1080 ? '1080P' : res === 1440 ? '2K' : '4K'}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-3.5 relative z-10 min-h-[140px]">
                        {loadingFps ? (
                            <div className="py-12 flex flex-col items-center justify-center text-indigo-400 gap-3">
                                <RefreshCw size={24} className="animate-spin opacity-80" />
                                <div className="text-xs font-black tracking-widest uppercase opacity-80">测算帧率数据中...</div>
                            </div>
                        ) : fpsData.length > 0 ? (
                            fpsData.slice(0, 8).map((item, idx) => (
                                    <div key={idx} className="group/item">
                                        <div className="flex justify-between items-end text-[11px] mb-2">
                                            <span className="font-bold text-slate-700 dark:text-slate-300 group-hover/item:text-slate-900 dark:group-hover/item:text-white transition-colors flex items-center gap-1.5 flex-1 min-w-0 pr-2">
                                                <img src={`/images/games/icons/${item.name}.png`} alt="" className="w-4 h-4 rounded-[4px] object-cover bg-slate-100 dark:bg-slate-800 shadow-sm shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                                <span className="truncate">{item.name}</span>
                                            </span>
                                            <div className="flex items-baseline gap-1.5">
                                                {item.lowFps && (
                                                    <span className="flex items-baseline gap-0.5 text-slate-400">
                                                        <span className="text-[10px] uppercase font-bold tracking-wider">Low</span>
                                                        <span className="font-mono text-xs font-bold">{item.lowFps}</span>
                                                    </span>
                                                )}
                                                <div className="flex items-baseline gap-0.5 ml-1">
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
                                        <div className="w-full bg-slate-100 dark:bg-[#1A1A24] rounded-full h-2 overflow-hidden border border-slate-200 dark:border-[#2D3748] relative">
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
                                <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-3 opacity-60">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-[#1A1A24] flex items-center justify-center border border-slate-200 dark:border-[#2D3748]"><Gamepad2 size={24} className="text-slate-400" /></div>
                                    <div className="text-xs font-black text-slate-400 mt-2">添加 CPU/显卡 后展示帧率</div>
                                </div>
                            )}
                        </div>
                </div>
            </div>

            {/* Premium Modal Category Selector */}
            {modalCategory && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
                    <div className="bg-[#FAFAFA] dark:bg-[#121218] rounded-2xl w-full max-w-3xl h-[88vh] flex flex-col shadow-2xl dark:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.7)] overflow-hidden animate-scale-up border border-slate-200 dark:border-[#1E293B]">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-200 dark:border-[#1E293B] flex flex-col gap-5 bg-white/80 dark:bg-[#1A1A24]/80 backdrop-blur-xl sticky top-0 z-10">
                            <div className="flex justify-between items-center text-slate-900 dark:text-white">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-200">
                                        {getIconByCategory(modalCategory)}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black tracking-tight leading-none">选择 {CATEGORY_MAP[modalCategory]}</h2>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">产品选择</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setModalCategory(null)}
                                    className="w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-[#121218] hover:bg-slate-200 dark:hover:bg-[#2D3748] border border-slate-200 dark:border-[#2D3748] rounded-xl transition-all text-slate-400 hover:text-slate-900 dark:hover:text-white active:scale-90"
                                >
                                    <X size={20} strokeWidth={2.5} />
                                </button>
                            </div>

                            <div className="flex flex-col gap-4">
                                <div className="flex gap-3 items-center">
                                    <div className="relative flex-1 group">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                        <input
                                            ref={(el) => modalSearchInputRef.current = el}
                                            type="text"
                                            value={modalSearch}
                                            onChange={(e) => setModalSearch(e.target.value)}
                                            placeholder={`在 ${CATEGORY_MAP[modalCategory]} 中搜寻方案...`}
                                            className="w-full bg-white dark:bg-[#121218] border border-slate-200 dark:border-[#2D3748] rounded-xl py-3.5 pl-12 pr-4 text-sm font-bold placeholder:text-slate-400 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all shadow-sm dark:shadow-none"
                                        />
                                    </div>
                                    <button
                                        onClick={() => setSortOrder(prev => prev === 'default' ? 'asc' : prev === 'asc' ? 'desc' : 'default')}
                                        className={`h-[52px] px-5 rounded-[22px] font-black text-xs flex items-center gap-2 transition-all shrink-0 active:scale-95 ${sortOrder !== 'default'
                                            ? 'bg-slate-900 dark:bg-[#2D3748] text-white shadow-md border border-slate-800 dark:border-[#1E293B]'
                                            : 'bg-white dark:bg-[#121218] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-[#2D3748] shadow-sm dark:shadow-none hover:bg-slate-50 dark:hover:bg-[#2D3748]'
                                            }`}
                                    >
                                        <ArrowRight size={16} className={`transition-transform duration-500 ${sortOrder === 'asc' ? '-rotate-90' : sortOrder === 'desc' ? 'rotate-90' : 'rotate-0'}`} />
                                        <span className="tracking-wider">
                                            {sortOrder === 'default' ? '价格排序' : sortOrder === 'asc' ? '价格最低' : '价格最高'}
                                        </span>
                                    </button>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className={`flex-1 flex gap-2 ${isBrandsExpanded ? 'flex-wrap' : 'overflow-x-auto no-scrollbar scroll-smooth'} items-center pb-2 px-1 mask-linear-fade`}>
                                        {availableBrands.map(brand => (
                                            <button
                                                key={brand}
                                                onClick={() => setModalBrand(brand)}
                                                className={`px-4 py-2 rounded-xl text-[11px] font-black tracking-wide whitespace-nowrap transition-all border shrink-0 tap-active uppercase ${modalBrand === brand
                                                    ? 'bg-indigo-600 dark:bg-indigo-500/20 text-white dark:text-indigo-300 border-indigo-500 dark:border-indigo-500/30'
                                                    : 'bg-white dark:bg-[#121218] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-[#2D3748] hover:border-indigo-200 dark:hover:border-[#2D3748] hover:text-slate-700 dark:hover:text-slate-200'
                                                    }`}
                                            >
                                                {brand === 'all' ? '全部品牌' : brand}
                                            </button>
                                        ))}
                                    </div>
                                    {availableBrands.length > 5 && (
                                        <button
                                            onClick={() => setIsBrandsExpanded(!isBrandsExpanded)}
                                            className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all shrink-0 mt-0.5 shadow-sm dark:shadow-none border ${isBrandsExpanded ? 'bg-slate-100 dark:bg-[#2D3748] text-slate-900 dark:text-white border-slate-200 dark:border-transparent' : 'bg-white dark:bg-[#121218] text-slate-400 border-slate-200 dark:border-[#2D3748]'}`}
                                        >
                                            {isBrandsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </button>
                                    )}
                                </div>

                                {/* DDR4/DDR5 Type Filter - only for RAM */}
                                {modalCategory === 'ram' && (
                                    <div className="flex gap-2 items-center">
                                        {(['all', 'DDR4', 'DDR5'] as const).map(type => (
                                            <button
                                                key={type}
                                                onClick={() => setRamTypeFilter(type)}
                                                className={`px-4 py-1.5 rounded-xl text-[11px] font-black tracking-wide whitespace-nowrap transition-all border shrink-0 ${ramTypeFilter === type
                                                    ? 'bg-indigo-600 dark:bg-indigo-500/20 text-white dark:text-indigo-300 border-indigo-500 dark:border-indigo-500/30'
                                                    : 'bg-white dark:bg-[#121218] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-[#2D3748] hover:border-indigo-200 dark:hover:border-[#2D3748] hover:text-slate-700 dark:hover:text-slate-200'
                                                }`}
                                            >
                                                {type === 'all' ? '全部类型' : type}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Disk Capacity Filter - only for disk */}
                                {modalCategory === 'disk' && (
                                    <div className="flex gap-2 items-center">
                                        {(['all', '500G', '1T', '2T', '4T'] as const).map(cap => (
                                            <button
                                                key={cap}
                                                onClick={() => setDiskCapFilter(cap)}
                                                className={`px-4 py-1.5 rounded-xl text-[11px] font-black tracking-wide whitespace-nowrap transition-all border shrink-0 ${diskCapFilter === cap
                                                    ? 'bg-indigo-600 dark:bg-indigo-500/20 text-white dark:text-indigo-300 border-indigo-500 dark:border-indigo-500/30'
                                                    : 'bg-white dark:bg-[#121218] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-[#2D3748] hover:border-indigo-200 dark:hover:border-[#2D3748] hover:text-slate-700 dark:hover:text-slate-200'
                                                }`}
                                            >
                                                {cap === 'all' ? '全部容量' : cap}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* CPU X3D Filter */}
                                {modalCategory === 'cpu' && (
                                    <div className="flex gap-2 items-center">
                                        {(['all', 'X3D'] as const).map(type => (
                                            <button
                                                key={type}
                                                onClick={() => setCpuTypeFilter(type)}
                                                className={`px-4 py-1.5 rounded-xl text-[11px] font-black tracking-wide whitespace-nowrap transition-all border shrink-0 ${cpuTypeFilter === type
                                                    ? 'bg-indigo-600 dark:bg-indigo-500/20 text-white dark:text-indigo-300 border-indigo-500 dark:border-indigo-500/30'
                                                    : 'bg-white dark:bg-[#121218] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-[#2D3748] hover:border-indigo-200 dark:hover:border-[#2D3748] hover:text-slate-700 dark:hover:text-slate-200'
                                                }`}
                                            >
                                                {type === 'all' ? '全部型号' : type}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Motherboard Platform Filter */}
                                {modalCategory === 'mainboard' && (
                                    <div className="flex gap-2 items-center">
                                        {(['all', 'AMD', 'Intel'] as const).map(plat => (
                                            <button
                                                key={plat}
                                                onClick={() => setMbPlatformFilter(plat)}
                                                className={`px-4 py-1.5 rounded-xl text-[11px] font-black tracking-wide whitespace-nowrap transition-all border shrink-0 ${mbPlatformFilter === plat
                                                    ? 'bg-indigo-600 dark:bg-indigo-500/20 text-white dark:text-indigo-300 border-indigo-500 dark:border-indigo-500/30'
                                                    : 'bg-white dark:bg-[#121218] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-[#2D3748] hover:border-indigo-200 dark:hover:border-[#2D3748] hover:text-slate-700 dark:hover:text-slate-200'
                                                }`}
                                            >
                                                {plat === 'all' ? '全部平台' : plat === 'AMD' ? 'AMD平台' : 'Intel平台'}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Cooling Type Filter */}
                                {modalCategory === 'cooling' && (
                                    <div className="flex gap-2 items-center">
                                        {(['all', 'air', '240', '360'] as const).map(ct => (
                                            <button
                                                key={ct}
                                                onClick={() => setCoolingTypeFilter(ct)}
                                                className={`px-4 py-1.5 rounded-xl text-[11px] font-black tracking-wide whitespace-nowrap transition-all border shrink-0 ${coolingTypeFilter === ct
                                                    ? 'bg-indigo-600 dark:bg-indigo-500/20 text-white dark:text-indigo-300 border-indigo-500 dark:border-indigo-500/30'
                                                    : 'bg-white dark:bg-[#121218] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-[#2D3748] hover:border-indigo-200 dark:hover:border-[#2D3748] hover:text-slate-700 dark:hover:text-slate-200'
                                                }`}
                                            >
                                                {ct === 'all' ? '全部类型' : ct === 'air' ? '风冷' : `${ct}水冷`}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Product List Content */}
                        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
                            <div className="grid gap-4">
                                {isModalLoading ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg mb-4 ring-1 ring-slate-100">
                                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-200 border-t-indigo-600"></div>
                                        </div>
                                        <p className="text-xs font-black uppercase tracking-widest text-slate-300">正在同步数据库...</p>
                                    </div>
                                ) : (
                                    <>
                                        {filteredItems.map(item => {
                                            const isOutOfStock = item.price === 0;
                                            return (
                                                <div
                                                    key={item.id}
                                                    ref={(el) => { if (el) modalItemRefs[item.id] = el; }}
                                                    onClick={() => !isOutOfStock && handleSelect(item)}
                                                    className={`group relative flex items-center gap-5 p-4 rounded-xl bg-white dark:bg-[#121218] border border-slate-200 dark:border-[#1E293B] shadow-sm dark:shadow-none transition-all duration-300 active:scale-[0.98] ${isOutOfStock
                                                        ? 'opacity-50 grayscale cursor-not-allowed'
                                                        : 'hover:border-indigo-200 dark:hover:border-[#2D3748] hover:shadow-md dark:hover:shadow-none cursor-pointer hover:-translate-y-0.5'
                                                        }`}
                                                >
                                                    {/* Product Image Wrapper */}
                                                    <div className="w-20 h-20 bg-slate-50 dark:bg-[#1A1A24] rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/10 group-hover:text-indigo-400 transition-all overflow-hidden border border-slate-200 dark:border-[#2D3748] shrink-0 relative">
                                                        {item.image ? (
                                                            <img
                                                                src={item.image}
                                                                alt={item.model}
                                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setPreviewImage(item.image!);
                                                                }}
                                                            />
                                                        ) : (
                                                            <div className="opacity-40">{getIconByCategory(modalCategory)}</div>
                                                        )}
                                                        {item.isRecommended && (
                                                            <div className="absolute top-0 left-0 bg-orange-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-br-lg shadow-sm">TOP</div>
                                                        )}
                                                    </div>

                                                    {/* Product Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1.5">
                                                            <span className="text-[9px] font-black uppercase text-indigo-500 dark:text-indigo-300 tracking-widest bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md">
                                                                {item.brand}
                                                            </span>
                                                            {isOutOfStock && <span className="text-[9px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded-md font-black uppercase">暂无现货</span>}
                                                            {item.isDiscount && <span className="text-[9px] bg-rose-500 text-white px-2 py-0.5 rounded-md font-black uppercase shadow-sm shadow-rose-200">特价</span>}
                                                            {item.createdAt && (new Date().getTime() - new Date(item.createdAt).getTime() < 30 * 24 * 60 * 60 * 1000) && (
                                                                <span className="text-[9px] bg-emerald-500 text-white px-2 py-0.5 rounded-md font-black uppercase shadow-sm shadow-emerald-200">新品</span>
                                                            )}
                                                        </div>
                                                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-[15px] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-snug tracking-tight mb-2">
                                                            {item.model}
                                                        </h4>
                                                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-400 font-bold">
                                                            {(() => {
                                                                let specsObj = item.specs;
                                                                if (typeof specsObj === 'string') {
                                                                    try { specsObj = JSON.parse(specsObj); } catch { specsObj = {}; }
                                                                }
                                                                if (!specsObj || typeof specsObj !== 'object') specsObj = {};

                                                                const specEntries = Object.entries(specsObj).filter(([k, val]) => val && String(val).trim() !== '' && !k.startsWith('jd_'));
                                                                if (specEntries.length === 0) return null;

                                                                return specEntries.slice(0, 2).map(([key, val]) => (
                                                                    <div key={key} className="flex items-center gap-1">
                                                                        <div className="w-1 h-1 rounded-full bg-slate-200"></div>
                                                                        <span>{String(val)}</span>
                                                                    </div>
                                                                ));
                                                            })()}
                                                        </div>
                                                    </div>

                                                    {/* Price Tag & JD Buy */}
                                                    <div className="flex flex-col items-end gap-2 shrink-0 ml-2">
                                                        <div className={`font-bold font-display tracking-tight transition-all ${isOutOfStock ? 'text-slate-400 dark:text-slate-600 text-base' : 'text-xl text-slate-900 dark:text-white group-hover:scale-105'}`}>
                                                            {isOutOfStock ? '—' : `¥${item.price}`}
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            {(() => {
                                                                let s = item.specs;
                                                                if (typeof s === 'string') { try { s = JSON.parse(s); } catch { s = {}; } }
                                                                const jdUrl = (s && typeof s === 'object') ? (s as any).jd_url : null;
                                                                if (!jdUrl || isOutOfStock) return null;
                                                                return (
                                                                    <a
                                                                        href={jdUrl}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        className="flex items-center gap-1 px-2.5 py-1.5 bg-[#E2231A] hover:bg-[#C81912] text-white text-[10px] font-black rounded-lg transition-all shadow-sm hover:shadow-md hover:shadow-red-200 active:scale-95 whitespace-nowrap"
                                                                        title="在京东购买"
                                                                    >
                                                                        <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current"><path d="M19.451 4.926c-.398-.354-.93-.561-1.49-.561h-.001c-.563 0-1.092.207-1.49.561L12 8.926l-4.47-4c-.398-.354-.93-.561-1.49-.561-.563 0-1.092.207-1.49.561L2 7.076V18.5a1.5 1.5 0 001.5 1.5h17a1.5 1.5 0 001.5-1.5V7.076l-2.549-2.15z"/></svg>
                                                                        京东购买
                                                                    </a>
                                                                );
                                                            })()}
                                                            {!isOutOfStock && (
                                                                <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-[#1A1A24] group-hover:bg-slate-900 dark:group-hover:bg-[#2D3748] text-slate-400 group-hover:text-white flex items-center justify-center transition-all border border-slate-200 dark:border-[#2D3748] shadow-sm">
                                                                    <ArrowRight size={16} />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {filteredItems.length === 0 && (
                                            <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                                                <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 opacity-50">
                                                    <Search size={32} strokeWidth={1.5} />
                                                </div>
                                                <p className="text-sm font-black uppercase tracking-widest italic">未找到匹配的产品</p>
                                                <button onClick={() => { setModalSearch(''); setModalBrand('all'); }} className="mt-4 text-xs font-bold text-indigo-500 hover:text-indigo-700 underline underline-offset-4">重置筛选条件</button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div >
            )
            }

            {showAiModal && <AiGenerateModal key="ai-modal" onClose={() => setShowAiModal(false)} onSubmit={handleAiBuild} />}
        </div >
    );
}

export default VisualBuilder;
