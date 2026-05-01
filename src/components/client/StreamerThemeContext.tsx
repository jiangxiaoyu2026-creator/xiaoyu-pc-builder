import React from 'react';

// --- Theme System ---
export type ThemeColor = 'default' | 'cosmic' | 'jade' | 'rosegold' | 'ocean' | 'midnight';

export interface ThemeConfig {
    name: string;
    primary: string;
    bgLight: string;
    bgPrimary: string;
    gradient: string;
    ring: string;
    cardBg: string;
    headerBg: string;
    tableHeaderBg: string;
    divider: string;
    footerBg: string;
    borderColor: string;
    textTitle: string;
    textMuted: string;
    rowBg: string;
}

// Shared base — clean white background for all themes
export const BASE_BG = {
    cardBg: 'bg-white dark:bg-slate-900',
    headerBg: 'bg-slate-50/50 dark:bg-slate-900/50',
    tableHeaderBg: 'bg-slate-50 dark:bg-slate-800',
    divider: 'divide-slate-200 dark:divide-slate-700',
    footerBg: 'bg-white/90 dark:bg-slate-900/90',
    borderColor: 'border-slate-200/60 dark:border-slate-800/60',
    textTitle: 'text-slate-800 dark:text-white',
    textMuted: 'text-slate-400 dark:text-slate-500',
    rowBg: 'bg-white dark:bg-slate-900'
};

export const THEMES: Record<ThemeColor, ThemeConfig> = {
    default: {
        name: '经典',
        primary: 'text-indigo-600 dark:text-indigo-400',
        bgLight: 'bg-indigo-50 dark:bg-indigo-500/10',
        bgPrimary: 'bg-indigo-600',
        gradient: 'from-indigo-600 to-purple-600',
        ring: 'ring-indigo-500',
        ...BASE_BG,
    },
    cosmic: {
        name: '星空紫',
        primary: 'text-violet-600 dark:text-violet-400',
        bgLight: 'bg-violet-50 dark:bg-violet-500/10',
        bgPrimary: 'bg-violet-600',
        gradient: 'from-violet-600 via-purple-600 to-fuchsia-500',
        ring: 'ring-violet-500',
        ...BASE_BG,
    },
    jade: {
        name: '翡翠青',
        primary: 'text-emerald-600 dark:text-emerald-400',
        bgLight: 'bg-emerald-50 dark:bg-emerald-500/10',
        bgPrimary: 'bg-emerald-600',
        gradient: 'from-emerald-500 via-green-500 to-teal-500',
        ring: 'ring-emerald-500',
        ...BASE_BG,
    },
    rosegold: {
        name: '玫瑰金',
        primary: 'text-rose-500 dark:text-rose-400',
        bgLight: 'bg-rose-50 dark:bg-rose-500/10',
        bgPrimary: 'bg-rose-500',
        gradient: 'from-rose-400 via-pink-500 to-amber-400',
        ring: 'ring-rose-400',
        ...BASE_BG,
    },
    ocean: {
        name: '深海蓝',
        primary: 'text-blue-600 dark:text-blue-400',
        bgLight: 'bg-blue-50 dark:bg-blue-500/10',
        bgPrimary: 'bg-blue-600',
        gradient: 'from-blue-500 via-cyan-500 to-sky-400',
        ring: 'ring-blue-500',
        ...BASE_BG,
    },
    midnight: {
        name: '暗金',
        primary: 'text-amber-500 dark:text-amber-400',
        bgLight: 'bg-amber-50 dark:bg-amber-500/10',
        bgPrimary: 'bg-amber-500',
        gradient: 'from-amber-500 via-orange-500 to-yellow-500',
        ring: 'ring-amber-500',
        ...BASE_BG,
    }
};

export const ThemeContext = React.createContext<{ theme: ThemeConfig, currentThemeKey: ThemeColor, setTheme: (t: ThemeColor) => void }>({
    theme: THEMES.default,
    currentThemeKey: 'default',
    setTheme: () => { }
});
