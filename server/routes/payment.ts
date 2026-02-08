/**
 * 支付API路由
 */

import express from 'express';
import { WechatPayService, WechatPayConfig } from '../services/wechatPay';
import { AlipayService, AlipayConfig } from '../services/alipay';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// 配置文件路径
const CONFIG_FILE = path.join(__dirname, '../../payment-config.json');

// 读取配置
function getConfig(): { wechat?: WechatPayConfig; alipay?: AlipayConfig } {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
        }
    } catch (e) {
        console.error('读取支付配置失败:', e);
    }
    return {};
}

// 保存配置
function saveConfig(config: { wechat?: WechatPayConfig; alipay?: AlipayConfig }): boolean {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
        return true;
    } catch (e) {
        console.error('保存支付配置失败:', e);
        return false;
    }
}

// 订单存储 (生产环境应使用数据库)
const orders: Map<string, {
    orderId: string;
    userId: string;
    planId: string;
    amount: number;
    status: 'pending' | 'paid' | 'failed';
    payMethod: 'wechat' | 'alipay';
    createdAt: string;
    paidAt?: string;
}> = new Map();

/**
 * 健康检查
 */
router.get('/health', (_req, res) => {
    const config = getConfig();
    res.json({
        status: 'ok',
        wechatConfigured: !!(config.wechat?.appId && config.wechat?.mchId),
        alipayConfigured: !!(config.alipay?.appId && config.alipay?.privateKey)
    });
});

/**
 * 获取支付配置 (隐藏敏感信息)
 */
router.get('/settings', (_req, res) => {
    const config = getConfig();
    res.json({
        wechat: config.wechat ? {
            appId: config.wechat.appId,
            mchId: config.wechat.mchId,
            notifyUrl: config.wechat.notifyUrl,
            hasApiKey: !!config.wechat.apiKey
        } : null,
        alipay: config.alipay ? {
            appId: config.alipay.appId,
            notifyUrl: config.alipay.notifyUrl,
            returnUrl: config.alipay.returnUrl,
            sandbox: config.alipay.sandbox,
            hasPrivateKey: !!config.alipay.privateKey,
            hasPublicKey: !!config.alipay.alipayPublicKey
        } : null
    });
});

/**
 * 保存支付配置
 */
router.post('/settings', (req, res) => {
    const { wechat, alipay } = req.body;
    const currentConfig = getConfig();

    const newConfig: { wechat?: WechatPayConfig; alipay?: AlipayConfig } = {};

    // 微信配置
    if (wechat) {
        newConfig.wechat = {
            appId: wechat.appId || '',
            mchId: wechat.mchId || '',
            apiKey: wechat.apiKey || currentConfig.wechat?.apiKey || '',
            notifyUrl: wechat.notifyUrl || ''
        };
    }

    // 支付宝配置
    if (alipay) {
        newConfig.alipay = {
            appId: alipay.appId || '',
            privateKey: alipay.privateKey || currentConfig.alipay?.privateKey || '',
            alipayPublicKey: alipay.alipayPublicKey || currentConfig.alipay?.alipayPublicKey || '',
            notifyUrl: alipay.notifyUrl || '',
            returnUrl: alipay.returnUrl || '',
            sandbox: alipay.sandbox || false
        };
    }

    if (saveConfig(newConfig)) {
        res.json({ success: true, message: '配置保存成功' });
    } else {
        res.status(500).json({ success: false, message: '配置保存失败' });
    }
});

/**
 * 创建微信支付订单
 */
router.post('/wechat/create', async (req, res) => {
    const config = getConfig();
    if (!config.wechat?.appId || !config.wechat?.mchId || !config.wechat?.apiKey) {
        return res.status(400).json({ success: false, error: '微信支付未配置' });
    }

    const { userId, planId, planName, amount, openId } = req.body;
    if (!userId || !planId || !amount) {
        return res.status(400).json({ success: false, error: '参数不完整' });
    }

    const orderId = `WX${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // 存储订单
    orders.set(orderId, {
        orderId,
        userId,
        planId,
        amount: Math.round(amount * 100), // 转为分
        status: 'pending',
        payMethod: 'wechat',
        createdAt: new Date().toISOString()
    });

    const wechatPay = new WechatPayService(config.wechat);

    // 如果有openId，使用JSAPI；否则使用Native (二维码)
    if (openId) {
        const result = await wechatPay.createJSAPIOrder({
            orderId,
            description: planName || 'VIP会员',
            amount: Math.round(amount * 100),
            openId,
            attach: JSON.stringify({ userId, planId })
        });

        if (result.success) {
            res.json({ success: true, orderId, payParams: result.data });
        } else {
            res.status(400).json({ success: false, error: result.error });
        }
    } else {
        // Native支付 (二维码)
        const result = await wechatPay.createNativeOrder({
            orderId,
            description: planName || 'VIP会员',
            amount: Math.round(amount * 100),
            attach: JSON.stringify({ userId, planId })
        });

        if (result.success) {
            res.json({ success: true, orderId, codeUrl: result.data.codeUrl });
        } else {
            res.status(400).json({ success: false, error: result.error });
        }
    }
});

/**
 * 微信支付回调
 */
router.post('/wechat/notify', express.text({ type: 'text/xml' }), (req, res) => {
    const config = getConfig();
    if (!config.wechat) {
        return res.send(WechatPayService.failResponse('未配置'));
    }

    try {
        // 解析XML (简单实现)
        const xml = req.body as string;
        const params: Record<string, string> = {};
        const regex = /<([^>]+)><!\[CDATA\[(.*?)\]\]><\/\1>|<([^>]+)>([^<]*)<\/\3>/g;
        let match;
        while ((match = regex.exec(xml)) !== null) {
            const key = match[1] || match[3];
            const value = match[2] || match[4];
            params[key] = value;
        }

        const wechatPay = new WechatPayService(config.wechat);

        if (!wechatPay.verifyNotifySign(params)) {
            return res.send(WechatPayService.failResponse('签名验证失败'));
        }

        if (params.result_code === 'SUCCESS') {
            const orderId = params.out_trade_no;
            const order = orders.get(orderId);
            if (order) {
                order.status = 'paid';
                order.paidAt = new Date().toISOString();
                // TODO: 更新用户VIP状态
                console.log(`订单 ${orderId} 支付成功`);
            }
        }

        res.send(WechatPayService.successResponse());
    } catch (e) {
        console.error('微信回调处理错误:', e);
        res.send(WechatPayService.failResponse('处理失败'));
    }
});

/**
 * 创建支付宝订单
 */
router.post('/alipay/create', (req, res) => {
    const config = getConfig();
    if (!config.alipay?.appId || !config.alipay?.privateKey) {
        return res.status(400).json({ success: false, error: '支付宝未配置' });
    }

    const { userId, planId, planName, amount, isMobile } = req.body;
    if (!userId || !planId || !amount) {
        return res.status(400).json({ success: false, error: '参数不完整' });
    }

    const orderId = `ALI${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // 存储订单
    orders.set(orderId, {
        orderId,
        userId,
        planId,
        amount: Math.round(amount * 100),
        status: 'pending',
        payMethod: 'alipay',
        createdAt: new Date().toISOString()
    });

    const alipay = new AlipayService(config.alipay);
    const params = {
        orderId,
        subject: planName || 'VIP会员',
        amount: amount.toFixed(2),
        body: `小鱼装机VIP - ${planName}`
    };

    // 根据设备类型选择支付方式
    const payUrl = isMobile
        ? alipay.createWapPayUrl(params)
        : alipay.createPagePayUrl(params);

    res.json({ success: true, orderId, payUrl });
});

/**
 * 支付宝回调
 */
router.post('/alipay/notify', express.urlencoded({ extended: true }), (req, res) => {
    const config = getConfig();
    if (!config.alipay) {
        return res.send('fail');
    }

    try {
        const params = req.body;
        const alipay = new AlipayService(config.alipay);

        if (!alipay.verifySign(params)) {
            console.error('支付宝签名验证失败');
            return res.send('fail');
        }

        if (params.trade_status === 'TRADE_SUCCESS' || params.trade_status === 'TRADE_FINISHED') {
            const orderId = params.out_trade_no;
            const order = orders.get(orderId);
            if (order) {
                order.status = 'paid';
                order.paidAt = new Date().toISOString();
                // TODO: 更新用户VIP状态
                console.log(`订单 ${orderId} 支付成功`);
            }
        }

        res.send('success');
    } catch (e) {
        console.error('支付宝回调处理错误:', e);
        res.send('fail');
    }
});

/**
 * 查询订单状态
 */
router.get('/order/:orderId', async (req, res) => {
    const { orderId } = req.params;
    const order = orders.get(orderId);

    if (!order) {
        return res.status(404).json({ success: false, error: '订单不存在' });
    }

    // 如果订单未支付，尝试从支付平台查询最新状态
    if (order.status === 'pending') {
        const config = getConfig();

        if (order.payMethod === 'wechat' && config.wechat) {
            const wechatPay = new WechatPayService(config.wechat);
            const result = await wechatPay.queryOrder(orderId);
            if (result.success && result.data.tradeState === 'SUCCESS') {
                order.status = 'paid';
                order.paidAt = new Date().toISOString();
            }
        } else if (order.payMethod === 'alipay' && config.alipay) {
            const alipay = new AlipayService(config.alipay);
            const result = await alipay.queryOrder(orderId);
            if (result.success && result.data.tradeStatus === 'TRADE_SUCCESS') {
                order.status = 'paid';
                order.paidAt = new Date().toISOString();
            }
        }
    }

    res.json({
        success: true,
        order: {
            orderId: order.orderId,
            status: order.status,
            amount: order.amount / 100,
            payMethod: order.payMethod,
            createdAt: order.createdAt,
            paidAt: order.paidAt
        }
    });
});

export default router;
