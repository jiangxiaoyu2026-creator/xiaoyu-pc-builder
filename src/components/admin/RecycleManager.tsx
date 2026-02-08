import { useState, useMemo } from 'react';
import { Search, FileText, User, MessageCircle, Image, Clock, Eye, X, CheckCheck, Trash2 } from 'lucide-react';
import { RecycleRequest } from '../../types/adminTypes';
import { storage } from '../../services/storage';

export default function RecycleManager({ requests, setRequests }: { requests: RecycleRequest[], setRequests?: any }) {
    const [search, setSearch] = useState('');
    const [selectedRequest, setSelectedRequest] = useState<RecycleRequest | null>(null);
    const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'read'>('all');

    // 标记为已读
    const handleMarkAsRead = (id: string) => {
        storage.markRecycleRequestAsRead(id);
        if (setRequests) {
            setRequests(storage.getRecycleRequests());
        }
        if (selectedRequest?.id === id) {
            setSelectedRequest(prev => prev ? { ...prev, isRead: true } : null);
        }
    };

    // 删除申请
    const handleDelete = (id: string) => {
        if (!window.confirm('确定要删除这条回收申请吗？')) return;
        storage.deleteRecycleRequest(id);
        if (setRequests) {
            setRequests(storage.getRecycleRequests());
        }
        setSelectedRequest(null);
    };

    // Filter & Sort
    const filteredRequests = useMemo(() => {
        let result = [...requests];

        // 状态过滤
        if (statusFilter === 'unread') {
            result = result.filter(r => !r.isRead);
        } else if (statusFilter === 'read') {
            result = result.filter(r => r.isRead);
        }

        // 搜索过滤
        if (search.trim()) {
            const s = search.toLowerCase();
            result = result.filter(req =>
                req.description?.toLowerCase().includes(s) ||
                req.userName?.toLowerCase().includes(s) ||
                req.wechat?.toLowerCase().includes(s)
            );
        }

        // 按时间排序 (倒序)
        return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [requests, search, statusFilter]);

    const unreadCount = requests.filter(r => !r.isRead).length;

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-4">
                    <div className="text-sm text-slate-600">
                        共 <span className="font-bold text-slate-900">{requests.length}</span> 条回收申请
                        {unreadCount > 0 && (
                            <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full text-xs font-bold">
                                {unreadCount} 条未读
                            </span>
                        )}
                    </div>

                    {/* Status Tabs */}
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button
                            onClick={() => setStatusFilter('all')}
                            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${statusFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            全部
                        </button>
                        <button
                            onClick={() => setStatusFilter('unread')}
                            className={`px-3 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${statusFilter === 'unread' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            未读
                        </button>
                        <button
                            onClick={() => setStatusFilter('read')}
                            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${statusFilter === 'read' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            已读
                        </button>
                    </div>
                </div>

                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="搜索描述、用户、微信..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    />
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {filteredRequests.length === 0 ? (
                    <div className="py-16 text-center text-slate-400">
                        <FileText size={48} className="mx-auto mb-4 opacity-50" />
                        <p>暂无符合条件的申请</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {filteredRequests.map(req => (
                            <div key={req.id} className={`p-5 hover:bg-slate-50/50 transition-colors relative group ${!req.isRead ? 'bg-blue-50/30' : ''}`}>
                                {!req.isRead && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
                                )}

                                <div className="flex gap-4">
                                    {/* Image */}
                                    <div className="w-20 h-20 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 shrink-0">
                                        {req.image ? (
                                            <img
                                                src={req.image}
                                                alt="回收图片"
                                                className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                                                onClick={() => {
                                                    setSelectedRequest(req);
                                                    if (!req.isRead) handleMarkAsRead(req.id);
                                                }}
                                            />
                                        ) : (
                                            <Image size={24} className="text-slate-300" />
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            {!req.isRead && (
                                                <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></span>
                                            )}
                                            <p className="text-slate-800 text-sm font-medium leading-relaxed line-clamp-1">
                                                {req.description || '无描述'}
                                            </p>
                                        </div>

                                        {/* Meta */}
                                        <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-500">
                                            <div className="flex items-center gap-1.5">
                                                <User size={12} />
                                                <span>{req.userName}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
                                                <MessageCircle size={12} />
                                                <span>{req.wechat}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Clock size={12} />
                                                <span>{new Date(req.createdAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2">
                                        {!req.isRead && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleMarkAsRead(req.id);
                                                }}
                                                className="p-2 text-blue-500 hover:bg-blue-100 rounded-lg transition-colors"
                                                title="设为已读"
                                            >
                                                <CheckCheck size={18} />
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(req.id);
                                            }}
                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="删除"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSelectedRequest(req);
                                                if (!req.isRead) handleMarkAsRead(req.id);
                                            }}
                                            className="px-3 py-1.5 h-fit bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-sm"
                                        >
                                            <Eye size={14} />
                                            详情
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Request Detail Modal */}
            {selectedRequest && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
                    onClick={() => setSelectedRequest(null)}
                >
                    <div
                        className="relative max-w-2xl w-full bg-white rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setSelectedRequest(null)}
                            className="absolute top-6 right-6 p-2 bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-full transition-all z-10"
                        >
                            <X size={20} />
                        </button>

                        <div className="flex flex-col md:flex-row h-[500px]">
                            {/* Left: Image */}
                            <div className="md:w-1/2 bg-slate-100 flex items-center justify-center overflow-hidden border-r border-slate-100">
                                {selectedRequest.image ? (
                                    <img
                                        src={selectedRequest.image}
                                        alt="回收图片"
                                        className="w-full h-full object-contain"
                                    />
                                ) : (
                                    <Image size={64} className="text-slate-300" />
                                )}
                            </div>

                            {/* Right: Info */}
                            <div className="md:w-1/2 p-8 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${selectedRequest.isRead ? 'bg-slate-100 text-slate-500' : 'bg-blue-100 text-blue-600'}`}>
                                            {selectedRequest.isRead ? '已读申请' : '未读新申请'}
                                        </span>
                                        <span className="text-xs text-slate-400">
                                            {new Date(selectedRequest.createdAt).toLocaleString()}
                                        </span>
                                    </div>

                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">描述内容</h3>
                                    <div className="bg-slate-50 p-4 rounded-2xl mb-6">
                                        <p className="text-slate-800 text-sm leading-relaxed whitespace-pre-wrap">
                                            {selectedRequest.description || '暂无详细描述'}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">用户信息</h3>
                                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
                                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold shrink-0">
                                                    {selectedRequest.userName.charAt(0)}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-slate-900 truncate">{selectedRequest.userName}</p>
                                                    <p className="text-xs text-emerald-600 font-medium">微信：{selectedRequest.wechat}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-6 border-t border-slate-100">
                                    <button
                                        onClick={() => handleDelete(selectedRequest.id)}
                                        className="flex-1 py-3 bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-500 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
                                    >
                                        <Trash2 size={18} />
                                        删除该申请
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
