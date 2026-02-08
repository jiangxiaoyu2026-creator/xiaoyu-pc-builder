import React, { useState } from 'react';
import { Bot, Sparkles, X, RefreshCw } from 'lucide-react';
import { aiBuilder, AIBuildResult } from '../../services/aiBuilder';

export function AiGenerateModal({ onClose, onSubmit }: { onClose: () => void, onSubmit: (prompt: string, result?: AIBuildResult) => void }) {
    const [prompt, setPrompt] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [thinkSteps, setThinkSteps] = useState<string[]>([]);

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

        try {
            // 1. Analyze & Generate (Real Logic)
            const request = aiBuilder.parseRequest(prompt);
            const result = aiBuilder.generateBuild(request);

            // 2. Animate the Logs (Replay "Thinking")
            for (const log of result.logs) {
                setThinkSteps(prev => [...prev, log.detail]);

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
            setThinkSteps(prev => [...prev, "系统繁忙，请稍后再试..."]);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center md:p-4 bg-slate-950/60 backdrop-blur-md animate-fade-in">
            <div className="relative w-full md:max-w-2xl h-[90vh] md:h-auto bg-slate-900 rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden animate-slide-up md:animate-scale-up ring-1 ring-white/10 group">
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
                            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                                {isThinking ? 'AI 深度运算中...' : '小鱼 AI 智能顾问'}
                                <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono tracking-wider">PRO</span>
                            </h2>
                            <p className="text-slate-400 text-sm mt-1 font-medium">
                                {isThinking ? '正在分析需求并匹配最佳硬件组合...' : '基于 LLM 深度学习模型的装机专家'}
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
                        <div className="min-h-[300px] bg-black/20 rounded-2xl border border-white/5 p-6 font-mono text-sm relative overflow-hidden">
                            {/* Terminal Scanline */}
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-500/5 to-transparent h-32 w-full animate-scan pointer-events-none"></div>

                            <div className="flex items-center gap-4 mb-6 pb-4 border-b border-white/5 relative z-10">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Current Persona</span>
                                    <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs w-fit">
                                        {(() => {
                                            const p = require('../../services/storage').storage.getAISettings().persona;
                                            return p === 'toxic' ? '毒舌吐槽 (Toxic)' : p === 'professional' ? '专业稳重 (PRO)' : p === 'enthusiastic' ? '热心小姐姐' : '均衡模式';
                                        })()}
                                    </span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Logic Strategy</span>
                                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs w-fit">
                                        {(() => {
                                            const s = require('../../services/storage').storage.getAISettings().strategy;
                                            return s === 'performance' ? '性能至上' : s === 'aesthetic' ? '颜值巅峰' : s === 'budget' ? '极致性价比' : '均衡之道';
                                        })()}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-3 relative z-10">
                                {thinkSteps.map((step, i) => (
                                    <div key={i} className="flex items-start gap-4 animate-fade-in">
                                        <span className="text-indigo-500 shrink-0 mt-0.5 font-bold">[{new Date().toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
                                        <span className="text-slate-300">{step}</span>
                                        {i === thinkSteps.length - 1 && <span className="w-2 h-4 bg-indigo-500/60 animate-pulse inline-block align-middle ml-1"></span>}
                                    </div>
                                ))}
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
                                <div className="absolute bottom-4 right-4 flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-900/80 px-2 py-1 rounded border border-white/5 pointer-events-none">
                                    <Sparkles size={10} className="text-indigo-500" />
                                    AI Powered
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Sparkles size={14} className="text-indigo-400" />
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">灵感推荐</span>
                                </div>
                                <div className="flex flex-wrap gap-2.5">
                                    {SUGGESTIONS.map((s, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => setPrompt(s)}
                                            className="px-3.5 py-2 bg-slate-800 hover:bg-indigo-600/10 hover:text-indigo-300 text-slate-400 text-sm rounded-xl border border-slate-700/50 hover:border-indigo-500/30 transition-all text-left group"
                                        >
                                            <span className="group-hover:translate-x-0.5 transition-transform inline-block">{s}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={!prompt.trim()}
                                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-lg rounded-2xl shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50 disabled:grayscale disabled:pointer-events-none group/btn relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300 skew-y-12"></div>
                                <Sparkles className="animate-pulse" />
                                <span className="relative z-10">立即生成方案</span>
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}
