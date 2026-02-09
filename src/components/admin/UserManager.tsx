
import { useState, useEffect } from 'react';
import { User, Shield, UserPlus, Trash2, Ban, CheckCircle2, Crown, Calendar, Lock } from 'lucide-react';
import { storage } from '../../services/storage';
import { UserItem } from '../../types/adminTypes';

// VIP 时长选项
const VIP_OPTIONS = [
    { label: '1天', days: 1 },
    { label: '7天', days: 7 },
    { label: '30天', days: 30 },
    { label: '90天', days: 90 },
    { label: '365天', days: 365 },
];

export default function UserManager() {
    const [users, setUsers] = useState<UserItem[]>([]);
    const [newUser, setNewUser] = useState({ username: '', password: '', role: 'user' as UserItem['role'] });
    const [showVipModal, setShowVipModal] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await storage.getUsers();
            setUsers(data);
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddUser = async () => {
        if (!newUser.username || !newUser.password) return alert('请输入用户名和密码');
        if (users.some(u => u.username === newUser.username)) return alert('用户已存在');

        const user: any = {
            username: newUser.username,
            password: newUser.password,
            role: newUser.role,
            status: 'active'
        };

        try {
            await storage.saveUser(user);
            await fetchUsers();
            setNewUser({ username: '', password: '', role: 'user' });
        } catch (error) {
            alert('添加用户失败');
        }
    };

    const handleDelete = async (id: string, isSelf: boolean) => {
        if (isSelf) return alert('不能删除自己');
        if (confirm('确定删除该用户吗？')) {
            // 目前后端可能未实现物理删除接口给前端，通常管理员建议使用封禁
            alert('为了数据安全，目前请使用“封禁”功能来限制用户访问。');
        }
    };

    const toggleStatus = async (user: UserItem) => {
        const id = user.id || (user as any)._id;
        const currentId = storage.getCurrentUser()?.id || (storage.getCurrentUser() as any)?._id;

        if (user.role === 'admin' && id === currentId) {
            return alert('不能封禁自己');
        }

        const newStatus = user.status === 'active' ? 'banned' : 'active';
        try {
            await storage.saveUser({ ...user, status: newStatus });
            await fetchUsers();
        } catch (error) {
            alert('更新状态失败');
        }
    };

    const setVipDays = async (userId: string, days: number) => {
        try {
            await storage.updateUserVIP(userId, days);
            await fetchUsers();
            setShowVipModal(null);
        } catch (error) {
            alert('设置 VIP 失败');
        }
    };

    const removeVip = async (userId: string) => {
        const user = users.find(u => u.id === userId || (u as any)._id === userId);
        if (user) {
            try {
                await storage.saveUser({ ...user, vipExpireAt: undefined } as any);
                await fetchUsers();
            } catch (error) {
                alert('取消 VIP 失败');
            }
        }
    };

    const isVip = (user: UserItem) => user.vipExpireAt && new Date(user.vipExpireAt).getTime() > Date.now();
    const vipUsers = users.filter(isVip);

    const formatVipExpire = (timestamp: number) => {
        const expireTime = new Date(timestamp).getTime();
        const days = Math.ceil((expireTime - Date.now()) / (24 * 60 * 60 * 1000));
        if (days <= 0) return '已过期';
        if (days === 1) return '今天到期';
        return `剩余 ${days} 天`;
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <User size={20} className="text-indigo-600" />
                        用户与权限管理
                    </h3>
                    <div className="flex gap-2">
                        <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded font-bold">总用户: {users.length}</span>
                        <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-1 rounded font-bold">管理员: {users.filter(u => u.role === 'admin').length}</span>
                        <span className="text-xs bg-amber-50 text-amber-600 px-2 py-1 rounded font-bold flex items-center gap-1">
                            <Crown size={12} /> VIP: {vipUsers.length}
                        </span>
                    </div>
                </div>

                {/* Add User Bar */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-wrap gap-3 mb-6">
                    <div className="flex-1 flex gap-2 min-w-[300px]">
                        <div className="flex-1 relative">
                            <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-indigo-500"
                                placeholder="新用户名..."
                                value={newUser.username}
                                onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                            />
                        </div>
                        <div className="flex-1 relative">
                            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-indigo-500"
                                type="password"
                                placeholder="设置密码..."
                                value={newUser.password}
                                onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                            />
                        </div>
                    </div>
                    <select
                        className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
                        value={newUser.role}
                        onChange={e => setNewUser({ ...newUser, role: e.target.value as any })}
                    >
                        <option value="user">普通用户</option>
                        <option value="streamer">小主播 (Streamer)</option>
                        <option value="admin">管理员 (Admin)</option>
                    </select>
                    <button
                        onClick={handleAddUser}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 transition"
                    >
                        <UserPlus size={16} /> 添加用户
                    </button>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-sm font-medium">正在获取用户列表...</p>
                    </div>
                ) : (
                    /* User List */
                    <div className="space-y-3">
                        {users.map(user => {
                            const userId = user.id || (user as any)._id;
                            const currentId = storage.getCurrentUser()?.id || (storage.getCurrentUser() as any)?._id;

                            return (
                                <div key={userId} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <div className={`relative w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm
                                            ${user.role === 'admin' ? 'bg-indigo-600' : user.role === 'streamer' ? 'bg-purple-500' : 'bg-slate-400'}
                                            ${user.status === 'banned' ? 'grayscale opacity-50' : ''}
                                        `}>
                                            {user.username[0].toUpperCase()}
                                            {isVip(user) && (
                                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-md">
                                                    <Crown size={10} className="text-white" />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className={`font-bold ${user.status === 'banned' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                                    {user.username}
                                                </span>
                                                {user.role === 'admin' && <Shield size={12} className="text-indigo-600" />}
                                                {isVip(user) && (
                                                    <span className="text-[10px] bg-gradient-to-r from-amber-400 to-orange-500 text-white px-1.5 py-0.5 rounded-full font-bold">
                                                        VIP
                                                    </span>
                                                )}
                                                {userId === currentId && <span className="text-[10px] bg-slate-200 px-1.5 rounded text-slate-600">我</span>}
                                            </div>
                                            <div className="flex items-center gap-3 mt-1">
                                                <select
                                                    value={user.role}
                                                    onChange={async (e) => {
                                                        const newRole = e.target.value as UserItem['role'];
                                                        if (userId === currentId && newRole !== 'admin') {
                                                            alert('不能取消自己的管理员权限');
                                                            return;
                                                        }
                                                        await storage.saveUser({ ...user, role: newRole });
                                                        await fetchUsers();
                                                    }}
                                                    className="text-xs border border-slate-200 rounded px-1.5 py-0.5 bg-slate-50 text-slate-600 outline-none focus:border-indigo-500 cursor-pointer hover:bg-white transition-colors"
                                                >
                                                    <option value="user">User (普通)</option>
                                                    <option value="streamer">Streamer (主播)</option>
                                                    <option value="admin">Admin (管理)</option>
                                                </select>

                                                <div className="h-3 w-[1px] bg-slate-200"></div>

                                                {isVip(user) ? (
                                                    <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                                                        <Calendar size={10} />
                                                        {formatVipExpire(user.vipExpireAt!)}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-400">
                                                        {user.lastLogin ? `登录: ${new Date(user.lastLogin).toLocaleDateString()}` : '从未登录'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {/* VIP Button */}
                                        <div className="relative">
                                            <button
                                                onClick={() => setShowVipModal(showVipModal === userId ? null : userId)}
                                                className={`p-2 rounded-lg transition-colors ${isVip(user) ? 'text-amber-500 bg-amber-50' : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50'}`}
                                                title="VIP 管理"
                                            >
                                                <Crown size={18} />
                                            </button>

                                            {/* VIP Dropdown */}
                                            {showVipModal === userId && (
                                                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-10 p-2">
                                                    <div className="text-xs font-bold text-slate-500 px-2 py-1 mb-1">设置 VIP 时长</div>
                                                    {VIP_OPTIONS.map(opt => (
                                                        <button
                                                            key={opt.days}
                                                            onClick={() => setVipDays(userId, opt.days)}
                                                            className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-amber-50 hover:text-amber-700 transition-colors"
                                                        >
                                                            + {opt.label}
                                                        </button>
                                                    ))}
                                                    {isVip(user) && (
                                                        <>
                                                            <div className="border-t border-slate-100 my-1"></div>
                                                            <button
                                                                onClick={() => removeVip(userId)}
                                                                className="w-full text-left px-3 py-2 text-sm text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                                                            >
                                                                取消 VIP
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => toggleStatus(user)}
                                            className={`p-2 rounded-lg transition-colors ${user.status === 'active' ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                                            title={user.status === 'active' ? '封禁' : '解封'}
                                        >
                                            {user.status === 'active' ? <Ban size={18} /> : <CheckCircle2 size={18} />}
                                        </button>
                                        <button
                                            onClick={() => handleDelete(userId, userId === currentId)}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="删除"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
