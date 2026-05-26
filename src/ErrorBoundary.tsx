
import { Component, ErrorInfo, ReactNode } from 'react';

const CHUNK_ERROR_RELOAD_KEY = 'xiaoyu_chunk_error_reload_at';
const CHUNK_ERROR_AUTO_RELOAD_INTERVAL = 5 * 60 * 1000;
const CACHE_BUST_PARAM = 'xiaoyu_refresh';

function isChunkLoadError(error: Error | null): boolean {
    const message = (error?.message || '').toLowerCase();
    return [
        'failed to fetch dynamically imported module',
        'error loading dynamically imported module',
        'importing a module script failed',
        'loading chunk',
        'chunkloaderror',
        'unable to preload css'
    ].some(pattern => message.includes(pattern));
}

async function clearRuntimeCaches() {
    const tasks: Promise<unknown>[] = [];

    if ('caches' in window) {
        tasks.push(
            window.caches.keys().then(cacheNames =>
                Promise.all(cacheNames.map(cacheName => window.caches.delete(cacheName)))
            )
        );
    }

    if ('serviceWorker' in navigator) {
        tasks.push(
            navigator.serviceWorker.getRegistrations().then(registrations =>
                Promise.all(registrations.map(registration => registration.unregister()))
            )
        );
    }

    await Promise.allSettled(tasks);
}

async function reloadWithFreshAssets() {
    try {
        localStorage.removeItem('xiaoyu_cache_version');
    } catch {
        // Ignore storage failures and still try to reload.
    }

    await clearRuntimeCaches();

    const url = new URL(window.location.href);
    url.searchParams.set(CACHE_BUST_PARAM, Date.now().toString());
    window.location.replace(url.toString());
}

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public componentDidMount() {
        window.addEventListener('vite:preloadError', this.handlePreloadError);
    }

    public componentWillUnmount() {
        window.removeEventListener('vite:preloadError', this.handlePreloadError);
    }

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);

        if (isChunkLoadError(error)) {
            this.tryRecoverFromChunkError();
        }
    }

    private handlePreloadError = (event: Event) => {
        if (this.tryRecoverFromChunkError()) {
            event.preventDefault();
        }
    };

    private tryRecoverFromChunkError() {
        const now = Date.now();
        let lastReload = 0;

        try {
            lastReload = Number(sessionStorage.getItem(CHUNK_ERROR_RELOAD_KEY) || 0);
        } catch {
            lastReload = 0;
        }

        if (lastReload && now - lastReload < CHUNK_ERROR_AUTO_RELOAD_INTERVAL) {
            return false;
        }

        try {
            sessionStorage.setItem(CHUNK_ERROR_RELOAD_KEY, now.toString());
        } catch {
            // If session storage is unavailable, a single cache-busted navigation is still useful.
        }

        void reloadWithFreshAssets();
        return true;
    }

    public render() {
        if (this.state.hasError) {
            const isChunkError = isChunkLoadError(this.state.error);

            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6 font-sans">
                    <div className="max-w-md w-full bg-white p-8 rounded-[32px] shadow-[0_32px_80px_rgba(0,0,0,0.1)] border border-slate-100/60 animate-scale-up">
                        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-6 shadow-sm shadow-red-100/50">
                            <span className="text-2xl">⚠️</span>
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">页面出错了</h1>
                        <p className="text-slate-500 text-sm font-medium mb-6 leading-relaxed">
                            {isChunkError
                                ? "由于系统刚刚完成了更新，部分旧的文件已失效。请点击下方按钮刷新至最新版本。"
                                : "抱歉，发生了一个意外错误导致页面无法显示。"}
                        </p>

                        <div className="bg-slate-50 p-4 rounded-2xl text-[10px] font-mono text-slate-400 overflow-auto mb-8 border border-slate-100/60 max-h-32 custom-scrollbar">
                            {this.state.error?.message}
                        </div>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => {
                                    try {
                                        sessionStorage.removeItem(CHUNK_ERROR_RELOAD_KEY);
                                    } catch {
                                        // Ignore storage failures and still try to reload.
                                    }
                                    void reloadWithFreshAssets();
                                }}
                                className="w-full py-4 bg-slate-900 text-white font-black text-sm rounded-2xl hover:bg-slate-800 transition-all active:scale-[0.98] shadow-xl shadow-slate-200"
                            >
                                清除缓存并刷新页面
                            </button>
                            <button
                                onClick={() => window.location.href = '/'}
                                className="w-full py-4 bg-white text-slate-500 font-bold text-sm rounded-2xl hover:bg-slate-50 transition-all border border-slate-200"
                            >
                                返回首页
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
