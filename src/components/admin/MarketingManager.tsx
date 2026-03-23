import React, { useState, useRef } from 'react';
import { 
    TrendingUp, 
    Download, 
    Bot, 
    FileText, 
    Video, 
    Smartphone, 
    MessageCircle,
    Copy,
    CheckCircle2,
    RefreshCw
} from 'lucide-react';
import { ApiService } from '../../services/api';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import html2canvas from 'html2canvas';

type TopDrop = {
    category: string;
    hardwareName: string;
    oldPrice: number;
    newPrice: number;
    drop: number;
};

type GeneratedResult = {
    article_title: string;
    official_account: string;
    xiaohongshu: string;
    moments: string;
    video_script: string;
};

type DailyData = {
    date: string;
    top_drops_today: TopDrop[];
};

export default function MarketingManager() {
    const [externalNews, setExternalNews] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedData, setGeneratedData] = useState<GeneratedResult | null>(null);
    const [dailyData, setDailyData] = useState<DailyData | null>(null);
    const [activeTab, setActiveTab] = useState<'video' | 'xhs' | 'moments' | 'article'>('video');
    const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});

    const boardRef = useRef<HTMLDivElement>(null);

    const handleGenerate = async () => {
        setIsGenerating(true);
        setError(null);
        setGeneratedData(null);
        setDailyData(null);
        
        try {
            const result = await ApiService.post('/admin/marketing/generate-daily', { external_news: externalNews });
            
            if (result && result.status === 'success') {
                setGeneratedData(result.data);
            } else {
                throw new Error(result.detail || '生成失败');
            }
            
            try {
                const summaryData = await ApiService.get('/admin/marketing/daily-summary');
                if (summaryData && summaryData.topDrops) {
                    setDailyData({
                       date: summaryData.date,
                       top_drops_today: summaryData.topDrops
                    });
                }
            } catch (sumErr) {
                console.warn('Failed to fetch summary:', sumErr);
            }

        } catch (err: any) {
            setError(err.message || String(err));
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedStates({ ...copiedStates, [id]: true });
        setTimeout(() => {
            setCopiedStates({ ...copiedStates, [id]: false });
        }, 2000);
    };

    const downloadBoardAsImage = async () => {
        if (!boardRef.current) return;
        try {
            const canvas = await html2canvas(boardRef.current, {
                scale: 2,
                backgroundColor: '#0f172a', // slate-900
                logging: false,
            });
            const url = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = url;
            link.download = `今日硬件大盘_${new Date().toLocaleDateString()}.png`;
            link.click();
        } catch (err) {
            console.error('保存图片失败:', err);
        }
    };

    // 虚构一些趋势线数据让红绿大屏显得更专业（实战中可以从后端给）
    const mockTrendData = Array.from({ length: 15 }).map((_, i) => ({
        day: i,
        // 下跌趋势线
        value: 100 - i * 2 + Math.random() * 5
    }));

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)]">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <TrendingUp className="text-indigo-600" /> 
                        自动化硬件大盘与营销中心
                    </h1>
                    <p className="text-slate-500 mt-1">一键聚合今日行情，输出 B站/小红书/朋友圈 爆款文案与专业图片</p>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
                {/* Left Column: Data Input & Trigger */}
                <div className="col-span-4 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col gap-4">
                        <div className="flex items-center gap-2 text-slate-800 font-bold">
                            <Bot className="text-indigo-600" size={20} />
                            行业快讯投喂区 (必填)
                        </div>
                        <p className="text-xs text-slate-500">
                            将你在圈内、新闻网站上看到的重大硬件新闻粘贴在这里（例如：台积电产能吃紧、9950X发布等）。AI 将结合站内跳水榜，为你生成神级分析文案。
                        </p>
                        <textarea
                            value={externalNews}
                            onChange={(e) => setExternalNews(e.target.value)}
                            placeholder="粘贴今日硬件大事记..."
                            className="w-full h-40 p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-sm"
                        />
                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating || !externalNews.trim()}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold flex justify-center items-center gap-2 transition-all shadow-md hover:shadow-lg"
                        >
                            {isGenerating ? (
                                <>
                                    <RefreshCw className="animate-spin" size={20} />
                                    AI 正在深度解析大盘并爆肝写稿...
                                </>
                            ) : (
                                <>
                                    <TrendingUp size={20} />
                                    一键生成大盘看板与四端分发文案
                                </>
                            )}
                        </button>
                        {error && (
                            <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm">
                                {error}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Results & Dashboard */}
                <div className="col-span-8 flex flex-col h-full bg-slate-100 rounded-xl overflow-hidden shadow-inner relative border border-slate-300">
                    {!generatedData ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                            <TrendingUp size={64} className="mb-4 opacity-50 text-indigo-300" />
                            <p>输入行业资讯并点击左侧按钮</p>
                            <p className="text-sm">系统将自动渲染红绿大屏及四大平台营销文稿</p>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar p-6 gap-8">
                            
                            {/* --- 视觉核心：红绿大盘图片生成区 --- */}
                            <div className="relative">
                                <div className="flex justify-between items-end mb-3">
                                    <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                        <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
                                        专业视觉看板（视频背景 / 小红书首图）
                                    </h3>
                                    <button 
                                        onClick={downloadBoardAsImage}
                                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition"
                                    >
                                        <Download size={16} /> 保存大屏截图
                                    </button>
                                </div>
                                
                                <div 
                                    ref={boardRef}
                                    className="bg-slate-900 rounded-xl p-6 text-white overflow-hidden relative shadow-2xl border border-slate-700"
                                >
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500"></div>
                                    <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-4">
                                        <div>
                                            <h2 className="text-2xl font-black tracking-wider text-emerald-400">全网跳水王 TOP 榜单</h2>
                                            <p className="text-slate-400 text-xs mt-1 uppercase tracking-widest">{new Date().toLocaleDateString()} MARKET PULSE</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-3xl font-black text-emerald-400 font-mono">-18.4%</div>
                                            <p className="text-[10px] text-slate-500 uppercase">大盘综合跌幅指标</p>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-6">
                                        {/* Table side */}
                                        <div className="flex flex-col gap-2">
                                            <div className="grid grid-cols-12 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 border-b border-slate-800 pb-2">
                                                <div className="col-span-6">型号</div>
                                                <div className="col-span-3 text-right">旧价</div>
                                                <div className="col-span-3 text-right">新价</div>
                                            </div>
                                            {dailyData?.top_drops_today?.slice(0, 6).map((item, idx) => (
                                                <div key={idx} className="grid grid-cols-12 text-sm items-center py-2 border-b border-slate-800/50 hover:bg-slate-800/30 transition">
                                                    <div className="col-span-6 font-semibold text-slate-200 truncate pr-2">{item.hardwareName}</div>
                                                    <div className="col-span-3 text-right text-slate-500 line-through text-xs">¥{item.oldPrice}</div>
                                                    <div className="col-span-3 text-right text-emerald-400 font-bold font-mono text-base">¥{item.newPrice}</div>
                                                </div>
                                            ))}
                                            {(!dailyData || dailyData.top_drops_today.length === 0) && (
                                                <div className="text-slate-500 text-center py-8">今日大盘暂无异常波动</div>
                                            )}
                                        </div>
                                        
                                        {/* Chart side */}
                                        <div className="bg-slate-800/30 rounded-lg border border-slate-800 p-4 flex flex-col">
                                            <h4 className="text-xs text-slate-400 uppercase tracking-widest mb-4 font-bold">行业价格恐慌指数</h4>
                                            <div className="flex-1 w-full min-h-[150px]">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <AreaChart data={mockTrendData}>
                                                        <defs>
                                                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                                            </linearGradient>
                                                        </defs>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                                        <Tooltip 
                                                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                                                            itemStyle={{ color: '#10b981' }}
                                                        />
                                                        <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            </div>
                                            <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                                                <p className="text-emerald-400 text-xs text-center font-bold tracking-wide">
                                                    行情预警：内存与固态板块出现集体资金异动
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* --- AI 矩阵文案分发区 --- */}
                            <div className="flex flex-col flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="flex border-b border-slate-200 bg-slate-50">
                                    <button 
                                        className={`flex-1 py-3 text-sm font-medium flex justify-center items-center gap-2 transition-colors ${activeTab === 'video' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
                                        onClick={() => setActiveTab('video')}
                                    >
                                        <Video size={16} /> B站/抖音脚本
                                    </button>
                                    <button 
                                        className={`flex-1 py-3 text-sm font-medium flex justify-center items-center gap-2 transition-colors ${activeTab === 'xhs' ? 'bg-white text-red-500 border-b-2 border-red-500' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
                                        onClick={() => setActiveTab('xhs')}
                                    >
                                        <Smartphone size={16} /> 小红书图文
                                    </button>
                                    <button 
                                        className={`flex-1 py-3 text-sm font-medium flex justify-center items-center gap-2 transition-colors ${activeTab === 'moments' ? 'bg-white text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
                                        onClick={() => setActiveTab('moments')}
                                    >
                                        <MessageCircle size={16} /> 朋友圈速报
                                    </button>
                                    <button 
                                        className={`flex-1 py-3 text-sm font-medium flex justify-center items-center gap-2 transition-colors ${activeTab === 'article' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
                                        onClick={() => setActiveTab('article')}
                                    >
                                        <FileText size={16} /> 网站/公众号头条
                                    </button>
                                </div>

                                <div className="p-5 flex-1 overflow-y-auto relative bg-slate-50/50">
                                    <button 
                                        onClick={() => {
                                            const contentMap = {
                                                'video': generatedData.video_script,
                                                'xhs': generatedData.xiaohongshu,
                                                'moments': generatedData.moments,
                                                'article': generatedData.article_title + '\n\n' + generatedData.official_account
                                            };
                                            handleCopy(contentMap[activeTab], activeTab);
                                        }}
                                        className="absolute top-4 right-4 p-2 bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 rounded-lg shadow-sm transition"
                                        title="一键复制全篇"
                                    >
                                        {copiedStates[activeTab] ? <CheckCircle2 size={18} className="text-emerald-500" /> : <Copy size={18} />}
                                    </button>

                                    {activeTab === 'video' && (
                                        <div className="whitespace-pre-wrap font-mono text-sm leading-7 text-slate-700 max-w-3xl">
                                            <div className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded mb-4 inline-block font-bold text-xs">出镜口播 & 分镜提示脚本</div>
                                            {'\n'}
                                            {generatedData.video_script}
                                        </div>
                                    )}
                                    {activeTab === 'xhs' && (
                                        <div className="whitespace-pre-wrap text-[15px] leading-7 text-slate-800 max-w-md mx-auto bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                                            {generatedData.xiaohongshu}
                                        </div>
                                    )}
                                    {activeTab === 'moments' && (
                                        <div className="whitespace-pre-wrap text-base leading-relaxed text-slate-800 max-w-sm bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                                            {generatedData.moments}
                                        </div>
                                    )}
                                    {activeTab === 'article' && (
                                        <div className="max-w-3xl">
                                            <h1 className="text-2xl font-bold mb-6 text-slate-900">{generatedData.article_title}</h1>
                                            <div className="prose prose-slate prose-indigo max-w-none">
                                                {/* In a real app we'd use ReactMarkdown here for the official account string, 
                                                    but for simplicity we'll just display it as pre-wrap text or basic HTML */}
                                                <div className="whitespace-pre-wrap text-slate-700 leading-8">
                                                    {generatedData.official_account}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
