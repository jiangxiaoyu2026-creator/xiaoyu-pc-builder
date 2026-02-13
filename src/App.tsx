import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { storage } from './services/storage';

const ClientApp = lazy(() => import('./pages/ClientApp'));
const AdminApp = lazy(() => import('./pages/AdminApp'));
const ArticleDetail = lazy(() => import('./components/client/ArticleDetail'));

function App() {
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
                <Route path="/article/:id" element={<ArticleDetail />} />
                <Route path="/admin" element={<AdminApp />} />
            </Routes>
        </Suspense>
    );
}

export default App;
