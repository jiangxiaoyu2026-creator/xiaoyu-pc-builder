import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle,
    Box,
    CheckCircle2,
    ExternalLink,
    FileText,
    Link2,
    RefreshCw,
    Search,
    Unlink2,
    XCircle,
} from 'lucide-react';
import { ApiService } from '../../services/api';
import ModelPreview3D from './ModelPreview3D';

type MatchKind = 'exact' | 'similar' | 'none';
type MatchFilter = MatchKind | 'all';
type ReviewStatus = 'auto_exact' | 'manual_approved' | 'needs_review' | 'unmapped';
type ModelRelation = 'exact' | 'appearance' | 'similar';
type SuggestionStatus = 'direct' | 'replace_candidate' | 'review_conflict' | 'ambiguous' | 'existing';

interface MatchCounts {
    exact?: number;
    similar?: number;
    none?: number;
}

interface MappingSummary {
    total_products: number;
    by_match_kind: MatchCounts;
    by_category_match: Record<string, MatchCounts>;
    by_asset: Record<string, number>;
}

interface MappingAsset {
    asset_id: string;
    category: string;
    brand_label: string;
    model_name: string;
    buildcores_name: string;
    model_url: string;
}

interface ModelCatalogAsset extends MappingAsset {
    brand_cn?: string;
    brand_en?: string;
    manufacturer?: string;
    best_confidence?: string;
    interactive_model_url?: string;
    preferred_glb_path?: string;
    preferred_compressed_path?: string;
    part_numbers?: string;
    review_status?: 'linked' | 'unlinked' | 'excluded';
    linked_count?: number;
    linked_products?: Array<{
        product_id: string;
        category?: string;
        category_label?: string;
        brand?: string;
        model?: string;
        price?: number;
        relation?: string;
        source?: string;
        linked_at?: string;
    }>;
    excluded_reason?: string;
}

interface ProductMapping {
    product_id: string;
    category: string;
    category_label: string;
    brand: string;
    model: string;
    price: number;
    isRecommended: boolean;
    isDiscount: boolean;
    asset_id: string;
    asset_label: string;
    asset_source_name: string;
    asset_model_url: string;
    match_kind: MatchKind;
    match_label: string;
    review_status: ReviewStatus;
    confidence: number;
    reason: string;
    risk: string;
}

interface MappingDecision {
    action: 'approved' | 'rejected';
    product_id: string;
    decided_at: string;
    original?: ProductMapping;
}

interface CategorySyncRow {
    product_category: string;
    product_category_label: string;
    product_count: number;
    linked_count: number;
    unmapped_count: number;
    asset_categories: Record<string, number>;
    asset_count: number;
}

interface MappingData {
    generated_at: string;
    policy: string;
    summary: MappingSummary;
    assets: MappingAsset[];
    products: ProductMapping[];
    decisions?: Record<string, MappingDecision>;
    category_sync?: {
        rows: CategorySyncRow[];
        asset_category_counts: Record<string, number>;
        product_category_count: number;
        asset_category_count: number;
    };
}

interface ModelCatalogData {
    generated_at: string;
    total_assets: number;
    assets: ModelCatalogAsset[];
    summary?: {
        by_status?: Record<string, number>;
        by_category?: Record<string, Record<string, number>>;
    };
}

interface SuggestionAsset {
    asset_id: string;
    category: string;
    brand: string;
    label: string;
    model_name: string;
    buildcores_name: string;
}

interface MatchSuggestion {
    status: SuggestionStatus;
    product_id: string;
    category: string;
    category_label?: string;
    brand: string;
    model: string;
    price?: number;
    current_asset?: SuggestionAsset | null;
    draft_asset?: SuggestionAsset | null;
    suggested_asset?: SuggestionAsset | null;
    relation: ModelRelation;
    reason: string;
    confidence: number;
    options?: Array<SuggestionAsset | null>;
}

interface MatchSuggestionData {
    summary: {
        total: number;
        direct: number;
        replace_candidate: number;
        review_conflict: number;
        existing: number;
        ambiguous: number;
        by_category?: Record<string, Record<string, number>>;
        by_relation?: Record<string, number>;
    };
    suggestions: MatchSuggestion[];
}

const CATEGORY_ORDER = ['case', 'mainboard', 'gpu', 'cooling', 'power', 'fan', 'ram'];
const MATCH_ORDER: Record<MatchKind, number> = { similar: 0, exact: 1, none: 2 };
const CATEGORY_LABELS: Record<string, string> = {
    case: '机箱',
    mainboard: '主板',
    gpu: '显卡',
    cooling: '散热器',
    power: '电源',
    fan: '风扇',
    ram: '内存',
};

const MATCH_META: Record<MatchKind, {
    label: string;
    shortLabel: string;
    badgeClass: string;
    rowClass: string;
}> = {
    exact: {
        label: '已关联可用',
        shortLabel: '可用',
        badgeClass: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
        rowClass: 'border-l-emerald-400',
    },
    similar: {
        label: '候选待确认',
        shortLabel: '候选',
        badgeClass: 'bg-amber-50 text-amber-700 ring-amber-100',
        rowClass: 'border-l-amber-400',
    },
    none: {
        label: '未关联',
        shortLabel: '暂无',
        badgeClass: 'bg-slate-100 text-slate-600 ring-slate-200',
        rowClass: 'border-l-slate-300',
    },
};

function formatPrice(value: number) {
    if (!Number.isFinite(value) || value <= 0) return '-';
    return `¥${value.toLocaleString('zh-CN')}`;
}

function uniqueSorted(values: string[]) {
    return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

function reviewStatusLabel(status: ReviewStatus) {
    if (status === 'auto_exact') return '自动精准';
    if (status === 'manual_approved') return '已确认';
    if (status === 'needs_review') return '待确认';
    return '未关联';
}

function categorySort(a: string, b: string) {
    const ai = CATEGORY_ORDER.indexOf(a);
    const bi = CATEGORY_ORDER.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
}

function categoryLabel(category: string, fallback = '') {
    return CATEGORY_LABELS[category] || fallback || category;
}

function relationLabel(relation?: string) {
    if (relation === 'exact') return '精准型号';
    if (relation === 'appearance') return '同外观';
    return '相似复用';
}

function relationClass(relation?: string) {
    if (relation === 'exact') return 'bg-emerald-50 text-emerald-700';
    if (relation === 'appearance') return 'bg-sky-50 text-sky-700';
    return 'bg-amber-50 text-amber-700';
}

function suggestionStatusLabel(status: SuggestionStatus) {
    if (status === 'direct') return '可直接发布';
    if (status === 'replace_candidate') return '待替换旧模型';
    if (status === 'review_conflict') return '草稿冲突';
    if (status === 'ambiguous') return '需要人工判断';
    return '已处理';
}

function normalizeBrand(value?: string) {
    return (value || '').trim().toLowerCase();
}

function assetBrand(asset: ModelCatalogAsset | null | undefined) {
    return asset?.brand_label || asset?.brand_cn || asset?.brand_en || '';
}

function buildCategorySync(data: MappingData): CategorySyncRow[] {
    const assetCategoryCounts = new Map<string, number>();
    const assetsById = new Map(data.assets.map((asset) => [asset.asset_id, asset]));
    for (const asset of data.assets) {
        assetCategoryCounts.set(asset.category, (assetCategoryCounts.get(asset.category) ?? 0) + 1);
    }

    const rows = new Map<string, CategorySyncRow>();
    for (const product of data.products) {
        const row = rows.get(product.category) ?? {
            product_category: product.category,
            product_category_label: product.category_label || product.category,
            product_count: 0,
            linked_count: 0,
            unmapped_count: 0,
            asset_categories: {},
            asset_count: assetCategoryCounts.get(product.category) ?? 0,
        };
        row.product_count += 1;
        if (product.asset_id) {
            row.linked_count += 1;
            const assetCategory = assetsById.get(product.asset_id)?.category || product.category;
            row.asset_categories[assetCategory] = (row.asset_categories[assetCategory] ?? 0) + 1;
        } else {
            row.unmapped_count += 1;
        }
        rows.set(product.category, row);
    }
    return [...rows.values()].sort((a, b) => categorySort(a.product_category, b.product_category));
}

function StatCard({
    label,
    value,
    desc,
    tone,
}: {
    label: string;
    value: number;
    desc: string;
    tone: 'slate' | 'emerald' | 'amber' | 'rose';
}) {
    const toneClass = {
        slate: 'bg-slate-100 text-slate-700',
        emerald: 'bg-emerald-50 text-emerald-700',
        amber: 'bg-amber-50 text-amber-700',
        rose: 'bg-rose-50 text-rose-700',
    }[tone];

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</div>
                <div className={`rounded-lg px-2 py-1 text-[10px] font-black ${toneClass}`}>{desc}</div>
            </div>
            <div className="mt-3 text-3xl font-black tracking-tight text-slate-900">{value.toLocaleString('zh-CN')}</div>
        </div>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-slate-500">
            <FileText size={32} className="mb-3 text-slate-300" />
            <div className="text-sm font-bold">{message}</div>
        </div>
    );
}

export default function PC3DMappingReview() {
    const [data, setData] = useState<MappingData | null>(null);
    const [modelCatalog, setModelCatalog] = useState<ModelCatalogData | null>(null);
    const [matchSuggestions, setMatchSuggestions] = useState<MatchSuggestionData | null>(null);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [apiWritable, setApiWritable] = useState(true);
    const [loading, setLoading] = useState(false);
    const [actingId, setActingId] = useState('');
    const [matchFilter, setMatchFilter] = useState<MatchFilter>('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [brandFilter, setBrandFilter] = useState('all');
    const [query, setQuery] = useState('');
    const [assetCategoryFilter, setAssetCategoryFilter] = useState('all');
    const [assetStatusFilter, setAssetStatusFilter] = useState<'all' | 'unlinked' | 'linked' | 'excluded'>('all');
    const [assetQuery, setAssetQuery] = useState('');
    const [selectedAssetId, setSelectedAssetId] = useState('');
    const [productLinkQuery, setProductLinkQuery] = useState('');
    const [suggestionCategoryFilter, setSuggestionCategoryFilter] = useState('all');
    const [suggestionStatusFilter, setSuggestionStatusFilter] = useState<'all' | SuggestionStatus>('all');
    const [suggestionRelationFilter, setSuggestionRelationFilter] = useState<'all' | ModelRelation>('all');

    const loadData = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [nextData, nextCatalog, nextSuggestions] = await Promise.all([
                ApiService.get('/pc3d/mapping') as Promise<MappingData>,
                ApiService.get('/pc3d/model-catalog') as Promise<ModelCatalogData>,
                ApiService.get('/pc3d/model-match-suggestions') as Promise<MatchSuggestionData>,
            ]);
            setApiWritable(true);
            setData(nextData);
            setModelCatalog(nextCatalog);
            setMatchSuggestions(nextSuggestions);
        } catch (apiError) {
            try {
                const [mappingResponse, catalogResponse] = await Promise.all([
                    fetch('/data/pc3d/product-model-mapping.json', { cache: 'no-store' }),
                    fetch('/data/pc3d/model-catalog.json', { cache: 'no-store' }),
                ]);
                if (!mappingResponse.ok) throw new Error(`HTTP ${mappingResponse.status}`);
                const staticData = await mappingResponse.json() as MappingData;
                const staticCatalog = catalogResponse.ok ? await catalogResponse.json() as ModelCatalogData : null;
                setApiWritable(false);
                setData(staticData);
                setModelCatalog(staticCatalog);
                setMatchSuggestions(null);
                setNotice('当前只读取到静态映射文件，后台写入 API 暂不可用；部署后会自动走 /api/pc3d。');
            } catch (staticError) {
                setError(apiError instanceof Error ? apiError.message : staticError instanceof Error ? staticError.message : '加载失败');
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const products = data?.products ?? [];
    const assets = data?.assets ?? [];
    const modelAssets: ModelCatalogAsset[] = modelCatalog?.assets ?? assets.map((asset): ModelCatalogAsset => ({
        ...asset,
        review_status: 'unlinked' as const,
        linked_count: 0,
        linked_products: [],
    }));
    const decisions = data?.decisions ?? {};
    const assetsById = useMemo(() => new Map(assets.map((asset) => [asset.asset_id, asset])), [assets]);

    const categoryOptions = useMemo(() => {
        const byCategory = new Map(products.map((product) => [product.category, product.category_label]));
        return [...byCategory.entries()].sort((a, b) => categorySort(a[0], b[0]));
    }, [products]);

    const brandOptions = useMemo(() => uniqueSorted(products.map((product) => product.brand)), [products]);

    const filteredProducts = useMemo(() => {
        const text = query.trim().toLowerCase();
        return products
            .filter((product) => matchFilter === 'all' || product.match_kind === matchFilter)
            .filter((product) => categoryFilter === 'all' || product.category === categoryFilter)
            .filter((product) => brandFilter === 'all' || product.brand === brandFilter)
            .filter((product) => {
                if (!text) return true;
                const haystack = [
                    product.brand,
                    product.model,
                    product.category_label,
                    product.category,
                    product.asset_label,
                    product.asset_source_name,
                    product.reason,
                    product.risk,
                    product.product_id,
                    product.asset_id,
                ].join(' ').toLowerCase();
                return haystack.includes(text);
            })
            .sort((a, b) => {
                const matchDelta = MATCH_ORDER[a.match_kind] - MATCH_ORDER[b.match_kind];
                if (matchDelta) return matchDelta;
                const categoryDelta = categorySort(a.category, b.category);
                if (categoryDelta) return categoryDelta;
                if (b.confidence !== a.confidence) return b.confidence - a.confidence;
                return `${a.brand}${a.model}`.localeCompare(`${b.brand}${b.model}`, 'zh-CN');
            });
    }, [brandFilter, categoryFilter, matchFilter, products, query]);

    const categoryRows = useMemo(() => {
        if (!data) return [];
        return data.category_sync?.rows?.length ? data.category_sync.rows : buildCategorySync(data);
    }, [data]);

    const assetCategoryOptions = useMemo(() => {
        return uniqueSorted(modelAssets.map((asset) => asset.category)).sort(categorySort);
    }, [modelAssets]);

    const suggestionCategoryOptions = useMemo(() => {
        return uniqueSorted((matchSuggestions?.suggestions ?? []).map((suggestion) => suggestion.category)).sort(categorySort);
    }, [matchSuggestions]);

    const assetUseSummary = useMemo(() => {
        const byAsset = new Map<string, { exact: number; similar: number; none: number; total: number; products: ProductMapping[] }>();
        for (const asset of modelAssets) {
            byAsset.set(asset.asset_id, { exact: 0, similar: 0, none: 0, total: 0, products: [] });
        }
        for (const product of products) {
            if (!product.asset_id) continue;
            const item = byAsset.get(product.asset_id) ?? { exact: 0, similar: 0, none: 0, total: 0, products: [] };
            if (product.match_kind === 'exact') item.exact += 1;
            if (product.match_kind === 'similar') item.similar += 1;
            if (product.match_kind === 'none') item.none += 1;
            item.total += 1;
            item.products.push(product);
            byAsset.set(product.asset_id, item);
        }
        return byAsset;
    }, [modelAssets, products]);

    const assetRows = useMemo(() => {
        const text = assetQuery.trim().toLowerCase();
        return modelAssets
            .filter((asset) => assetCategoryFilter === 'all' || asset.category === assetCategoryFilter)
            .filter((asset) => assetStatusFilter === 'all' || (asset.review_status || 'unlinked') === assetStatusFilter)
            .filter((asset) => {
                if (!text) return true;
                return [
                    asset.asset_id,
                    asset.category,
                    asset.brand_label,
                    asset.brand_cn,
                    asset.brand_en,
                    asset.model_name,
                    asset.buildcores_name,
                    asset.part_numbers,
                    asset.model_url,
                    asset.interactive_model_url,
                ].join(' ').toLowerCase().includes(text);
            })
            .sort((a, b) => {
                const categoryDelta = categorySort(a.category, b.category);
                if (categoryDelta) return categoryDelta;
                const statusDelta = ['unlinked', 'linked', 'excluded'].indexOf(a.review_status || 'unlinked') - ['unlinked', 'linked', 'excluded'].indexOf(b.review_status || 'unlinked');
                if (statusDelta) return statusDelta;
                if ((b.linked_count || 0) !== (a.linked_count || 0)) return (b.linked_count || 0) - (a.linked_count || 0);
                return `${a.brand_label}${a.model_name}`.localeCompare(`${b.brand_label}${b.model_name}`, 'zh-CN');
            });
    }, [assetCategoryFilter, assetQuery, assetStatusFilter, modelAssets]);

    useEffect(() => {
        if (!assetRows.length) {
            setSelectedAssetId('');
            return;
        }
        if (!assetRows.some((asset) => asset.asset_id === selectedAssetId)) {
            setSelectedAssetId(assetRows[0].asset_id);
        }
    }, [assetRows, selectedAssetId]);

    useEffect(() => {
        setProductLinkQuery('');
    }, [selectedAssetId]);

    const selectedAsset = useMemo(() => {
        return modelAssets.find((asset) => asset.asset_id === selectedAssetId) ?? assetRows[0];
    }, [assetRows, modelAssets, selectedAssetId]);

    const selectedAssetUse = selectedAsset
        ? {
            exact: selectedAsset.linked_count || 0,
            similar: 0,
            none: 0,
            total: selectedAsset.linked_count || 0,
            products: [],
        }
        : { exact: 0, similar: 0, none: 0, total: 0, products: [] };

    const selectedAssetProducts = useMemo(() => {
        if (!selectedAsset) return [];
        return selectedAsset.linked_products ?? [];
    }, [selectedAsset]);

    const linkableProducts = useMemo(() => {
        if (!selectedAsset) return [];
        const text = productLinkQuery.trim().toLowerCase();
        const selectedBrand = normalizeBrand(assetBrand(selectedAsset));
        return products
            .filter((product) => product.category === selectedAsset.category)
            .filter((product) => {
                if (!text) return true;
                return [
                    product.brand,
                    product.model,
                    product.category_label,
                    product.product_id,
                    product.asset_label,
                    product.asset_id,
                    product.reason,
                ].join(' ').toLowerCase().includes(text);
            })
            .sort((a, b) => {
                const aSameAsset = a.asset_id === selectedAsset.asset_id ? 0 : 1;
                const bSameAsset = b.asset_id === selectedAsset.asset_id ? 0 : 1;
                if (aSameAsset !== bSameAsset) return aSameAsset - bSameAsset;
                const aSameBrand = selectedBrand && normalizeBrand(a.brand) === selectedBrand ? 0 : 1;
                const bSameBrand = selectedBrand && normalizeBrand(b.brand) === selectedBrand ? 0 : 1;
                if (aSameBrand !== bSameBrand) return aSameBrand - bSameBrand;
                const aHasAsset = a.asset_id ? 1 : 0;
                const bHasAsset = b.asset_id ? 1 : 0;
                if (aHasAsset !== bHasAsset) return aHasAsset - bHasAsset;
                const matchDelta = MATCH_ORDER[a.match_kind] - MATCH_ORDER[b.match_kind];
                if (matchDelta) return matchDelta;
                return `${a.brand}${a.model}`.localeCompare(`${b.brand}${b.model}`, 'zh-CN');
            })
            .slice(0, 160);
    }, [productLinkQuery, products, selectedAsset]);
    const modelStatusCounts = modelCatalog?.summary?.by_status ?? {
        linked: modelAssets.filter((asset) => asset.review_status === 'linked').length,
        unlinked: modelAssets.filter((asset) => !asset.review_status || asset.review_status === 'unlinked').length,
        excluded: modelAssets.filter((asset) => asset.review_status === 'excluded').length,
    };

    const actionableSuggestions = useMemo(() => {
        return (matchSuggestions?.suggestions ?? [])
            .filter((suggestion) => suggestion.status !== 'existing')
            .filter((suggestion) => suggestionCategoryFilter === 'all' || suggestion.category === suggestionCategoryFilter)
            .filter((suggestion) => suggestionStatusFilter === 'all' || suggestion.status === suggestionStatusFilter)
            .filter((suggestion) => suggestionRelationFilter === 'all' || suggestion.relation === suggestionRelationFilter)
            .sort((a, b) => {
                const statusOrder: Record<SuggestionStatus, number> = {
                    replace_candidate: 0,
                    review_conflict: 1,
                    direct: 2,
                    ambiguous: 3,
                    existing: 4,
                };
                const statusDelta = statusOrder[a.status] - statusOrder[b.status];
                if (statusDelta) return statusDelta;
                const categoryDelta = categorySort(a.category, b.category);
                if (categoryDelta) return categoryDelta;
                return `${a.brand}${a.model}`.localeCompare(`${b.brand}${b.model}`, 'zh-CN');
            })
            .slice(0, 140);
    }, [matchSuggestions, suggestionCategoryFilter, suggestionRelationFilter, suggestionStatusFilter]);

    const runAction = async (label: string, action: () => Promise<unknown>, productId = '') => {
        if (!apiWritable) {
            setError('当前静态页面不能写入，请通过已部署的后台或本地筛选服务操作。');
            return;
        }
        setActingId(productId || label);
        setError('');
        try {
            await action();
            setNotice(`${label}完成`);
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : `${label}失败`);
        } finally {
            setActingId('');
        }
    };

    const syncDefaults = () => runAction('同步已确认映射', () => ApiService.post('/pc3d/sync-defaults', {}));
    const autoLinkExactModels = () => runAction('生成精准草稿', () => ApiService.post('/pc3d/model-auto-link-exact', {}));
    const autoLinkSmartModels = () => runAction('发布精确模型', () => ApiService.post('/pc3d/model-auto-link-smart', {}));
    const approveProduct = (productId: string) => runAction('标记可用', () => ApiService.post('/pc3d/approve', { product_id: productId }), productId);
    const linkModelForReview = (assetId: string, productId: string, relation: ModelRelation) => runAction(relation === 'exact' ? '精准关联模型' : relation === 'appearance' ? '同外观关联模型' : '相似复用模型', () => ApiService.post('/pc3d/model-link', { asset_id: assetId, product_id: productId, relation }), productId);
    const replaceProductModel = (assetId: string, productId: string, relation: ModelRelation) => runAction('替换旧模型', () => ApiService.post('/pc3d/model-replace-product-asset', { asset_id: assetId, product_id: productId, relation }), productId);
    const unlinkModelForReview = (assetId: string, productId: string) => runAction('取消模型关联', () => ApiService.post('/pc3d/model-unlink', { asset_id: assetId, product_id: productId }), productId);
    const excludeModel = (assetId: string) => runAction('排除模型', () => ApiService.post('/pc3d/model-exclude', { asset_id: assetId }), assetId);
    const restoreModel = (assetId: string) => runAction('恢复模型', () => ApiService.post('/pc3d/model-restore', { asset_id: assetId }), assetId);
    const rejectProduct = (productId: string) => runAction('标记不可用', () => ApiService.post('/pc3d/reject', { product_id: productId }), productId);
    const restoreProduct = (productId: string) => runAction('撤销处理', () => ApiService.post('/pc3d/restore', { product_id: productId }), productId);

    return (
        <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-indigo-600">
                            <Box size={15} />
                            PC 3D Model Mapping
                        </div>
                        <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900">3D 模型关联同步</h1>
                        <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">
                            当前策略是客户页只展示已确认可用的精确模型；替换候选和同外观复用会先停在后台审核，避免外观不准时强行显示给客户。
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={loadData}
                            disabled={loading}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                            <RefreshCw size={14} />
                            刷新
                        </button>
                        <button
                            onClick={autoLinkExactModels}
                            disabled={!apiWritable || Boolean(actingId)}
                            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white transition hover:bg-emerald-500 disabled:opacity-50"
                        >
                            <Link2 size={14} />
                            生成精准草稿
                        </button>
                        <button
                            onClick={autoLinkSmartModels}
                            disabled={!apiWritable || Boolean(actingId)}
                            className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-3 py-2 text-xs font-black text-white transition hover:bg-sky-500 disabled:opacity-50"
                        >
                            <Link2 size={14} />
                            发布精确模型
                        </button>
                        <button
                            onClick={syncDefaults}
                            disabled={!apiWritable || Boolean(actingId)}
                            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-black text-white transition hover:bg-slate-700 disabled:opacity-50"
                        >
                            <Link2 size={14} />
                            同步已确认映射
                        </button>
                        <a
                            href="/data/pc3d/product-model-mapping.json"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 transition-colors hover:bg-slate-200"
                        >
                            <ExternalLink size={13} />
                            JSON
                        </a>
                    </div>
                </div>
            </div>

            {notice && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                    <CheckCircle2 size={16} />
                    {notice}
                </div>
            )}

            {error && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                    <AlertTriangle size={16} />
                    {error}
                </div>
            )}

            {!data && !error && <EmptyState message="正在加载 3D 模型关联表..." />}

            {data && (
                <>
                    <div className="grid gap-4 md:grid-cols-4">
                        <StatCard label="模型库" value={modelAssets.length} desc={`${data.summary.total_products} 个后台产品`} tone="slate" />
                        <StatCard label="已关联" value={modelStatusCounts.linked || 0} desc="审核草稿/正式映射" tone="emerald" />
                        <StatCard label="未关联" value={modelStatusCounts.unlinked || 0} desc="待人工判断" tone="amber" />
                        <StatCard label="已排除" value={modelStatusCounts.excluded || 0} desc="暂不使用" tone="rose" />
                    </div>

                    {matchSuggestions && (
                        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
                                <div>
                                    <h2 className="text-base font-black text-slate-900">智能匹配建议</h2>
                                    <p className="mt-1 text-xs font-bold text-slate-400">内存按外观系列匹配；风扇按系列、尺寸、LCD/反叶匹配；有旧模型冲突的需要你确认替换。</p>
                                </div>
	                                <div className="flex flex-wrap items-center gap-2 text-xs font-black">
	                                    <span className="rounded-lg bg-sky-50 px-2.5 py-1.5 text-sky-700">可加草稿 {matchSuggestions.summary.direct || 0}</span>
	                                    <span className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-amber-700">待替换 {matchSuggestions.summary.replace_candidate || 0}</span>
	                                    <span className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-rose-700">冲突 {matchSuggestions.summary.review_conflict || 0}</span>
	                                    <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-slate-600">拿不准 {matchSuggestions.summary.ambiguous || 0}</span>
	                                </div>
	                            </div>
	                            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
	                                <select
	                                    value={suggestionCategoryFilter}
	                                    onChange={(event) => setSuggestionCategoryFilter(event.target.value)}
	                                    className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
	                                >
	                                    <option value="all">全部分类</option>
	                                    {suggestionCategoryOptions.map((category) => (
	                                        <option key={category} value={category}>{categoryLabel(category)}</option>
	                                    ))}
	                                </select>
	                                <select
	                                    value={suggestionStatusFilter}
	                                    onChange={(event) => setSuggestionStatusFilter(event.target.value as typeof suggestionStatusFilter)}
	                                    className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
	                                >
	                                    <option value="all">全部处理状态</option>
	                                    <option value="direct">可加草稿</option>
	                                    <option value="replace_candidate">待替换旧模型</option>
	                                    <option value="review_conflict">草稿冲突</option>
	                                    <option value="ambiguous">需要人工判断</option>
	                                </select>
	                                <select
	                                    value={suggestionRelationFilter}
	                                    onChange={(event) => setSuggestionRelationFilter(event.target.value as typeof suggestionRelationFilter)}
	                                    className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
	                                >
	                                    <option value="all">全部匹配关系</option>
	                                    <option value="exact">精准型号</option>
	                                    <option value="appearance">同外观</option>
	                                    <option value="similar">相似复用</option>
	                                </select>
	                                <div className="text-xs font-black text-slate-400">当前显示 {actionableSuggestions.length} 条，已处理项不显示在这里</div>
	                            </div>
	                            {actionableSuggestions.length === 0 ? (
	                                <div className="p-4">
	                                    <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">当前没有需要处理的智能建议。</div>
                                </div>
                            ) : (
                                <div className="max-h-[420px] overflow-auto p-3">
                                    <div className="grid gap-2 xl:grid-cols-2">
                                        {actionableSuggestions.map((suggestion) => {
                                            const suggestedAsset = suggestion.suggested_asset;
                                            const actionDisabled = Boolean(actingId) || !apiWritable || !suggestedAsset?.asset_id;
                                            return (
                                                <div key={`${suggestion.status}-${suggestion.product_id}-${suggestedAsset?.asset_id || 'none'}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-black text-slate-500">{categoryLabel(suggestion.category, suggestion.category_label)}</span>
                                                        <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-black ${relationClass(suggestion.relation)}`}>{relationLabel(suggestion.relation)}</span>
                                                        <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-black ${suggestion.status === 'replace_candidate' ? 'bg-amber-100 text-amber-700' : suggestion.status === 'review_conflict' ? 'bg-rose-100 text-rose-700' : suggestion.status === 'direct' ? 'bg-sky-100 text-sky-700' : 'bg-slate-200 text-slate-600'}`}>
                                                            {suggestionStatusLabel(suggestion.status)}
                                                        </span>
                                                    </div>
                                                    <div className="mt-2 text-sm font-black leading-5 text-slate-900">{suggestion.brand} {suggestion.model}</div>
                                                    <div className="mt-1 text-xs font-bold leading-5 text-slate-500">{suggestion.reason}</div>
                                                    <div className="mt-2 grid gap-2 text-xs font-bold text-slate-600">
                                                        {suggestion.current_asset && (
                                                            <div className="rounded-lg bg-amber-50 px-2 py-1.5 text-amber-800">
                                                                旧模型：{suggestion.current_asset.label}
                                                            </div>
                                                        )}
                                                        {suggestion.draft_asset && (
                                                            <div className="rounded-lg bg-rose-50 px-2 py-1.5 text-rose-800">
                                                                草稿已有：{suggestion.draft_asset.label}
                                                            </div>
                                                        )}
                                                        {suggestedAsset && (
                                                            <div className="rounded-lg bg-white px-2 py-1.5 text-slate-700 ring-1 ring-slate-100">
                                                                建议：{suggestedAsset.label}
                                                            </div>
                                                        )}
                                                        {suggestion.status === 'ambiguous' && suggestion.options?.length ? (
                                                            <div className="rounded-lg bg-slate-100 px-2 py-1.5 text-slate-500">
                                                                可能模型：{suggestion.options.filter(Boolean).map((option) => option?.label).join(' / ')}
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                                        {suggestion.status === 'direct' && suggestedAsset && (
                                                            <button
                                                                onClick={() => linkModelForReview(suggestedAsset.asset_id, suggestion.product_id, suggestion.relation)}
                                                                disabled={actionDisabled}
                                                                className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-2 text-xs font-black text-white transition hover:bg-sky-500 disabled:opacity-50"
                                                            >
                                                                <Link2 size={13} />
                                                                加草稿
                                                            </button>
                                                        )}
                                                        {(suggestion.status === 'replace_candidate' || suggestion.status === 'review_conflict') && suggestedAsset && (
                                                            <button
                                                                onClick={() => replaceProductModel(suggestedAsset.asset_id, suggestion.product_id, suggestion.relation)}
                                                                disabled={actionDisabled}
                                                                className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-black text-white transition hover:bg-slate-700 disabled:opacity-50"
                                                            >
                                                                <Link2 size={13} />
                                                                替换为建议模型
                                                            </button>
                                                        )}
                                                        {suggestedAsset && (
                                                            <button
                                                                onClick={() => setSelectedAssetId(suggestedAsset.asset_id)}
                                                                className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
                                                            >
                                                                查看模型
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </section>
                    )}

                    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
                            <div>
                                <h2 className="text-base font-black text-slate-900">模型优先关联工作台</h2>
                                <p className="mt-1 text-xs font-bold text-slate-400">左侧是完整 3D 模型库；先看模型，再关联相似后台产品，不合适的模型先排除。</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <select
                                    value={assetCategoryFilter}
                                    onChange={(event) => setAssetCategoryFilter(event.target.value)}
                                    className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                                >
                                    <option value="all">全部模型分类</option>
                                    {assetCategoryOptions.map((category) => (
                                        <option key={category} value={category}>{categoryLabel(category)}</option>
                                    ))}
                                </select>
                                <select
                                    value={assetStatusFilter}
                                    onChange={(event) => setAssetStatusFilter(event.target.value as typeof assetStatusFilter)}
                                    className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                                >
                                    <option value="all">全部状态</option>
                                    <option value="unlinked">未关联</option>
                                    <option value="linked">已关联</option>
                                    <option value="excluded">已排除</option>
                                </select>
                                <div className="relative w-[260px]">
                                    <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        value={assetQuery}
                                        onChange={(event) => setAssetQuery(event.target.value)}
                                        placeholder="搜索模型品牌、型号、ID、料号"
                                        className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm font-bold text-slate-700 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid min-h-[680px] xl:grid-cols-[340px_minmax(0,1fr)_420px]">
                            <div className="border-b border-slate-200 xl:border-b-0 xl:border-r">
                                <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
                                    <div className="text-xs font-black uppercase tracking-wide text-slate-400">3D Models</div>
                                    <div className="text-xs font-black text-slate-500">{assetRows.length} / {modelAssets.length}</div>
                                </div>
                                <div className="max-h-[640px] overflow-auto p-3">
                                    {assetRows.length === 0 ? (
                                        <EmptyState message="没有符合条件的模型" />
                                    ) : (
                                        <div className="space-y-2">
                                            {assetRows.map((asset) => {
                                                const active = selectedAsset?.asset_id === asset.asset_id;
                                                const status = asset.review_status || 'unlinked';
                                                const statusClass = status === 'linked'
                                                    ? 'bg-emerald-50 text-emerald-700'
                                                    : status === 'excluded'
                                                        ? 'bg-rose-50 text-rose-700'
                                                        : 'bg-slate-100 text-slate-500';
                                                const statusLabel = status === 'linked' ? `已关联 ${asset.linked_count || 0}` : status === 'excluded' ? '已排除' : '未关联';
                                                return (
                                                    <button
                                                        key={asset.asset_id}
                                                        onClick={() => setSelectedAssetId(asset.asset_id)}
                                                        className={`w-full rounded-xl border p-3 text-left transition ${active ? 'border-indigo-300 bg-indigo-50 ring-4 ring-indigo-50' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}
                                                    >
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="min-w-0">
                                                                <div className="truncate text-sm font-black text-slate-900">{asset.brand_label || asset.brand_cn || asset.brand_en || categoryLabel(asset.category)}</div>
                                                                <div className="mt-1 line-clamp-2 text-xs font-bold leading-5 text-slate-500">{asset.model_name || asset.buildcores_name || asset.asset_id}</div>
                                                            </div>
                                                            <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500">{categoryLabel(asset.category)}</span>
                                                        </div>
                                                        <div className="mt-3 flex flex-wrap gap-1.5">
                                                            <span className={`rounded-md px-2 py-1 text-[10px] font-black ${statusClass}`}>{statusLabel}</span>
                                                            {asset.best_confidence && <span className="rounded-md bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-700">{asset.best_confidence}</span>}
                                                            <span className="rounded-md bg-slate-50 px-2 py-1 text-[10px] font-black text-slate-400">{asset.asset_id}</span>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="min-w-0 border-b border-slate-200 xl:border-b-0 xl:border-r">
                                {selectedAsset ? (
                                    <div className="flex h-full min-h-[680px] flex-col">
                                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500">{categoryLabel(selectedAsset.category)}</span>
                                                    <span className={`rounded-md px-2 py-1 text-[10px] font-black ${selectedAsset.review_status === 'linked' ? 'bg-emerald-50 text-emerald-700' : selectedAsset.review_status === 'excluded' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-500'}`}>
                                                        {selectedAsset.review_status === 'linked' ? `已关联 ${selectedAssetUse.exact}` : selectedAsset.review_status === 'excluded' ? '已排除' : '未关联'}
                                                    </span>
                                                    {selectedAsset.best_confidence && <span className="rounded-md bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-700">{selectedAsset.best_confidence}</span>}
                                                </div>
                                                <div className="mt-2 truncate text-sm font-black text-slate-900">
                                                    {selectedAsset.brand_label || selectedAsset.brand_cn || selectedAsset.brand_en} · {selectedAsset.model_name || selectedAsset.buildcores_name}
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                {(selectedAsset.model_url || selectedAsset.interactive_model_url) && (
                                                    <a
                                                        href={selectedAsset.model_url || selectedAsset.interactive_model_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-200"
                                                    >
                                                        <ExternalLink size={13} />
                                                        源文件
                                                    </a>
                                                )}
                                                {selectedAsset.review_status === 'excluded' ? (
                                                    <button
                                                        onClick={() => restoreModel(selectedAsset.asset_id)}
                                                        disabled={actingId === selectedAsset.asset_id}
                                                        className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-black text-white transition hover:bg-slate-700 disabled:opacity-50"
                                                    >
                                                        恢复
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => excludeModel(selectedAsset.asset_id)}
                                                        disabled={actingId === selectedAsset.asset_id}
                                                        className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 ring-1 ring-rose-100 transition hover:bg-rose-100 disabled:opacity-50"
                                                    >
                                                        <Unlink2 size={13} />
                                                        排除
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="relative min-h-[520px] flex-1 bg-slate-100">
                                            <ModelPreview3D key={selectedAsset.asset_id} asset={selectedAsset} />
                                        </div>
                                        <div className="border-t border-slate-100 p-4">
                                            <div className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">当前模型关联</div>
                                            {selectedAssetProducts.length === 0 ? (
                                                <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">这个模型还没有关联任何后台产品，可以在右侧搜索后手动关联。</div>
                                            ) : (
                                                <div className="grid max-h-52 gap-2 overflow-auto pr-1 md:grid-cols-2">
                                                    {selectedAssetProducts.map((product) => (
                                                        <div key={product.product_id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span className={`rounded-md px-2 py-1 text-[10px] font-black ${relationClass(product.relation)}`}>
                                                                    {product.source === 'published' && product.relation !== 'exact' && product.relation !== 'appearance' ? '正式映射' : relationLabel(product.relation)}
                                                                </span>
                                                                <span className="text-[10px] font-black text-slate-400">{product.source === 'published' ? '已发布' : '审核草稿'}</span>
                                                            </div>
                                                            <div className="mt-2 line-clamp-2 text-xs font-black leading-5 text-slate-800">{product.brand} {product.model}</div>
                                                            {product.source === 'review' && (
                                                                <button
                                                                    onClick={() => unlinkModelForReview(selectedAsset.asset_id, product.product_id)}
                                                                    disabled={Boolean(actingId)}
                                                                    className="mt-2 inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-1 text-[11px] font-black text-rose-700 ring-1 ring-rose-100 transition hover:bg-rose-100 disabled:opacity-50"
                                                                >
                                                                    <XCircle size={12} />
                                                                    取消
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-4">
                                        <EmptyState message="请选择一个 3D 模型" />
                                    </div>
                                )}
                            </div>

                            <div className="min-w-0">
                                <div className="border-b border-slate-100 p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <h3 className="text-sm font-black text-slate-900">关联后台产品</h3>
                                            <p className="mt-1 text-xs font-bold text-slate-400">只显示同分类产品，避免误把机箱模型关联到其他类目。</p>
                                        </div>
                                        <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-500">{selectedAsset ? categoryLabel(selectedAsset.category) : '-'}</span>
                                    </div>
                                    <div className="relative mt-3">
                                        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            value={productLinkQuery}
                                            onChange={(event) => setProductLinkQuery(event.target.value)}
                                            placeholder="搜索后台品牌、型号、产品ID"
                                            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm font-bold text-slate-700 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50"
                                        />
                                    </div>
                                </div>
                                <div className="max-h-[600px] overflow-auto p-3">
                                    {!selectedAsset ? (
                                        <EmptyState message="先选择模型，再关联产品" />
                                    ) : linkableProducts.length === 0 ? (
                                        <EmptyState message="没有找到同分类后台产品" />
                                    ) : (
                                        <div className="space-y-2">
                                            {linkableProducts.map((product) => {
                                                const linkedProduct = selectedAssetProducts.find((link) => String(link.product_id) === String(product.product_id));
                                                const draftLink = linkedProduct?.source === 'review' ? linkedProduct : null;
                                                const draftRelation: ModelRelation = draftLink?.relation === 'exact' || draftLink?.relation === 'appearance'
                                                    ? draftLink.relation
                                                    : 'similar';
                                                const publishedLink = linkedProduct?.source === 'published' || product.asset_id === selectedAsset.asset_id;
                                                const sameAsset = Boolean(linkedProduct || publishedLink);
                                                const brandDifferent = Boolean(assetBrand(selectedAsset) && product.brand && normalizeBrand(product.brand) !== normalizeBrand(assetBrand(selectedAsset)));
                                                return (
                                                    <div key={product.product_id} className={`rounded-xl border p-3 ${sameAsset ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="min-w-0">
                                                                <div className="flex flex-wrap items-center gap-1.5">
                                                                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-black text-slate-500">{product.category_label}</span>
                                                                    {!brandDifferent && <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-black text-emerald-700">同品牌</span>}
                                                                    {brandDifferent && <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-black text-amber-700">品牌不同</span>}
                                                                    {product.isRecommended && <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-black text-indigo-600">推荐</span>}
                                                                    {product.isDiscount && <span className="rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-black text-rose-600">优惠</span>}
                                                                </div>
                                                                <div className="mt-2 line-clamp-2 text-sm font-black leading-5 text-slate-900">{product.brand} {product.model}</div>
                                                                <div className="mt-1 text-xs font-bold text-slate-400">{formatPrice(product.price)} · {product.product_id}</div>
                                                                {product.asset_id && !sameAsset && (
                                                                    <div className="mt-2 rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-800">
                                                                        当前已关联：{product.asset_label || product.asset_id}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="shrink-0">
                                                                {draftLink ? (
                                                                    <div className="grid gap-1.5">
                                                                        <span className="inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-100 px-3 py-2 text-xs font-black text-emerald-700">
                                                                            <CheckCircle2 size={13} />
                                                                            草稿
                                                                        </span>
                                                                        <button
                                                                            onClick={() => replaceProductModel(selectedAsset.asset_id, product.product_id, draftRelation)}
                                                                            disabled={Boolean(actingId) || !apiWritable}
                                                                            className="inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white transition hover:bg-emerald-500 disabled:opacity-50"
                                                                        >
                                                                            <CheckCircle2 size={13} />
                                                                            发布
                                                                        </button>
                                                                        <button
                                                                            onClick={() => unlinkModelForReview(selectedAsset.asset_id, product.product_id)}
                                                                            disabled={Boolean(actingId) || !apiWritable}
                                                                            className="inline-flex items-center justify-center gap-1 rounded-lg bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 ring-1 ring-rose-100 transition hover:bg-rose-100 disabled:opacity-50"
                                                                        >
                                                                            <XCircle size={13} />
                                                                            取消
                                                                        </button>
                                                                    </div>
                                                                ) : publishedLink ? (
                                                                    <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-3 py-2 text-xs font-black text-emerald-700">
                                                                        <CheckCircle2 size={13} />
                                                                        已发布
                                                                    </span>
                                                                ) : (
                                                                    <div className="grid gap-1.5">
                                                                        <button
                                                                            onClick={() => linkModelForReview(selectedAsset.asset_id, product.product_id, 'exact')}
                                                                            disabled={Boolean(actingId) || !apiWritable || selectedAsset.review_status === 'excluded'}
                                                                            className="inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white transition hover:bg-emerald-500 disabled:opacity-50"
                                                                        >
                                                                            <Link2 size={13} />
                                                                            精准
                                                                        </button>
                                                                        <button
                                                                            onClick={() => linkModelForReview(selectedAsset.asset_id, product.product_id, 'appearance')}
                                                                            disabled={Boolean(actingId) || !apiWritable || selectedAsset.review_status === 'excluded'}
                                                                            className="inline-flex items-center justify-center gap-1 rounded-lg bg-sky-600 px-3 py-2 text-xs font-black text-white transition hover:bg-sky-500 disabled:opacity-50"
                                                                        >
                                                                            同外观
                                                                        </button>
                                                                        <button
                                                                            onClick={() => linkModelForReview(selectedAsset.asset_id, product.product_id, 'similar')}
                                                                            disabled={Boolean(actingId) || !apiWritable || selectedAsset.review_status === 'excluded'}
                                                                            className="inline-flex items-center justify-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-black text-white transition hover:bg-slate-700 disabled:opacity-50"
                                                                        >
                                                                            复用
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <h2 className="text-sm font-black text-slate-900">分类同步关系</h2>
                                <p className="mt-1 text-xs font-bold text-slate-400">后台分类和模型分类会相互对应；机箱候选先人工确认，客户页不会显示未确认机箱模型。</p>
                            </div>
                            <div className="text-xs font-black text-slate-400">
                                产品分类 {categoryRows.length} 个 · 模型分类 {data.category_sync?.asset_category_count ?? new Set(data.assets.map((asset) => asset.category)).size} 个
                            </div>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                            {categoryRows.map((row) => {
                                const assetCategoryLabels = Object.entries(row.asset_categories)
                                    .map(([category, count]) => `${category} ${count}`)
                                    .join(' / ') || '暂无模型';
                                const categoryAligned = Object.keys(row.asset_categories).every((category) => category === row.product_category);
                                return (
                                    <div key={row.product_category} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="font-black text-slate-900">{row.product_category_label}</div>
                                            <span className={`rounded-md px-2 py-1 text-[10px] font-black ${categoryAligned ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                {categoryAligned ? '分类一致' : '跨类候选'}
                                            </span>
                                        </div>
                                        <div className="mt-2 text-xs font-bold leading-5 text-slate-500">
                                            后台：{row.product_category} · 模型：{assetCategoryLabels}<br />
                                            已关联 {row.linked_count} / {row.product_count} · 可用模型 {row.asset_count}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                        <section className="min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm">
                            <div className="border-b border-slate-200 p-4">
                                <div className="flex flex-wrap items-center gap-3">
                                    <div className="relative min-w-[260px] flex-1">
                                        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            value={query}
                                            onChange={(event) => setQuery(event.target.value)}
                                            placeholder="搜索分类、品牌、型号、模型名、原因、风险"
                                            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm font-bold text-slate-700 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50"
                                        />
                                    </div>
                                    <select
                                        value={matchFilter}
                                        onChange={(event) => setMatchFilter(event.target.value as MatchFilter)}
                                        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                                    >
                                        <option value="all">全部状态</option>
                                        <option value="exact">已关联可用</option>
                                        <option value="similar">候选待确认</option>
                                        <option value="none">未关联</option>
                                    </select>
                                    <select
                                        value={categoryFilter}
                                        onChange={(event) => setCategoryFilter(event.target.value)}
                                        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                                    >
                                        <option value="all">全部类目</option>
                                        {categoryOptions.map(([value, label]) => (
                                            <option key={value} value={value}>{label}</option>
                                        ))}
                                    </select>
                                    <select
                                        value={brandFilter}
                                        onChange={(event) => setBrandFilter(event.target.value)}
                                        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                                    >
                                        <option value="all">全部品牌</option>
                                        {brandOptions.map((brand) => (
                                            <option key={brand} value={brand}>{brand}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-400">
                                    <span>当前显示 {filteredProducts.length.toLocaleString('zh-CN')} / {products.length.toLocaleString('zh-CN')} 条</span>
                                    <span>{apiWritable ? '后台 API 可写入' : '静态只读模式'}</span>
                                </div>
                            </div>

                            {filteredProducts.length === 0 ? (
                                <div className="p-4">
                                    <EmptyState message="没有符合筛选条件的产品" />
                                </div>
                            ) : (
                                <div className="max-h-[720px] overflow-auto">
                                    <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                                        <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-400">
                                            <tr>
                                                <th className="border-b border-slate-200 px-4 py-3">状态</th>
                                                <th className="border-b border-slate-200 px-4 py-3">后台产品</th>
                                                <th className="border-b border-slate-200 px-4 py-3">3D 模型</th>
                                                <th className="border-b border-slate-200 px-4 py-3">依据与风险</th>
                                                <th className="border-b border-slate-200 px-4 py-3">审核</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredProducts.map((product) => {
                                                const meta = MATCH_META[product.match_kind];
                                                const asset = product.asset_id ? assetsById.get(product.asset_id) : undefined;
                                                const decision = decisions[product.product_id];
                                                const isActing = actingId === product.product_id;
                                                return (
                                                    <tr key={product.product_id} className={`border-l-4 ${meta.rowClass}`}>
                                                        <td className="border-b border-slate-100 px-4 py-4 align-top">
                                                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-[11px] font-black ring-1 ${meta.badgeClass}`}>
                                                                {meta.shortLabel}
                                                            </span>
                                                            <div className="mt-2 text-[10px] font-black text-slate-400">{reviewStatusLabel(product.review_status)}</div>
                                                            <div className="mt-2 text-xs font-black text-slate-900">{product.confidence || 0}%</div>
                                                            <div className="mt-1 h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                                                                <div
                                                                    className={`h-full ${product.match_kind === 'exact' ? 'bg-emerald-500' : product.match_kind === 'similar' ? 'bg-amber-500' : 'bg-slate-300'}`}
                                                                    style={{ width: `${Math.max(0, Math.min(100, product.confidence || 0))}%` }}
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className="max-w-[300px] border-b border-slate-100 px-4 py-4 align-top">
                                                            <div className="flex flex-wrap items-center gap-1.5">
                                                                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-black text-slate-500">{product.category_label}</span>
                                                                {product.isRecommended && <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-black text-indigo-600">推荐</span>}
                                                                {product.isDiscount && <span className="rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-black text-rose-600">优惠</span>}
                                                            </div>
                                                            <div className="mt-2 font-black leading-5 text-slate-900">{product.brand} {product.model}</div>
                                                            <div className="mt-1 text-xs font-bold text-slate-400">{formatPrice(product.price)} · {product.product_id}</div>
                                                        </td>
                                                        <td className="max-w-[320px] border-b border-slate-100 px-4 py-4 align-top">
                                                            {product.asset_id ? (
                                                                <>
                                                                    <div className="font-black leading-5 text-slate-900">{product.asset_label || asset?.model_name || '未命名模型'}</div>
                                                                    <div className="mt-1 text-xs font-bold text-slate-400">{asset?.category || product.category} · {asset?.brand_label || product.asset_source_name || '3D 模型'} · {product.asset_id}</div>
                                                                    {product.asset_model_url && (
                                                                        <a
                                                                            href={product.asset_model_url}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            className="mt-2 inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-600 transition hover:bg-slate-200"
                                                                        >
                                                                            <ExternalLink size={12} />
                                                                            打开 GLB
                                                                        </a>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <div className="inline-flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-black text-slate-500">
                                                                    <XCircle size={14} />
                                                                    暂无候选模型
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="max-w-[420px] border-b border-slate-100 px-4 py-4 align-top">
                                                            <div className="flex items-start gap-2 text-sm font-bold leading-5 text-slate-600">
                                                                <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-slate-400" />
                                                                <span>{product.reason || '暂无说明'}</span>
                                                            </div>
                                                            {product.risk && (
                                                                <div className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold leading-5 text-amber-800">
                                                                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                                                                    <span>{product.risk}</span>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="border-b border-slate-100 px-4 py-4 align-top">
                                                            <div className="grid min-w-[96px] gap-2">
                                                                {product.asset_id && product.match_kind !== 'exact' && (
                                                                    <button
                                                                        onClick={() => approveProduct(product.product_id)}
                                                                        disabled={isActing}
                                                                        className="inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 ring-1 ring-emerald-100 transition hover:bg-emerald-100 disabled:opacity-50"
                                                                    >
                                                                        <Link2 size={13} />
                                                                        可用
                                                                    </button>
                                                                )}
                                                                {product.asset_id && (
                                                                    <button
                                                                        onClick={() => rejectProduct(product.product_id)}
                                                                        disabled={isActing}
                                                                        className="inline-flex items-center justify-center gap-1 rounded-lg bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 ring-1 ring-rose-100 transition hover:bg-rose-100 disabled:opacity-50"
                                                                    >
                                                                        <Unlink2 size={13} />
                                                                        不可用
                                                                    </button>
                                                                )}
                                                                {!product.asset_id && decision?.original && (
                                                                    <button
                                                                        onClick={() => restoreProduct(product.product_id)}
                                                                        disabled={isActing}
                                                                        className="inline-flex items-center justify-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-black text-white transition hover:bg-slate-700 disabled:opacity-50"
                                                                    >
                                                                        撤销
                                                                    </button>
                                                                )}
                                                                {!product.asset_id && !decision?.original && (
                                                                    <span className="rounded-lg bg-slate-50 px-3 py-2 text-center text-xs font-black text-slate-400">无模型</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>

                        <aside className="flex flex-col gap-4">
                            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                                <h2 className="text-sm font-black text-slate-900">当前审核口径</h2>
                                <div className="mt-3 space-y-3 text-xs font-bold leading-5 text-slate-500">
                                    <div className="flex gap-2">
                                        <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] ${MATCH_META.exact.badgeClass}`}>可用</span>
                                        <span>已经确认，客户页可以展示；机箱必须人工确认后才会进入这里。</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] ${MATCH_META.similar.badgeClass}`}>候选</span>
                                        <span>后面如果新增模型或重跑匹配，新的候选会进这里等待处理。</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] ${MATCH_META.none.badgeClass}`}>暂无</span>
                                        <span>没有候选模型，客户页不会强行显示不存在的模型。</span>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                                <h2 className="text-sm font-black text-slate-900">3D 模型使用情况</h2>
                                <div className="mt-3 space-y-2">
                                    {data.assets.map((asset) => {
                                        const use = assetUseSummary.get(asset.asset_id) ?? { exact: 0, similar: 0, none: 0, total: 0, products: [] };
                                        return (
                                            <div key={asset.asset_id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                                                <div className="text-xs font-black leading-5 text-slate-800">{asset.brand_label} · {asset.model_name}</div>
                                                <div className="mt-1 text-[11px] font-bold text-slate-400">
                                                    分类 {asset.category} · 已关联 {use.exact} 个产品
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </aside>
                    </div>
                </>
            )}
        </div>
    );
}
