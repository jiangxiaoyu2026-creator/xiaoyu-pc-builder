
import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import ClientApp from './pages/ClientApp';
import AdminApp from './pages/AdminApp';
import { storage } from './services/storage';

import ArticleDetail from './components/client/ArticleDetail';

function App() {
    useEffect(() => {
        // Trigger one-time migration and initialization
        storage.init();
    }, []);

    return (
        <Routes>
            <Route path="/" element={<ClientApp />} />
            <Route path="/article/:id" element={<ArticleDetail />} />
            <Route path="/admin" element={<AdminApp />} />
        </Routes>
    );
}

export default App;
