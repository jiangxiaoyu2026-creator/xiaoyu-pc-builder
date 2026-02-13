import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { storage } from '../../services/storage';
import { Article } from '../../types/clientTypes';
import { ArrowLeft, Calendar, Clock, Share2 } from 'lucide-react';

export default function ArticleDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [article, setArticle] = useState<Article | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) loadArticle(id);
    }, [id]);

    const loadArticle = async (articleId: string) => {
        setLoading(true);
        const data = await storage.getArticle(articleId);
        setArticle(data);
        setLoading(false);
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center text-slate-400">加载中...</div>;
    }

    if (!article) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center text-slate-400 gap-4">
                <p>文章不存在或已被删除</p>
                <button onClick={() => navigate('/')} className="text-indigo-600 font-bold hover:underline">
                    返回首页
                </button>
            </div>
        );
    }

    // Simple auto-detect HTML
    const isHtml = /<[a-z][\s\S]*>/i.test(article.content);
    const contentHtml = isHtml ? article.content : article.content.replace(/\n/g, '<br/>');

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur sticky top-0 z-10 border-b border-slate-200 shadow-sm">
                <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                    <button onClick={() => navigate('/?tab=headlines')} className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors">
                        <ArrowLeft size={20} className="text-slate-600" />
                    </button>
                    <span className="font-bold text-slate-800">文章详情</span>
                    <button className="p-2 -mr-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                        <Share2 size={20} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <article className="max-w-4xl mx-auto px-4 py-8">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4 leading-tight">
                    {article.title}
                </h1>

                <div className="flex items-center gap-4 text-xs text-slate-400 mb-8">
                    <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {new Date(article.createdAt).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                        <Clock size={14} />
                        {new Date(article.createdAt).toLocaleTimeString()}
                    </span>
                </div>

                {article.coverImage && (
                    <img
                        src={article.coverImage}
                        alt={article.title}
                        className="w-full aspect-video object-cover rounded-2xl shadow-sm mb-8"
                    />
                )}

                <div
                    className="prose prose-slate max-w-none prose-lg bg-white p-6 md:p-10 rounded-2xl shadow-sm border border-slate-100 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: contentHtml }}
                />
            </article>
        </div>
    );
}
