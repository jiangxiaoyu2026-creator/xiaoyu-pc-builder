
import { useState, useEffect } from 'react';
import { UserPlus, Trash2, Ban, CheckCircle2, KeyRound, Mic2 } from 'lucide-react';
import { storage } from '../../services/storage';
import { UserItem } from '../../types/adminTypes';

export default function StreamerManager() {
    // Filter only streamers
    const [users, setUsers] = useState<UserItem[]>([]);
    const [newStreamer, setNewStreamer] = useState({ username: '' });
    const [lastReset, setLastReset] = useState<string | null>(null);
    const [passwordModal, setPasswordModal] = useState<{ isOpen: boolean, username: string, userId: string }>({ isOpen: false, username: '', userId: '' });
    const [newPassword, setNewPassword] = useState('');

    const refreshStreamers = async () => {
        const allUsers = await storage.getUsers();
        setUsers(allUsers.filter(u => u.role === 'streamer'));
    };

    useState(() => {
        refreshStreamers();
    });

    useEffect(() => {
        refreshStreamers();
    }, []);

    const handleAddStreamer = async () => {
        if (!newStreamer.username) return alert('请输入主播用户名');

        const allUsers = await storage.getUsers();
        if (allUsers.some(u => u.username === newStreamer.username)) return alert('该用户名已存在');

        const user: UserItem = {
            id: `u-${Date.now()}`,
            username: newStreamer.username,
            role: 'streamer',
            status: 'active',
            lastLogin: ''
        };
        await storage.saveUser(user);
        await refreshStreamers();
        setNewStreamer({ username: '' });
    };

    const handleDelete = async (id: string) => {
        if (confirm('确定删除该主播账号吗？删除后不可恢复。')) {
            const allUsers = (await storage.getUsers()).filter(u => u.id !== id);
            await storage.saveUsers(allUsers);
            await refreshStreamers();
        }
    };

    const toggleStatus = async (user: UserItem) => {
        const newStatus = user.status === 'active' ? 'banned' : 'active';
        user.status = newStatus;
        await storage.saveUser(user);
        await refreshStreamers();
    };

    const handleOpenPasswordModal = (user: UserItem) => {
        setPasswordModal({ isOpen: true, username: user.username, userId: user.id });
        setNewPassword('');
    };

    const handleSavePassword = async () => {
        if (!newPassword) return alert('请输入新密码');
        const allUsers = await storage.getUsers();
        const targetIndex = allUsers.findIndex(u => u.id === passwordModal.userId);
        if (targetIndex !== -1) {
            allUsers[targetIndex].password = newPassword;
            await storage.saveUsers(allUsers);
            await refreshStreamers();
            setLastReset(`✅ ${passwordModal.username} 的密码已更新`);
            setTimeout(() => setLastReset(null), 3000);
            setPasswordModal({ isOpen: false, username: '', userId: '' });
        }
    };

    return (
        <div className="space-y-6">
            {/* Password Modal */}
            {passwordModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl p-6 w-96 shadow-2xl animate-scale-up">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">重置密码 - {passwordModal.username}</h3>
                        <input
                            type="text"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:border-indigo-500"
                            placeholder="输入新密码"
                            autoFocus
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setPasswordModal({ isOpen: false, username: '', userId: '' })} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg text-sm font-bold">取消</button>
                            <button onClick={handleSavePassword} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700">保存</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Mic2 size={24} className="text-purple-600" />
                        主播中心 & 密码管理
                    </h3>
                    <div className="flex gap-2">
                        <span className="text-xs bg-purple-50 text-purple-600 px-3 py-1 rounded-full font-bold">入驻主播: {users.length}</span>
                    </div>
                </div>

                {/* Add Streamer Bar */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex gap-3 mb-6">
                    <input
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-500"
                        placeholder="新主播用户名..."
                        value={newStreamer.username}
                        onChange={e => setNewStreamer({ username: e.target.value })}
                        onKeyDown={e => e.key === 'Enter' && handleAddStreamer()}
                    />
                    <button
                        onClick={handleAddStreamer}
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-purple-700 transition shadow-md shadow-purple-100"
                    >
                        <UserPlus size={16} /> 添加主播
                    </button>
                </div>

                {lastReset && (
                    <div className="mb-4 bg-emerald-50 text-emerald-700 px-4 py-3 rounded-xl border border-emerald-100 font-bold text-sm animate-fade-in flex items-center gap-2">
                        <CheckCircle2 size={16} /> {lastReset}
                    </div>
                )}

                {/* Streamer List */}
                <div className="space-y-3">
                    {users.map(user => (
                        <div key={user.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors group">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white shadow-md text-lg
                                    ${user.status === 'banned' ? 'bg-slate-300 grayscale' : 'bg-gradient-to-br from-purple-500 to-indigo-600'}
                                `}>
                                    {user.username[0].toUpperCase()}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className={`font-bold text-base ${user.status === 'banned' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                            {user.username}
                                        </span>
                                        {user.status === 'banned' && <span className="text-[10px] bg-red-100 text-red-500 px-1.5 py-0.5 rounded font-bold">封禁中</span>}
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                                        <span>ID: {user.id}</span>
                                        <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                                        <span>{user.lastLogin ? `上次登录: ${new Date(user.lastLogin).toLocaleDateString()}` : '尚未登录'}</span>
                                        {user.password && <span className="text-emerald-600 font-medium ml-2">• 已设置密码</span>}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => handleOpenPasswordModal(user)}
                                    className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-300 rounded-lg transition-colors text-xs font-bold flex items-center gap-1.5 shadow-sm"
                                    title="设置密码"
                                >
                                    <KeyRound size={14} /> 设置密码
                                </button>

                                <div className="w-px h-4 bg-slate-200 mx-1"></div>

                                <button
                                    onClick={() => toggleStatus(user)}
                                    className={`p-2 rounded-lg transition-colors ${user.status === 'active' ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                                    title={user.status === 'active' ? '封禁账号' : '解封账号'}
                                >
                                    {user.status === 'active' ? <Ban size={18} /> : <CheckCircle2 size={18} />}
                                </button>
                                <button
                                    onClick={() => handleDelete(user.id)}
                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="删除账号"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                    {users.length === 0 && (
                        <div className="text-center py-10 text-slate-400">
                            暂无主播账号，请先添加
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
