import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Box, CheckCircle2, Info, Layers, Maximize2, RefreshCw, X } from 'lucide-react';
import { BuildEntry, Category } from '../../types/clientTypes';
import { CATEGORY_MAP } from '../../data/clientData';

type MatchKind = 'exact' | 'similar' | 'missing';
type VisualCategory = Extract<Category, 'mainboard' | 'gpu' | 'ram' | 'power' | 'cooling' | 'fan' | 'case'>;

interface PC3DViewerProps {
    buildList: BuildEntry[];
    issues?: string[];
    className?: string;
    onSelectCase: () => void;
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

export default function PC3DViewer({ buildList, className = '', onSelectCase }: PC3DViewerProps) {
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const modalIframeRef = useRef<HTMLIFrameElement | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [selectedFallbackImage, setSelectedFallbackImage] = useState<{ name: string; image: string } | null>(null);
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
    const showCaseRequirementHint = isReady && (!selectedCase || caseModelUnavailable);
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
        : showFullImageFallback
            ? {
                label: '产品图片预览',
                tone: 'slate',
                description: '点击配件图片可放大查看。',
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
    const previewTitle = showFullImageFallback ? '产品图片预览' : '3D 装机效果预览';
    const previewDescription = caseModelUnavailable
        ? '当前机箱暂无 3D 模型，先展示产品图片。可更换标有“有3D模型”的机箱。'
        : showCaseRequirementHint
            ? '先选择标有“有3D模型”的机箱，再查看整机效果。'
            : showFullImageFallback
                ? '当前配置暂无可用 3D 模型，先展示已选配件的产品图片。'
                : previewState.description;
    const selectCase = () => {
        setIsExpanded(false);
        onSelectCase();
    };

    const renderImageFallbackGrid = (expanded = false) => (
        <div className={`grid min-h-0 flex-1 content-start gap-2.5 overflow-y-auto pr-1 ${expanded ? 'grid-cols-2 md:grid-cols-4 auto-rows-[190px]' : 'grid-cols-2 xl:grid-cols-3 auto-rows-[132px]'}`}>
            {imageFallbackItems.map(item => (
                <div key={`${item.category}-${item.name}`} className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-200/70 bg-white transition-colors hover:border-indigo-200 dark:border-[#1E293B] dark:bg-[#121218] dark:hover:border-indigo-500/40">
                    {item.image ? (
                        <button
                            type="button"
                            onClick={() => setSelectedFallbackImage({ name: item.name, image: item.image })}
                            className="flex min-h-0 flex-1 cursor-zoom-in items-center justify-center bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
                            title={`放大查看 ${item.name}`}
                        >
                            <img src={item.image} alt={item.name} className="h-full w-full object-contain p-2" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        </button>
                    ) : (
                        <div className="flex min-h-0 flex-1 items-center justify-center px-3 text-center text-[11px] text-slate-400 dark:text-slate-500">
                            暂无图片
                        </div>
                    )}
                    <div className="pointer-events-none absolute left-2 top-2 rounded-md bg-slate-100/95 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500">
                        {CATEGORY_MAP[item.category] || item.category}
                    </div>
                    <div className="shrink-0 truncate border-t border-slate-100 bg-slate-50/70 px-2.5 py-1.5 text-[10px] font-medium text-slate-600 dark:border-[#1E293B] dark:bg-white/[0.02] dark:text-slate-300" title={item.name}>
                        {item.name}
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

    const expandedLayer = isExpanded && typeof document !== 'undefined'
        ? createPortal(
            <div className="fixed inset-0 z-[150] bg-slate-950/80 p-5 backdrop-blur-md">
                <div className="flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0B0B10] shadow-2xl">
                    <div className="flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                        <div className="min-w-0">
                            <div className="text-sm font-black text-white">{previewTitle}</div>
                            <div className="mt-1 text-[11px] font-bold text-slate-400">{previewDescription}</div>
                        </div>
                        {showCaseRequirementHint && (
                            <button type="button" onClick={selectCase} className="shrink-0 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-500">
                                {selectedCase ? '更换机箱' : '选择机箱'}
                            </button>
                        )}
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
                        {showFullImageFallback ? (
                            <div className="relative flex h-full flex-col bg-white/95 p-5 dark:bg-[#0B0B10]">
                                {renderImageFallbackGrid(true)}
                            </div>
                        ) : (
                            renderIframe(modalIframeRef, '放大查看当前配置 3D 装机效果', true)
                        )}
                    </div>
                </div>
            </div>,
            document.body
        )
        : null;

    const imageLightbox = selectedFallbackImage && typeof document !== 'undefined'
        ? createPortal(
            <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/80 p-6 backdrop-blur-sm" onClick={() => setSelectedFallbackImage(null)}>
                <div className="relative flex max-h-full max-w-4xl flex-col overflow-hidden rounded-xl border border-white/15 bg-white shadow-2xl dark:bg-[#0B0B10]" onClick={(event) => event.stopPropagation()}>
                    <button
                        type="button"
                        onClick={() => setSelectedFallbackImage(null)}
                        className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950/75 text-white transition-colors hover:bg-slate-950"
                        title="关闭图片"
                        aria-label="关闭图片"
                    >
                        <X size={18} />
                    </button>
                    <img src={selectedFallbackImage.image} alt={selectedFallbackImage.name} className="min-h-0 max-h-[78vh] w-full object-contain p-6" />
                    <div className="border-t border-slate-100 px-5 py-3 text-sm font-black text-slate-700 dark:border-white/10 dark:text-slate-200">
                        {selectedFallbackImage.name}
                    </div>
                </div>
            </div>,
            document.body
        )
        : null;

    return (
        <>
        <section className={`flex flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-[#1E293B] dark:bg-[#121218] dark:shadow-none ${className}`}>
            <div className="shrink-0 border-b border-slate-100 px-4 py-3 dark:border-[#1E293B]">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                            <Box size={16} />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{previewTitle}</h3>
                            <p className="mt-0.5 text-[11px] text-slate-400">
                                {showFullImageFallback ? `${imageFallbackItems.filter(item => item.image).length} 张配件图片 · 点击图片可放大` : '随当前配置查看整机外观参考'}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsExpanded(true)}
                        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200/80 px-2.5 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-[#2D3748] dark:text-slate-300 dark:hover:bg-white/5"
                        title="放大查看"
                    >
                        <Maximize2 size={13} />
                        放大查看
                    </button>
                </div>
                {showCaseRequirementHint && (
                    <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-2.5 py-2 dark:bg-white/[0.03]">
                        <p className="flex min-w-0 items-start gap-1.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                            <Info size={13} className="mt-0.5 shrink-0" />
                            {selectedCase ? '机箱暂无 3D 模型，当前展示配件图片。' : '选择带有 3D 模型的机箱，即可查看整机效果。'}
                        </p>
                        <button type="button" onClick={selectCase} className="inline-flex shrink-0 items-center rounded-md px-1 text-[11px] font-semibold text-indigo-600 transition-colors hover:text-indigo-500 dark:text-indigo-300">
                            {selectedCase ? '更换机箱' : '选择机箱'}
                        </button>
                    </div>
                )}
            </div>

            <div className="relative min-h-[280px] flex-1 overflow-hidden bg-slate-100 dark:bg-[#0B0B10]">
                {renderIframe(iframeRef, '当前配置 3D 装机效果')}
                {!isReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 text-slate-500 backdrop-blur-sm dark:bg-[#121218]/80 dark:text-slate-300">
                        <RefreshCw size={16} className="mr-2 animate-spin" />
                        <span className="text-xs font-bold">加载 3D 模型...</span>
                    </div>
                )}
                {showFullImageFallback && (
                    <div className="absolute inset-0 z-10 flex flex-col bg-slate-50 p-3 dark:bg-[#0B0B10]">
                        {renderImageFallbackGrid()}
                    </div>
                )}
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

            {!showFullImageFallback && <div className="shrink-0 border-t border-slate-100 px-4 py-2.5 dark:border-[#1E293B]">
                <div className="flex flex-wrap items-center gap-3">
                        <div className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-semibold ring-1 ${stateClassName}`}>
                            <PreviewIcon size={13} />
                            {previewState.label}
                        </div>
                    <div className="flex shrink-0 items-center gap-1.5 text-[10px] text-slate-400">
                        <span className="font-semibold text-slate-600 dark:text-slate-300">{`${summary.rendered}/${summary.total || pc3dItems.length}`}</span>
                        3D 模型
                    </div>

                    <details className="group min-w-[180px] flex-1">
                        <summary className="flex cursor-pointer list-none items-center justify-end gap-2 py-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
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
            </div>}
            <aside aria-label="微信小程序二维码" className="flex shrink-0 items-center justify-between gap-4 border-t border-slate-100 bg-white px-4 py-2.5 dark:border-[#1E293B] dark:bg-[#121218]">
                <div className="min-w-0">
                    <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">微信小程序</p>
                    <p className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-200">手机上也能随时查配置</p>
                    <p className="mt-1 text-[11px] text-slate-400">微信搜索 <span className="font-medium text-slate-600 dark:text-slate-300">「蒋小鱼装机」</span></p>
                </div>
                <div className="flex shrink-0 items-center gap-2.5">
                    <span className="text-[10px] text-slate-400">微信扫一扫</span>
                    <img src="/assets/miniprogram-qrcode.jpg" alt="蒋小鱼装机微信小程序码" width={860} height={860} className="h-20 w-20 shrink-0 rounded-lg bg-white object-contain" />
                </div>
            </aside>
        </section>
        {expandedLayer}
        {imageLightbox}
        </>
    );
}
