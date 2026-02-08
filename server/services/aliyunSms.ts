import Dysmsapi20170525, * as $Dysmsapi20170525 from '@alicloud/dysmsapi20170525';
import * as $OpenApi from '@alicloud/openapi-client';
import * as fs from 'fs';
import * as path from 'path';

// 配置文件路径
const CONFIG_PATH = path.join(process.cwd(), 'sms-config.json');

// SMS 配置接口
interface SmsConfig {
    accessKeyId: string;
    accessKeySecret: string;
    signName: string;
    templateCode: string;
}

// 验证码缓存（生产环境应使用 Redis）
const codeCache: Map<string, { code: string; expires: number }> = new Map();

// 读取配置
export function getSmsConfig(): SmsConfig {
    // 首先尝试从配置文件读取
    if (fs.existsSync(CONFIG_PATH)) {
        try {
            const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
            return JSON.parse(data);
        } catch (e) {
            console.error('Failed to read SMS config file:', e);
        }
    }

    // 回退到环境变量
    return {
        accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID || '',
        accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET || '',
        signName: process.env.ALIYUN_SMS_SIGN_NAME || '',
        templateCode: process.env.ALIYUN_SMS_TEMPLATE_CODE || ''
    };
}

// 保存配置
export function updateSmsConfig(config: SmsConfig): void {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
    console.log('SMS config saved to:', CONFIG_PATH);
}

// 创建阿里云短信客户端
function createClient(): Dysmsapi20170525 | null {
    const config = getSmsConfig();

    if (!config.accessKeyId || !config.accessKeySecret) {
        console.error('SMS not configured: missing AccessKey');
        return null;
    }

    const apiConfig = new $OpenApi.Config({
        accessKeyId: config.accessKeyId,
        accessKeySecret: config.accessKeySecret,
    });
    apiConfig.endpoint = 'dysmsapi.aliyuncs.com';
    return new Dysmsapi20170525(apiConfig);
}

// 生成 4 位验证码
function generateCode(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

// 发送验证码
export async function sendVerificationCode(phone: string): Promise<{ success: boolean; message: string }> {
    const smsConfig = getSmsConfig();

    // 检查配置是否完整
    if (!smsConfig.accessKeyId || !smsConfig.accessKeySecret) {
        return { success: false, message: '短信服务未配置，请联系管理员' };
    }

    // 检查是否在冷却期
    const cached = codeCache.get(phone);
    if (cached && cached.expires > Date.now() && cached.expires - Date.now() > 4 * 60 * 1000) {
        return { success: false, message: '发送过于频繁，请稍后再试' };
    }

    const code = generateCode();
    const client = createClient();

    if (!client) {
        return { success: false, message: '短信服务初始化失败' };
    }

    const sendSmsRequest = new $Dysmsapi20170525.SendSmsRequest({
        phoneNumbers: phone,
        signName: smsConfig.signName,
        templateCode: smsConfig.templateCode,
        templateParam: JSON.stringify({ code }),
    });

    try {
        const response = await client.sendSms(sendSmsRequest);

        if (response.body.code === 'OK') {
            // 缓存验证码，5 分钟有效
            codeCache.set(phone, {
                code,
                expires: Date.now() + 5 * 60 * 1000
            });
            return { success: true, message: '验证码发送成功' };
        } else {
            console.error('SMS Error:', response.body);
            return {
                success: false,
                message: response.body.message || '发送失败，请稍后再试'
            };
        }
    } catch (error: any) {
        console.error('SMS Exception:', error);
        return {
            success: false,
            message: error.message || '服务异常，请稍后再试'
        };
    }
}

// 验证验证码
export function verifyCode(phone: string, code: string): { success: boolean; message: string } {
    const cached = codeCache.get(phone);

    if (!cached) {
        return { success: false, message: '请先获取验证码' };
    }

    if (cached.expires < Date.now()) {
        codeCache.delete(phone);
        return { success: false, message: '验证码已过期，请重新获取' };
    }

    if (cached.code !== code) {
        return { success: false, message: '验证码错误' };
    }

    // 验证成功，删除缓存
    codeCache.delete(phone);
    return { success: true, message: '验证成功' };
}
