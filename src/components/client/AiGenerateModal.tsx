import React, { useState, useEffect, useRef } from 'react';
import { Bot, Sparkles, X, RefreshCw, Activity, Zap } from 'lucide-react';
import { aiBuilder, AIBuildResult, AIBuildLog } from '../../services/aiBuilder';
import { storage } from '../../services/storage';

export function AiGenerateModal({ onClose, onSubmit }: { onClose: () => void, onSubmit: (prompt: string, result?: AIBuildResult) => void }) {
    const [prompt, setPrompt] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [thinkSteps, setThinkSteps] = useState<AIBuildLog[]>([]);
    const logEndRef = useRef<HTMLDivElement>(null);

    const [suggestions, setSuggestions] = useState<string[]>([]);

    // 加载 AI 设置中的标签
    useEffect(() => {
        storage.getAISettings().then(s => {
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

    const loadingTips = [
        "正在解析装机需求...",
        "深度检索硬件数据库...",
        "执行物理兼容性校验...",
        "计算供电与散热拓扑...",
        "优化性价比模型...",
        "生成最终配置清单..."
    ];
    const [loadingTipIdx, setLoadingTipIdx] = useState(0);

    // Dynamic loading tips cycler
    useEffect(() => {
        if (!isThinking) return;
        const interval = setInterval(() => {
            setLoadingTipIdx(prev => (prev + 1) % loadingTips.length);
        }, 2500);
        return () => clearInterval(interval);
    }, [isThinking]);

    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [thinkSteps]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim()) return;

        setIsThinking(true);
        setThinkSteps([]);
        setLoadingTipIdx(0);

        try {
            // 1. Analyze & Generate (Real Logic)
            const request = aiBuilder.parseRequest(prompt);
            const result = await aiBuilder.generateBuild(request);

            // 2. Animate the Logs (Replay "Thinking") - 快速播放
            for (const log of result.logs) {
                setThinkSteps(prev => [...prev, log]);
                const duration = log.type === 'search' ? 200 : log.type === 'match' ? 150 : 100;
                await new Promise(r => setTimeout(r, duration));
            }

            // 短暂结束动画
            await new Promise(r => setTimeout(r, 200));

            // 3. Submit
            await storage.logAiGeneration();
            onSubmit(prompt, result);
        } catch (error) {
            console.error(error);
            setThinkSteps(prev => [...prev, { type: 'analysis', step: '错误', detail: '[严重错误] 神经核心溢出，强制恢复失败。' }]);
            setIsThinking(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center md:p-4 bg-slate-950/60 backdrop-blur-md animate-fade-in">
            <div className="relative w-full md:max-w-3xl h-[90vh] md:h-auto bg-[#0b0f19] rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden animate-slide-up md:animate-scale-up ring-1 ring-white/10 flex flex-col">
                {/* Background Effects */}
                <div className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none animate-pulse-slow"></div>
                <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none"></div>

                {/* Header */}
                <div className="relative p-6 md:p-8 pb-6 border-b border-white/5 flex items-start justify-between bg-white/[0.02] backdrop-blur-xl">
                    <div className="flex items-center gap-4">
                        <div className="relative w-14 h-14 bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl flex items-center justify-center shadow-inner border border-white/10 overflow-hidden">
                            {isThinking ? (
                                <>
                                    <div className="absolute inset-0 bg-indigo-500/20 animate-pulse"></div>
                                    <RefreshCw size={24} className="text-indigo-400 animate-spin relative z-10" />
                                </>
                            ) : (
                                <Bot size={28} className="text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)] relative z-10" />
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                                    {isThinking ? 'AI 构建引擎运行中' : '小鱼 AI 助手'}
                                </h2>
                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                    <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Online</span>
                                </div>
                            </div>
                            <p className="text-slate-400 text-sm mt-1 flex items-center gap-1.5">
                                <Sparkles size={14} className="text-indigo-400" />
                                极速为您匹配最佳硬件组合
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all">
                        <X size={24} />
                    </button>
                </div>

                {/* Content Area */}
                <div className="relative p-6 md:p-8 flex-1 overflow-y-auto custom-scrollbar">
                    {isThinking ? (
                        <div className="flex flex-col items-center justify-center py-16 md:py-20 gap-10">
                            {/* Central Animated Orb */}
                            <div className="relative flex items-center justify-center">
                                {/* Outer Glows */}
                                <div className="absolute inset-0 bg-indigo-500 rounded-full blur-[60px] opacity-20 animate-pulse-slow"></div>
                                <div className="absolute inset-0 bg-purple-500 rounded-full blur-[40px] opacity-10 animate-ping"></div>
                                
                                {/* Inner Rings */}
                                <div className="relative w-32 h-32 rounded-full border border-slate-800 bg-slate-950 flex flex-col items-center justify-center shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
                                    <div className="absolute inset-[-1px] rounded-full border-t-2 border-indigo-500 animate-spin"></div>
                                    <div className="absolute inset-2 rounded-full border-b-2 border-purple-500 animate-[spin_1.5s_linear_infinite_reverse]"></div>
                                    <div className="absolute inset-4 rounded-full border border-slate-800"></div>
                                    
                                    <Bot size={36} className="text-indigo-400 animate-pulse" />
                                </div>
                            </div>

                            {/* Status Text & Loading Bar */}
                            <div className="flex flex-col items-center gap-5 w-full max-w-sm">
                                <div className="text-center space-y-2">
                                    <h3 className="text-xl font-bold text-white tracking-wide animate-fade-in key={loadingTipIdx}">
                                        {loadingTips[loadingTipIdx]}
                                    </h3>
                                    <p className="text-slate-400 text-sm flex items-center justify-center gap-2">
                                        <RefreshCw size={14} className="animate-spin text-indigo-400" />
                                        <span>AI 模型正在高速运算，请稍候</span>
                                    </p>
                                </div>
                                
                                {/* Progress Bar */}
                                <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden relative shadow-inner border border-white/5">
                                    <div className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 w-1/2 rounded-full animate-[progressX_1.5s_ease-in-out_infinite] shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                                </div>
                                
                                {/* Embedded keyframe for progress animation */}
                                <style dangerouslySetInnerHTML={{__html: `
                                    @keyframes progressX {
                                        0% { left: -50%; }
                                        100% { left: 100%; }
                                    }
                                `}} />
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
                                <div className="flex items-center gap-3 px-1 mb-2">
                                    <div className="flex gap-1.5">
                                        <div className="w-1 h-3 bg-indigo-500/40 rounded-full"></div>
                                        <div className="w-1 h-3 bg-indigo-500/70 rounded-full"></div>
                                        <div className="w-1 h-3 bg-indigo-500 rounded-full"></div>
                                    </div>
                                    <span className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] relative">
                                        启发式快捷指令 <span className="opacity-50 ml-1 text-[10px]">HEURISTICS V2</span>
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    {/* 新增：粘贴客户配置单快捷按钮 */}
                                    <button
                                        type="button"
                                        onClick={() => setPrompt("请按照以下配件清单精准生成配置单（遇到缺货或型号不匹配的，请找非常相似的平替并在描述中说明）：\n\n")}
                                        className="relative px-5 py-3 bg-indigo-900/40 hover:bg-indigo-800/60 text-indigo-300 hover:text-white text-sm flex items-center gap-3 group/chip transition-all duration-300 rounded-2xl border border-indigo-500/30 hover:border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)] backdrop-blur-md overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-400/20 to-transparent -translate-x-full group-hover/chip:translate-x-full transition-transform duration-700"></div>
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 group-hover/chip:bg-indigo-300 transition-colors shadow-[0_0_10px_transparent] group-hover/chip:shadow-indigo-400 animate-pulse"></div>
                                        <span className="font-bold tracking-wide relative z-10">📋 粘贴客户配置单</span>
                                    </button>
                                    
                                    {suggestions.map((s, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => setPrompt(s)}
                                            className="relative px-5 py-3 bg-slate-800/40 hover:bg-slate-700/60 text-slate-300 hover:text-white text-sm flex items-center gap-3 group/chip transition-all duration-300 rounded-2xl border border-white/5 hover:border-indigo-500/40 shadow-lg backdrop-blur-md overflow-hidden"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/10 to-transparent -translate-x-full group-hover/chip:translate-x-full transition-transform duration-700"></div>
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-600 group-hover/chip:bg-indigo-400 transition-colors shadow-[0_0_10px_transparent] group-hover/chip:shadow-indigo-500"></div>
                                            <span className="font-bold tracking-wide relative z-10">{s}</span>
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
