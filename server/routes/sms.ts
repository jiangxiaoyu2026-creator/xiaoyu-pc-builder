import { Router, Request, Response } from 'express';
import { sendVerificationCode, verifyCode, updateSmsConfig, getSmsConfig } from '../services/aliyunSms';

const router = Router();

// 发送验证码
router.post('/send', async (req: Request, res: Response) => {
    const { phone } = req.body;

    // 验证手机号格式
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
        return res.status(400).json({
            success: false,
            message: '请输入有效的 11 位手机号'
        });
    }

    try {
        const result = await sendVerificationCode(phone);
        res.json(result);
    } catch (error: any) {
        console.error('Send SMS Error:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误，请稍后再试'
        });
    }
});

// 验证验证码
router.post('/verify', (req: Request, res: Response) => {
    const { phone, code } = req.body;

    if (!phone || !code) {
        return res.status(400).json({
            success: false,
            message: '手机号和验证码不能为空'
        });
    }

    const result = verifyCode(phone, code);
    res.json(result);
});

// 获取短信配置 (后台管理用)
router.get('/config', (req: Request, res: Response) => {
    const config = getSmsConfig();
    // 不返回完整密钥，只返回部分用于显示
    res.json({
        success: true,
        config: {
            accessKeyId: config.accessKeyId ? config.accessKeyId.slice(0, 6) + '****' : '',
            accessKeySecret: config.accessKeySecret ? '********' : '',
            signName: config.signName || '',
            templateCode: config.templateCode || '',
            isConfigured: !!(config.accessKeyId && config.accessKeySecret)
        }
    });
});

// 更新短信配置 (后台管理用)
router.post('/config', (req: Request, res: Response) => {
    const { accessKeyId, accessKeySecret, signName, templateCode } = req.body;

    if (!accessKeyId || !accessKeySecret || !signName || !templateCode) {
        return res.status(400).json({
            success: false,
            message: '所有字段都是必填的'
        });
    }

    try {
        updateSmsConfig({ accessKeyId, accessKeySecret, signName, templateCode });
        res.json({ success: true, message: '配置已保存' });
    } catch (error: any) {
        console.error('Save Config Error:', error);
        res.status(500).json({
            success: false,
            message: '保存失败: ' + error.message
        });
    }
});

export default router;
