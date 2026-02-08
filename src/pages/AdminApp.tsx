
import { useState, useEffect } from 'react';
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
    Smartphone,
    CreditCard,
    Info,
} from 'lucide-react';
import { NavButton } from '../components/admin/Shared';
import DashboardView from '../components/admin/DashboardView';
import ProductManager from '../components/admin/ProductManager';
import ConfigManager from '../components/admin/ConfigManager';
import SettingsView from '../components/admin/SettingsView';
import AiManager from '../components/admin/AiManager';
import UserManager from '../components/admin/UserManager';
import CommentManager from '../components/admin/CommentManager';
import ChatManager from '../components/admin/ChatManager';
import SmsSettingsModal from '../components/admin/SmsSettingsModal';
import UsedManager from '../components/admin/UsedManager';
import RecycleManager from '../components/admin/RecycleManager';
import PaymentSettings from '../components/admin/PaymentSettings';
import AboutUsSettings from '../components/admin/AboutUsSettings';
import { HardwareItem, ConfigItem, PricingStrategy, UserItem, UsedItem, RecycleRequest } from '../types/adminTypes';
import { storage } from '../services/storage';
import LoginModal from '../components/common/LoginModal';

export default function AdminApp() {
    const [currentTab, setCurrentTab] = useState<'dashboard' | 'products' | 'configs' | 'settings' | 'ai' | 'users' | 'comments' | 'streamers' | 'chat' | 'used_items' | 'recycle_requests' | 'payment' | 'about_us'>('dashboard');

    // Global Data State
    const [products, setProducts] = useState<HardwareItem[]>([]);
    const [configs, setConfigs] = useState<ConfigItem[]>([]);
    const [pricingStrategy, setPricingStrategy] = useState<PricingStrategy>({
        serviceFeeRate: 0.06,
        discountTiers: []
    });
    const [usedItems, setUsedItems] = useState<UsedItem[]>([]);
    const [recycleRequests, setRecycleRequests] = useState<RecycleRequest[]>([]);

    // SMS Settings Modal State
    const [showSmsSettings, setShowSmsSettings] = useState(false);

    // Load initial data
    useEffect(() => {
        const loadData = () => {
            setProducts(storage.getProducts());
            setConfigs(storage.getConfigs());
            setPricingStrategy(storage.getSettings());
            setUsedItems(storage.getUsedItems());
            setRecycleRequests(storage.getRecycleRequests());
        };
        loadData();

        window.addEventListener('storage', loadData);
        window.addEventListener('xiaoyu-storage-update', loadData);
        window.addEventListener('xiaoyu-recycle-requests-update', loadData);
        return () => {
            window.removeEventListener('storage', loadData);
            window.removeEventListener('xiaoyu-storage-update', loadData);
            window.removeEventListener('xiaoyu-recycle-requests-update', loadData);
        };
    }, []);

    // Handlers for data updates
    const handleUpdateProducts = (newProducts: HardwareItem[]) => {
        setProducts(newProducts);
        storage.saveProducts(newProducts);
    };

    const handleUpdateConfigs = (newConfigs: ConfigItem[]) => {
        setConfigs(newConfigs);
        storage.saveConfigs(newConfigs);
    };

    const handleUpdateSettings = (newStrategy: PricingStrategy) => {
        setPricingStrategy(newStrategy);
        storage.saveSettings(newStrategy);
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
                        <p className="text-[10px] text-zinc-500 uppercase">{isSubAdmin ? 'Operation Mode' : 'Management OS'}</p>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
                    <div className="text-xs font-bold text-zinc-500 px-4 py-2 mt-6 uppercase">运营与互动</div>
                    <NavButton active={currentTab === 'dashboard'} onClick={() => setCurrentTab('dashboard')} icon={<LayoutDashboard size={18} />} label="数据概览" />
                    <NavButton active={currentTab === 'configs'} onClick={() => setCurrentTab('configs')} icon={<ListFilter size={18} />} label="配置单管理" />
                    <NavButton active={currentTab === 'comments'} onClick={() => setCurrentTab('comments')} icon={<MessageSquare size={18} />} label="评论管理" />
                    <NavButton active={currentTab === 'chat'} onClick={() => setCurrentTab('chat')} icon={<MessageCircle size={18} />} label="客户咨询 (Chat)" />

                    <div className="text-xs font-bold text-zinc-500 px-4 py-2 mt-6 uppercase">二手市场</div>
                    <NavButton active={currentTab === 'used_items'} onClick={() => setCurrentTab('used_items')} icon={<Package size={18} />} label="二手商品" />
                    <NavButton active={currentTab === 'recycle_requests'} onClick={() => setCurrentTab('recycle_requests')} icon={<ListFilter size={18} />} label="回收申请" />

                    {isAdmin && (
                        <>
                            <div className="text-xs font-bold text-zinc-500 px-4 py-2 mt-6 uppercase">系统管理</div>
                            <NavButton active={currentTab === 'users'} onClick={() => setCurrentTab('users')} icon={<Users size={18} />} label="用户与权限" />
                            <NavButton active={currentTab === 'ai'} onClick={() => setCurrentTab('ai')} icon={<Bot size={18} />} label="AI 大脑中枢" />
                            <NavButton active={currentTab === 'settings'} onClick={() => setCurrentTab('settings')} icon={<Settings size={18} />} label="价格与利润设置" />
                            <NavButton active={currentTab === 'about_us'} onClick={() => setCurrentTab('about_us')} icon={<Info size={18} />} label="关于我们 (CMS)" />
                            <NavButton active={currentTab === 'payment'} onClick={() => setCurrentTab('payment')} icon={<CreditCard size={18} />} label="支付设置" />
                            <button
                                onClick={() => setShowSmsSettings(true)}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                            >
                                <Smartphone size={18} />
                                <span className="font-medium text-sm">短信服务配置</span>
                            </button>
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
                        {currentTab === 'dashboard' && '运营概览 Dashboard'}
                        {currentTab === 'products' && '硬件库与价格库'}
                        {currentTab === 'configs' && '社区配置与推荐'}
                        {currentTab === 'settings' && '全局价格策略'}
                        {currentTab === 'ai' && 'AI 配置中枢'}
                        {currentTab === 'users' && '系统权限管理'}
                        {currentTab === 'comments' && '评论与留言'}
                        {currentTab === 'chat' && '在线客服反馈'}
                        {currentTab === 'used_items' && '二手商品管理'}
                        {currentTab === 'recycle_requests' && '回收申请管理'}
                        {currentTab === 'payment' && '支付设置'}
                        {currentTab === 'about_us' && '品牌页面管理 (About Us)'}
                    </h2>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-sm text-slate-500 font-medium">系统监控正常</span>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-8 bg-slate-50">
                    {currentTab === 'chat' ? (
                        <ChatManager />
                    ) : (
                        <div className="max-w-7xl mx-auto">
                            {currentTab === 'dashboard' && <DashboardView products={products} configs={configs} />}
                            {currentTab === 'products' && <ProductManager products={products} setProducts={handleUpdateProducts} />}
                            {currentTab === 'configs' && <ConfigManager configs={configs} setConfigs={handleUpdateConfigs} products={products} />}
                            {currentTab === 'used_items' && <UsedManager usedItems={usedItems} setUsedItems={setUsedItems} />}
                            {currentTab === 'recycle_requests' && <RecycleManager requests={recycleRequests} setRequests={setRecycleRequests} />}
                            {currentTab === 'settings' && <SettingsView strategy={pricingStrategy} setStrategy={handleUpdateSettings} />}
                            {currentTab === 'ai' && <AiManager />}
                            {currentTab === 'users' && <UserManager />}
                            {currentTab === 'comments' && <CommentManager />}
                            {currentTab === 'payment' && <PaymentSettings />}
                            {currentTab === 'about_us' && <AboutUsSettings />}
                        </div>
                    )}
                </main>
            </div>

            {/* SMS Settings Modal */}
            {showSmsSettings && <SmsSettingsModal onClose={() => setShowSmsSettings(false)} />}
        </div>
    );
}
