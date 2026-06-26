import { ApiService } from './api';

export type LeaderboardCategoryId = 'cpu' | 'gpu' | 'soc' | 'router';

export interface LeaderboardCategory {
    id: LeaderboardCategoryId;
    label: string;
    shortLabel: string;
    description: string;
}

export interface LeaderboardDefinition {
    id: string;
    category: LeaderboardCategoryId;
    title: string;
    shortTitle: string;
    metricLabel: string;
    unit?: string;
    group: string;
    rows: number;
}

export interface LeaderboardRow {
    rank: number;
    name: string;
    score: number;
    scoreText: string;
    unit?: string;
    detailUrl?: string;
    specs: string[];
    specMap: Record<string, string>;
}

export interface LeaderboardListResponse {
    board: LeaderboardDefinition;
    items: LeaderboardRow[];
    total: number;
    offset: number;
    limit: number;
    topScore: number;
}

export interface LeaderboardCatalogResponse {
    categories: LeaderboardCategory[];
    boards: LeaderboardDefinition[];
}

export interface LeaderboardCompareDelta {
    gap: number;
    percent: number;
    leader: string;
}

export interface LeaderboardCompareResponse {
    board: LeaderboardDefinition;
    first?: LeaderboardRow | null;
    second?: LeaderboardRow | null;
    delta?: LeaderboardCompareDelta | null;
}

export interface LeaderboardNameCandidate {
    name: string;
    boardCount: number;
    bestRank: number;
    specs: string[];
}

export interface LeaderboardCompareMetric {
    board: LeaderboardDefinition;
    first?: LeaderboardRow | null;
    second?: LeaderboardRow | null;
    delta?: LeaderboardCompareDelta | null;
}

export interface LeaderboardCategoryCompareResponse {
    category: LeaderboardCategoryId;
    firstQuery: string;
    secondQuery: string;
    firstResolved?: LeaderboardNameCandidate | null;
    secondResolved?: LeaderboardNameCandidate | null;
    firstCandidates: LeaderboardNameCandidate[];
    secondCandidates: LeaderboardNameCandidate[];
    metrics: LeaderboardCompareMetric[];
}

export class LeaderboardApi {
    static async getCatalog(): Promise<LeaderboardCatalogResponse> {
        return ApiService.get('/leaderboards/catalog');
    }

    static async getRows(
        boardId: string,
        options: { offset?: number; limit?: number; search?: string } = {}
    ): Promise<LeaderboardListResponse> {
        const params = new URLSearchParams();
        params.set('offset', String(options.offset ?? 0));
        params.set('limit', String(options.limit ?? 90));
        if (options.search?.trim()) {
            params.set('search', options.search.trim());
        }
        return ApiService.get(`/leaderboards/${boardId}?${params.toString()}`);
    }

    static async getCompositeRows(
        category: LeaderboardCategoryId,
        options: { offset?: number; limit?: number; search?: string } = {}
    ): Promise<LeaderboardListResponse> {
        const params = new URLSearchParams();
        params.set('offset', String(options.offset ?? 0));
        params.set('limit', String(options.limit ?? 90));
        if (options.search?.trim()) {
            params.set('search', options.search.trim());
        }
        return ApiService.get(`/leaderboards/composite/${category}?${params.toString()}`);
    }

    static async compare(data: {
        boardId: string;
        firstName: string;
        secondName: string;
    }): Promise<LeaderboardCompareResponse> {
        return ApiService.post('/leaderboards/compare', data);
    }

    static async compareCategory(data: {
        category: Extract<LeaderboardCategoryId, 'cpu' | 'gpu'>;
        firstName: string;
        secondName: string;
    }): Promise<LeaderboardCategoryCompareResponse> {
        return ApiService.post('/leaderboards/compare-category', data);
    }
}
