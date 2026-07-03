import React, { useState, useEffect, useRef } from 'react';
import { Bot, Sparkles, X, RefreshCw, Activity, Zap } from 'lucide-react';
import { aiBuilder, AIBuildResult, AIBuildLog } from '../../services/aiBuilder';
import { storage } from '../../services/storage';
import { ApiService } from '../../services/api';

const DEFAULT_SUGGESTIONS = [
    "3000元 办公主机",
    "5000元 性价比游戏主机",
    "8000元 直播主机",
    "15000元 极致游戏主机",
    "20000元 高端海景房主机"
];

export function AiGenerateModal({ onClose, onSubmit }: { onClose: () => void, onSubmit: (prompt: string, result?: AIBuildResult) => void }) {
    const [prompt, setPrompt] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [thinkSteps, setThinkSteps] = useState<AIBuildLog[]>([]);
    const logEndRef = useRef<HTMLDivElement>(null);

    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isAiEnabled, setIsAiEnabled] = useState(false);

    // 只加载公开配置，避免 C 端触碰敏感 AI Key。
    useEffect(() => {
        ApiService.get('/ai/public-config').then(config => {
            if (Array.isArray(config.suggestions) && config.suggestions.length > 0) {
                setSuggestions(config.suggestions);
            } else {
                setSuggestions(DEFAULT_SUGGESTIONS);
            }
            setIsAiEnabled(Boolean(config.enabled));
        }).catch(() => {
            setSuggestions(DEFAULT_SUGGESTIONS);
            setIsAiEnabled(false);
        });
    }, []);

    const loadingTips = [
        "正在解析装机需求...",
        "检索真实可售库存...",
        "反推硬件可用预算...",
        "匹配 CPU、主板和内存平台...",
        "校验机箱、电源和散热余量...",
        "生成可成交配置清单..."
    ];
    const [loadingTipIdx, setLoadingTipIdx] = useState(0);

    // Dynamic loading tips cycler
    useEffect(() => {
        if (!isThinking) return;
        const interval = setInterval(() => {
            setLoadingTipIdx(prev => (prev + 1) % loadingTips.length);
        }, 1200);
        return () => clearInterval(interval);
    }, [isThinking]);

    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [thinkSteps]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim() || !isAiEnabled) return;

        setIsThinking(true);
        setThinkSteps([]);
        setLoadingTipIdx(0);

        try {
            // 1. Analyze & Generate (Real API Call)
            const request = aiBuilder.parseRequest(prompt);
            const result = await aiBuilder.generateBuild(request);

            // 2. API 已返回，立即提交结果（不再等待日志动画播完）
            await storage.logAiGeneration();
            onSubmit(prompt, result);
        } catch (error) {
            console.error(error);
            setThinkSteps(prev => [...prev, { type: 'analysis', step: '错误', detail: '[ERROR] 配单引擎返回失败，请稍后重试。' }]);
            setIsThinking(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center md:p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full md:max-w-3xl h-[90vh] md:h-auto bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden animate-slide-up md:animate-scale-up ring-1 ring-slate-200/50 dark:ring-slate-700/50 flex flex-col">
                {/* Background Effects */}
                <div className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none animate-pulse-slow"></div>
                <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-purple-500/10 dark:bg-purple-500/20 rounded-full blur-[100px] pointer-events-none"></div>

                {/* Header */}
                <div className="relative p-6 md:p-8 pb-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
                    <div className="flex items-center gap-4">
                        <div className="relative w-14 h-14 bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/50 dark:to-slate-800 rounded-2xl flex items-center justify-center shadow-sm border border-indigo-200/50 dark:border-indigo-700/30 overflow-hidden">
                            {isThinking ? (
                                <>
                                    <div className="absolute inset-0 bg-indigo-500/10 dark:bg-indigo-500/20 animate-pulse"></div>
                                    <RefreshCw size={24} className="text-indigo-600 dark:text-indigo-400 animate-spin relative z-10" />
                                </>
                            ) : (
                                <Bot size={28} className="text-indigo-600 dark:text-indigo-400 relative z-10" />
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
                                    {isThinking ? '配单引擎运行中' : '智能配单引擎'}
                                </h2>
                                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${isAiEnabled ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200/50 dark:border-emerald-500/20' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${isAiEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></div>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isAiEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                        {isAiEnabled ? 'Ready' : 'Offline'}
                                    </span>
                                </div>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 flex items-center gap-1.5 font-medium">
                                <Sparkles size={14} className="text-indigo-500 dark:text-indigo-400" />
                                真实库存、最终价和兼容规则先过一遍
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all">
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
                                <div className="absolute inset-0 bg-indigo-400/20 dark:bg-indigo-500/20 rounded-full blur-[60px] animate-pulse-slow"></div>
                                <div className="absolute inset-0 bg-purple-400/10 dark:bg-purple-500/10 rounded-full blur-[40px] animate-ping"></div>
                                
                                {/* Inner Rings */}
                                <div className="relative w-32 h-32 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col items-center justify-center shadow-lg dark:shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
                                    <div className="absolute inset-[-1px] rounded-full border-t-2 border-indigo-500 animate-spin"></div>
                                    <div className="absolute inset-2 rounded-full border-b-2 border-purple-500 animate-[spin_1.5s_linear_infinite_reverse]"></div>
                                    <div className="absolute inset-4 rounded-full border border-slate-100 dark:border-slate-700/50"></div>
                                    
                                    <Bot size={36} className="text-indigo-600 dark:text-indigo-400 animate-pulse" />
                                </div>
                            </div>

                            {/* Status Text & Loading Bar */}
                            <div className="flex flex-col items-center gap-5 w-full max-w-sm">
                                <div className="text-center space-y-2">
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-white tracking-wide animate-fade-in key={loadingTipIdx}">
                                        {loadingTips[loadingTipIdx]}
                                    </h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm flex items-center justify-center gap-2 font-medium">
                                        <RefreshCw size={14} className="animate-spin text-indigo-500 dark:text-indigo-400" />
                                        <span>正在计算可成交方案，请稍候</span>
                                    </p>
                                </div>
                                
                                {/* Progress Bar */}
                                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative shadow-inner border border-slate-200/50 dark:border-slate-700/50">
                                    <div className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 w-1/2 rounded-full animate-[progressX_1.5s_ease-in-out_infinite] shadow-sm dark:shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
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
                                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/20 rounded-2xl blur-lg opacity-0 group-focus-within/input:opacity-100 transition-opacity duration-500"></div>
                                <textarea
                                    value={prompt}
                                    onChange={e => setPrompt(e.target.value)}
                                    className="relative w-full h-44 pl-8 pr-8 py-7 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all resize-none text-lg placeholder-slate-400 dark:placeholder-slate-500 shadow-sm dark:shadow-2xl backdrop-blur-sm"
                                    placeholder="请描述客户需求，例如：&#10;“i5-14600KF + RTX4070，预算8000，不带显示器”&#10;“白色海景房，主要玩3A，预算1万元左右”"
                                    autoFocus
                                />
                                <div className="absolute bottom-6 right-6 flex items-center gap-2 py-1.5 px-3 rounded-full bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 backdrop-blur-md pointer-events-none shadow-sm dark:shadow-xl group-focus-within/input:border-indigo-500/30 transition-colors">
                                    <Sparkles size={12} className="text-indigo-500 dark:text-indigo-400 animate-pulse" />
                                    <span className="text-[10px] font-black tracking-[0.2em] text-slate-500 dark:text-slate-400 uppercase">先算最终价，再验兼容</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-3 px-1 mb-2">
                                    <div className="flex gap-1.5">
                                        <div className="w-1 h-3 bg-indigo-200 dark:bg-indigo-500/40 rounded-full"></div>
                                        <div className="w-1 h-3 bg-indigo-400 dark:bg-indigo-500/70 rounded-full"></div>
                                        <div className="w-1 h-3 bg-indigo-500 rounded-full"></div>
                                    </div>
                                    <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] relative">
                                        快捷需求 <span className="opacity-50 ml-1 text-[10px]">可直接点击填入</span>
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    {/* 新增：粘贴客户配置单快捷按钮 */}
                                    <button
                                        type="button"
                                        onClick={() => setPrompt("请按照以下配件清单精准生成配置单（遇到缺货或型号不匹配的，请找非常相似的平替并在描述中说明）：\n\n")}
                                        className="relative px-5 py-3 bg-indigo-50 dark:bg-indigo-900/40 hover:bg-indigo-100 dark:hover:bg-indigo-800/60 text-indigo-700 dark:text-indigo-300 text-sm flex items-center gap-3 group/chip transition-all duration-300 rounded-2xl border border-indigo-200 dark:border-indigo-500/30 hover:border-indigo-300 dark:hover:border-indigo-400 shadow-sm dark:shadow-[0_0_15px_rgba(99,102,241,0.2)] backdrop-blur-md overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-200/50 dark:via-indigo-400/20 to-transparent -translate-x-full group-hover/chip:translate-x-full transition-transform duration-700"></div>
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 group-hover/chip:bg-indigo-600 dark:group-hover/chip:bg-indigo-300 transition-colors shadow-[0_0_10px_transparent] group-hover/chip:shadow-indigo-300 dark:group-hover/chip:shadow-indigo-400 animate-pulse"></div>
                                        <span className="font-bold tracking-wide relative z-10">粘贴客户配置单</span>
                                    </button>
                                    
                                    {suggestions.map((s, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => setPrompt(s)}
                                            className="relative px-5 py-3 bg-white dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-sm flex items-center gap-3 group/chip transition-all duration-300 rounded-2xl border border-slate-200 dark:border-white/5 hover:border-indigo-300 dark:hover:border-indigo-500/40 shadow-sm dark:shadow-lg backdrop-blur-md overflow-hidden"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-100 dark:via-indigo-500/10 to-transparent -translate-x-full group-hover/chip:translate-x-full transition-transform duration-700"></div>
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 group-hover/chip:bg-indigo-500 dark:group-hover/chip:bg-indigo-400 transition-colors shadow-[0_0_10px_transparent] group-hover/chip:shadow-indigo-300 dark:group-hover/chip:shadow-indigo-500"></div>
                                            <span className="font-bold tracking-wide relative z-10">{s}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={!prompt.trim() || !isAiEnabled}
                                className="relative w-full py-5 group/btn overflow-hidden rounded-2xl transition-all active:scale-[0.98] disabled:opacity-40 disabled:grayscale shadow-lg shadow-indigo-500/30"
                            >
                                {/* Gradient Background */}
                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_auto] animate-gradient flex items-center justify-center"></div>
                                {/* Shine Effect */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700"></div>

                                <div className="relative z-10 flex items-center justify-center gap-3 text-white">
                                    <Activity className={`${prompt.trim() ? 'animate-pulse' : ''}`} size={20} />
                                    <span className="text-lg font-black tracking-[0.2em] uppercase">{isAiEnabled ? '计算可成交配置' : '配单服务未启用'}</span>
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
