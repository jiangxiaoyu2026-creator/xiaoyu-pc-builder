


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
    userName?: string; // Backend 对应 userName
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
    email?: string;           // Added email field
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
    type?: 'text' | 'image' | 'product' | 'order'; // Added type
    timestamp: number;
    isRead: boolean;
    isAdmin?: boolean;
}

export interface ChatSession {
    id: string;
    userId: string; // 'guest-xxx' or 'user-id'
    userParserId?: string; // Added userParserId
    username: string;
    userAvatar?: string;
    lastMessage?: ChatMessage | string; // Compatible with string or object
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
    workingHours?: string;
    autoReply?: string;       // Matches backend
    enabled?: boolean;        // Matches backend
    // Legacy support
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

export type UsedCondition = 'Brand New' | 'Like New (99%)' | 'Slightly Used (95%)' | 'Used (90%)' | 'Used (80%)' | 'Old' | '全新' | '99新' | '95新' | '9成新' | '8成新' | '较旧' | '全新/仅拆封' | '99新 (准新)' | '95新 (轻微使用)' | '9成新 (明显使用)' | '8成新 (伊拉克)' | '功能机 (配件)';
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

export interface PopupSettings {
    enabled: boolean;       // 是否开启
    title: string;          // 弹窗标题
    content: string;        // 弹窗正文内容
    imageUrl?: string;      // (可选) Banner 图片链接
    linkUrl?: string;       // (可选) 跳转链接
    buttonText?: string;    // (可选) 按钮文字
    frequency?: 'once' | 'daily' | 'always';  // 展示频率
    startDate?: string;     // 定时开始日期 (YYYY-MM-DD)
    endDate?: string;       // 定时结束日期 (YYYY-MM-DD)
    theme?: 'default' | 'festive' | 'promo' | 'notice'; // 弹窗主题
}

export interface AnnouncementItem {
    id: string;
    content: string;
    type: 'info' | 'warning' | 'promo';  // 通知/紧急/促销
    linkUrl?: string;                     // 可选跳转链接
    pinned?: boolean;                     // 是否置顶
}

export interface SystemAnnouncementSettings {
    enabled: boolean;
    items: AnnouncementItem[];            // 多条公告
    // 兼容旧格式
    content?: string;
}
