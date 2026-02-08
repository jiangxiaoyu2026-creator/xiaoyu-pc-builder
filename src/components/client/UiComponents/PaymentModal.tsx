import { useState, useEffect } from 'react';
import { X, ShieldCheck, BrainCircuit, Gift, RefreshCw, QrCode, AlertCircle } from 'lucide-react';
import { UserItem, PaymentPlan } from '../../../types/adminTypes';
import { storage } from '../../../services/storage';
import * as paymentApi from '../../../services/paymentApi';

interface PaymentModalProps {
    user: UserItem;
    onClose: () => void;
    onSuccess: () => void;
    onGoToInvite?: () => void; // 跳转到用户中心邀请页
}

const PLANS: PaymentPlan[] = [
    { id: 'day', name: '1 天体验卡', price: 3, durationDays: 1, originalPrice: 9.9 },
    { id: 'week', name: '7 天周卡', price: 9.9, durationDays: 7, originalPrice: 19.9 },
    { id: 'month', name: '30 天月卡', price: 19.9, durationDays: 30, originalPrice: 39.9 },
    { id: 'year', name: '365 天年卡', price: 99, durationDays: 365, originalPrice: 199 },
];

export function PaymentModal({ user, onClose, onSuccess, onGoToInvite }: PaymentModalProps) {
    const [selectedPlan, setSelectedPlan] = useState<PaymentPlan>(PLANS[1]);
    const [paymentMethod, setPaymentMethod] = useState<'alipay' | 'wechat'>('wechat');
    const [isProcessing, setIsProcessing] = useState(false);

    // 支付状态
    const [payOrderId, setPayOrderId] = useState<string | null>(null);
    const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // 清理轮询
    useEffect(() => {
        let stopPolling: (() => void) | undefined;

        if (payOrderId) {
            stopPolling = paymentApi.pollOrderStatus(
                payOrderId,
                () => {
                    // 支付成功
                    storage.updateUserVIP(user.id, selectedPlan.durationDays);
                    setIsProcessing(false);
                    onSuccess();
                },
                (err) => {
                    setError(err);
                    setIsProcessing(false);
                }
            );
        }

        return () => {
            if (stopPolling) stopPolling();
        };
    }, [payOrderId, user.id, selectedPlan.durationDays, onSuccess]);

    const handlePay = async () => {
        setError(null);
        setIsProcessing(true);
        setQrCodeUrl(null);
        setPayOrderId(null);

        try {
            const isMobile = paymentApi.isMobileDevice();
            let result: paymentApi.CreateOrderResult;

            if (paymentMethod === 'wechat') {
                result = await paymentApi.createWechatOrder(user.id, selectedPlan);
            } else {
                result = await paymentApi.createAlipayOrder(user.id, selectedPlan, isMobile);
            }

            if (result.success) {
                setPayOrderId(result.orderId || null);

                if (paymentMethod === 'wechat' && result.codeUrl) {
                    setQrCodeUrl(result.codeUrl);
                } else if (paymentMethod === 'alipay' && result.payUrl) {
                    window.location.href = result.payUrl;
                }
            } else {
                setError(result.error || '创建支付订单失败');
                setIsProcessing(false);
            }
        } catch (e) {
            setError('支付系统暂时不可用');
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="w-full max-w-[480px] bg-[#0f0f11] rounded-[32px] shadow-2xl shadow-amber-900/20 overflow-hidden animate-in zoom-in-95 duration-300 ring-1 ring-white/10">
                {/* Header */}
                <div className="relative h-44 bg-gradient-to-br from-[#1a1a1a] via-[#2a2a2a] to-[#0f0f11] p-8 flex flex-col justify-center overflow-hidden border-b border-amber-500/20">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/50 hover:text-amber-400 transition-colors bg-white/5 hover:bg-white/10 rounded-full p-2 backdrop-blur-md z-10"
                    >
                        <X size={20} />
                    </button>

                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="bg-gradient-to-r from-amber-300 to-amber-500 text-black text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.4)] tracking-wider">
                                SVIP MEMBER
                            </span>
                        </div>
                        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-amber-200 to-amber-100 mb-2 tracking-tight drop-shadow-sm flex items-center gap-2">
                            开通尊贵会员
                        </h2>
                        <p className="text-zinc-400 text-sm font-medium leading-relaxed max-w-[85%]">
                            解锁 <span className="text-amber-400 font-bold">AI 智能装机</span> 核心特权
                        </p>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 bg-[#0f0f11]">
                    {!qrCodeUrl ? (
                        <>
                            {/* Benefits Section */}
                            <div className="mb-6 space-y-3 px-1">
                                <div className="flex gap-4 group p-2.5 rounded-2xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                                    <div className="mt-1 w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-white flex items-center justify-center shrink-0 shadow-lg shadow-amber-900/30">
                                        <BrainCircuit size={18} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-amber-50 mb-0.5">AI 架构师引擎</h4>
                                        <p className="text-[11px] text-zinc-500 leading-relaxed">调用万级算力，为您生成极致方案</p>
                                    </div>
                                </div>
                                <div className="flex gap-4 group p-2.5 rounded-2xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                                    <div className="mt-1 w-9 h-9 rounded-xl bg-gradient-to-br from-zinc-700 to-zinc-900 text-amber-500 flex items-center justify-center shrink-0 shadow-lg border border-white/10">
                                        <ShieldCheck size={18} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-amber-50 mb-0.5">防坑避雷检测</h4>
                                        <p className="text-[11px] text-zinc-500 leading-relaxed">全网大数据比价与兼容性风控</p>
                                    </div>
                                </div>
                            </div>

                            <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-6"></div>

                            <h3 className="text-xs font-bold text-amber-50 mb-4 px-1 flex items-center justify-between">
                                <span>选择尊享方案</span>
                                {onGoToInvite && (
                                    <span
                                        onClick={() => { onClose(); onGoToInvite(); }}
                                        className="flex items-center gap-1 text-amber-400 hover:text-amber-300 cursor-pointer transition-colors group underline underline-offset-2"
                                    >
                                        <Gift size={12} className="group-hover:animate-bounce" />
                                        邀请好友免费得 VIP
                                    </span>
                                )}
                            </h3>

                            <div className="grid grid-cols-2 gap-3 mb-6">
                                {PLANS.map(plan => {
                                    const isSelected = selectedPlan.id === plan.id;
                                    return (
                                        <div
                                            key={plan.id}
                                            onClick={() => setSelectedPlan(plan)}
                                            className={`relative p-3 rounded-xl border transition-all cursor-pointer ${isSelected
                                                ? 'border-amber-500/50 bg-amber-500/10'
                                                : 'border-white/10 hover:border-amber-500/30'
                                                }`}
                                        >
                                            <div className={`font-bold text-xs mb-1 ${isSelected ? 'text-amber-400' : 'text-zinc-400'}`}>
                                                {plan.name}
                                            </div>
                                            <div className="flex items-baseline gap-1">
                                                <span className={`text-lg font-black ${isSelected ? 'text-amber-100' : 'text-zinc-200'}`}>
                                                    ¥{plan.price}
                                                </span>
                                                {plan.originalPrice && (
                                                    <span className="text-[10px] text-zinc-600 line-through">¥{plan.originalPrice}</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Payment Method */}
                            <div className="flex gap-3 mb-6">
                                <button
                                    onClick={() => setPaymentMethod('wechat')}
                                    className={`flex-1 py-3 px-4 rounded-xl border flex items-center justify-center gap-3 transition-all ${paymentMethod === 'wechat'
                                        ? 'border-green-500/50 bg-green-500/10 text-green-400'
                                        : 'border-white/10 text-zinc-500 hover:bg-white/5'
                                        }`}
                                >
                                    <img src="https://api.iconify.design/ri:wechat-pay-fill.svg?color=%2307C160" className="w-5 h-5" alt="WC" />
                                    <span className="text-sm font-bold">微信支付</span>
                                </button>
                                <button
                                    onClick={() => setPaymentMethod('alipay')}
                                    className={`flex-1 py-3 px-4 rounded-xl border flex items-center justify-center gap-3 transition-all ${paymentMethod === 'alipay'
                                        ? 'border-blue-500/50 bg-blue-500/10 text-blue-400'
                                        : 'border-white/10 text-zinc-500 hover:bg-white/5'
                                        }`}
                                >
                                    <img src="https://api.iconify.design/ri:alipay-fill.svg?color=%231677FF" className="w-5 h-5" alt="ALI" />
                                    <span className="text-sm font-bold">支付宝</span>
                                </button>
                            </div>

                            {error && (
                                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] flex items-center gap-2">
                                    <AlertCircle size={14} />
                                    {error}
                                </div>
                            )}

                            <button
                                onClick={handlePay}
                                disabled={isProcessing}
                                className="w-full py-4 bg-gradient-to-r from-amber-400 to-amber-600 text-black font-black text-lg rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isProcessing ? (
                                    <RefreshCw className="animate-spin" size={20} />
                                ) : (
                                    <span>立即支付 ¥{selectedPlan.price}</span>
                                )}
                            </button>
                        </>
                    ) : (
                        /* QR Code View */
                        <div className="text-center py-8">
                            <div className="bg-white p-4 rounded-2xl inline-block mb-4 shadow-xl shadow-white/5">
                                <div className="w-48 h-48 bg-slate-100 flex items-center justify-center rounded-lg border-2 border-slate-200">
                                    <QrCode size={120} className="text-slate-800" />
                                </div>
                            </div>
                            <div className="text-amber-400 font-bold mb-2">请使用微信扫码支付</div>
                            <div className="text-zinc-500 text-xs mb-6 px-12">支付完成后将自动为您开通 VIP，如支付成功未生效，请联系客服。</div>

                            <button
                                onClick={() => setQrCodeUrl(null)}
                                className="text-zinc-400 hover:text-white text-xs underline"
                            >
                                返回重新选择
                            </button>
                        </div>
                    )}

                    <p className="text-center text-[10px] text-zinc-600 mt-6">
                        🔒 安全加密支付 • 支付后即时生效
                    </p>
                </div>
            </div>
        </div>
    );
}
