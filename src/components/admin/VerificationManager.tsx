
import { useState, useEffect } from 'react';
import { Search, Trash2, RefreshCcw, Mail, Clock, ShieldCheck, XCircle } from 'lucide-react';
import { storage } from '../../services/storage';
import Pagination from '../common/Pagination';
import ConfirmModal from '../common/ConfirmModal';

export default function VerificationManager() {
    const [verifications, setVerifications] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(20);
    const [loading, setLoading] = useState(false);
    const [searchEmail, setSearchEmail] = useState('');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const result = await storage.getEmailVerifications(page, pageSize, searchEmail);
            setVerifications(result.items);
            setTotal(result.total);
        } catch (error) {
            console.error('Failed to load verifications:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [page]);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (page !== 1) setPage(1);
            else loadData();
        }, 500);
        return () => clearTimeout(timer);
    }, [searchEmail]);

    const handleDelete = async () => {
        if (deleteId === null) return;
        setIsDeleting(true);
        try {
            const success = await storage.deleteEmailVerification(deleteId);
            if (success) {
                loadData();
                setIsDeleteModalOpen(false);
            } else {
                alert('删除失败');
            }
        } finally {
            setIsDeleting(false);
        }
    };

    const isExpired = (expiresAt: string) => {
        return new Date(expiresAt) < new Date();
    };

    return (
        <div className="space-y-6">
            {/* Header / Search */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div>
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Mail className="text-indigo-600" size={20} />
                        邮箱验证码管理
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">查看和管理系统生成的 6 位验证码记录</p>
                </div>

                <div className="flex w-full md:w-auto gap-2">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="搜邮箱..."
                            value={searchEmail}
                            onChange={e => setSearchEmail(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        />
                    </div>
                    <button
                        onClick={() => loadData()}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
                        title="刷新"
                    >
                        <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                            <tr>
                                <th className="px-6 py-4 font-bold">邮箱地址</th>
                                <th className="px-6 py-4 font-bold">验证码</th>
                                <th className="px-6 py-4 font-bold">生成时间</th>
                                <th className="px-6 py-4 font-bold">过期时间</th>
                                <th className="px-6 py-4 font-bold">状态</th>
                                <th className="px-6 py-4 font-bold text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {verifications.map((item) => {
                                const expired = isExpired(item.expiresAt);
                                return (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-700">{item.email}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-mono font-bold text-indigo-600 text-lg tracking-wider">
                                                {item.code}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">
                                            <div className="flex items-center gap-1.5 grayscale opacity-70">
                                                <Clock size={14} />
                                                {new Date(item.createdAt).toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">
                                            {new Date(item.expiresAt).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            {expired ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold">
                                                    <XCircle size={10} /> 已过期
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600 text-[10px] font-bold">
                                                    <ShieldCheck size={10} /> 有效中
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => { setDeleteId(item.id); setIsDeleteModalOpen(true); }}
                                                className="text-slate-400 hover:text-red-600 p-2 transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {verifications.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                                        暂无验证码记录
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {loading && (
                    <div className="flex justify-center items-center py-20 bg-white/50 backdrop-blur-[1px]">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                )}
            </div>

            <Pagination
                currentPage={page}
                totalItems={total}
                pageSize={pageSize}
                onPageChange={setPage}
            />

            <ConfirmModal
                isOpen={isDeleteModalOpen}
                title="确认删除记录"
                description="您确定要删除这条验证码记录吗？此操作无法撤销，但不会影响已完成的注册。"
                confirmText="确认删除"
                isDangerous={true}
                isLoading={isDeleting}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDelete}
            />
        </div>
    );
}
