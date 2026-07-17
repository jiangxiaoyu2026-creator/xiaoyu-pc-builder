
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X, Sparkles, Trash2, ChevronDown, Save, RefreshCw, Share2, Download, Recycle, Monitor, FolderOpen } from 'lucide-react';
import { BuildEntry, Category, HardwareItem, StreamerLiveMeta } from '../../types/clientTypes';
import { storage } from '../../services/storage';
import { aiBuilder, AIBuildResult } from '../../services/aiBuilder';
import { AiGenerateModal } from './AiGenerateModal';
import { ChatSettingsModal } from '../admin/ChatSettingsModal';
import StreamerRecycleTab from './StreamerRecycleTab';
import HardwareLeaderboard from './HardwareLeaderboard';
import { ThemeColor, THEMES, ThemeContext, LiveStyleKey, LIVE_STYLES } from './StreamerThemeContext';
import { StreamerRow, StreamerRowHandle } from './StreamerRow';
import { StreamerPerformanceSidebar } from './StreamerPerformanceSidebar';
import { StreamerPosterTemplate } from './StreamerPosterTemplate';
import { StreamerPermissionWall } from './StreamerPermissionWall';
import { StreamerHardwarePicker } from './StreamerHardwarePicker';
import { areMemoryIncompatible, areSocketIncompatible, getBuildItem } from '../../utils/hardwareCompatibility';
// --------------------

const STREAMER_BUILD_CATEGORY_ORDER: Category[] = [
    'cpu',
    'cooling',
    'mainboard',
    'ram',
    'disk',
    'gpu',
    'power',
    'case',
    'fan',
    'monitor',
    'mouse',
    'keyboard',
    'accessory',
];
const STREAMER_BUILD_CATEGORY_INDEX = new Map(STREAMER_BUILD_CATEGORY_ORDER.map((category, index) => [category, index]));

function orderStreamerBuildEntries(entries: BuildEntry[]) {
    return entries
        .map((entry, index) => ({ entry, index }))
        .sort((a, b) => {
            const categoryOrder = (STREAMER_BUILD_CATEGORY_INDEX.get(a.entry.category) ?? Number.MAX_SAFE_INTEGER)
                - (STREAMER_BUILD_CATEGORY_INDEX.get(b.entry.category) ?? Number.MAX_SAFE_INTEGER);
            return categoryOrder || a.index - b.index;
        })
        .map(({ entry }) => entry);
}

const LIVE_SCENARIO_ROWS = [
    ['实用', '颜值', '海景房'],
    ['游戏', '直播', '生产力'],
];

const LIVE_STYLE_SWATCHES: Record<LiveStyleKey, string> = {
    cyber: 'linear-gradient(135deg, #06b6d4, #8b5cf6, #ec4899)',
    pixel: 'repeating-conic-gradient(#17243b 0 25%, #7dd3fc 0 50%) 0 0 / 10px 10px, linear-gradient(135deg, #162033, #ffd166, #ff8a7a)',
    pixelWhite: 'repeating-conic-gradient(#ffffff 0 25%, #0f172a 0 50%) 0 0 / 10px 10px, linear-gradient(135deg, #ffffff, #38bdf8, #e34f3f)',
    pixelCream: 'repeating-conic-gradient(#fff7e6 0 25%, #584030 0 50%) 0 0 / 10px 10px, linear-gradient(135deg, #ffd98a, #0f766e, #d94832)',
    pixelOcean: 'repeating-conic-gradient(#092b33 0 25%, #99f6e4 0 50%) 0 0 / 10px 10px, linear-gradient(135deg, #0e3a43, #67e8f9, #ff8f70)',
    pixelNight: 'repeating-conic-gradient(#101827 0 25%, #fbbf24 0 50%) 0 0 / 10px 10px, linear-gradient(135deg, #172033, #7dd3fc, #fb7185)',
    pixelSunset: 'repeating-conic-gradient(#261833 0 25%, #fdba74 0 50%) 0 0 / 10px 10px, linear-gradient(135deg, #37214a, #fde68a, #67e8f9)',
    gundam: 'linear-gradient(135deg, #dc2626, #f8fafc, #2563eb)',
    mecha: 'linear-gradient(135deg, #111827, #f97316, #facc15)',
    pure: 'linear-gradient(135deg, #ffffff, #4f46e5, #f97316)',
    aurora: 'linear-gradient(135deg, #042f2e, #5eead4, #bef264)',
    snow: 'linear-gradient(135deg, #f8fafc, #60a5fa, #10b981)',
    pink: 'linear-gradient(135deg, #831843, #f9a8d4, #f0abfc)',
    orange: 'linear-gradient(135deg, #431407, #fb923c, #fde047)',
    violet: 'linear-gradient(135deg, #ffffff, #7c3aed, #d946ef)',
    redline: 'linear-gradient(135deg, #0f172a, #dc2626, #fb7185)',
};

// The live config sheet is used for capture/layout workflows. Keep this canvas fixed.
const LIVE_CONFIG_SHEET_WIDTH = 964;
const LIVE_CONFIG_SHEET_HEIGHT = 790;
const LIVE_CONFIG_SHEET_FRAME_STYLE = {
    width: `${LIVE_CONFIG_SHEET_WIDTH}px`,
    minWidth: `${LIVE_CONFIG_SHEET_WIDTH}px`,
    maxWidth: `${LIVE_CONFIG_SHEET_WIDTH}px`,
} satisfies React.CSSProperties;
const LIVE_CONFIG_SHEET_SHELL_STYLE = {
    height: `${LIVE_CONFIG_SHEET_HEIGHT}px`,
    minHeight: `${LIVE_CONFIG_SHEET_HEIGHT}px`,
    maxHeight: `${LIVE_CONFIG_SHEET_HEIGHT}px`,
} satisfies React.CSSProperties;

// Components extracted to StreamerRow.tsx and StreamerPerformanceSidebar.tsx

// Helper for sound effect (simulated ticker)
// Removed upon user request

function RollingPrice({ value }: { value: number }) {
    const [display, setDisplay] = useState(value);
    const displayRef = useRef(value);

    useEffect(() => {
        let startTime: number;
        const duration = 800;
        const startValue = displayRef.current;
        const endValue = value;

        if (startValue === endValue) return;

        const animate = (currentTime: number) => {
            if (!startTime) startTime = currentTime;
            const progress = Math.min((currentTime - startTime) / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 4);
            const current = Math.floor(startValue + (endValue - startValue) * ease);
            setDisplay(current);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                setDisplay(endValue);
                displayRef.current = endValue;
            }
        };

        requestAnimationFrame(animate);
        return () => { displayRef.current = value; };
    }, [value]);

    return <span>{display}</span>;
}

function GhostCursor({ x, y, active, status }: { x: number, y: number, active: boolean, status: string }) {
    return (
        <motion.div
            className={`fixed pointer-events-none z-[100] flex items-center justify-center -translate-x-1/2 -translate-y-1/2`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ 
                left: x, 
                top: y, 
                opacity: active && status ? 1 : 0,
                scale: active && status ? 1 : 0.9
            }}
            transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.5 }}
        >
            <div className="bg-indigo-600/95 backdrop-blur-md text-white text-[11px] px-3 py-1.5 rounded-full shadow-xl shadow-indigo-600/20 whitespace-nowrap font-bold tracking-wide border border-indigo-400/30 flex items-center gap-1.5">
                <Sparkles size={12} className="animate-pulse" />
                {status || '...'}
            </div>
        </motion.div>
    );
}

function StreamerWorkbench({
    buildList,
    onUpdate,
    pricing,
    discountRate,
    setDiscountRate,
    isSharing,
    handleShareTrigger,
    handleSave,
    clearBuild,
    hasPermission,
    liveMeta,
    onLiveMetaChange,
    onAiCheck,
    onOpenLibrary
}: {
    buildList: BuildEntry[],
    onUpdate: (id: string, data: Partial<BuildEntry>) => void,
    pricing: any,
    discountRate: number,
    setDiscountRate: (rate: number) => void,
    isSharing: boolean,
    handleShareTrigger: () => void,
    handleSave: () => void,
    clearBuild: () => void,
    hasPermission: boolean,
    liveMeta: StreamerLiveMeta,
    onLiveMetaChange: (meta: StreamerLiveMeta) => void,
    onAiCheck?: () => boolean,
    onOpenLibrary: () => void

}) {
    const [activeTab, setActiveTab] = useState<'builder' | 'recycle' | 'leaderboard'>('builder');
    const [pricingStrategy, setPricingStrategy] = useState<import('../../types/adminTypes').PricingStrategy | null>(null);
    const [strategies, setStrategies] = useState<{ value: number; label: string }[]>([]);

    useEffect(() => {
        const load = async () => {
            const [p] = await Promise.all([
                storage.getPricingStrategy()
            ]);
            setPricingStrategy(p);

            if (p.discountTiers) {
                const opts = p.discountTiers
                    .sort((a: any, b: any) => a.sortOrder - b.sortOrder)
                    .map((tier: any) => ({
                        value: tier.multiplier,
                        label: tier.name
                    }));
                setStrategies(opts);
            }
        };
        load();
    }, []);

    
    const [showAiModal, setShowAiModal] = useState(false);
    const [showChatSettings, setShowChatSettings] = useState(false);
    const [isGeneratingPoster, setIsGeneratingPoster] = useState(false);
    const posterRef = useRef<HTMLDivElement>(null);

    const handleGeneratePoster = async () => {
        if (!posterRef.current || isGeneratingPoster) return;
        setIsGeneratingPoster(true);
        try {
            posterRef.current.style.display = 'block';
            await new Promise(resolve => setTimeout(resolve, 100)); // allow DOM refresh
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(posterRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: null,
            });
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `小鱼主播装机单_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '')}.png`;
            link.click();
        } catch (error) {
            console.error('Failed to generate poster:', error);
            alert('生成图片失败，请稍后重试');
        } finally {
            if (posterRef.current) {
                posterRef.current.style.display = 'none';
            }
            setIsGeneratingPoster(false);
        }
    };

    const [isAiTyping, setIsAiTyping] = useState(false);
    const [aiResult, setAiResult] = useState<AIBuildResult | null>(null);
    const [ghostPos, setGhostPos] = useState({ x: 0, y: 0 });
    const [ghostStatus, setGhostStatus] = useState('');
    const { theme, currentThemeKey, setTheme: setCurrentThemeKey, isLiveMode, setLiveMode, liveStyleConfig, liveStyle, setLiveStyle } = React.useContext(ThemeContext);

    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [pickerState, setPickerState] = useState<{ anchorElement: HTMLElement; entryId: string } | null>(null);
    const rowInputRefs = useRef<(StreamerRowHandle | null)[]>([]);
    const visibleBuildList = useMemo(() => orderStreamerBuildEntries(buildList), [buildList]);
    const pickerEntry = pickerState ? visibleBuildList.find((entry) => entry.id === pickerState.entryId) : null;


    const updateGhost = (el: HTMLElement | null, status: string = '') => {
        if (el) {
            const rect = el.getBoundingClientRect();
            // Add some random offset to make it look "organic"
            const offsetX = rect.width / 2 + (Math.random() * 20 - 10);
            const offsetY = rect.height / 2 + (Math.random() * 10 - 5);
            setGhostPos({ x: rect.left + offsetX, y: rect.top + offsetY });
            setGhostStatus(status);
        }
    };

    const handleNextFocus = (currentIndex: number) => {
        const nextInput = rowInputRefs.current[currentIndex + 1];
        if (nextInput) {
            nextInput.focus();
        }
    };

    const handlePrevFocus = (currentIndex: number) => {
        const prevInput = rowInputRefs.current[currentIndex - 1];
        if (prevInput) {
            prevInput.focus();
        }
    };

    const openHardwarePicker = (entry: BuildEntry, anchorElement: HTMLElement) => {
        setPickerState({ entryId: entry.id, anchorElement });
    };

    const clearPickerEntry = (target: BuildEntry) => {
        onUpdate(target.id, { item: null, customName: undefined, customPrice: undefined, quantity: 1 });
    };

    const handlePickerSelect = (item: HardwareItem) => {
        if (!pickerEntry) return;
        const mainboardEntry = buildList.find((entry) => entry.category === 'mainboard');
        const ramEntry = buildList.find((entry) => entry.category === 'ram');
        const selectedCpu = getBuildItem(buildList, 'cpu');
        const selectedMainboard = getBuildItem(buildList, 'mainboard');
        const selectedRam = getBuildItem(buildList, 'ram');

        if (pickerEntry.category === 'cpu' && mainboardEntry && selectedMainboard && areSocketIncompatible(item, selectedMainboard)) {
            const confirmed = window.confirm(`新 CPU 与当前主板不兼容。继续后会清空主板和内存，是否继续？`);
            if (!confirmed) return;
            onUpdate(pickerEntry.id, { item, customName: undefined, customPrice: undefined });
            clearPickerEntry(mainboardEntry);
            if (ramEntry?.item || ramEntry?.customName) clearPickerEntry(ramEntry);
            setPickerState(null);
            return;
        }

        if (pickerEntry.category === 'mainboard' && selectedCpu && areSocketIncompatible(selectedCpu, item)) {
            alert('该主板与当前 CPU 接口不兼容，请从兼容筛选结果中选择。');
            return;
        }

        if (pickerEntry.category === 'mainboard' && ramEntry && selectedRam && areMemoryIncompatible(item, selectedRam)) {
            const confirmed = window.confirm('新主板与当前内存不兼容。继续后会清空内存，是否继续？');
            if (!confirmed) return;
            onUpdate(pickerEntry.id, { item, customName: undefined, customPrice: undefined });
            clearPickerEntry(ramEntry);
            setPickerState(null);
            return;
        }

        onUpdate(pickerEntry.id, { item, customName: undefined, customPrice: undefined });
        setPickerState(null);
    };

    const handleAiBuild = async (prompt: any, preResult?: any) => {
        try {
            let result = preResult;
            if (!result) {
                const request = typeof prompt === 'string' ? aiBuilder.parseRequest(prompt) : prompt;
                result = await aiBuilder.generateBuildWithLogs(request);
            }

            setShowAiModal(false);
            setAiResult(result);
            if (result.status === 'blocked') {
                setIsAiTyping(false);
                return;
            }
            clearBuild();
            setIsAiTyping(true); // Enable Ghost

            setGhostStatus('思考中...');
            await new Promise(r => setTimeout(r, 600));

            const cats = Object.keys(result.items);

            for (let i = 0; i < cats.length; i++) {
                const cat = cats[i];
                const targetItem = (result.items as any)[cat];
                const entry = buildList.find(e => e.category === cat);

                if (entry && targetItem) {
                    const rowIndex = visibleBuildList.findIndex(e => e.id === entry.id);
                    const row = rowInputRefs.current[rowIndex];

                    if (row) {
                        row.focus();

                        // Wait for focus and move ghost to active element
                        await new Promise(r => setTimeout(r, 50));
                        const activeEl = document.activeElement as HTMLElement;
                        updateGhost(activeEl, '搜索中...');

                        // Initial hesitation
                        await new Promise(r => setTimeout(r, 100 + Math.random() * 200));

                        if (!row) continue;

                        // 2. Type Keyword with "Mistakes"
                        const keywords = (targetItem as any).model.split(' ');
                        const keyword = keywords[0].length > 3 ? keywords[0] : (keywords[1] || keywords[0]);

                        let currentText = "";
                        setGhostStatus('输入中...');

                        for (let charIndex = 0; charIndex < keyword.length; charIndex++) {
                            // Mistake Logic: 10% chance to typo
                            if (Math.random() < 0.1 && charIndex > 1) {
                                const wrongChar = String.fromCharCode(97 + Math.floor(Math.random() * 26));
                                row.simulateType(currentText + wrongChar);
                                await new Promise(r => setTimeout(r, 80)); // Realize mistake
                                row.simulateType(currentText); // Backspace
                                await new Promise(r => setTimeout(r, 80)); // Correction pause
                            }

                            currentText += keyword[charIndex];
                            row.simulateType(currentText);
                            await new Promise(r => setTimeout(r, 30 + Math.random() * 40)); // Typing speed
                        }

                        // 3. Simulate "Browsing"
                        updateGhost(activeEl, '比对价格...');
                        await new Promise(r => setTimeout(r, 150));

                        const browseCount = 1 + Math.floor(Math.random() * 2);
                        for (let k = 0; k < browseCount; k++) {
                            row.simulateArrowDown();
                            await new Promise(r => setTimeout(r, 100));
                        }

                        // 5. Final Selection
                        setGhostStatus('已锁定');
                        row.simulateType(`${(targetItem as any).brand} ${(targetItem as any).model}`);
                        await new Promise(r => setTimeout(r, 150));
                        // For fan items with count, update quantity too
                        const updateData: any = { item: targetItem as any };
                        if (cat === 'fan' && (targetItem as any).count) {
                            updateData.quantity = (targetItem as any).count;
                        }
                        onUpdate(entry.id, updateData);

                        // row.simulateEnter(); 
                        await new Promise(r => setTimeout(r, 150));
                        row.closeSuggestions();
                    }
                }
            }

            setGhostStatus('生成报告中...');
            await new Promise(r => setTimeout(r, 400)); // Finish hesitation

            setIsAiTyping(false);
        } catch (error) {
            console.error(error);
            setIsAiTyping(false);
            alert("AI Generation Failed");
        }
    };

    const validPosterItems = visibleBuildList.filter(b => b.item || b.customName);
    const aiStatus = aiResult?.status || 'ready';
    const aiStatusLabel = aiStatus === 'blocked' ? '不可直接采用' : aiStatus === 'needs_confirmation' ? '需要确认' : '可直接采用';
    const serviceFeeRate = pricingStrategy?.serviceFeeRate ?? pricing?.serviceFeeRate ?? 0.06;
    const serviceFeePercent = (serviceFeeRate * 100).toFixed(0);
    const updateLiveMeta = (updates: Partial<StreamerLiveMeta>) => {
        onLiveMetaChange({ ...liveMeta, ...updates });
    };
    const toggleScenario = (label: string) => {
        const scenarios = liveMeta.scenarios.includes(label)
            ? liveMeta.scenarios.filter(item => item !== label)
            : [...liveMeta.scenarios, label];
        updateLiveMeta({ scenarios });
    };
    const serviceItems = [
        { label: '组装', positive: true },
        { label: '走线', positive: true },
        { label: '三年质保', positive: true },
        { label: `${serviceFeePercent}% 利润`, positive: true },
        { label: '济南发货', positive: true },
        { label: '不包邮', positive: false },
    ];
    const isPixelLiveStyle = liveStyle.startsWith('pixel');
    const isLightLiveStyle = ['pure', 'snow', 'violet', 'redline', 'pixelWhite', 'pixelCream'].includes(liveStyle);
    const liveControlBg = isPixelLiveStyle ? `${liveStyleConfig.panelBg} hover:brightness-110 shadow-[3px_3px_0_#050505]` : isLightLiveStyle ? 'bg-white/45 hover:bg-white/75 shadow-sm' : 'bg-white/[0.06] hover:bg-white/[0.1]';
    const liveInputBg = isPixelLiveStyle ? `${liveStyleConfig.panelBg} shadow-[2px_2px_0_#050505]` : isLightLiveStyle ? 'bg-white/45' : 'bg-white/[0.06]';
    const liveCheckText = isPixelLiveStyle ? 'text-gray-950' : isLightLiveStyle ? 'text-white' : 'text-gray-950';
    const liveShellClass = isLiveMode
        ? isPixelLiveStyle
            ? `rounded-none flex flex-col border-4 ${liveStyleConfig.stampBorder} shadow-[8px_8px_0_#050505]`
            : `rounded-lg flex flex-col border shadow-xl ${theme.borderColor}`
        : `rounded-xl shadow-xl border ${theme.borderColor}`;
    const liveTableShellClass = isPixelLiveStyle
        ? `max-w-none flex flex-col h-full relative overflow-hidden rounded-none border-4 ${liveStyleConfig.stampBorder} shadow-[5px_5px_0_#050505]`
        : `max-w-none flex flex-col h-full relative overflow-hidden rounded-[14px] border ${liveStyleConfig.stampBorder} shadow-[0_0_18px_rgba(0,0,0,0.22)]`;
    const livePanelRadius = isPixelLiveStyle ? 'rounded-none' : 'rounded-[14px]';
    const livePanelInsetRadius = isPixelLiveStyle ? 'rounded-none' : 'rounded-[10px]';
    const liveControlRadius = isPixelLiveStyle ? 'rounded-none' : 'rounded-lg';
    const liveInputRadius = isPixelLiveStyle ? 'rounded-none' : 'rounded-md';
    const liveCheckRadius = isPixelLiveStyle ? 'rounded-none' : 'rounded-[3px]';
    const liveBadgeRadius = isPixelLiveStyle ? 'rounded-none' : 'rounded-[4px]';

    return (
        <div className={isLiveMode ? 'mx-auto shrink-0' : 'w-full'} style={isLiveMode ? LIVE_CONFIG_SHEET_FRAME_STYLE : undefined}>
        <div className={`${theme.cardBg} ${liveShellClass} overflow-hidden relative transition-colors duration-300`} style={isLiveMode ? LIVE_CONFIG_SHEET_SHELL_STYLE : undefined}>
            
            {/* Hidden Poster Template */}
            <StreamerPosterTemplate 
                ref={posterRef}
                validPosterItems={validPosterItems}
                pricingStrategy={pricingStrategy}
                pricing={pricing}
            />

            {/* Permission Overlay */}
            {!hasPermission && <StreamerPermissionWall />}

            <div className={`${isLiveMode ? 'flex flex-1 min-h-0 flex-col' : ''} ${!hasPermission ? 'filter blur-[2px] opacity-60 pointer-events-none select-none' : ''}`}>
                <GhostCursor x={ghostPos.x} y={ghostPos.y} active={isAiTyping} status={ghostStatus} />
                {isAiTyping && (
                    <div className={`absolute top-0 left-0 right-0 h-1 ${theme.bgLight} z-50`}>
                        <div className={`h-full ${theme.bgPrimary} animate-[loading_2s_ease-in-out_infinite]`}></div>
                    </div>
                )}
                <div className={`${isLiveMode ? 'hidden' : 'flex'} px-4 py-2 border-b ${theme.borderColor} ${theme.headerBg} items-center justify-between transition-colors duration-300`}>
                    <div className="flex items-center gap-3">
                        <h2 className={`text-base font-bold ${theme.textTitle} flex items-center gap-1.5`}>
                            <Zap className={theme.primary} size={18} />
                            {activeTab === 'builder' ? '大屏模式控制台' : activeTab === 'recycle' ? '二手回收估价系统' : '硬件性价比天梯'}
                        </h2>
                        {!isLiveMode && (
                            <div className="hidden md:flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm">
                                {(Object.keys(THEMES) as ThemeColor[]).map((tKey) => (
                                    <button
                                        key={tKey}
                                        onClick={() => setCurrentThemeKey(tKey)}
                                        className={`w-3.5 h-3.5 rounded-full transition-all ${currentThemeKey === tKey ? 'scale-125 ring-2 ring-offset-1 ' + THEMES[tKey].bgLight.replace('bg-', 'ring-') : 'hover:scale-110 grayscale-[0.3] hover:grayscale-0'} ${THEMES[tKey].bgPrimary}`}
                                        title={THEMES[tKey].name}
                                    />
                                ))}
                            </div>
                        )}
                        {/* Live Mode Style Switcher */}
                        {isLiveMode && (
                            <div className="hidden 2xl:flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-full border border-slate-700 max-w-[620px] overflow-x-auto hide-scrollbar">
                                {(Object.keys(LIVE_STYLES) as LiveStyleKey[]).map(s => (
                                    <button
                                        key={s}
                                        onClick={() => setLiveStyle(s)}
                                        className={`text-[11px] px-2 py-0.5 rounded-full transition-all whitespace-nowrap ${liveStyle === s ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                                    >
                                        {LIVE_STYLES[s].emoji} {LIVE_STYLES[s].name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>


                    <div className="flex gap-2">
                        {activeTab === 'builder' && (
                            <>
                                {/* Toggle Live Mode Button */}
                                <button
                                    onClick={() => setLiveMode(!isLiveMode)}
                                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all shadow-sm border ${isLiveMode ? 'bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-700 shadow-indigo-500/20' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}`}
                                >
                                    <Monitor size={14} className={isLiveMode ? 'animate-pulse text-indigo-200' : ''} />
                                    {isLiveMode ? '退出直播模式' : '直播大屏模式'}
                                </button>

                                {!isLiveMode && (
                                    <>
                                        <button onClick={onOpenLibrary} className="flex items-center gap-1 px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold rounded-full transition-colors active:scale-95 border border-slate-200 dark:border-slate-700">
                                            <Zap size={12} className="text-amber-500" /> 快速装机
                                        </button>
                                        <button onClick={() => {
                                            if (onAiCheck && !onAiCheck()) return;
                                            setShowAiModal(true);
                                        }} className={`flex items-center gap-1 px-3 py-1 bg-gradient-to-r ${theme.gradient} text-white text-[11px] font-bold rounded-full shadow-lg transition-all hover:-translate-y-0.5 active:scale-95 active:translate-y-0`}>
                                            <Sparkles size={12} /> AI装机
                                        </button>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* === Layout Container === */}
                <div className={`flex flex-col md:flex-row flex-1 min-h-0 ${isLiveMode ? liveStyleConfig.wrapperBg : ''}`}>
                    {/* === Sidebar Navigation === */}
                    {!isLiveMode && (
                        <div className="flex flex-row md:flex-col gap-1.5 p-2.5 md:p-3 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/20 md:w-[150px] lg:w-[172px] shrink-0 overflow-x-auto hide-scrollbar">
                            {/* 大屏模式 Tab */}
                        <button
                            onClick={() => setActiveTab('builder')}
                            className={`group relative flex md:flex-col items-center gap-1.5 p-2.5 md:p-3 rounded-xl transition-all duration-300 shrink-0 ${activeTab === 'builder'
                                ? 'bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-600/50 text-indigo-600 dark:text-indigo-400 shadow-md ring-4 ring-indigo-100 dark:ring-indigo-900/20'
                                : 'bg-transparent text-slate-500 dark:text-slate-400 border-transparent hover:bg-white dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm'} border-2`}
                        >
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${activeTab === 'builder' ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/10 group-hover:text-indigo-500'}`}>
                                <Zap size={18} />
                            </div>
                            <div className="text-left md:text-center shrink-0">
                                <div className={`text-[13px] font-black tracking-tight ${activeTab === 'builder' ? '' : 'text-slate-600 dark:text-slate-300'}`}>大屏模式</div>
                                <div className={`text-[10px] font-medium mt-0.5 hidden lg:block ${activeTab === 'builder' ? 'text-indigo-500/80 dark:text-indigo-400/80' : 'text-slate-400 dark:text-slate-500'}`}>AI大模型驱动</div>
                            </div>
                            {activeTab === 'builder' && <div className="hidden md:block absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-7 bg-indigo-500 rounded-r-md"></div>}
                        </button>

                        {/* 二手回收 Tab */}
                        <button
                            onClick={() => setActiveTab('recycle')}
                            className={`group relative flex md:flex-col items-center gap-1.5 p-2.5 md:p-3 rounded-xl transition-all duration-300 shrink-0 ${activeTab === 'recycle'
                                ? 'bg-white dark:bg-slate-800 border-teal-200 dark:border-teal-600/50 text-teal-600 dark:text-teal-400 shadow-md ring-4 ring-teal-100 dark:ring-teal-900/20'
                                : 'bg-transparent text-slate-500 dark:text-slate-400 border-transparent hover:bg-white dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm'} border-2`}
                        >
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${activeTab === 'recycle' ? 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 group-hover:bg-teal-50 dark:group-hover:bg-teal-500/10 group-hover:text-teal-500'}`}>
                                <Recycle size={18} />
                            </div>
                            <div className="text-left md:text-center shrink-0">
                                <div className={`text-[13px] font-black tracking-tight ${activeTab === 'recycle' ? '' : 'text-slate-600 dark:text-slate-300'}`}>二手回收</div>
                                <div className={`text-[10px] font-medium mt-0.5 hidden lg:block ${activeTab === 'recycle' ? 'text-teal-500/80 dark:text-teal-400/80' : 'text-slate-400 dark:text-slate-500'}`}>快速估价系统</div>
                            </div>
                            {activeTab === 'recycle' && <div className="hidden md:block absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-7 bg-teal-500 rounded-r-md"></div>}
                        </button>
                    </div>
                    )}

                    {/* === Main Content Area === */}
                    <div className={`flex-1 min-w-0 flex flex-col relative ${isLiveMode ? liveStyleConfig.sectionBg : 'bg-white dark:bg-slate-900/50'}`}>

                {activeTab === 'builder' ? (
                    <>
                    <div className={`flex ${isLiveMode ? 'flex-row h-full' : 'flex-col xl:flex-row'}`}>
                    {/* === Left: Config Table === */}
                    <div className={`flex-1 min-w-0 ${isLiveMode ? liveTableShellClass : 'max-w-[1550px]'}`}>
                        {isLiveMode && (
                            <>
                                <div className={`pointer-events-none absolute inset-0 z-10 ${livePanelRadius} border ${isPixelLiveStyle ? 'border-black' : 'border-black/40'}`}></div>
                                <div className={`pointer-events-none absolute inset-[4px] z-10 ${livePanelInsetRadius} border ${liveStyleConfig.stampBorder} opacity-80`}></div>
                                <div className={`pointer-events-none absolute left-0 top-0 bottom-0 z-20 w-[4px] ${liveStyleConfig.glowBg} opacity-85`}></div>
                                <div className="pointer-events-none absolute left-[4px] top-[18px] bottom-[18px] z-20 w-[1.5px] bg-black/55"></div>
                                <div className="pointer-events-none absolute left-0 top-0 z-20 h-[28px] w-[42px] bg-black/70 [clip-path:polygon(0_0,100%_0,30px_8px,17px_8px,5px_20px,5px_100%,0_100%)]"></div>
                                <div className={`pointer-events-none absolute left-[5px] top-0 z-30 h-[20px] w-[31px] ${liveStyleConfig.glowBg} opacity-85 [clip-path:polygon(0_0,27px_0,19px_6px,9px_6px,0_16px)]`}></div>
                                <div className="pointer-events-none absolute left-0 bottom-0 z-20 h-[28px] w-[42px] bg-black/70 [clip-path:polygon(0_0,5px_0,5px_12px,17px_20px,30px_20px,100%_28px,0_28px)]"></div>
                                <div className={`pointer-events-none absolute left-[5px] bottom-0 z-30 h-[20px] w-[31px] ${liveStyleConfig.glowBg} opacity-85 [clip-path:polygon(0_8px,9px_15px,22px_15px,31px_20px,0_20px)]`}></div>
                                <div className="pointer-events-none absolute right-0 top-0 z-20 h-[24px] w-[32px] bg-black/55 [clip-path:polygon(0_0,100%_0,100%_100%,24px_100%)]"></div>
                                <div className={`pointer-events-none absolute right-0 top-0 z-30 h-[16px] w-[24px] ${liveStyleConfig.glowBg} opacity-75 [clip-path:polygon(0_0,100%_0,100%_100%,15px_100%)]`}></div>
                                <div className={`pointer-events-none absolute left-14 right-[280px] top-[1px] z-20 h-[2px] ${liveStyleConfig.fpsBarColor} opacity-70`}></div>
                                <div className={`pointer-events-none absolute inset-x-14 bottom-[4px] z-20 h-[2px] ${liveStyleConfig.fpsBarColor} opacity-75`}></div>
                            </>
                        )}
                        {isLiveMode && (
                            <div className={`px-4 py-2 ${liveStyleConfig.headerBg} border-b ${liveStyleConfig.border}`}>
                                <div className="flex items-center justify-start gap-5">
                                    <div className="flex flex-wrap items-center gap-3 min-w-0 shrink-0">
                                        <div className={`text-3xl font-black tracking-tight ${liveStyleConfig.modelText}`}>DIYXX</div>
                                        <div className={`h-10 w-px ${liveStyleConfig.glowBg} opacity-70 shrink-0`}></div>
                                        <div className="flex flex-col gap-1.5">
                                            {LIVE_SCENARIO_ROWS.map((row, rowIndex) => (
                                                <div key={rowIndex} className="flex flex-wrap gap-x-3 gap-y-1.5">
                                                    {row.map((label) => {
                                                        const checked = liveMeta.scenarios.includes(label);
                                                        return (
                                                            <button
                                                                key={label}
                                                                type="button"
                                                                onClick={() => toggleScenario(label)}
                                                                className={`flex items-center gap-1.5 text-[14px] font-black transition-colors ${checked ? liveStyleConfig.modelText : liveStyleConfig.mutedText}`}
                                                            >
                                                                <span className={`w-3.5 h-3.5 ${liveCheckRadius} border-2 flex items-center justify-center ${checked ? `${liveStyleConfig.glowBg} border-transparent` : liveStyleConfig.border}`}>
                                                                    {checked && <span className={`text-[11px] leading-none ${liveCheckText}`}>✓</span>}
                                                                </span>
                                                                {label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="ml-5 flex items-center gap-1.5 shrink-0">
                                        <button
                                            onClick={onOpenLibrary}
                                            className={`h-[54px] px-3 ${liveControlRadius} ${liveControlBg} border ${liveStyleConfig.border} ${liveStyleConfig.modelText} transition-all text-[12px] font-black flex flex-col items-center justify-center gap-0.5`}
                                            title="载入配置"
                                        >
                                            <FolderOpen size={16} />
                                            载入配置
                                        </button>
                                        <div className="grid gap-1 w-[154px]">
                                            <label className={`h-6 px-2 ${liveInputRadius} ${liveInputBg} border ${liveStyleConfig.border} flex items-center gap-1 ${liveStyleConfig.modelText}`}>
                                                <span className={`${liveStyleConfig.mutedText} text-[12px] font-black`}>预算</span>
                                                <input
                                                    value={liveMeta.budget}
                                                    onChange={(e) => updateLiveMeta({ budget: e.target.value })}
                                                    placeholder="填写"
                                                    className={`min-w-0 flex-1 bg-transparent border-0 p-0 text-[12px] font-black ${liveStyleConfig.modelText} placeholder:text-current placeholder:opacity-40 focus:ring-0 focus:outline-none`}
                                                />
                                            </label>
                                            <label className={`h-6 px-2 ${liveInputRadius} ${liveInputBg} border ${liveStyleConfig.border} flex items-center gap-1 ${liveStyleConfig.modelText}`}>
                                                <span className={`${liveStyleConfig.mutedText} text-[12px] font-black`}>姓名</span>
                                                <input
                                                    value={liveMeta.customerName}
                                                    onChange={(e) => updateLiveMeta({ customerName: e.target.value })}
                                                    placeholder="填写"
                                                    className={`min-w-0 flex-1 bg-transparent border-0 p-0 text-[12px] font-black ${liveStyleConfig.modelText} placeholder:text-current placeholder:opacity-40 focus:ring-0 focus:outline-none`}
                                                />
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className={`${isLiveMode ? 'flex-1 min-h-0 overflow-hidden' : 'overflow-x-auto'}`}>
                            <div className={`${isLiveMode ? 'w-full h-full flex flex-col' : 'min-w-[600px]'}`}>
                                <div className={`grid ${isLiveMode ? 'grid-cols-[72px_minmax(0,1fr)_44px_76px]' : 'grid-cols-[68px_minmax(0,1fr)_56px_64px_18px]'} gap-2 px-3 py-1.5 ${isLiveMode ? liveStyleConfig.headerBg : theme.tableHeaderBg + ' border-b ' + theme.borderColor} text-xs font-bold ${isLiveMode ? liveStyleConfig.mutedText : theme.primary} uppercase tracking-widest transition-colors duration-300 shrink-0`}>
                                    <div>类别</div>
                                    <div>硬件型号 {isLiveMode ? '' : '(智能搜索 / 自定义)'}</div>
                                    <div className="text-center">数量</div>
                                    <div className="text-right">价格</div>
                                    {!isLiveMode && <div></div>}
                                </div>

                        <div className={`divide-y-[1.5px] ${isLiveMode ? liveStyleConfig.divider : theme.divider} transition-colors duration-300 ${isLiveMode ? 'flex shrink-0 flex-col' : ''}`}>
                            <AnimatePresence mode="popLayout">
                                {visibleBuildList.map((entry, index) => (
                                    <motion.div
                                        key={entry.id}
                                        className={isLiveMode ? 'h-[47px] shrink-0' : ''}
                                        layout
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.3, delay: index * 0.03, type: "spring", stiffness: 300, damping: 25 }}
                                    >
                                        <StreamerRow index={index} entry={entry} onUpdate={onUpdate} ref={(el) => (rowInputRefs.current[index] = el)} onEnter={() => handleNextFocus(index)} onPrev={() => handlePrevFocus(index)} onPreview={setPreviewImage} onOpenPicker={isLiveMode ? openHardwarePicker : undefined} />
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                        {isLiveMode && (
                            <div className={`px-4 py-2.5 border-t ${liveStyleConfig.border} ${liveStyleConfig.headerBg} ${liveStyleConfig.modelText} flex items-center justify-between gap-3 shrink-0`}>
                                <div className="min-w-0 flex items-center justify-start gap-x-2 text-[13px] font-black tracking-wide whitespace-nowrap overflow-x-auto">
                                    {serviceItems.map(item => (
                                        <span key={item.label} className="inline-flex items-center gap-1 shrink-0">
                                            <span className={`w-4 h-4 text-[13px] ${liveBadgeRadius} flex items-center justify-center leading-none font-black ${item.positive ? `${liveStyleConfig.glowBg} ${liveCheckText}` : `${liveInputBg} border ${liveStyleConfig.border} ${liveStyleConfig.accentText}`}`}>
                                                {item.positive ? '✓' : '×'}
                                            </span>
                                            {item.label}
                                        </span>
                                    ))}
                                </div>
                                <div className="shrink-0 pl-3 pr-6">
                                    <div className="flex items-baseline justify-end gap-2 leading-none">
                                        <span className={`text-[17px] font-black ${liveStyleConfig.modelText}`}>合计</span>
                                        <span className={`text-[28px] font-black font-mono ${liveStyleConfig.priceText}`}>¥{Math.floor(pricing.standardPrice || 0)}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                        {!isLiveMode && (
                            <div className={`${isLiveMode ? liveStyleConfig.headerBg : theme.footerBg + ' border-t ' + theme.borderColor} px-3 py-2 flex flex-col md:flex-row justify-between items-center gap-2.5 transition-colors duration-300`}>
                                <div className="flex items-baseline gap-2 flex-wrap w-full md:w-auto">
                                    <span className={`${isLiveMode ? 'text-2xl text-gray-500' : 'text-lg ' + theme.textMuted} font-bold whitespace-nowrap line-through decoration-2`}>¥{Math.floor(pricing.standardPrice)}</span>
                                    <div className="flex items-baseline gap-0.5">
                                        <span className={`${isLiveMode ? 'text-4xl' : 'text-lg'} font-bold ${isLiveMode ? liveStyleConfig.totalPriceText : theme.textTitle}`}>¥</span>
                                        <span className={`${isLiveMode ? 'text-6xl font-black drop-shadow-lg' : 'text-3xl font-extrabold'} ${isLiveMode ? liveStyleConfig.totalPriceText : 'text-transparent bg-clip-text bg-gradient-to-r ' + theme.gradient} font-mono tracking-tight`}>
                                            <RollingPrice value={pricing.finalPrice} />
                                        </span>
                                    </div>
                                    <span className={`${isLiveMode ? liveStyleConfig.savedBadge + ' px-3 py-1 text-sm' : 'bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0.5'} rounded-full font-bold whitespace-nowrap self-start ${isLiveMode ? 'mt-2' : 'mt-1.5'}`}>
                                        省 ¥{pricing.savedAmount}
                                    </span>

                                    <div className={`relative group w-[100px] ml-1 self-center`}>
                                        <select value={discountRate} onChange={(e) => setDiscountRate(parseFloat(e.target.value))} className={`w-full appearance-none ${isLiveMode ? 'bg-white/10 border-white/20 text-white hover:border-white/40' : 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300'} border text-[10px] font-bold py-1 pl-2 pr-6 rounded-md focus:outline-none focus:ring-2 ${theme.ring}/20 transition-all cursor-pointer text-center`}>
                                                {strategies.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                            </select>
                                            <ChevronDown className={`absolute right-2 top-1.5 ${isLiveMode ? 'text-white/50' : 'text-slate-400 dark:text-slate-500'} pointer-events-none`} size={12} />
                                        </div>
                                </div>

                                <div className="flex items-center gap-2.5">
                                    <div className={`${isLiveMode ? 'text-xs' : 'text-[10px]'} ${isLiveMode ? liveStyleConfig.mutedText : theme.textMuted} font-bold whitespace-nowrap`}>
                                        标准价格包含 {(serviceFeeRate * 100).toFixed(0)}% 装机售后服务费
                                    </div>
                                    <div className="flex items-center gap-2 h-9">
                                        <button onClick={clearBuild} className={`h-full aspect-square flex items-center justify-center rounded-lg transition-all active:scale-95 border ${isLiveMode ? 'bg-white/5 hover:bg-white/10 text-rose-400 border-white/10' : 'bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-500/20'}`} title="清空配置">
                                            <Trash2 size={18} />
                                        </button>
                                        <button onClick={handleSave} className={`h-full aspect-square flex items-center justify-center rounded-lg transition-all active:scale-95 border ${isLiveMode ? 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`} title="保存配置">
                                            <Save size={18} />
                                        </button>
                                        <button onClick={handleGeneratePoster} disabled={isGeneratingPoster} className={`h-full aspect-square flex items-center justify-center rounded-lg transition-all active:scale-95 border ${isLiveMode ? 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`} title="生成海报">
                                            {isGeneratingPoster ? <RefreshCw size={18} className="animate-spin" /> : <Download size={18} />}
                                        </button>
                                        <button onClick={handleShareTrigger} disabled={isSharing} className={`h-full aspect-square flex items-center justify-center ${isLiveMode ? liveStyleConfig.glowBg : theme.bgPrimary} hover:opacity-90 disabled:opacity-50 text-white rounded-lg shadow-md transition-all active:scale-95`} title="分享配置">
                                            {isSharing ? <RefreshCw size={18} className="animate-spin" /> : <Share2 size={18} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}



                {showAiModal && <AiGenerateModal onClose={() => setShowAiModal(false)} onSubmit={handleAiBuild} />}
                {showChatSettings && <ChatSettingsModal onClose={() => setShowChatSettings(false)} />}

                {/* AI Result Section */}
                {
                    aiResult && (
                        <div className={`mt-8 bg-white dark:bg-slate-900 rounded-2xl shadow-lg border ${theme.bgLight.replace('bg-', 'border-')} overflow-hidden animate-fade-in relative z-10 w-full mb-12`}>
                            <div className={`bg-gradient-to-r ${theme.gradient} px-6 py-4 flex items-center justify-between`}>
                                <div className="flex items-center gap-3 text-white">
                                    <Sparkles size={18} className="animate-pulse" />
                                    <h3 className="font-bold text-lg tracking-wide">配单引擎结果</h3>
                                    <span className="ml-2 px-2.5 py-0.5 bg-white/20 rounded-full text-sm font-bold backdrop-blur-sm">
                                        {aiStatusLabel}
                                    </span>
                                </div>
                                <button onClick={() => setAiResult(null)} className="text-white/80 hover:text-white transition-colors">
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="p-6 space-y-5">
                                {aiResult.checks && (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div className={`rounded-xl border px-4 py-3 ${aiResult.checks.budget?.ok ? 'bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-300' : 'bg-amber-50 border-amber-100 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-300'}`}>
                                            <div className="text-[11px] font-black uppercase tracking-wider opacity-70">预算</div>
                                            <div className="text-sm font-bold mt-1">{aiResult.checks.budget?.ok ? '未超预算' : '需要调整'}</div>
                                        </div>
                                        <div className={`rounded-xl border px-4 py-3 ${aiResult.checks.compatibility?.ok ? 'bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-300' : 'bg-amber-50 border-amber-100 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-300'}`}>
                                            <div className="text-[11px] font-black uppercase tracking-wider opacity-70">兼容</div>
                                            <div className="text-sm font-bold mt-1">{aiResult.checks.compatibility?.ok ? '全部通过' : '有风险'}</div>
                                        </div>
                                        <div className={`rounded-xl border px-4 py-3 ${aiResult.checks.requestedItems?.ok ? 'bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-300' : 'bg-slate-50 border-slate-100 text-slate-600 dark:bg-slate-800/50 dark:border-slate-700/50 dark:text-slate-300'}`}>
                                            <div className="text-[11px] font-black uppercase tracking-wider opacity-70">点名配件</div>
                                            <div className="text-sm font-bold mt-1">
                                                {aiResult.checks.requestedItems?.items?.length ? (aiResult.checks.requestedItems.ok ? '已保留' : '未全部保留') : '未点名'}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {aiResult.checks?.requestedItems?.unmatched?.length ? (
                                    <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                                        未找到点名型号：{aiResult.checks.requestedItems.unmatched.map((item: any) => item.term).join('、')}
                                    </div>
                                ) : null}

                                {/* Score + Description */}
                                <div className="flex gap-5 items-start">
                                    {aiResult.evaluation && (
                                        <div className="shrink-0 w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 shadow-md border border-slate-200 dark:border-slate-600 flex flex-col items-center justify-center">
                                            <span className={`text-3xl font-black ${aiResult.evaluation.score >= 90 ? 'text-emerald-600 dark:text-emerald-400' :
                                                aiResult.evaluation.score >= 75 ? theme.primary :
                                                    aiResult.evaluation.score >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
                                                }`}>{aiResult.evaluation.score}</span>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">分</span>
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed font-medium">{aiResult.description}</p>
                                    </div>
                                </div>

                                {/* Pros & Cons */}
                                {aiResult.evaluation && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {aiResult.evaluation.pros?.length > 0 && (
                                            <div className="bg-emerald-50/80 dark:bg-emerald-500/10 rounded-2xl p-4 border border-emerald-100 dark:border-emerald-500/20">
                                                <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-2.5">✓ 优点</h4>
                                                <ul className="space-y-1.5">
                                                    {aiResult.evaluation.pros.map((p: string, i: number) => (
                                                        <li key={i} className="text-sm text-emerald-800 dark:text-emerald-300 font-medium flex items-start gap-2">
                                                            <span className="text-emerald-500 mt-0.5 shrink-0">•</span> {p}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        {aiResult.evaluation.cons?.length > 0 && (
                                            <div className="bg-amber-50/80 dark:bg-amber-500/10 rounded-2xl p-4 border border-amber-100 dark:border-amber-500/20">
                                                <h4 className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-2.5">⚠ 不足</h4>
                                                <ul className="space-y-1.5">
                                                    {aiResult.evaluation.cons.map((c: string, i: number) => (
                                                        <li key={i} className="text-sm text-amber-800 dark:text-amber-300 font-medium flex items-start gap-2">
                                                            <span className="text-amber-500 mt-0.5 shrink-0">•</span> {c}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Detailed Summary */}
                                {aiResult.evaluation?.summary && (
                                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-700/50">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">📋 详细点评</h4>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">
                                            {aiResult.evaluation.summary}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                }
                    </div>

                    {/* === Right: Performance Sidebar === */}
                    <StreamerPerformanceSidebar buildList={visibleBuildList} pricingProps={{ pricing, discountRate, setDiscountRate, strategies, serviceFeeRate, clearBuild, handleSave, handleGeneratePoster, isGeneratingPoster, handleShareTrigger, isSharing }} />
                    </div>
                </>
                ) : activeTab === 'leaderboard' ? (
                    <div className="min-h-[600px] w-full bg-slate-50/50 dark:bg-slate-900/50 relative overflow-hidden">
                        <HardwareLeaderboard />
                    </div>
                ) : (
                    <div className="min-h-[600px] w-full bg-slate-50/50 dark:bg-slate-900/50 relative overflow-hidden">
                        <StreamerRecycleTab />
                    </div>
                )}
                </div>
            </div>
            {/* Image Preview Modal */}
                {previewImage && (
                    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setPreviewImage(null)}>
                        <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center">
                            <img src={previewImage} alt="Preview" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl scale-100 animate-in zoom-in-95 duration-200" />
                            <button className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors bg-black/20 hover:bg-black/40 rounded-full p-2">
                                <X size={24} />
                            </button>
                        </div>
                    </div>
                )}
                {pickerState && pickerEntry && (
                    <StreamerHardwarePicker
                        anchorElement={pickerState.anchorElement}
                        buildList={buildList}
                        entry={pickerEntry}
                        onClose={() => setPickerState(null)}
                        onSelect={handlePickerSelect}
                    />
                )}
            </div >
        </div>
        {isLiveMode && (
            <div className="mt-3 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-1.5">
                    {(Object.keys(LIVE_STYLES) as LiveStyleKey[]).map(s => {
                        const isActive = liveStyle === s;
                        const styleConfig = LIVE_STYLES[s];
                        // 使用 glowBg 作为按钮背景色，选中时加深
                        return (
                            <button
                                key={s}
                                onClick={() => setLiveStyle(s)}
                                className={`w-9 h-9 p-0 border transition-all ${s.startsWith('pixel') ? 'rounded-none border-2 shadow-[3px_3px_0_#111]' : 'rounded-lg shadow-sm'} ${isActive ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-slate-900 border-white/80' : 'opacity-80 hover:opacity-100 hover:scale-105 border-white/50'}`}
                                style={{ background: LIVE_STYLE_SWATCHES[s] }}
                                title={styleConfig.name}
                            >
                                <span className={`block h-full w-full ${s.startsWith('pixel') ? 'rounded-none' : 'rounded-[7px]'} ${isActive ? 'bg-white/0' : 'bg-black/0'}`} />
                            </button>
                        );
                    })}
                </div>
                <div className="flex shrink-0 justify-end gap-2">
                    <button
                        onClick={() => {
                            setLiveMode(false);
                            setActiveTab('recycle');
                        }}
                        className="h-10 px-4 flex items-center gap-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-teal-600 hover:border-teal-200 dark:hover:border-teal-500/40 transition-all text-sm font-bold shadow-sm"
                    >
                        <Recycle size={16} /> 二手回收
                    </button>
                    <button onClick={() => setLiveMode(false)} className="h-10 px-4 flex items-center gap-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:border-indigo-200 dark:hover:border-indigo-500/40 transition-all text-sm font-bold shadow-sm">
                        <Monitor size={16} /> 退出直播
                    </button>
                    <button onClick={clearBuild} className="h-10 px-4 flex items-center gap-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-rose-500 hover:border-rose-200 dark:hover:border-rose-500/40 transition-all text-sm font-bold shadow-sm">
                        <Trash2 size={16} /> 删除
                    </button>
                    <button onClick={handleSave} className="h-10 px-4 flex items-center gap-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all text-sm font-bold shadow-sm">
                        <Save size={16} /> 保存
                    </button>
                    <button onClick={handleGeneratePoster} disabled={isGeneratingPoster} className="h-10 px-4 flex items-center gap-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-60 transition-all text-sm font-bold shadow-sm">
                        {isGeneratingPoster ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />} 下载
                    </button>
                    <button onClick={handleShareTrigger} disabled={isSharing} className="h-10 px-4 flex items-center gap-2 rounded-lg bg-slate-900 dark:bg-indigo-600 text-white hover:bg-black dark:hover:bg-indigo-500 disabled:opacity-60 transition-all text-sm font-bold shadow-sm">
                        {isSharing ? <RefreshCw size={16} className="animate-spin" /> : <Share2 size={16} />} 分享
                    </button>
                </div>
            </div>
        )}
        </div>
    );
}


export default function StreamerWorkbenchWrapper(props: any) {
    const [themeKey, setThemeKey] = useState<ThemeColor>('default');
    const [isLiveMode, setLiveMode] = useState(true);
    const [liveStyle, setLiveStyle] = useState<LiveStyleKey>('violet');
    return (
        <ThemeContext.Provider value={{
            theme: THEMES[themeKey],
            currentThemeKey: themeKey,
            setTheme: setThemeKey,
            isLiveMode,
            setLiveMode,
            liveStyle,
            setLiveStyle,
            liveStyleConfig: LIVE_STYLES[liveStyle],
        }}>
            <StreamerWorkbench {...props} />
        </ThemeContext.Provider>
    );
}
