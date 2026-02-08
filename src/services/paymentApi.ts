/**
 * 支付 API 封装
 */

const API_BASE = 'http://localhost:3001/api/payment';

export interface PaymentPlan {
    id: string;
    name: string;
    price: number;
    durationDays: number;
}

export interface CreateOrderResult {
    success: boolean;
    orderId?: string;
    payParams?: any;      // 微信JSAPI支付参数
    codeUrl?: string;      // 微信Native二维码URL
    payUrl?: string;       // 支付宝支付链接
    error?: string;
}

export interface OrderStatus {
    orderId: string;
    status: 'pending' | 'paid' | 'failed';
    amount: number;
    payMethod: 'wechat' | 'alipay';
    createdAt: string;
    paidAt?: string;
}

/**
 * 检查支付配置状态
 */
export async function checkPaymentConfig(): Promise<{ wechatConfigured: boolean; alipayConfigured: boolean }> {
    try {
        const res = await fetch(`${API_BASE}/health`);
        return await res.json();
    } catch {
        return { wechatConfigured: false, alipayConfigured: false };
    }
}

/**
 * 创建微信支付订单
 */
export async function createWechatOrder(
    userId: string,
    plan: PaymentPlan,
    openId?: string
): Promise<CreateOrderResult> {
    try {
        const res = await fetch(`${API_BASE}/wechat/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId,
                planId: plan.id,
                planName: plan.name,
                amount: plan.price,
                openId
            })
        });
        return await res.json();
    } catch (error: any) {
        return { success: false, error: error.message || '网络错误' };
    }
}

/**
 * 创建支付宝订单
 */
export async function createAlipayOrder(
    userId: string,
    plan: PaymentPlan,
    isMobile: boolean = false
): Promise<CreateOrderResult> {
    try {
        const res = await fetch(`${API_BASE}/alipay/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId,
                planId: plan.id,
                planName: plan.name,
                amount: plan.price,
                isMobile
            })
        });
        return await res.json();
    } catch (error: any) {
        return { success: false, error: error.message || '网络错误' };
    }
}

/**
 * 查询订单状态
 */
export async function queryOrderStatus(orderId: string): Promise<{ success: boolean; order?: OrderStatus; error?: string }> {
    try {
        const res = await fetch(`${API_BASE}/order/${orderId}`);
        return await res.json();
    } catch (error: any) {
        return { success: false, error: error.message || '网络错误' };
    }
}

/**
 * 轮询订单状态直到支付完成或超时
 */
export function pollOrderStatus(
    orderId: string,
    onPaid: () => void,
    onFailed: (error: string) => void,
    timeoutMs: number = 300000, // 5分钟超时
    intervalMs: number = 3000   // 3秒轮询
): () => void {
    const startTime = Date.now();
    let cancelled = false;

    const poll = async () => {
        if (cancelled) return;

        if (Date.now() - startTime > timeoutMs) {
            onFailed('支付超时');
            return;
        }

        const result = await queryOrderStatus(orderId);

        if (result.success && result.order) {
            if (result.order.status === 'paid') {
                onPaid();
                return;
            } else if (result.order.status === 'failed') {
                onFailed('支付失败');
                return;
            }
        }

        // 继续轮询
        setTimeout(poll, intervalMs);
    };

    poll();

    // 返回取消函数
    return () => { cancelled = true; };
}

/**
 * 判断是否是移动设备
 */
export function isMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}
