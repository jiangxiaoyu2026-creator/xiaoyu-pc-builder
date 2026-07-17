import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Box, CheckCircle2, Info, Layers, Maximize2, RefreshCw, ScanSearch, X } from 'lucide-react';
import { BuildEntry, Category } from '../../types/clientTypes';
import { CATEGORY_MAP } from '../../data/clientData';

type MatchKind = 'exact' | 'similar' | 'missing';
type VisualCategory = Extract<Category, 'mainboard' | 'gpu' | 'ram' | 'power' | 'cooling' | 'fan' | 'case'>;

interface PC3DViewerProps {
    buildList: BuildEntry[];
    issues?: string[];
    className?: string;
}

interface PC3DMessageItem {
    category: VisualCategory;
    id?: string;
    brand: string;
    model: string;
    quantity: number;
}

interface MatchSummary {
    exact: number;
    similar: number;
    missing: Array<{ category: Category; name: string }>;
    rendered: number;
    total: number;
    matches: Array<{ category: VisualCategory; kind: MatchKind; assetName: string; itemName: string }>;
    caseModelAvailable?: boolean | null;
    fallbackMode?: 'models' | 'images';
    fallbackReason?: string;
}

const VISUAL_CATEGORIES = new Set<Category>(['mainboard', 'gpu', 'ram', 'power', 'cooling', 'fan', 'case']);

function toPc3dItems(buildList: BuildEntry[]): PC3DMessageItem[] {
    return buildList
        .filter((entry): entry is BuildEntry & { category: VisualCategory } => VISUAL_CATEGORIES.has(entry.category))
        .filter(entry => Boolean(entry.item || entry.customName))
        .map(entry => ({
            category: entry.category,
            id: entry.item?.id,
            brand: entry.item?.brand ?? '',
            model: entry.item?.model ?? entry.customName ?? '',
            quantity: entry.quantity || 1,
        }));
}

const emptySummary: MatchSummary = {
    exact: 0,
    similar: 0,
    missing: [],
    rendered: 0,
    total: 0,
    matches: [],
    caseModelAvailable: null,
    fallbackMode: 'models',
    fallbackReason: '',
};

export default function PC3DViewer({ buildList, className = '' }: PC3DViewerProps) {
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const modalIframeRef = useRef<HTMLIFrameElement | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [summary, setSummary] = useState<MatchSummary>(emptySummary);
    const pc3dItems = useMemo(() => toPc3dItems(buildList), [buildList]);
    const payloadKey = useMemo(() => JSON.stringify(pc3dItems), [pc3dItems]);
    const imageFallbackItems = useMemo(() => buildList
        .filter(entry => Boolean(entry.item || entry.customName))
        .map(entry => ({
            category: entry.category,
            name: `${entry.item?.brand || ''} ${entry.item?.model || entry.customName || ''}`.trim() || CATEGORY_MAP[entry.category] || entry.category,
            image: entry.item?.image || '',
        })), [buildList]);
    const isEmpty = summary.total === 0;
    const caseModelUnavailable = summary.fallbackMode === 'images' && summary.fallbackReason === 'case_missing';
    const hasOnlyExactModels = summary.total > 0 && summary.rendered === summary.total && summary.missing.length === 0 && summary.similar === 0;
    const hasRenderedModels = summary.rendered > 0 && !caseModelUnavailable;
    const selectedCase = useMemo(
        () => buildList.find(entry => entry.category === 'case' && Boolean(entry.item || entry.customName)),
        [buildList]
    );
    const selectedCaseName = `${selectedCase?.item?.brand || ''} ${selectedCase?.item?.model || selectedCase?.customName || ''}`.trim();
    const showCaseRequirementHint = isReady && (!selectedCase || caseModelUnavailable);
    const caseRequirementCopy = selectedCase
        ? {
            badge: '机箱缺少 3D',
            title: '这款机箱还不能生成 3D 预览',
            description: `${selectedCaseName || '当前机箱'} 暂未匹配 3D 图片/模型。请更换带“有3D模型”标识的机箱，或先补充该机箱的 3D 图片/模型。`,
            steps: ['更换有 3D 模型机箱', '补充机箱 3D 图'],
        }
        : {
            badge: '3D 预览提示',
            title: '想看 3D 预览，先选带 3D 模型的机箱',
            description: '机箱决定整机外观基准。未选择机箱，或机箱没有 3D 图片/模型时，暂不显示完整 3D 装机效果。',
            steps: ['选择机箱', '确认有 3D 模型'],
        };
    const missingCategorySet = useMemo(() => new Set(summary.missing.map(item => item.category)), [summary.missing]);
    const missingImageFallbackItems = useMemo(
        () => imageFallbackItems.filter(item => missingCategorySet.has(item.category) && item.image),
        [imageFallbackItems, missingCategorySet]
    );
    const showFullImageFallback = isReady && !isEmpty && (caseModelUnavailable || !hasRenderedModels) && imageFallbackItems.length > 0;
    const showMissingImageStrip = isReady && hasRenderedModels && !caseModelUnavailable && missingImageFallbackItems.length > 0;
    const previewState = isEmpty
        ? {
            label: '等待配置',
            tone: 'slate',
            description: '先选择带 3D 图片/模型的机箱，再生成装机效果。',
            icon: Info,
        }
        : caseModelUnavailable
            ? {
                label: '产品图片预览',
                tone: 'slate',
                description: '当前机箱暂无 3D 图片/模型，暂不能生成完整 3D 预览。',
                icon: Info,
            }
        : hasOnlyExactModels
            ? {
                label: '真实模型预览',
                tone: 'emerald',
                description: '当前配置已匹配真实 3D 模型。',
                icon: CheckCircle2,
            }
            : hasRenderedModels
                ? {
                    label: '同类外观参考',
                    tone: 'amber',
                    description: '部分配件使用同类模型，用于查看整体风格和安装位置。',
                    icon: Layers,
                }
                : {
                    label: '空间参考',
                    tone: 'slate',
                    description: '当前配置暂无可用 3D 模型，后续会补充标准空间轮廓。',
                    icon: Info,
                };
    const PreviewIcon = previewState.icon;
    const stateClassName = previewState.tone === 'emerald'
        ? 'bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20'
        : previewState.tone === 'amber'
            ? 'bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20'
            : 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-[#1A1A24] dark:text-slate-300 dark:ring-[#2D3748]';
    const imageFallbackTitle = caseModelUnavailable ? '机箱暂无 3D 图片/模型' : '暂无可用 3D 模型';
    const imageFallbackDescription = caseModelUnavailable
        ? '需要选择带 3D 图片/模型的机箱，才能生成完整装机预览效果。'
        : '先用已选产品图片展示外观，模型补齐后自动切换为 3D。';

    const renderImageFallbackGrid = (expanded = false) => (
        <div className={`grid min-h-0 flex-1 gap-2 overflow-y-auto pr-1 ${expanded ? 'grid-cols-2 md:grid-cols-4 auto-rows-[150px]' : 'grid-cols-2 auto-rows-[88px]'}`}>
            {imageFallbackItems.map(item => (
                <div key={`${item.category}-${item.name}`} className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-[#1E293B] dark:bg-[#121218]">
                    {item.image ? (
                        <img src={item.image} alt={item.name} className="h-full w-full object-contain p-2" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center px-3 text-center text-[11px] font-black text-slate-400 dark:text-slate-500">
                            暂无图片
                        </div>
                    )}
                    <div className="absolute left-2 top-2 rounded-md bg-white/90 px-1.5 py-0.5 text-[9px] font-black text-slate-600 shadow-sm dark:bg-slate-950/80 dark:text-slate-300">
                        {CATEGORY_MAP[item.category] || item.category}
                    </div>
                </div>
            ))}
        </div>
    );

    const postBuild = (target: HTMLIFrameElement | null = iframeRef.current) => {
        target?.contentWindow?.postMessage({
            type: 'diyxx_pc3d_build',
            items: pc3dItems,
        }, window.location.origin);
    };

    useEffect(() => {
        const onMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;
            if (event.data?.type === 'diyxx_pc3d_ready') {
                setIsReady(true);
                window.setTimeout(postBuild, 0);
            }
            if (event.data?.type === 'diyxx_pc3d_match_summary') {
                setSummary({ ...emptySummary, ...event.data.summary });
            }
        };
        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    }, [payloadKey]);

    useEffect(() => {
        if (!isReady) return;
        postBuild();
    }, [isReady, payloadKey]);

    useEffect(() => {
        if (!isExpanded) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsExpanded(false);
        };
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', onKeyDown);
        window.setTimeout(() => postBuild(modalIframeRef.current), 0);
        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [isExpanded, payloadKey]);

    const renderIframe = (ref: RefObject<HTMLIFrameElement>, title: string, expanded = false) => (
        <iframe
            ref={ref}
            title={title}
            src="/pc3d/combo.html?embed=1"
            className="h-full w-full border-0 bg-white"
            onLoad={() => {
                if (!expanded) setIsReady(true);
                window.setTimeout(() => postBuild(ref.current), 0);
            }}
        />
    );

    const renderCaseRequirementHint = (expanded = false) => {
        const CaseHintIcon = selectedCase ? AlertCircle : ScanSearch;
        return (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-5">
            <div className={`pointer-events-auto relative w-full max-w-[430px] overflow-hidden rounded-lg border px-4 py-3.5 pl-5 shadow-[0_22px_56px_rgba(15,23,42,0.16)] backdrop-blur-xl ${
                expanded
                    ? 'border-white/10 bg-slate-950/88 text-white'
                    : 'border-white/85 bg-white/94 text-slate-900 ring-1 ring-slate-950/5 dark:border-white/10 dark:bg-[#121218]/92 dark:text-white dark:ring-white/10'
            }`}>
                <div className={`absolute inset-y-0 left-0 w-1 ${selectedCase ? 'bg-amber-400' : 'bg-indigo-500'}`} />
                <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                        selectedCase
                            ? 'bg-amber-50 text-amber-600 ring-1 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20'
                            : 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/20'
                    }`}>
                        <CaseHintIcon size={18} strokeWidth={2.4} />
                    </div>
                    <div className="min-w-0">
                        <div className={`mb-1 inline-flex rounded-md px-2 py-1 text-[10px] font-black ${
                            selectedCase
                                ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20'
                                : 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/20'
                        }`}>
                            {caseRequirementCopy.badge}
                        </div>
                        <div className="text-sm font-black leading-snug">{caseRequirementCopy.title}</div>
                        <div className={`mt-1.5 text-xs font-bold leading-relaxed ${
                            expanded ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'
                        }`}>
                            {caseRequirementCopy.description}
                        </div>
                    </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 pl-[52px]">
                    {caseRequirementCopy.steps.map((step, index) => (
                        <span
                            key={step}
                            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[10px] font-black ${
                                expanded
                                    ? 'bg-white/10 text-slate-200'
                                    : 'bg-slate-50 text-slate-600 ring-1 ring-slate-100 dark:bg-[#0B0B10] dark:text-slate-300 dark:ring-white/10'
                            }`}
                        >
                            <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] ${
                                selectedCase
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200'
                                    : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200'
                            }`}>
                                {index + 1}
                            </span>
                            {step}
                        </span>
                    ))}
                </div>
            </div>
        </div>
        );
    };

    const expandedLayer = isExpanded && typeof document !== 'undefined'
        ? createPortal(
            <div className="fixed inset-0 z-[150] bg-slate-950/80 p-5 backdrop-blur-md">
                <div className="flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0B0B10] shadow-2xl">
                    <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-4">
                        <div className="min-w-0">
                            <div className="text-sm font-black text-white">3D 装机效果预览</div>
                            <div className="mt-0.5 text-[10px] font-bold text-slate-500">站内放大查看，不进入校准工作台</div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsExpanded(false)}
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                            title="关闭"
                        >
                            <X size={17} />
                        </button>
                    </div>
                    <div className="relative min-h-0 flex-1 bg-[#0B0B10]">
                        {caseModelUnavailable && imageFallbackItems.length > 0 ? (
                            <div className="relative flex h-full flex-col bg-white/95 p-5 dark:bg-[#0B0B10]">
                                <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
                                    <div>
                                        <div className="text-sm font-black text-slate-900 dark:text-white">{imageFallbackTitle}</div>
                                        <div className="mt-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">{imageFallbackDescription}</div>
                                    </div>
                                    <div className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500 dark:bg-[#1A1A24] dark:text-slate-300">
                                        图片参考
                                    </div>
                                </div>
                                {renderImageFallbackGrid(true)}
                                {showCaseRequirementHint && renderCaseRequirementHint(true)}
                            </div>
                        ) : (
                            <>
                            {renderIframe(modalIframeRef, '放大查看当前配置 3D 装机效果', true)}
                            {showCaseRequirementHint && renderCaseRequirementHint(true)}
                            {isEmpty && !showCaseRequirementHint && (
                            <div className="absolute left-5 bottom-5 max-w-md rounded-lg border border-white/10 bg-slate-950/85 p-3 text-slate-300 shadow-xl backdrop-blur">
                                <div className="text-xs font-black text-white">还没有可生成的装机效果</div>
                                <div className="mt-1 text-[11px] font-bold leading-relaxed text-slate-400">先选择带 3D 图片/模型的机箱，再继续添加主板、显卡等部件。</div>
                            </div>
                            )}
                            </>
                        )}
                    </div>
                </div>
            </div>,
            document.body
        )
        : null;

    return (
        <>
        <section className={`flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-[#1E293B] dark:bg-[#121218] dark:shadow-none ${className}`}>
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-3.5 py-3 dark:border-[#1E293B]">
                <div className="flex min-w-0 items-center gap-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-950">
                        <Box size={16} />
                    </div>
                    <div className="min-w-0">
                        <h3 className="truncate text-sm font-black text-slate-900 dark:text-white">3D 装机效果预览</h3>
                        <div className="mt-0.5 text-[10px] font-bold text-slate-400 dark:text-slate-500">
                            随当前配置实时生成外观参考
                        </div>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => setIsExpanded(true)}
                    className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md bg-slate-100 px-2 text-[10px] font-black text-slate-600 transition-colors hover:bg-slate-200 dark:bg-[#1A1A24] dark:text-slate-300 dark:hover:bg-[#2D3748]"
                    title="放大查看"
                >
                    <Maximize2 size={12} />
                    放大查看
                </button>
            </div>

            <div className="relative min-h-[280px] flex-1 overflow-hidden bg-slate-100 dark:bg-[#0B0B10]">
                {renderIframe(iframeRef, '当前配置 3D 装机效果')}
                {!isReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 text-slate-500 backdrop-blur-sm dark:bg-[#121218]/80 dark:text-slate-300">
                        <RefreshCw size={16} className="mr-2 animate-spin" />
                        <span className="text-xs font-bold">加载 3D 模型...</span>
                    </div>
                )}
                {isEmpty && isReady && !showCaseRequirementHint && (
                    <div className="absolute inset-x-4 bottom-4 rounded-lg border border-white/70 bg-white/90 p-3 text-slate-600 shadow-sm backdrop-blur dark:border-white/10 dark:bg-[#121218]/90 dark:text-slate-300">
                        <div className="flex items-start gap-2">
                            <Info size={15} className="mt-0.5 shrink-0 text-slate-400" />
                            <div>
                                <div className="text-xs font-black text-slate-800 dark:text-white">还没有可生成的装机效果</div>
                                <div className="mt-1 text-[11px] font-bold leading-relaxed text-slate-500 dark:text-slate-400">先选择带 3D 图片/模型的机箱，再继续添加主板、显卡等部件。</div>
                            </div>
                        </div>
                    </div>
                )}
                {showFullImageFallback && (
                    <div className="absolute inset-0 z-10 flex flex-col bg-white/95 p-4 backdrop-blur-sm dark:bg-[#0B0B10]/95">
                        <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
                            <div>
                                <div className="text-sm font-black text-slate-900 dark:text-white">{imageFallbackTitle}</div>
                                <div className="mt-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">{imageFallbackDescription}</div>
                            </div>
                            <div className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500 dark:bg-[#1A1A24] dark:text-slate-300">
                                图片参考
                            </div>
                        </div>
                        {renderImageFallbackGrid()}
                    </div>
                )}
                {showCaseRequirementHint && renderCaseRequirementHint()}
                {showMissingImageStrip && (
                    <div className="absolute inset-x-3 bottom-3 z-10 flex items-center gap-2 overflow-hidden rounded-lg border border-white/70 bg-white/92 p-2 shadow-sm backdrop-blur dark:border-white/10 dark:bg-[#121218]/92">
                        <div className="shrink-0 text-[10px] font-black leading-tight text-slate-500 dark:text-slate-400">缺少模型<br />图片参考</div>
                        <div className="flex min-w-0 flex-1 gap-1.5 overflow-hidden">
                            {missingImageFallbackItems.slice(0, 5).map(item => (
                                <div key={`${item.category}-${item.name}`} className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-50 dark:border-[#1E293B] dark:bg-[#0B0B10]" title={item.name}>
                                    <img src={item.image} alt={item.name} className="h-full w-full object-contain p-1" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="shrink-0 border-t border-slate-100 p-2.5 dark:border-[#1E293B]">
                <div className="flex flex-wrap items-stretch gap-2">
                    <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2 dark:border-[#1E293B] dark:bg-[#0B0B10]">
                        <div className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-black ring-1 ${stateClassName}`}>
                            <PreviewIcon size={13} />
                            {previewState.label}
                        </div>
                        <div className="min-w-0 truncate text-[11px] font-bold text-slate-500 dark:text-slate-400">
                            {previewState.description}
                        </div>
                    </div>
                    <div className="flex w-[78px] shrink-0 flex-col justify-center rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5 text-right dark:border-[#1E293B] dark:bg-[#0B0B10]">
                        <div className="text-[18px] font-black leading-none text-slate-900 dark:text-white">{summary.rendered}/{summary.total || pc3dItems.length}</div>
                        <div className="mt-1 text-[8px] font-black uppercase tracking-wide text-slate-400">已显示</div>
                    </div>

                    <details className="group min-w-[210px] flex-1 rounded-lg border border-slate-100 bg-white dark:border-[#1E293B] dark:bg-[#121218]">
                        <summary className="flex h-full min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-[11px] font-black text-slate-500 dark:text-slate-400">
                            <span>模型匹配详情</span>
                            <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] text-slate-500 dark:bg-[#1A1A24] dark:text-slate-400">
                                真实 {summary.exact} · 同类 {summary.similar} · 暂无 {summary.missing.length}
                            </span>
                        </summary>
                        <div className="max-h-24 space-y-1 overflow-y-auto border-t border-slate-100 px-3 py-2 dark:border-[#1E293B]">
                            {summary.matches.map(match => (
                                <div key={`${match.category}-${match.assetName}-${match.kind}`} className="flex items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                    <span className={`w-12 shrink-0 rounded px-1.5 py-0.5 text-center text-[9px] font-black ${match.kind === 'exact' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'}`}>
                                        {match.kind === 'exact' ? '真实' : '同类'}
                                    </span>
                                    <span className="shrink-0 text-slate-400">{CATEGORY_MAP[match.category]}</span>
                                    <span className="min-w-0 truncate">{match.assetName}</span>
                                </div>
                            ))}
                            {summary.missing.map(item => (
                                <div key={`${item.category}-${item.name}`} className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                                    <span className="w-12 shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-center text-[9px] font-black text-slate-500 dark:bg-[#1A1A24] dark:text-slate-400">暂无</span>
                                    <span className="shrink-0">{CATEGORY_MAP[item.category]}</span>
                                    <span className="min-w-0 truncate">{item.name}</span>
                                </div>
                            ))}
                            {!summary.total && (
                                <div className="text-[11px] font-bold text-slate-400">配置为空时不会生成模型匹配结果。</div>
                            )}
                        </div>
                    </details>
                </div>
            </div>
        </section>
        {expandedLayer}
        </>
    );
}
