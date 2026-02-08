import React, { useState, useEffect } from 'react';
import { X, User, Lock, ArrowRight, Smartphone, MessageSquareCode, Gift } from 'lucide-react';
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

    // SMS Verification State
    const [phone, setPhone] = useState('');
    const [code, setCode] = useState('');
    const [timer, setTimer] = useState(0);
    // mockCode 已移到后端存储

    // Captcha State
    const [showCaptcha, setShowCaptcha] = useState(false);
    const [captchaProgress, setCaptchaProgress] = useState(0);
    const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);

    // Invite Code State - 预填来自 URL 的邀请码
    const [inviteCode, setInviteCode] = useState(initialInviteCode || '');

    const [error, setError] = useState('');

    useEffect(() => {
        let interval: any;
        if (timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [timer]);

    const handleSendCode = async () => {
        if (!phone) {
            setError('请输入手机号');
            return;
        }
        if (!/^1[3-9]\d{9}$/.test(phone)) {
            setError('请输入有效的 11 位手机号');
            return;
        }

        // 1. Rate Limiting Check (Storage)
        const limitRes = storage.checkSMSLimit(phone);
        if (!limitRes.canSend) {
            setError(limitRes.reason || '发送过于频繁');
            return;
        }

        // 2. Slider Captcha Check
        if (!isCaptchaVerified) {
            setShowCaptcha(true);
            return;
        }

        // 调用后端 API 发送真实短信
        setError('');
        setTimer(60);

        try {
            const response = await fetch('http://localhost:3001/api/sms/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone })
            });
            const result = await response.json();

            if (result.success) {
                // 短信发送成功
                storage.logSMSAttempt(phone);
            } else {
                setError(result.message || '发送失败');
                setTimer(0);
            }
        } catch (err) {
            console.error('SMS API Error:', err);
            setError('服务器连接失败，请稍后再试');
            setTimer(0);
        }

        // Reset captcha for next time
        setIsCaptchaVerified(false);
        setCaptchaProgress(0);
        setShowCaptcha(false);
    };

    const handleCaptchaEnd = () => {
        if (captchaProgress >= 90) {
            setIsCaptchaVerified(true);
            setShowCaptcha(false);
            // Auto trigger send after captcha if it was the blocker
            setTimeout(() => handleSendCode(), 100);
        } else {
            setCaptchaProgress(0);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (mode === 'login') {
            const user = storage.login(username, password);
            if (user) {
                onLoginSuccess(user);
                onClose();
            } else {
                setError('用户名或密码错误');
            }
        } else {
            // Register Validation
            if (!username) { setError('请输入用户名'); return; }
            if (username.length > 12) { setError('用户名最多 12 个字符'); return; }

            const forbidden = ['admin', 'system', 'root', '管理员', '官方', '客服', 'sb', '傻逼'];
            if (forbidden.some(w => username.toLowerCase().includes(w))) {
                setError('用户名包含敏感词或保留字，请修改');
                return;
            }

            if (password !== confirmPassword) { setError('两次输入的密码不一致'); return; }
            if (!phone) { setError('请输入手机号'); return; }
            if (!code) { setError('请输入验证码'); return; }

            // 调用后端 API 验证短信验证码
            try {
                const verifyResponse = await fetch('http://localhost:3001/api/sms/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone, code })
                });
                const verifyResult = await verifyResponse.json();

                if (!verifyResult.success) {
                    setError(verifyResult.message || '验证码错误');
                    return;
                }
            } catch (err) {
                setError('服务器连接失败，请稍后再试');
                return;
            }

            const existingUsers = storage.getUsers();
            if (existingUsers.some(u => u.username === username)) {
                setError('用户名已存在');
                return;
            }

            const newUser: UserItem = {
                id: `u-${Date.now()}`,
                username,
                password,
                role: 'user',
                status: 'active',
                lastLogin: new Date().toISOString(),
                invitedBy: inviteCode.toUpperCase() || undefined,
            };

            storage.saveUser(newUser);

            // 处理邀请奖励
            if (inviteCode) {
                const inviter = storage.findUserByInviteCode(inviteCode);
                if (inviter) {
                    storage.processReferral(inviter.id);
                }
            }

            storage.login(username, password);
            onLoginSuccess(newUser);
            onClose();
        }
    };

    const resetForm = () => {
        setError('');
        setPassword('');
        setConfirmPassword('');
        setPhone('');
        setCode('');
        setTimer(0);
        // mockCode 已移到后端存储
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
                            {mode === 'login' ? '登录以继续您的装机之旅' : '加入小鱼装机大家庭'}
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

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
                                    placeholder="输入用户名"
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
                                    placeholder="输入密码"
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
                                            placeholder="再次输入密码"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1 animate-in slide-in-from-top-2 duration-200 delay-50">
                                    <label className="text-sm font-medium text-slate-700 ml-1">手机验证</label>

                                    {/* Slider Captcha (Professional Polish) */}
                                    {showCaptcha && !isCaptchaVerified && (
                                        <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-xl animate-in fade-in zoom-in-95">
                                            <p className="text-xs font-bold text-slate-500 mb-3 text-center">请完成安全验证</p>
                                            <div className="relative h-10 bg-white border border-slate-200 rounded-full overflow-hidden">
                                                <div
                                                    className="absolute inset-y-0 left-0 bg-indigo-500/10 transition-all"
                                                    style={{ width: `${captchaProgress}%` }}
                                                />
                                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                    <span className="text-[10px] font-bold text-slate-400 select-none">按住滑块拖动到右侧</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="100"
                                                    value={captchaProgress}
                                                    onChange={(e) => setCaptchaProgress(parseInt(e.target.value))}
                                                    onMouseUp={handleCaptchaEnd}
                                                    onTouchEnd={handleCaptchaEnd}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                />
                                                <div
                                                    className="absolute top-1 bottom-1 w-8 bg-indigo-600 rounded-full shadow-md flex items-center justify-center text-white pointer-events-none transition-all"
                                                    style={{ left: `calc(${captchaProgress}% - ${captchaProgress > 50 ? '32px' : '4px'})`, transform: 'translateX(4px)' }}
                                                >
                                                    <ArrowRight size={14} />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {isCaptchaVerified && !timer && (
                                        <div className="mb-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold flex items-center gap-1.5 animate-in fade-in">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> 安全验证已通过
                                        </div>
                                    )}

                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                                <Smartphone size={18} />
                                            </div>
                                            <input
                                                type="text"
                                                value={phone}
                                                onChange={e => setPhone(e.target.value)}
                                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-700"
                                                placeholder="手机号码"
                                                maxLength={11}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mt-2">
                                        <div className="relative flex-1">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                                <MessageSquareCode size={18} />
                                            </div>
                                            <input
                                                type="text"
                                                value={code}
                                                onChange={e => setCode(e.target.value)}
                                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-700"
                                                placeholder="验证码"
                                                maxLength={6}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleSendCode}
                                            disabled={timer > 0}
                                            className="px-4 py-3 bg-indigo-50 text-indigo-600 font-bold rounded-xl border border-indigo-100 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm whitespace-nowrap min-w-[100px]"
                                        >
                                            {timer > 0 ? `${timer}s` : '获取验证码'}
                                        </button>
                                    </div>

                                    {/* 邀请码输入框 */}
                                    <div className="mt-3">
                                        <div className="relative">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500">
                                                <Gift size={18} />
                                            </div>
                                            <input
                                                type="text"
                                                value={inviteCode}
                                                onChange={e => setInviteCode(e.target.value.toUpperCase())}
                                                className="w-full pl-11 pr-4 py-3 bg-amber-50/50 border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-mono text-slate-700 uppercase tracking-wider"
                                                placeholder="邀请码（选填）"
                                                maxLength={6}
                                            />
                                        </div>
                                        <p className="text-[10px] text-amber-600 mt-1 ml-1">输入好友邀请码，双方均可获得 VIP 时长</p>
                                    </div>
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
                            <span>{mode === 'login' ? '立即登录' : '注册账号'}</span>
                            <ArrowRight size={18} />
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-slate-500">
                            {mode === 'login' ? '还没有账号？' : '已有账号？'}
                            <button
                                onClick={() => {
                                    setMode(mode === 'login' ? 'register' : 'login');
                                    resetForm();
                                }}
                                className="ml-1 text-indigo-600 font-bold hover:underline"
                            >
                                {mode === 'login' ? '去注册' : '去登录'}
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
