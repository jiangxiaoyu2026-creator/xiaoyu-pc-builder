import React, { useState } from 'react';
import { X, User, Lock, ArrowRight, Gift } from 'lucide-react';
import { UserItem } from '../../types/adminTypes';
import { storage } from '../../services/storage';

interface LoginModalProps {
    onClose: () => void;
    onLoginSuccess: (user: UserItem) => void;
    initialInviteCode?: string; // 来自 URL 的邀请码
}

export default function LoginModal({ onClose, onLoginSuccess, initialInviteCode }: LoginModalProps) {
    const [mode, setMode] = useState<'login' | 'register'>(() => initialInviteCode ? 'register' : 'login');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');



    // Captcha State (Removed)


    // Invite Code State - Mandatory
    const [inviteCode, setInviteCode] = useState(initialInviteCode || '');

    const [error, setError] = useState('');







    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (mode === 'login') {
            if (false) {
                // Email login removed
            } else {
                // Username password login
                const user = await storage.login(username, password);
                if (user) {
                    onLoginSuccess(user);
                    onClose();
                } else {
                    setError('用户名或密码错误');
                }
            }
        } else {
            // Register Validation
            if (!username) { setError('请输入用户名'); return; }
            if (username.length > 12) { setError('用户名长度需在12个字符以内'); return; }

            const forbidden = ['admin', 'system', 'root', '管理员', '官方', '客服', 'sb', '傻逼'];
            if (forbidden.some((w: string) => username.toLowerCase().includes(w))) {
                setError('用户名包含敏感词汇');
                return;
            }

            if (password !== confirmPassword) { setError('两次输入的密码不一致'); return; }

            if (!inviteCode) { setError('请输入邀请码'); return; }

            // Call Backend API to register
            try {
                const endpoint = '/api/auth/register';
                const body = { username, password, inviteCode };

                const registerResponse = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                const registerResult = await registerResponse.json();

                if (!registerResponse.ok) {
                    setError(registerResult.detail || registerResult.message || '注册失败');
                    return;
                }

                // 注册成功后自动登录
                const user = await storage.login(username, password);
                if (user) {
                    onLoginSuccess(user);
                    onClose();
                } else {
                    setError('注册成功，但登录失败');
                }
            } catch (err) {
                console.error('Register API Error:', err);
                setError('服务器连接失败');
                return;
            }
        }
    };

    const resetForm = () => {
        setError('');
        setPassword('');
        setConfirmPassword('');
        setInviteCode(initialInviteCode || '');
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="relative h-32 bg-indigo-600 flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-700 opacity-90"></div>
                    <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                    <div className="absolute -top-8 -left-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>

                    <div className="relative z-10 text-center text-white">
                        <h2 className="text-2xl font-bold tracking-tight">{mode === 'login' ? '欢迎回来' : '创建账号'}</h2>
                        <p className="text-indigo-100 text-sm mt-1">
                            {mode === 'login' ? '登录以继续您的 DIY 之旅' : '加入 DIY 大家庭'}
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Phone verification hidden as per request */}


                <div className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700 ml-1">用户名</label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    <User size={18} />
                                </div>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-700"
                                    placeholder="请输入用户名"
                                    maxLength={12}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700 ml-1">密码</label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-700"
                                    placeholder="请输入密码"
                                />
                            </div>
                        </div>

                        {mode === 'register' && (
                            <>
                                <div className="space-y-1 animate-in slide-in-from-top-2 duration-200">
                                    <label className="text-sm font-medium text-slate-700 ml-1">确认密码</label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                            <Lock size={18} />
                                        </div>
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={e => setConfirmPassword(e.target.value)}
                                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-700"
                                            placeholder="请再次输入密码"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1 animate-in slide-in-from-top-2 duration-200 delay-50">
                                    <label className="text-sm font-medium text-amber-700 ml-1">邀请码（必填）</label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500">
                                            <Gift size={18} />
                                        </div>
                                        <input
                                            type="text"
                                            value={inviteCode}
                                            onChange={e => setInviteCode(e.target.value.toUpperCase())}
                                            className="w-full pl-11 pr-4 py-3 bg-amber-50 border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-mono text-amber-900 uppercase tracking-wider"
                                            placeholder="请输入邀请码（必填）"
                                            maxLength={6}
                                        />
                                    </div>
                                    <p className="text-[10px] text-amber-600/80 mt-1 ml-1">目前仅限受邀用户注册。</p>
                                </div>
                            </>
                        )}

                        {error && (
                            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center justify-center font-medium animate-in fade-in slide-in-from-top-1">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 mt-2"
                        >
                            <span>{mode === 'login' ? '立即登录' : '立即注册'}</span>
                            <ArrowRight size={18} />
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-slate-500">
                            {mode === 'login' ? "还没有账号？" : '已有账号？'}
                            <button
                                onClick={() => {
                                    setMode(mode === 'login' ? 'register' : 'login');
                                    resetForm();
                                }}
                                className="ml-1 text-indigo-600 font-bold hover:underline"
                            >
                                {mode === 'login' ? '立即注册' : '返回登录'}
                            </button>
                        </p>
                    </div>

                    {/* Helper Tip */}
                    <div className="mt-6 pt-6 border-t border-slate-100 text-xs text-center text-slate-400">
                        <p>默认账号: admin / admin123 或 DIYXX / jiangxiaoyu119</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
