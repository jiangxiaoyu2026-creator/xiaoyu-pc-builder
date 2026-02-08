import { HardwareItem, ConfigItem, PricingStrategy, UserItem, UsedItem, RecycleRequest, SMSSettings, SystemStats, DailyStat, AboutUsConfig } from '../types/adminTypes';
import { MOCK_HARDWARE, MOCK_CONFIGS, DEFAULT_AI_CONTENT } from '../data/adminData';

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
        this.init();
    }

    private init() {
        try {
            const currentFlag = localStorage.getItem('xiaoyu_init_flag');
            const REQUIRED_FLAG = KEYS.INIT_FLAG;

            if (currentFlag !== REQUIRED_FLAG) {
                console.log('UseStorage: Initializing/Migrating data...');

                // Force update MOCK_CONFIGS to ensure new mock data appears
                const existingConfigsStr = localStorage.getItem(KEYS.CONFIGS);
                let existingConfigs: ConfigItem[] = [];
                try {
                    existingConfigs = existingConfigsStr ? JSON.parse(existingConfigsStr) : [];
                } catch (e) {
                    console.error('Data corrupted, resetting configs');
                    existingConfigs = [];
                }

                // Merge logic: Add mock configs if they don't exist by ID
                if (MOCK_CONFIGS && Array.isArray(MOCK_CONFIGS)) {
                    MOCK_CONFIGS.forEach(mockCfg => {
                        if (!existingConfigs.some(e => e.id === mockCfg.id)) {
                            existingConfigs.push(mockCfg);
                        } else {
                            const idx = existingConfigs.findIndex(e => e.id === mockCfg.id);
                            if (idx !== -1) {
                                existingConfigs[idx] = { ...existingConfigs[idx], ...mockCfg };
                            }
                        }
                    });
                }

                this.saveConfigs(existingConfigs);

                // Ensure products are seeded
                if (!localStorage.getItem(KEYS.PRODUCTS)) {
                    this.saveProducts(MOCK_HARDWARE);
                }
                // Ensure settings
                if (!localStorage.getItem(KEYS.SETTINGS)) {
                    this.saveSettings(DEFAULT_STRATEGY);
                }
                // Ensure SMS settings
                if (!localStorage.getItem('xiaoyu_sms_settings')) { // Using literal key as KEYS.SMSSettings is not defined
                    this.saveSMSSettings(DEFAULT_SMS_SETTINGS);
                }

                if (!localStorage.getItem(KEYS.USED_ITEMS)) {
                    // 添加示例二手商品
                    const sampleUsedItems: UsedItem[] = [
                        {
                            id: 'used_official_1',
                            type: 'official',
                            sellerId: 'admin',
                            sellerName: '小鱼官方',
                            category: 'gpu',
                            brand: 'ASUS 华硕',
                            model: 'RTX 3070 TUF GAMING OC',
                            price: 2299,
                            originalPrice: 4599,
                            condition: '95新',
                            images: ['https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400'],
                            description: '自用一年，性能完好，无任何问题，全程正常使用未超频。送原装盒子和配件。',
                            status: 'published',
                            createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
                            inspectionReport: {
                                inspectedAt: new Date().toISOString(),
                                grade: 'A',
                                score: 92,
                                stressTest: true,
                                functionTest: true,
                                appearance: '外观完好',
                                summary: '高分通过压力测试，性能稳定',
                                notes: ''
                            }
                        },
                        {
                            id: 'used_official_2',
                            type: 'official',
                            sellerId: 'admin',
                            sellerName: '小鱼官方',
                            category: 'gpu',
                            brand: '七彩虹',
                            model: 'RTX 4060 Ultra W OC',
                            price: 2199,
                            originalPrice: 2699,
                            condition: '99新',
                            images: ['https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=400'],
                            description: '全新拆封仅测试，保修期内，送三年质保。',
                            status: 'published',
                            createdAt: Date.now() - 1000 * 60 * 60 * 24,
                            inspectionReport: {
                                inspectedAt: new Date().toISOString(),
                                grade: 'A',
                                score: 98,
                                stressTest: true,
                                functionTest: true,
                                appearance: '全新状态',
                                summary: '近乎全新，性能满分',
                                notes: ''
                            }
                        },
                        {
                            id: 'used_official_3',
                            type: 'official',
                            sellerId: 'admin',
                            sellerName: '小鱼官方',
                            category: 'host',
                            brand: '小鱼定制',
                            model: 'i5-12400F + RTX 3060 游戏整机',
                            price: 3599,
                            originalPrice: 5299,
                            condition: '9成新',
                            images: ['https://images.unsplash.com/photo-1587831990711-23ca6441447b?w=400'],
                            description: '直播间退货机，功能完好，包含显示器键鼠全套。',
                            status: 'published',
                            createdAt: Date.now() - 1000 * 60 * 60 * 12,
                            inspectionReport: {
                                inspectedAt: new Date().toISOString(),
                                grade: 'B',
                                score: 85,
                                stressTest: true,
                                functionTest: true,
                                appearance: '轻微使用痕迹',
                                summary: '整机性能正常，外观有轻微划痕',
                                notes: '机箱侧板有一处细小划痕'
                            }
                        },
                        {
                            id: 'used_personal_1',
                            type: 'personal',
                            sellerId: 'user1',
                            sellerName: '装机小白',
                            category: 'gpu',
                            brand: '影驰',
                            model: 'RTX 2060 SUPER',
                            price: 899,
                            originalPrice: 2999,
                            condition: '8成新',
                            images: ['https://images.unsplash.com/photo-1623820919239-0d0ff10797a1?w=400'],
                            description: '升级换下来的显卡，正常使用无问题，可小刀。',
                            status: 'published',
                            createdAt: Date.now() - 1000 * 60 * 60 * 48,
                            xianyuLink: '【闲鱼】https://m.tb.cn/xxx 点击链接直接打开'
                        },
                        {
                            id: 'used_personal_2',
                            type: 'personal',
                            sellerId: 'user2',
                            sellerName: '硬件达人',
                            category: 'accessory',
                            brand: '酷冷至尊',
                            model: 'V850 SFX Gold 金牌全模组电源',
                            price: 599,
                            originalPrice: 899,
                            condition: '95新',
                            images: ['https://images.unsplash.com/photo-1562976540-1502c2145186?w=400'],
                            description: 'ITX机箱换下来的SFX电源，几乎全新，带全套模组线。',
                            status: 'published',
                            createdAt: Date.now() - 1000 * 60 * 60 * 36,
                            xianyuLink: '【闲鱼】https://m.tb.cn/yyy 点击链接直接打开'
                        },
                        {
                            id: 'used_personal_3',
                            type: 'personal',
                            sellerId: 'user3',
                            sellerName: '游戏玩家',
                            category: 'accessory',
                            brand: '芝奇',
                            model: 'DDR4 3200MHz 16G*2 幻光戟',
                            price: 399,
                            originalPrice: 799,
                            condition: '99新',
                            images: ['https://images.unsplash.com/photo-1541029071515-84cc54f84dc5?w=400'],
                            description: '升级DDR5换下来的，RGB灯效正常，原盒发货。',
                            status: 'published',
                            createdAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
                            xianyuLink: '【闲鱼】https://m.tb.cn/zzz 点击链接直接打开'
                        }
                    ];
                    localStorage.setItem(KEYS.USED_ITEMS, JSON.stringify(sampleUsedItems));
                }

                if (!localStorage.getItem(KEYS.RECYCLE_REQUESTS)) {
                    localStorage.setItem(KEYS.RECYCLE_REQUESTS, JSON.stringify([]));
                }
                // Ensure users and add streamer if missing
                const usersStr = localStorage.getItem(KEYS.USERS);
                let users: UserItem[] = usersStr ? JSON.parse(usersStr) : [];

                const defaultUsers: UserItem[] = [
                    { id: 'u1', username: 'DIYXX', password: 'jiangxiaoyu119', role: 'admin', status: 'active', lastLogin: '', vipExpireAt: 0 },
                    { id: 'u2', username: 'user', password: 'user123', role: 'user', status: 'active', lastLogin: '', vipExpireAt: 0 },
                    { id: 'u3', username: 'streamer', password: 'streamer123', role: 'streamer', status: 'active', lastLogin: '', vipExpireAt: 0 },
                    { id: 'u4', username: 'manager', password: 'manager123', role: 'sub_admin', status: 'active', lastLogin: '', vipExpireAt: 0 }
                ];

                // 1. Remove old 'admin' if it exists and is NOT u1 (to prevent duplicates)
                users = users.filter(u => u.username !== 'admin' || u.id === 'u1');

                // 2. Force update/insert default users
                defaultUsers.forEach(defUser => {
                    const existingIdx = users.findIndex(u => u.id === defUser.id);
                    if (existingIdx !== -1) {
                        // Update existing (e.g. u1)
                        console.log(`Updating existing user: ${defUser.username}`);
                        users[existingIdx] = { ...users[existingIdx], ...defUser };
                    } else {
                        // Check if username exists under different ID
                        const nameIdx = users.findIndex(u => u.username === defUser.username);
                        if (nameIdx !== -1) {
                            // Update credentials but keep ID if needed, or just overwrite
                            console.log(`Overwriting user by name: ${defUser.username}`);
                            users[nameIdx] = { ...users[nameIdx], ...defUser, id: users[nameIdx].id };
                        } else {
                            console.log(`Adding new default user: ${defUser.username}`);
                            users.push(defUser);
                        }
                    }
                });

                console.log('Saving users to storage:', users);
                this.saveUsers(users);

                safeSetItem('xiaoyu_init_flag', REQUIRED_FLAG);
            }
        } catch (err) {
            console.error('Storage Init Failed:', err);
            // Fallback: don't crash the app, but data might be missing
        }
    }

    // --- Products ---
    getProducts(): HardwareItem[] {
        try {
            const data = localStorage.getItem(KEYS.PRODUCTS);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Failed to load products', e);
            return [];
        }
    }

    saveProducts(products: HardwareItem[]) {
        safeSetItem(KEYS.PRODUCTS, JSON.stringify(products));
        window.dispatchEvent(new Event('xiaoyu-storage-update'));
    }

    saveProduct(product: HardwareItem) {
        const products = this.getProducts();
        const index = products.findIndex(p => p.id === product.id);
        if (index >= 0) {
            products[index] = product;
        } else {
            products.push(product);
        }
        this.saveProducts(products);
    }

    deleteProduct(id: string) {
        const products = this.getProducts().filter(p => p.id !== id);
        this.saveProducts(products);
    }

    // --- Configs ---
    getConfigs(): ConfigItem[] {
        try {
            const data = localStorage.getItem(KEYS.CONFIGS);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Failed to load configs', e);
            return [];
        }
    }

    saveConfigs(configs: ConfigItem[]) {
        safeSetItem(KEYS.CONFIGS, JSON.stringify(configs));
        this.logNewConfig();
        window.dispatchEvent(new Event('xiaoyu-storage-update'));
    }

    private generateSerialNumber(configs: ConfigItem[]): string {
        const currentYear = new Date().getFullYear();
        const thisYearConfigs = configs.filter(c => c.serialNumber && c.serialNumber.startsWith(`${currentYear}-`));

        let maxSeq = 0;
        thisYearConfigs.forEach(c => {
            const parts = c.serialNumber!.split('-');
            if (parts.length === 2) {
                const seq = parseInt(parts[1], 10);
                if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
            }
        });

        const nextSeq = maxSeq + 1;
        return `${currentYear}-${nextSeq.toString().padStart(6, '0')}`;
    }

    saveConfig(config: ConfigItem) {
        const configs = this.getConfigs();
        const index = configs.findIndex(c => c.id === config.id);

        if (index >= 0) {
            // Update existing
            configs[index] = config;
        } else {
            // Create new
            if (!config.serialNumber) {
                config.serialNumber = this.generateSerialNumber(configs);
            }
            configs.push(config);
        }
        this.saveConfigs(configs);
    }

    // --- Settings ---
    getSettings(): PricingStrategy {
        try {
            const data = localStorage.getItem(KEYS.SETTINGS);
            return data ? JSON.parse(data) : DEFAULT_STRATEGY;
        } catch (e) {
            console.error('Failed to load settings', e);
            return DEFAULT_STRATEGY;
        }
    }

    saveSettings(settings: PricingStrategy) {
        localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
    }

    // --- AI Settings ---
    // --- AI Settings ---
    getAISettings(): import('../types/adminTypes').AISettings {
        try {
            const data = localStorage.getItem('xiaoyu_ai_settings');
            const stored = data ? JSON.parse(data) : {};

            // Merge stored settings with defaults (for new fields)
            return {
                provider: stored.provider || 'deepseek',
                apiKey: stored.apiKey || '',
                baseUrl: stored.baseUrl || 'https://api.deepseek.com/v1',
                model: stored.model || 'deepseek-chat',
                enabled: stored.enabled || false,
                persona: stored.persona || 'toxic',
                strategy: stored.strategy || 'balanced',
                intros: stored.intros || DEFAULT_AI_CONTENT.intros,
                lowBudgetIntros: stored.lowBudgetIntros || DEFAULT_AI_CONTENT.lowBudgetIntros,
                severeBudgetIntros: stored.severeBudgetIntros || DEFAULT_AI_CONTENT.severeBudgetIntros,
                verdicts: stored.verdicts || DEFAULT_AI_CONTENT.verdicts,
                ctas: stored.ctas || DEFAULT_AI_CONTENT.ctas
            };
        } catch (e) {
            return {
                provider: 'deepseek',
                apiKey: '',
                baseUrl: 'https://api.deepseek.com/v1',
                model: 'deepseek-chat',
                enabled: false,
                persona: 'toxic',
                strategy: 'balanced',
                ...DEFAULT_AI_CONTENT
            };
        }
    }

    saveAISettings(settings: import('../types/adminTypes').AISettings) {
        localStorage.setItem('xiaoyu_ai_settings', JSON.stringify(settings));
    }

    // --- SMS Settings ---
    getSMSSettings(): import('../types/adminTypes').SMSSettings {
        try {
            const data = localStorage.getItem('xiaoyu_sms_settings');
            const stored = data ? JSON.parse(data) : {};
            return {
                provider: stored.provider || 'mock',
                accessKeyId: stored.accessKeyId || '',
                accessKeySecret: stored.accessKeySecret || '',
                signName: stored.signName || '小鱼装机',
                templateCode: stored.templateCode || 'SMS_123456789',
                enabled: stored.enabled || false
            };
        } catch (e) {
            return {
                provider: 'mock',
                accessKeyId: '',
                accessKeySecret: '',
                signName: '小鱼装机',
                templateCode: 'SMS_123456789',
                enabled: false
            };
        }
    }

    saveSMSSettings(settings: import('../types/adminTypes').SMSSettings) {
        localStorage.setItem('xiaoyu_sms_settings', JSON.stringify(settings));
    }

    // --- Users ---
    getUsers(): UserItem[] {
        try {
            const data = localStorage.getItem(KEYS.USERS);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Failed to load users', e);
            return [];
        }
    }

    saveUsers(users: UserItem[]) {
        safeSetItem(KEYS.USERS, JSON.stringify(users));
    }

    saveUser(user: UserItem) {
        const users = this.getUsers();
        const index = users.findIndex(u => u.id === user.id);
        if (index >= 0) {
            users[index] = user;
        } else {
            users.push(user);
            this.logNewUser();
        }
        this.saveUsers(users);

        // Update current user if it matches
        const currentUser = this.getCurrentUser();
        if (currentUser && currentUser.id === user.id) {
            localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
            window.dispatchEvent(new Event('xiaoyu-login')); // Trigger update
        }
    }

    updateUserVIP(userId: string, durationDays: number) {
        const users = this.getUsers();
        const user = users.find(u => u.id === userId);
        if (user) {
            const now = Date.now();
            const currentExpire = user.vipExpireAt || 0;
            // If already VIP and not expired, extend. Otherwise start from now.
            const startTime = currentExpire > now ? currentExpire : now;
            user.vipExpireAt = startTime + durationDays * 24 * 60 * 60 * 1000;
            this.saveUser(user);
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

    ensureUserInviteCode(userId: string): string {
        const users = this.getUsers();
        const user = users.find(u => u.id === userId);
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
            this.saveUser(user);
        }
        return user.inviteCode;
    }

    findUserByInviteCode(code: string): UserItem | null {
        if (!code || code.length !== 6) return null;
        const users = this.getUsers();
        return users.find(u => u.inviteCode?.toUpperCase() === code.toUpperCase()) || null;
    }

    processReferral(inviterUserId: string): { success: boolean; message: string } {
        const MAX_INVITE_VIP_DAYS = 30;
        const DAYS_PER_INVITE = 7; // 每邀请一人获得7天VIP

        const users = this.getUsers();
        const inviter = users.find(u => u.id === inviterUserId);

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
        const currentExpire = inviter.vipExpireAt && inviter.vipExpireAt > now ? inviter.vipExpireAt : now;
        inviter.vipExpireAt = currentExpire + actualDays * 24 * 60 * 60 * 1000;

        this.saveUser(inviter);

        return {
            success: true,
            message: `邀请成功！获得 ${actualDays} 天 VIP${currentVipDays + actualDays >= MAX_INVITE_VIP_DAYS ? '（已达上限）' : ''}`
        };
    }

    // --- Used Items ---
    getUsedItems(): UsedItem[] {
        try {
            const data = localStorage.getItem(KEYS.USED_ITEMS);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Failed to load used items', e);
            return [];
        }
    }

    saveUsedItems(items: UsedItem[]) {
        safeSetItem(KEYS.USED_ITEMS, JSON.stringify(items));
        window.dispatchEvent(new Event('xiaoyu-used-items-update'));
    }

    addUsedItem(item: UsedItem) {
        const items = this.getUsedItems();
        items.unshift(item); // Add new item to start
        this.saveUsedItems(items);
    }

    updateUsedItem(item: UsedItem) {
        const items = this.getUsedItems();
        const index = items.findIndex(i => i.id === item.id);
        if (index > -1) {
            items[index] = item;
            this.saveUsedItems(items);
        }
    }

    deleteUsedItem(id: string) {
        const items = this.getUsedItems();
        const newItems = items.filter(i => i.id !== id);
        this.saveUsedItems(newItems);
    }

    markUsedItemAsSold(id: string) {
        const items = this.getUsedItems();
        const index = items.findIndex(i => i.id === id);
        if (index > -1) {
            items[index] = {
                ...items[index],
                status: 'sold',
                soldAt: Date.now()
            };
            this.saveUsedItems(items);
        }
    }


    // --- Recycle Requests ---
    getRecycleRequests(): RecycleRequest[] {
        try {
            const data = localStorage.getItem(KEYS.RECYCLE_REQUESTS);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Failed to load recycle requests', e);
            return [];
        }
    }

    saveRecycleRequests(requests: RecycleRequest[]) {
        safeSetItem(KEYS.RECYCLE_REQUESTS, JSON.stringify(requests));
        window.dispatchEvent(new Event('xiaoyu-recycle-requests-update'));
    }

    addRecycleRequest(request: RecycleRequest) {
        const requests = this.getRecycleRequests();
        requests.unshift({ ...request, isRead: false }); // Add to start, mark as unread
        this.saveRecycleRequests(requests);
        window.dispatchEvent(new Event('xiaoyu-recycle-requests-update'));
    }

    updateRecycleRequest(request: RecycleRequest) {
        const requests = this.getRecycleRequests();
        const index = requests.findIndex(r => r.id === request.id);
        if (index > -1) {
            requests[index] = request;
            this.saveRecycleRequests(requests);
        }
    }

    markRecycleRequestAsRead(id: string) {
        const requests = this.getRecycleRequests();
        const request = requests.find(r => r.id === id);
        if (request && !request.isRead) {
            request.isRead = true;
            this.saveRecycleRequests(requests);
        }
    }

    deleteRecycleRequest(id: string) {
        const requests = this.getRecycleRequests().filter(r => r.id !== id);
        this.saveRecycleRequests(requests);
    }

    // --- User Likes ---
    getUserLikes(userId: string): string[] {
        try {
            const data = localStorage.getItem(`xiaoyu_likes_${userId}`);
            return data ? JSON.parse(data) : [];
        } catch (e) { return []; }
    }

    saveUserLikes(userId: string, likes: string[]) {
        safeSetItem(`xiaoyu_likes_${userId}`, JSON.stringify(likes));
    }

    toggleUserLike(userId: string, configId: string): boolean {
        const likes = this.getUserLikes(userId);
        const idx = likes.indexOf(configId);
        let isLiked = false;

        if (idx >= 0) {
            likes.splice(idx, 1); // Unlike
            isLiked = false;
        } else {
            likes.push(configId); // Like
            isLiked = true;
        }

        this.saveUserLikes(userId, likes);
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

    login(username: string, password?: string): UserItem | null {
        const users = this.getUsers();
        const user = users.find(u => u.username === username);

        if (user) {
            const isValid = user.password ? user.password === password : true;

            if (isValid) {
                user.lastLogin = new Date().toISOString();
                this.saveUser(user);
                localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
                window.dispatchEvent(new Event('xiaoyu-login'));
                return user;
            }
        }
        return null;
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
    getComments(configId?: string): import('../types/adminTypes').CommentItem[] {
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

    saveComment(comment: import('../types/adminTypes').CommentItem) {
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

    deleteComment(id: string) {
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

    getChatSettings(): import('../types/adminTypes').ChatSettings {
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

    saveChatSettings(settings: import('../types/adminTypes').ChatSettings) {
        localStorage.setItem('xiaoyu_chat_settings', JSON.stringify(settings));
    }

    // Sessions
    getChatSessions(): import('../types/adminTypes').ChatSession[] {
        try {
            const data = localStorage.getItem('xiaoyu_chat_sessions');
            return data ? JSON.parse(data) : [];
        } catch (e) { return []; }
    }

    getChatSession(sessionId: string): import('../types/adminTypes').ChatSession | undefined {
        return this.getChatSessions().find(s => s.id === sessionId);
    }

    saveChatSession(session: import('../types/adminTypes').ChatSession) {
        let sessions = this.getChatSessions();
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
    getChatMessages(sessionId: string): import('../types/adminTypes').ChatMessage[] {
        try {
            const data = localStorage.getItem(`xiaoyu_chat_msgs_${sessionId}`);
            return data ? JSON.parse(data) : [];
        } catch (e) { return []; }
    }

    addChatMessage(sessionId: string, message: Omit<import('../types/adminTypes').ChatMessage, 'id' | 'sessionId' | 'timestamp' | 'isRead'>) {
        const fullMsg: import('../types/adminTypes').ChatMessage = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            sessionId,
            timestamp: Date.now(),
            isRead: false,
            ...message
        };

        // 1. Save Message
        const msgs = this.getChatMessages(sessionId);
        msgs.push(fullMsg);
        localStorage.setItem(`xiaoyu_chat_msgs_${sessionId}`, JSON.stringify(msgs));

        // 2. Update Session
        const session = this.getChatSession(sessionId);
        if (session) {
            session.lastMessage = fullMsg;
            session.updatedAt = Date.now();
            if (message.sender === 'user') {
                session.unreadCount += 1; // Admin sees unread
            }
            this.saveChatSession(session);
        }

        window.dispatchEvent(new CustomEvent('xiaoyu-chat-message-update', { detail: { sessionId } }));

        // --- Auto Reply Logic ---
        if (message.sender === 'user') {
            const settings = this.getChatSettings();
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
                        this.saveChatSession(session);
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

    markSessionRead(sessionId: string) {
        const session = this.getChatSession(sessionId);
        if (session && session.unreadCount > 0) {
            session.unreadCount = 0;
            this.saveChatSession(session);
        }
    }

    // Helper to start/get session for current user
    getOrCreateCurrentUserSession(user: { id?: string, username?: string } | null): import('../types/adminTypes').ChatSession {
        const userId = user?.id || localStorage.getItem('xiaoyu_guest_id') || `guest-${Math.random().toString(36).substr(2, 9)}`;
        if (!user?.id && !localStorage.getItem('xiaoyu_guest_id')) {
            localStorage.setItem('xiaoyu_guest_id', userId);
        }

        const sessions = this.getChatSessions();
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
            this.saveChatSession(session);

            // Add initial welcome message
            const settings = this.getChatSettings();
            this.addChatMessage(session.id, {
                sender: 'system',
                content: settings.welcomeMessage
            });
        }
        return session;
    }

    // --- System Statistics ---
    getSystemStats(): SystemStats {
        try {
            const data = localStorage.getItem(KEYS.SYSTEM_STATS);
            return data ? JSON.parse(data) : { totalAiGenerations: 0, dailyStats: [] };
        } catch (e) {
            return { totalAiGenerations: 0, dailyStats: [] };
        }
    }

    saveSystemStats(stats: SystemStats) {
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

    logAiGeneration() {
        const stats = this.getSystemStats();
        const today = new Date().toISOString().split('T')[0];
        const daily = this.getOrCreateDailyStat(today, stats);

        stats.totalAiGenerations += 1;
        daily.aiGenerations += 1;
        this.saveSystemStats(stats);
    }

    logNewConfig() {
        const stats = this.getSystemStats();
        const today = new Date().toISOString().split('T')[0];
        const daily = this.getOrCreateDailyStat(today, stats);

        daily.newConfigs += 1;
        this.saveSystemStats(stats);
    }

    logNewUser() {
        const stats = this.getSystemStats();
        const today = new Date().toISOString().split('T')[0];
        const daily = this.getOrCreateDailyStat(today, stats);

        daily.newUsers += 1;
        this.saveSystemStats(stats);
    }

    // --- About Us Configuration ---
    getAboutUsConfig(): AboutUsConfig {
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

    saveAboutUsConfig(config: AboutUsConfig) {
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
