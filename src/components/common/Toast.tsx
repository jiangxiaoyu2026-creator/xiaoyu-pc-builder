import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
    id: number;
    message: string;
    type: ToastType;
    duration: number;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) {
        // Fallback: return a no-op if outside provider (safe for SSR / lazy loading)
        return { showToast: (_msg: string, _type?: ToastType) => { console.warn('Toast: no provider'); } };
    }
    return ctx;
}

let _globalId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'success', duration = 3000) => {
        const id = ++_globalId;
        setToasts(prev => [...prev, { id, message, type, duration }]);
    }, []);

    const removeToast = useCallback((id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {/* Toast Container */}
            <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none" style={{ maxWidth: 380 }}>
                {toasts.map(toast => (
                    <ToastCard key={toast.id} toast={toast} onDismiss={removeToast} />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const exitTimer = setTimeout(() => setIsExiting(true), toast.duration - 300);
        const removeTimer = setTimeout(() => onDismiss(toast.id), toast.duration);
        return () => { clearTimeout(exitTimer); clearTimeout(removeTimer); };
    }, [toast.id, toast.duration, onDismiss]);

    const iconMap = {
        success: <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />,
        error: <XCircle size={18} className="text-red-500 shrink-0" />,
        info: <Info size={18} className="text-blue-500 shrink-0" />,
    };

    const borderMap = {
        success: 'border-emerald-200 bg-emerald-50',
        error: 'border-red-200 bg-red-50',
        info: 'border-blue-200 bg-blue-50',
    };

    const progressMap = {
        success: 'bg-emerald-500',
        error: 'bg-red-500',
        info: 'bg-blue-500',
    };

    return (
        <div
            className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-sm 
                ${borderMap[toast.type]} 
                ${isExiting ? 'animate-toast-exit' : 'animate-toast-enter'}`}
        >
            {iconMap[toast.type]}
            <span className="text-sm font-medium text-slate-700 flex-1 leading-relaxed">{toast.message}</span>
            <button
                onClick={() => { setIsExiting(true); setTimeout(() => onDismiss(toast.id), 300); }}
                className="text-slate-400 hover:text-slate-600 transition-colors shrink-0 mt-0.5"
            >
                <X size={14} />
            </button>
            {/* Progress bar */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden rounded-b-xl">
                <div
                    className={`h-full ${progressMap[toast.type]} rounded-b-xl`}
                    style={{
                        animation: `toastProgress ${toast.duration}ms linear forwards`,
                    }}
                />
            </div>
        </div>
    );
}
