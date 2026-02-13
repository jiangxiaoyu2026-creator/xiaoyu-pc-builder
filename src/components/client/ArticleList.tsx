import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { storage } from '../../services/storage';
import { Article } from '../../types/clientTypes';
import { BookOpen, Sparkles, ArrowRight, Pin } from 'lucide-react';


export default function ArticleList() {
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        loadArticles();
        window.addEventListener('xiaoyu-article-update', loadArticles);
        return () => window.removeEventListener('xiaoyu-article-update', loadArticles);
    }, []);

    const loadArticles = async () => {
        setLoading(true);
        const res = await storage.getArticles(1, 50); // Load more for the list page
        setArticles(res.items);
        setLoading(false);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-[32px] bg-slate-900 border border-slate-800 shadow-2xl p-8 md:p-12 mb-8 group">
                {/* Abstract Background */}
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-indigo-500/30 to-purple-500/30 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-blue-500/20 to-cyan-500/20 blur-[80px] rounded-full translate-y-1/3 -translate-x-1/4 pointer-events-none"></div>

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold mb-4 backdrop-blur-md">
                            <Sparkles size={12} className="text-indigo-400" />
                            <span>NEWS & GUIDES</span>
                        </div>
                        <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight mb-4 leading-tight">
                            装机<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">头条</span>
                        </h2>
                        <p className="text-slate-400 text-lg max-w-xl leading-relaxed">
                            获取最新的硬件资讯、深度的评测报告以及专业的装机指南。掌握硬件前沿资讯，助您打造性能之巅。
                        </p>
                    </div>
                    {/* Decorative Icon */}
                    <div className="hidden md:flex w-24 h-24 bg-white/5 rounded-2xl items-center justify-center border border-white/10 backdrop-blur-md rotate-3 group-hover:rotate-6 transition-transform duration-500">
                        <BookOpen size={40} className="text-white/80" />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="bg-white rounded-3xl p-4 h-[400px] animate-pulse border border-slate-100">
                            <div className="bg-slate-100 h-48 rounded-2xl mb-4"></div>
                            <div className="bg-slate-100 h-6 w-3/4 rounded-lg mb-3"></div>
                            <div className="bg-slate-100 h-4 w-1/2 rounded-lg"></div>
                        </div>
                    ))}
                </div>
            ) : articles.length === 0 ? (
                <div className="text-center py-32 bg-white rounded-[32px] border border-dashed border-slate-200 shadow-sm">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300 border border-slate-100">
                        <BookOpen size={40} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">暂无头条文章</h3>
                    <p className="text-slate-500">更多精彩内容即将上线，敬请期待</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {articles.map((article) => (
                        <div
                            key={article.id}
                            onClick={() => navigate(`/article/${article.id}`)}
                            className="bg-white rounded-[24px] overflow-hidden border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col h-full"
                        >
                            <div className="h-56 overflow-hidden relative bg-slate-100">
                                {article.coverImage ? (
                                    <img
                                        src={article.coverImage}
                                        alt={article.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 bg-slate-50 relative overflow-hidden">
                                        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(0,0,0,0.02)_50%,transparent_75%,transparent_100%)] bg-[length:20px_20px]"></div>
                                        <BookOpen size={48} className="opacity-50" />
                                    </div>
                                )}
                                <div className="absolute top-4 left-4 flex gap-2">
                                    {article.isPinned && (
                                        <span className="bg-indigo-600 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white shadow-lg border border-indigo-500/20 flex items-center gap-1">
                                            <Pin size={12} className="fill-white" /> 置顶
                                        </span>
                                    )}
                                    <span className="bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-slate-800 shadow-lg border border-white/20">
                                        最新文章
                                    </span>
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-between p-6">
                                    <span className="text-white font-bold text-sm tracking-wide translate-y-4 group-hover:translate-y-0 transition-transform duration-300">阅读全文</span>
                                    <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-75">
                                        <ArrowRight size={14} />
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 flex-1 flex flex-col">
                                <h3 className="font-bold text-xl text-slate-800 mb-3 line-clamp-2 group-hover:text-indigo-600 transition-colors leading-snug">
                                    {article.title}
                                </h3>
                                <p className="text-slate-500 text-sm line-clamp-2 mb-6 leading-relaxed flex-1">
                                    {article.summary || article.content.substring(0, 100).replace(/[#*`]/g, '')}
                                </p>

                                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs ring-2 ring-white shadow-sm">
                                            A
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-slate-700">官方管理员</span>
                                            <span className="text-[10px] text-slate-400">Verified Author</span>
                                        </div>
                                    </div>
                                    <div className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                        {new Date(article.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

}
