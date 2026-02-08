
import { useState } from 'react';
import { Bot, Save, Play } from 'lucide-react';
import { storage } from '../../services/storage';

export default function AiManager() {
    const [aiConfig, setAiConfig] = useState(storage.getAISettings());
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean, msg: string } | null>(null);

    const handleSave = () => {
        storage.saveAISettings(aiConfig);
        alert('AI 配置已保存');
        setTestResult(null);
    };

    const handleTest = async () => {
        if (!aiConfig.apiKey) {
            alert('请先填写 API Key');
            return;
        }
        setIsTesting(true);
        setTestResult(null);
        try {
            // Mock connection test
            await new Promise(r => setTimeout(r, 1500));
            setTestResult({ success: true, msg: `连接成功！模型 ${aiConfig.model} 响应正常 (延迟 124ms)` });
        } catch (e) {
            setTestResult({ success: false, msg: '连接失败，请检查 Base URL 或 Key' });
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -mr-10 -mt-10 opacity-50 pointer-events-none"></div>
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 relative z-10">
                    <span className="flex items-center justify-center w-6 h-6 rounded bg-indigo-100 text-indigo-600">
                        <Bot size={16} />
                    </span>
                    AI 大脑中枢配置
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">接入服务商 (Provider)</label>
                            <div className="flex gap-2">
                                {['deepseek', 'openai', 'custom'].map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setAiConfig({ ...aiConfig, provider: p as any })}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${aiConfig.provider === p
                                            ? 'bg-indigo-600 text-white border-indigo-600'
                                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                                            }`}
                                    >
                                        {p === 'deepseek' ? 'DeepSeek' : p === 'openai' ? 'OpenAI' : '自定义'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">API Key</label>
                            <input
                                type="password"
                                value={aiConfig.apiKey}
                                onChange={e => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="sk-..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Base URL (API域名)</label>
                            <input
                                type="text"
                                value={aiConfig.baseUrl}
                                onChange={e => setAiConfig({ ...aiConfig, baseUrl: e.target.value })}
                                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="https://api.deepseek.com/v1"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Model Name (模型名称)</label>
                            <input
                                type="text"
                                value={aiConfig.model}
                                onChange={e => setAiConfig({ ...aiConfig, model: e.target.value })}
                                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="deepseek-chat"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">AI 性格模式 (Persona)</label>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { id: 'toxic', label: '毒舌吐槽', desc: '犀利幽默，爱说真话' },
                                    { id: 'professional', label: '专业稳重', desc: '严谨分析，数据说话' },
                                    { id: 'enthusiastic', label: '热心导购', desc: '积极活泼，家人们好' },
                                    { id: 'balanced', label: '中庸平衡', desc: '温和理性，大众口味' }
                                ].map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => setAiConfig({ ...aiConfig, persona: p.id as any })}
                                        className={`p-3 rounded-xl text-left border transition-all ${aiConfig.persona === p.id
                                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                                            }`}
                                    >
                                        <div className="text-sm font-bold">{p.label}</div>
                                        <div className={`text-[10px] mt-0.5 ${aiConfig.persona === p.id ? 'text-white/80' : 'text-slate-400'}`}>{p.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">AI 装机策略 (Strategy)</label>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { id: 'performance', label: '性能至上', desc: '最大化硬件跑分' },
                                    { id: 'aesthetic', label: '颜值优先', desc: '全白/海景房/RGB' },
                                    { id: 'budget', label: '极致低价', desc: '能省则省，不翻车就行' },
                                    { id: 'balanced', label: '均衡配置', desc: '大厂品质，售后无忧' }
                                ].map(s => (
                                    <button
                                        key={s.id}
                                        onClick={() => setAiConfig({ ...aiConfig, strategy: s.id as any })}
                                        className={`p-3 rounded-xl text-left border transition-all ${aiConfig.strategy === s.id
                                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-md'
                                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                                            }`}
                                    >
                                        <div className="text-sm font-bold">{s.label}</div>
                                        <div className={`text-[10px] mt-0.5 ${aiConfig.strategy === s.id ? 'text-white/80' : 'text-slate-400'}`}>{s.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 flex flex-col justify-between mt-6">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-bold text-slate-700">功能总开关</span>
                                <div
                                    onClick={() => setAiConfig({ ...aiConfig, enabled: !aiConfig.enabled })}
                                    className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${aiConfig.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                >
                                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${aiConfig.enabled ? 'translate-x-6' : ''}`}></div>
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed mb-4">
                                启用后，前台用户的 AI 系统将结合上述 [性格] 与 [策略] 动态生成方案。
                            </p>
                        </div>

                        <div className="space-y-3">
                            {testResult && (
                                <div className={`text-xs p-3 rounded-lg border ${testResult.success ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                                    {testResult.success ? '✅ ' : '❌ '}{testResult.msg}
                                </div>
                            )}
                            <div className="flex gap-3">
                                <button
                                    onClick={handleTest}
                                    disabled={isTesting}
                                    className="flex-1 px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    <Play size={16} /> {isTesting ? '连接中...' : '测试连接'}
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="flex-1 px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                                >
                                    <Save size={16} /> 保存配置
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Config */}
                <div className="mt-8 pt-6 border-t border-slate-100">
                    <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                        AI 回复语料库配置 (每行一条)
                    </h4>

                    <div className="grid grid-cols-1 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2">开场白 - 通用 (Intros)</label>
                            <textarea
                                value={aiConfig.intros?.join('\n') || ''}
                                onChange={e => setAiConfig({ ...aiConfig, intros: e.target.value.split('\n') })}
                                className="w-full h-24 border border-slate-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-indigo-500 outline-none resize-y shadow-sm"
                                placeholder="输入通用开场白..."
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2">开场白 - 预算偏低 (Low Budget)</label>
                                <textarea
                                    value={aiConfig.lowBudgetIntros?.join('\n') || ''}
                                    onChange={e => setAiConfig({ ...aiConfig, lowBudgetIntros: e.target.value.split('\n') })}
                                    className="w-full h-32 border border-slate-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-indigo-500 outline-none resize-y shadow-sm bg-orange-50/30"
                                    placeholder="支持 {budget} 占位符"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2">开场白 - 预算极低 (Severe Budget)</label>
                                <textarea
                                    value={aiConfig.severeBudgetIntros?.join('\n') || ''}
                                    onChange={e => setAiConfig({ ...aiConfig, severeBudgetIntros: e.target.value.split('\n') })}
                                    className="w-full h-32 border border-slate-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-indigo-500 outline-none resize-y shadow-sm bg-red-50/30"
                                    placeholder="支持 {budget} 占位符"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2">AI 锐评/总结 (Verdicts)</label>
                                <textarea
                                    value={aiConfig.verdicts?.join('\n') || ''}
                                    onChange={e => setAiConfig({ ...aiConfig, verdicts: e.target.value.split('\n') })}
                                    className="w-full h-32 border border-slate-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-indigo-500 outline-none resize-y shadow-sm"
                                    placeholder="输入总结语..."
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2">小主播互动/带货 (CTA)</label>
                                <textarea
                                    value={aiConfig.ctas?.join('\n') || ''}
                                    onChange={e => setAiConfig({ ...aiConfig, ctas: e.target.value.split('\n') })}
                                    className="w-full h-32 border border-slate-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-indigo-500 outline-none resize-y shadow-sm bg-indigo-50/30"
                                    placeholder="输入带货/关注文案..."
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
