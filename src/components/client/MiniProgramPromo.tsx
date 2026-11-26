import { useCallback, useEffect, useRef } from 'react';
import { ArrowUpRight, QrCode, Smartphone, X } from 'lucide-react';

const PROMO_DATE_KEY = 'xiaoyu_miniprogram_promo_date';

export default function MiniProgramPromo() {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const openPromo = useCallback(() => {
        const dialog = dialogRef.current;
        if (!dialog || dialog.open) return;
        dialog.showModal();
        localStorage.setItem(PROMO_DATE_KEY, new Date().toDateString());
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            if (localStorage.getItem(PROMO_DATE_KEY) !== new Date().toDateString()) {
                openPromo();
            }
        }, 800);
        return () => window.clearTimeout(timer);
    }, [openPromo]);

    return (
        <>
            <aside aria-label="微信小程序" className="shrink-0 border-b border-emerald-100 bg-emerald-50/70 dark:border-emerald-500/15 dark:bg-emerald-500/5">
                <div className="max-w-7xl mx-auto flex min-h-11 items-center justify-between gap-3 px-4 py-2">
                    <div className="flex min-w-0 items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                        <Smartphone size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <span className="hidden font-semibold text-emerald-800 dark:text-emerald-300 sm:inline">手机上也能随时查配置</span>
                        <span className="hidden h-3 w-px bg-emerald-200 dark:bg-emerald-500/20 sm:inline" />
                        <span>微信搜索<span className="font-bold text-slate-900 dark:text-white">「蒋小鱼装机」</span></span>
                    </div>
                    <button
                        type="button"
                        onClick={openPromo}
                        className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 dark:text-emerald-300 dark:hover:bg-emerald-500/10"
                    >
                        <QrCode size={15} />
                        <span>小程序码</span>
                        <ArrowUpRight size={13} className="hidden sm:block" />
                    </button>
                </div>
            </aside>

            <dialog
                ref={dialogRef}
                aria-labelledby="miniprogram-title"
                aria-describedby="miniprogram-description"
                onClick={(event) => {
                    if (event.target === event.currentTarget) dialogRef.current?.close();
                }}
                className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-sm overflow-y-auto rounded-3xl border border-slate-200 bg-white p-0 text-slate-800 shadow-2xl backdrop:bg-slate-950/50 backdrop:backdrop-blur-sm dark:border-slate-700 dark:bg-[#121218] dark:text-slate-200"
            >
                <div className="relative px-6 pb-7 pt-8 text-center">
                    <button
                        type="button"
                        aria-label="关闭小程序码"
                        onClick={() => dialogRef.current?.close()}
                        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                        <X size={18} />
                    </button>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                        <Smartphone size={13} /> 微信小程序
                    </span>
                    <h2 id="miniprogram-title" className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">蒋小鱼装机</h2>
                    <p id="miniprogram-description" className="mt-2 text-sm text-slate-500 dark:text-slate-400">打开微信扫一扫，装机配置随手查</p>
                    <div className="mx-auto mt-6 w-60 max-w-full rounded-2xl border border-slate-100 bg-white p-3">
                        <img src="/assets/miniprogram-qrcode.jpg" alt="蒋小鱼装机微信小程序码" width={860} height={860} className="h-auto w-full object-contain" />
                    </div>
                    <div className="mt-6 rounded-2xl bg-slate-50 px-4 py-4 dark:bg-white/5">
                        <p className="text-xs text-slate-500 dark:text-slate-400">也可以打开微信，搜索小程序</p>
                        <p className="mt-1.5 select-text text-lg font-bold text-slate-900 dark:text-white">蒋小鱼装机</p>
                    </div>
                </div>
            </dialog>
        </>
    );
}
