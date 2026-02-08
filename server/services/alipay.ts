/**
 * 支付宝支付服务
 * 文档: https://opendocs.alipay.com/open/repo-0038oa
 */

import crypto from 'crypto';

export interface AlipayConfig {
    appId: string;           // 应用ID
    privateKey: string;      // 应用私钥 (RSA2)
    alipayPublicKey: string; // 支付宝公钥
    notifyUrl: string;       // 异步通知地址
    returnUrl?: string;      // 同步跳转地址
    sandbox?: boolean;       // 是否沙箱环境
}

export interface CreateOrderParams {
    orderId: string;
    subject: string;         // 订单标题
    amount: string;          // 金额 (元, 保留两位小数)
    body?: string;           // 订单描述
}

export interface AlipayResult {
    success: boolean;
    data?: any;
    error?: string;
}

export class AlipayService {
    private config: AlipayConfig;
    private gateway: string;

    constructor(config: AlipayConfig) {
        this.config = config;
        this.gateway = config.sandbox
            ? 'https://openapi-sandbox.dl.alipaydev.com/gateway.do'
            : 'https://openapi.alipay.com/gateway.do';
    }

    /**
     * 生成RSA2签名
     */
    private sign(params: Record<string, string>): string {
        const sortedKeys = Object.keys(params).sort();
        const signContent = sortedKeys
            .filter(key => params[key] !== undefined && params[key] !== '')
            .map(key => `${key}=${params[key]}`)
            .join('&');

        const signer = crypto.createSign('RSA-SHA256');
        signer.update(signContent, 'utf8');
        return signer.sign(this.formatPrivateKey(this.config.privateKey), 'base64');
    }

    /**
     * 验证支付宝签名
     */
    verifySign(params: Record<string, string>): boolean {
        const { sign, sign_type, ...rest } = params;
        const sortedKeys = Object.keys(rest).sort();
        const signContent = sortedKeys
            .filter(key => rest[key] !== undefined && rest[key] !== '')
            .map(key => `${key}=${rest[key]}`)
            .join('&');

        try {
            const verifier = crypto.createVerify('RSA-SHA256');
            verifier.update(signContent, 'utf8');
            return verifier.verify(
                this.formatPublicKey(this.config.alipayPublicKey),
                sign,
                'base64'
            );
        } catch {
            return false;
        }
    }

    /**
     * 创建电脑网站支付订单 (PagePay)
     */
    createPagePayUrl(params: CreateOrderParams): string {
        const bizContent = {
            out_trade_no: params.orderId,
            product_code: 'FAST_INSTANT_TRADE_PAY',
            total_amount: params.amount,
            subject: params.subject,
            body: params.body || ''
        };

        const baseParams: Record<string, string> = {
            app_id: this.config.appId,
            method: 'alipay.trade.page.pay',
            format: 'JSON',
            return_url: this.config.returnUrl || '',
            charset: 'utf-8',
            sign_type: 'RSA2',
            timestamp: this.formatDate(new Date()),
            version: '1.0',
            notify_url: this.config.notifyUrl,
            biz_content: JSON.stringify(bizContent)
        };

        baseParams.sign = this.sign(baseParams);

        const queryString = Object.keys(baseParams)
            .map(key => `${key}=${encodeURIComponent(baseParams[key])}`)
            .join('&');

        return `${this.gateway}?${queryString}`;
    }

    /**
     * 创建手机网站支付订单 (WapPay)
     */
    createWapPayUrl(params: CreateOrderParams): string {
        const bizContent = {
            out_trade_no: params.orderId,
            product_code: 'QUICK_WAP_WAY',
            total_amount: params.amount,
            subject: params.subject,
            body: params.body || ''
        };

        const baseParams: Record<string, string> = {
            app_id: this.config.appId,
            method: 'alipay.trade.wap.pay',
            format: 'JSON',
            return_url: this.config.returnUrl || '',
            charset: 'utf-8',
            sign_type: 'RSA2',
            timestamp: this.formatDate(new Date()),
            version: '1.0',
            notify_url: this.config.notifyUrl,
            biz_content: JSON.stringify(bizContent)
        };

        baseParams.sign = this.sign(baseParams);

        const queryString = Object.keys(baseParams)
            .map(key => `${key}=${encodeURIComponent(baseParams[key])}`)
            .join('&');

        return `${this.gateway}?${queryString}`;
    }

    /**
     * 查询订单
     */
    async queryOrder(orderId: string): Promise<AlipayResult> {
        const bizContent = {
            out_trade_no: orderId
        };

        const baseParams: Record<string, string> = {
            app_id: this.config.appId,
            method: 'alipay.trade.query',
            format: 'JSON',
            charset: 'utf-8',
            sign_type: 'RSA2',
            timestamp: this.formatDate(new Date()),
            version: '1.0',
            biz_content: JSON.stringify(bizContent)
        };

        baseParams.sign = this.sign(baseParams);

        try {
            const response = await fetch(this.gateway, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams(baseParams).toString()
            });

            const result = await response.json();
            const queryResponse = result.alipay_trade_query_response;

            if (queryResponse.code === '10000') {
                return {
                    success: true,
                    data: {
                        tradeStatus: queryResponse.trade_status,
                        tradeNo: queryResponse.trade_no,
                        totalAmount: queryResponse.total_amount
                    }
                };
            } else {
                return {
                    success: false,
                    error: queryResponse.sub_msg || queryResponse.msg || '查询失败'
                };
            }
        } catch (error: any) {
            return {
                success: false,
                error: error.message || '网络错误'
            };
        }
    }

    /**
     * 格式化日期
     */
    private formatDate(date: Date): string {
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    }

    /**
     * 格式化私钥
     */
    private formatPrivateKey(privateKey: string): string {
        const cleanKey = privateKey.replace(/-----(BEGIN|END) (RSA )?PRIVATE KEY-----/g, '').replace(/\s/g, '');
        const chunks = cleanKey.match(/.{1,64}/g) || [];
        return `-----BEGIN RSA PRIVATE KEY-----\n${chunks.join('\n')}\n-----END RSA PRIVATE KEY-----`;
    }

    /**
     * 格式化公钥
     */
    private formatPublicKey(publicKey: string): string {
        const cleanKey = publicKey.replace(/-----(BEGIN|END) PUBLIC KEY-----/g, '').replace(/\s/g, '');
        const chunks = cleanKey.match(/.{1,64}/g) || [];
        return `-----BEGIN PUBLIC KEY-----\n${chunks.join('\n')}\n-----END PUBLIC KEY-----`;
    }
}
