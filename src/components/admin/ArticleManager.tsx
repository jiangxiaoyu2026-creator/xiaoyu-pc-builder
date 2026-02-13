import { useState, useEffect } from 'react';
import { storage } from '../../services/storage';
import { Article } from '../../types/clientTypes';
import { Plus, Trash2, Edit, X, BookOpen, Pin } from 'lucide-react';

export default function ArticleManager() {
    const [articles, setArticles] = useState<Article[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [currentArticle, setCurrentArticle] = useState<Partial<Article>>({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadArticles();
    }, []);

    const loadArticles = async () => {
        setLoading(true);
        const res = await storage.getArticles(1, 100);
        setArticles(res.items);
        setLoading(false);
    };

    const handleEdit = (article: Article) => {
        setCurrentArticle(article);
        setIsEditing(true);
    };

    const handleCreate = () => {
        setCurrentArticle({
            title: '',
            summary: '',
            content: '',
            coverImage: ''
        });
        setIsEditing(true);
    };

    const handleSave = async () => {
        if (!currentArticle.title || !currentArticle.content) {
            alert('标题和内容不能为空');
            return;
        }

        try {
            await storage.saveArticle(currentArticle);
            setIsEditing(false);
            loadArticles();
        } catch (e) {
            alert('保存失败');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('确定要删除这篇文章吗？')) return;
        try {
            await storage.deleteArticle(id);
            loadArticles();
        } catch (e) {
            alert('删除失败');
        }
    };

    const handleTogglePinned = async (article: Article) => {
        try {
            await storage.saveArticle({ ...article, isPinned: !article.isPinned });
            loadArticles();
        } catch (e) {
            alert('操作失败');
        }
    };

    if (isEditing) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-800">{currentArticle.id ? '编辑文章' : '新建文章'}</h2>
                    <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-4 max-w-4xl">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">标题</label>
                        <input
                            type="text"
                            value={currentArticle.title || ''}
                            onChange={e => setCurrentArticle({ ...currentArticle, title: e.target.value })}
                            className="w-full border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                            placeholder="输入文章标题..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">封面图片</label>
                        <div className="flex gap-4 items-start">
                            <div className="w-32 h-32 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center relative overflow-hidden group shrink-0">
                                {currentArticle.coverImage ? (
                                    <>
                                        <img src={currentArticle.coverImage} alt="Preview" className="w-full h-full object-cover" />
                                        <button
                                            onClick={() => setCurrentArticle({ ...currentArticle, coverImage: '' })}
                                            className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </>
                                ) : (
                                    <div className="text-center text-slate-400">
                                        <Plus size={24} className="mx-auto mb-1" />
                                        <span className="text-xs">选择文件</span>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            const res = await storage.uploadImage(file);
                                            if (res) {
                                                setCurrentArticle({ ...currentArticle, coverImage: res.url });
                                            } else {
                                                alert('上传失败');
                                            }
                                        }
                                    }}
                                />
                            </div>
                            <div className="flex-1 space-y-2">
                                <p className="text-xs text-slate-500">支持 JPG, PNG, WEBP 格式。建议尺寸 1200x600px。</p>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={currentArticle.coverImage || ''}
                                        onChange={e => setCurrentArticle({ ...currentArticle, coverImage: e.target.value })}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                                        placeholder="或输入图片 URL..."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">摘要</label>
                        <input
                            type="text"
                            value={currentArticle.summary || ''}
                            onChange={e => setCurrentArticle({ ...currentArticle, summary: e.target.value })}
                            className="w-full border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                            placeholder="简短摘要..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">内容 (支持 Markdown/HTML)</label>
                        <textarea
                            value={currentArticle.content || ''}
                            onChange={e => setCurrentArticle({ ...currentArticle, content: e.target.value })}
                            className="w-full h-96 border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-mono text-sm leading-relaxed"
                            placeholder="# 标题\n\n正文内容..."
                        />
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                        <input
                            type="checkbox"
                            id="isPinned"
                            checked={currentArticle.isPinned || false}
                            onChange={e => setCurrentArticle({ ...currentArticle, isPinned: e.target.checked })}
                            className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                        />
                        <label htmlFor="isPinned" className="text-sm font-bold text-slate-700 cursor-pointer select-none">置顶文章</label>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button onClick={() => setIsEditing(false)} className="px-6 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50">
                            取消
                        </button>
                        <button onClick={handleSave} className="px-6 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200">
                            保存文章
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <BookOpen className="text-indigo-600" /> 文章管理
                </h2>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                >
                    <Plus size={18} /> 新建文章
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-900 font-bold">
                        <tr>
                            <th className="p-4">标题</th>
                            <th className="p-4">摘要</th>
                            <th className="p-4 w-40">发布时间</th>
                            <th className="p-4 w-32 text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading && <tr><td colSpan={4} className="p-8 text-center text-slate-400">加载中...</td></tr>}
                        {!loading && articles.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-400">暂无文章</td></tr>}

                        {articles.map(article => (
                            <tr key={article.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="p-4 font-bold text-slate-800 flex items-center gap-2">
                                    {article.title}
                                    {article.isPinned && <Pin size={14} className="text-indigo-600 fill-indigo-600" />}
                                </td>
                                <td className="p-4 text-slate-500 max-w-xs truncate">{article.summary}</td>
                                <td className="p-4">{new Date(article.createdAt).toLocaleDateString()}</td>
                                <td className="p-4 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleTogglePinned(article)}
                                            className={`p-1.5 rounded-lg transition-colors ${article.isPinned ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-slate-100 text-slate-400'}`}
                                            title={article.isPinned ? "取消置顶" : "设为置顶"}
                                        >
                                            <Pin size={16} className={article.isPinned ? "fill-indigo-600" : ""} />
                                        </button>
                                        <button onClick={() => handleEdit(article)} className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg">
                                            <Edit size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(article.id)} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
