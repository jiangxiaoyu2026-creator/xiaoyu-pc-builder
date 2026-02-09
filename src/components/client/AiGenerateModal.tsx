import React, { useState, useEffect, useRef } from 'react';
import { Bot, Sparkles, X, RefreshCw, Activity, Cpu, Database, Zap } from 'lucide-react';
import { aiBuilder, AIBuildResult, AIBuildLog } from '../../services/aiBuilder';
import { storage } from '../../services/storage';

export function AiGenerateModal({ onClose, onSubmit }: { onClose: () => void, onSubmit: (prompt: string, result?: AIBuildResult) => void }) {
    const [prompt, setPrompt] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [thinkSteps, setThinkSteps] = useState<AIBuildLog[]>([]);
    const [metrics, setMetrics] = useState({ load: 0, match: 0, latency: 0 });
    const logEndRef = useRef<HTMLDivElement>(null);

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

    const SUGGESTIONS = [
        "3000元办公电脑",
        "5000元性价比游戏主机",
        "8000元带显示器的直播电脑",
        "15000的极致游戏电脑",
        "20000元的高端高颜值主机"
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim()) return;

        setIsThinking(true);
        setThinkSteps([]);
        setMetrics({ load: 0, match: 0, latency: 0 });

        try {
            // 1. Analyze & Generate (Real Logic)
            const request = aiBuilder.parseRequest(prompt);
            const result = aiBuilder.generateBuild(request);

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
            setThinkSteps(prev => [...prev, { type: 'analysis', step: 'ERROR', detail: '[CRITICAL] 系统内核溢出，尝试强制恢复路径失败。' }]);
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
            <div className="relative w-full md:max-w-3xl h-[90vh] md:h-auto bg-slate-900 rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden animate-slide-up md:animate-scale-up ring-1 ring-white/10 group">
                {/* Background Effects */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
                <div className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none animate-pulse-slow"></div>
                <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>

                {/* Header */}
                <div className="relative p-8 pb-6 border-b border-white/5 flex items-start justify-between bg-gradient-to-r from-slate-900/50 to-indigo-950/30 backdrop-blur-xl">
                    <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 p-[1px] shadow-lg shadow-indigo-500/30 ${isThinking ? 'animate-pulse' : ''}`}>
                            <div className="w-full h-full bg-slate-900 rounded-2xl flex items-center justify-center relative overflow-hidden">
                                {isThinking ? (
                                    <RefreshCw size={28} className="text-indigo-400 animate-spin" />
                                ) : (
                                    <Bot size={32} className="text-white fill-indigo-500/20" />
                                )}
                                {/* Inner Glow */}
                                <div className="absolute inset-0 bg-indigo-500/20 blur-md"></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-2xl font-bold text-white tracking-tight">
                                    {isThinking ? 'AI 神经网络演算中' : '小鱼 AI 核心顾问'}
                                </h2>
                                <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono tracking-wider animate-pulse">SYSTEM ONLINE</span>
                            </div>
                            <p className="text-slate-400 text-sm mt-1 font-medium">
                                {isThinking ? '正在进行全特征向量检索与兼容性拓扑计算...' : '基于 LLM 深度学习模型的硬件专家。'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Content Area */}
                <div className="relative p-8 pt-6">
                    {isThinking ? (
                        <div className="flex flex-col gap-6">
                            {/* Metrics Dashboard */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-slate-950/50 rounded-xl p-3 border border-white/5 flex flex-col gap-1 items-center justify-center group/metric transition-all hover:bg-slate-950/80">
                                    <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                                        <Cpu size={12} className="text-indigo-500" />
                                        Neural Load
                                    </div>
                                    <div className="text-xl font-mono text-indigo-400 font-bold tracking-tighter">
                                        {metrics.load}%
                                    </div>
                                    <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-1">
                                        <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${metrics.load}%` }}></div>
                                    </div>
                                </div>
                                <div className="bg-slate-950/50 rounded-xl p-3 border border-white/5 flex flex-col gap-1 items-center justify-center group/metric transition-all hover:bg-slate-950/80">
                                    <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                                        <Activity size={12} className="text-emerald-500" />
                                        Match Rate
                                    </div>
                                    <div className="text-xl font-mono text-emerald-400 font-bold tracking-tighter">
                                        {metrics.match}%
                                    </div>
                                    <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-1">
                                        <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${metrics.match}%` }}></div>
                                    </div>
                                </div>
                                <div className="bg-slate-950/50 rounded-xl p-3 border border-white/5 flex flex-col gap-1 items-center justify-center group/metric transition-all hover:bg-slate-950/80">
                                    <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                                        <Zap size={12} className="text-amber-500" />
                                        Latency
                                    </div>
                                    <div className="text-xl font-mono text-amber-400 font-bold tracking-tighter">
                                        {metrics.latency}ms
                                    </div>
                                    <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-1">
                                        <div className="h-full bg-amber-500 animate-pulse" style={{ width: '100%' }}></div>
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
                                        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Cognitive Mode</span>
                                        <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs w-fit flex items-center gap-1.5 shadow-[0_0_10px_rgba(99,102,241,0.2)]">
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                                            {(() => {
                                                const p = storage.getAISettings().persona;
                                                return p === 'toxic' ? '毒舌吐槽 (Toxic)' : p === 'professional' ? '专业稳重 (PRO)' : p === 'enthusiastic' ? '热心小姐姐' : '均衡模式';
                                            })()}
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Heuristic Strategy</span>
                                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs w-fit flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                            {(() => {
                                                const s = storage.getAISettings().strategy;
                                                return s === 'performance' ? '性能至上' : s === 'aesthetic' ? '颜值巅峰' : s === 'budget' ? '极致性价比' : '均衡之道';
                                            })()}
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
                                            <span className="text-[10px] font-bold tracking-widest uppercase">Processing Buffer...</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="group/input relative">
                                <textarea
                                    value={prompt}
                                    onChange={e => setPrompt(e.target.value)}
                                    className="w-full h-40 pl-6 pr-6 py-5 bg-slate-800/50 border border-slate-700 rounded-2xl font-medium text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all resize-none text-lg placeholder-slate-500 shadow-inner"
                                    placeholder="描述您的需求，例如：&#10;“我想配一台白色海景房主机，主要玩黑神话悟空，预算1万左右...”"
                                    autoFocus
                                />
                                <div className="absolute bottom-4 right-4 flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-900/80 px-2 py-1 rounded border border-white/5 pointer-events-none shadow-xl">
                                    <Sparkles size={10} className="text-indigo-500 animate-pulse" />
                                    NEURAL CORE V4
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Database size={14} className="text-indigo-400" />
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">启发式特征推荐</span>
                                </div>
                                <div className="flex flex-wrap gap-2.5">
                                    {SUGGESTIONS.map((s, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => setPrompt(s)}
                                            className="px-3.5 py-2 bg-slate-800 hover:bg-indigo-600/10 hover:text-indigo-300 text-slate-400 text-sm rounded-xl border border-slate-700/50 hover:border-indigo-500/30 transition-all text-left group flex items-center gap-2"
                                        >
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-700 group-hover:bg-indigo-500 transition-colors"></div>
                                            <span className="group-hover:translate-x-0.5 transition-transform inline-block">{s}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={!prompt.trim()}
                                className="w-full py-5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-lg rounded-2xl shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_40px_rgba(79,70,229,0.5)] transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50 disabled:grayscale disabled:pointer-events-none group/btn relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300 skew-y-12"></div>
                                <Activity className="animate-pulse" />
                                <span className="relative z-10 tracking-widest uppercase text-sm">Initialize Neural Construction</span>
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}
