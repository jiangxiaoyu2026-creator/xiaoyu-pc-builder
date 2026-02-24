import { useState, useMemo, useEffect } from 'react';
import { Share2, User, Save, Menu, X, Monitor, Zap, LayoutGrid, ShoppingBag, Info, Trash2, ArrowRight, ChevronDown, Check, Sparkles, BookOpen, RefreshCw, ChevronRight } from 'lucide-react';
import { BuildEntry, ConfigTemplate, Category, UserItem } from '../types/clientTypes';
import { DEFAULT_BUILD_TEMPLATE, HARDWARE_DB } from '../data/clientData';
import { storage } from '../services/storage';
import LoginModal from '../components/common/LoginModal';
import { TabButton } from '../components/client/Shared';
import StreamerWorkbench from '../components/client/StreamerWorkbench';
import VisualBuilder from '../components/client/VisualBuilder';
import ConfigSquare from '../components/client/ConfigSquare';
import AboutUs from '../components/client/AboutUs';
import ChatWidget from '../components/common/ChatWidget';
import { ShareFormModal, SavePreviewModal, ConfigLibraryModal } from '../components/client/Modals';
import { UserCenterModal } from '../components/client/UserCenterModal';


import { PaymentModal } from '../components/client/UiComponents/PaymentModal';
import UsedMarket from '../components/client/UsedMarket';
import SellModal from '../components/client/SellModal';
import RecycleModal from '../components/client/RecycleModal';
import UsedItemDetail from '../components/client/UsedItemDetail';
import { UsedItem } from '../types/adminTypes';
import DailyPopup from '../components/client/DailyPopup';
import ArticleList from '../components/client/ArticleList';

// ...

export default function ClientApp() {
    const [viewMode, setViewMode] = useState<'visual' | 'streamer' | 'square' | 'used' | 'about' | 'headlines'>(() => {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');
        if (tab === 'headlines') return 'headlines';
        return 'visual';
    });
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

    // Check permission for Streamer Center
    const hasStreamerPermission = useMemo(() => {
        if (!currentUser) return false;
        return currentUser.role === 'streamer' || currentUser.role === 'admin';
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
                        updatedUser.vipExpireAt !== activeUser.vipExpireAt;

                    if (needsUpdate) {
                        activeUser = { ...activeUser, role: updatedUser.role, vipExpireAt: updatedUser.vipExpireAt };
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
                if (c.authorRole === 'streamer') type = 'streamer';
                else if (c.authorRole && ['admin', 'sub_admin'].includes(c.authorRole)) type = 'official';
                else if (authorName.includes('官方') || authorName.toLowerCase().includes('admin')) type = 'official';
                else if (authorName.includes('主播') || (c.title && c.title.includes('主播'))) type = 'streamer';

                if (Array.isArray(c.tags) && c.tags.some((t: any) => (typeof t === 'string' ? t : t.label) === '求助')) type = 'help';
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
                    tags: Array.isArray(c.tags) ? c.tags.map((t: any) =>
                        typeof t === 'string' ? { type: 'usage' as const, label: t } : t
                    ) : [],
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
    const [remark, setRemark] = useState(() => {
        return localStorage.getItem('xiaoyu_remark') || '';
    });

    useEffect(() => {
        localStorage.setItem('xiaoyu_remark', remark);
    }, [remark]);


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
            discountRate,
            onDiscountChange: setDiscountRate
        };
    }, [buildList, discountRate, settings]);

    const healthCheck = useMemo(() => {
        const issues: string[] = [];
        const cpu = buildList.find(e => e.category === 'cpu')?.item;
        const mb = buildList.find(e => e.category === 'mainboard')?.item;
        const ram = buildList.find(e => e.category === 'ram')?.item;
        const psu = buildList.find(e => e.category === 'power')?.item;
        const gpu = buildList.find(e => e.category === 'gpu')?.item;

        if (cpu && mb && cpu.specs.socket !== mb.specs.socket) {
            issues.push(`接口不兼容: CPU是 ${cpu.specs.socket}，主板是 ${mb.specs.socket} `);
        }
        if (ram && mb && ram.specs.memoryType !== mb.specs.memoryType) {
            issues.push(`内存不兼容: 内存是 ${ram.specs.memoryType}，主板仅支持 ${mb.specs.memoryType} `);
        }
        if (psu && psu.specs.wattage) {
            const estimatedLoad = (cpu?.specs.wattage || 0) + (gpu?.specs.wattage || 0) + 150;
            if (psu.specs.wattage < estimatedLoad) {
                issues.push(`电源功率可能不足: 预估功耗 ${estimatedLoad} W，当前电源 ${psu.specs.wattage} W`);
            }
        }
        return { status: issues.length === 0 ? 'perfect' : 'warning', issues };
    }, [buildList]);

    const clearBuild = () => {
        setBuildList(DEFAULT_BUILD_TEMPLATE.map(i => ({ ...i, item: null, customPrice: undefined, customName: undefined })));
        setRemark('');
    };

    const updateEntry = (id: string, updates: Partial<BuildEntry>) => setBuildList(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));



    const showToast = (msg: string) => {
        setToast({ show: true, msg });
        setTimeout(() => setToast({ show: false, msg: '' }), 3000);
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
            const productIds = Object.values(config.items).filter(id => id && typeof id === 'string') as string[];

            // Fetch specific products by IDs from server
            const productsList = await storage.getProductsByIds(productIds);

            const newList = DEFAULT_BUILD_TEMPLATE.map(entry => {
                // @ts-ignore
                const itemId = config.items?.[entry.category] || config.items?.[entry.id]; // Try both
                if (itemId) {
                    // Find in fetched products OR fallback to HARDWARE_DB
                    const adminItem = productsList.find((h: any) => h.id === itemId) || HARDWARE_DB.find(h => h.id === itemId);
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
                    return { ...entry, item: clientItem || null, customPrice: undefined, quantity: 1 };
                }
                return { ...entry, item: null, quantity: 1 };
            });
            setBuildList(newList);
            setViewMode('visual');
            setShowLibraryModal(false);
            showToast(`✅ 已载入配置：${config.title} `);
        } catch (err) {
            console.error("Failed to load config:", err);
            showToast("❌ 载入配置失败，请稍后重试");
        }
    };

    const handlePublishToSquare = async (data: { title: string, tags: string[], desc: string, status?: 'published' | 'draft' }) => {
        try {
            const saveStatus = data.status || 'published';
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
                items: buildList.reduce((acc, curr) => {
                    if (curr.item) {
                        acc[curr.category] = curr.item.id;
                    }
                    return acc;
                }, {} as Record<Category, string>),
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
                description: data.desc // Save description
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
                else if (['admin', 'sub_admin'].includes(c.authorRole)) type = 'official';
                else if (authorName.includes('官方')) type = 'official';
                else if (authorName.includes('主播')) type = 'streamer';

                if (c.tags?.includes('求助')) type = 'help';

                return {
                    id: c.id,
                    title: c.title,
                    author: authorName,
                    avatarColor: 'bg-zinc-500',
                    type: type,
                    tags: (c.tags || []).map((t: string) => ({ type: 'usage' as const, label: t })),
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
                    showToast(saveStatus === 'draft' ? `✅ 已保存到个人中心！` : `✅ 已发布并保存到个人中心！`);
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
        <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-100 selection:text-indigo-700 text-slate-800">
            <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-100 shadow-sm transition-all duration-300">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg shadow-slate-200">
                            <Monitor className="text-white" size={20} />
                        </div>
                        <span className="text-xl font-extrabold text-slate-900 tracking-tight">蒋小鱼装机平台</span>
                    </div>
                    {/* Navigation Tabs - Hidden on mobile, visible on tablet/desktop */}
                    <div className="hidden md:flex bg-slate-50/90 p-2 rounded-2xl border border-slate-200/80 backdrop-blur-xl shadow-inner overflow-x-auto no-scrollbar max-w-none gap-1">
                        <TabButton
                            active={viewMode === 'streamer'}
                            onClick={() => {
                                setViewMode('streamer');
                            }}
                            icon={<Zap size={16} />}
                            label="主播中心"
                        />
                        <TabButton active={viewMode === 'visual'} onClick={() => setViewMode('visual')} icon={<LayoutGrid size={16} />} label="AI装机台" />
                        <TabButton active={viewMode === 'square'} onClick={() => setViewMode('square')} icon={<Share2 size={16} />} label="配置广场" />
                        <TabButton active={viewMode === 'headlines'} onClick={() => setViewMode('headlines')} icon={<BookOpen size={16} />} label="装机头条" />
                        <TabButton active={viewMode === 'used'} onClick={() => setViewMode('used')} icon={<ShoppingBag size={16} />} label="二手闲置" />
                        <TabButton active={viewMode === 'about'} onClick={() => setViewMode('about')} icon={<Info size={16} />} label="关于我们" />
                    </div>

                    <div className="flex items-center gap-2">
                        {currentUser ? (
                            <div className={`flex items-center gap-2 border p-1 rounded-2xl shadow-sm transition-all cursor-pointer hover:shadow-md active:scale-95 duration-300 ${['admin', 'streamer', 'sub_admin'].includes(currentUser.role) || (currentUser.vipExpireAt && currentUser.vipExpireAt > Date.now())
                                ? 'bg-slate-900 border-amber-500/40'
                                : 'bg-white border-slate-200'
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
                                className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200 transition-colors"
                            >
                                <User size={20} />
                            </button>
                        )}

                        <button
                            className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 text-white shadow-lg shadow-slate-200 active:scale-90 transition-all tap-active"
                            onClick={() => setShowMobileMenu(!showMobileMenu)}
                        >
                            {showMobileMenu ? <X size={20} /> : <Menu size={20} />}
                        </button>
                    </div>
                </div>
            </header>

            {/* Mobile Slide-Down Menu */}
            {showMobileMenu && (
                <div className="md:hidden fixed inset-0 top-16 z-30 bg-black/50 backdrop-blur-sm" onClick={() => setShowMobileMenu(false)}>
                    <div
                        className="bg-white border-b border-slate-200 shadow-xl animate-in slide-in-from-top duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-4 space-y-2">
                            {/* Login Banner for Mobile Menu */}
                            {!currentUser && (
                                <button
                                    onClick={() => {
                                        setShowLoginModal(true);
                                        setShowMobileMenu(false);
                                    }}
                                    className="w-full flex items-center gap-5 p-5 rounded-[24px] mb-6 bg-slate-900 text-white shadow-2xl shadow-slate-200 group active:scale-[0.98] transition-all"
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
                                        customBg: 'bg-indigo-50 border-indigo-100/50 text-indigo-700',
                                        iconBg: 'bg-white',
                                        iconColor: 'text-indigo-600',
                                        chevronBg: 'bg-indigo-100/30'
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
                                        customBg: 'bg-slate-50 border-slate-200/50 text-slate-700',
                                        iconBg: 'bg-white',
                                        iconColor: 'text-slate-900',
                                        chevronBg: 'bg-slate-200/50'
                                    },
                                    { id: 'square' as const, icon: Share2, label: '配置广场', desc: '热门配置分享' },
                                    { id: 'used' as const, icon: ShoppingBag, label: '严选二手', desc: '性价比之选' },
                                    { id: 'about' as const, icon: Info, label: '关于我们', desc: '品牌故事' },
                                ].map((item) => {
                                    const Icon = item.icon;
                                    const isActive = viewMode === item.id;
                                    const clickHandler = 'onClick' in item ? item.onClick : () => {
                                        setViewMode(item.id as any);
                                        setShowMobileMenu(false);
                                    };

                                    return (
                                        <button
                                            key={item.id}
                                            onClick={clickHandler}
                                            className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 border ${isActive
                                                ? 'bg-gradient-to-r from-slate-900 to-slate-800 text-white border-slate-800 shadow-lg shadow-slate-200 active:scale-[0.98]'
                                                : item.customBg || 'bg-white hover:bg-slate-50 text-slate-700 border-slate-100 active:scale-[0.99]'
                                                }`}
                                        >
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isActive
                                                ? 'bg-white/10 text-white'
                                                : item.iconBg || 'bg-slate-100 text-slate-500'
                                                }`}>
                                                <Icon size={20} className={!isActive ? item.iconColor : ''} />
                                            </div>
                                            <div className="text-left flex-1">
                                                <div className="font-bold text-sm tracking-tight">{item.label}</div>
                                                <div className={`text-[10px] ${isActive ? 'text-slate-400' : 'text-slate-400'}`}>{item.desc}</div>
                                            </div>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors tap-active ${isActive
                                                ? 'bg-white/10 text-white'
                                                : item.chevronBg || 'bg-slate-100/50 text-slate-400'
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

            {/* Main Content Area with fluid animation */}
            <main className="flex-1 w-full max-w-7xl mx-auto overflow-hidden animate-in fade-in zoom-in-95 duration-300" key={viewMode}>
                <div className="h-full overflow-y-auto custom-scrollbar pb-0" id="main-scroll-container">
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
                            clearBuild={() => {
                                setBuildList(prev => prev.map(i => ({ ...i, item: null, quantity: 1 })));
                            }}
                            hasPermission={hasStreamerPermission}

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
                            remark={remark}
                            setRemark={setRemark}
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



                    {viewMode === 'headlines' && <ArticleList />}
                    {viewMode === 'about' && <AboutUs />}
                </div>
            </main>

            {showPaymentModal && currentUser && (
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
                <UserCenterModal
                    user={currentUser}
                    onClose={() => setShowUserCenter(false)}
                    onLogout={handleLogout}
                    onLoadConfig={handleFork}
                    showToast={showToast}
                    onToggleLike={handleToggleLike}
                />
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
                <SellModal
                    onClose={() => setShowSellModal(false)}
                    onSuccess={() => {
                        // Trigger refresh if needed, usually handled by storage event
                    }}
                    currentUser={currentUser}
                    showToast={showToast}
                />
            )}

            {showRecycleModal && currentUser && (
                <RecycleModal
                    onClose={() => setShowRecycleModal(false)}
                    onSuccess={() => { }}
                    currentUser={currentUser}
                    showToast={showToast}
                />
            )}

            {selectedUsedItem && (
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
            )}

            {toast.show && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] animate-bounce">
                    <div className="bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 border border-slate-800/50 backdrop-blur-lg">
                        <span>{toast.msg}</span>
                    </div>
                </div>
            )}

            {viewMode === 'visual' && (
                <footer className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                    <div className="max-w-7xl mx-auto px-3 md:px-4 h-14 flex items-center justify-between gap-2">
                        {/* Price Info */}
                        <div className="flex items-center gap-2 md:gap-4">
                            <div className="flex items-center gap-1.5 md:gap-2">
                                <span className="text-[10px] md:text-xs text-slate-400 line-through hidden md:inline">¥{Math.floor(pricing.standardPrice)}</span>
                                <span className="bg-emerald-100 text-emerald-700 text-[9px] md:text-[10px] px-1 md:px-1.5 py-0.5 rounded-full font-bold">省¥{pricing.savedAmount}</span>
                            </div>
                            <div className="flex items-baseline gap-0.5 relative cursor-pointer md:cursor-default active:opacity-70 transition-opacity" onClick={() => window.innerWidth < 768 && setShowDiscountSheet(true)}>
                                <span className="text-sm md:text-lg font-bold text-slate-900">¥</span>
                                <span className="text-lg md:text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-indigo-600 font-mono">{pricing.finalPrice}</span>
                                <ChevronDown size={14} className="md:hidden text-slate-400 ml-0.5 translate-y-0.5" />
                            </div>
                            {/* Discount selector - hidden on mobile */}
                            <div className="relative group hidden md:block">
                                <select value={discountRate} onChange={(e) => setDiscountRate(parseFloat(e.target.value))} className="appearance-none bg-slate-100 border border-slate-200 hover:border-indigo-300 text-slate-700 text-[10px] font-medium py-1 pl-2 pr-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer">
                                    {settings.discountTiers.map(opt => (
                                        <option key={opt.id} value={opt.multiplier}>
                                            {opt.name.replace(/\s*\(.*?\)/g, '')}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden lg:block">
                            <span className="text-[10px] font-medium text-slate-400 bg-slate-50/80 px-3 py-1 rounded-full border border-slate-100">
                                标准价格含 6% 装机售后服务费
                            </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1.5 md:gap-2">
                            <button onClick={clearBuild} className="flex items-center gap-1 px-2 md:px-3 py-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all text-xs font-bold">
                                <Trash2 size={14} /><span className="hidden md:inline">清空</span>
                            </button>
                            <button onClick={handleSave} className="flex items-center gap-1 px-2 md:px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg shadow-sm transition-all">
                                <Save size={14} /><span className="hidden md:inline">保存</span>
                            </button>
                            <button onClick={handleShareTrigger} disabled={isSharing} className="flex items-center gap-1 px-2.5 md:px-3 py-1.5 bg-slate-900 hover:bg-black disabled:bg-slate-700 text-white text-xs font-bold rounded-lg shadow-md transition-all min-w-[60px] md:min-w-[100px] justify-center">
                                {isSharing ? <RefreshCw size={14} className="animate-spin" /> : <Share2 size={14} />}<span>{isSharing ? '...' : '分享'}</span>
                            </button>
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
            <div className={`fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] transition-transform duration-300 ease-out transform ${showDiscountSheet ? 'translate-y-0' : 'translate-y-full'} md:hidden`}>
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
        </div>
    );
}
