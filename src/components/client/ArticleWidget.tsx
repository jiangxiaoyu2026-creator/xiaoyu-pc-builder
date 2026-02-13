import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { storage } from '../../services/storage';
import { Article } from '../../types/clientTypes';
import { BookOpen, Calendar } from 'lucide-react';

export default function ArticleWidget() {
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
        const res = await storage.getArticles(1, 5); // Show top 5
        setArticles(res.items);
        setLoading(false);
    };

    return (
        <div className="bg-white/80 backdrop-blur rounded-[24px] p-6 border border-slate-100 shadow-lg">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <BookOpen size={20} className="text-indigo-600" /> 装机头条
                </h3>
            </div>

            <div className="space-y-4">
                {loading && <div className="text-center text-slate-400 text-sm py-4">加载中...</div>}

                {!loading && articles.length === 0 && (
                    <div className="text-center text-slate-400 text-sm py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        暂无头条文章
                    </div>
                )}

                {articles.map(article => (
                    <div
                        key={article.id}
                        onClick={() => navigate(`/article/${article.id}`)}
                        className="group cursor-pointer flex gap-3 items-start hover:bg-slate-50 p-2 rounded-xl -mx-2 transition-colors"
                    >
                        <div className="w-20 h-14 bg-slate-100 rounded-lg overflow-hidden shrink-0 border border-slate-100 relative">
                            {article.coverImage ? (
                                <img src={article.coverImage} alt={article.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                    <BookOpen size={16} />
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-slate-800 text-sm line-clamp-2 group-hover:text-indigo-600 transition-colors leading-snug">
                                {article.title}
                            </h4>
                            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                                <Calendar size={10} />
                                {new Date(article.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
