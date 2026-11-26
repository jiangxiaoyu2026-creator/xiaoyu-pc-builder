import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { storage } from './services/storage';
import { useVisitTracker } from './hooks/useVisitTracker';
import Seo from './components/common/Seo';

const ClientApp = lazy(() => import('./pages/ClientApp'));
const AdminApp = lazy(() => import('./pages/AdminApp'));
const ArticleDetail = lazy(() => import('./components/client/ArticleDetail'));
const PC3DComboPage = lazy(() => import('./pages/PC3DComboPage'));

function App() {
    useVisitTracker();

    useEffect(() => {
        // Trigger one-time migration and initialization
        storage.init();
    }, []);

    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-screen bg-slate-50">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div>
                    <p className="text-sm font-medium text-slate-500 animate-pulse">正在加载...</p>
                </div>
            </div>
        }>
            <Routes>
                <Route path="/" element={<ClientApp />} />
                <Route path="/VIP" element={<ClientApp />} />
                <Route path="/vip" element={<ClientApp />} />
                <Route path="/pc3d" element={<PC3DComboPage />} />
                <Route path="/article/:id" element={<ArticleDetail />} />
                <Route path="/admin" element={
                    <>
                        <Seo
                            title="管理后台 - 蒋小鱼装机平台"
                            description="蒋小鱼装机平台管理后台。"
                            canonicalPath="/admin"
                            noIndex
                        />
                        <AdminApp />
                    </>
                } />
                <Route path="*" element={<ClientApp noIndex />} />
            </Routes>
        </Suspense>
    );
}

export default App;
