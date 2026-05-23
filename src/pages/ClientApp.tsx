import { useState, useMemo, useEffect, useRef, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, User, Save, Menu, X, Monitor, Zap, LayoutGrid, ShoppingBag, Info, Trash2, ArrowRight, ChevronDown, Check, Sparkles, BookOpen, RefreshCw, ChevronRight, Sun, Moon, Gamepad2, TrendingUp } from 'lucide-react';
import { BuildEntry, ConfigTemplate, Category, UserItem, StreamerLiveMeta } from '../types/clientTypes';
import { DEFAULT_BUILD_TEMPLATE, HARDWARE_DB } from '../data/clientData';
import { storage } from '../services/storage';
import LoginModal from '../components/common/LoginModal';
import { TabButton } from '../components/client/Shared';
import ChatWidget from '../components/common/ChatWidget';
import { ShareFormModal, SavePreviewModal, ConfigLibraryModal } from '../components/client/Modals';
import { UsedItem } from '../types/adminTypes';
import DailyPopup from '../components/client/DailyPopup';
// Removed ArticleList
// Removed StreamerPriceTrend

// Lazy-loaded heavy components (code splitting for faster initial load)
const StreamerWorkbench = lazy(() => import('../components/client/StreamerWorkbench'));
const VisualBuilder = lazy(() => import('../components/client/VisualBuilder'));
const ConfigSquare = lazy(() => import('../components/client/ConfigSquare'));
const AboutUs = lazy(() => import('../components/client/AboutUs'));
const UsedMarket = lazy(() => import('../components/client/UsedMarket'));
const GameFPSViewer = lazy(() => import('../components/client/GameFPSViewer').then(m => ({ default: m.GameFPSViewer })));
const UserCenterModal = lazy(() => import('../components/client/UserCenterModal').then(m => ({ default: m.UserCenterModal })));
const PaymentModal = lazy(() => import('../components/client/UiComponents/PaymentModal').then(m => ({ default: m.PaymentModal })));
const SellModal = lazy(() => import('../components/client/SellModal'));
const RecycleEstimator = lazy(() => import('../components/client/RecycleEstimator'));
const UsedItemDetail = lazy(() => import('../components/client/UsedItemDetail'));
const StreamerPriceTrend = lazy(() => import('../components/client/StreamerPriceTrend'));

// ...
import { useTheme } from '../hooks/useTheme';

export default function ClientApp() {
    const LIVE_SCENARIO_OPTIONS = ['实用', '颜值', '游戏', '直播', '生产力', '海景房'];
    const DEFAULT_LIVE_META: StreamerLiveMeta = {
        budget: '',
        customerName: '',
        scenarios: []
    };
    const [viewMode, setViewMode] = useState<'visual' | 'streamer' | 'square' | 'used' | 'about' | 'gamefps' | 'trends'>(() => {
        const path = window.location.pathname.toLowerCase();
        if (path === '/vip' || path === '/vip/') return 'streamer';
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');
        if (tab === 'gamefps' || tab === 'headlines') return 'gamefps';
        if (tab === 'trends') return 'trends';
        if (params.get('config') || tab === 'square') return 'square';
        if (tab === 'used') return 'used';
        if (tab === 'about') return 'about';
        if (tab === 'streamer') return 'streamer';
        return 'visual';
    });

    useEffect(() => {
        if (viewMode === 'streamer') {
            window.history.replaceState({}, '', '/VIP');
        } else {
            const base = window.location.pathname.toLowerCase() === '/vip' ? '/' : window.location.pathname;
            const url = new URL(base, window.location.origin);
            if (viewMode !== 'visual') {
                url.searchParams.set('tab', viewMode);
            }
            window.history.replaceState({}, '', url.toString());
        }
    }, [viewMode]);

    const [buildList, setBuildList] = useState<BuildEntry[]>(() =>
        DEFAULT_BUILD_TEMPLATE.map(i => ({ ...i, item: null, customPrice: undefined, quantity: 1 }))
    );
    const [configList, setConfigList] = useState<ConfigTemplate[]>([]);
    const [currentUser, setCurrentUser] = useState<UserItem | null>(null);
    const [settings, setSettings] = useState<import('../types/adminTypes').PricingStrategy>({
        serviceFeeRate: 0.06,
        discountTiers: []
    });
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [showUserCenter, setShowUserCenter] = useState(false);
    const [showDiscountSheet, setShowDiscountSheet] = useState(false);
    const [triggerAiModal, setTriggerAiModal] = useState(false);
    const [liveMeta, setLiveMeta] = useState<StreamerLiveMeta>(DEFAULT_LIVE_META);
    const [isScrolling, setIsScrolling] = useState(false);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleScroll = () => {
        if (viewMode !== 'visual') return;
        setIsScrolling(true);
        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
        }
        scrollTimeoutRef.current = setTimeout(() => {
            setIsScrolling(false);
        }, 250);
    };

    useEffect(() => {
        return () => {
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, []);
    
    // Theme
    const { theme, setTheme } = useTheme();

    // Check permission for Streamer Center
    const hasStreamerPermission = useMemo(() => {
        if (!currentUser) return false;
        if (currentUser.role === 'admin') return true;
        if (currentUser.role === 'streamer' && currentUser.streamerExpireAt && currentUser.streamerExpireAt > Date.now()) return true;
        return false;
    }, [currentUser]);

    const [allProducts, setAllProducts] = useState<import('../types/clientTypes').HardwareItem[]>([]);

    const loadData = async () => {
        try {
            const [user, s, configs, allUsers, productsRes] = await Promise.all([
                storage.getCurrentUser(),
                storage.getPricingStrategy(),
                storage.getConfigs({ pageSize: 1000 }),
                storage.getUsers(),
                storage.getProducts(1, 1000)
            ]);

            // --- Sync Current User Object from All Users ---
            // Zero-cost sync: Instead of a new API call, we use the allUsers list we just fetched 
            // to update the current user's role and VIP status in case it was changed by an admin.
            let activeUser = user;
            if (activeUser) {
                const updatedUser = allUsers.find(u => u.id === activeUser?.id || (u as any)._id === activeUser?.id);
                if (updatedUser) {
                    const needsUpdate =
                        updatedUser.role !== activeUser.role ||
                        updatedUser.vipExpireAt !== activeUser.vipExpireAt ||
                        updatedUser.streamerExpireAt !== activeUser.streamerExpireAt;

                    if (needsUpdate) {
                        activeUser = { ...activeUser, role: updatedUser.role, vipExpireAt: updatedUser.vipExpireAt, streamerExpireAt: updatedUser.streamerExpireAt };
                        // Silently update local storage without triggering another loadData loop
                        localStorage.setItem('xiaoyu_current_user', JSON.stringify(activeUser));
                    }
                }
            }
            setCurrentUser(activeUser);
            // ----------------------------------------------
            setSettings(s);
            setAllProducts(productsRes.items);

            const visibleConfigs = configs.items.filter((c: any) => c.status === 'published' || c.status === 'active');
            // Map admin configs to client template
            const mappedList: ConfigTemplate[] = visibleConfigs.map((c: any) => {
                const authorUser = allUsers.find((u: any) => u.id === c.userId);
                const authorName = c.userName || (authorUser?.username) || '匿名';

                // Unified type logic consistent with ConfigSquare
                let type: 'official' | 'streamer' | 'user' | 'help' = 'user';
                // Prioritize role-based identification
                if (c.authorRole === 'streamer') type = 'streamer';
                // Fallback to keyword matching and other flags
                else if (authorName.includes('主播') || (authorName.includes('分享者') === false && c.title.includes('主播'))) type = 'streamer';

                if (Array.isArray(c.tags) && c.tags.some((t: any) => (typeof t === 'string' ? t : t.label) === '求助')) type = 'help';
                
                // 官方要求：只有后台明确设置了“官方推荐”才显示为官方配置
                if (c.isRecommended) type = 'official';

                const isVip = authorUser ? (
                    ['admin', 'streamer', 'sub_admin'].includes(authorUser.role) ||
                    !!(authorUser.vipExpireAt && authorUser.vipExpireAt > Date.now())
                ) : false;

                return {
                    id: c.id,
                    userId: c.userId,
                    title: c.title || '未命名配置',
                    author: authorName,
                    avatarColor: c.userId === 'admin' ? 'bg-zinc-900' : 'bg-blue-500',
                    type: type,
                    tags: (() => {
                        let parsedTagsRaw: any = [];
                        try {
                            parsedTagsRaw = Array.isArray(c.tags) ? c.tags : (typeof c.tags === 'string' ? JSON.parse(c.tags || '[]') : []);
                        } catch (e) { }
                        const parsedTags = Array.isArray(parsedTagsRaw) ? parsedTagsRaw : [];
                        return parsedTags.map((t: any) => typeof t === 'string' ? { type: 'usage' as const, label: t } : t);
                    })(),
                    price: c.totalPrice,
                    items: typeof c.items === 'string' ? JSON.parse(c.items) : (c.items || {}),
                    likes: c.likes || 0,
                    views: c.views || 0,
                    comments: 0,
                    date: c.createdAt ? c.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
                    isLiked: false,
                    serialNumber: c.serialNumber,
                    description: c.description,
                    isVip: isVip,
                    showcaseStatus: c.showcaseStatus,
                    showcaseImages: typeof c.showcaseImages === 'string' ? JSON.parse(c.showcaseImages) : (c.showcaseImages || [])
                };
            });
            setConfigList(mappedList);
        } catch (error) {
            console.error('Failed to load client data:', error);
        }
    };

    useEffect(() => {
        loadData();
        window.addEventListener('xiaoyu-login', loadData);
        window.addEventListener('xiaoyu-storage-update', loadData);
        return () => {
            window.removeEventListener('xiaoyu-login', loadData);
            window.removeEventListener('xiaoyu-storage-update', loadData);
        };
    }, []);

    const [discountRate, setDiscountRate] = useState(1.0);
    // Ensure discountRate is valid in current tiers, else default to 1.0
    useEffect(() => {
        if (!settings.discountTiers.some(t => t.multiplier === discountRate)) {
            // If current rate not in new settings, reset to 1.0 or first available
            setDiscountRate(1.0);
        }
    }, [settings.discountTiers]);

    const [isSharing] = useState(false);
    const isPublishingRef = useRef(false); // Concurrency guard to prevent duplicate publishes
    const [showShareModal, setShowShareModal] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [showLibraryModal, setShowLibraryModal] = useState(false);
    const [toast, setToast] = useState<{ show: boolean; msg: string }>({ show: false, msg: '' });

    // --- Used Market States ---
    const [showSellModal, setShowSellModal] = useState(false);
    const [showRecycleModal, setShowRecycleModal] = useState(false);
    const [selectedUsedItem, setSelectedUsedItem] = useState<UsedItem | null>(null);
    // Chat control for consult purchase
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatInitialMessage, setChatInitialMessage] = useState('');



    const [showLoginModal, setShowLoginModal] = useState(false);
    const [urlInviteCode, setUrlInviteCode] = useState('');

    // 检测 URL 中的邀请码参数
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const inviteCode = params.get('invite');
        if (inviteCode && inviteCode.length === 6) {
            setUrlInviteCode(inviteCode.toUpperCase());
            // 如果用户未登录，自动弹出注册框
            if (!currentUser) {
                setShowLoginModal(true);
            }
            // 清除 URL 参数
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, [currentUser]);

    const handleLogout = () => {
        storage.logout();
        setCurrentUser(null);
        showToast('已安全退出');
    };

    const handleLoginSuccess = (user: UserItem) => {
        setCurrentUser(user);
        showToast(`欢迎回来，${user.username}！`);
    };

    const pricing = useMemo(() => {
        const hardwareTotal = buildList.reduce((sum, entry) => {
            const unitPrice = entry.customPrice ?? entry.item?.price ?? 0;
            return sum + (unitPrice * entry.quantity);
        }, 0);

        // Use serviceFeeRate from settings instead of static PROFIT_MARGIN
        const standardPrice = hardwareTotal * (1 + settings.serviceFeeRate);
        const finalPrice = Math.floor(standardPrice * discountRate);
        const savedAmount = Math.floor(standardPrice - finalPrice);
        return {
            hardwareTotal,
            standardPrice,
            finalPrice,
            savedAmount,
            discountTiers: settings.discountTiers,
            serviceFeeRate: settings.serviceFeeRate,
            discountRate,
            onDiscountChange: setDiscountRate
        };
    }, [buildList, discountRate, settings]);

    const healthCheck = useMemo(() => {
        const issues: string[] = [];
        const cpuEntry = buildList.find(e => e.category === 'cpu');
        const mbEntry = buildList.find(e => e.category === 'mainboard');
        const ramEntry = buildList.find(e => e.category === 'ram');

        const inferSpecs = (item: any) => {
            if (!item) return {};
            let specs = item.specs || {};
            if (typeof specs === 'string') {
                try {
                    specs = JSON.parse(specs);
                } catch (e) {
                    specs = {};
                }
            }
            specs = { ...specs };
            const model = item.model.toUpperCase();

            if (!specs.memoryType) {
                // 最高优先级：型号名称里写明了 DDR4 / DDR5（如 "B660M DDR4"）
                if (model.includes('DDR4') || model.includes(' D4')) {
                    specs.memoryType = 'DDR4';
                } else if (model.includes('DDR5') || model.includes(' D5')) {
                    specs.memoryType = 'DDR5';
                }
                // 次优先级：根据芯片组推断（仅在名称中没有显式标注时）
                else if (/X870|B650|X670|A620|Z890|B860|Z790|B760|Z690|B660/.test(model)) {
                    specs.memoryType = 'DDR5';
                } else if (/B550|X570|B450|A320|H610M-K|Z590|B560|Z490/.test(model)) {
                    specs.memoryType = 'DDR4';
                }
            }

            // Normalize for comparison
            if (specs.memoryType) specs.memoryType = specs.memoryType.toUpperCase().trim();
            if (specs.socket) specs.socket = specs.socket.toUpperCase().trim();

            if (item.category === 'mainboard' && !specs.socket) {
                if (/X870|B650|X670|A620/.test(model)) specs.socket = 'AM5';
                else if (/B550|X570|B450|A320/.test(model)) specs.socket = 'AM4';
                else if (/Z890|B860/.test(model)) specs.socket = 'LGA1851';
                else if (/Z790|B760|Z690|B660/.test(model)) specs.socket = 'LGA1700';
            }
            return specs;
        };

        const cpuSpecs = inferSpecs(cpuEntry?.item);
        const mbSpecs = inferSpecs(mbEntry?.item);
        const ramSpecs = inferSpecs(ramEntry?.item);

        if (cpuEntry?.item && mbEntry?.item && cpuSpecs.socket && mbSpecs.socket && cpuSpecs.socket !== mbSpecs.socket) {
            issues.push(`接口不兼容: CPU是 ${cpuSpecs.socket}，主板是 ${mbSpecs.socket} `);
        }
        if (ramEntry?.item && mbEntry?.item && ramSpecs.memoryType && mbSpecs.memoryType && ramSpecs.memoryType !== mbSpecs.memoryType) {
            issues.push(`内存不兼容: 内存是 ${ramSpecs.memoryType}，主板仅支持 ${mbSpecs.memoryType} `);
        }
        return { status: issues.length === 0 ? 'perfect' : 'warning', issues };
    }, [buildList]);

    const clearBuild = () => {
        setBuildList(DEFAULT_BUILD_TEMPLATE.map(i => ({ ...i, item: null, customPrice: undefined, customName: undefined })));
    };

    const clearStreamerBuild = () => {
        setBuildList(DEFAULT_BUILD_TEMPLATE.map(i => ({ ...i, item: null, customPrice: undefined, customName: undefined, quantity: 1 })));
        setLiveMeta(DEFAULT_LIVE_META);
        setDiscountRate(1.0);
    };

    const updateEntry = (id: string, updates: Partial<BuildEntry>) => setBuildList(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));



    const showToast = (msg: string) => {
        setToast({ show: true, msg });
        setTimeout(() => setToast({ show: false, msg: '' }), 3000);
    };

    const getStreamerShareData = () => {
        const scenarios = liveMeta.scenarios.length > 0 ? liveMeta.scenarios : ['游戏'];
        const customerName = liveMeta.customerName.trim() || '客户';
        const budget = liveMeta.budget.trim() || String(pricing.finalPrice);
        const serviceFeePercent = ((settings.serviceFeeRate ?? 0.06) * 100).toFixed(0);

        return {
            title: `${customerName} ${budget}预算装机单`,
            tags: scenarios,
            desc: `客户：${customerName}；预算：${budget}；用途：${scenarios.join('、')}；组装、走线、三年质保、${serviceFeePercent}% 利润、济南发货、不包邮`
        };
    };

    const handleSave = () => {
        if (!currentUser) {
            showToast("🔒 请先登录后再保存配置");
            setShowLoginModal(true);
            return;
        }
        setShowSaveModal(true);
    };

    const handleShareTrigger = () => {
        if (!currentUser) {
            showToast("🔒 请先登录后再分享配置");
            setShowLoginModal(true);
            return;
        }
        if (pricing.finalPrice === 0) {
            showToast("❌ 配置单为空，无法分享");
            return;
        }
        if (viewMode === 'streamer') {
            handlePublishToSquare(getStreamerShareData());
            return;
        }
        setShowShareModal(true);
    };



    // ... existing loadData ...

    // Toggle Like
    const handleToggleLike = async (id: string) => {
        if (!currentUser) {
            showToast("请先登录后收藏");
            setShowLoginModal(true);
            return;
        }

        const target = configList.find(c => c.id === id);
        if (target) {
            const isLiked = await storage.toggleUserLike(currentUser.id, id);

            // Update local state
            setConfigList(prev => prev.map(item => {
                if (item.id === id) {
                    return { ...item, likes: isLiked ? item.likes + 1 : item.likes - 1, isLiked };
                }
                return item;
            }));

            // Update admin config storage (count only)
            const allConfigs = await storage.getConfigs();
            const adminConfig = allConfigs.items.find((c: any) => c.id === id);
            if (adminConfig) {
                adminConfig.likes = isLiked ? adminConfig.likes + 1 : adminConfig.likes - 1;
                await storage.saveConfig(adminConfig);
            }
        }
    };

    const handleFork = async (config: ConfigTemplate) => {
        try {
            // Extract all hardware IDs from the config
            const productIds = Object.entries(config.items).map(([key, id]: [string, any]) => {
                if (key.startsWith('__')) return null;
                if (typeof id === 'string') return id;
                if (typeof id === 'object' && id && id.id && !id.isCustom) return id.id;
                return null;
            }).filter(Boolean) as string[];

            // Fetch specific products by IDs from server
            const productsList = await storage.getProductsByIds(productIds);

            const newList = DEFAULT_BUILD_TEMPLATE.map(entry => {
                // @ts-ignore
                const itemId = config.items?.[entry.category] || config.items?.[entry.id]; // Try both
                if (itemId) {
                    let idToFind = itemId;
                    let qty = 1;
                    // Check if it's a custom item object
                    if (typeof itemId === 'object') {
                        if (itemId.isCustom) {
                            return { ...entry, item: null, customName: itemId.name, customPrice: itemId.price, quantity: itemId.quantity || 1 };
                        } else if (itemId.id) {
                            idToFind = itemId.id;
                            qty = itemId.quantity || 1;
                        }
                    }
                    
                    // Find in fetched products OR fallback to HARDWARE_DB
                    const adminItem = productsList.find((h: any) => h.id === idToFind) || HARDWARE_DB.find(h => h.id === idToFind);
                    let clientItem = null;
                    if (adminItem) {
                        clientItem = {
                            id: adminItem.id,
                            category: adminItem.category,
                            brand: adminItem.brand,
                            model: adminItem.model,
                            price: adminItem.price,
                            specs: adminItem.specs,
                            image: adminItem.image
                        };
                    }
                    return { ...entry, item: clientItem || null, customPrice: undefined, quantity: qty };
                }
                return { ...entry, item: null, quantity: 1 };
            });
            setBuildList(newList);
            const storedLiveMeta = config.items?.__liveMeta;
            const configScenarioTags = config.tags
                .map(tag => tag.label)
                .filter(label => LIVE_SCENARIO_OPTIONS.includes(label));
            if (storedLiveMeta) {
                setLiveMeta({
                    budget: String(storedLiveMeta.budget || config.price || ''),
                    customerName: String(storedLiveMeta.customerName || config.author || ''),
                    scenarios: Array.isArray(storedLiveMeta.scenarios) && storedLiveMeta.scenarios.length > 0
                        ? storedLiveMeta.scenarios.filter(label => LIVE_SCENARIO_OPTIONS.includes(label))
                        : (configScenarioTags.length > 0 ? configScenarioTags : ['游戏'])
                });
            } else {
                setLiveMeta({
                    budget: config.price ? String(config.price) : liveMeta.budget,
                    customerName: config.author || liveMeta.customerName,
                    scenarios: configScenarioTags.length > 0 ? configScenarioTags : liveMeta.scenarios
                });
            }
            if (viewMode !== 'streamer') {
                setViewMode('visual');
            }
            setShowLibraryModal(false);
            showToast(`✅ 已载入配置：${config.title} `);
        } catch (err) {
            console.error("Failed to load config:", err);
            showToast("❌ 载入配置失败，请稍后重试");
        }
    };

    const handlePublishToSquare = async (data: { title: string, tags: string[], desc: string, status?: 'published' | 'draft', showcaseImages?: string[] }) => {
        // Prevent duplicate submissions from double-clicks or rapid calls
        if (isPublishingRef.current) {
            showToast('⏳ 正在发布中，请稍候...');
            return;
        }
        isPublishingRef.current = true;
        try {
            const saveStatus = data.status || 'published';
            const buildItems = buildList.reduce((acc, curr) => {
                if (curr.item) {
                    if (curr.quantity && curr.quantity > 1) {
                        acc[curr.category] = { id: curr.item.id, quantity: curr.quantity };
                    } else {
                        acc[curr.category] = curr.item.id;
                    }
                } else if (curr.customName) {
                    acc[curr.category] = {
                        isCustom: true,
                        name: curr.customName,
                        price: curr.customPrice || 0,
                        quantity: curr.quantity || 1
                    };
                }
                return acc;
            }, {} as Record<Category, any>);
            const templateItems = viewMode === 'streamer'
                ? {
                    ...buildItems,
                    __liveMeta: {
                        ...liveMeta,
                        scenarios: liveMeta.scenarios.length > 0 ? liveMeta.scenarios : ['游戏']
                    }
                }
                : buildItems;
            // Create Client Template (for local optimistic UI)
            const newTemplate: ConfigTemplate = {
                id: `user - ${Date.now()} `,
                userId: currentUser?.id,
                title: data.title,
                author: hasStreamerPermission && viewMode === 'streamer' ? '小鱼主播' : (currentUser?.username || '游客'),
                avatarColor: hasStreamerPermission && viewMode === 'streamer' ? 'bg-purple-600' : 'bg-indigo-500',
                type: hasStreamerPermission && viewMode === 'streamer' ? 'streamer' : 'user',
                tags: data.tags.map(t => ({
                    type: ['实用', '颜值', '小钢炮', '海景房'].includes(t) ? 'appearance' : 'usage',
                    label: t
                })),
                price: pricing.finalPrice,
                items: templateItems,
                likes: 0,
                views: 0,
                comments: 0,
                date: new Date().toISOString(),
                isLiked: false
            };

            // SAVE TO STORAGE (Backend Integration)
            const adminConfig: any = {
                id: newTemplate.id,
                userId: currentUser?.id || 'guest',
                userName: newTemplate.author,
                title: newTemplate.title,
                totalPrice: newTemplate.price,
                items: newTemplate.items,
                tags: data.tags,
                status: saveStatus,
                isRecommended: false,
                views: 0,
                likes: 0,
                createdAt: newTemplate.date,
                // serialNumber will be auto-generated by storage service
                description: data.desc, // Save description
                // Showcase: if user uploaded images, attach them and set status to pending
                ...(data.showcaseImages && data.showcaseImages.length > 0 ? {
                    showcaseImages: data.showcaseImages,
                    showcaseStatus: 'pending'
                } : {})
            };
            await storage.saveConfig(adminConfig);

            // Reload data to reflect changes
            const freshConfigs = await storage.getConfigs();
            const visibleConfigs = freshConfigs.items.filter((c: any) => c.status === 'published');
            const newConfigList = visibleConfigs.map((c: any) => {
                const authorName = c.userName || c.authorName || '未知用户';
                let type: 'official' | 'streamer' | 'user' | 'help' = 'user';

                // Prioritize role-based identification (Improved Logic)
                if (c.authorRole === 'streamer') type = 'streamer';
                else if (authorName.includes('主播')) type = 'streamer';

                let parsedTagsRaw: any = [];
                try {
                    parsedTagsRaw = Array.isArray(c.tags) ? c.tags : (typeof c.tags === 'string' ? JSON.parse(c.tags || '[]') : []);
                } catch (e) {
                    // Ignore parse error
                }
                const parsedTags = Array.isArray(parsedTagsRaw) ? parsedTagsRaw : [];

                if (parsedTags.some((t: any) => (typeof t === 'string' ? t : t.label) === '求助')) type = 'help';
                if (c.isRecommended) type = 'official';

                return {
                    id: c.id,
                    title: c.title,
                    author: authorName,
                    avatarColor: 'bg-zinc-500',
                    type: type,
                    tags: parsedTags.map((t: any) => typeof t === 'string' ? { type: 'usage' as const, label: t } : t),
                    price: c.totalPrice,
                    items: c.items,
                    likes: c.likes,
                    views: c.views,
                    comments: 0,
                    date: c.createdAt,
                    isLiked: false,
                    serialNumber: c.serialNumber,
                    description: c.description
                };
            });
            setConfigList(newConfigList);
            setShowShareModal(false);

            if (viewMode === 'streamer') {
                showToast(`✅ ${saveStatus === 'draft' ? '保存' : '发布'}成功！已准备好下一单`);
            } else {
                if (currentUser) {
                    const showcaseMsg = data.showcaseImages && data.showcaseImages.length > 0 ? '，晒单已提交审核 📸' : '';
                    showToast(saveStatus === 'draft' ? `✅ 已保存到个人中心！` : `✅ 已发布并保存到个人中心！${showcaseMsg}`);
                } else {
                    showToast(`✅ 已发布并保存！`);
                }
                if (saveStatus === 'published') {
                    setViewMode('square');
                }
            }
            clearBuild();

        } catch (error) {
            console.error("Publish failed:", error);
            showToast("❌ 发布失败，请重试");
        } finally {
            isPublishingRef.current = false;
        }
    };

    // AI Permission Check
    const handleAiPermission = () => {
        if (!currentUser) {
            showToast("🔒 请先登录以使用 AI 装机功能");
            setShowLoginModal(true);
            return false;
        }
        if (['admin', 'streamer', 'sub_admin'].includes(currentUser.role)) return true;
        if (currentUser.vipExpireAt && currentUser.vipExpireAt > Date.now()) return true;

        setShowPaymentModal(true);
        return false;
    };

    return (
        <div className="flex flex-col h-[100dvh] overflow-hidden bg-[#FAFAFA] dark:bg-[#0B0B10] font-sans selection:bg-indigo-100 selection:text-indigo-700 text-slate-800 dark:text-slate-200 transition-colors duration-300">
            <header className="relative md:sticky top-0 z-40 bg-white/70 dark:bg-[#0B0B10]/70 backdrop-blur-2xl border-b border-slate-200/50 dark:border-[#1E293B]/50 transition-all duration-300">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 bg-white dark:bg-[#1A1A24] border border-slate-200 dark:border-[#2D3748] rounded-xl flex items-center justify-center shadow-sm dark:shadow-none">
                            <Monitor className="text-indigo-600 dark:text-indigo-400" size={20} />
                        </div>
                        <span className="text-xl font-display font-bold text-slate-900 dark:text-white tracking-tight">蒋小鱼装机平台</span>
                    </div>
                    {/* Navigation Tabs - Hidden on mobile, visible on tablet/desktop */}
                    <div className="hidden md:flex bg-slate-100/50 dark:bg-[#1A1A24]/50 p-1.5 rounded-xl border border-slate-200/50 dark:border-[#2D3748]/50 backdrop-blur-xl gap-1">
                        <TabButton
                            active={viewMode === 'streamer'}
                            onClick={() => {
                                setViewMode('streamer');
                            }}
                            icon={<Zap />}
                            label="主播中心"
                        />
                        <TabButton active={viewMode === 'visual'} onClick={() => setViewMode('visual')} icon={<LayoutGrid />} label="AI装机台" />
                        <TabButton active={viewMode === 'trends'} onClick={() => setViewMode('trends')} icon={<TrendingUp />} label="行情分析" />
                        <TabButton active={viewMode === 'square'} onClick={() => setViewMode('square')} icon={<Share2 />} label="配置广场" />
                        <TabButton active={viewMode === 'gamefps'} onClick={() => setViewMode('gamefps')} icon={<Gamepad2 />} label="游戏FPS" />
                        <TabButton active={viewMode === 'used'} onClick={() => setViewMode('used')} icon={<ShoppingBag />} label="二手闲置" />
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Theme Toggle */}
                        <button
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            className="flex items-center justify-center w-10 h-10 rounded-xl bg-white dark:bg-[#1A1A24] border border-slate-200 dark:border-[#2D3748] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#2D3748] transition-colors"
                            title="切换深浅色主题"
                        >
                            {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                        </button>
                        
                        {currentUser ? (
                            <div className={`flex items-center gap-2 border p-1 rounded-2xl shadow-sm transition-all cursor-pointer hover:shadow-md active:scale-95 duration-300 ${['admin', 'streamer', 'sub_admin'].includes(currentUser.role) || (currentUser.vipExpireAt && currentUser.vipExpireAt > Date.now())
                                ? 'bg-slate-900 dark:bg-[#1A1A24] border-amber-500/40 dark:border-amber-500/20'
                                : 'bg-white dark:bg-[#1A1A24] border-slate-200 dark:border-[#2D3748]'
                                } `}
                                onClick={() => setShowUserCenter(true)}
                            >
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm ${['admin', 'streamer', 'sub_admin'].includes(currentUser.role) || (currentUser.vipExpireAt && currentUser.vipExpireAt > Date.now())
                                    ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-black'
                                    : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
                                    } `}>
                                    {currentUser.username ? currentUser.username[0].toUpperCase() : '?'}
                                </div>
                                <div className="hidden sm:flex flex-col pr-2">
                                    <span className={`text-xs font-bold truncate max-w-[60px] ${['admin', 'streamer', 'sub_admin'].includes(currentUser.role) || (currentUser.vipExpireAt && currentUser.vipExpireAt > Date.now())
                                        ? 'text-amber-100'
                                        : 'text-slate-700'
                                        } `}>{currentUser.username}</span>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowLoginModal(true)}
                                className="flex items-center justify-center w-10 h-10 rounded-xl bg-white dark:bg-[#1A1A24] border border-slate-200 dark:border-[#2D3748] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#2D3748] transition-colors"
                            >
                                <User size={20} />
                            </button>
                        )}

                        <button
                            className="hidden md:flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 dark:bg-[#1A1A24] border border-transparent dark:border-[#2D3748] text-white dark:text-slate-300 shadow-sm dark:shadow-none active:scale-90 transition-all tap-active"
                            onClick={() => setShowMobileMenu(!showMobileMenu)}
                        >
                            {showMobileMenu ? <X size={20} /> : <Menu size={20} />}
                        </button>
                    </div>
                </div>
            </header>

            {/* Mobile Slide-Up More Menu */}
            {showMobileMenu && (
                <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in flex flex-col justify-end" onClick={() => setShowMobileMenu(false)}>
                    <div
                        className="bg-white dark:bg-[#121218] border-t border-x border-slate-200 dark:border-[#1E293B] shadow-lg dark:shadow-none rounded-t-[24px] animate-in slide-in-from-bottom duration-300 pb-safe pb-24"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="w-12 h-1.5 bg-slate-200 dark:bg-[#2D3748] rounded-full mx-auto my-3" />
                        <div className="px-5 pb-5 pt-2 max-h-[70vh] overflow-y-auto space-y-2">
                            {/* Login Banner for Mobile Menu */}
                            {!currentUser && (
                                <button
                                    onClick={() => {
                                        setShowLoginModal(true);
                                        setShowMobileMenu(false);
                                    }}
                                    className="w-full flex items-center gap-4 p-4 rounded-xl mb-4 bg-slate-900 dark:bg-indigo-600/20 text-white shadow-md shadow-slate-200/50 dark:shadow-none border border-transparent dark:border-indigo-500/30 group active:scale-[0.98] transition-all"
                                >
                                    <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center border border-white/10 group-hover:bg-white/20 transition-colors">
                                        <User size={28} className="text-white/90" />
                                    </div>
                                    <div className="text-left flex-1">
                                        <div className="font-bold text-xl tracking-tight">点击登录/注册</div>
                                        <div className="text-[11px] text-slate-400 mt-0.5">同步您的配置方案与收藏</div>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                                        <ArrowRight size={18} className="text-slate-400" />
                                    </div>
                                </button>
                            )}

                            {/* Unified Mobile Menu Items */}
                            <div className="space-y-3">
                                {[
                                    {
                                        id: 'ai',
                                        icon: Sparkles,
                                        label: 'AI 智能装机',
                                        desc: '智能算法推荐最佳配置方案',
                                        onClick: () => {
                                            if (!handleAiPermission()) return;
                                            setViewMode('visual');
                                            setTriggerAiModal(true);
                                            setShowMobileMenu(false);
                                        },
                                        customBg: 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-100/50 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-400',
                                        iconBg: 'bg-white dark:bg-slate-800',
                                        iconColor: 'text-indigo-600 dark:text-indigo-400',
                                        chevronBg: 'bg-indigo-100/30 dark:bg-indigo-500/20 text-indigo-400 dark:text-indigo-500'
                                    },
                                    {
                                        id: 'library',
                                        icon: BookOpen,
                                        label: '快速载入配置',
                                        desc: '立即载入已保存或推荐方案',
                                        onClick: () => {
                                            setShowLibraryModal(true);
                                            setShowMobileMenu(false);
                                        },
                                        customBg: 'bg-slate-50 dark:bg-slate-800/50 border-slate-200/50 dark:border-slate-700/50 text-slate-700 dark:text-slate-300',
                                        iconBg: 'bg-white dark:bg-slate-800',
                                        iconColor: 'text-slate-900 dark:text-slate-200',
                                        chevronBg: 'bg-slate-200/50 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500'
                                    },
                                    {
                                        id: 'streamer',
                                        icon: Zap,
                                        label: '主播工作台',
                                        desc: '大屏模式推流工具',
                                        onClick: () => {
                                            if (!hasStreamerPermission) {
                                                showToast("🔒 此功能仅限合作主播与管理员使用");
                                                return;
                                            }
                                            setViewMode('streamer');
                                            setShowMobileMenu(false);
                                        },
                                        customBg: 'bg-amber-50 dark:bg-amber-500/10 border-amber-100/50 dark:border-amber-500/20 text-amber-700 dark:text-amber-400',
                                        iconBg: 'bg-white dark:bg-slate-800',
                                        iconColor: 'text-amber-500',
                                        chevronBg: 'bg-amber-100/30 dark:bg-amber-500/20 text-amber-400'
                                    }
                                ].map((item) => {
                                    const Icon = item.icon;
                                    const isActive = viewMode === item.id;
                                    const clickHandler = item.onClick || (() => {
                                        setViewMode(item.id as any);
                                        setShowMobileMenu(false);
                                    });

                                    return (
                                        <button
                                            key={item.id}
                                            onClick={clickHandler}
                                            className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 border ${isActive
                                                ? 'bg-gradient-to-r from-slate-900 to-slate-800 dark:from-indigo-600/20 dark:to-indigo-500/10 text-white dark:text-indigo-400 border-slate-800 dark:border-indigo-500/30 shadow-lg shadow-slate-200 dark:shadow-none active:scale-[0.98]'
                                                : item.customBg || 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-100 dark:border-slate-700 active:scale-[0.99]'
                                                }`}
                                        >
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isActive
                                                ? 'bg-white/10 dark:bg-indigo-500/20 text-white dark:text-indigo-400'
                                                : item.iconBg || 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                                                }`}>
                                                <Icon size={20} className={!isActive ? item.iconColor : ''} />
                                            </div>
                                            <div className="text-left flex-1">
                                                <div className="font-bold text-sm tracking-tight">{item.label}</div>
                                                <div className={`text-[10px] ${isActive ? 'text-slate-400 dark:text-indigo-400/70' : 'text-slate-400 dark:text-slate-500'}`}>{item.desc}</div>
                                            </div>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors tap-active ${isActive
                                                ? 'bg-white/10 dark:bg-indigo-500/20 text-white dark:text-indigo-400'
                                                : item.chevronBg || 'bg-slate-100/50 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500'
                                                }`}>
                                                <ChevronRight size={16} />
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Application Mobile Bottom Tab Bar */}
            <nav className={`md:hidden fixed bottom-0 left-0 right-0 z-[45] bg-white/95 dark:bg-[#121218]/95 backdrop-blur-xl border-t border-slate-200 dark:border-[#1E293B] pb-safe pt-1 shadow-[0_-8px_30px_rgba(0,0,0,0.04)] dark:shadow-none transition-all duration-300 ${isScrolling && viewMode === 'visual' ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}>
                <div className="flex justify-around items-center h-[56px] px-2 relative">
                    {[
                        { id: 'visual', icon: LayoutGrid, label: '装机' },
                        { id: 'square', icon: Share2, label: '广场' },
                        { id: 'used', icon: ShoppingBag, label: '二手' },
                        { id: 'gamefps', icon: Gamepad2, label: '游戏FPS' },
                        { id: 'more', icon: Menu, label: '更多' },
                    ].map((tab) => {
                        const Icon = tab.icon;
                        const isMore = tab.id === 'more';
                        const isActive = isMore ? showMobileMenu : viewMode === tab.id && !showMobileMenu;
                        
                        return (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    if (isMore) {
                                        setShowMobileMenu(!showMobileMenu);
                                    } else {
                                        setShowMobileMenu(false);
                                        setViewMode(tab.id as any);
                                    }
                                }}
                                className="relative flex-1 flex flex-col items-center justify-center h-full gap-1 active:scale-95 transition-transform tap-active"
                            >
                                <div className={`relative flex items-center justify-center transition-all duration-300 ${isActive ? 'text-indigo-600 scale-110' : 'text-slate-400 hover:text-slate-600'}`}>
                                    <Icon size={isActive ? 20 : 22} strokeWidth={isActive ? 2.5 : 2} />
                                    {isActive && (
                                        <div className="absolute -inset-2 bg-indigo-50 rounded-full -z-10 animate-fade-in shrink-0 pointer-events-none fade-out-after" />
                                    )}
                                </div>
                                <span className={`text-[10px] sm:text-xs font-semibold tracking-wide transition-colors duration-300 ${isActive ? 'text-indigo-600' : 'text-slate-500'}`}>
                                    {tab.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </nav>

            {/* Main Content Area with fluid animation */}
            <AnimatePresence mode="wait">
                <motion.main 
                    key={viewMode}
                    initial={{ opacity: 0, y: 15, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -15, filter: 'blur(4px)' }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="flex-1 min-h-0 w-full max-w-7xl mx-auto overflow-hidden pb-[calc(56px+env(safe-area-inset-bottom)+10px)] md:pb-0"
                >
                    <div className="h-full overflow-y-auto custom-scrollbar pb-0" id="main-scroll-container" onScroll={handleScroll}>
                    <Suspense fallback={<div className="flex items-center justify-center h-64"><RefreshCw size={24} className="animate-spin text-indigo-500" /></div>}>
                    {viewMode === 'streamer' && (
                        <StreamerWorkbench
                            buildList={buildList}
                            onUpdate={updateEntry}
                            pricing={pricing}
                            discountRate={discountRate}
                            setDiscountRate={setDiscountRate}
                            isSharing={isSharing}
                            handleShareTrigger={handleShareTrigger}
                            handleSave={handleSave}
                            clearBuild={clearStreamerBuild}
                            hasPermission={true}
                            liveMeta={liveMeta}
                            onLiveMetaChange={setLiveMeta}
                            currentUser={currentUser}
                            showToast={showToast}
                            onAiCheck={handleAiPermission}
                            onOpenLibrary={() => setShowLibraryModal(true)}
                        />
                    )}



                    {viewMode === 'visual' && (
                        <VisualBuilder
                            buildList={buildList}
                            onUpdate={(id, data) => setBuildList(prev => prev.map(e => e.id === id ? { ...e, ...data } : e))}
                            health={healthCheck}
                            onOpenLibrary={() => setShowLibraryModal(true)}
                            pricing={pricing}
                            onAiCheck={handleAiPermission}
                            openAiModal={triggerAiModal}
                            onAiModalClose={() => setTriggerAiModal(false)}
                            onSave={handleSave}
                            onShare={handleShareTrigger}
                            onReset={() => {
                                setBuildList(prev => prev.map(i => ({ ...i, item: null, quantity: 1 })));
                            }}
                        />
                    )}

                    {viewMode === 'square' && (
                        <ConfigSquare
                            settings={settings}
                            onLoadConfig={handleFork}
                            showToast={showToast}
                            onToggleLike={handleToggleLike}
                            currentUser={currentUser}
                        />
                    )}

                    {viewMode === 'used' && (
                        <UsedMarket
                            currentUser={currentUser}
                            onLogin={() => setShowLoginModal(true)}
                            onViewDetail={setSelectedUsedItem}
                            onSell={() => setShowSellModal(true)}
                            onRecycle={() => setShowRecycleModal(true)}
                        />
                    )}

                    {viewMode === 'gamefps' && <GameFPSViewer />}
                    {viewMode === 'about' && <AboutUs />}
                    {viewMode === 'trends' && <StreamerPriceTrend />}
                    </Suspense>
                </div>
                </motion.main>
            </AnimatePresence>

            {showPaymentModal && currentUser && (
                <Suspense fallback={null}>
                <PaymentModal
                    user={currentUser}
                    onClose={() => setShowPaymentModal(false)}
                    onSuccess={() => {
                        setShowPaymentModal(false);
                        window.dispatchEvent(new Event('xiaoyu-login')); // Refresh user
                        alert("🎉 尊贵的 SVIP 会员，欢迎加入！您的 AI 架构师特权已即时生效。");
                    }}
                    onGoToInvite={() => setShowUserCenter(true)}
                />
                </Suspense>
            )}
            {showShareModal && (
                <ShareFormModal
                    onClose={() => setShowShareModal(false)}
                    onPublish={handlePublishToSquare}
                />
            )}
            {showSaveModal && (
                <SavePreviewModal
                    buildList={buildList}
                    pricing={pricing}
                    onClose={() => setShowSaveModal(false)}
                    onSave={() => {
                        // Quick save logic - Save as DRAFT (private)
                        handlePublishToSquare({
                            title: `我的装机单 ${new Date().toLocaleDateString()} `,
                            tags: ['我的收藏'],
                            desc: '从保存预览快速保存',
                            status: 'draft'
                        });
                        setShowSaveModal(false);
                    }}
                    onCopy={(text) => {
                        const textArea = document.createElement("textarea");
                        textArea.value = text;
                        textArea.style.position = "fixed";
                        textArea.style.left = "-9999px";
                        textArea.style.top = "0";
                        document.body.appendChild(textArea);
                        textArea.focus();
                        textArea.select();

                        try {
                            const successful = document.execCommand('copy');
                            if (successful) {
                                showToast("✅ 配置单已复制到剪贴板");
                                setShowSaveModal(false);
                            } else {
                                showToast("❌ 复制失败，请手动选择文本");
                            }
                        } catch (err) {
                            console.error('Copy failed:', err);
                            showToast("❌ 复制失败，请手动选择文本");
                        }
                        document.body.removeChild(textArea);
                    }}
                />
            )}
            {showUserCenter && currentUser && (
                <Suspense fallback={null}>
                <UserCenterModal
                    user={currentUser}
                    onClose={() => setShowUserCenter(false)}
                    onLogout={handleLogout}
                    onLoadConfig={handleFork}
                    showToast={showToast}
                    onToggleLike={handleToggleLike}
                />
                </Suspense>
            )}
            {showLibraryModal && (
                <ConfigLibraryModal
                    configList={configList}
                    products={allProducts}
                    onClose={() => setShowLibraryModal(false)}
                    onSelectConfig={handleFork}
                />
            )}
            {showLoginModal && (
                <LoginModal
                    onClose={() => { setShowLoginModal(false); setUrlInviteCode(''); }}
                    onLoginSuccess={handleLoginSuccess}
                    initialInviteCode={urlInviteCode}
                />
            )}



            {/* Used Market Modals */}
            {showSellModal && currentUser && (
                <Suspense fallback={null}>
                <SellModal
                    onClose={() => setShowSellModal(false)}
                    onSuccess={() => {
                        // Trigger refresh if needed, usually handled by storage event
                    }}
                    currentUser={currentUser}
                    showToast={showToast}
                />
                </Suspense>
            )}

            {showRecycleModal && currentUser && (
                <Suspense fallback={null}>
                <RecycleEstimator
                    onClose={() => setShowRecycleModal(false)}
                    onSuccess={() => { }}
                    currentUser={currentUser}
                    showToast={showToast}
                />
                </Suspense>
            )}

            {selectedUsedItem && (
                <Suspense fallback={null}>
                <UsedItemDetail
                    item={selectedUsedItem}
                    onClose={() => setSelectedUsedItem(null)}
                    currentUser={currentUser}
                    onLogin={() => setShowLoginModal(true)}
                    onConsultPurchase={(item) => {
                        // Close the detail modal
                        setSelectedUsedItem(null);
                        // Set initial message with item info
                        const message = `您好，我想咨询购买这个商品：\n📦 ${item.brand} ${item.model}\n💰 ¥${item.price}\n📋 成色: ${item.condition}\n\n请问现在还有货吗？`;
                        setChatInitialMessage(message);
                        // Open chat
                        setIsChatOpen(true);
                    }}
                />
                </Suspense>
            )}

            {toast.show && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] animate-bounce">
                    <div className="bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg shadow-slate-900/20 flex items-center gap-2 border border-slate-800/50 backdrop-blur-lg">
                        <span>{toast.msg}</span>
                    </div>
                </div>
            )}

            {viewMode === 'visual' && (
                <footer className={`fixed left-0 right-0 z-40 bg-white/95 dark:bg-[#121218]/95 backdrop-blur-xl border-t border-slate-200 dark:border-[#1E293B] shadow-[0_-10px_40px_rgba(0,0,0,0.05)] dark:shadow-none transition-all duration-300 ${isScrolling ? 'bottom-0 pb-safe md:bottom-0 md:pb-0' : 'bottom-[60px] pb-0 md:bottom-0 md:pb-0'}`}>
                    <div className="max-w-7xl mx-auto px-3 md:px-4">
                        {/* Mobile: Two-row layout */}
                        <div className="flex md:hidden flex-col gap-1 py-2">
                            {/* Row 1: Price info */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2" onClick={() => setShowDiscountSheet(true)}>
                                    <div className="flex items-baseline gap-0.5">
                                        <span className="text-sm font-bold text-slate-900">¥</span>
                                        <span className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-indigo-600 font-mono">{pricing.finalPrice}</span>
                                        <ChevronDown size={14} className="text-slate-400 ml-0.5 translate-y-0.5" />
                                    </div>
                                    <span className="bg-emerald-100 text-emerald-700 text-[9px] px-1.5 py-0.5 rounded-full font-bold">省¥{pricing.savedAmount}</span>
                                </div>
                                <span className="text-[8px] font-bold text-slate-400 whitespace-nowrap">
                                    含 {(settings.serviceFeeRate * 100).toFixed(0)}% 装机服务费
                                </span>
                            </div>
                            {/* Row 2: Action buttons */}
                            <div className="flex items-center gap-2">
                                <button onClick={clearBuild} className="flex items-center justify-center w-9 h-9 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                                    <Trash2 size={16} />
                                </button>
                                <button onClick={handleSave} className="flex items-center justify-center w-9 h-9 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg shadow-sm transition-all">
                                    <Save size={16} />
                                </button>
                                <button onClick={handleShareTrigger} disabled={isSharing} className="flex-1 flex items-center justify-center gap-1.5 h-9 bg-slate-900 hover:bg-black disabled:bg-slate-700 text-white text-xs font-bold rounded-lg shadow-md transition-all">
                                    {isSharing ? <RefreshCw size={14} className="animate-spin" /> : <Share2 size={14} />}<span>{isSharing ? '分享中...' : '✦ 分享配置'}</span>
                                </button>
                            </div>
                        </div>

                        {/* Desktop: Single-row layout */}
                        <div className="hidden md:flex h-12 items-center justify-between gap-2">
                            {/* Price Info */}
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] text-slate-400 line-through">¥{Math.floor(pricing.standardPrice)}</span>
                                    <span className="bg-emerald-50 text-emerald-700 text-[9px] px-1.5 py-0.5 rounded-md border border-emerald-100 font-bold">省¥{pricing.savedAmount}</span>
                                </div>
                                <div className="flex items-baseline gap-0.5">
                                    <span className="text-base font-bold text-slate-900">¥</span>
                                    <span className="text-[22px] font-extrabold text-slate-900 font-mono tracking-tight">{pricing.finalPrice}</span>
                                </div>
                                {/* Discount selector */}
                                <div className="relative group">
                                    <select value={discountRate} onChange={(e) => setDiscountRate(parseFloat(e.target.value))} className="appearance-none bg-slate-50 border border-slate-200 hover:border-indigo-300 text-slate-700 text-[10px] font-bold py-1 pl-2 pr-6 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer">
                                        {settings.discountTiers.map(opt => (
                                            <option key={opt.id} value={opt.multiplier}>
                                                {opt.name.replace(/\s*\(.*?\)/g, '')}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                                <span className="text-[9px] font-medium text-slate-400 bg-slate-50/80 px-2.5 py-0.5 rounded-md border border-slate-100 whitespace-nowrap">
                                    标准价格含 {(settings.serviceFeeRate * 100).toFixed(0)}% 装机售后服务费
                                </span>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2">
                                <button onClick={clearBuild} className="flex items-center gap-1 px-2.5 py-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all text-xs font-bold">
                                    <Trash2 size={14} /><span>清空</span>
                                </button>
                                <button onClick={handleSave} className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-md shadow-sm transition-all">
                                    <Save size={14} /><span>保存</span>
                                </button>
                                <button onClick={handleShareTrigger} disabled={isSharing} className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-black disabled:bg-slate-700 text-white text-xs font-bold rounded-md shadow-sm transition-all min-w-[94px] justify-center">
                                    {isSharing ? <RefreshCw size={14} className="animate-spin" /> : <Share2 size={14} />}<span>{isSharing ? '...' : '分享'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </footer>
            )}



            {/* Discount Action Sheet (Mobile) */}
            {/* Backdrop */}
            {showDiscountSheet && (
                <div
                    className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm md:hidden animate-fade-in"
                    onClick={() => setShowDiscountSheet(false)}
                />
            )}

            {/* Sheet */}
            <div className={`fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-xl p-5 border-t border-slate-200 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] transition-transform duration-300 ease-out transform ${showDiscountSheet ? 'translate-y-0 pointer-events-auto' : 'translate-y-full pointer-events-none'} md:hidden`}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-900">选择优惠方案</h3>
                    <button onClick={() => setShowDiscountSheet(false)} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:text-slate-800">
                        <X size={20} />
                    </button>
                </div>
                <div className="space-y-3">
                    {settings.discountTiers.map(tier => (
                        <div
                            key={tier.id}
                            onClick={() => {
                                setDiscountRate(tier.multiplier);
                                setShowDiscountSheet(false);
                            }}
                            className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all active:scale-[0.98] ${discountRate === tier.multiplier ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-100 bg-white'} `}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${discountRate === tier.multiplier ? 'border-indigo-600' : 'border-slate-300'} `}>
                                    {discountRate === tier.multiplier && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />}
                                </div>
                                <div className="flex flex-col">
                                    <span className={`text-sm font-bold ${discountRate === tier.multiplier ? 'text-indigo-900' : 'text-slate-700'} `}>{tier.name}</span>
                                    <span className="text-xs text-slate-400">{(tier.multiplier * 100).toFixed(0)}% 折扣</span>
                                </div>
                            </div>
                            {discountRate === tier.multiplier && <Check size={18} className="text-indigo-600" />}
                        </div>
                    ))}
                </div>
            </div>

            {/* Global Chat Widget */}
            <ChatWidget
                isOpen={isChatOpen}
                onToggle={setIsChatOpen}
                initialMessage={chatInitialMessage}
                onInitialMessageSent={() => setChatInitialMessage('')}
            />
            <DailyPopup />

            {/* Footer - About Us link */}
            {viewMode !== 'streamer' && (
                <div className="hidden md:flex items-center justify-center py-3 border-t border-slate-200 dark:border-[#1E293B] bg-white/50 dark:bg-[#0B0B10]/50 backdrop-blur-sm">
                    <button
                        onClick={() => setViewMode('about')}
                        className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400 transition-colors"
                    >
                        <Info size={12} />
                        <span>关于我们 · DIYXX 小鱼装机</span>
                    </button>
                </div>
            )}
        </div>
    );
}
