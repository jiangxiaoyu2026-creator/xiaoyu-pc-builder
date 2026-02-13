
import { useState, useEffect, lazy, Suspense } from 'react';
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
} from 'lucide-react';
import { NavButton } from '../components/admin/Shared';
import { PricingStrategy, UserItem } from '../types/adminTypes';
import { storage } from '../services/storage';
import LoginModal from '../components/common/LoginModal';

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

export default function AdminApp() {
    const [currentTab, setCurrentTab] = useState<'dashboard' | 'products' | 'configs' | 'settings' | 'ai' | 'users' | 'comments' | 'streamers' | 'chat' | 'used_items' | 'recycle_requests' | 'payment' | 'about_us' | 'verifications' | 'invitations' | 'articles'>('dashboard');

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
        <div className="flex h-screen bg-slate-50 font-sans text-slate-800">
            {/* Sidebar */}
            <aside className="w-64 bg-zinc-900 text-white flex flex-col shadow-xl z-20 shrink-0">
                <div className="p-6 flex items-center gap-3 border-b border-zinc-800">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg">
                        XY
                    </div>
                    <div>
                        <h1 className="text-lg font-extrabold tracking-tight">小鱼后台</h1>
                        <p className="text-[10px] text-zinc-500 uppercase">{isSubAdmin ? '运营模式' : '管理系统'}</p>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
                    <div className="text-xs font-bold text-zinc-500 px-4 py-2 mt-6 uppercase">运营与互动</div>
                    <NavButton active={currentTab === 'dashboard'} onClick={() => setCurrentTab('dashboard')} icon={<LayoutDashboard size={18} />} label="数据概览" />
                    <NavButton active={currentTab === 'configs'} onClick={() => setCurrentTab('configs')} icon={<ListFilter size={18} />} label="配置单管理" />
                    <NavButton active={currentTab === 'comments'} onClick={() => setCurrentTab('comments')} icon={<MessageSquare size={18} />} label="评论管理" />
                    <NavButton active={currentTab === 'chat'} onClick={() => setCurrentTab('chat')} icon={<MessageCircle size={18} />} label="客户咨询" />
                    <NavButton active={currentTab === 'articles'} onClick={() => setCurrentTab('articles')} icon={<BookOpen size={18} />} label="头条管理" />

                    <div className="text-xs font-bold text-zinc-500 px-4 py-2 mt-6 uppercase">二手市场</div>
                    <NavButton active={currentTab === 'used_items'} onClick={() => setCurrentTab('used_items')} icon={<Package size={18} />} label="二手商品" />
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
                            {/* <NavButton active={currentTab === 'verifications'} onClick={() => setCurrentTab('verifications')} icon={<ShieldCheck size={18} />} label="验证码管理" />
                            <button
                                onClick={() => setShowSmsSettings(true)}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                            >
                                <Smartphone size={18} />
                                <span className="font-medium text-sm">短信服务配置</span>
                            </button> */}
                        </>
                    )}

                    <div className="text-xs font-bold text-zinc-500 px-4 py-2 mt-6 uppercase">硬件库</div>
                    <NavButton active={currentTab === 'products'} onClick={() => setCurrentTab('products')} icon={<Package size={18} />} label="硬件价格管理" />
                </nav>

                <div className="p-4 border-t border-zinc-800">
                    <div className="flex items-center gap-3 px-4 py-3 mb-2 bg-zinc-800/50 rounded-lg">
                        <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold">
                            {currentUser.username[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{currentUser.username}</p>
                            <p className="text-xs text-zinc-400">管理员</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-2 w-full text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                    >
                        <LogOut size={18} /><span>退出系统</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm shrink-0">
                    <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tight">
                        {currentTab === 'dashboard' && '运营概览'}
                        {currentTab === 'products' && '硬件库与价格库'}
                        {currentTab === 'settings' && '全局系统设置 (价格/弹窗/备份)'}
                        {currentTab === 'ai' && 'AI 配置中枢'}
                        {currentTab === 'users' && '系统权限管理'}
                        {currentTab === 'comments' && '评论与留言'}
                        {currentTab === 'chat' && '在线客服反馈'}
                        {currentTab === 'used_items' && '二手商品管理'}
                        {currentTab === 'recycle_requests' && '回收申请管理'}
                        {currentTab === 'payment' && '支付设置'}
                        {currentTab === 'about_us' && '品牌页面管理'}
                        {currentTab === 'verifications' && '邮箱验证码安全审计'}
                        {currentTab === 'invitations' && '注册邀请码管理'}
                    </h2>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-sm text-slate-500 font-medium">系统监控正常</span>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-8 bg-slate-50">
                    <Suspense fallback={
                        <div className="flex flex-col items-center justify-center h-full py-20 text-slate-400 gap-4">
                            <div className="w-8 h-8 border-2 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div>
                            <span className="text-xs font-bold animate-pulse">模块加载中...</span>
                        </div>
                    }>
                        {currentTab === 'chat' ? (
                            <ChatManager />
                        ) : (
                            <div className="max-w-7xl mx-auto">
                                {currentTab === 'dashboard' && <DashboardView />}
                                {currentTab === 'products' && <ProductManager />}
                                {currentTab === 'configs' && <ConfigManager />}
                                {currentTab === 'used_items' && <UsedManager />}
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
                            </div>
                        )}
                    </Suspense>
                </main>
            </div>

            {/* SMS Settings Modal (Hidden) */}
            {/* {showSmsSettings && <SmsSettingsModal onClose={() => setShowSmsSettings(false)} />} */}
        </div>
    );
}
