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
    signName: '小鱼装机',
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

            localStorage.setItem('xiaoyu_db_migration_done_v1', 'true');
            console.log('UseStorage: Migration complete.');
        } catch (err) {
            console.error('Migration failed:', err);
        }
    }

    // --- Products ---
    async getProducts(): Promise<HardwareItem[]> {
        try {
            return await ApiService.get('/products');
        } catch (e) {
            console.error('Failed to load products', e);
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
    async getConfigs(): Promise<ConfigItem[]> {
        try {
            return await ApiService.get('/configs');
        } catch (e) {
            console.error('Failed to load configs', e);
            return [];
        }
    }

    async saveConfigs(configs: ConfigItem[]) {
        for (const c of configs) {
            await ApiService.post('/configs', c);
        }
        this.logNewConfig();
        window.dispatchEvent(new Event('xiaoyu-storage-update'));
    }


    async saveConfig(config: ConfigItem) {
        await ApiService.post('/configs', config);
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
            return await ApiService.get('/auth/users'); // I need to add this route or similar
        } catch (e) {
            return [];
        }
    }

    async saveUser(user: UserItem) {
        await ApiService.post('/auth/user', user); // Need to add this route

        // Update current user if it matches
        const currentUser = this.getCurrentUser();
        if (currentUser && (currentUser.id === user.id || currentUser.id === (user as any)._id)) {
            localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
            window.dispatchEvent(new Event('xiaoyu-login'));
        }
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
        const users = await this.getUsers();
        const user = users.find(u => u.id === userId || (u as any)._id === userId);
        if (!user) return '';

        if (!user.inviteCode) {
            // 生成唯一邀请码
            let code = this.generateInviteCode();
            while (users.some(u => u.inviteCode === code)) {
                code = this.generateInviteCode();
            }
            user.inviteCode = code;
            user.inviteCount = user.inviteCount || 0;
            user.inviteVipDays = user.inviteVipDays || 0;
            await this.saveUser(user);
        }
        return user.inviteCode;
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
    async getUsedItems(): Promise<UsedItem[]> {
        try {
            return await ApiService.get('/used');
        } catch (e) {
            return [];
        }
    }

    saveUsedItems(items: UsedItem[]) {
        safeSetItem(KEYS.USED_ITEMS, JSON.stringify(items));
        window.dispatchEvent(new Event('xiaoyu-used-items-update'));
    }

    async addUsedItem(item: UsedItem) {
        await ApiService.post('/used', item);
        window.dispatchEvent(new Event('xiaoyu-used-items-update'));
    }

    async updateUsedItem(item: UsedItem) {
        await ApiService.post('/used', item);
        window.dispatchEvent(new Event('xiaoyu-used-items-update'));
    }

    async deleteUsedItem(id: string) {
        await ApiService.delete(`/used/${id}`); // Need to add this route
        window.dispatchEvent(new Event('xiaoyu-used-items-update'));
    }

    async markUsedItemAsSold(id: string) {
        const item = await ApiService.get(`/used/${id}`); // assuming GET /used/:id exists or use find
        if (item) {
            item.status = 'sold';
            item.soldAt = Date.now();
            await ApiService.post('/used', item);
            window.dispatchEvent(new Event('xiaoyu-used-items-update'));
        }
    }


    async getRecycleRequests(): Promise<RecycleRequest[]> {
        try {
            return await ApiService.get('/recycle');
        } catch (e) {
            return [];
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
        // Simple update: fetch then update
        const resp = await ApiService.get('/recycle');
        const req = resp.find((r: any) => r._id === id || r.id === id);
        if (req) {
            req.isRead = true;
            await ApiService.post('/recycle', req);
            window.dispatchEvent(new Event('xiaoyu-recycle-requests-update'));
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
            const res = await ApiService.post('/auth/login', { username, password });
            localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(res.user));
            // Store token if needed, usually in a cookie or localStorage
            if (res.token) localStorage.setItem('xiaoyu_token', res.token);
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

    // --- Enhanced Chat System ---

    async getChatSettings(): Promise<import('../types/adminTypes').ChatSettings> {
        try {
            const data = localStorage.getItem('xiaoyu_chat_settings');
            return data ? JSON.parse(data) : {
                welcomeMessage: '您好！我是小鱼装机客服，请问有什么可以帮您？',
                quickReplies: ['如何下单？', '发货时间是多久？', '售后保修政策', '我想咨询配置推荐']
            };
        } catch (e) {
            return { welcomeMessage: '', quickReplies: [] };
        }
    }

    async saveChatSettings(settings: import('../types/adminTypes').ChatSettings) {
        localStorage.setItem('xiaoyu_chat_settings', JSON.stringify(settings));
    }

    // Sessions
    async getChatSessions(): Promise<import('../types/adminTypes').ChatSession[]> {
        try {
            const data = localStorage.getItem('xiaoyu_chat_sessions');
            return data ? JSON.parse(data) : [];
        } catch (e) { return []; }
    }

    async getChatSession(sessionId: string): Promise<import('../types/adminTypes').ChatSession | undefined> {
        const sessions = await this.getChatSessions();
        return sessions.find(s => s.id === sessionId);
    }

    async saveChatSession(session: import('../types/adminTypes').ChatSession) {
        let sessions = await this.getChatSessions();
        const idx = sessions.findIndex(s => s.id === session.id);
        if (idx >= 0) {
            sessions[idx] = session;
        } else {
            sessions.push(session);
        }
        // Sort by updatedAt desc
        sessions.sort((a, b) => b.updatedAt - a.updatedAt);
        localStorage.setItem('xiaoyu_chat_sessions', JSON.stringify(sessions));
        window.dispatchEvent(new Event('xiaoyu-chat-session-update'));
    }

    // Messages
    async getChatMessages(sessionId: string): Promise<import('../types/adminTypes').ChatMessage[]> {
        try {
            const data = localStorage.getItem(`xiaoyu_chat_msgs_${sessionId}`);
            return data ? JSON.parse(data) : [];
        } catch (e) { return []; }
    }

    async addChatMessage(sessionId: string, message: Omit<import('../types/adminTypes').ChatMessage, 'id' | 'sessionId' | 'timestamp' | 'isRead'>) {
        const fullMsg: import('../types/adminTypes').ChatMessage = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            sessionId,
            timestamp: Date.now(),
            isRead: false,
            ...message
        };

        // 1. Save Message
        const msgs = await this.getChatMessages(sessionId);
        msgs.push(fullMsg);
        localStorage.setItem(`xiaoyu_chat_msgs_${sessionId}`, JSON.stringify(msgs));

        // 2. Update Session
        const session = await this.getChatSession(sessionId);
        if (session) {
            session.lastMessage = fullMsg;
            session.updatedAt = Date.now();
            if (message.sender === 'user') {
                session.unreadCount += 1; // Admin sees unread
            }
            await this.saveChatSession(session);
        }

        window.dispatchEvent(new CustomEvent('xiaoyu-chat-message-update', { detail: { sessionId } }));

        // --- Auto Reply Logic ---
        if (message.sender === 'user') {
            const settings = await this.getChatSettings();
            if (settings.autoReplyEnabled && settings.autoReplyContent) {
                // Check if last message was already this auto-reply (prevent spam)
                const lastAdminMsg = msgs.slice().reverse().find(m => m.sender === 'admin' || m.sender === 'system');

                if (!lastAdminMsg || lastAdminMsg.content !== settings.autoReplyContent) {
                    const autoMsg: import('../types/adminTypes').ChatMessage = {
                        id: `msg-${Date.now() + 1}-${Math.random().toString(36).substr(2, 9)}`,
                        sessionId,
                        sender: 'admin',
                        content: settings.autoReplyContent,
                        timestamp: Date.now() + 100,
                        isRead: false,
                        isAdmin: true
                    };

                    // Push and Save
                    msgs.push(autoMsg);
                    localStorage.setItem(`xiaoyu_chat_msgs_${sessionId}`, JSON.stringify(msgs));

                    // Update Session
                    if (session) {
                        session.lastMessage = autoMsg;
                        session.updatedAt = Date.now() + 100;
                        await this.saveChatSession(session);
                    }
                    // Dispatch update again
                    setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('xiaoyu-chat-message-update', { detail: { sessionId } }));
                    }, 100);
                }
            }
        }

        return fullMsg;
    }

    async markSessionRead(sessionId: string) {
        const session = await this.getChatSession(sessionId);
        if (session && session.unreadCount > 0) {
            session.unreadCount = 0;
            await this.saveChatSession(session);
        }
    }

    // Helper to start/get session for current user
    async getOrCreateCurrentUserSession(user: { id?: string, username?: string } | null): Promise<import('../types/adminTypes').ChatSession> {
        const userId = user?.id || localStorage.getItem('xiaoyu_guest_id') || `guest-${Math.random().toString(36).substr(2, 9)}`;
        if (!user?.id && !localStorage.getItem('xiaoyu_guest_id')) {
            localStorage.setItem('xiaoyu_guest_id', userId);
        }

        const sessions = await this.getChatSessions();
        let session = sessions.find(s => s.userId === userId && s.status === 'active');

        if (!session) {
            session = {
                id: `session-${Date.now()}`,
                userId,
                username: user?.username || `游客 ${userId.substr(-4)}`,
                unreadCount: 0,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                status: 'active'
            };
            await this.saveChatSession(session);

            // Add initial welcome message
            const settings = await this.getChatSettings();
            await this.addChatMessage(session.id, {
                sender: 'system',
                content: settings.welcomeMessage
            });
        }
        return session;
    }

    // --- System Statistics ---
    async getSystemStats(): Promise<SystemStats> {
        try {
            const data = localStorage.getItem(KEYS.SYSTEM_STATS);
            return data ? JSON.parse(data) : { totalAiGenerations: 0, dailyStats: [] };
        } catch (e) {
            return { totalAiGenerations: 0, dailyStats: [] };
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
        const stats = await this.getSystemStats();
        const today = new Date().toISOString().split('T')[0];
        const daily = this.getOrCreateDailyStat(today, stats);

        stats.totalAiGenerations += 1;
        daily.aiGenerations += 1;
        await this.saveSystemStats(stats);
    }

    async logNewConfig() {
        const stats = await this.getSystemStats();
        const today = new Date().toISOString().split('T')[0];
        const daily = this.getOrCreateDailyStat(today, stats);

        daily.newConfigs += 1;
        await this.saveSystemStats(stats);
    }

    async logNewUser() {
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
}

export const storage = new StorageService();
