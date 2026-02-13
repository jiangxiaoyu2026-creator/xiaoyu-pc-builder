import { HardwareItem, ConfigItem, PricingStrategy, UserItem, UsedItem, RecycleRequest, SMSSettings, SystemStats, DailyStat, AboutUsConfig } from '../types/adminTypes';
import { DEFAULT_AI_CONTENT } from '../data/adminData';
import { ApiService } from './api';

// ... (existing imports)

// --- AI Settings ---


const KEYS = {
    PRODUCTS: 'xiaoyu_products',
    CONFIGS: 'xiaoyu_configs',
    SETTINGS: 'xiaoyu_settings',
    USERS: 'xiaoyu_users',
    USED_ITEMS: 'xiaoyu_used_items',
    RECYCLE_REQUESTS: 'xiaoyu_recycle_requests',
    CURRENT_USER: 'xiaoyu_current_user',
    SYSTEM_STATS: 'xiaoyu_system_stats',
    ABOUT_US_CONFIG: 'xiaoyu_about_us_config',
    INIT_FLAG: 'xiaoyu_init_done_v15',
};

// Safe storage wrapper to prevent crashes
const safeSetItem = (key: string, value: string) => {
    try {
        localStorage.setItem(key, value);
    } catch (e: any) {
        if (e.name === 'QuotaExceededError' || e.code === 22) {
            console.error('LocalStorage Quota Exceeded! Failed to save:', key);
            alert('本地存储空间已满，无法保存更多数据。请尝试清理浏览器缓存或删除部分已保存的配置。');
        } else {
            console.error('LocalStorage Error:', e);
        }
    }
};

const DEFAULT_STRATEGY: PricingStrategy = {
    serviceFeeRate: 0.06,
    discountTiers: [
        { id: 'd1', name: '标准售价', multiplier: 1.0, description: '普通用户购买价格', sortOrder: 1 },
        { id: 'd2', name: '粉丝专享', multiplier: 0.99, description: '关注直播间粉丝', sortOrder: 2 },
        { id: 'd3', name: '老铁特惠', multiplier: 0.98, description: '回头客/老客户', sortOrder: 3 },
        { id: 'd4', name: '老板骨折', multiplier: 0.95, description: '特殊活动或亲友价', sortOrder: 4 },
    ]
};

const DEFAULT_SMS_SETTINGS: SMSSettings = {
    provider: 'mock',
    accessKeyId: '',
    accessKeySecret: '',
    signName: '小鱼装机平台',
    templateCode: 'SMS_123456789',
    enabled: false
};

class StorageService {
    constructor() {
        // Migration will be called externally or via a specific trigger
    }

    async init() {
        try {
            const initDone = localStorage.getItem('xiaoyu_db_migration_done_v1');
            if (initDone) return;

            console.log('UseStorage: Migrating data to MongoDB...');

            // 1. Migrate Products
            const localProductsData = localStorage.getItem(KEYS.PRODUCTS);
            if (localProductsData) {
                const products = JSON.parse(localProductsData);
                for (const p of products) await ApiService.post('/products', p);
            }

            // 2. Migrate Configs
            const localConfigsData = localStorage.getItem(KEYS.CONFIGS);
            if (localConfigsData) {
                const configs = JSON.parse(localConfigsData);
                for (const c of configs) await ApiService.post('/configs', c);
            }

            // 3. Migrate Settings
            const localSettingsData = localStorage.getItem(KEYS.SETTINGS);
            if (localSettingsData) {
                const settings = JSON.parse(localSettingsData);
                await ApiService.post('/settings', { pricingStrategy: settings });
            }

            // 4. Migrate Used Items
            const localUsedData = localStorage.getItem(KEYS.USED_ITEMS);
            if (localUsedData) {
                const items = JSON.parse(localUsedData);
                for (const i of items) await ApiService.post('/used', i);
            }

            // 5. Migrate Users
            const localUsersData = localStorage.getItem(KEYS.USERS);
            if (localUsersData) {
                const users = JSON.parse(localUsersData);
                for (const u of users) await ApiService.post('/auth/register', u);
            }

            localStorage.removeItem(KEYS.PRODUCTS);
            localStorage.removeItem(KEYS.CONFIGS);
            localStorage.removeItem(KEYS.SETTINGS);
            localStorage.removeItem(KEYS.USED_ITEMS);
            localStorage.removeItem(KEYS.USERS);

            localStorage.setItem('xiaoyu_db_migration_done_v1', 'true');
            console.log('UseStorage: Migration complete and local data cleared.');
        } catch (err) {
            console.error('Migration failed:', err);
        }

        // Cleanup V2: Ensure all legacy data is removed even if migrated previously
        const cleanupDone = localStorage.getItem('xiaoyu_cleanup_done_v2');
        if (!cleanupDone) {
            console.log('UseStorage: Cleaning up legacy local data (V2)...');
            localStorage.removeItem(KEYS.PRODUCTS);
            localStorage.removeItem(KEYS.CONFIGS);
            localStorage.removeItem(KEYS.SETTINGS);
            localStorage.removeItem(KEYS.USED_ITEMS);
            localStorage.removeItem(KEYS.USERS);
            localStorage.setItem('xiaoyu_cleanup_done_v2', 'true');
        }
    }

    // --- Products ---
    async getProducts(page: number = 1, pageSize: number = 20, category: string = 'all', brand: string = 'all', search: string = ''): Promise<{ items: HardwareItem[], total: number }> {
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                page_size: pageSize.toString()
            });
            if (category && category !== 'all') params.append('category', category);
            if (brand && brand !== 'all') params.append('brand', brand);
            if (search) params.append('search', search);

            const result = await ApiService.get(`/products?${params.toString()}`);
            return {
                items: result.items || [],
                total: result.total || 0
            };
        } catch (e) {
            console.error('Failed to load products', e);
            return { items: [], total: 0 };
        }
    }

    async getAdminProducts(page: number = 1, pageSize: number = 20, category: string = 'all', brand: string = 'all', search: string = ''): Promise<{ items: HardwareItem[], total: number }> {
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                page_size: pageSize.toString()
            });
            if (category && category !== 'all') params.append('category', category);
            if (brand && brand !== 'all') params.append('brand', brand);
            if (search) params.append('search', search);

            const result = await ApiService.get(`/products/admin?${params.toString()}`);
            return {
                items: Array.isArray(result.items) ? result.items : [],
                total: result.total || 0
            };
        } catch (e) {
            console.error('Failed to load admin products', e);
            return { items: [], total: 0 };
        }
    }

    async getBrands(category: string = 'all'): Promise<string[]> {
        try {
            const params = new URLSearchParams();
            if (category && category !== 'all') params.append('category', category);

            const result = await ApiService.get(`/products/brands?${params.toString()}`);
            return Array.isArray(result) ? result : [];
        } catch (e) {
            console.error('Failed to load brands', e);
            return [];
        }
    }

    async saveProducts(products: HardwareItem[]) {
        for (const p of products) {
            await ApiService.post('/products', p);
        }
        window.dispatchEvent(new Event('xiaoyu-storage-update'));
    }

    async saveProduct(product: HardwareItem) {
        await ApiService.post('/products', product);
        window.dispatchEvent(new Event('xiaoyu-storage-update'));
    }

    async deleteProduct(id: string) {
        await ApiService.delete(`/products/${id}`);
        window.dispatchEvent(new Event('xiaoyu-storage-update'));
    }

    // --- Configs ---
    async getConfigs(params: {
        page?: number,
        pageSize?: number,
        tag?: string,
        search?: string,
        sortBy?: string,
        isRecommended?: boolean,
        status?: string
    } = {}): Promise<{ items: ConfigItem[], total: number }> {
        const { page = 1, pageSize = 20, tag, search, sortBy, isRecommended, status } = params;
        try {
            let url = `/configs?page=${page}&page_size=${pageSize}`;
            if (tag && tag !== 'all') url += `&tag=${encodeURIComponent(tag)}`;
            if (search) url += `&search=${encodeURIComponent(search)}`;
            if (sortBy) url += `&sort_by=${sortBy}`;
            if (isRecommended !== undefined) url += `&is_recommended=${isRecommended}`;
            if (status) url += `&status=${status}`;

            const result = await ApiService.get(url);
            return {
                items: Array.isArray(result.items) ? result.items : [],
                total: result.total || 0
            };
        } catch (e) {
            console.error('Failed to load configs', e);
            return { items: [], total: 0 };
        }
    }

    async getAdminConfigs(page: number = 1, pageSize: number = 20, status: string = 'all'): Promise<{ items: ConfigItem[], total: number }> {
        try {
            const result = await ApiService.get(`/configs?page=${page}&page_size=${pageSize}&status=${status}`);
            return {
                items: Array.isArray(result.items) ? result.items : [],
                total: result.total || 0
            };
        } catch (e) {
            console.error('Failed to load admin configs', e);
            return { items: [], total: 0 };
        }
    }

    async saveConfigs(configs: ConfigItem[]) {
        for (const c of configs) {
            await ApiService.post('/configs', c);
        }
        this.logNewConfig();
        window.dispatchEvent(new Event('xiaoyu-storage-update'));
    }

    // --- Settings ---
    async getPricingStrategy(): Promise<PricingStrategy> {
        try {
            const data = await ApiService.get('/settings');
            return data.pricingStrategy || DEFAULT_STRATEGY;
        } catch (e) {
            return DEFAULT_STRATEGY;
        }
    }

    async savePricingStrategy(settings: PricingStrategy) {
        await ApiService.post('/settings', { pricingStrategy: settings });
    }

    // --- AI Settings ---
    // --- AI Settings ---
    async getAISettings(): Promise<import('../types/adminTypes').AISettings> {
        try {
            const data = await ApiService.get('/settings');
            return data.aiSettings || DEFAULT_AI_CONTENT;
        } catch (e) {
            return DEFAULT_AI_CONTENT as any;
        }
    }

    async saveAISettings(settings: import('../types/adminTypes').AISettings) {
        await ApiService.post('/settings', { aiSettings: settings });
    }

    // --- SMS Settings ---
    async getSMSSettings(): Promise<import('../types/adminTypes').SMSSettings> {
        try {
            const data = await ApiService.get('/sms/config');
            if (data.success) {
                return {
                    provider: 'aliyun',
                    accessKeyId: data.config.accessKeyId,
                    accessKeySecret: '', // Don't return secret
                    signName: data.config.signName,
                    templateCode: data.config.templateCode,
                    enabled: data.config.isConfigured
                };
            }
            return DEFAULT_SMS_SETTINGS;
        } catch (e) {
            return DEFAULT_SMS_SETTINGS;
        }
    }

    async saveSMSSettings(settings: import('../types/adminTypes').SMSSettings) {
        await ApiService.post('/sms/config', {
            accessKeyId: settings.accessKeyId,
            accessKeySecret: settings.accessKeySecret,
            signName: settings.signName,
            templateCode: settings.templateCode
        });
    }

    // --- Users ---
    async getUsers(): Promise<UserItem[]> {
        try {
            return await ApiService.get('/auth/users');
        } catch (e) {
            return [];
        }
    }

    async saveUser(user: UserItem) {
        if (user.id || (user as any)._id) {
            await ApiService.post('/auth/user', user);
        } else {
            await ApiService.post('/auth/users', user);
        }

        // Update current user if it matches
        const currentUser = this.getCurrentUser();
        if (currentUser && (currentUser.id === user.id || currentUser.id === (user as any)._id)) {
            localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
            window.dispatchEvent(new Event('xiaoyu-login'));
        }
        window.dispatchEvent(new Event('xiaoyu-user-update'));
    }

    async saveUsers(users: UserItem[]) {
        for (const u of users) {
            await ApiService.post('/auth/user', u);
        }
        window.dispatchEvent(new Event('xiaoyu-user-update'));
    }

    async updateUserVIP(userId: string, durationDays: number) {
        const users = await this.getUsers();
        const user = users.find(u => u.id === userId || (u as any)._id === userId);
        if (user) {
            const now = Date.now();
            const currentExpire = user.vipExpireAt ? new Date(user.vipExpireAt).getTime() : 0;
            // If already VIP and not expired, extend. Otherwise start from now.
            const startTime = currentExpire > now ? currentExpire : now;
            user.vipExpireAt = startTime + durationDays * 24 * 60 * 60 * 1000;
            await this.saveUser(user);
        }
    }

    // --- Invite System ---
    generateInviteCode(): string {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 排除容易混淆的字符
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    async ensureUserInviteCode(userId: string): Promise<string> {
        // 1. Try to get from local current user first
        let currentUser = this.getCurrentUser();
        if (currentUser && (currentUser.id === userId || (currentUser as any)._id === userId)) {
            if (currentUser.inviteCode) return currentUser.inviteCode;
        }

        // 2. Try to fetch from /auth/me (if it is the current user)
        try {
            const remoteUser = await ApiService.get('/auth/me');
            if (remoteUser && (remoteUser.id === userId || remoteUser._id === userId)) {
                // Update local storage if needed
                if (currentUser && (currentUser.id === userId || (currentUser as any)._id === userId)) {
                    localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(remoteUser));
                }
                return remoteUser.inviteCode || '';
            }
        } catch (e) {
            console.error('Failed to fetch user profile for invite code', e);
        }

        return '';
    }

    async findUserByInviteCode(code: string): Promise<UserItem | null> {
        if (!code || code.length !== 6) return null;
        const users = await this.getUsers();
        return users.find(u => u.inviteCode?.toUpperCase() === code.toUpperCase()) || null;
    }

    async processReferral(inviterUserId: string): Promise<{ success: boolean; message: string }> {
        const MAX_INVITE_VIP_DAYS = 30;
        const DAYS_PER_INVITE = 7; // 每邀请一人获得7天VIP

        const users = await this.getUsers();
        const inviter = users.find(u => u.id === inviterUserId || (u as any)._id === inviterUserId);

        if (!inviter) {
            return { success: false, message: '邀请人不存在' };
        }

        const currentVipDays = inviter.inviteVipDays || 0;

        if (currentVipDays >= MAX_INVITE_VIP_DAYS) {
            return { success: false, message: '邀请人已达 VIP 上限' };
        }

        // 计算实际奖励天数（不超过上限）
        const actualDays = Math.min(DAYS_PER_INVITE, MAX_INVITE_VIP_DAYS - currentVipDays);

        // 更新邀请人的 VIP 和统计
        inviter.inviteCount = (inviter.inviteCount || 0) + 1;
        inviter.inviteVipDays = currentVipDays + actualDays;

        // 更新 VIP 到期时间
        const now = Date.now();
        const currentExpire = inviter.vipExpireAt && (inviter.vipExpireAt as any) > now ? (inviter.vipExpireAt as any) : now;
        inviter.vipExpireAt = currentExpire + actualDays * 24 * 60 * 60 * 1000;

        await this.saveUser(inviter);

        return {
            success: true,
            message: `邀请成功！获得 ${actualDays} 天 VIP${currentVipDays + actualDays >= MAX_INVITE_VIP_DAYS ? '（已达上限）' : ''}`
        };
    }

    // --- Used Items ---
    async getUsedItems(params: {
        page?: number,
        pageSize?: number,
        type?: string,
        category?: string,
        condition?: string,
        status?: string
    } = {}): Promise<{ items: UsedItem[], total: number }> {
        const { page = 1, pageSize = 20, type, category, condition, status } = params;
        try {
            let url = `/used?page=${page}&page_size=${pageSize}`;
            if (type && type !== 'all') url += `&type=${type}`;
            if (category && category !== 'all') url += `&category=${encodeURIComponent(category)}`;
            if (condition && condition !== 'all') url += `&condition=${encodeURIComponent(condition)}`;
            if (status) url += `&status=${status}`;

            const result = await ApiService.get(url);
            if (result && Array.isArray(result.items)) {
                return {
                    items: result.items.map((item: any) => ({
                        ...item,
                        images: typeof item.images === 'string' ? JSON.parse(item.images) : (item.images || []),
                        inspectionReport: typeof item.inspectionReport === 'string' ? JSON.parse(item.inspectionReport) : item.inspectionReport
                    })),
                    total: result.total || 0
                };
            }
            return { items: [], total: 0 };
        } catch (e) {
            return { items: [], total: 0 };
        }
    }

    async getAdminUsedItems(page: number = 1, pageSize: number = 20, status: string = 'all'): Promise<{ items: UsedItem[], total: number }> {
        try {
            const result = await ApiService.get(`/used?page=${page}&page_size=${pageSize}&status=${status}`);
            if (result && Array.isArray(result.items)) {
                return {
                    items: result.items.map((item: any) => ({
                        ...item,
                        images: typeof item.images === 'string' ? JSON.parse(item.images) : (item.images || []),
                        inspectionReport: typeof item.inspectionReport === 'string' ? JSON.parse(item.inspectionReport) : item.inspectionReport
                    })),
                    total: result.total || 0
                };
            }
            return { items: [], total: 0 };
        } catch (e) {
            return { items: [], total: 0 };
        }
    }

    async updateUsedItem(item: UsedItem) {
        // Use PUT for updates. Ensure item.id is present.
        const id = item.id || (item as any)._id;
        if (!id) return;
        await ApiService.put(`/used/${id}`, item);
        window.dispatchEvent(new Event('xiaoyu-used-items-update'));
    }

    async deleteUsedItem(id: string) {
        await ApiService.delete(`/used/${id}`); // Standard REST
        window.dispatchEvent(new Event('xiaoyu-used-items-update'));
    }

    async addUsedItem(item: UsedItem) {
        await ApiService.post('/used', item);
        window.dispatchEvent(new Event('xiaoyu-used-items-update'));
    }

    async markUsedItemAsSold(id: string) {
        // First get the item
        try {
            // We might need to fetch via API if not local, but here we assume storage sync.
            // Better to just call an API endpoint if available, but let's stick to PUT update pattern
            // Since we don't have a direct "get one" in storage cleanly without fetching all, 
            // let's rely on the backend router's specific endpoint if it exists, or update via PUT.
            // The router has @router.post("/{item_id}/mark-sold"), let's use that.
            await ApiService.post(`/used/${id}/mark-sold`, {});
            window.dispatchEvent(new Event('xiaoyu-used-items-update'));
        } catch (e) {
            console.error("Failed to mark as sold", e);
        }
    }


    async getRecycleRequests(page: number = 1, pageSize: number = 20): Promise<{ items: RecycleRequest[], total: number }> {
        try {
            const result = await ApiService.get(`/recycle?page=${page}&page_size=${pageSize}`);
            return {
                items: Array.isArray(result.items) ? result.items : [],
                total: result.total || 0
            };
        } catch (e) {
            return { items: [], total: 0 };
        }
    }

    async addRecycleRequest(request: RecycleRequest) {
        await ApiService.post('/recycle', request);
        window.dispatchEvent(new Event('xiaoyu-recycle-requests-update'));
    }

    async updateRecycleRequest(request: RecycleRequest) {
        await ApiService.post('/recycle', request);
        window.dispatchEvent(new Event('xiaoyu-recycle-requests-update'));
    }

    async markRecycleRequestAsRead(id: string) {
        try {
            await ApiService.post(`/recycle/${id}/read`, {});
            window.dispatchEvent(new Event('xiaoyu-recycle-requests-update'));
        } catch (error) {
            console.error('Failed to mark recycle request as read:', error);
        }
    }

    async deleteRecycleRequest(id: string) {
        await ApiService.delete(`/recycle/${id}`);
        window.dispatchEvent(new Event('xiaoyu-recycle-requests-update'));
    }

    // --- User Likes ---
    async getUserLikes(userId: string): Promise<string[]> {
        try {
            const data = localStorage.getItem(`xiaoyu_likes_${userId}`);
            return data ? JSON.parse(data) : [];
        } catch (e) { return []; }
    }

    async saveUserLikes(userId: string, likes: string[]) {
        safeSetItem(`xiaoyu_likes_${userId}`, JSON.stringify(likes));
    }

    async toggleUserLike(userId: string, configId: string): Promise<boolean> {
        const likes = await this.getUserLikes(userId);
        const idx = likes.indexOf(configId);
        let isLiked = false;

        if (idx >= 0) {
            likes.splice(idx, 1); // Unlike
            isLiked = false;
        } else {
            likes.push(configId); // Like
            isLiked = true;
        }

        await this.saveUserLikes(userId, likes);
        return isLiked;
    }

    // --- Auth ---
    getCurrentUser(): UserItem | null {
        try {
            const data = localStorage.getItem(KEYS.CURRENT_USER);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            return null;
        }
    }

    async login(username: string, password?: string): Promise<UserItem | null> {
        try {
            const res = await ApiService.login({ username, password: password || '' });
            localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(res.user));
            if (res.access_token) localStorage.setItem('xiaoyu_token', res.access_token);
            window.dispatchEvent(new Event('xiaoyu-login'));
            return res.user;
        } catch (e) {
            return null;
        }
    }

    async loginEmail(email: string, code: string): Promise<UserItem | null> {
        try {
            const res = await ApiService.post('/auth/login-email', { email, code });
            localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(res.user));
            if (res.access_token) localStorage.setItem('xiaoyu_token', res.access_token);
            window.dispatchEvent(new Event('xiaoyu-login'));
            return res.user;
        } catch (e) {
            return null;
        }
    }

    logout() {
        localStorage.removeItem(KEYS.CURRENT_USER);
    }

    // --- Utils ---
    resetData() {
        localStorage.clear();
        window.location.reload();
    }

    // --- Comments ---
    async getComments(configId?: string): Promise<import('../types/adminTypes').CommentItem[]> {
        try {
            const data = localStorage.getItem('xiaoyu_comments');
            const allComments: import('../types/adminTypes').CommentItem[] = data ? JSON.parse(data) : [];
            if (configId) {
                return allComments.filter(c => c.configId === configId && c.status === 'active');
            }
            return allComments;
        } catch (e) {
            return [];
        }
    }

    async saveComment(comment: import('../types/adminTypes').CommentItem) {
        let all: import('../types/adminTypes').CommentItem[] = [];
        try {
            const data = localStorage.getItem('xiaoyu_comments');
            all = data ? JSON.parse(data) : [];
        } catch (e) { }

        const idx = all.findIndex(c => c.id === comment.id);
        if (idx >= 0) all[idx] = comment;
        else all.unshift(comment);

        localStorage.setItem('xiaoyu_comments', JSON.stringify(all));
        window.dispatchEvent(new Event('xiaoyu-comment-update'));
    }

    async deleteComment(id: string) {
        try {
            const data = localStorage.getItem('xiaoyu_comments');
            let all: import('../types/adminTypes').CommentItem[] = data ? JSON.parse(data) : [];
            all = all.filter(c => c.id !== id);
            localStorage.setItem('xiaoyu_comments', JSON.stringify(all));
            window.dispatchEvent(new Event('xiaoyu-comment-update'));
        } catch (e) { }
    }

    // --- SMS Rate Limiting ---
    checkSMSLimit(phone: string): { canSend: boolean, reason?: string } {
        try {
            const logsData = localStorage.getItem('xiaoyu_sms_logs');
            const logs: Record<string, { dailyCount: number, lastDate: string, lastTimestamp: number }> = logsData ? JSON.parse(logsData) : {};

            const log = logs[phone];
            const today = new Date().toISOString().split('T')[0];

            if (!log) return { canSend: true };

            // 60s cooldown check
            const now = Date.now();
            if (now - log.lastTimestamp < 60000) {
                return { canSend: false, reason: '请求过于频繁，请 60 秒后再试' };
            }

            // Daily limit check (5 attempts)
            if (log.lastDate === today && log.dailyCount >= 5) {
                return { canSend: false, reason: '该手机号今日验证码发送次数已达上限 (5次)' };
            }

            return { canSend: true };
        } catch (e) {
            return { canSend: true };
        }
    }


    logSMSAttempt(phone: string) {
        try {
            const logsData = localStorage.getItem('xiaoyu_sms_logs');
            const logs: Record<string, { dailyCount: number, lastDate: string, lastTimestamp: number }> = logsData ? JSON.parse(logsData) : {};

            const today = new Date().toISOString().split('T')[0];
            const log = logs[phone] || { dailyCount: 0, lastDate: today, lastTimestamp: 0 };

            if (log.lastDate !== today) {
                log.dailyCount = 1;
                log.lastDate = today;
            } else {
                log.dailyCount += 1;
            }
            log.lastTimestamp = Date.now();

            logs[phone] = log;
            localStorage.setItem('xiaoyu_sms_logs', JSON.stringify(logs));
        } catch (e) { }
    }

    // --- Email Rate Limiting ---
    checkEmailLimit(email: string): { canSend: boolean, reason?: string } {
        try {
            const logsData = localStorage.getItem('xiaoyu_email_logs');
            const logs: Record<string, { dailyCount: number, lastDate: string, lastTimestamp: number }> = logsData ? JSON.parse(logsData) : {};

            const log = logs[email];
            const today = new Date().toISOString().split('T')[0];

            if (!log) return { canSend: true };

            const now = Date.now();
            if (now - log.lastTimestamp < 60000) {
                return { canSend: false, reason: '请求过于频繁，请 60 秒后再试' };
            }

            if (log.lastDate === today && log.dailyCount >= 10) { // Email allows more than SMS
                return { canSend: false, reason: '该邮箱今日验证码发送次数已达上限 (10次)' };
            }

            return { canSend: true };
        } catch (e) {
            return { canSend: true };
        }
    }

    logEmailAttempt(email: string) {
        try {
            const logsData = localStorage.getItem('xiaoyu_email_logs');
            const logs: Record<string, { dailyCount: number, lastDate: string, lastTimestamp: number }> = logsData ? JSON.parse(logsData) : {};

            const today = new Date().toISOString().split('T')[0];
            const log = logs[email] || { dailyCount: 0, lastDate: today, lastTimestamp: 0 };

            if (log.lastDate !== today) {
                log.dailyCount = 1;
                log.lastDate = today;
            } else {
                log.dailyCount += 1;
            }
            log.lastTimestamp = Date.now();

            logs[email] = log;
            localStorage.setItem('xiaoyu_email_logs', JSON.stringify(logs));
        } catch (e) { }
    }

    async saveConfig(config: ConfigItem) {
        await ApiService.post('/configs', config);
        window.dispatchEvent(new Event('xiaoyu-storage-update'));
    }

    async updateConfig(config: ConfigItem) {
        if (!config.id) return;
        await ApiService.put(`/configs/${config.id}`, config);
        window.dispatchEvent(new Event('xiaoyu-storage-update'));
    }

    // --- Settings ---
    // --- Articles ---
    async getArticles(page: number = 1, pageSize: number = 20): Promise<{ items: import('../types/clientTypes').Article[], total: number }> {
        try {
            const result = await ApiService.get(`/articles/?page=${page}&page_size=${pageSize}`);
            return {
                items: Array.isArray(result.items) ? result.items : [],
                total: result.total || 0
            };
        } catch (e) {
            console.error('Failed to get articles', e);
            return { items: [], total: 0 };
        }
    }

    async getArticle(id: string): Promise<import('../types/clientTypes').Article | null> {
        try {
            return await ApiService.get(`/articles/${id}`);
        } catch (e) {
            console.error('Failed to get article', e);
            return null;
        }
    }

    async saveArticle(article: Partial<import('../types/clientTypes').Article>) {
        if (article.id) {
            await ApiService.put(`/articles/${article.id}`, article);
        } else {
            await ApiService.post('/articles/', article);
        }
        window.dispatchEvent(new Event('xiaoyu-article-update'));
    }

    async deleteArticle(id: string) {
        await ApiService.delete(`/articles/${id}`);
        window.dispatchEvent(new Event('xiaoyu-article-update'));
    }

    // --- Enhanced Chat System ---

    async getChatSettings(): Promise<import('../types/adminTypes').ChatSettings> {
        try {
            const result = await ApiService.get('/chat/configurations');
            if (result) return result;
            return {
                welcomeMessage: '您好！有什么可以帮您？',
                quickReplies: [],
                workingHours: '9:00 - 18:00',
                autoReply: '',
                enabled: true
            };
        } catch (e) {
            console.error('Failed to get chat settings', e);
            return {
                welcomeMessage: '您好！(离线)',
                quickReplies: [],
                workingHours: '9:00 - 18:00',
                autoReply: '',
                enabled: true
            };
        }
    }

    async saveChatSettings(settings: import('../types/adminTypes').ChatSettings) {
        try {
            await ApiService.post('/chat/configurations', settings);
            window.dispatchEvent(new Event('xiaoyu-chat-settings-update'));
        } catch (e) {
            console.error('Failed to save chat settings', e);
            throw e;
        }
    }

    // Sessions
    async getChatSessions(): Promise<import('../types/adminTypes').ChatSession[]> {
        try {
            const sessions = await ApiService.get('/chat/admin/sessions');
            return sessions || [];
        } catch (e) {
            console.error('Failed to get chat sessions', e);
            return [];
        }
    }

    async getChatSession(sessionId: string): Promise<import('../types/adminTypes').ChatSession | undefined> {
        // For admin usage mostly
        const sessions = await this.getChatSessions();
        return sessions.find(s => s.id === sessionId);
    }

    async saveChatSession(_session: import('../types/adminTypes').ChatSession) {
        // No-op: Backend handles session updates via message/init
    }

    async markChatSessionRead(sessionId: string) {
        try {
            await ApiService.post(`/chat/admin/sessions/${sessionId}/read`, {});
            window.dispatchEvent(new Event('xiaoyu-chat-session-update'));
        } catch (e) {
            console.error('Failed to mark session read', e);
        }
    }

    // Messages
    async getChatMessages(sessionId: string): Promise<import('../types/adminTypes').ChatMessage[]> {
        try {
            const msgs = await ApiService.get(`/chat/messages?sessionId=${sessionId}`);
            return msgs || [];
        } catch (e) {
            console.error('Failed to get messages', e);
            return [];
        }
    }

    async addChatMessage(sessionId: string, message: Omit<import('../types/adminTypes').ChatMessage, 'id' | 'sessionId' | 'timestamp' | 'isRead'>) {
        try {
            const payload = {
                sessionId,
                content: message.content,
                type: message.type || 'text',
                sender: message.sender
            };
            const newMsg = await ApiService.post('/chat/messages', payload);

            // Dispatch events for UI update
            window.dispatchEvent(new CustomEvent('xiaoyu-chat-message-update', { detail: { sessionId } }));
            window.dispatchEvent(new Event('xiaoyu-chat-session-update'));

            return newMsg;
        } catch (e) {
            console.error('Failed to send message', e);
            throw e;
        }
    }

    async handleAutoReply(_sessionId: string) {
        // Backend handles auto-reply if configured, or admin manually replies.
    }

    // Helper to start/get session for current user
    async getOrCreateCurrentUserSession(_user: { id?: string, username?: string, avatar?: string } | null): Promise<import('../types/adminTypes').ChatSession> {
        let parserId = localStorage.getItem('xiaoyu_chat_parser_id');
        if (!parserId) {
            parserId = 'guest_' + Math.random().toString(36).substring(2, 9);
            localStorage.setItem('xiaoyu_chat_parser_id', parserId);
        }

        const payload = {
            userParserId: parserId
        };

        try {
            const session = await ApiService.post('/chat/session/init', payload);
            return session;
        } catch (e) {
            console.error('Failed to init session', e);
            throw e;
        }
    }

    // --- System Statistics ---
    async getSystemStats(): Promise<SystemStats> {
        try {
            const result = await ApiService.get('/stats');
            return result;
        } catch (e) {
            console.error('Failed to fetch stats from API, falling back to local storage:', e);
            const data = localStorage.getItem(KEYS.SYSTEM_STATS);
            return data ? JSON.parse(data) : { totalAiGenerations: 0, dailyStats: [] };
        }
    }

    async saveSystemStats(stats: SystemStats) {
        localStorage.setItem(KEYS.SYSTEM_STATS, JSON.stringify(stats));
        window.dispatchEvent(new Event('xiaoyu-stats-update'));
    }

    private getOrCreateDailyStat(date: string, stats: SystemStats): DailyStat {
        let daily = stats.dailyStats.find(d => d.date === date);
        if (!daily) {
            daily = { date, aiGenerations: 0, newConfigs: 0, newUsers: 0 };
            stats.dailyStats.push(daily);
            // Keep only last 30 days
            if (stats.dailyStats.length > 30) {
                stats.dailyStats.shift();
            }
        }
        return daily;
    }

    async logAiGeneration() {
        const today = new Date().toISOString().split('T')[0];
        const stats = await this.getSystemStats();
        stats.totalAiGenerations += 1;
        const daily = this.getOrCreateDailyStat(today, stats);
        daily.aiGenerations += 1;
        await this.saveSystemStats(stats);
    }

    // --- Popup Settings ---
    async getPopupSettings(): Promise<import('../types/adminTypes').PopupSettings> {
        try {
            // Try fetching from API first
            const result = await ApiService.get('/settings/xiaoyu_popup_settings');
            if (result && result.value) {
                return {
                    enabled: false,
                    title: '欢迎回来',
                    content: '这里是您的每日公告内容。',
                    imageUrl: '',
                    linkUrl: '',
                    buttonText: '',
                    frequency: 'daily',
                    theme: 'default',
                    ...result.value
                };
            }
            // Fallback to local storage (migration or offline)
            const data = localStorage.getItem('xiaoyu_popup_settings');
            const parsed = data ? JSON.parse(data) : null;
            return {
                enabled: false,
                title: '欢迎回来',
                content: '这里是您的每日公告内容。',
                imageUrl: '',
                linkUrl: '',
                buttonText: '',
                frequency: 'daily',
                theme: 'default',
                ...parsed
            };
        } catch (e) {
            return {
                enabled: false,
                title: '欢迎回来',
                content: '这里是您的每日公告内容。',
                frequency: 'daily',
                theme: 'default'
            };
        }
    }

    async savePopupSettings(settings: import('../types/adminTypes').PopupSettings) {
        try {
            await ApiService.post('/settings/xiaoyu_popup_settings', settings);
        } catch (e) {
            console.error('Failed to save popup settings to API', e);
        }
        safeSetItem('xiaoyu_popup_settings', JSON.stringify(settings));
        window.dispatchEvent(new Event('xiaoyu-popup-settings-update'));
    }

    async getSystemAnnouncement(): Promise<import('../types/adminTypes').SystemAnnouncementSettings> {
        try {
            // Try fetching from API first
            const result = await ApiService.get('/settings/xiaoyu_system_announcement');
            if (result && result.value) {
                return { enabled: true, items: [], ...result.value };
            }

            // Fallback
            const data = localStorage.getItem('xiaoyu_system_announcement');
            if (!data) return { enabled: true, items: [] };
            const parsed = JSON.parse(data);
            // Migrate old format: { content, enabled } → { enabled, items }
            if (parsed.content && !parsed.items) {
                return {
                    enabled: parsed.enabled ?? true,
                    items: [{ id: 'migrated-1', content: parsed.content, type: 'info' as const }]
                };
            }
            return { enabled: true, items: [], ...parsed };
        } catch (e) {
            return { enabled: true, items: [] };
        }
    }

    async saveSystemAnnouncement(settings: import('../types/adminTypes').SystemAnnouncementSettings) {
        try {
            await ApiService.post('/settings/xiaoyu_system_announcement', settings);
        } catch (e) {
            console.error('Failed to save announcement settings to API', e);
        }
        safeSetItem('xiaoyu_system_announcement', JSON.stringify(settings));
        window.dispatchEvent(new Event('xiaoyu-announcement-update'));
    }


    async logNewConfig() {
        try {
            await ApiService.post('/stats/log', { type: 'new_config' });
        } catch (e) {
            console.error('Failed to log new config to API:', e);
        }

        const stats = await this.getSystemStats();
        const today = new Date().toISOString().split('T')[0];
        const daily = this.getOrCreateDailyStat(today, stats);

        daily.newConfigs += 1;
        await this.saveSystemStats(stats);
    }

    async logNewUser() {
        try {
            await ApiService.post('/stats/log', { type: 'new_user' });
        } catch (e) {
            console.error('Failed to log new user to API:', e);
        }

        const stats = await this.getSystemStats();
        const today = new Date().toISOString().split('T')[0];
        const daily = this.getOrCreateDailyStat(today, stats);

        daily.newUsers += 1;
        await this.saveSystemStats(stats);
    }

    // --- About Us Configuration ---
    async getAboutUsConfig(): Promise<AboutUsConfig> {
        try {
            const data = localStorage.getItem(KEYS.ABOUT_US_CONFIG);
            if (data) return JSON.parse(data);
        } catch (e) { }

        // Default initial config
        return {
            topCards: [
                { title: 'AI 智选算法', description: '我们构建了超 10,000 条硬件知识图谱，通过毫秒级计算，在海量组合中为您锁定最优的性能平衡点。', icon: 'Zap' },
                { title: '极致美学', description: '跑分不是全部，美学才是永恒。我们严格把控硬件外观与配色方案，确保您的电脑桌上不仅是工具，更是一件艺术品。', icon: 'Heart' },
                { title: '上门装机', description: '告别繁琐教程与折腾过程，专业装机团队全城预约上门，从安装到走线，为您提供极致的一站式省心体验。', icon: 'Sparkles' }
            ],
            brandImages: [
                { url: '', title: '行业领先算法奖', desc: '连续三年蝉联' },
                { url: '', title: '全网级影响力', desc: '覆盖千万 DIY 爱好者' }
            ]
        };
    }

    async saveAboutUsConfig(config: AboutUsConfig) {
        localStorage.setItem(KEYS.ABOUT_US_CONFIG, JSON.stringify(config));
        window.dispatchEvent(new Event('xiaoyu-aboutus-update'));
    }

    // --- Data Export/Import ---
    exportData() {
        const data: Record<string, any> = {};
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('xiaoyu_')) {
                try {
                    const val = localStorage.getItem(key);
                    data[key] = val ? JSON.parse(val) : null;
                } catch (e) {
                    data[key] = localStorage.getItem(key);
                }
            }
        });

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const date = new Date().toISOString().split('T')[0];
        link.href = url;
        link.download = `xiaoyu_backup_${date}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    importData(file: File): Promise<boolean> {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target?.result as string);
                    Object.keys(data).forEach(key => {
                        if (key.startsWith('xiaoyu_')) {
                            const val = typeof data[key] === 'string' ? data[key] : JSON.stringify(data[key]);
                            localStorage.setItem(key, val);
                        }
                    });
                    window.location.reload(); // Reload to apply all imported data
                    resolve(true);
                } catch (error) {
                    console.error('Import failed', error);
                    resolve(false);
                }
            };
            reader.readAsText(file);
        });
    }

    async getEmailVerifications(page: number = 1, pageSize: number = 20, email: string = ''): Promise<{ items: any[], total: number }> {
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                page_size: pageSize.toString()
            });
            if (email) params.append('email', email);
            const result = await ApiService.get(`/email/verifications?${params.toString()}`);
            return {
                items: result.items || [],
                total: result.total || 0
            };
        } catch (e) {
            console.error('Failed to load email verifications', e);
            return { items: [], total: 0 };
        }
    }

    async deleteEmailVerification(id: number): Promise<boolean> {
        try {
            await ApiService.delete(`/email/verifications/${id}`);
            return true;
        } catch (e) {
            console.error('Failed to delete email verification', e);
            return false;
        }
    }

    async getEmailConfig(): Promise<any> {
        try {
            return await ApiService.get('/email/config');
        } catch (e) {
            console.error('Failed to load email config', e);
            return null;
        }
    }

    async saveEmailConfig(config: any): Promise<boolean> {
        try {
            await ApiService.post('/email/config', config);
            return true;
        } catch (e) {
            console.error('Failed to save email config', e);
            return false;
        }
    }

    async uploadImage(file: File): Promise<{ url: string, filename: string } | null> {
        try {
            const formData = new FormData();
            formData.append('file', file);
            return await ApiService.postFile('/upload/image', formData);
        } catch (e) {
            console.error('Failed to upload image', e);
            return null;
        }
    }
}

export const storage = new StorageService();
