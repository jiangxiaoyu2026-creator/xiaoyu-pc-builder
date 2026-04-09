
import { useState, useEffect, lazy, Suspense, useMemo } from 'react';
import {
    LayoutDashboard,
    Package,
    Settings,
    LogOut,
    Bot,
    ListFilter,
    MessageSquare,
    Users,
    MessageCircle,
    CreditCard,
    Info,
    Gift,
    BookOpen,
    TrendingUp,
    BarChart3,
    FileSpreadsheet,
    Home,
} from 'lucide-react';
import { NavButton } from '../components/admin/Shared';
import { PricingStrategy, UserItem } from '../types/adminTypes';
import { storage } from '../services/storage';
import LoginModal from '../components/common/LoginModal';
import { ToastProvider } from '../components/common/Toast';

// Views
const DashboardView = lazy(() => import('../components/admin/DashboardView'));
const ProductManager = lazy(() => import('../components/admin/ProductManager'));
const ConfigManager = lazy(() => import('../components/admin/ConfigManager'));
const SettingsView = lazy(() => import('../components/admin/SettingsView'));
const AiManager = lazy(() => import('../components/admin/AiManager'));
const UserManager = lazy(() => import('../components/admin/UserManager'));
const CommentManager = lazy(() => import('../components/admin/CommentManager'));
const ChatManager = lazy(() => import('../components/admin/ChatManager'));
const UsedManager = lazy(() => import('../components/admin/UsedManager'));
const RecycleManager = lazy(() => import('../components/admin/RecycleManager'));
const PaymentSettings = lazy(() => import('../components/admin/PaymentSettings'));
const AboutUsSettings = lazy(() => import('../components/admin/AboutUsSettings'));
const InvitationManager = lazy(() => import('../components/admin/InvitationManager'));
const ArticleManager = lazy(() => import('../components/admin/ArticleManager'));
const MarketingManager = lazy(() => import('../components/admin/MarketingManager'));
const JDTrendsMonitor = lazy(() => import('../components/admin/JDTrendsMonitor'));
const RecyclingPriceManager = lazy(() => import('../components/admin/RecyclingPriceManager'));

export default function AdminApp() {
    const [currentTab, setCurrentTab] = useState<'dashboard' | 'price_trends' | 'products' | 'configs' | 'settings' | 'ai' | 'users' | 'comments' | 'streamers' | 'chat' | 'used_items' | 'recycle_requests' | 'recycling_prices' | 'payment' | 'about_us' | 'verifications' | 'invitations' | 'articles' | 'marketing'>('dashboard');

    const [pricingStrategy, setPricingStrategy] = useState<PricingStrategy>({
        serviceFeeRate: 0.06,
        discountTiers: []
    });



    // Load initial global settings (pricing, etc.)
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const s = await storage.getPricingStrategy();
                setPricingStrategy(s);
            } catch (error) {
                console.error('Failed to load pricing strategy:', error);
            }
        };
        loadSettings();
    }, []);

    const handleUpdateSettings = async (newStrategy: PricingStrategy) => {
        setPricingStrategy(newStrategy);
        await storage.savePricingStrategy(newStrategy);
    };

    // --- Login Guard ---
    const [currentUser, setCurrentUser] = useState<UserItem | null>(() => storage.getCurrentUser());

    useEffect(() => {
        if (!currentUser || !['admin', 'sub_admin'].includes(currentUser.role)) {
            // Login handled by LoginModal below
        } else {
            // Verify admin status on load to prevent downgraded users from staying in the penal
            const verifyAdmin = async () => {
                const users = await storage.getUsers();
                const freshUser = users.find(u => u.id === currentUser.id || (u as any)._id === currentUser.id);
                if (freshUser && freshUser.role !== currentUser.role) {
                    // Role was changed (e.g., downgraded)
                    const updatedUser = { ...currentUser, role: freshUser.role };
                    localStorage.setItem('xiaoyu_current_user', JSON.stringify(updatedUser));
                    setCurrentUser(updatedUser); // This will trigger the login modal if no longer admin
                }
            };
            verifyAdmin();
        }
    }, [currentUser]);

    const handleLoginSuccess = (user: UserItem) => {
        if (['admin', 'sub_admin'].includes(user.role)) {
            setCurrentUser(user);
        } else {
            alert('权限不足：需要管理员账号');
            if (storage.getCurrentUser()?.id === user.id) {
                storage.logout();
            }
        }
    };

    const handleLogout = () => {
        storage.logout();
        setCurrentUser(null);
    };

    // Live clock for professional recording feel - must be before early return (Rules of Hooks)
    const [currentTime, setCurrentTime] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Title mapping for header - must be before early return (Rules of Hooks)
    const titleMap: Record<string, string> = useMemo(() => ({
        dashboard: '运营概览',
        price_trends: '价格趋势分析',
        products: '硬件库与价格库',
        settings: '全局系统设置 (价格/弹窗/备份)',
        ai: 'AI 配置中枢',
        users: '系统权限管理',
        comments: '评论与留言',
        chat: '在线客服反馈',
        used_items: '二手商品管理',
        recycle_requests: '回收申请管理',
        payment: '支付设置',
        about_us: '品牌页面管理',
        verifications: '邮箱验证码安全审计',
        invitations: '注册邀请码管理',
        articles: '头条管理',
        marketing: '今日自动化大盘与营销中心',
    }), []);

    if (!currentUser || !['admin', 'sub_admin'].includes(currentUser.role)) {
        return (
            <div className="flex h-screen bg-slate-50 font-sans text-slate-800 items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">正在验证权限...</h1>
                    <LoginModal
                        onClose={() => { }}
                        onLoginSuccess={handleLoginSuccess}
                    />
                </div>
            </div>
        );
    }

    const isAdmin = currentUser.role === 'admin';
    const isSubAdmin = currentUser.role === 'sub_admin';

    return (
        <ToastProvider>
        <div className="flex h-screen bg-slate-50 font-sans text-slate-800">
            {/* Sidebar */}
            <aside className="w-64 bg-zinc-900 text-white flex flex-col shadow-xl z-20 shrink-0">
                <div className="p-6 flex items-center gap-3 border-b border-zinc-800">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shrink-0">
                        XY
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg font-extrabold tracking-tight">小鱼后台</h1>
                            <button
                                onClick={() => window.open('/', '_blank')}
                                className="flex items-center gap-1 px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-700 hover:border-zinc-600 rounded text-[10px] font-medium transition-all shadow-sm"
                                title="在新标签页中打开前台"
                            >
                                <Home size={10} />
                                <span>前台</span>
                            </button>
                        </div>
                        <p className="text-[10px] text-zinc-500 uppercase mt-0.5">{isSubAdmin ? '运营模式' : '管理系统'}</p>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
                    <div className="text-xs font-bold text-zinc-500 px-4 py-2 mt-2 uppercase">运营与互动</div>
                    <NavButton active={currentTab === 'dashboard'} onClick={() => setCurrentTab('dashboard')} icon={<LayoutDashboard size={18} />} label="数据概览" />
                    <NavButton active={currentTab === 'products'} onClick={() => setCurrentTab('products')} icon={<Package size={18} />} label="硬件价格管理" />
                    <NavButton active={currentTab === 'configs'} onClick={() => setCurrentTab('configs')} icon={<ListFilter size={18} />} label="配置单管理" />
                    <NavButton active={currentTab === 'comments'} onClick={() => setCurrentTab('comments')} icon={<MessageSquare size={18} />} label="评论管理" />
                    <NavButton active={currentTab === 'chat'} onClick={() => setCurrentTab('chat')} icon={<MessageCircle size={18} />} label="客户咨询" />
                    <NavButton active={currentTab === 'articles'} onClick={() => setCurrentTab('articles')} icon={<BookOpen size={18} />} label="头条管理" />
                    <NavButton active={currentTab === 'marketing'} onClick={() => setCurrentTab('marketing')} icon={<TrendingUp size={18} />} label="📈 行情与营销中心" />

                    <div className="text-xs font-bold text-zinc-500 px-4 py-2 mt-6 uppercase">二手市场</div>
                    <NavButton active={currentTab === 'used_items'} onClick={() => setCurrentTab('used_items')} icon={<Package size={18} />} label="二手商品" />
                    <NavButton active={currentTab === 'recycling_prices'} onClick={() => setCurrentTab('recycling_prices')} icon={<FileSpreadsheet size={18} />} label="回收价格库" />
                    <NavButton active={currentTab === 'recycle_requests'} onClick={() => setCurrentTab('recycle_requests')} icon={<ListFilter size={18} />} label="回收申请" />

                    {isAdmin && (
                        <>
                            <div className="text-xs font-bold text-zinc-500 px-4 py-2 mt-6 uppercase">系统管理</div>
                            <NavButton active={currentTab === 'users'} onClick={() => setCurrentTab('users')} icon={<Users size={18} />} label="用户与权限" />
                            <NavButton active={currentTab === 'ai'} onClick={() => setCurrentTab('ai')} icon={<Bot size={18} />} label="AI 大脑中枢" />
                            <NavButton active={currentTab === 'settings'} onClick={() => setCurrentTab('settings')} icon={<Settings size={18} />} label="全局系统设置" />
                            <NavButton active={currentTab === 'about_us'} onClick={() => setCurrentTab('about_us')} icon={<Info size={18} />} label="关于我们" />
                            <NavButton active={currentTab === 'payment'} onClick={() => setCurrentTab('payment')} icon={<CreditCard size={18} />} label="支付设置" />
                            <NavButton active={currentTab === 'invitations'} onClick={() => setCurrentTab('invitations')} icon={<Gift size={18} />} label="邀请码管理" />
                        </>
                    )}
                </nav>

                <div className="p-4 border-t border-zinc-800">
                    <div className="flex items-center gap-3 px-4 py-3 mb-2 bg-zinc-800/50 rounded-lg">
                        <div className="relative">
                            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold">
                                {currentUser.username[0].toUpperCase()}
                            </div>
                            {/* Online status dot */}
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-zinc-900 animate-pulse" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{currentUser.username}</p>
                            <p className="text-xs text-zinc-400 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                                在线 · 管理员
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-2 w-full text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-lg transition-all duration-200 active:scale-[0.97]"
                    >
                        <LogOut size={18} /><span>退出系统</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm shrink-0">
                    <h2 key={currentTab} className="text-xl font-bold text-slate-800 uppercase tracking-tight animate-title-fade">
                        {titleMap[currentTab] || currentTab}
                    </h2>
                    <div className="flex items-center gap-4">
                        <div className="text-xs font-mono text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                            {currentTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-sm text-slate-500 font-medium">系统监控正常</span>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-8 bg-slate-50">
                    <Suspense fallback={
                        <div className="animate-page-enter">
                            <div className="max-w-7xl mx-auto space-y-6">
                                {/* Skeleton stat cards */}
                                <div className="grid grid-cols-4 gap-6">
                                    {[1,2,3,4].map(i => (
                                        <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                            <div className="h-3 w-20 bg-slate-200 rounded animate-pulse mb-3" />
                                            <div className="h-7 w-16 bg-slate-100 rounded animate-pulse mb-2" />
                                            <div className="h-2 w-24 bg-slate-100 rounded animate-pulse" />
                                        </div>
                                    ))}
                                </div>
                                {/* Skeleton content block */}
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                    <div className="h-4 w-32 bg-slate-200 rounded animate-pulse mb-6" />
                                    <div className="space-y-3">
                                        {[1,2,3].map(i => (
                                            <div key={i} className="h-12 bg-slate-50 rounded-lg animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
                                        ))}
                                    </div>
                                </div>
                                {/* Loading indicator */}
                                <div className="flex items-center justify-center gap-3 py-8 text-slate-400">
                                    <div className="w-5 h-5 border-2 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
                                    <span className="text-sm font-medium animate-pulse">模块加载中...</span>
                                </div>
                            </div>
                        </div>
                    }>
                        <div key={currentTab} className="animate-page-enter">
                            {currentTab === 'chat' ? (
                                <ChatManager />
                            ) : (
                                <div className="w-full h-full">
                                    {currentTab === 'dashboard' && <DashboardView />}
                                    {currentTab === 'price_trends' && <JDTrendsMonitor />}
                                    {currentTab === 'products' && <ProductManager />}
                                    {currentTab === 'configs' && <ConfigManager />}
                                    {currentTab === 'used_items' && <UsedManager />}
                                    {currentTab === 'recycling_prices' && <RecyclingPriceManager />}
                                    {currentTab === 'recycle_requests' && <RecycleManager />}
                                    {currentTab === 'settings' && <SettingsView strategy={pricingStrategy} setStrategy={handleUpdateSettings} />}
                                    {currentTab === 'ai' && <AiManager />}
                                    {currentTab === 'users' && <UserManager />}
                                    {currentTab === 'comments' && <CommentManager />}
                                    {currentTab === 'payment' && <PaymentSettings />}
                                    {currentTab === 'about_us' && <AboutUsSettings />}
                                    {/* {currentTab === 'verifications' && <VerificationManager />} */}
                                    {currentTab === 'invitations' && <InvitationManager />}
                                    {currentTab === 'articles' && <ArticleManager />}
                                    {currentTab === 'marketing' && <MarketingManager />}
                                </div>
                            )}
                        </div>
                    </Suspense>
                </main>
            </div>

            {/* SMS Settings Modal (Hidden) */}
            {/* {showSmsSettings && <SmsSettingsModal onClose={() => setShowSmsSettings(false)} />} */}
        </div>
        </ToastProvider>
    );
}
