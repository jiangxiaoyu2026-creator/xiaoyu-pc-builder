
import { Routes, Route } from 'react-router-dom';
import ClientApp from './pages/ClientApp';
import AdminApp from './pages/AdminApp'; // Will be implemented next

/*
 * Simple Layout wrapper to allow switching between User App and Admin App
 * In a real app, these might be on different subdomains or completely separate builds.
 */
function App() {
    return (
        <Routes>
            <Route path="/" element={<ClientApp />} />
            <Route path="/admin" element={<AdminApp />} />
        </Routes>
    );
}

export default App;
