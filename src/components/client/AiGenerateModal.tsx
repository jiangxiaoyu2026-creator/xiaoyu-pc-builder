import React, { useState, useEffect, useRef } from 'react';
import { Bot, Sparkles, X, RefreshCw, Activity, Cpu, Zap } from 'lucide-react';
import { aiBuilder, AIBuildResult, AIBuildLog } from '../../services/aiBuilder';
import { storage } from '../../services/storage';

export function AiGenerateModal({ onClose, onSubmit }: { onClose: () => void, onSubmit: (prompt: string, result?: AIBuildResult) => void }) {
    const [prompt, setPrompt] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [thinkSteps, setThinkSteps] = useState<AIBuildLog[]>([]);
    const [metrics, setMetrics] = useState({ load: 0, match: 0, latency: 0 });
    const [personaLabel, setPersonaLabel] = useState('');
    const [strategyLabel, setStrategyLabel] = useState('');
    const logEndRef = useRef<HTMLDivElement>(null);

    const [suggestions, setSuggestions] = useState<string[]>([]);

    // 加载 AI 设置中的性格和策略标签
    useEffect(() => {
        storage.getAISettings().then(s => {
            const p = s.persona || 'toxic';
            setPersonaLabel(p === 'toxic' ? '毒舌 (讽刺)' : p === 'professional' ? '专业 (PRO)' : p === 'enthusiastic' ? '热情' : '平衡');
            const st = s.strategy || 'balanced';
            setStrategyLabel(st === 'performance' ? '性能优先' : st === 'aesthetic' ? '颜值优先' : st === 'budget' ? '预算优先' : '均衡策略');

            if (s.suggestions && s.suggestions.length > 0) {
                setSuggestions(s.suggestions);
            } else {
                setSuggestions([
                    "3000元 办公主机",
                    "5000元 性价比游戏主机",
                    "8000元 直播主机",
                    "15000元 极致游戏主机",
                    "20000元 高端海景房主机"
                ]);
            }
        });
    }, []);

    // Dynamic metrics simulation
    useEffect(() => {
        if (!isThinking) return;
        const interval = setInterval(() => {
            setMetrics({
                load: Math.floor(Math.random() * 40) + 60,
                match: Math.min(100, Math.floor(thinkSteps.length * (100 / 6)) + Math.floor(Math.random() * 5)),
                latency: Math.floor(Math.random() * 200) + 100
            });
        }, 1500);
        return () => clearInterval(interval);
    }, [isThinking, thinkSteps]);

    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [thinkSteps]);



    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim()) return;

        setIsThinking(true);
        setThinkSteps([]);
        setMetrics({ load: 0, match: 0, latency: 0 });

        try {
            // 1. Analyze & Generate (Real Logic)
            const request = aiBuilder.parseRequest(prompt);
            const result = await aiBuilder.generateBuild(request);

            // 2. Animate the Logs (Replay "Thinking")
            for (const log of result.logs) {
                setThinkSteps(prev => [...prev, log]);

                // Variable speed based on complexity
                const duration = log.type === 'search' ? 800 : log.type === 'match' ? 400 : 600;
                await new Promise(r => setTimeout(r, duration));
            }

            // Short pause at the end
            await new Promise(r => setTimeout(r, 600));

            // 3. Submit
            onSubmit(prompt, result);
        } catch (error) {
            console.error(error);
            setThinkSteps(prev => [...prev, { type: 'analysis', step: '错误', detail: '[严重错误] 神经核心溢出，强制恢复失败。' }]);
        }
    };

    const parseLogDetail = (detail: string) => {
        const match = detail.match(/^\[(.*?)\] (.*)$/);
        if (match) {
            return { tag: match[1], text: match[2] };
        }
        return { tag: 'LOG', text: detail };
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center md:p-4 bg-slate-950/60 backdrop-blur-md animate-fade-in">
            <div className="relative w-full md:max-w-3xl h-[90vh] md:h-auto bg-slate-900 rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden animate-slide-up md:animate-scale-up ring-1 ring-white/10 group flex flex-col">
                {/* Background Effects */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
                <div className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none animate-pulse-slow"></div>
                <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>

                {/* Header */}
                <div className="relative p-8 pb-6 border-b border-white/10 flex items-start justify-between bg-gradient-to-r from-slate-900 via-indigo-950/20 to-slate-900 backdrop-blur-2xl">
                    <div className="flex items-center gap-5">
                        <div className={`relative w-16 h-16 rounded-2xl p-[1.5px] group/icon overflow-hidden ${isThinking ? 'animate-pulse' : ''}`}>
                            {/* Rotating border effect */}
                            <div className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,#6366f1,#a855f7,#6366f1)] animate-[spin_4s_linear_infinite] opacity-40"></div>
                            <div className="relative w-full h-full bg-slate-900 rounded-2xl flex items-center justify-center overflow-hidden">
                                {isThinking ? (
                                    <RefreshCw size={28} className="text-indigo-400 animate-spin" />
                                ) : (
                                    <Bot size={34} className="text-white drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                                )}
                                {/* Inner Glow */}
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20"></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-2xl font-black text-white tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                                    {isThinking ? '神经网络计算中' : '小鱼 AI 顾问'}
                                </h2>
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30">
                                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></div>
                                    <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest">System Online</span>
                                </div>
                            </div>
                            <p className="text-slate-400 text-sm mt-1.5 font-medium flex items-center gap-2">
                                <Sparkles size={14} className="text-indigo-400" />
                                {isThinking ? '正在执行向量检索与兼容性拓扑计算...' : '基于大语言模型的硬件专家'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all hover:rotate-90">
                        <X size={24} />
                    </button>
                </div>

                {/* Content Area */}
                <div className="relative p-8 pt-6 flex-1 overflow-y-auto">
                    {isThinking ? (
                        <div className="flex flex-col gap-6">
                            {/* Metrics Dashboard */}
                            {/* Metrics Dashboard */}
                            <div className="grid grid-cols-3 gap-5">
                                <div className="relative bg-slate-950/40 rounded-2xl p-4 border border-white/10 overflow-hidden group/metric transition-all hover:bg-slate-950/60 hover:border-indigo-500/30">
                                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover/metric:opacity-100 transition-opacity"></div>
                                    <div className="relative flex flex-col gap-2">
                                        <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase tracking-widest font-black">
                                            <Cpu size={14} className="text-indigo-400" />
                                            神经负载
                                        </div>
                                        <div className="text-2xl font-black font-mono text-white tracking-tighter flex items-baseline gap-1">
                                            {metrics.load}<span className="text-xs text-indigo-500">%</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-slate-800/50 rounded-full overflow-hidden mt-1 ring-1 ring-white/5">
                                            <div className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 transition-all duration-1000 shadow-[0_0_8px_rgba(99,102,241,0.5)]" style={{ width: `${metrics.load}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="relative bg-slate-950/40 rounded-2xl p-4 border border-white/10 overflow-hidden group/metric transition-all hover:bg-slate-950/60 hover:border-emerald-500/30">
                                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover/metric:opacity-100 transition-opacity"></div>
                                    <div className="relative flex flex-col gap-2">
                                        <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase tracking-widest font-black">
                                            <Activity size={14} className="text-emerald-400" />
                                            匹配率
                                        </div>
                                        <div className="text-2xl font-black font-mono text-white tracking-tighter flex items-baseline gap-1">
                                            {metrics.match}<span className="text-xs text-emerald-500">%</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-slate-800/50 rounded-full overflow-hidden mt-1 ring-1 ring-white/5">
                                            <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-1000 shadow-[0_0_8px_rgba(16,185,129,0.5)]" style={{ width: `${metrics.match}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="relative bg-slate-950/40 rounded-2xl p-4 border border-white/10 overflow-hidden group/metric transition-all hover:bg-slate-950/60 hover:border-amber-500/30">
                                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover/metric:opacity-100 transition-opacity"></div>
                                    <div className="relative flex flex-col gap-2">
                                        <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase tracking-widest font-black">
                                            <Zap size={14} className="text-amber-400" />
                                            实时延迟
                                        </div>
                                        <div className="text-2xl font-black font-mono text-white tracking-tighter flex items-baseline gap-1">
                                            {metrics.latency}<span className="text-xs text-amber-500">ms</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-slate-800/50 rounded-full overflow-hidden mt-1 ring-1 ring-white/5">
                                            <div className="h-full bg-gradient-to-r from-amber-600 to-amber-400 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]" style={{ width: '100%' }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Terminal Window */}
                            <div className="min-h-[300px] max-h-[400px] bg-black/40 rounded-2xl border border-white/5 p-6 font-mono text-sm relative overflow-y-auto no-scrollbar shadow-inner ring-1 ring-white/5">
                                {/* Terminal Scanline & Blur */}
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-500/[0.03] to-transparent h-48 w-full animate-scan pointer-events-none"></div>
                                <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#4f46e5_1px,transparent_1px)] [background-size:20px_20px]"></div>

                                {/* Active Stats Row */}
                                <div className="flex items-center gap-4 mb-6 pb-4 border-b border-white/5 relative z-10 shrink-0">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">认知模式</span>
                                        <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs w-fit flex items-center gap-1.5 shadow-[0_0_10px_rgba(99,102,241,0.2)]">
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                                            {personaLabel || '加载中...'}
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">启发式策略</span>
                                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs w-fit flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                            {strategyLabel || '加载中...'}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-4 relative z-10">
                                    {thinkSteps.map((log, i) => {
                                        const { tag, text } = parseLogDetail(log.detail);
                                        const isSystem = tag === 'SYSTEM' || tag === 'ENV';
                                        const isCritical = tag === 'CRITICAL' || tag === 'CRIT';
                                        const isCore = tag === 'CORE';

                                        return (
                                            <div key={i} className="flex flex-col gap-1.5 animate-fade-in group/log">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[10px] text-slate-600 font-bold tracking-tighter opacity-50">
                                                        {new Date().toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                    </span>
                                                    <span className={`px-1.5 py-0.5 rounded-[4px] text-[9px] font-black tracking-widest uppercase border ${isSystem ? 'bg-slate-500/10 text-slate-400 border-slate-500/20' :
                                                        isCritical ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                                            isCore ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                                                                'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                        }`}>
                                                        {tag}
                                                    </span>
                                                    <div className="h-[1px] flex-grow bg-white/5 group-hover/log:bg-white/10 transition-colors"></div>
                                                </div>
                                                <div className="pl-14">
                                                    <span className={`leading-relaxed ${isCritical ? 'text-rose-300' :
                                                        isCore ? 'text-white font-medium' :
                                                            'text-slate-300'
                                                        }`}>
                                                        {text}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={logEndRef} className="h-2" />
                                    {isThinking && (
                                        <div className="flex items-center gap-2 pl-14 text-indigo-500/60 animate-pulse">
                                            <RefreshCw size={12} className="animate-spin" />
                                            <span className="text-[10px] font-bold tracking-widest uppercase">处理缓冲区...</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div className="group/input relative">
                                {/* Animated glow background for textarea */}
                                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-2xl blur-lg opacity-0 group-focus-within/input:opacity-100 transition-opacity duration-500"></div>
                                <textarea
                                    value={prompt}
                                    onChange={e => setPrompt(e.target.value)}
                                    className="relative w-full h-44 pl-8 pr-8 py-7 bg-slate-950/40 border border-white/10 rounded-2xl font-medium text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all resize-none text-lg placeholder-slate-500 shadow-2xl backdrop-blur-sm"
                                    placeholder="请描述您的装机需求，例如：&#10;“我想配一台白色海景房主机，主要玩3A大作，预算1万元左右...”"
                                    autoFocus
                                />
                                <div className="absolute bottom-6 right-6 flex items-center gap-2 py-1.5 px-3 rounded-full bg-black/40 border border-white/10 backdrop-blur-md pointer-events-none shadow-xl group-focus-within/input:border-indigo-500/30 transition-colors">
                                    <Sparkles size={12} className="text-indigo-400 animate-pulse" />
                                    <span className="text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase">NEURAL CORE V4.2</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-2 px-1">
                                    <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
                                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">启发式建议 Heuristics</span>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    {suggestions.map((s, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => setPrompt(s)}
                                            className="px-4 py-2.5 bg-slate-900/40 hover:bg-indigo-600/10 hover:text-white text-slate-400 text-sm rounded-xl border border-white/5 hover:border-indigo-500/40 transition-all flex items-center gap-3 group/chip shadow-sm backdrop-blur-sm"
                                        >
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-700 group-hover/chip:bg-indigo-400 transition-colors group-hover/chip:scale-125 shadow-[0_0_8px_transparent] group-hover/chip:shadow-indigo-500/50"></div>
                                            <span className="font-semibold tracking-wide">{s}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={!prompt.trim()}
                                className="relative w-full py-6 group/btn overflow-hidden rounded-2xl transition-all active:scale-[0.98] disabled:opacity-40 disabled:grayscale"
                            >
                                {/* Gradient Background */}
                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 bg-[length:200%_auto] animate-gradient flex items-center justify-center"></div>
                                {/* Shine Effect */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700"></div>

                                <div className="relative z-10 flex items-center justify-center gap-4 text-white">
                                    <Activity className={`${prompt.trim() ? 'animate-pulse' : ''}`} size={22} />
                                    <span className="text-lg font-black tracking-[0.2em] uppercase">启动智能构建引擎</span>
                                    <Zap size={18} className="text-amber-300 transition-transform group-hover/btn:scale-125" />
                                </div>

                                <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(255,255,255,0.1)] rounded-2xl"></div>
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}
