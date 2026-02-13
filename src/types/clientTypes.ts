
// Re-export UserItem from adminTypes for simplicity, or redefine if we want separation.
// For prototype, let's redefine a simpler version or just use the one from adminTypes if possible, 
// but circular deps might be annoying. Let's just redefine a simple one.
export interface UserItem {
    id: string;
    username: string;
    role: 'admin' | 'streamer' | 'user' | 'sub_admin';
    status: 'active' | 'banned';
    lastLogin: string;
    vipExpireAt?: number;
}

export type Category = 'cpu' | 'mainboard' | 'gpu' | 'ram' | 'disk' | 'power' | 'cooling' | 'fan' | 'case' | 'monitor' | 'mouse' | 'keyboard' | 'accessory';

export interface HardwareSpecs {
    socket?: string;
    memoryType?: string;
    wattage?: number;
    formFactor?: string;
    cores?: number;
    threads?: number;
    frequency?: string;
    vrm?: string;
    maxWattage?: number;
    performance?: string;
    length?: number;
    memorySize?: number;
}

export interface HardwareItem {
    id: string;
    category: Category;
    brand: string;
    model: string;
    price: number;
    specs: HardwareSpecs;
    image?: string;
    createdAt?: string;
    isDiscount?: boolean;
    isRecommended?: boolean;
    isNew?: boolean; // 新品 (后台标记)
    status?: 'active' | 'draft' | 'archived'; // 上架、草稿、下架
}

export interface BuildEntry {
    id: string;
    category: Category;
    item: HardwareItem | null;
    quantity: number;
    customPrice?: number;
    customName?: string;
    isLockedQty?: boolean;
}

export interface ConfigTemplate {
    id: string;
    title: string;
    author: string;
    avatarColor: string;
    type: 'official' | 'streamer' | 'user' | 'help';
    tags: { type: 'appearance' | 'usage'; label: string }[];
    price: number;
    items: Partial<Record<Category, string>>;
    likes: number;
    views: number;
    comments: number;
    date: string;
    isLiked?: boolean;
    serialNumber?: string; // e.g. 2026-000001
    description?: string;
    userId?: string; // Author ID for checking roles/VIP
    isVip?: boolean; // Pre-calculated VIP status
}

export interface AnnouncementItem {
    id: string;
    content: string;
    type: 'info' | 'warning' | 'promo';
    pinned?: boolean;
    linkUrl?: string;
}

export interface SystemAnnouncementSettings {
    enabled: boolean;
    items: AnnouncementItem[];
    content?: string; // Legacy support
}

export interface Article {
    id: string;
    title: string;
    summary: string;
    content: string;
    coverImage?: string;
    isPinned?: boolean;
    createdAt: string;
    updatedAt: string;
}
