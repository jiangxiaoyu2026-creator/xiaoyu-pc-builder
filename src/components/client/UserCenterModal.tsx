import React, { useState, useEffect } from 'react';
import { X, User, Heart, FileText, Calendar, LogOut, Edit3, Gift, Copy, Crown, Share2, ShoppingBag } from 'lucide-react';
import { storage } from '../../services/storage';
import { UserItem, ConfigTemplate } from '../../types/clientTypes';

import { ConfigDetailModal } from './Modals';

// 邀请好友卡片组件
function InviteCard({ userId, showToast }: { userId: string; showToast: (msg: string) => void }) {
    const [inviteCode, setInviteCode] = React.useState('');
    const [inviteCount, setInviteCount] = React.useState(0);
    const [inviteVipDays, setInviteVipDays] = React.useState(0);

    React.useEffect(() => {
        // 确保用户有邀请码
        const code = storage.ensureUserInviteCode(userId);
        setInviteCode(code);

        // 获取邀请统计
        const users = storage.getUsers();
        const user = users.find(u => u.id === userId);
        if (user) {
            setInviteCount(user.inviteCount || 0);
            setInviteVipDays(user.inviteVipDays || 0);
        }
    }, [userId]);

    const DAYS_PER_INVITE = 7;
    const progress = Math.min((inviteVipDays / 30) * 100, 100); // 按获得天数计算进度

    const handleCopyLink = () => {
        const link = `${window.location.origin}?invite=${inviteCode}`;
        navigator.clipboard.writeText(link).then(() => {
            showToast('邀请链接已复制！');
        }).catch(() => {
            showToast(`邀请码: ${inviteCode}`);
        });
    };

    const handleCopyCode = () => {
        navigator.clipboard.writeText(inviteCode).then(() => {
            showToast('邀请码已复制！');
        });
    };

    return (
        <div className="mt-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-6 border border-amber-200/50 relative overflow-hidden">
            {/* 装饰背景 */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-amber-300/30 to-orange-400/30 rounded-full blur-2xl"></div>
            <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-gradient-to-br from-yellow-300/30 to-amber-400/30 rounded-full blur-2xl"></div>

            <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-200">
                        <Gift size={20} className="text-white" />
                    </div>
                    <div>
                        <h4 className="font-bold text-amber-900">邀请好友得 VIP</h4>
                        <p className="text-xs text-amber-700">每邀请1人获得7天VIP，最多30天</p>
                    </div>
                </div>

                {/* 邀请码展示 */}
                <div className="bg-white rounded-2xl p-4 mb-4 border border-amber-100">
                    <div className="text-xs text-amber-600 font-bold mb-2">我的邀请码</div>
                    <div className="flex items-center gap-3">
                        <div className="flex-1 bg-amber-50 rounded-xl px-4 py-3 font-mono text-xl font-bold text-amber-800 tracking-[0.3em] text-center border-2 border-dashed border-amber-200">
                            {inviteCode || '------'}
                        </div>
                        <button
                            onClick={handleCopyCode}
                            className="p-3 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-xl transition-all"
                            title="复制邀请码"
                        >
                            <Copy size={18} />
                        </button>
                    </div>
                </div>

                {/* 进度条 */}
                <div className="mb-4">
                    <div className="flex justify-between text-xs font-bold mb-2">
                        <span className="text-amber-700">已邀请 {inviteCount} 人</span>
                        <span className="text-amber-600 flex items-center gap-1">
                            <Crown size={12} /> 已获得 {inviteVipDays} 天 VIP
                        </span>
                    </div>
                    <div className="h-3 bg-white rounded-full overflow-hidden border border-amber-200">
                        <div
                            className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    <div className="text-[10px] text-amber-600 mt-1 text-center">
                        {inviteVipDays >= 30
                            ? '🎉 已达邀请上限，感谢支持！'
                            : `再邀请 ${Math.ceil((30 - inviteVipDays) / DAYS_PER_INVITE)} 人可获满30天VIP`}
                    </div>
                </div>

                {/* 分享按钮 */}
                <button
                    onClick={handleCopyLink}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-xl shadow-lg shadow-amber-200 transition-all flex items-center justify-center gap-2"
                >
                    <Share2 size={18} />
                    复制邀请链接
                </button>
            </div>
        </div>
    );
}

interface UserCenterModalProps {
    user: UserItem;
    onClose: () => void;
    onLogout: () => void;
    onLoadConfig: (config: ConfigTemplate) => void;
    showToast: (msg: string) => void;
    onToggleLike: (id: string) => void;
}

export function UserCenterModal({
    user,
    onClose,
    onLogout,
    onLoadConfig,
    showToast,
    onToggleLike: _onToggleLike // Rename to avoid unused warning if not used here, but we'll use it in Modal below
}: UserCenterModalProps) {
    const [activeTab, setActiveTab] = useState<'profile' | 'my-configs' | 'favorites' | 'my-used'>('profile');
    const [myConfigs, setMyConfigs] = useState<ConfigTemplate[]>([]);
    const [favorites, setFavorites] = useState<ConfigTemplate[]>([]);
    const [myUsedItems, setMyUsedItems] = useState<import('../../types/adminTypes').UsedItem[]>([]);
    const [selectedConfig, setSelectedConfig] = useState<ConfigTemplate | null>(null);

    useEffect(() => {
        const allConfigs = storage.getConfigs().filter(c => c.status === 'published');
        const userLikes = storage.getUserLikes(user.id);

        // Map to client template format (simplified reuse of logic from ClientApp)
        const mapConfig = (c: any): ConfigTemplate => ({
            id: c.id,
            userId: c.userId,
            title: c.title,
            author: c.authorName,
            avatarColor: 'bg-zinc-500', // Default, maybe enhance later
            type: c.authorName.includes('官方') ? 'official' : (c.authorName.includes('主播') ? 'streamer' : (c.tags.includes('求助') ? 'help' : 'user')),
            tags: c.tags.map((t: string) => ({ type: 'usage', label: t })),
            price: c.totalPrice,
            items: c.items,
            likes: c.likes,
            views: c.views,
            comments: 0,
            date: c.createdAt,
            isLiked: userLikes.includes(c.id),
            serialNumber: c.serialNumber,
            description: c.description
        });

        const mappedAll = allConfigs.map(mapConfig);

        setMyConfigs(mappedAll.filter(c => c.userId === user.id || c.author === user.username));
        setFavorites(mappedAll.filter(c => userLikes.includes(c.id)));

        // Load personal used items
        const loadUsedItems = () => {
            const allUsed = storage.getUsedItems();
            setMyUsedItems(allUsed.filter(item => item.sellerId === user.id));
        };
        loadUsedItems();

        window.addEventListener('xiaoyu-used-items-update', loadUsedItems);
        return () => {
            window.removeEventListener('xiaoyu-used-items-update', loadUsedItems);
        };

    }, [user.id, user.username, activeTab]);

    const isVip = ['admin', 'streamer', 'sub_admin'].includes(user.role) || (user.vipExpireAt && user.vipExpireAt > Date.now());

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center md:p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
            <div className="bg-white md:rounded-[32px] w-full md:max-w-5xl h-full md:h-[85vh] flex flex-col md:flex-row shadow-2xl overflow-hidden animate-scale-up md:border md:border-white/20">

                {/* Sidebar - Hidden on mobile, visible on tablet/desktop */}
                <div className="hidden md:flex w-64 bg-slate-50 border-r border-slate-100 flex-col shrink-0">
                    <div className="p-6 pb-2">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <span className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white"><User size={18} /></span>
                            个人中心
                        </h2>
                    </div>

                    <div className="flex-1 px-4 py-4 space-y-1">
                        <button
                            onClick={() => setActiveTab('profile')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${activeTab === 'profile' ? 'bg-white shadow-sm text-indigo-600 font-bold' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
                        >
                            <User size={18} /> 我的资料
                        </button>
                        <button
                            onClick={() => setActiveTab('my-configs')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${activeTab === 'my-configs' ? 'bg-white shadow-sm text-indigo-600 font-bold' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
                        >
                            <FileText size={18} /> 我的方案
                            <span className="ml-auto bg-slate-100 text-slate-400 text-xs px-1.5 py-0.5 rounded-full">{myConfigs.length}</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('favorites')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${activeTab === 'favorites' ? 'bg-white shadow-sm text-indigo-600 font-bold' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
                        >
                            <Heart size={18} /> 我的收藏
                            <span className="ml-auto bg-slate-100 text-slate-400 text-xs px-1.5 py-0.5 rounded-full">{favorites.length}</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('my-used')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${activeTab === 'my-used' ? 'bg-white shadow-sm text-amber-600 font-bold' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
                        >
                            <ShoppingBag size={18} /> 我的发布
                            <span className="ml-auto bg-slate-100 text-slate-400 text-xs px-1.5 py-0.5 rounded-full">{myUsedItems.length}</span>
                        </button>
                    </div>

                    <div className="p-4 border-t border-slate-200">
                        <button
                            onClick={onLogout}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500 transition-all font-bold text-sm"
                        >
                            <LogOut size={16} /> 退出登录
                        </button>
                    </div>
                </div>

                {/* Mobile Header - Visible only on mobile */}
                <div className="md:hidden flex items-center justify-between p-4 border-b border-slate-100 bg-white shrink-0">
                    <h2 className="text-lg font-bold text-slate-800">个人中心</h2>
                    <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                        <X size={18} />
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 flex flex-col min-w-0 bg-white relative overflow-hidden">
                    <button onClick={onClose} className="hidden md:block absolute top-4 right-4 p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors text-slate-400 z-10">
                        <X size={20} />
                    </button>

                    <div className="flex-1 overflow-y-auto p-4 md:p-8">
                        {activeTab === 'profile' && (
                            <div className="max-w-xl animate-fade-in">
                                <h3 className="text-2xl font-bold text-slate-900 mb-8">个人资料</h3>

                                <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 mb-8 flex items-center gap-6 relative overflow-hidden group">
                                    {isVip && (
                                        <div className="absolute top-0 right-0 p-20 bg-gradient-to-br from-amber-200 to-transparent opacity-20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                                    )}
                                    <div className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl font-bold shadow-lg relative ${isVip ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white ring-4 ring-amber-100' : 'bg-indigo-100 text-indigo-600 ring-4 ring-slate-100'}`}>
                                        {user.username[0].toUpperCase()}
                                        {isVip && <div className="absolute -bottom-1 -right-1 bg-white p-1.5 rounded-full shadow-sm"><img src="https://api.iconify.design/noto:crown.svg" className="w-6 h-6" alt="VIP" /></div>}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="text-2xl font-bold text-slate-900">{user.username}</span>
                                            {isVip ? (
                                                <span className="px-2 py-0.5 bg-gradient-to-r from-amber-400 to-amber-600 text-white text-xs font-bold rounded-full shadow-amber-200 shadow-sm">SVIP 会员</span>
                                            ) : (
                                                <span className="px-2 py-0.5 bg-slate-200 text-slate-500 text-xs font-bold rounded-full">普通会员</span>
                                            )}
                                        </div>
                                        <div className="text-sm text-slate-500 flex items-center gap-4">
                                            <span>ID: {user.id}</span>
                                            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                            <span>注册于 {new Date().toLocaleDateString()}</span>
                                        </div>
                                        {isVip && (
                                            <div className="mt-3 text-xs md:text-sm text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg inline-flex items-center gap-2 border border-amber-100">
                                                <Calendar size={14} />
                                                {user.vipExpireAt
                                                    ? `会员有效期至：${new Date(user.vipExpireAt).toLocaleDateString()}`
                                                    : '尊贵的永久会员'}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                                            <div className="text-slate-400 text-xs font-bold uppercase mb-1">发布的配置</div>
                                            <div className="text-2xl font-bold text-slate-900">{myConfigs.length}</div>
                                        </div>
                                        <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                                            <div className="text-slate-400 text-xs font-bold uppercase mb-1">点赞/收藏</div>
                                            <div className="text-2xl font-bold text-slate-900">{favorites.length}</div>
                                        </div>
                                    </div>

                                    {/* Placeholder for editing */}
                                    <button className="w-full py-3 border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 rounded-xl font-bold transition-all flex items-center justify-center gap-2">
                                        <Edit3 size={16} /> 编辑资料 (暂未开放)
                                    </button>

                                    {/* VIP 特权卡片 - 仅VIP显示 */}
                                    {isVip && (
                                        <div className="mt-6 bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 border border-amber-500/20 relative overflow-hidden">
                                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl"></div>
                                            <div className="relative">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                                                        <Crown size={20} className="text-white" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-amber-400">SVIP 会员特权</h4>
                                                        <p className="text-xs text-slate-400">尊享以下专属权益</p>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2 text-xs text-slate-300">
                                                        <span className="text-amber-500">✓</span> 分享配置显示 VIP 专属徽章
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-slate-300">
                                                        <span className="text-amber-500">✓</span> 无限次 AI 智能装机
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-slate-300">
                                                        <span className="text-amber-500">✓</span> 专属客服优先响应
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-slate-300">
                                                        <span className="text-amber-500">✓</span> 独享硬件折扣优惠
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* 邀请好友卡片 */}
                                    <InviteCard userId={user.id} showToast={showToast} />
                                </div>
                            </div>
                        )}

                        {activeTab === 'my-used' && (
                            <div className="animate-fade-in h-full flex flex-col">
                                <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">我的闲置发布 <span className="text-slate-400 text-sm font-normal">({myUsedItems.length})</span></h3>
                                {myUsedItems.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                                        {myUsedItems.map(item => (
                                            <div key={item.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden group hover:shadow-xl transition-all flex flex-col">
                                                <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
                                                    {item.images[0] ? (
                                                        <img src={item.images[0]} alt={item.model} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                            <ShoppingBag size={32} />
                                                        </div>
                                                    )}
                                                    <div className="absolute top-3 right-3 flex flex-col gap-2 scale-90 origin-top-right">
                                                        {item.status === 'published' && <span className="px-2 py-1 bg-emerald-500 text-white text-[10px] font-bold rounded-lg shadow-lg">已发布</span>}
                                                        {item.status === 'pending' && <span className="px-2 py-1 bg-amber-500 text-white text-[10px] font-bold rounded-lg shadow-lg">待审核</span>}
                                                        {item.status === 'sold' && <span className="px-2 py-1 bg-slate-500 text-white text-[10px] font-bold rounded-lg shadow-lg">已售出</span>}
                                                        {item.status === 'rejected' && <span className="px-2 py-1 bg-red-500 text-white text-[10px] font-bold rounded-lg shadow-lg">未通过</span>}
                                                    </div>
                                                </div>
                                                <div className="p-4 flex-1 flex flex-col">
                                                    <h4 className="font-bold text-slate-900 truncate mb-1">{item.brand} {item.model}</h4>
                                                    <div className="text-red-500 font-bold text-sm mb-4">¥{item.price}</div>

                                                    <div className="mt-auto space-y-2">
                                                        {item.status === 'published' && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (confirm('确定要将该商品标记为已售吗？')) {
                                                                        storage.markUsedItemAsSold(item.id);
                                                                        showToast('已标记为已售！');
                                                                    }
                                                                }}
                                                                className="w-full py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                                                            >
                                                                <ShoppingBag size={14} /> 标记已售
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (confirm('确定要删除这条发布吗？')) {
                                                                    storage.deleteUsedItem(item.id);
                                                                    showToast('已删除发布');
                                                                }
                                                            }}
                                                            className="w-full py-2 bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                                                        >
                                                            <Edit3 size={14} /> 删除发布
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 min-h-[300px]">
                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                            <ShoppingBag size={32} className="opacity-20" />
                                        </div>
                                        <p>暂无发布的闲置硬件</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'my-configs' && (
                            <div className="animate-fade-in h-full flex flex-col">
                                <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">我的方案 <span className="text-slate-400 text-sm font-normal">({myConfigs.length})</span></h3>
                                {myConfigs.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                                        {/* We need to extract ConfigSquare's card logic or reuse it. 
                                            Since ConfigSquare is a full page component, let's just render a simple list reusing the visual style or import ConfigCard if we extract it.
                                            For now, I'll use a simplified card view to avoid refactoring constraints. 
                                         */}
                                        {myConfigs.map(config => (
                                            <div key={config.id} onClick={() => setSelectedConfig(config)} className="group bg-white rounded-2xl p-4 border border-slate-100 hover:border-indigo-500/30 hover:shadow-xl transition-all cursor-pointer relative">
                                                <div className="aspect-video bg-slate-900 rounded-xl mb-3 relative overflow-hidden group-hover:shadow-lg transition-all">
                                                    {/* Dynamic Background */}
                                                    <div className={`absolute inset-0 opacity-40 bg-gradient-to-br ${config.type === 'official' ? 'from-amber-500/80 to-red-600/80' : 'from-indigo-500/80 to-purple-600/80'} group-hover:scale-110 transition-transform duration-700`}></div>

                                                    {/* Tech Grid Pattern */}
                                                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>

                                                    {/* Central Icon */}
                                                    <div className="absolute inset-0 flex items-center justify-center text-white/30 group-hover:text-white/60 transition-colors duration-500">
                                                        <FileText size={42} strokeWidth={1.5} />
                                                    </div>

                                                    {/* Badges */}
                                                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                                                        {config.tags.slice(0, 2).map(t => (
                                                            <span key={t.label} className="px-2 py-0.5 bg-black/20 backdrop-blur text-[10px] text-white font-medium rounded-md border border-white/10">{t.label}</span>
                                                        ))}
                                                    </div>

                                                    {/* Price */}
                                                    <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur px-2.5 py-1 rounded-lg text-xs font-mono font-bold text-slate-900 shadow-sm">
                                                        ¥{config.price}
                                                    </div>
                                                </div>
                                                <h4 className="font-bold text-slate-900 truncate mb-1 group-hover:text-indigo-600 transition-colors">{config.title}</h4>
                                                <div className="flex items-center justify-between text-xs text-slate-400">
                                                    <span>{new Date(config.date).toLocaleDateString()}</span>
                                                    <span className="flex items-center gap-1"><Heart size={12} /> {config.likes}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                                        <FileText size={48} className="mb-4 opacity-20" />
                                        <p>暂无发布的配置方案</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'favorites' && (
                            <div className="animate-fade-in h-full flex flex-col">
                                <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">我的收藏 <span className="text-slate-400 text-sm font-normal">({favorites.length})</span></h3>
                                {favorites.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                                        {favorites.map(config => (
                                            <div key={config.id} onClick={() => setSelectedConfig(config)} className="group bg-white rounded-2xl p-4 border border-slate-100 hover:border-pink-500/30 hover:shadow-xl transition-all cursor-pointer relative">
                                                <div className="aspect-video bg-slate-900 rounded-xl mb-3 relative overflow-hidden group-hover:shadow-lg transition-all">
                                                    <div className="absolute inset-0 opacity-40 bg-gradient-to-br from-pink-500/80 to-rose-600/80 group-hover:scale-110 transition-transform duration-700"></div>

                                                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>

                                                    <div className="absolute inset-0 flex items-center justify-center text-white/30 group-hover:text-white/60 transition-colors duration-500">
                                                        <Heart size={42} strokeWidth={1.5} fill="currentColor" className="opacity-50" />
                                                    </div>

                                                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                                                        {config.tags.slice(0, 2).map(t => (
                                                            <span key={t.label} className="px-2 py-0.5 bg-black/20 backdrop-blur text-[10px] text-white font-medium rounded-md border border-white/10">{t.label}</span>
                                                        ))}
                                                    </div>

                                                    <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur px-2.5 py-1 rounded-lg text-xs font-mono font-bold text-slate-900 shadow-sm">
                                                        ¥{config.price}
                                                    </div>
                                                </div>
                                                <h4 className="font-bold text-slate-900 truncate mb-1 group-hover:text-pink-600 transition-colors">{config.title}</h4>
                                                <div className="flex items-center justify-between text-xs text-slate-400">
                                                    <span className="flex items-center gap-1"><User size={12} /> {config.author}</span>
                                                    <span className="flex items-center gap-1 text-pink-500"><Heart size={12} fill="currentColor" /> {config.likes}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                                        <Heart size={48} className="mb-4 opacity-20" />
                                        <p>暂无收藏的配置方案</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Mobile Bottom Tabs - Visible only on mobile */}
                <div className="md:hidden flex items-center justify-around bg-white border-t border-slate-200 p-2 shrink-0 safe-area-pb">
                    {[
                        { id: 'profile' as const, icon: User, label: '资料' },
                        { id: 'my-configs' as const, icon: FileText, label: '配置' },
                        { id: 'favorites' as const, icon: Heart, label: '收藏' },
                        { id: 'my-used' as const, icon: ShoppingBag, label: '闲置' },
                    ].map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex flex-col items-center justify-center flex-1 py-2 transition-all ${isActive ? 'text-indigo-600' : 'text-slate-400'
                                    }`}
                            >
                                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                                <span className={`text-[10px] mt-1 ${isActive ? 'font-semibold' : 'font-medium'}`}>{tab.label}</span>
                            </button>
                        );
                    })}
                    <button
                        onClick={onLogout}
                        className="flex flex-col items-center justify-center flex-1 py-2 text-slate-400 hover:text-red-500 transition-all"
                    >
                        <LogOut size={20} />
                        <span className="text-[10px] mt-1 font-medium">退出</span>
                    </button>
                </div>
            </div>
            {selectedConfig && (
                <ConfigDetailModal
                    config={selectedConfig}
                    onClose={() => setSelectedConfig(null)}
                    onLoad={(cfg) => {
                        onLoadConfig(cfg);
                        setSelectedConfig(null);
                    }}
                    showToast={showToast}
                    onToggleLike={_onToggleLike}
                    currentUser={user}
                />
            )}
        </div>
    );
}
