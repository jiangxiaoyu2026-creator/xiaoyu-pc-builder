import { useState, useEffect } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { storage } from '../../services/storage';
import { PopupSettings } from '../../types/adminTypes';

export default function DailyPopup() {
    const [isOpen, setIsOpen] = useState(false);
    const [settings, setSettings] = useState<PopupSettings | null>(null);

    useEffect(() => {
        const checkPopup = async () => {
            // 1. Get Settings
            const popupSettings = await storage.getPopupSettings();
            console.log('[DailyPopup] Settings loaded:', popupSettings);

            if (!popupSettings.enabled) {
                console.log('[DailyPopup] Popup is disabled in settings');
                return;
            }

            // 2. Check Date
            const today = new Date().toISOString().split('T')[0];
            const lastPopupDate = localStorage.getItem('xiaoyu_last_popup_date');

            console.log('[DailyPopup] Date check:', { today, lastPopupDate });

            if (lastPopupDate !== today) {
                console.log('[DailyPopup] Conditions met, showing popup...');
                setSettings(popupSettings);
                // Delay slightly for smoother entry
                setTimeout(() => setIsOpen(true), 1000);
            } else {
                console.log('[DailyPopup] Already shown today');
            }
        };

        checkPopup();
    }, []);

    const handleClose = () => {
        setIsOpen(false);
        // Save today's date to prevent showing again
        const today = new Date().toISOString().split('T')[0];
        localStorage.setItem('xiaoyu_last_popup_date', today);
    };

    if (!isOpen || !settings) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 animate-in fade-in duration-300">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                onClick={handleClose}
            />

            {/* Modal Content */}
            <div className="relative bg-white/90 backdrop-blur-xl border border-white/20 shadow-2xl rounded-[32px] w-full max-w-md overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-500">
                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-black/5 hover:bg-black/10 transition-colors z-10"
                >
                    <X size={18} className="text-slate-500" />
                </button>

                {/* Optional Banner Image */}
                {settings.imageUrl && (
                    <div className="w-full h-48 bg-slate-100 relative">
                        <img
                            src={settings.imageUrl}
                            alt="Announcement"
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-white/90 to-transparent" />
                    </div>
                )}

                <div className={`p-8 ${settings.imageUrl ? 'pt-2' : ''} text-center`}>
                    <h2 className="text-2xl font-bold bg-gradient-to-br from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
                        {settings.title}
                    </h2>

                    <div className="text-slate-600 mb-8 leading-relaxed whitespace-pre-wrap">
                        {settings.content}
                    </div>

                    <div className="flex flex-col gap-3">
                        {/* Optional Action Button */}
                        {settings.linkUrl && (
                            <a
                                href={settings.linkUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={handleClose}
                                className="w-full py-3.5 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
                            >
                                {settings.buttonText || '查看详情'}
                                <ExternalLink size={18} />
                            </a>
                        )}

                        <button
                            onClick={handleClose}
                            className="w-full py-3 text-slate-400 hover:text-slate-600 font-medium text-sm transition-colors"
                        >
                            关闭
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
