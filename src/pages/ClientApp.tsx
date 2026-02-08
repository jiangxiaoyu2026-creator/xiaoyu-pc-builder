import { useState, useMemo, useEffect } from 'react';
import { Share2, User, Save, Menu, X, Monitor, Zap, LayoutGrid, ShoppingBag, Info, Trash2, ArrowRight, ChevronDown, Check, Sparkles, BookOpen, RefreshCw } from 'lucide-react';
import { BuildEntry, ConfigTemplate, Category, UserItem } from '../types/clientTypes';
import { DEFAULT_BUILD_TEMPLATE } from '../data/clientData';
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

// ...

export default function ClientApp() {
    const [viewMode, setViewMode] = useState<'visual' | 'streamer' | 'square' | 'used' | 'about'>('visual');
    const [buildList, setBuildList] = useState<BuildEntry[]>(() =>
        DEFAULT_BUILD_TEMPLATE.map(i => ({ ...i, item: null, customPrice: undefined, quantity: 1 }))
    );
    const [configList, setConfigList] = useState<ConfigTemplate[]>([]);
    const [currentUser, setCurrentUser] = useState<UserItem | null>(() => storage.getCurrentUser());
    const [settings, setSettings] = useState(storage.getSettings());
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

    const loadData = () => {
        setCurrentUser(storage.getCurrentUser());
        setSettings(storage.getSettings());

        // Load config list
        const configs = storage.getConfigs();
        const visibleConfigs = configs.filter(c => c.status === 'published');
        // Map admin configs to client template
        const mappedList: ConfigTemplate[] = visibleConfigs.map(c => {
            let type: 'official' | 'streamer' | 'user' | 'help' = 'user';
            if (c.authorName.includes('官方')) type = 'official';
            if (c.authorName.includes('主播')) type = 'streamer';
            if (c.tags.includes('求助')) type = 'help';
            return {
                id: c.id,
                userId: c.userId, // Pass userId
                title: c.title,
                author: c.authorName,
                avatarColor: 'bg-zinc-500',
                type: type,
                tags: c.tags.map(t => ({ type: 'usage' as const, label: t })),
                price: c.totalPrice,
                items: c.items,
                likes: c.likes,
                views: c.views,
                comments: 0,
                date: c.createdAt,
                isLiked: false, // Default
                serialNumber: c.serialNumber, // Use serial
                description: c.description
            };
        });
        setConfigList(mappedList);
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
        return { hardwareTotal, standardPrice, finalPrice, savedAmount };
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
    const handleToggleLike = (id: string) => {
        if (!currentUser) {
            showToast("请先登录后收藏");
            setShowLoginModal(true);
            return;
        }

        const target = configList.find(c => c.id === id);
        if (target) {
            const isLiked = storage.toggleUserLike(currentUser.id, id);

            // Update local state
            setConfigList(prev => prev.map(item => {
                if (item.id === id) {
                    return { ...item, likes: isLiked ? item.likes + 1 : item.likes - 1, isLiked };
                }
                return item;
            }));

            // Update admin config storage (count only)
            const allConfigs = storage.getConfigs();
            const adminConfig = allConfigs.find(c => c.id === id);
            if (adminConfig) {
                adminConfig.likes = isLiked ? adminConfig.likes + 1 : adminConfig.likes - 1;
                storage.saveConfig(adminConfig);
            }
        }
    };

    const handleFork = (config: ConfigTemplate) => {
        // ... implementation of handleFork
        const allProducts = storage.getProducts();
        const newList = DEFAULT_BUILD_TEMPLATE.map(entry => {
            // @ts-ignore
            const itemId = config.items?.[entry.category] || config.items?.[entry.id]; // Try both
            if (itemId) {
                // Find in storage
                const adminItem = allProducts.find(h => h.id === itemId);
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
    };

    const handlePublishToSquare = (data: { title: string, tags: string[], desc: string }) => {
        try {
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
                authorName: newTemplate.author,
                title: newTemplate.title,
                totalPrice: newTemplate.price,
                items: newTemplate.items,
                tags: data.tags,
                status: 'published',
                isRecommended: false,
                views: 0,
                likes: 0,
                createdAt: newTemplate.date,
                // serialNumber will be auto-generated by storage service
                description: data.desc // Save description
            };
            storage.saveConfig(adminConfig);

            // Reload data to reflect changes
            // Instead of complex mapping here, we can trigger the loadData effect
            // But to be sure, let's manually fetch fresh data like before to update the list immediately

            const freshConfigs = storage.getConfigs();
            const visibleConfigs = freshConfigs.filter(c => c.status === 'published');
            const newConfigList = visibleConfigs.map(c => {
                let type: 'official' | 'streamer' | 'user' | 'help' = 'user';
                if (c.authorName.includes('官方')) type = 'official';
                if (c.authorName.includes('主播')) type = 'streamer';
                if (c.tags.includes('求助')) type = 'help';

                return {
                    id: c.id,
                    title: c.title,
                    author: c.authorName,
                    avatarColor: 'bg-zinc-500',
                    type: type,
                    tags: c.tags.map(t => ({ type: 'usage' as const, label: t })),
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
            // showToast removed to avoid duplicate/conflicting messages


            if (viewMode === 'streamer') {
                showToast(`✅ 发布成功！已准备好下一单`);
            } else {
                // Determine toast message based on login status
                if (currentUser) {
                    showToast(`✅ 已保存到个人中心！`);
                } else {
                    showToast(`✅ 已发布并保存！`);
                }
                setViewMode('square');
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
                        <span className="text-xl font-extrabold text-slate-900 tracking-tight">小鱼装机 <span className="text-indigo-600 text-xs bg-indigo-50 px-1.5 py-0.5 rounded ml-1 align-middle border border-indigo-100">PRO</span></span>
                    </div>
                    {/* Navigation Tabs - Hidden on mobile, visible on tablet/desktop */}
                    <div className="hidden md:flex bg-slate-50/90 p-2 rounded-2xl border border-slate-200/80 backdrop-blur-xl shadow-inner overflow-x-auto no-scrollbar max-w-none gap-1">
                        <TabButton
                            active={viewMode === 'streamer'}
                            onClick={() => {
                                const user = storage.getCurrentUser();
                                if (!user || (user.role !== 'streamer' && user.role !== 'admin')) {
                                    alert('您当前无权访问主播工作台，请联系管理员开通主播权限');
                                    return;
                                }
                                setViewMode('streamer');
                            }}
                            icon={<Zap size={16} />}
                            label="主播工作台"
                        />
                        <TabButton active={viewMode === 'visual'} onClick={() => setViewMode('visual')} icon={<LayoutGrid size={16} />} label="AI装机台" />
                        <TabButton active={viewMode === 'square'} onClick={() => setViewMode('square')} icon={<Share2 size={16} />} label="配置广场" />
                        <TabButton active={viewMode === 'used'} onClick={() => setViewMode('used')} icon={<ShoppingBag size={16} />} label="二手闲置" />
                        <TabButton active={viewMode === 'about'} onClick={() => setViewMode('about')} icon={<Info size={16} />} label="关于我们" />
                    </div>

                    {/* Mobile Menu Button - Visible only on mobile */}
                    <button
                        className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200 transition-colors"
                        onClick={() => setShowMobileMenu(!showMobileMenu)}
                    >
                        {showMobileMenu ? <X size={20} /> : <Menu size={20} />}
                    </button>

                    <div className="flex items-center gap-3">
                        {currentUser ? (
                            <div className={`group relative flex items-center gap-3 border pl-1.5 pr-4 py-1.5 rounded-2xl shadow-lg transition-all cursor-pointer hover:shadow-xl hover:scale-105 duration-300 ${['admin', 'streamer', 'sub_admin'].includes(currentUser.role) || (currentUser.vipExpireAt && currentUser.vipExpireAt > Date.now())
                                ? 'bg-gradient-to-br from-black via-slate-900 to-black border-amber-500/60 shadow-amber-500/20'
                                : 'bg-white border-slate-300/80 hover:border-indigo-400'
                                } `}
                                onClick={() => setShowUserCenter(true)}
                            >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold border-2 shadow-md ${['admin', 'streamer', 'sub_admin'].includes(currentUser.role) || (currentUser.vipExpireAt && currentUser.vipExpireAt > Date.now())
                                    ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-black border-amber-300 shadow-amber-500/30'
                                    : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-indigo-300'
                                    } `}>
                                    {currentUser.username ? currentUser.username[0].toUpperCase() : '?'}
                                </div>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-1.5">
                                        <span className={`text-sm font-bold truncate max-w-[80px] ${['admin', 'streamer', 'sub_admin'].includes(currentUser.role) || (currentUser.vipExpireAt && currentUser.vipExpireAt > Date.now())
                                            ? 'text-amber-100'
                                            : 'text-slate-700'
                                            } `} title={currentUser.username}>{currentUser.username}</span>
                                        {(['admin', 'streamer', 'sub_admin'].includes(currentUser.role) || (currentUser.vipExpireAt && currentUser.vipExpireAt > Date.now())) ? (
                                            <img src="https://api.iconify.design/noto:crown.svg" className="w-4 h-4 drop-shadow-[0_0_8px_rgba(245,158,11,0.9)]" alt="VIP" />
                                        ) : null}
                                    </div>
                                    {(['admin', 'streamer', 'sub_admin'].includes(currentUser.role) || (currentUser.vipExpireAt && currentUser.vipExpireAt > Date.now())) ? (
                                        <span className="text-[10px] font-black text-black bg-gradient-to-r from-amber-300 to-amber-500 px-2 py-0.5 rounded-full w-fit shadow-sm">
                                            SVIP
                                        </span>
                                    ) : (
                                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full w-fit group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                            个人中心
                                        </span>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowLoginModal(true)}
                                className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-bold text-sm transition-colors bg-white border border-slate-200 p-2 md:px-4 md:py-2 rounded-xl md:rounded-full shadow-sm hover:shadow-md"
                            >
                                <User size={20} className="md:w-4 md:h-4" />
                                <span className="hidden md:inline">登录 / 注册</span>
                            </button>
                        )}
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
                                    className="w-full flex items-center gap-4 p-4 rounded-xl mb-4 bg-gradient-to-r from-slate-800 to-slate-900 text-white shadow-lg transform active:scale-95 transition-all"
                                >
                                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center border border-white/10">
                                        <User size={24} />
                                    </div>
                                    <div className="text-left flex-1">
                                        <div className="font-bold text-lg">点击登录/注册</div>
                                        <div className="text-xs text-slate-400">同步您的配置方案与收藏</div>
                                    </div>
                                    <ArrowRight size={20} className="text-slate-500" />
                                </button>
                            )}

                            {/* Mobile Menu Tools Grid */}
                            <div className="grid grid-cols-2 gap-3 mb-6">
                                <button
                                    onClick={() => {
                                        setViewMode('visual');
                                        setTriggerAiModal(true);
                                        setShowMobileMenu(false);
                                    }}
                                    className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-purple-50 text-purple-700 active:bg-purple-100 transition-colors border border-purple-100"
                                >
                                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mb-1">
                                        <Sparkles size={20} />
                                    </div>
                                    <span className="font-bold text-sm">AI 智能装机</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setShowLibraryModal(true);
                                        setShowMobileMenu(false);
                                    }}
                                    className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-blue-50 text-blue-700 active:bg-blue-100 transition-colors border border-blue-100"
                                >
                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mb-1">
                                        <BookOpen size={20} />
                                    </div>
                                    <span className="font-bold text-sm">快速载入配置</span>
                                </button>
                            </div>

                            {[
                                { id: 'visual' as const, icon: LayoutGrid, label: 'AI装机台', desc: '智能配置推荐' },
                                { id: 'square' as const, icon: Share2, label: '配置广场', desc: '热门配置分享' },
                                { id: 'used' as const, icon: ShoppingBag, label: '严选二手', desc: '性价比之选' },
                                { id: 'about' as const, icon: Info, label: '关于我们', desc: '品牌故事' },
                            ].map((item) => {
                                const Icon = item.icon;
                                const isActive = viewMode === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => {
                                            setViewMode(item.id);
                                            setShowMobileMenu(false);
                                        }}
                                        className={`w - full flex items - center gap - 4 p - 4 rounded - xl transition - all ${isActive
                                            ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                                            } `}
                                    >
                                        <Icon size={22} />
                                        <div className="text-left">
                                            <div className="font-semibold">{item.label}</div>
                                            <div className={`text - xs ${isActive ? 'text-white/70' : 'text-slate-400'} `}>{item.desc}</div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 pb-40 md:pb-32">
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
                            if (window.confirm('确定要清空当前配置吗？')) {
                                setBuildList(prev => prev.map(i => ({ ...i, item: null, quantity: 1 })));
                            }
                        }}
                        hasPermission={hasStreamerPermission}
                        onApply={() => window.open('https://chat.xiaoyu.com', '_blank')}
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
                        onExport={() => alert('导出功能开发中')}
                        onReset={() => {
                            if (window.confirm('确定要清空当前配置吗？')) {
                                setBuildList(prev => prev.map(i => ({ ...i, item: null, quantity: 1 })));
                            }
                        }}
                    />
                )}

                {viewMode === 'square' && (
                    <ConfigSquare
                        configList={configList}
                        onLoadConfig={handleFork}
                        showToast={showToast}
                        onToggleLike={(id) => {
                            setConfigList(prev => prev.map(c =>
                                c.id === id ? { ...c, isLiked: !c.isLiked, likes: c.isLiked ? c.likes - 1 : c.likes + 1 } : c
                            ));
                        }}
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



                {viewMode === 'about' && <AboutUs />}
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
                        // Quick save logic
                        handlePublishToSquare({
                            title: `我的装机单 ${new Date().toLocaleDateString()} `,
                            tags: ['我的收藏'],
                            desc: '从保存预览快速保存'
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
                                            {opt.name} ({Math.round(opt.multiplier * 100)}%)
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

            {/* Mobile Bottom Navigation - Hidden per user request */}
            {/* <MobileBottomNav
                viewMode={viewMode}
                setViewMode={setViewMode}
            /> */}

            {/* Discount Action Sheet (Mobile) */}
            {/* Backdrop */}
            {showDiscountSheet && (
                <div
                    className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm md:hidden animate-fade-in"
                    onClick={() => setShowDiscountSheet(false)}
                />
            )}

            {/* Sheet */}
            <div className={`fixed inset - x - 0 bottom - 0 z - 50 bg - white rounded - t - 2xl p - 6 shadow - [0_ - 10px_40px_rgba(0, 0, 0, 0.1)] transition - transform duration - 300 ease - out transform ${showDiscountSheet ? 'translate-y-0' : 'translate-y-full'} md: hidden`}>
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
                            className={`flex items - center justify - between p - 4 rounded - xl border - 2 cursor - pointer transition - all active: scale - [0.98] ${discountRate === tier.multiplier ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-100 bg-white'} `}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w - 5 h - 5 rounded - full border - 2 flex items - center justify - center ${discountRate === tier.multiplier ? 'border-indigo-600' : 'border-slate-300'} `}>
                                    {discountRate === tier.multiplier && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />}
                                </div>
                                <div className="flex flex-col">
                                    <span className={`text - sm font - bold ${discountRate === tier.multiplier ? 'text-indigo-900' : 'text-slate-700'} `}>{tier.name}</span>
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
        </div>
    );
}
