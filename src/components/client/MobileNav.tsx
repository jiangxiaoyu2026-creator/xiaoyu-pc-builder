import { LayoutGrid, Share2, ShoppingBag } from 'lucide-react';

type ViewMode = 'visual' | 'streamer' | 'square' | 'used' | 'about';

interface MobileBottomNavProps {
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;
}

export function MobileBottomNav({ viewMode, setViewMode }: MobileBottomNavProps) {
    const tabs = [
        { id: 'visual' as ViewMode, icon: LayoutGrid, label: '装机' },
        { id: 'square' as ViewMode, icon: Share2, label: '广场' },
        { id: 'used' as ViewMode, icon: ShoppingBag, label: '二手' },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] pb-safe md:hidden">
            <div className="flex items-center justify-around h-16">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = viewMode === tab.id;

                    return (
                        <button
                            key={tab.id}
                            onClick={() => setViewMode(tab.id)}
                            className={`flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 ${isActive
                                ? 'text-indigo-600'
                                : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            <div className={`relative transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}>
                                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                                {isActive && (
                                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-600" />
                                )}
                            </div>
                            <span className={`text-[10px] mt-1 font-medium transition-all ${isActive ? 'text-indigo-600 font-semibold' : ''
                                }`}>
                                {tab.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
