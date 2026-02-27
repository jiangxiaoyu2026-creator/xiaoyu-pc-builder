
import { Component, ErrorInfo, ReactNode } from 'react';

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

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);

        // Check if it's a dynamic import failure (common during deployment)
        const isChunkError = error.message.includes('Failed to fetch dynamically imported module') ||
            error.message.includes('Loading chunk');

        if (isChunkError) {
            const lastReload = sessionStorage.getItem('last-chunk-error-reload');
            const now = Date.now();

            // Only auto-reload if it hasn't happened in the last 10 seconds to avoid infinite loops
            if (!lastReload || now - parseInt(lastReload) > 10000) {
                sessionStorage.setItem('last-chunk-error-reload', now.toString());
                window.location.reload();
            }
        }
    }

    public render() {
        if (this.state.hasError) {
            const isChunkError = this.state.error?.message.includes('Failed to fetch dynamically imported module') ||
                this.state.error?.message.includes('Loading chunk');

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
                                    sessionStorage.clear();
                                    localStorage.removeItem('xiaoyu_cache_version');
                                    window.location.reload();
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
