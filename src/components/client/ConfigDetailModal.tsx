import React from 'react';
import { X, Heart, Share2, CheckCircle2 } from 'lucide-react';
import { ConfigTemplate, HardwareItem } from '../../types/clientTypes';
import { UserItem } from '../../types/adminTypes';
import { HARDWARE_DB, CATEGORY_MAP } from '../../data/clientData';
import { getIconByCategory } from './Shared';
import { storage } from '../../services/storage';
import ConfirmModal from '../common/ConfirmModal';

export function ConfigDetailModal({ config, onClose, onLoad, showToast, onToggleLike, currentUser }: { config: ConfigTemplate, onClose: () => void, onLoad: () => void, showToast: (msg: string) => void, onToggleLike: (id: string) => void, currentUser: UserItem | null }) {
    const [commentText, setCommentText] = React.useState('');

    const [comments, setComments] = React.useState<any[]>([]);
    const [allProducts, setAllProducts] = React.useState<HardwareItem[]>([]);
    const [users, setUsers] = React.useState<UserItem[]>([]);

    // Confirm Modal State
    const [deleteCommentId, setDeleteCommentId] = React.useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);

    // Initial Load
    React.useEffect(() => {
        const loadInitialData = async () => {
            const [fetchedComments, fetchedProducts, fetchedUsers] = await Promise.all([
                storage.getComments(config.id),
                storage.getProducts(),
                storage.getUsers()
            ]);
            setComments(fetchedComments);
            setAllProducts(fetchedProducts.items);
            setUsers(fetchedUsers);
        };
        loadInitialData();
    }, [config.id]);

    // Update listeners
    React.useEffect(() => {
        const refreshComments = async () => {
            const all = await storage.getComments(config.id);
            setComments(all);
        };
        window.addEventListener('xiaoyu-comment-update', refreshComments);
        return () => window.removeEventListener('xiaoyu-comment-update', refreshComments);
    }, [config.id]);

    const getHardwareDetail = (id: string) => {
        const p = allProducts.find(i => i.id === id);
        if (p) return p;
        return HARDWARE_DB.find(i => i.id === id);
    };

    const [previewImage, setPreviewImage] = React.useState<string | null>(null);
    const [isCopied, setIsCopied] = React.useState(false);

    const handleCopyLink = () => {
        const textLines = [
            `[小鱼装机] 配置清单: ${config.title}`,
            `------------------`
        ];

        Object.entries(config.items).forEach(([cat, itemId]) => {
            const category = cat as keyof typeof CATEGORY_MAP;
            const item = getHardwareDetail(itemId as string);
            if (item) {
                textLines.push(`${CATEGORY_MAP[category]}: ${item.brand} ${item.model}`);
            }
        });

        textLines.push(`------------------`);
        textLines.push(`总价: ¥${config.price}`);
        textLines.push(`详情: https://xiaoyu.pc/config/${config.id}`);

        const shareText = textLines.join('\n');

        if (navigator.clipboard) {
            navigator.clipboard.writeText(shareText).then(() => {
                setIsCopied(true);
                showToast('✅ 配置清单已复制');
                setTimeout(() => setIsCopied(false), 2000);
            });
        }
    };

    const handleSendComment = async () => {
        if (!currentUser) {
            showToast('🔒 请先登录');
            window.dispatchEvent(new Event('xiaoyu-trigger-login'));
            return;
        }

        if (!commentText.trim()) return;

        const newComment = {
            id: `cmt-${Date.now()}`,
            configId: config.id,
            userId: currentUser.id,
            userName: currentUser.username,
            content: commentText,
            createdAt: new Date().toISOString(),
            status: 'active'
        };

        // @ts-ignore
        await storage.saveComment(newComment);
        setCommentText('');
        showToast('评论已发布');
    };

    const QUICK_REPLIES = ['大佬牛逼！', '抄作业了', '性价比很高', '颜值爆表', '求配置单'];

    // Close on Escape key
    React.useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-[80] flex items-end md:items-center justify-center md:p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in cursor-pointer"
            onClick={onClose}
        >
            {/* Lightbox Overlay */}
            {previewImage && (
                <div
                    className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 animate-fade-in"
                    onClick={(e) => {
                        e.stopPropagation();
                        setPreviewImage(null);
                    }}
                >
                    <img
                        src={previewImage}
                        alt="Preview"
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl scale-100 animate-scale-in"
                    />
                    <button
                        className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors"
                        onClick={() => setPreviewImage(null)}
                    >
                        <X size={32} />
                    </button>
                </div>
            )}

            <div
                className="bg-white w-full md:max-w-6xl h-[95vh] md:h-[90vh] rounded-t-[24px] md:rounded-[24px] shadow-2xl overflow-hidden flex flex-col md:flex-row relative cursor-default animate-slide-up md:animate-scale-up"
                onClick={e => e.stopPropagation()}
            >

                {/* LEFT MAIN: Specs List (Flex-1) */}
                <div className="flex-1 bg-slate-50/50 flex flex-col min-h-0 relative">

                    {/* Header Layout: Title in Center/Left, Price on Right */}
                    <div className="px-4 md:px-8 py-3 md:py-5 border-b border-slate-200/60 bg-white/80 backdrop-blur-md flex items-center sticky top-0 z-10 gap-2 md:gap-4">
                        <div className="flex-1 min-w-0">
                            <h2 className="text-base md:text-xl font-extrabold text-slate-900 truncate tracking-tight">{config.title}</h2>
                            <div className="flex items-center gap-2 text-[10px] md:text-xs font-bold text-slate-400 mt-0.5">
                                <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">配置清单</span>
                                <span>•</span>
                                <span>共 {Object.keys(config.items).length} 件硬件</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right">
                                <div className="text-[10px] md:text-sm font-bold text-slate-400 uppercase tracking-wider">总价</div>
                                <div className="text-lg md:text-2xl font-mono font-black text-indigo-600 leading-none">
                                    ¥{config.price}
                                </div>
                            </div>
                            {/* Mobile Close Button */}
                            <button
                                onClick={onClose}
                                className="md:hidden p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
                        <div className="space-y-1.5">
                            {Object.entries(config.items).map(([cat, itemId]) => {
                                const category = cat as keyof typeof CATEGORY_MAP;
                                const item = getHardwareDetail(itemId as string);
                                const isCore = ['cpu', 'gpu', 'mainboard'].includes(category);

                                if (!item) return (
                                    <div key={category} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 opacity-60">
                                        <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center text-slate-400 scale-90">
                                            {getIconByCategory(category)}
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-[10px] text-slate-400 font-bold">商品已下架</div>
                                            <div className="text-xs font-mono text-slate-300">ID: {itemId}</div>
                                        </div>
                                    </div>
                                );
                                return (
                                    <div key={category} className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all duration-300 group ${isCore
                                        ? 'bg-gradient-to-r from-indigo-50/80 to-white/60 border-indigo-100 shadow-sm hover:shadow-md'
                                        : 'bg-white border-slate-100 hover:border-indigo-100 hover:shadow-md'
                                        }`}>
                                        <div
                                            className="relative w-12 md:w-14 h-12 md:h-14 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300 overflow-hidden border-[2px] border-white shadow-sm ring-1 ring-slate-200 bg-slate-100 cursor-zoom-in group-hover:shadow-md group-hover:ring-indigo-200"
                                            onClick={(e) => {
                                                if (item.image) {
                                                    e.stopPropagation();
                                                    setPreviewImage(item.image);
                                                }
                                            }}
                                        >
                                            {item.image ? (
                                                <img src={item.image} alt={item.model} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                            ) : (
                                                <div className="scale-110 opacity-50 grayscale group-hover:grayscale-0 transition-all">
                                                    {getIconByCategory(category)}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 pl-1">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${isCore ? 'bg-indigo-100/80 text-indigo-700' : 'bg-slate-100 text-slate-500'
                                                    }`}>{CATEGORY_MAP[category]}</span>
                                            </div>
                                            <div className={`text-sm truncate ${isCore ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`} title={`${item.brand} ${item.model}`}>
                                                {item.brand} {item.model}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-mono font-bold text-base text-slate-800">¥{item.price}</div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Mobile Action Bar */}
                    <div className="md:hidden flex items-center gap-3 p-4 border-t border-slate-200 bg-white shrink-0">
                        <button
                            onClick={() => onToggleLike(config.id)}
                            className={`p-3 rounded-xl border transition-all ${config.isLiked
                                ? 'bg-pink-50 border-pink-200 text-pink-500'
                                : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-pink-500'
                                }`}
                        >
                            <Heart size={20} className={config.isLiked ? 'fill-pink-500' : ''} />
                        </button>
                        <button
                            onClick={() => handleCopyLink()}
                            className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-400 hover:text-indigo-500 transition-all"
                        >
                            <Share2 size={20} />
                        </button>
                        <button
                            onClick={onLoad}
                            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
                        >
                            <CheckCircle2 size={18} />
                            <span>加载此配置</span>
                        </button>
                    </div>
                </div>

                {/* RIGHT SIDEBAR: Info & Comments (Fixed Width, Hidden on Mobile) */}
                <div className="hidden md:flex md:w-[380px] bg-white border-l border-slate-100 flex-col h-full z-20 shadow-[-10px_0_40px_rgba(0,0,0,0.02)] relative">

                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-3 right-3 z-50 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all group active:scale-90"
                        title="Close (Esc)"
                    >
                        <X size={18} />
                    </button>

                    {/* ... (rest of sidebar content) */}
                    <div className="p-6 pb-4 border-b border-slate-100 bg-white">
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`w-12 h-12 rounded-full ${config.avatarColor} border-2 border-white shadow-md flex items-center justify-center text-lg text-white font-bold flex-shrink-0 relative`}>
                                {config.author[0].toUpperCase()}
                                {(() => {
                                    const authorUser = config.userId ? users.find(u => u.id === config.userId) : users.find(u => u.username === config.author);
                                    const isVip = authorUser && (['admin', 'streamer', 'sub_admin'].includes(authorUser.role) || (authorUser.vipExpireAt && authorUser.vipExpireAt > Date.now()));

                                    if (isVip) {
                                        return (
                                            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                                                <img src="https://api.iconify.design/noto:crown.svg" className="w-4 h-4" alt="VIP" />
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <div className="font-bold text-slate-900 text-base truncate max-w-[150px]" title={config.author}>{config.author}</div>
                                    {(() => {
                                        const authorUser = config.userId ? users.find(u => u.id === config.userId) : users.find(u => u.username === config.author);
                                        const isVip = authorUser && (['admin', 'streamer', 'sub_admin'].includes(authorUser.role) || (authorUser.vipExpireAt && authorUser.vipExpireAt > Date.now()));

                                        if (isVip) {
                                            return (
                                                <span className="text-[9px] font-bold text-black bg-gradient-to-r from-amber-300 to-amber-500 px-1.5 py-0 rounded-full">
                                                    SVIP
                                                </span>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                                    {config.serialNumber && <span className="font-mono">NO.{config.serialNumber.split('-')[1] || config.serialNumber}</span>}
                                    <span>•</span>
                                    <span>{new Date(config.date).toLocaleDateString()}</span>
                                </div>
                            </div>
                            {config.isLiked && <Heart size={20} className="text-pink-500 fill-pink-500" />}
                        </div>

                        {config.description && (
                            <p className="text-sm text-slate-600 leading-relaxed mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                {config.description}
                            </p>
                        )}

                        {/* Tags */}
                        <div className="flex gap-2 flex-wrap mb-4">
                            {config.tags.map(t => (
                                <span key={t.label} className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full font-bold">
                                    #{t.label}
                                </span>
                            ))}
                        </div>

                        {/* Action Buttons Row */}
                        <div className="flex gap-2">
                            <button onClick={() => onToggleLike(config.id)} className={`flex-1 py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all text-xs active:scale-95 ripple ${config.isLiked ? 'bg-pink-50 text-pink-600 border border-pink-200' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'}`}>
                                <Heart size={14} className={config.isLiked ? 'fill-current' : ''} />
                                {config.likes > 0 ? config.likes : '点赞'}
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopyLink();
                                }}
                                className={`flex-1 py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 text-xs relative active:scale-95 ripple ${isCopied ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                            >
                                {isCopied ? <CheckCircle2 size={14} /> : <Share2 size={14} />}
                                {isCopied ? '已复制' : '分享'}
                            </button>
                            <button onClick={onLoad} className="flex-1 py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-indigo-600 transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-1.5 text-sm active:scale-95 ripple">
                                🚀 修改/编辑
                            </button>
                        </div>
                    </div>

                    {/* 2. Comments Section (Auto-scroll) */}
                    <div className="flex-1 flex flex-col min-h-0 bg-slate-50/30">
                        <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-700">社区评论 ({comments.length})</span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 pr-2 mr-1 space-y-4 custom-scrollbar">
                            {comments.map(c => (
                                <div key={c.id} className="flex gap-3 text-sm animate-fade-in">
                                    <div className={`w-8 h-8 rounded-full ${c.userId === 'admin' ? 'bg-indigo-600' : 'bg-slate-400'} flex-shrink-0 flex items-center justify-center text-white text-xs font-bold border border-white shadow-sm`}>
                                        {c.userName ? c.userName[0].toUpperCase() : 'U'}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-baseline justify-between mb-1">
                                            <span className="font-bold text-slate-800 text-xs">{c.userName}</span>
                                            <span className="text-[10px] text-slate-400">{new Date(c.createdAt).toLocaleString()}</span>
                                        </div>
                                        <div className="bg-white p-2.5 rounded-2xl rounded-tl-none border border-slate-200 text-slate-600 shadow-sm relative group">
                                            {c.content}
                                            {/* Deletion for Admin or Author */}
                                            {(currentUser?.role === 'admin' || currentUser?.id === c.userId) && (
                                                <button
                                                    onClick={() => {
                                                        setDeleteCommentId(c.id);
                                                        setIsDeleteModalOpen(true);
                                                    }}
                                                    className="absolute -right-2 -top-2 bg-slate-200 text-slate-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
                                                >
                                                    <X size={10} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {comments.length === 0 && (
                                <div className="text-center py-10 text-slate-400 text-sm">
                                    暂无评论，快来抢沙发！
                                </div>
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-white border-t border-slate-100 shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
                            <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar pb-1">
                                {QUICK_REPLIES.map(reply => (
                                    <button
                                        key={reply}
                                        onClick={() => setCommentText(reply)}
                                        className="whitespace-nowrap px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] md:text-xs rounded-full font-medium transition-colors active:scale-90 ripple"
                                    >
                                        {reply}
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-2 items-end">
                                <textarea
                                    value={commentText}
                                    onChange={e => setCommentText(e.target.value)}
                                    placeholder={currentUser ? "说点什么..." : "登录后发表评论"}
                                    disabled={!currentUser}
                                    className={`flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none h-[42px] max-h-[80px] ${!currentUser ? 'opacity-60 cursor-not-allowed' : ''}`}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendComment();
                                        }
                                    }}
                                />
                                <button
                                    onClick={handleSendComment}
                                    disabled={!commentText.trim()}
                                    className="bg-indigo-600 disabled:bg-slate-200 disabled:text-slate-400 text-white h-[42px] px-4 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-sm active:scale-95 ripple"
                                >
                                    发送
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Confirm Delete Comment Modal */}
            <ConfirmModal
                isOpen={isDeleteModalOpen}
                title="删除评论"
                description="确定要删除这条评论吗？此操作无法撤销。"
                confirmText="删除"
                isDangerous={true}
                isLoading={isDeleting}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={async () => {
                    if (deleteCommentId) {
                        setIsDeleting(true);
                        try {
                            await storage.deleteComment(deleteCommentId);
                            setIsDeleteModalOpen(false);
                            setDeleteCommentId(null);
                        } catch (err) {
                            console.error(err);
                            showToast('删除失败');
                        } finally {
                            setIsDeleting(false);
                        }
                    }
                }}
            />
        </div>
    );
}
