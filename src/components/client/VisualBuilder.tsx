
import { useState, useMemo, useCallback, useEffect, type UIEvent } from 'react';
import { Sparkles, X, Search, Zap, CheckCircle2, AlertCircle, RefreshCw, FileText, ChevronDown, ArrowRight, Plus, ChevronUp, Info, Activity, Gamepad2, Bell } from 'lucide-react';
import { createPortal } from 'react-dom';
import { BuildEntry, HardwareItem, Category, SystemAnnouncementSettings } from '../../types/clientTypes';
import { CATEGORY_MAP } from '../../data/clientData';
import { storage } from '../../services/storage';
import { aiBuilder } from '../../services/aiBuilder';
import { getIconByCategory } from './Shared';
import { AiGenerateModal } from './AiGenerateModal';
import PC3DViewer from './PC3DViewer';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { gamesFpsData, gamesList, Resolution } from '../../data/gameFpsData';

const MODAL_ITEM_BATCH_SIZE = 40;
const DESKTOP_VISUAL_COLUMN_HEIGHT = 'lg:h-[clamp(720px,calc(100dvh-196px),860px)]';

type MonitorResolutionFilter = 'all' | '1K' | '2K' | '4K' | '5K';
type MonitorRefreshFilter = 'all' | '60' | '75' | '100' | '144' | '180' | '240' | '300';
type MonitorSizeFilter = 'all' | '22' | '24' | '25' | '27' | '32' | '34' | '49';
type Pc3dMatchKind = 'exact' | 'similar' | 'none';

interface Pc3dProductMatch {
    product_id: string;
    match_kind: Pc3dMatchKind | string;
    match_label?: string;
    review_status?: string;
    confidence?: number;
    asset_id?: string;
    asset_label?: string;
    asset_model_url?: string;
}

const CUSTOMER_VISIBLE_PC3D_STATUSES = new Set(['auto_exact', 'manual_approved']);

function isCustomerVisiblePc3dMatch(match?: Pc3dProductMatch | null) {
    return Boolean(
        match &&
        match.match_kind === 'exact' &&
        CUSTOMER_VISIBLE_PC3D_STATUSES.has(String(match.review_status || '')) &&
        (match.asset_id || match.asset_model_url)
    );
}

const parseSpecsObject = (rawSpecs: unknown): Record<string, any> => {
    let parsed = rawSpecs;
    for (let i = 0; i < 3 && typeof parsed === 'string'; i += 1) {
        try {
            parsed = JSON.parse(parsed);
        } catch {
            return {};
        }
    }
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, any> : {};
};

const detectMonitorResolution = (text: string): Exclude<MonitorResolutionFilter, 'all'> | null => {
    const normalized = text.toLowerCase().replace(/×/g, 'x');
    if (/(?<![a-z0-9])5k(?=\d{2,3}(?!\d)|[^a-z0-9]|$)|5120\s*[x*]\s*(1440|2160)|5120/.test(normalized)) return '5K';
    if (/(?<![a-z0-9])4k(?=\d{2,3}(?!\d)|[^a-z0-9]|$)|3840\s*[x*]\s*2160|2160p|uhd/.test(normalized)) return '4K';
    if (/(?<![a-z0-9])2k(?=\d{2,3}(?!\d)|[^a-z0-9]|$)|2560\s*[x*]\s*1440|1440p|qhd/.test(normalized)) return '2K';
    if (/(?<![a-z0-9])1k(?=\d{2,3}(?!\d)|[^a-z0-9]|$)|1920\s*[x*]\s*1080|1080p|fhd/.test(normalized)) return '1K';
    return null;
};

const detectMonitorRefresh = (text: string): number | null => {
    const values = Array.from(text.matchAll(/(\d{2,3})\s*(?:hz|赫兹)/gi), match => Number(match[1]));
    values.push(...Array.from(text.matchAll(/[1254]k\s*(\d{2,3})(?!\d)/gi), match => Number(match[1])));
    return values.length ? Math.max(...values) : null;
};

const detectMonitorSize = (text: string): number | null => {
    const sizeMatch = text.match(/(\d{2}(?:\.\d)?)\s*(?:英寸|寸)/);
    if (sizeMatch) return Number(sizeMatch[1]);
    const codeMatch = text.match(/[A-Za-z]*([2-4]\d)[A-Za-z0-9]*/);
    if (!codeMatch) return null;
    const size = Number(codeMatch[1]);
    return size >= 22 && size <= 49 ? size : null;
};

const matchesMonitorRefreshBand = (value: number | null, filter: MonitorRefreshFilter) => {
    if (filter === 'all') return true;
    if (value === null) return false;
    const ranges: Record<Exclude<MonitorRefreshFilter, 'all'>, [number, number]> = {
        '60': [0, 60],
        '75': [61, 99],
        '100': [100, 139],
        '144': [140, 169],
        '180': [170, 219],
        '240': [220, 299],
        '300': [300, Infinity],
    };
    const [min, max] = ranges[filter];
    return value >= min && value <= max;
};

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
    onAiModalClose
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
    const [modalPc3dFilter, setModalPc3dFilter] = useState<'all' | 'with3d'>('all');
    const [monitorResolutionFilter, setMonitorResolutionFilter] = useState<MonitorResolutionFilter>('all');
    const [monitorRefreshFilter, setMonitorRefreshFilter] = useState<MonitorRefreshFilter>('all');
    const [monitorSizeFilter, setMonitorSizeFilter] = useState<MonitorSizeFilter>('all');
    const [sortOrder, setSortOrder] = useState<'default' | 'asc' | 'desc'>('default');
    const [isBrandsExpanded, setIsBrandsExpanded] = useState(false);
    const [showAiModal, setShowAiModal] = useState(false);

    // Category-specific items for the selector
    const [modalItems, setModalItems] = useState<HardwareItem[]>([]);
    const [isModalLoading, setIsModalLoading] = useState(false);
    const [visibleItemCount, setVisibleItemCount] = useState(MODAL_ITEM_BATCH_SIZE);
    const [pc3dProductMatches, setPc3dProductMatches] = useState<Record<string, Pc3dProductMatch>>({});

    useEffect(() => {
        let cancelled = false;

        const loadPc3dMapping = async () => {
            let data: { products?: Pc3dProductMatch[] } | null = null;
            for (const url of ['/api/pc3d/mapping', '/data/pc3d/product-model-mapping.json']) {
                try {
                    const res = await fetch(url, { cache: 'no-store' });
                    if (!res.ok) continue;
                    data = await res.json();
                    break;
                } catch {
                    // Fall through to the static mapping file.
                }
            }
            if (cancelled || !Array.isArray(data?.products)) return;
            const nextMatches = data.products.reduce((acc: Record<string, Pc3dProductMatch>, item: Pc3dProductMatch) => {
                if (item.product_id) acc[String(item.product_id)] = item;
                return acc;
            }, {});
            setPc3dProductMatches(nextMatches);
        };

        loadPc3dMapping().catch(() => {
            if (!cancelled) setPc3dProductMatches({});
        });

        return () => {
            cancelled = true;
        };
    }, []);

    // Handle external trigger for AI Modal
    useEffect(() => {
        if (openAiModal) {
            setShowAiModal(true);
            if (onAiModalClose) onAiModalClose();
        }
    }, [openAiModal, onAiModalClose]);
    const [aiActiveCategory, setAiActiveCategory] = useState<Category | null>(null);
    const [aiResult, setAiResult] = useState<import('../../services/aiBuilder').AIBuildResult | null>(null);
    const [isAiApplying, setIsAiApplying] = useState(false);

    useEffect(() => {
        const hasConfiguredItem = buildList.some(entry => entry.item || entry.customName || entry.customPrice);
        if (!hasConfiguredItem && aiResult && aiResult.status !== 'blocked') {
            setAiResult(null);
            setAiActiveCategory(null);
            setIsAiApplying(false);
        }
    }, [buildList, aiResult]);

    // Track row elements for ghost cursor target
    const rowRefs = useState<Record<string, HTMLDivElement | null>>({})[0];
    const modalSearchInputRef = useState<{ current: HTMLInputElement | null }>({ current: null })[0];
    const modalItemRefs = useState<Record<string, HTMLDivElement | null>>({})[0];


    const [sysAnnouncement, setSysAnnouncement] = useState<SystemAnnouncementSettings | null>(null);

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

    const resetModalFilters = () => {
        setModalSearch('');
        setModalBrand('all');
        setSortOrder('default');
        setIsBrandsExpanded(false);
        setRamTypeFilter('all');
        setDiskCapFilter('all');
        setCpuTypeFilter('all');
        setMbPlatformFilter('all');
        setCoolingTypeFilter('all');
        setModalPc3dFilter('all');
        setMonitorResolutionFilter('all');
        setMonitorRefreshFilter('all');
        setMonitorSizeFilter('all');
        setVisibleItemCount(MODAL_ITEM_BATCH_SIZE);
    };

    const openSelector = async (entry: BuildEntry) => {
        setModalCategory(entry.category);
        setModalEntryId(entry.id);
        resetModalFilters();

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

    useEffect(() => {
        setVisibleItemCount(MODAL_ITEM_BATCH_SIZE);
    }, [modalCategory, modalBrand, modalSearch, sortOrder, ramTypeFilter, diskCapFilter, cpuTypeFilter, mbPlatformFilter, coolingTypeFilter, modalPc3dFilter, monitorResolutionFilter, monitorRefreshFilter, monitorSizeFilter]);

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
            setAiResult(result);

            if (result.status === 'blocked') {
                setAiActiveCategory(null);
                return;
            }

            setIsAiApplying(true);
            await new Promise(r => setTimeout(r, 220));

            for (const entry of buildList) {
                const cat = entry.category;
                const targetItem = result.items[cat as keyof typeof result.items];

                if (targetItem && typeof targetItem === 'object' && typeof targetItem.model === 'string') {
                    const updateData: any = { item: targetItem, customPrice: undefined, customName: undefined };
                    if (cat === 'fan' && (targetItem as any).count) {
                        updateData.quantity = (targetItem as any).count;
                    }
                    onUpdate(entry.id, updateData);
                }
            }

            setAiActiveCategory(null);
            await new Promise(r => setTimeout(r, 260));
            setIsAiApplying(false);

        } catch (error) {
            console.error("AI Generation Failed:", error);
            setShowAiModal(false);
            setAiActiveCategory(null);
            setIsAiApplying(false);
            alert("AI 生成失败，请重试");
        }
    }, [buildList, onUpdate, rowRefs, modalSearchInputRef, modalItemRefs]);

    const filteredItems = useMemo(() => {
        if (!modalCategory) return [];

        const searchStr = modalSearch.toLowerCase().trim();
        const searchTerms = searchStr ? searchStr.split(/\s+/) : [];

        let items = modalItems.filter(i => {
            if (i.category !== modalCategory) return false;
            if (modalBrand !== 'all' && i.brand !== modalBrand) return false;
            if (modalPc3dFilter === 'with3d') {
                const pc3dMatch = pc3dProductMatches[String(i.id)];
                if (!isCustomerVisiblePc3dMatch(pc3dMatch)) return false;
            }
            if (searchStr) {
                const searchableText = `${i.brand} ${i.model} ${CATEGORY_MAP[i.category] || i.category}`.toLowerCase();
                if (!searchTerms.every(term => searchableText.includes(term))) return false;
            }
            // 解析 specs 为对象，修复 TypeScript 严格模式下的类型检查 (防止 never type 报错)
            const rawSpecs: any = i.specs;
            const specsObj = parseSpecsObject(rawSpecs);
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

            if (modalCategory === 'monitor') {
                const monitorText = `${i.model || ''} ${JSON.stringify(specsObj)}`;
                if (monitorResolutionFilter !== 'all' && detectMonitorResolution(monitorText) !== monitorResolutionFilter) return false;
                if (!matchesMonitorRefreshBand(detectMonitorRefresh(monitorText), monitorRefreshFilter)) return false;
                if (monitorSizeFilter !== 'all') {
                    const size = detectMonitorSize(monitorText);
                    if (size === null || Math.round(size) !== Number(monitorSizeFilter)) return false;
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
    }, [modalCategory, modalItems, modalBrand, modalSearch, sortOrder, ramTypeFilter, diskCapFilter, cpuTypeFilter, mbPlatformFilter, coolingTypeFilter, modalPc3dFilter, pc3dProductMatches, monitorResolutionFilter, monitorRefreshFilter, monitorSizeFilter]);

    const visibleModalItems = useMemo(
        () => filteredItems.slice(0, visibleItemCount),
        [filteredItems, visibleItemCount]
    );

    const handleModalListScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
        const target = event.currentTarget;
        const distanceToBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
        if (distanceToBottom > 280) return;

        setVisibleItemCount(prev => {
            if (prev >= filteredItems.length) return prev;
            return Math.min(prev + MODAL_ITEM_BATCH_SIZE, filteredItems.length);
        });
    }, [filteredItems.length]);

    const availableBrands = useMemo(() => {
        if (!modalCategory) return [];
        const brands = new Set(modalItems.filter(i => i.category === modalCategory).map(i => i.brand));
        return ['all', ...Array.from(brands)];
    }, [modalCategory, modalItems]);
    const pc3dAvailableCount = useMemo(() => {
        if (!modalCategory) return 0;
        return modalItems.filter(item => {
            if (item.category !== modalCategory) return false;
            const match = pc3dProductMatches[String(item.id)];
            return isCustomerVisiblePc3dMatch(match);
        }).length;
    }, [modalCategory, modalItems, pc3dProductMatches]);
    const modalCategoryLabel = modalCategory ? (CATEGORY_MAP[modalCategory] || modalCategory) : '当前分类';

    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const simErrors = simResult?.errors ?? [];
    const simWarnings = simResult?.warnings ?? [];
    const allBuildIssues = [...health.issues, ...simErrors, ...simWarnings];
    const issueCount = allBuildIssues.length;
    const selectedItemCount = buildList.filter(entry => entry.item || entry.customName).length;
    const hasSelectedItems = selectedItemCount > 0;
    const isBuildHealthy = hasSelectedItems && health.status === 'perfect' && simErrors.length === 0 && simWarnings.length === 0;
    const recommendedPower = simResult?.recommendedPower || (simResult?.totalPowerDraw ? Math.ceil(simResult.totalPowerDraw * 1.3 / 50) * 50 : 0);
    const desktopAnnouncementItems = useMemo(() => {
        const items = sysAnnouncement?.enabled ? (sysAnnouncement.items ?? []) : [];
        return [...items]
            .filter(item => item.content?.trim())
            .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)));
    }, [sysAnnouncement]);
    const hasDesktopAnnouncements = desktopAnnouncementItems.length > 0;
    const primaryAnnouncement = desktopAnnouncementItems[0];
    const announcementText = primaryAnnouncement?.content?.trim() || '暂无系统公告，当前页面以装机配置、3D 预览和价格为主。';
    const announcementToneClass = primaryAnnouncement?.type === 'warning'
        ? 'border-amber-200 bg-amber-50/90 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200'
        : primaryAnnouncement?.type === 'promo'
            ? 'border-indigo-200 bg-indigo-50/90 text-indigo-900 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-200'
            : 'border-slate-200 bg-white/90 text-slate-800 dark:border-[#1E293B] dark:bg-[#121218]/90 dark:text-slate-200';
    const announcementIconClass = primaryAnnouncement?.type === 'warning'
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200'
        : primaryAnnouncement?.type === 'promo'
            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200'
            : 'bg-slate-100 text-slate-500 dark:bg-[#1A1A24] dark:text-slate-300';
    const getPc3dMatch = useCallback((item?: HardwareItem | null) => {
        if (!item) return null;
        return pc3dProductMatches[String(item.id)] || null;
    }, [pc3dProductMatches]);
    const renderPc3dBadge = (match: Pc3dProductMatch | null, compact = false) => {
        if (!isCustomerVisiblePc3dMatch(match)) return null;
        const title = match?.asset_label || match?.match_label || undefined;
        return (
            <span
                className={`${compact ? 'px-1.5 py-0.5 text-[8px]' : 'px-2 py-0.5 text-[9px]'} shrink-0 rounded-md bg-emerald-50 font-black text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20`}
                title={title}
            >
                {compact ? '有3D' : '有3D模型'}
            </span>
        );
    };
    const aiStatus = aiResult?.status || 'ready';
    const aiStatusLabel = aiStatus === 'blocked' ? '不可直接采用' : aiStatus === 'needs_confirmation' ? '需要确认' : '可直接采用';
    const aiStatusClass = aiStatus === 'blocked'
        ? 'bg-rose-50 border-rose-100 text-rose-700'
        : aiStatus === 'needs_confirmation'
            ? 'bg-amber-50 border-amber-100 text-amber-700'
            : 'bg-emerald-50 border-emerald-100 text-emerald-700';
    const aiStatusHint = aiStatus === 'blocked'
        ? '不要直接发给客户'
        : aiStatus === 'needs_confirmation'
            ? '先确认取舍点'
            : '可作为成交方案';
    const aiFinalPrice = Math.round(aiResult?.checks?.budget?.finalPrice || aiResult?.finalPrice || aiResult?.totalPrice || 0);
    const aiUnmatchedTerms = aiResult?.checks?.requestedItems?.unmatched || [];

    const renderAiResultSummary = () => {
        if (!aiResult) return null;

        return (
            <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-[#1E293B] dark:bg-[#121218] dark:shadow-none">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">配单结论</span>
                            <span className={`rounded-lg border px-2.5 py-1 text-[12px] font-black ${aiStatusClass}`}>
                                {aiStatusLabel}
                            </span>
                            <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-black text-slate-500 dark:border-[#2D3748] dark:bg-[#0B0B10] dark:text-slate-300">
                                {aiStatusHint}
                            </span>
                        </div>
                        <div className="mt-2 text-sm font-bold leading-6 text-slate-700 dark:text-slate-200">
                            {aiUnmatchedTerms.length ? (
                                <span className="text-amber-700 dark:text-amber-300">
                                    未找到点名型号：{aiUnmatchedTerms.map(item => item.term).join('、')}
                                </span>
                            ) : aiStatus === 'blocked' ? (
                                <span className="text-rose-700 dark:text-rose-300">当前条件下不能生成可成交配置。</span>
                            ) : (
                                <span>真实库存、最终价和兼容校验已完成。</span>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 md:min-w-[420px]">
                        <div className={`rounded-lg border px-2.5 py-2 ${aiResult.checks?.budget?.ok ? 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300' : 'border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300'}`}>
                            <div className="text-[9px] font-black uppercase opacity-70">最终价</div>
                            <div className="mt-1 truncate text-[13px] font-black">¥{aiFinalPrice}</div>
                        </div>
                        <div className={`rounded-lg border px-2.5 py-2 ${aiResult.checks?.compatibility?.ok ? 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300' : 'border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300'}`}>
                            <div className="text-[9px] font-black uppercase opacity-70">兼容</div>
                            <div className="mt-1 truncate text-[13px] font-black">{aiResult.checks?.compatibility?.ok ? '通过' : '有风险'}</div>
                        </div>
                        <div className={`rounded-lg border px-2.5 py-2 ${aiResult.checks?.requestedItems?.ok ? 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300' : 'border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300'}`}>
                            <div className="text-[9px] font-black uppercase opacity-70">点名</div>
                            <div className="mt-1 truncate text-[13px] font-black">
                                {aiResult.checks?.requestedItems?.items?.length || aiUnmatchedTerms.length ? (aiResult.checks?.requestedItems?.ok ? '已满足' : '有平替') : '未点名'}
                            </div>
                        </div>
                        <div className={`rounded-lg border px-2.5 py-2 ${aiResult.checks?.completeness?.ok !== false ? 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300' : 'border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300'}`}>
                            <div className="text-[9px] font-black uppercase opacity-70">完整度</div>
                            <div className="mt-1 truncate text-[13px] font-black">{aiResult.checks?.completeness?.ok === false ? '缺关键项' : '已选齐'}</div>
                        </div>
                    </div>
                </div>

                <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                    <p className="max-h-20 overflow-y-auto whitespace-pre-wrap text-xs font-medium leading-5 text-slate-600 dark:text-slate-300">
                        {aiResult.description}
                    </p>
                    {aiResult.alternatives?.length ? (
                        <div className="flex flex-wrap gap-2 lg:max-w-[360px] lg:justify-end">
                            {aiResult.alternatives.slice(0, 3).map((item, index) => (
                                <span key={index} className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-black text-slate-600 dark:border-[#2D3748] dark:bg-[#0B0B10] dark:text-slate-300">
                                    {item}
                                </span>
                            ))}
                        </div>
                    ) : null}
                </div>
            </div>
        );
    };

    const renderBuildSummarySection = () => (
        <div className="hidden lg:flex shrink-0 flex-col gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm dark:border-[#1E293B] dark:bg-[#121218] dark:shadow-none">
            <div className="grid grid-cols-4 gap-2">
                <div className="min-w-0 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5 dark:border-[#1E293B] dark:bg-[#0B0B10]">
                    <div className="text-[9px] font-black text-slate-400">已选配件</div>
                    <div className="mt-1 flex items-baseline gap-1 text-slate-900 dark:text-white">
                        <span className="text-[16px] font-black leading-none">{selectedItemCount}</span>
                        <span className="text-[10px] font-bold text-slate-400">/{buildList.length}</span>
                    </div>
                </div>
                <div className={`min-w-0 rounded-lg border px-2.5 py-1.5 ${isBuildHealthy ? 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300' : hasSelectedItems ? 'border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300' : 'border-slate-100 bg-slate-50 text-slate-500 dark:border-[#1E293B] dark:bg-[#0B0B10] dark:text-slate-300'}`}>
                    <div className="flex items-center gap-1 text-[9px] font-black opacity-80">
                        <CheckCircle2 size={11} />
                        兼容状态
                    </div>
                    <div className="mt-1 truncate text-[13px] font-black">{isBuildHealthy ? '通过' : hasSelectedItems ? `${issueCount || 0} 项提示` : '待配置'}</div>
                </div>
                <div className="min-w-0 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5 dark:border-[#1E293B] dark:bg-[#0B0B10]">
                    <div className="flex items-center gap-1 text-[9px] font-black text-slate-400">
                        <Activity size={11} className="text-indigo-500" />
                        鲁大师跑分
                    </div>
                    <div className="mt-1 truncate text-[13px] font-black text-indigo-600 dark:text-indigo-400">
                        {simResult && simResult.totalLuScore > 0 ? <BouncyNumber value={simResult.totalLuScore} /> : '---'}
                    </div>
                </div>
                <div className="min-w-0 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5 dark:border-[#1E293B] dark:bg-[#0B0B10]">
                    <div className="flex items-center gap-1 text-[9px] font-black text-slate-400">
                        <Zap size={11} className="text-amber-500" />
                        整机功耗
                    </div>
                    <div className="mt-1 truncate text-[13px] font-black text-slate-900 dark:text-slate-100">
                        {simResult && simResult.totalPowerDraw > 0 ? <><BouncyNumber value={simResult.totalPowerDraw} />W</> : '---'}
                    </div>
                </div>
            </div>

            <div className={`flex min-h-[36px] items-center justify-between gap-3 rounded-lg border px-2.5 py-1.5 ${isBuildHealthy ? 'border-emerald-100 bg-emerald-50/80 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200' : issueCount > 0 ? 'border-amber-100 bg-amber-50/90 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200' : 'border-slate-100 bg-slate-50 text-slate-600 dark:border-[#1E293B] dark:bg-[#0B0B10] dark:text-slate-300'}`}>
                <div className="flex min-w-0 items-center gap-2">
                    {isBuildHealthy ? <CheckCircle2 size={15} className="shrink-0" /> : issueCount > 0 ? <AlertCircle size={15} className="shrink-0" /> : <Info size={15} className="shrink-0" />}
                    <div className="min-w-0">
                        <div className="text-[10px] font-black leading-none">{isBuildHealthy ? '兼容检查通过' : issueCount > 0 ? `${issueCount} 项需要确认` : '等待兼容检查'}</div>
                        <div className="mt-0.5 truncate text-[11px] font-bold opacity-75">
                            {isBuildHealthy ? 'CPU、主板、内存与功耗状态暂无风险' : issueCount > 0 ? allBuildIssues[0] : '选择 CPU、主板、内存后会显示具体提示'}
                        </div>
                    </div>
                </div>
                <div className="shrink-0 rounded-md border border-current/10 bg-white/45 px-2 py-1 text-[10px] font-black dark:bg-black/10">
                    {recommendedPower > 0 ? `推荐电源 ${recommendedPower}W+` : '功耗待测'}
                </div>
            </div>
        </div>
    );

    const renderGameFpsSection = () => (
        <div className="bg-[#F6F6FD] dark:bg-[#121218] lg:bg-white lg:dark:bg-[#121218] lg:rounded-xl lg:border lg:border-slate-200 lg:dark:border-[#1E293B] p-4 lg:p-3 relative overflow-hidden lg:shadow-sm lg:dark:shadow-none">
            <div className="absolute right-0 top-0 w-48 h-48 bg-indigo-500/10 lg:bg-indigo-500/[0.04] rounded-full blur-3xl pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
            
            <div className="flex items-center justify-between mb-5 lg:mb-2.5 relative z-10">
                <h3 className="font-extrabold text-slate-900 dark:text-white text-[14px] lg:text-[12px] flex items-center gap-1.5 tracking-wide">
                    <Gamepad2 size={16} className="text-indigo-500 lg:w-3.5 lg:h-3.5" />
                    游戏试玩体验
                </h3>
                <div className="flex gap-1 bg-white dark:bg-[#1A1A24] lg:bg-slate-100 lg:dark:bg-[#1A1A24] p-0.5 rounded-[12px] lg:rounded-lg shadow-sm lg:shadow-none border border-transparent lg:border-slate-200 lg:dark:border-[#2D3748]">
                    {[1080, 1440, 2160].map(res => (
                        <button
                            key={res}
                            onClick={() => setResolution(res)}
                            className={`text-[9px] font-black px-3 lg:px-2.5 py-1.5 lg:py-1 rounded-[10px] lg:rounded-md transition-all uppercase tracking-wider ${resolution === res ? 'bg-[#5B5CE6] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'}`}
                        >
                            {res === 1080 ? '1080P' : res === 1440 ? '2K' : '4K'}
                        </button>
                    ))}
                </div>
            </div>
            <div className="space-y-3.5 lg:space-y-2 relative z-10 min-h-[140px] lg:min-h-[96px]">
                {loadingFps ? (
                    <div className="py-12 lg:py-8 flex flex-col items-center justify-center text-indigo-400 gap-3 lg:gap-2">
                        <RefreshCw size={24} className="animate-spin opacity-80 lg:w-5 lg:h-5" />
                        <div className="text-xs lg:text-[10px] font-black tracking-widest uppercase opacity-80">测算帧率数据中...</div>
                    </div>
                ) : fpsData.length > 0 ? (
                    fpsData.slice(0, 6).map((item, idx) => (
                            <div key={idx} className="group/item">
                                <div className="flex justify-between items-center text-[11px] lg:text-[10px] mb-2 lg:mb-1.5">
                                    <span className="font-bold text-slate-700 dark:text-slate-300 group-hover/item:text-slate-900 dark:group-hover/item:text-white transition-colors flex items-center gap-1.5 flex-1 min-w-0 pr-2">
                                        <img src={`/images/games/icons/${item.name}.png`} alt="" className="w-4 h-4 rounded-[4px] object-cover bg-slate-100 dark:bg-slate-800 shadow-sm shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                        <span className="truncate">{item.name}</span>
                                    </span>
                                    <div className="flex items-baseline gap-1.5 shrink-0">
                                        {item.lowFps && (
                                            <span className="flex items-baseline justify-end gap-0.5 text-slate-400 w-12">
                                                <span className="text-[10px] lg:text-[8px] uppercase font-bold tracking-wider">Low</span>
                                                <span className="font-mono text-xs lg:text-[10px] font-bold">{item.lowFps}</span>
                                            </span>
                                        )}
                                        <div className="flex items-baseline justify-end gap-0.5 ml-1 w-14">
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
                                <div className="w-full bg-slate-200/60 dark:bg-[#1A1A24] rounded-full h-[6px] lg:h-1 overflow-hidden relative">
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
                        <div className="py-12 lg:py-8 flex flex-col items-center justify-center text-slate-500 gap-3 lg:gap-2 opacity-60">
                            <div className="w-12 h-12 lg:w-10 lg:h-10 rounded-2xl lg:rounded-xl bg-slate-50 dark:bg-[#1A1A24] flex items-center justify-center border border-slate-200 dark:border-[#2D3748]"><Gamepad2 size={24} className="text-slate-400 lg:w-5 lg:h-5" /></div>
                            <div className="text-xs lg:text-[10px] font-black text-slate-400 mt-2 lg:mt-1">添加 CPU/显卡 后展示帧率</div>
                        </div>
                    )}
                </div>
        </div>
    );

    return (
        <div className="grid grid-cols-1 gap-3 xl:gap-4 relative lg:grid-cols-[minmax(390px,0.9fr)_minmax(0,1.1fr)] lg:items-stretch">

            {/* Image Preview Modal */}
            {previewImage && typeof document !== 'undefined' && createPortal((
                <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setPreviewImage(null)}>
                    <div
                        className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl p-2 shadow-2xl animate-scale-up"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img src={previewImage} alt="Preview" className="w-full h-full object-contain rounded-xl max-h-[85vh]" />
                        <button
                            onClick={() => setPreviewImage(null)}
                            className="absolute -top-4 -right-4 bg-white rounded-full p-2 text-slate-800 shadow-lg hover:text-red-500 transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>
            ), document.body)}

            {isAiApplying && typeof document !== 'undefined' && createPortal((
                <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/35 backdrop-blur-sm">
                    <div className="rounded-2xl border border-white/60 bg-white/95 px-5 py-4 shadow-2xl dark:border-white/10 dark:bg-[#121218]/95">
                        <div className="flex items-center gap-3">
                            <RefreshCw size={18} className="animate-spin text-indigo-600 dark:text-indigo-400" />
                            <div>
                                <div className="text-sm font-black text-slate-900 dark:text-white">正在应用整套配置</div>
                                <div className="mt-0.5 text-xs font-bold text-slate-500 dark:text-slate-400">已完成库存、预算和兼容校验，正在一次性写入工作台。</div>
                            </div>
                        </div>
                    </div>
                </div>
            ), document.body)}

            <div className={`hidden lg:grid lg:col-span-2 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border px-3 py-2 shadow-sm backdrop-blur-xl dark:shadow-none ${announcementToneClass}`}>
                <button
                    type="button"
                    onClick={() => primaryAnnouncement?.linkUrl && window.open(primaryAnnouncement.linkUrl, '_blank')}
                    className={`flex min-w-0 items-center gap-2 text-left ${primaryAnnouncement?.linkUrl ? 'cursor-pointer hover:opacity-85' : 'cursor-default'}`}
                >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${announcementIconClass}`}>
                        {primaryAnnouncement?.type === 'warning' ? <AlertCircle size={15} /> : primaryAnnouncement?.type === 'promo' ? <Sparkles size={15} /> : <Bell size={15} />}
                    </div>
                    <div className="shrink-0">
                        <div className="text-[11px] font-black leading-none">系统公告</div>
                        <div className="mt-1 text-[9px] font-black uppercase opacity-55">
                            {hasDesktopAnnouncements ? `${desktopAnnouncementItems.length} 条` : '暂无'}
                        </div>
                    </div>
                    <div className="min-w-0 flex-1 truncate text-[12px] font-bold leading-5">
                        {announcementText}
                    </div>
                    {hasDesktopAnnouncements && desktopAnnouncementItems.length > 1 && (
                        <div className="shrink-0 rounded-md border border-current/10 bg-white/45 px-1.5 py-0.5 text-[9px] font-black opacity-80 dark:bg-black/10">
                            +{desktopAnnouncementItems.length - 1}
                        </div>
                    )}
                </button>

                <div className="flex shrink-0 items-center justify-end gap-2">
                    <motion.button
                        type="button"
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                            if (onAiCheck && !onAiCheck()) return;
                            setShowAiModal(true);
                        }}
                        className="group flex h-9 items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-600 px-3 text-[11px] font-black text-white shadow-sm shadow-indigo-500/15 transition-colors hover:bg-indigo-500 dark:border-indigo-500/20"
                    >
                        <Sparkles size={13} className="animate-pulse" />
                        <span className="whitespace-nowrap">AI 装机</span>
                    </motion.button>
                    <motion.button
                        type="button"
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onOpenLibrary}
                        className="group flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-black text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-[#2D3748] dark:bg-[#1A1A24] dark:text-slate-200"
                    >
                        <FileText size={13} />
                        <span className="whitespace-nowrap">快速装机</span>
                    </motion.button>
                </div>
            </div>

            {renderAiResultSummary()}



            {/* Mobile Column View (Tabular & Compact) */}
            <div className="lg:hidden flex flex-col bg-white dark:bg-[#0B0B10] relative pb-28">
                {/* Tabular List Items */}
                <div className="flex flex-col border-b border-slate-100">
                    {buildList.map((entry) => {
                        const getCatColor = (cat: string) => {
                            const map: Record<string, string> = {
                                cpu: 'bg-[#3B82F6] text-white',
                                mainboard: 'bg-[#60A5FA] text-white',
                                cooling: 'bg-[#94A3B8] text-white',
                                ram: 'bg-[#818CF8] text-white',
                                disk: 'bg-[#2DD4BF] text-white',
                                gpu: 'bg-[#CBD5E1] text-white',
                                power: 'bg-[#34D399] text-white',
                                case: 'bg-[#6EE7B7] text-white',
                                monitor: 'bg-[#E2E8F0] text-slate-800',
                                fan: 'bg-[#A7F3D0] text-slate-800',
                                accessory: 'bg-[#F1F5F9] text-slate-800'
                            };
                            return map[cat] || 'bg-slate-100 text-slate-700';
                        };
                        return (
                            <div
                                key={entry.id}
                                ref={(el) => { if (el) rowRefs[entry.id] = el; }}
                                onClick={() => openSelector(entry)}
                                className="flex items-stretch min-h-[34px] border-b border-slate-50 last:border-b-0 cursor-pointer bg-white"
                            >
                                {/* Category Column */}
                                <div className={`w-[45px] shrink-0 flex flex-col items-center justify-center font-bold text-[10px] tracking-widest ${getCatColor(entry.category)}`}>
                                    {CATEGORY_MAP[entry.category]}
                                </div>

                                {/* Item Name Column */}
                                <div className="flex-1 flex items-center px-2 min-w-0 bg-white dark:bg-[#1A1A24]">
                                    {entry.category === 'accessory' ? (
                                        <input
                                            type="text"
                                            className="w-full bg-transparent border-none p-0 text-[11px] text-slate-800 font-bold placeholder-slate-400 focus:ring-0 truncate"
                                            placeholder="输入配件..."
                                            value={entry.customName || ''}
                                            onChange={(e) => onUpdate(entry.id, { customName: e.target.value })}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    ) : entry.item ? (
                                        <div className="flex min-w-0 items-center gap-1.5">
                                            <div className="min-w-0 truncate text-[11px] font-bold text-slate-800 leading-tight">
                                                {entry.item.brand}_{entry.item.model}
                                            </div>
                                            {renderPc3dBadge(getPc3dMatch(entry.item), true)}
                                        </div>
                                    ) : (
                                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                            <Plus size={8} strokeWidth={3} /> 去挑选
                                        </div>
                                    )}
                                </div>

                                {/* Price Column */}
                                <div className="w-[90px] shrink-0 flex flex-col items-end justify-center px-2 bg-white relative group">
                                    {entry.category === 'fan' && entry.item && (
                                        <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg px-1.5 py-0.5 mb-1 shadow-sm" onClick={e => e.stopPropagation()}>
                                            <button onClick={() => onUpdate(entry.id, { quantity: Math.max(1, entry.quantity - 1) })} className="w-6 h-6 flex items-center justify-center text-slate-600 hover:text-indigo-600 bg-white rounded-[4px] shadow-sm font-bold text-[14px] active:scale-95 transition-transform">-</button>
                                            <span className="w-4 text-center text-[12px] font-bold text-slate-700">{entry.quantity}</span>
                                            <button onClick={() => onUpdate(entry.id, { quantity: entry.quantity + 1 })} className="w-6 h-6 flex items-center justify-center text-slate-600 hover:text-indigo-600 bg-white rounded-[4px] shadow-sm font-bold text-[14px] active:scale-95 transition-transform">+</button>
                                        </div>
                                    )}
                                    <div className="text-[12px] font-bold font-mono text-slate-900 text-right w-full">
                                        {(entry.item || entry.customName) ? `¥${(entry.customPrice ?? entry.item?.price ?? 0) * (entry.quantity || 1)}` : '¥0'}
                                    </div>
                                    {(entry.item || entry.customName) && (
                                        <button
                                            className="absolute -top-1.5 -right-1 p-0.5 text-slate-300 hover:text-red-500 active:text-red-500 transition-colors z-10"
                                            onClick={(e) => { e.stopPropagation(); onUpdate(entry.id, { item: null, customName: '', customPrice: undefined, quantity: 1 }); }}
                                        >
                                            <div className="bg-slate-50 border border-slate-100 rounded-full p-0.5 shadow-sm">
                                                <X size={10} strokeWidth={3} />
                                            </div>
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Total Row */}
                <div className="bg-black text-white flex items-center justify-between px-3 py-2">
                    <div className="text-[12px] font-bold text-white flex items-center gap-1.5 whitespace-nowrap">
                        合计
                        <span className="text-white/50 font-normal text-[10px] transform origin-left truncate max-w-[200px]">含装机+走线+三年售后+显卡原封发...</span>
                    </div>
                    <div className="text-[16px] font-black font-mono">
                        ¥<BouncyNumber value={Math.floor(pricing.finalPrice)} />
                    </div>
                </div>

                {/* Mobile LuDaShi & Power Row */}
                <div className="flex bg-white h-[48px] border-b border-slate-200">
                    <div className="flex-1 flex flex-col justify-center items-center border-r border-slate-200">
                        <div className="text-[10px] font-bold text-slate-500 mb-0.5 flex items-center gap-1"><Activity size={10} className="text-indigo-500"/>鲁大师跑分</div>
                        <div className="text-[14px] font-black text-indigo-600 tracking-tighter">
                            {simResult && simResult.totalLuScore > 0 ? <BouncyNumber value={simResult.totalLuScore} /> : '---'}
                        </div>
                    </div>
                    <div className="flex-1 flex flex-col justify-center items-center">
                        <div className="text-[10px] font-bold text-slate-500 mb-0.5 flex items-center gap-1"><Zap size={10} className="text-amber-500"/>系统功耗</div>
                        <div className="text-[14px] font-black text-slate-800 tracking-tighter flex items-center">
                            {simResult && simResult.totalPowerDraw > 0 ? <><BouncyNumber value={simResult.totalPowerDraw} />W</> : '---'}
                        </div>
                    </div>
                </div>

                {/* Mobile Game FPS Viewer */}
                <div>
                    {renderGameFpsSection()}
                </div>
            </div>

            {/* Desktop List View (Hidden on mobile) */}
            <div className={`hidden min-h-0 min-w-0 flex-col overflow-y-auto pr-1 custom-scrollbar lg:flex ${DESKTOP_VISUAL_COLUMN_HEIGHT} relative`}>
                <motion.div 
                    initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.035 } } }}
                    className="flex flex-col space-y-1"
                >
                    {buildList.map((entry) => (
                        <motion.div
                            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } } }}
                            whileHover={{ y: 0 }}
                            whileTap={{ scale: 0.995 }}
                            layout
                            key={entry.id}
                            ref={(el: any) => { if (el) rowRefs[entry.id] = el; }}
                            onClick={() => openSelector(entry)}
                            className={`relative rounded-lg px-2 py-1 border transition-all duration-200 cursor-pointer group flex items-center gap-2 min-h-[40px] ${entry.item || entry.customName
                                ? 'bg-white dark:bg-[#121218] border-slate-200 dark:border-[#1E293B] shadow-sm dark:shadow-none hover:bg-slate-50/80 dark:hover:bg-[#15151d] hover:border-slate-300 dark:hover:border-slate-600'
                                : 'bg-white/50 dark:bg-[#121218]/50 border-dashed border-slate-300/70 dark:border-[#2D3748] hover:bg-white dark:hover:bg-[#121218] hover:border-indigo-300 dark:hover:border-indigo-500/30'
                                }`}
                        >
                            <div 
                                className={`w-7 h-7 rounded-md flex items-center justify-center text-sm shrink-0 transition-all duration-300 relative overflow-hidden ${entry.item ? 'bg-indigo-600 text-white group-hover:bg-indigo-500' : 'bg-slate-100 dark:bg-[#1A1A24] text-slate-400 dark:text-slate-500 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/10 group-hover:text-indigo-500'} ${entry.item?.image ? 'cursor-zoom-in hover:ring-2 hover:ring-indigo-300 hover:ring-offset-1 hover:z-10' : ''}`}
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
                            <div className={`text-[10px] font-black w-9 tracking-wider ${entry.item ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 group-hover:text-slate-500'}`}>{CATEGORY_MAP[entry.category]}</div>

                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                {entry.category === 'accessory' ? (
                                    <input
                                        type="text"
                                        className="w-full bg-transparent border-none p-0 text-slate-800 dark:text-slate-200 font-bold placeholder-slate-300 dark:placeholder-slate-600 focus:ring-0 truncate text-[11px]"
                                        placeholder="快捷输入附件..."
                                        value={entry.customName || ''}
                                        onChange={(e) => onUpdate(entry.id, { customName: e.target.value })}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                ) : entry.item ? (
                                    <div className="flex min-w-0 items-center gap-1.5">
                                        <div className="min-w-0 truncate font-bold text-slate-800 dark:text-slate-100 text-[11px] group-hover:text-slate-950 dark:group-hover:text-white transition-colors leading-snug tracking-tight">{entry.item.brand} {entry.item.model}</div>
                                        {renderPc3dBadge(getPc3dMatch(entry.item), true)}
                                    </div>
                                ) : entry.category === aiActiveCategory ? (
                                    <div className="text-indigo-500 text-xs font-bold flex items-center gap-2 animate-pulse bg-indigo-50 w-max px-2.5 py-1 rounded-md">
                                        <Sparkles size={13} className="animate-spin-slow" />
                                        AI 正在为您挑选...
                                    </div>
                                ) : (
                                    <div className="text-slate-300/80 text-xs font-bold tracking-wide">未挑选 {CATEGORY_MAP[entry.category]}</div>
                                )}
                            </div>
                            <div className="flex items-center gap-1.5 w-28 justify-end shrink-0">
                                <div className="hidden md:flex" onClick={e => e.stopPropagation()}>
                                    {entry.category === 'accessory' ? null : (
                                        !entry.isLockedQty ? (
                                            <div className="flex items-center bg-slate-100/80 rounded-md p-0.5 border border-slate-200/80">
                                                <button onClick={() => onUpdate(entry.id, { quantity: Math.max(1, entry.quantity - 1) })} className="w-[18px] h-5 flex items-center justify-center hover:bg-white rounded text-slate-500 font-black hover:shadow-sm transition-all">-</button>
                                                <span className="w-4 text-center text-[10px] font-black text-slate-700">{entry.quantity}</span>
                                                <button onClick={() => onUpdate(entry.id, { quantity: entry.quantity + 1 })} className="w-[18px] h-5 flex items-center justify-center hover:bg-white rounded text-slate-500 font-black hover:shadow-sm transition-all">+</button>
                                            </div>
                                        ) : null
                                    )}
                                </div>
                                <div className="text-right font-black text-slate-900 dark:text-slate-200 text-[11px] font-mono tracking-tight min-w-[46px]">
                                    {entry.item || entry.customName ? `¥${(entry.customPrice ?? entry.item?.price ?? 0) * (entry.quantity || 1)}` : <span className="text-slate-200">-</span>}
                                </div>
                            </div>
                            {(entry.item || (entry.category === 'accessory' && entry.customName)) && (
                                <button
                                    className="absolute -top-1.5 -right-1.5 p-1 bg-white text-slate-300 hover:text-red-500 hover:bg-red-50 border border-slate-100 rounded-full transition-all opacity-0 group-hover:opacity-100 shadow-sm"
                                    onClick={(e) => { e.stopPropagation(); onUpdate(entry.id, { item: null, customName: '', customPrice: undefined, quantity: 1 }); }}
                                >
                                    <X size={10} strokeWidth={3} />
                                </button>
                            )}
                        </motion.div>
                    ))}
                </motion.div>

                <div className="mt-auto hidden lg:block">
                    {renderGameFpsSection()}
                </div>

            </div>
            {/* Merged Sidebar */}
            <div className={`w-full min-w-0 flex flex-col gap-3 mt-2 lg:mt-0 mb-28 lg:mb-0 ${DESKTOP_VISUAL_COLUMN_HEIGHT} lg:overflow-hidden relative z-10`}>
                <PC3DViewer buildList={buildList} issues={health.issues} className="hidden lg:flex min-h-0 flex-1" />
                {renderBuildSummarySection()}
            </div>

            {/* Premium Modal Category Selector */}
            {modalCategory && typeof document !== 'undefined' && createPortal((
                <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-900/45 backdrop-blur-sm animate-fade-in md:pointer-events-none md:items-start md:justify-start md:bg-transparent md:backdrop-blur-none">
                    <div
                        className="pointer-events-auto bg-[#FAFAFA] dark:bg-[#121218] rounded-none md:fixed md:left-4 md:top-[76px] md:bottom-4 md:rounded-2xl xl:left-[calc((100vw-80rem)/2+1rem)] w-full md:w-[min(44vw,520px)] max-w-3xl md:max-w-[520px] h-[100dvh] md:h-auto overflow-y-auto overscroll-contain custom-scrollbar shadow-xl md:shadow-2xl dark:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.7)] animate-scale-up border-x md:border border-slate-200 dark:border-[#1E293B]"
                        onScroll={handleModalListScroll}
                    >
                        {/* Modal Header */}
                        <div className="px-4 pt-3 pb-3 md:p-6 border-b border-slate-200 dark:border-[#1E293B] flex flex-col gap-2.5 md:gap-5 bg-white/95 dark:bg-[#1A1A24]/95 backdrop-blur-xl">
                            <div className="md:hidden w-9 h-1 rounded-full bg-slate-200 dark:bg-[#2D3748] mx-auto" />
                            <div className="flex justify-between items-center text-slate-900 dark:text-white">
                                <div className="flex items-center gap-2.5 md:gap-3 min-w-0">
                                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-sm md:shadow-lg shadow-slate-200 shrink-0">
                                        {getIconByCategory(modalCategory)}
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="text-base md:text-xl font-black tracking-tight leading-none truncate">选择 {CATEGORY_MAP[modalCategory]}</h2>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">共 {filteredItems.length} 个可选方案</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setModalCategory(null)}
                                    className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center bg-slate-100 dark:bg-[#121218] hover:bg-slate-200 dark:hover:bg-[#2D3748] border border-slate-200 dark:border-[#2D3748] rounded-xl transition-all text-slate-400 hover:text-slate-900 dark:hover:text-white active:scale-90 shrink-0"
                                >
                                    <X size={18} strokeWidth={2.5} />
                                </button>
                            </div>

                            <div className="flex flex-col gap-2.5 md:gap-4">
                                <div className="flex gap-2 md:gap-3 items-center">
                                    <div className="relative flex-1 group">
                                        <Search className="absolute left-3.5 md:left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={17} />
                                        <input
                                            ref={(el) => modalSearchInputRef.current = el}
                                            type="text"
                                            value={modalSearch}
                                            onChange={(e) => setModalSearch(e.target.value)}
                                            placeholder={`在 ${CATEGORY_MAP[modalCategory]} 中搜寻方案...`}
                                            className="w-full bg-white dark:bg-[#121218] border border-slate-200 dark:border-[#2D3748] rounded-xl py-2.5 md:py-3.5 pl-10 md:pl-12 pr-3 md:pr-4 text-[16px] md:text-sm font-bold placeholder:text-slate-400 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all shadow-sm dark:shadow-none"
                                        />
                                    </div>
                                    <button
                                        onClick={() => setSortOrder(prev => prev === 'default' ? 'asc' : prev === 'asc' ? 'desc' : 'default')}
                                        className={`h-[42px] md:h-[52px] px-3 md:px-5 rounded-xl md:rounded-[22px] font-black text-[11px] md:text-xs flex items-center gap-1.5 md:gap-2 transition-all shrink-0 active:scale-95 ${sortOrder !== 'default'
                                            ? 'bg-slate-900 dark:bg-[#2D3748] text-white shadow-md border border-slate-800 dark:border-[#1E293B]'
                                            : 'bg-white dark:bg-[#121218] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-[#2D3748] shadow-sm dark:shadow-none hover:bg-slate-50 dark:hover:bg-[#2D3748]'
                                            }`}
                                    >
                                        <ArrowRight size={16} className={`transition-transform duration-500 ${sortOrder === 'asc' ? '-rotate-90' : sortOrder === 'desc' ? 'rotate-90' : 'rotate-0'}`} />
                                        <span className="tracking-wider">
                                            {sortOrder === 'default' ? '排序' : sortOrder === 'asc' ? '低价' : '高价'}
                                        </span>
                                    </button>
                                </div>

                                <div className="flex items-start gap-2 md:gap-3">
                                    <div className={`flex-1 flex gap-1.5 md:gap-2 ${isBrandsExpanded ? 'flex-wrap max-h-20 md:max-h-none overflow-y-auto md:overflow-visible pr-1' : 'overflow-x-auto no-scrollbar scroll-smooth'} items-center pb-1 md:pb-2 px-0.5 md:px-1 mask-linear-fade`}>
                                        {availableBrands.map(brand => (
                                            <button
                                                key={brand}
                                                onClick={() => setModalBrand(brand)}
                                                className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl text-[10px] md:text-[11px] font-black tracking-wide whitespace-nowrap transition-all border shrink-0 tap-active uppercase ${modalBrand === brand
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
                                            className={`w-8 h-8 flex items-center justify-center rounded-lg md:rounded-xl transition-all shrink-0 mt-0.5 shadow-sm dark:shadow-none border ${isBrandsExpanded ? 'bg-slate-100 dark:bg-[#2D3748] text-slate-900 dark:text-white border-slate-200 dark:border-transparent' : 'bg-white dark:bg-[#121218] text-slate-400 border-slate-200 dark:border-[#2D3748]'}`}
                                        >
                                            {isBrandsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </button>
                                    )}
                                    </div>

                                    {pc3dAvailableCount > 0 && (
                                        <div className="flex gap-1.5 md:gap-2 items-center overflow-x-auto no-scrollbar pb-1">
                                            {([
                                                { key: 'all', label: `全部${modalCategoryLabel}` },
                                                { key: 'with3d', label: `有3D模型 ${pc3dAvailableCount}` },
                                            ] as const).map(option => (
                                                <button
                                                    key={option.key}
                                                    onClick={() => setModalPc3dFilter(option.key)}
                                                    className={`px-3 md:px-4 py-1.5 rounded-lg md:rounded-xl text-[10px] md:text-[11px] font-black tracking-wide whitespace-nowrap transition-all border shrink-0 ${modalPc3dFilter === option.key
                                                        ? 'bg-emerald-600 dark:bg-emerald-500/20 text-white dark:text-emerald-300 border-emerald-500 dark:border-emerald-500/30'
                                                        : 'bg-white dark:bg-[#121218] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-[#2D3748] hover:border-emerald-200 dark:hover:border-[#2D3748] hover:text-slate-700 dark:hover:text-slate-200'
                                                    }`}
                                                >
                                                    {option.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
    
                                    {/* Monitor filters */}
                                    {modalCategory === 'monitor' && (
                                        <div className="space-y-1.5 md:space-y-2">
                                            <div className="space-y-1">
                                                <span className="block px-0.5 text-[9px] md:text-[11px] font-black text-slate-300 dark:text-slate-600">分辨率</span>
                                                <div className="flex gap-1.5 md:gap-2 items-center overflow-x-auto no-scrollbar pb-0.5 md:pb-1">
                                                {(['all', '1K', '2K', '4K', '5K'] as const).map(resolution => (
                                                    <button
                                                        key={resolution}
                                                        onClick={() => setMonitorResolutionFilter(resolution)}
                                                        className={`px-3 md:px-4 py-1.5 rounded-lg md:rounded-xl text-[10px] md:text-[11px] font-black tracking-wide whitespace-nowrap transition-all border shrink-0 ${monitorResolutionFilter === resolution
                                                            ? 'bg-indigo-600 dark:bg-indigo-500/20 text-white dark:text-indigo-300 border-indigo-500 dark:border-indigo-500/30'
                                                            : 'bg-white dark:bg-[#121218] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-[#2D3748] hover:border-indigo-200 dark:hover:border-[#2D3748] hover:text-slate-700 dark:hover:text-slate-200'
                                                        }`}
                                                    >
                                                        {resolution === 'all' ? '全部' : resolution}
                                                    </button>
                                                ))}
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="block px-0.5 text-[9px] md:text-[11px] font-black text-slate-300 dark:text-slate-600">刷新</span>
                                                <div className="flex gap-1.5 md:gap-2 items-center overflow-x-auto no-scrollbar pb-0.5 md:pb-1">
                                                {(['all', '60', '75', '100', '144', '180', '240', '300'] as const).map(refresh => (
                                                    <button
                                                        key={refresh}
                                                        onClick={() => setMonitorRefreshFilter(refresh)}
                                                        className={`px-3 md:px-4 py-1.5 rounded-lg md:rounded-xl text-[10px] md:text-[11px] font-black tracking-wide whitespace-nowrap transition-all border shrink-0 ${monitorRefreshFilter === refresh
                                                            ? 'bg-indigo-600 dark:bg-indigo-500/20 text-white dark:text-indigo-300 border-indigo-500 dark:border-indigo-500/30'
                                                            : 'bg-white dark:bg-[#121218] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-[#2D3748] hover:border-indigo-200 dark:hover:border-[#2D3748] hover:text-slate-700 dark:hover:text-slate-200'
                                                        }`}
                                                    >
                                                        {refresh === 'all' ? '全部' : refresh === '300' ? '300+' : `${refresh}Hz`}
                                                    </button>
                                                ))}
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="block px-0.5 text-[9px] md:text-[11px] font-black text-slate-300 dark:text-slate-600">尺寸</span>
                                                <div className="flex gap-1.5 md:gap-2 items-center overflow-x-auto no-scrollbar pb-0.5 md:pb-1">
                                                {(['all', '22', '24', '25', '27', '32', '34', '49'] as const).map(size => (
                                                    <button
                                                        key={size}
                                                        onClick={() => setMonitorSizeFilter(size)}
                                                        className={`px-3 md:px-4 py-1.5 rounded-lg md:rounded-xl text-[10px] md:text-[11px] font-black tracking-wide whitespace-nowrap transition-all border shrink-0 ${monitorSizeFilter === size
                                                            ? 'bg-indigo-600 dark:bg-indigo-500/20 text-white dark:text-indigo-300 border-indigo-500 dark:border-indigo-500/30'
                                                            : 'bg-white dark:bg-[#121218] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-[#2D3748] hover:border-indigo-200 dark:hover:border-[#2D3748] hover:text-slate-700 dark:hover:text-slate-200'
                                                        }`}
                                                    >
                                                        {size === 'all' ? '全部' : `${size}寸`}
                                                    </button>
                                                ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
    
                                    {/* DDR4/DDR5 Type Filter - only for RAM */}
                                    {modalCategory === 'ram' && (
                                        <div className="flex gap-1.5 md:gap-2 items-center overflow-x-auto no-scrollbar pb-1">
                                        {(['all', 'DDR4', 'DDR5'] as const).map(type => (
                                            <button
                                                key={type}
                                                onClick={() => setRamTypeFilter(type)}
                                                className={`px-3 md:px-4 py-1.5 rounded-lg md:rounded-xl text-[10px] md:text-[11px] font-black tracking-wide whitespace-nowrap transition-all border shrink-0 ${ramTypeFilter === type
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
                                    <div className="flex gap-1.5 md:gap-2 items-center overflow-x-auto no-scrollbar pb-1">
                                        {(['all', '500G', '1T', '2T', '4T'] as const).map(cap => (
                                            <button
                                                key={cap}
                                                onClick={() => setDiskCapFilter(cap)}
                                                className={`px-3 md:px-4 py-1.5 rounded-lg md:rounded-xl text-[10px] md:text-[11px] font-black tracking-wide whitespace-nowrap transition-all border shrink-0 ${diskCapFilter === cap
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
                                    <div className="flex gap-1.5 md:gap-2 items-center overflow-x-auto no-scrollbar pb-1">
                                        {(['all', 'X3D'] as const).map(type => (
                                            <button
                                                key={type}
                                                onClick={() => setCpuTypeFilter(type)}
                                                className={`px-3 md:px-4 py-1.5 rounded-lg md:rounded-xl text-[10px] md:text-[11px] font-black tracking-wide whitespace-nowrap transition-all border shrink-0 ${cpuTypeFilter === type
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
                                    <div className="flex gap-1.5 md:gap-2 items-center overflow-x-auto no-scrollbar pb-1">
                                        {(['all', 'AMD', 'Intel'] as const).map(plat => (
                                            <button
                                                key={plat}
                                                onClick={() => setMbPlatformFilter(plat)}
                                                className={`px-3 md:px-4 py-1.5 rounded-lg md:rounded-xl text-[10px] md:text-[11px] font-black tracking-wide whitespace-nowrap transition-all border shrink-0 ${mbPlatformFilter === plat
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
                                    <div className="flex gap-1.5 md:gap-2 items-center overflow-x-auto no-scrollbar pb-1">
                                        {(['all', 'air', '240', '360'] as const).map(ct => (
                                            <button
                                                key={ct}
                                                onClick={() => setCoolingTypeFilter(ct)}
                                                className={`px-3 md:px-4 py-1.5 rounded-lg md:rounded-xl text-[10px] md:text-[11px] font-black tracking-wide whitespace-nowrap transition-all border shrink-0 ${coolingTypeFilter === ct
                                                    ? 'bg-indigo-600 dark:bg-indigo-500/20 text-white dark:text-indigo-300 border-indigo-500 dark:border-indigo-500/30'
                                                    : 'bg-white dark:bg-[#121218] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-[#2D3748] hover:border-indigo-200 dark:hover:border-[#2D3748] hover:text-slate-700 dark:hover:text-slate-200'
                                                }`}
                                            >
                                                {ct === 'all' ? '全部类型' : ct === 'air' ? '风冷' : `${ct}水冷`}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <div className="md:hidden flex items-center justify-between rounded-lg bg-slate-50 dark:bg-[#121218] border border-slate-200 dark:border-[#2D3748] px-3 py-2">
                                    <span className="text-[11px] font-bold text-slate-500">
                                        当前显示 {visibleModalItems.length}/{filteredItems.length} 件
                                    </span>
                                    <button
                                        type="button"
                                        onClick={resetModalFilters}
                                        className="text-[11px] font-black text-indigo-600 dark:text-indigo-400"
                                    >
                                        重置筛选
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Product List Content */}
                        <div className="px-2.5 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] md:p-6 scroll-smooth">
                            <div className="grid gap-2 md:gap-4">
                                {isModalLoading ? (
                                    <div className="flex flex-col items-center justify-center py-16 md:py-20 text-slate-400">
                                        <div className="w-11 h-11 md:w-12 md:h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg mb-4 ring-1 ring-slate-100">
                                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-200 border-t-indigo-600"></div>
                                        </div>
                                        <p className="text-xs font-black uppercase tracking-widest text-slate-300">正在同步数据库...</p>
                                    </div>
                                ) : (
                                    <>
                                        {visibleModalItems.map(item => {
                                            const isOutOfStock = item.price === 0;
                                            const pc3dMatch = getPc3dMatch(item);
                                            return (
                                                <div
                                                    key={item.id}
                                                    ref={(el) => { if (el) modalItemRefs[item.id] = el; }}
                                                    onClick={() => !isOutOfStock && handleSelect(item)}
                                                    className={`group relative flex items-center gap-2.5 md:gap-5 p-2.5 md:p-4 rounded-xl bg-white dark:bg-[#121218] border border-slate-200 dark:border-[#1E293B] shadow-sm dark:shadow-none transition-all duration-300 active:scale-[0.98] ${isOutOfStock
                                                        ? 'opacity-50 grayscale cursor-not-allowed'
                                                        : 'hover:border-indigo-200 dark:hover:border-[#2D3748] hover:shadow-md dark:hover:shadow-none cursor-pointer hover:-translate-y-0.5'
                                                        }`}
                                                >
                                                    {/* Product Image Wrapper */}
                                                    <div className="w-14 h-14 md:w-20 md:h-20 bg-slate-50 dark:bg-[#1A1A24] rounded-lg md:rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/10 group-hover:text-indigo-400 transition-all overflow-hidden border border-slate-200 dark:border-[#2D3748] shrink-0 relative">
                                                        <div className="opacity-40">{getIconByCategory(modalCategory)}</div>
                                                        {item.image && (
                                                            <img
                                                                src={item.image}
                                                                alt={item.model}
                                                                loading="lazy"
                                                                decoding="async"
                                                                className="absolute inset-0 w-full h-full object-cover md:group-hover:scale-110 transition-transform duration-500"
                                                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setPreviewImage(item.image!);
                                                                }}
                                                            />
                                                        )}
                                                        {item.isRecommended && (
                                                            <div className="absolute top-0 left-0 bg-orange-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-br-lg shadow-sm">TOP</div>
                                                        )}
                                                    </div>

                                                    {/* Product Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-1.5 overflow-hidden">
                                                            <span className="text-[9px] font-black uppercase text-indigo-500 dark:text-indigo-300 tracking-widest bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md">
                                                                {item.brand}
                                                            </span>
                                                            {isOutOfStock && <span className="text-[9px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded-md font-black uppercase">暂无现货</span>}
                                                            {item.isDiscount && <span className="text-[9px] bg-rose-500 text-white px-2 py-0.5 rounded-md font-black uppercase shadow-sm shadow-rose-200">特价</span>}
                                                            {renderPc3dBadge(pc3dMatch)}
                                                            {item.createdAt && (new Date().getTime() - new Date(item.createdAt).getTime() < 30 * 24 * 60 * 60 * 1000) && (
                                                                <span className="text-[9px] bg-emerald-500 text-white px-2 py-0.5 rounded-md font-black uppercase shadow-sm shadow-emerald-200">新品</span>
                                                            )}
                                                        </div>
                                                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-[13px] md:text-[15px] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-snug tracking-tight mb-1 md:mb-2 line-clamp-2">
                                                            {item.model}
                                                        </h4>
                                                        <div className="hidden sm:flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-400 font-bold">
                                                                {(() => {
                                                                    const specsObj = parseSpecsObject(item.specs);
    
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
                                                    <div className="flex flex-col items-end gap-1 md:gap-2 shrink-0 ml-1 md:ml-2">
                                                        <div className={`font-bold font-display tracking-tight transition-all ${isOutOfStock ? 'text-slate-400 dark:text-slate-600 text-sm md:text-base' : 'text-base md:text-xl text-slate-900 dark:text-white md:group-hover:scale-105'}`}>
                                                            {isOutOfStock ? '—' : `¥${item.price}`}
                                                        </div>
                                                            <div className="flex items-center gap-1.5">
                                                                {(() => {
                                                                    const s = parseSpecsObject(item.specs);
                                                                    const jdUrl = s.jd_url;
                                                                    if (!jdUrl || isOutOfStock) return null;
                                                                return (
                                                                    <a
                                                                        href={jdUrl}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        className="flex items-center gap-1 px-2 md:px-2.5 py-1.5 bg-[#E2231A] hover:bg-[#C81912] text-white text-[10px] font-black rounded-lg transition-all shadow-sm hover:shadow-md hover:shadow-red-200 active:scale-95 whitespace-nowrap"
                                                                        title="在京东购买"
                                                                    >
                                                                        <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current"><path d="M19.451 4.926c-.398-.354-.93-.561-1.49-.561h-.001c-.563 0-1.092.207-1.49.561L12 8.926l-4.47-4c-.398-.354-.93-.561-1.49-.561-.563 0-1.092.207-1.49.561L2 7.076V18.5a1.5 1.5 0 001.5 1.5h17a1.5 1.5 0 001.5-1.5V7.076l-2.549-2.15z"/></svg>
                                                                        <span className="hidden md:inline">京东购买</span>
                                                                    </a>
                                                                );
                                                            })()}
                                                            {!isOutOfStock && (
                                                                <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg md:rounded-xl bg-slate-50 dark:bg-[#1A1A24] group-hover:bg-slate-900 dark:group-hover:bg-[#2D3748] text-slate-400 group-hover:text-white flex items-center justify-center transition-all border border-slate-200 dark:border-[#2D3748] shadow-sm">
                                                                    <ArrowRight size={15} />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {filteredItems.length === 0 && (
                                            <div className="flex flex-col items-center justify-center py-16 md:py-20 text-slate-300">
                                                <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 opacity-50">
                                                    <Search size={28} strokeWidth={1.5} />
                                                </div>
                                                <p className="text-sm font-black uppercase tracking-widest italic">未找到匹配的产品</p>
                                                <button onClick={resetModalFilters} className="mt-4 text-xs font-bold text-indigo-500 hover:text-indigo-700 underline underline-offset-4">重置筛选条件</button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div >
            ), document.body)}

            {showAiModal && <AiGenerateModal key="ai-modal" onClose={() => setShowAiModal(false)} onSubmit={handleAiBuild} />}
        </div >
    );
}

export default VisualBuilder;
