/**
 * 微信支付 JSAPI 服务
 * 文档: https://pay.weixin.qq.com/wiki/doc/apiv3/apis/chapter3_1_1.shtml
 */

import crypto from 'crypto';

export interface WechatPayConfig {
    appId: string;        // 公众号AppID
    mchId: string;        // 商户号
    apiKey: string;       // API密钥 (v2)
    apiV3Key?: string;    // API v3密钥
    notifyUrl: string;    // 支付通知回调地址
    privateKey?: string;  // 商户私钥 (v3)
    serialNo?: string;    // 证书序列号 (v3)
}

export interface CreateOrderParams {
    orderId: string;
    description: string;
    amount: number;       // 单位: 分
    openId: string;       // 用户OpenID (JSAPI必需)
    attach?: string;      // 附加数据
}

export interface WechatPayResult {
    success: boolean;
    data?: any;
    error?: string;
}

export class WechatPayService {
    private config: WechatPayConfig;

    constructor(config: WechatPayConfig) {
        this.config = config;
    }

    /**
     * 生成随机字符串
     */
    private generateNonceStr(length = 32): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * 生成签名 (v2 MD5)
     */
    private signMD5(params: Record<string, any>): string {
        const sortedKeys = Object.keys(params).sort();
        const stringA = sortedKeys
            .filter(key => params[key] !== undefined && params[key] !== '')
            .map(key => `${key}=${params[key]}`)
            .join('&');
        const stringSignTemp = `${stringA}&key=${this.config.apiKey}`;
        return crypto.createHash('md5').update(stringSignTemp, 'utf8').digest('hex').toUpperCase();
    }

    /**
     * 创建 JSAPI 支付订单 (统一下单)
     */
    async createJSAPIOrder(params: CreateOrderParams): Promise<WechatPayResult> {
        try {
            const nonceStr = this.generateNonceStr();
            const body = {
                appid: this.config.appId,
                mch_id: this.config.mchId,
                nonce_str: nonceStr,
                body: params.description,
                out_trade_no: params.orderId,
                total_fee: params.amount,
                spbill_create_ip: '127.0.0.1',
                notify_url: this.config.notifyUrl,
                trade_type: 'JSAPI',
                openid: params.openId,
                attach: params.attach || ''
            };

            const sign = this.signMD5(body);
            const xmlBody = this.objectToXml({ ...body, sign });

            // 调用微信统一下单接口
            const response = await fetch('https://api.mch.weixin.qq.com/pay/unifiedorder', {
                method: 'POST',
                headers: { 'Content-Type': 'text/xml' },
                body: xmlBody
            });

            const xmlResult = await response.text();
            const result = this.xmlToObject(xmlResult);

            if (result.return_code === 'SUCCESS' && result.result_code === 'SUCCESS') {
                // 生成前端调起支付需要的参数
                const timestamp = Math.floor(Date.now() / 1000).toString();
                const payParams = {
                    appId: this.config.appId,
                    timeStamp: timestamp,
                    nonceStr: this.generateNonceStr(),
                    package: `prepay_id=${result.prepay_id}`,
                    signType: 'MD5'
                };
                const paySign = this.signMD5(payParams);

                return {
                    success: true,
                    data: {
                        ...payParams,
                        paySign,
                        prepayId: result.prepay_id
                    }
                };
            } else {
                return {
                    success: false,
                    error: result.return_msg || result.err_code_des || '创建订单失败'
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
     * 创建 Native 支付订单 (二维码)
     */
    async createNativeOrder(params: Omit<CreateOrderParams, 'openId'>): Promise<WechatPayResult> {
        try {
            const nonceStr = this.generateNonceStr();
            const body = {
                appid: this.config.appId,
                mch_id: this.config.mchId,
                nonce_str: nonceStr,
                body: params.description,
                out_trade_no: params.orderId,
                total_fee: params.amount,
                spbill_create_ip: '127.0.0.1',
                notify_url: this.config.notifyUrl,
                trade_type: 'NATIVE',
                attach: params.attach || ''
            };

            const sign = this.signMD5(body);
            const xmlBody = this.objectToXml({ ...body, sign });

            const response = await fetch('https://api.mch.weixin.qq.com/pay/unifiedorder', {
                method: 'POST',
                headers: { 'Content-Type': 'text/xml' },
                body: xmlBody
            });

            const xmlResult = await response.text();
            const result = this.xmlToObject(xmlResult);

            if (result.return_code === 'SUCCESS' && result.result_code === 'SUCCESS') {
                return {
                    success: true,
                    data: {
                        codeUrl: result.code_url,
                        prepayId: result.prepay_id
                    }
                };
            } else {
                return {
                    success: false,
                    error: result.return_msg || result.err_code_des || '创建订单失败'
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
     * 验证支付通知签名
     */
    verifyNotifySign(params: Record<string, any>): boolean {
        const { sign, ...rest } = params;
        const calculatedSign = this.signMD5(rest);
        return calculatedSign === sign;
    }

    /**
     * 查询订单
     */
    async queryOrder(orderId: string): Promise<WechatPayResult> {
        try {
            const nonceStr = this.generateNonceStr();
            const body = {
                appid: this.config.appId,
                mch_id: this.config.mchId,
                out_trade_no: orderId,
                nonce_str: nonceStr
            };

            const sign = this.signMD5(body);
            const xmlBody = this.objectToXml({ ...body, sign });

            const response = await fetch('https://api.mch.weixin.qq.com/pay/orderquery', {
                method: 'POST',
                headers: { 'Content-Type': 'text/xml' },
                body: xmlBody
            });

            const xmlResult = await response.text();
            const result = this.xmlToObject(xmlResult);

            if (result.return_code === 'SUCCESS') {
                return {
                    success: true,
                    data: {
                        tradeState: result.trade_state,
                        tradeStateDesc: result.trade_state_desc,
                        transactionId: result.transaction_id,
                        totalFee: result.total_fee
                    }
                };
            } else {
                return {
                    success: false,
                    error: result.return_msg || '查询失败'
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
     * 对象转XML
     */
    private objectToXml(obj: Record<string, any>): string {
        let xml = '<xml>';
        for (const key of Object.keys(obj)) {
            if (obj[key] !== undefined && obj[key] !== '') {
                xml += `<${key}><![CDATA[${obj[key]}]]></${key}>`;
            }
        }
        xml += '</xml>';
        return xml;
    }

    /**
     * XML转对象 (简单解析)
     */
    private xmlToObject(xml: string): Record<string, string> {
        const result: Record<string, string> = {};
        const regex = /<([^>]+)><!\[CDATA\[(.*?)\]\]><\/\1>|<([^>]+)>([^<]*)<\/\3>/g;
        let match;
        while ((match = regex.exec(xml)) !== null) {
            const key = match[1] || match[3];
            const value = match[2] || match[4];
            result[key] = value;
        }
        return result;
    }

    /**
     * 生成支付成功的响应XML
     */
    static successResponse(): string {
        return '<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>';
    }

    /**
     * 生成支付失败的响应XML
     */
    static failResponse(msg: string): string {
        return `<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[${msg}]]></return_msg></xml>`;
    }
}
