


export type Category = 'cpu' | 'mainboard' | 'gpu' | 'ram' | 'disk' | 'power' | 'cooling' | 'fan' | 'case' | 'monitor' | 'mouse' | 'keyboard' | 'accessory';

export interface HardwareItem {
    id: string;
    category: Category;
    brand: string;
    model: string;
    price: number;     // 前台售价
    sortOrder: number; // 排序权重
    status: 'active' | 'draft' | 'archived'; // 上架、草稿、下架
    specs: Record<string, any>; // 包含兼容性字段
    image?: string; // Base64 or URL
    createdAt?: string;
    isDiscount?: boolean; // 折扣 (后台标记)
    isRecommended?: boolean; // 推荐 (后台标记)
    isNew?: boolean; // 新品 (后台标记)
    updatedAt?: string;
}

export interface ConfigItem {
    id: string;
    userId: string;
    authorName: string;
    title: string;
    totalPrice: number;
    items: Partial<Record<Category, string>>; // 存 ID
    tags: string[];
    status: 'published' | 'hidden'; // 仅保留发布和隐藏状态
    isRecommended: boolean; // 是否推荐/置顶
    views: number;
    likes: number;
    createdAt: string;
    serialNumber?: string; // e.g. 2026-000001
    description?: string;
}

export interface UserItem {
    id: string;
    username: string;
    password?: string; // Optional for compatibility/security masking
    role: 'admin' | 'streamer' | 'user' | 'sub_admin';
    status: 'active' | 'banned';
    lastLogin: string;
    vipExpireAt?: number; // Timestamp
    // 邀请系统
    inviteCode?: string;      // 用户专属邀请码 (6位)
    invitedBy?: string;       // 通过谁的邀请码注册
    inviteCount?: number;     // 已邀请人数
    inviteVipDays?: number;   // 通过邀请获得的 VIP 天数
}

export interface PaymentPlan {
    id: 'day' | 'week' | 'month' | 'year';
    name: string;
    price: number;
    durationDays: number;
    originalPrice?: number;
}

export interface DiscountTier {
    id: string;
    name: string;
    multiplier: number;
    description: string;
    sortOrder: number;
}

export interface PricingStrategy {
    serviceFeeRate: number;
    discountTiers: DiscountTier[];
}

export interface AISettings {
    provider: 'deepseek' | 'openai' | 'claude' | 'custom';
    apiKey: string;
    baseUrl: string;
    model: string;
    enabled: boolean;
    // Personality and Strategy
    persona?: 'toxic' | 'professional' | 'enthusiastic' | 'balanced'; // 性格：毒舌、专业、热心、中庸
    strategy?: 'performance' | 'budget' | 'balanced' | 'aesthetic'; // 策略：性能优先、预算优先、平衡、颜值优先
    // Content Configuration
    intros?: string[];
    lowBudgetIntros?: string[];
    severeBudgetIntros?: string[];
    verdicts?: string[];
    ctas?: string[];
}

// --- Chat System Types ---
export interface ChatMessage {
    id: string;
    sessionId: string;
    sender: 'user' | 'agent' | 'system' | 'admin';
    content: string;
    timestamp: number;
    isRead: boolean;
    isAdmin?: boolean;
}

export interface ChatSession {
    id: string;
    userId: string; // 'guest-xxx' or 'user-id'
    username: string;
    userAvatar?: string;
    lastMessage?: ChatMessage;
    unreadCount: number;
    createdAt: number;
    updatedAt: number;
    status: 'active' | 'closed';
    context?: {
        currentPath?: string;
        cartTotal?: number;
    };
}

export interface ChatSettings {
    welcomeMessage: string;
    quickReplies: string[];
    autoReplyEnabled?: boolean;
    autoReplyContent?: string;
}

export interface SMSSettings {
    provider: 'aliyun' | 'tencent' | 'mock';
    accessKeyId: string;
    accessKeySecret: string;
    signName: string;
    templateCode: string;
    enabled: boolean;
}

export interface CommentItem {
    id: string;
    configId: string;
    userId: string;       // "u1", "u2" or "guest"
    userName: string;     // snapshot of username
    content: string;
    createdAt: string;
    status: 'active' | 'hidden';
}

// ========== 二手硬件模块 ==========

export type UsedCondition = '全新' | '99新' | '95新' | '9成新' | '8成新' | '较旧';
export type InspectionGrade = 'A' | 'B' | 'C' | 'D';

export interface InspectionReport {
    inspectedAt: string;
    grade: InspectionGrade;     // 综合评级
    score: number;              // 综合评分 (0-100)
    temperature?: string;       // 核心温度
    stressTest: boolean;        // 压力测试是否通过
    functionTest: boolean;      // 功能检测是否通过
    appearance: string;         // 外观描述
    notes: string;              // 备注
    summary?: string;           // 质检员总结
    inspectorName?: string;     // 质检员姓名/工号
    reportId?: string;          // 报告唯一ID
}

export type UsedCategory = 'host' | 'gpu' | 'accessory';

export interface UsedItem {
    id: string;
    type: 'official' | 'personal'; // 官方自营 or 个人闲置
    category: UsedCategory;
    brand: string;
    model: string;
    price: number;        // 期望售价
    originalPrice?: number; // 入手原价
    description: string;
    images: string[];
    condition: string;    // 成色 (e.g. "99新", "95新")
    status: 'pending' | 'published' | 'sold' | 'rejected';
    sellerId: string;
    sellerName: string;
    sellerAvatar?: string;
    xianyuLink?: string;       // 闲鱼链接
    createdAt: number;
    soldAt?: number;           // 标记已售时间戳（用于3天后隐藏）
    inspectionReport?: InspectionReport; // 关联的质检报告
    adminNotes?: string;        // 管理员备注（内部）
    contact?: string;           // 联系方式
}

export interface DailyStat {
    date: string; // YYYY-MM-DD
    aiGenerations: number;
    newConfigs: number;
    newUsers: number;
}

export interface SystemStats {
    totalAiGenerations: number;
    dailyStats: DailyStat[];
}

export interface AboutUsCard {
    title: string;
    description: string;
    icon?: string; // Optional icon name from lucide
}

export interface AboutUsConfig {
    topCards: AboutUsCard[];
    brandImages: {
        url: string;
        title: string;
        desc: string;
    }[];
}

export interface RecycleRequest {
    id: string;
    userId: string;
    userName: string;
    description: string;
    wechat: string;              // 微信联系方式
    image?: string;              // 单张图片
    status: 'pending' | 'completed';
    isRead: boolean;             // 是否已读
    createdAt: string;
}
