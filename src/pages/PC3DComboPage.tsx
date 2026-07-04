import { ArrowLeft, ExternalLink, Box } from 'lucide-react';

export default function PC3DComboPage() {
    return (
        <div className="flex h-[100dvh] flex-col overflow-hidden bg-slate-950 text-slate-100">
            <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-slate-950/95 px-3 md:px-5">
                <a
                    href="/"
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-sm font-bold text-slate-100 transition-colors hover:bg-white/10"
                >
                    <ArrowLeft size={16} />
                    返回装机台
                </a>
                <div className="flex min-w-0 items-center gap-2 px-3">
                    <Box size={18} className="shrink-0 text-indigo-300" />
                    <div className="truncate text-sm font-black tracking-tight md:text-base">DIY叉叉 3D 模型校准工作台</div>
                </div>
                <a
                    href="/pc3d/combo.html"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-sm font-bold text-slate-100 transition-colors hover:bg-white/10"
                >
                    <ExternalLink size={15} />
                    <span className="hidden sm:inline">全屏</span>
                </a>
            </header>
            <iframe
                title="DIY叉叉 3D 模型校准工作台"
                src="/pc3d/combo.html"
                className="min-h-0 flex-1 border-0 bg-white"
            />
        </div>
    );
}
