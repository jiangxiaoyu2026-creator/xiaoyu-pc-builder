import { useState, useEffect } from 'react';
import { Gift, Plus, RefreshCw, Copy, ChevronLeft, ChevronRight } from 'lucide-react';

interface InvitationCode {
    code: string;
    creatorId: string;
    maxUses: number;
    usedCount: number;
    createdAt: string;
    status: string;
}

export default function InvitationManager() {
    const [codes, setCodes] = useState<InvitationCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [page, setPage] = useState(1);

    const fetchCodes = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('xiaoyu_token');
            const res = await fetch(`/api/invitations/list?page=${page}&page_size=20`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.items) {
                setCodes(data.items);
            }
        } catch (error) {
            console.error('获取邀请码失败', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCodes();
    }, [page]);

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const token = localStorage.getItem('xiaoyu_token');
            const res = await fetch('/api/invitations/batch-generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ count: 5, maxUses: 3 })
            });
            if (res.ok) {
                fetchCodes();
            }
        } catch (error) {
            console.error('生成邀请码失败', error);
        } finally {
            setGenerating(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        // Could add toast notification here
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Gift size={20} className="text-indigo-600" />
                        注册邀请码管理
                    </h2>
                    <p className="text-sm text-slate-500">管理新用户注册所需的邀请码</p>
                </div>
                <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-70 font-medium"
                >
                    {generating ? <RefreshCw size={18} className="animate-spin" /> : <Plus size={18} />}
                    批量生成 (5个)
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="px-6 py-4 font-semibold text-slate-700">邀请码</th>
                            <th className="px-6 py-4 font-semibold text-slate-700">使用情况</th>
                            <th className="px-6 py-4 font-semibold text-slate-700">状态</th>
                            <th className="px-6 py-4 font-semibold text-slate-700">创建时间</th>
                            <th className="px-6 py-4 font-semibold text-slate-700">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">加载中...</td></tr>
                        ) : codes.length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">暂无邀请码，请点击生成</td></tr>
                        ) : codes.map((code) => (
                            <tr key={code.code} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 font-mono font-bold text-slate-700 tracking-wide">{code.code}</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${code.usedCount >= code.maxUses ? 'bg-slate-400' : 'bg-indigo-500'}`}
                                                style={{ width: `${Math.min(100, (code.usedCount / code.maxUses) * 100)}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-slate-500 font-medium">{code.usedCount}/{code.maxUses}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2.5 py-1 text-xs rounded-full font-bold ${code.usedCount >= code.maxUses
                                        ? 'bg-slate-100 text-slate-400'
                                        : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                        }`}>
                                        {code.usedCount >= code.maxUses ? '已用完' : '有效'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-slate-500 font-medium">
                                    {new Date(code.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className="px-6 py-4">
                                    <button
                                        onClick={() => copyToClipboard(code.code)}
                                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                        title="复制邀请码"
                                    >
                                        <Copy size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-center">
                <div className="flex gap-2 items-center">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white text-slate-600 transition-colors"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <span className="px-3 py-1 text-sm font-medium text-slate-600 bg-slate-50 rounded-lg">第 {page} 页</span>
                    <button
                        onClick={() => setPage(p => p + 1)}
                        disabled={codes.length < 20}
                        className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white text-slate-600 transition-colors"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}

