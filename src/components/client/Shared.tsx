
import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
    Cpu,
    Monitor,
    Zap,
    CreditCard,
    HardDrive,
    Wind,
    Fan,
    Box,
    MousePointer2,
    Keyboard,
    Cable,
    Gamepad2
} from 'lucide-react';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// Apple-style Tab Button
export function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
    return (
        <button
            onClick={onClick}
            title={label}
            className={cn(
                "flex items-center gap-1.5 px-3 lg:px-4 py-1.5 rounded-lg text-xs md:text-sm font-bold transition-all duration-300 uppercase tracking-wider",
                active
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700"
            )}
        >
            <div className="shrink-0">
                {React.cloneElement(icon as React.ReactElement, { size: 14 })}
            </div>
            <span className={cn(
                "whitespace-nowrap transition-all duration-300",
                active ? "inline-block" : "hidden lg:inline-block"
            )}>
                {label}
            </span>
        </button>
    );
}

// Restored Icon Helper
export function getIconByCategory(category: string) {
    switch (category) {
        case 'cpu': return <Cpu size={20} />;
        case 'mainboard': return <Box size={20} />;
        case 'gpu': return <Gamepad2 size={20} />;
        case 'ram': return <CreditCard size={20} className="rotate-90" />;
        case 'disk': return <HardDrive size={20} />;
        case 'power': return <Zap size={20} className="text-amber-500" />;
        case 'cooling': return <Wind size={20} />;
        case 'fan': return <Fan size={20} />;
        case 'case': return <Box size={20} />;
        case 'monitor': return <Monitor size={20} />;
        case 'mouse': return <MousePointer2 size={20} />;
        case 'keyboard': return <Keyboard size={20} />;
        case 'accessory': return <Cable size={20} />;
        default: return <Box size={20} />;
    }
}
