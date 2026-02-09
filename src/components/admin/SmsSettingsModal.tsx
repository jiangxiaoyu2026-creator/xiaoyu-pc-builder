import { useState, useEffect } from 'react';
import { X, Key, FileText, CheckCircle2, AlertCircle, Loader2, MessageSquare } from 'lucide-react';
import { storage } from '../../services/storage';
import { SMSSettings } from '../../types/adminTypes';

interface SmsSettingsModalProps {
    onClose: () => void;
}

export default function SmsSettingsModal({ onClose }: SmsSettingsModalProps) {
    const [config, setConfig] = useState<SMSSettings>({
        provider: 'aliyun',
        accessKeyId: '',
        accessKeySecret: '',
        signName: '',
        templateCode: '',
        enabled: false
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // 加载当前配置
    useEffect(() => {
        const loadConfig = async () => {
            try {
                const settings = await storage.getSMSSettings();
                setConfig(settings);
            } catch (err) {
                setMessage({ type: 'error', text: '无法获取配置信息' });
            } finally {
                setLoading(false);
            }
        };
        loadConfig();
    }, []);

    const handleSave = async () => {
        if (!config.accessKeyId || !config.signName || !config.templateCode) {
            setMessage({ type: 'error', text: '请填写必要字段' });
            return;
        }

        setSaving(true);
        setMessage(null);

        try {
            await storage.saveSMSSettings(config);
            setMessage({ type: 'success', text: '配置已保存成功！' });
            setConfig(prev => ({ ...prev, enabled: true }));
        } catch (err) {
            setMessage({ type: 'error', text: '保存失败，请检查后端状态' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="relative h-24 bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0wIDBoNDB2NDBIMHoiLz48Y2lyY2xlIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjA1IiBjeD0iMjAiIGN5PSIyMCIgcj0iMiIvPjwvZz48L3N2Zz4=')] opacity-30"></div>
                    <div className="relative z-10 flex items-center gap-3 text-white">
                        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                            <MessageSquare size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">短信服务配置</h2>
                            <p className="text-indigo-100 text-sm">阿里云短信 API 设置</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                        </div>
                    ) : (
                        <>
                            {/* 状态提示 */}
                            {config.enabled && !message && (
                                <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-medium">
                                    <CheckCircle2 size={18} />
                                    <span>短信服务已配置</span>
                                </div>
                            )}

                            {message && (
                                <div className={`flex items-center gap-2 p-3 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                                    }`}>
                                    {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                                    <span>{message.text}</span>
                                </div>
                            )}

                            {/* AccessKey ID */}
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                    <Key size={14} className="text-slate-400" />
                                    AccessKey ID
                                </label>
                                <input
                                    type="text"
                                    value={config.accessKeyId}
                                    onChange={e => setConfig(prev => ({ ...prev, accessKeyId: e.target.value }))}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono text-sm"
                                    placeholder="LTAI5t..."
                                />
                            </div>

                            {/* AccessKey Secret */}
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                    <Key size={14} className="text-slate-400" />
                                    AccessKey Secret
                                </label>
                                <input
                                    type="password"
                                    value={config.accessKeySecret}
                                    onChange={e => setConfig(prev => ({ ...prev, accessKeySecret: e.target.value }))}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono text-sm"
                                    placeholder={config.enabled ? '••••••••（已配置，留空则不修改）' : '输入密钥...'}
                                />
                            </div>

                            {/* 签名名称 */}
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                    <FileText size={14} className="text-slate-400" />
                                    签名名称
                                </label>
                                <input
                                    type="text"
                                    value={config.signName}
                                    onChange={e => setConfig(prev => ({ ...prev, signName: e.target.value }))}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                                    placeholder="例如：济南丰精数码"
                                />
                            </div>

                            {/* 模板 CODE */}
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                    <FileText size={14} className="text-slate-400" />
                                    模板 CODE
                                </label>
                                <input
                                    type="text"
                                    value={config.templateCode}
                                    onChange={e => setConfig(prev => ({ ...prev, templateCode: e.target.value }))}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono text-sm"
                                    placeholder="SMS_501885333"
                                />
                            </div>

                            {/* 提示 */}
                            <div className="p-3 bg-amber-50 rounded-xl text-xs text-amber-700">
                                <p className="font-bold mb-1">⚠️ 安全提示</p>
                                <p>配置信息将保存在服务器端的 sms-config.json 文件中。请确保服务器安全。</p>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 pt-0 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                    >
                        取消
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || loading}
                        className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {saving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                        <span>{saving ? '保存中...' : '保存配置'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
