import { useState, useMemo, useEffect } from 'react';
import { Search, Trash2, MessageSquare } from 'lucide-react';
import { storage } from '../../services/storage';
import { CommentItem } from '../../types/adminTypes';
import ConfirmModal from '../common/ConfirmModal';

export default function CommentManager() {
    const [comments, setComments] = useState<CommentItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Confirm Modal State
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);


    const refreshComments = async () => {
        const all = await storage.getComments();
        setComments(all);
    };

    useEffect(() => {
        refreshComments();
    }, []);

    const confirmDelete = (id: string) => {
        setDeleteId(id);
        setIsDeleteModalOpen(true);
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        setIsDeleting(true);
        try {
            await storage.deleteComment(deleteId);
            await refreshComments();
            setIsDeleteModalOpen(false);
            setDeleteId(null);
        } catch (error) {
            console.error('Failed to delete comment:', error);
            alert('删除失败');
        } finally {
            setIsDeleting(false);
        }
    };

    const filteredComments = useMemo(() => {
        return comments.filter(c =>
            c.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.userId.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [comments, searchTerm]);

    const handleRefresh = async () => {
        await refreshComments();
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">全站评论管理</h2>
                    <p className="text-slate-500 mt-1">管理所有用户配置单下的留言互动</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={handleRefresh} className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg transition-all">
                        刷新
                    </button>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="搜索评论内容/用户..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-64 shadow-sm"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/50 text-xs uppercase tracking-wider text-slate-500 font-bold">
                                <th className="px-6 py-4 w-48">发布用户</th>
                                <th className="px-6 py-4">评论内容</th>
                                <th className="px-6 py-4 w-40">关联配置单</th>
                                <th className="px-6 py-4 w-40 text-center">发布时间</th>
                                <th className="px-6 py-4 w-24 text-center">状态</th>
                                <th className="px-6 py-4 w-24 text-center">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredComments.map(comment => (
                                <tr key={comment.id} className="hover:bg-slate-50/80 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-bold border border-white shadow-sm">
                                                {comment.userName[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800 text-sm">{comment.userName}</div>
                                                <div className="text-[10px] text-slate-400 font-mono">ID: {comment.userId}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-slate-600 text-sm max-w-md break-words bg-slate-50 p-2 rounded-lg border border-slate-100 group-hover:bg-white group-hover:border-indigo-100 transition-colors">
                                            {comment.content}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-xs text-slate-500 font-mono flex items-center gap-1">
                                            <span>#{comment.configId.slice(-6)}</span>
                                            {/* In a real app we would link to the config detail admin page or public page */}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="text-xs text-slate-400">
                                            {new Date(comment.createdAt).toLocaleDateString()}
                                            <div className="text-[10px] opacity-75">{new Date(comment.createdAt).toLocaleTimeString()}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${comment.status === 'active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-400'}`}>
                                            {comment.status === 'active' ? '正常' : '隐藏'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button
                                            onClick={() => confirmDelete(comment.id)}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                            title="删除评论"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredComments.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-3">
                                            <MessageSquare size={32} className="text-slate-200" />
                                            <p>暂无相关评论记录</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* Confirm Delete Modal */}
            <ConfirmModal
                isOpen={isDeleteModalOpen}
                title="确认删除评论"
                description="确定要删除这条评论吗？此操作无法撤销。"
                confirmText="确认删除"
                isDangerous={true}
                isLoading={isDeleting}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDelete}
            />
        </div>
    );
}
