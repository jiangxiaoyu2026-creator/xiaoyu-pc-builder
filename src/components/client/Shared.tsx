
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
            className={cn(
                "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs md:text-sm font-medium transition-all duration-300",
                active
                    ? "bg-white text-black shadow-sm"
                    : "text-[#86868B] hover:text-black"
            )}
        >
            {icon}
            <span>{label}</span>
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
