/**
 * 支付设置管理页面
 */

import { useState, useEffect } from 'react';
import { CreditCard, Shield, CheckCircle2, AlertCircle, Eye, EyeOff, RefreshCw } from 'lucide-react';

interface PaymentConfig {
    wechat: {
        appId: string;
        mchId: string;
        apiKey: string;
        notifyUrl: string;
        hasApiKey?: boolean;
    } | null;
    alipay: {
        appId: string;
        privateKey: string;
        alipayPublicKey: string;
        notifyUrl: string;
        returnUrl: string;
        sandbox: boolean;
        hasPrivateKey?: boolean;
        hasPublicKey?: boolean;
    } | null;
}

const API_BASE = 'http://localhost:3001/api/payment';

export default function PaymentSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [showSecrets, setShowSecrets] = useState(false);

    // 微信配置
    const [wechat, setWechat] = useState({
        appId: '',
        mchId: '',
        apiKey: '',
        notifyUrl: ''
    });

    // 支付宝配置
    const [alipay, setAlipay] = useState({
        appId: '',
        privateKey: '',
        alipayPublicKey: '',
        notifyUrl: '',
        returnUrl: '',
        sandbox: false
    });

    // 加载配置
    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await fetch(`${API_BASE}/settings`);
            const data: PaymentConfig = await res.json();

            if (data.wechat) {
                setWechat({
                    appId: data.wechat.appId || '',
                    mchId: data.wechat.mchId || '',
                    apiKey: data.wechat.hasApiKey ? '••••••••' : '',
                    notifyUrl: data.wechat.notifyUrl || ''
                });
            }

            if (data.alipay) {
                setAlipay({
                    appId: data.alipay.appId || '',
                    privateKey: data.alipay.hasPrivateKey ? '••••••••' : '',
                    alipayPublicKey: data.alipay.hasPublicKey ? '••••••••' : '',
                    notifyUrl: data.alipay.notifyUrl || '',
                    returnUrl: data.alipay.returnUrl || '',
                    sandbox: data.alipay.sandbox || false
                });
            }
        } catch (e) {
            console.error('加载配置失败:', e);
        } finally {
            setLoading(false);
        }
    };

    // 保存配置
    const handleSave = async () => {
        setSaving(true);
        setMessage(null);

        try {
            const payload: any = {};

            // 只发送非占位符的值
            if (wechat.appId || wechat.mchId) {
                payload.wechat = {
                    appId: wechat.appId,
                    mchId: wechat.mchId,
                    notifyUrl: wechat.notifyUrl
                };
                if (wechat.apiKey && !wechat.apiKey.includes('••')) {
                    payload.wechat.apiKey = wechat.apiKey;
                }
            }

            if (alipay.appId) {
                payload.alipay = {
                    appId: alipay.appId,
                    notifyUrl: alipay.notifyUrl,
                    returnUrl: alipay.returnUrl,
                    sandbox: alipay.sandbox
                };
                if (alipay.privateKey && !alipay.privateKey.includes('••')) {
                    payload.alipay.privateKey = alipay.privateKey;
                }
                if (alipay.alipayPublicKey && !alipay.alipayPublicKey.includes('••')) {
                    payload.alipay.alipayPublicKey = alipay.alipayPublicKey;
                }
            }

            const res = await fetch(`${API_BASE}/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (data.success) {
                setMessage({ type: 'success', text: '配置保存成功' });
                fetchConfig(); // 刷新配置
            } else {
                setMessage({ type: 'error', text: data.message || '保存失败' });
            }
        } catch (e) {
            setMessage({ type: 'error', text: '网络错误，请重试' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="animate-spin text-indigo-500" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <CreditCard className="text-indigo-500" />
                        支付设置
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">配置微信支付和支付宝参数</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                    {saving ? <RefreshCw className="animate-spin" size={16} /> : <Shield size={16} />}
                    {saving ? '保存中...' : '保存配置'}
                </button>
            </div>

            {/* Message */}
            {message && (
                <div className={`p-4 rounded-xl flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                    }`}>
                    {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    {message.text}
                </div>
            )}

            {/* Toggle secrets visibility */}
            <button
                onClick={() => setShowSecrets(!showSecrets)}
                className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-2"
            >
                {showSecrets ? <EyeOff size={16} /> : <Eye size={16} />}
                {showSecrets ? '隐藏敏感信息' : '显示敏感信息'}
            </button>

            {/* WeChat Pay */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                        <img src="https://api.iconify.design/ri:wechat-pay-fill.svg?color=%2307C160" className="w-6 h-6" alt="WeChat" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">微信支付</h2>
                        <p className="text-xs text-slate-500">JSAPI / Native 支付</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">AppID</label>
                        <input
                            type="text"
                            value={wechat.appId}
                            onChange={e => setWechat({ ...wechat, appId: e.target.value })}
                            placeholder="公众号 AppID"
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-400 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">商户号 (MchID)</label>
                        <input
                            type="text"
                            value={wechat.mchId}
                            onChange={e => setWechat({ ...wechat, mchId: e.target.value })}
                            placeholder="微信支付商户号"
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-400 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">API 密钥</label>
                        <input
                            type={showSecrets ? 'text' : 'password'}
                            value={wechat.apiKey}
                            onChange={e => setWechat({ ...wechat, apiKey: e.target.value })}
                            placeholder="微信支付 API 密钥"
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-400 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">支付通知 URL</label>
                        <input
                            type="text"
                            value={wechat.notifyUrl}
                            onChange={e => setWechat({ ...wechat, notifyUrl: e.target.value })}
                            placeholder="https://yourdomain.com/api/payment/wechat/notify"
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-400 outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* Alipay */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                            <img src="https://api.iconify.design/ri:alipay-fill.svg?color=%231677FF" className="w-6 h-6" alt="Alipay" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">支付宝</h2>
                            <p className="text-xs text-slate-500">电脑网站 / 手机网站支付</p>
                        </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={alipay.sandbox}
                            onChange={e => setAlipay({ ...alipay, sandbox: e.target.checked })}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-slate-600">沙箱环境</span>
                    </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">AppID</label>
                        <input
                            type="text"
                            value={alipay.appId}
                            onChange={e => setAlipay({ ...alipay, appId: e.target.value })}
                            placeholder="支付宝应用 ID"
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">支付通知 URL</label>
                        <input
                            type="text"
                            value={alipay.notifyUrl}
                            onChange={e => setAlipay({ ...alipay, notifyUrl: e.target.value })}
                            placeholder="https://yourdomain.com/api/payment/alipay/notify"
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">同步跳转 URL</label>
                        <input
                            type="text"
                            value={alipay.returnUrl}
                            onChange={e => setAlipay({ ...alipay, returnUrl: e.target.value })}
                            placeholder="https://yourdomain.com/payment/success"
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                        />
                    </div>
                </div>

                <div className="mt-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">应用私钥 (RSA2)</label>
                        <textarea
                            value={alipay.privateKey}
                            onChange={e => setAlipay({ ...alipay, privateKey: e.target.value })}
                            placeholder="-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
-----END RSA PRIVATE KEY-----"
                            rows={4}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none font-mono text-xs"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">支付宝公钥</label>
                        <textarea
                            value={alipay.alipayPublicKey}
                            onChange={e => setAlipay({ ...alipay, alipayPublicKey: e.target.value })}
                            placeholder="MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA..."
                            rows={4}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none font-mono text-xs"
                        />
                    </div>
                </div>
            </div>

            {/* Help */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                <h3 className="font-bold mb-2">📌 配置说明</h3>
                <ul className="space-y-1 text-xs">
                    <li>• <b>微信支付</b>：需要公众号已通过微信认证，并开通微信支付功能</li>
                    <li>• <b>支付宝</b>：需要在支付宝开放平台创建应用并签约产品</li>
                    <li>• <b>通知 URL</b>：必须是公网可访问的 HTTPS 地址</li>
                    <li>• 配置完成后，请使用测试订单验证支付流程</li>
                </ul>
            </div>
        </div>
    );
}
