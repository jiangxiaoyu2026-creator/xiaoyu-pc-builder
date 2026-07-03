import { useEffect, useState } from 'react';
import { AlertCircle, Bot, Database, Play, Save, ShieldCheck } from 'lucide-react';
import { storage } from '../../services/storage';
import { ApiService } from '../../services/api';
import { AISettings } from '../../types/adminTypes';

interface DataHealthCategory {
    category: string;
    total: number;
    usable: number;
    blocked: number;
    missing: Record<string, number>;
}

interface DataHealth {
    categories: DataHealthCategory[];
    rules: string[];
}

const CATEGORY_LABELS: Record<string, string> = {
    cpu: 'CPU',
    mainboard: '主板',
    gpu: '显卡',
    ram: '内存',
    disk: '硬盘',
    power: '电源',
    cooling: '散热',
    case: '机箱',
    fan: '风扇',
    monitor: '显示器'
};

const DEFAULT_AI_SETTINGS: AISettings = {
    provider: 'deepseek',
    apiKey: '',
    baseUrl: '',
    model: '',
    enabled: false,
    persona: 'balanced',
    strategy: 'balanced',
    suggestions: [
        '3000元 办公主机',
        '5000元 游戏主机',
        '8000元 3A游戏主机',
        '10000元 直播主机',
        '15000元 高端海景房主机'
    ]
};

export default function AiManager() {
    const [aiConfig, setAiConfig] = useState<AISettings>(DEFAULT_AI_SETTINGS);
    const [dataHealth, setDataHealth] = useState<DataHealth | null>(null);
    const [loading, setLoading] = useState(true);
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean, msg: string } | null>(null);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [settings, health] = await Promise.all([
                    storage.getAISettings(),
                    ApiService.get('/ai/data-health').catch(() => null)
                ]);
                if (settings) {
                    setAiConfig({ ...DEFAULT_AI_SETTINGS, ...settings });
                }
                if (health) {
                    setDataHealth(health);
                }
            } catch (error) {
                console.error('Failed to load AI settings:', error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const handleSave = async () => {
        try {
            await storage.saveAISettings(aiConfig);
            alert('配单引擎配置已保存');
            setTestResult(null);
        } catch (error) {
            console.error('Failed to save AI settings:', error);
            alert('保存失败，请检查网络连接');
        }
    };

    const handleTest = async () => {
        if (!aiConfig.apiKey) {
            alert('请先填写 API Key');
            return;
        }
        const baseUrl = aiConfig.baseUrl || (aiConfig.provider === 'deepseek' ? 'https://api.deepseek.com/v1' : 'https://api.openai.com/v1');
        const model = aiConfig.model || (aiConfig.provider === 'deepseek' ? 'deepseek-chat' : 'gpt-3.5-turbo');

        setIsTesting(true);
        setTestResult(null);
        const startTime = Date.now();
        try {
            const response = await fetch(`${baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${aiConfig.apiKey}`
                },
                body: JSON.stringify({
                    model,
                    messages: [{ role: 'user', content: 'Hi' }],
                    max_tokens: 5
                })
            });
            const latency = Date.now() - startTime;
            if (response.ok) {
                setTestResult({ success: true, msg: `连接成功，${model} 响应正常（${latency}ms）` });
            } else {
                const errData = await response.json().catch(() => ({}));
                const errMsg = (errData as any)?.error?.message || `HTTP ${response.status}`;
                setTestResult({ success: false, msg: `连接失败：${errMsg}` });
            }
        } catch (e: any) {
            setTestResult({ success: false, msg: `网络错误：${e.message || '请检查 Base URL 或网络连接'}` });
        } finally {
            setIsTesting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center text-slate-400">
                加载设置中...
            </div>
        );
    }

    const totalProducts = dataHealth?.categories.reduce((sum, item) => sum + item.total, 0) || 0;
    const usableProducts = dataHealth?.categories.reduce((sum, item) => sum + item.usable, 0) || 0;
    const blockedProducts = dataHealth?.categories.reduce((sum, item) => sum + item.blocked, 0) || 0;

    return (
        <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                            <Bot size={20} />
                        </span>
                        <div>
                            <h3 className="text-lg font-black text-slate-800">智能配单引擎</h3>
                            <p className="text-xs font-medium text-slate-500">后端规则选件，AI 连接仅用于其它模型能力和后续说明润色。</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setAiConfig({ ...aiConfig, enabled: !aiConfig.enabled })}
                        className={`h-9 rounded-xl px-4 text-sm font-black transition-colors ${aiConfig.enabled ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'}`}
                    >
                        {aiConfig.enabled ? '已启用' : '已关闭'}
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                    <div className="space-y-5">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div>
                                <label className="mb-1 block text-sm font-bold text-slate-700">接入服务商</label>
                                <select
                                    value={aiConfig.provider}
                                    onChange={e => setAiConfig({ ...aiConfig, provider: e.target.value as any })}
                                    className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                >
                                    <option value="deepseek">DeepSeek</option>
                                    <option value="openai">OpenAI</option>
                                    <option value="custom">自定义</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-bold text-slate-700">模型名称</label>
                                <input
                                    type="text"
                                    value={aiConfig.model}
                                    onChange={e => setAiConfig({ ...aiConfig, model: e.target.value })}
                                    className="w-full rounded-lg border border-slate-200 p-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-indigo-500/20"
                                    placeholder="deepseek-chat"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-bold text-slate-700">配单策略</label>
                                <select
                                    value={aiConfig.strategy || 'balanced'}
                                    onChange={e => setAiConfig({ ...aiConfig, strategy: e.target.value as any })}
                                    className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                >
                                    <option value="balanced">均衡配置</option>
                                    <option value="performance">性能至上</option>
                                    <option value="budget">预算优先</option>
                                    <option value="aesthetic">颜值优先</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-sm font-bold text-slate-700">API Key（可选）</label>
                                <input
                                    type="password"
                                    value={aiConfig.apiKey}
                                    onChange={e => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                                    className="w-full rounded-lg border border-slate-200 p-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-indigo-500/20"
                                    placeholder="sk-..."
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-bold text-slate-700">Base URL（可选）</label>
                                <input
                                    type="text"
                                    value={aiConfig.baseUrl}
                                    onChange={e => setAiConfig({ ...aiConfig, baseUrl: e.target.value })}
                                    className="w-full rounded-lg border border-slate-200 p-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-indigo-500/20"
                                    placeholder="https://api.deepseek.com/v1"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-bold text-slate-700">前台快捷需求</label>
                            <textarea
                                value={aiConfig.suggestions?.join('\n') || ''}
                                onChange={e => setAiConfig({ ...aiConfig, suggestions: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })}
                                className="h-28 w-full resize-y rounded-xl border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                                placeholder="3000元 办公主机&#10;5000元 游戏主机&#10;10000元 直播主机"
                            />
                        </div>

                        {testResult && (
                            <div className={`rounded-lg border p-3 text-xs font-bold ${testResult.success ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-red-100 bg-red-50 text-red-700'}`}>
                                {testResult.msg}
                            </div>
                        )}

                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={handleTest}
                                disabled={isTesting}
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                            >
                                <Play size={16} /> {isTesting ? '连接中...' : '测试模型连接'}
                            </button>
                            <button
                                onClick={handleSave}
                                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition-colors hover:bg-indigo-700"
                            >
                                <Save size={16} /> 保存配置
                            </button>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                        <div className="mb-4 flex items-center gap-2 text-slate-800">
                            <ShieldCheck size={18} className="text-emerald-600" />
                            <h4 className="text-sm font-black">配单规则</h4>
                        </div>
                        <div className="space-y-2">
                            {(dataHealth?.rules || []).map((rule, index) => (
                                <div key={index} className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-600 ring-1 ring-slate-100">
                                    {rule}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                            <Database size={20} />
                        </span>
                        <div>
                            <h3 className="text-base font-black text-slate-800">商品数据健康度</h3>
                            <p className="text-xs font-medium text-slate-500">缺关键规格的商品不会进入自动配单。</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-lg bg-slate-50 px-3 py-2">
                            <div className="text-[10px] font-black text-slate-400">总数</div>
                            <div className="text-sm font-black text-slate-800">{totalProducts}</div>
                        </div>
                        <div className="rounded-lg bg-emerald-50 px-3 py-2">
                            <div className="text-[10px] font-black text-emerald-500">可用</div>
                            <div className="text-sm font-black text-emerald-700">{usableProducts}</div>
                        </div>
                        <div className="rounded-lg bg-amber-50 px-3 py-2">
                            <div className="text-[10px] font-black text-amber-500">待补</div>
                            <div className="text-sm font-black text-amber-700">{blockedProducts}</div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                    {(dataHealth?.categories || []).map(item => {
                        const ratio = item.total > 0 ? Math.round((item.usable / item.total) * 100) : 0;
                        const missingText = Object.entries(item.missing || {})
                            .map(([key, value]) => `${key} ${value}`)
                            .join(' / ');
                        return (
                            <div key={item.category} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                                <div className="mb-2 flex items-center justify-between">
                                    <span className="text-sm font-black text-slate-800">{CATEGORY_LABELS[item.category] || item.category}</span>
                                    <span className={`text-xs font-black ${ratio >= 90 ? 'text-emerald-600' : ratio >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>{ratio}%</span>
                                </div>
                                <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                                    <div className={`h-full ${ratio >= 90 ? 'bg-emerald-500' : ratio >= 70 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${ratio}%` }} />
                                </div>
                                <div className="mt-3 text-xs font-bold text-slate-500">
                                    {item.usable}/{item.total} 可自动使用
                                </div>
                                {item.blocked > 0 && (
                                    <div className="mt-2 flex items-start gap-1.5 text-[11px] font-bold text-amber-700">
                                        <AlertCircle size={12} className="mt-0.5 shrink-0" />
                                        <span>{missingText || `${item.blocked} 个缺关键规格`}</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
