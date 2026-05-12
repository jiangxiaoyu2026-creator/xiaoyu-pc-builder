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

// === Live Mode Specific Styles ===
export type LiveStyleKey = 'cyber' | 'mecha' | 'pure' | 'tactical' | 'gundam' | 'graphite' | 'aurora' | 'snow' | 'crimson' | 'pink' | 'orange';

export interface LiveStyleConfig {
    name: string;
    emoji: string;
    // Wrapper bg
    wrapperBg: string;
    // Card/section bg
    sectionBg: string;
    // Category label style
    categoryText: string;
    // Model name text
    modelText: string;
    // Price text
    priceText: string;
    // Total price accent
    totalPriceText: string;
    // Divider
    divider: string;
    // Header bg
    headerBg: string;
    // Border
    border: string;
    // Score / power accent
    accentText: string;
    // FPS bar color
    fpsBarColor: string;
    // Saved badge
    savedBadge: string;
    // Muted text
    mutedText: string;
    // Background glow / button highlight (proper bg-xxx class)
    glowBg: string;
    // Row background for each config entry (live mode only)
    rowBg: string;
    // Stamp-style border for product images
    stampBorder: string;
}

export const LIVE_STYLES: Record<LiveStyleKey, LiveStyleConfig> = {
    cyber: {
        name: '电竞霓虹',
        emoji: '🎮',
        wrapperBg: 'bg-gray-950',
        sectionBg: 'bg-gray-900/90 border-cyan-500/20',
        categoryText: 'text-cyan-400 font-black',
        modelText: 'text-white font-black',
        priceText: 'text-cyan-300 font-black',
        totalPriceText: 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400',
        divider: 'divide-cyan-500/10',
        headerBg: 'bg-gradient-to-r from-gray-900 via-gray-950 to-gray-900 border-b border-cyan-500/20',
        border: 'border-cyan-500/15',
        accentText: 'text-cyan-400',
        fpsBarColor: 'bg-gradient-to-r from-cyan-500 to-purple-500',
        savedBadge: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
        mutedText: 'text-gray-500',
        glowBg: 'bg-cyan-500',
        rowBg: 'bg-gray-800/60',
        stampBorder: 'border-cyan-500/30',
    },
    tactical: {
        name: '军绿战术',
        emoji: '🎖️',
        wrapperBg: 'bg-[#2d2f24]',
        sectionBg: 'bg-[#353728]/90 border-lime-500/20',
        categoryText: 'text-lime-400 font-black',
        modelText: 'text-white font-black',
        priceText: 'text-lime-400 font-black',
        totalPriceText: 'text-lime-400',
        divider: 'divide-lime-500/10',
        headerBg: 'bg-gradient-to-r from-[#2d2f24] via-[#353728] to-[#2d2f24] border-b border-lime-500/20',
        border: 'border-lime-500/15',
        accentText: 'text-lime-400',
        fpsBarColor: 'bg-gradient-to-r from-lime-500 to-yellow-500',
        savedBadge: 'bg-lime-500/20 text-lime-300 border border-lime-500/30',
        mutedText: 'text-[#7a7d60]',
        glowBg: 'bg-lime-500',
        rowBg: 'bg-[#3a3d2e]/80',
        stampBorder: 'border-lime-500/40',
    },
    gundam: {
        name: '高达',
        emoji: '🤖',
        wrapperBg: 'bg-[#1a1c2e]',
        sectionBg: 'bg-[#1e2035]/90 border-blue-500/20',
        categoryText: 'text-red-400 font-black',
        modelText: 'text-white font-black',
        priceText: 'text-yellow-400 font-black',
        totalPriceText: 'text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-white to-blue-400',
        divider: 'divide-blue-500/10',
        headerBg: 'bg-gradient-to-r from-[#1a1c2e] via-[#1e2035] to-[#1a1c2e] border-b border-blue-500/20',
        border: 'border-blue-500/15',
        accentText: 'text-yellow-400',
        fpsBarColor: 'bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500',
        savedBadge: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
        mutedText: 'text-slate-500',
        glowBg: 'bg-red-500',
        rowBg: 'bg-[#232540]/70',
        stampBorder: 'border-blue-400/40',
    },
    mecha: {
        name: '机甲硬核',
        emoji: '⚙️',
        wrapperBg: 'bg-[#0f1115]',
        sectionBg: 'bg-[#16181f]/90 border-orange-500/20',
        categoryText: 'text-orange-400 font-black',
        modelText: 'text-slate-100 font-black',
        priceText: 'text-orange-300 font-black',
        totalPriceText: 'text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-300',
        divider: 'divide-orange-500/10',
        headerBg: 'bg-gradient-to-r from-[#0f1115] via-[#16181f] to-[#0f1115] border-b border-orange-500/20',
        border: 'border-orange-500/15',
        accentText: 'text-orange-400',
        fpsBarColor: 'bg-gradient-to-r from-orange-500 to-amber-500',
        savedBadge: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
        mutedText: 'text-slate-600',
        glowBg: 'bg-orange-500',
        rowBg: 'bg-[#1a1d24]/80',
        stampBorder: 'border-orange-500/30',
    },
    pure: {
        name: '极简高对比',
        emoji: '⚡',
        wrapperBg: 'bg-white',
        sectionBg: 'bg-gray-50 border-gray-200',
        categoryText: 'text-indigo-600 font-black',
        modelText: 'text-gray-900 font-black',
        priceText: 'text-rose-600 font-black',
        totalPriceText: 'text-transparent bg-clip-text bg-gradient-to-r from-rose-600 to-orange-500',
        divider: 'divide-gray-200',
        headerBg: 'bg-white border-b border-gray-200',
        border: 'border-gray-200',
        accentText: 'text-indigo-600',
        fpsBarColor: 'bg-gradient-to-r from-indigo-500 to-blue-500',
        savedBadge: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
        mutedText: 'text-gray-400',
        glowBg: 'bg-indigo-500',
        rowBg: 'bg-gray-100/60',
        stampBorder: 'border-gray-300',
    },
    graphite: {
        name: '石墨灰',
        emoji: '◼',
        wrapperBg: 'bg-[#111318]',
        sectionBg: 'bg-[#171a21]/90 border-slate-500/20',
        categoryText: 'text-slate-300 font-black',
        modelText: 'text-white font-black',
        priceText: 'text-emerald-300 font-black',
        totalPriceText: 'text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-slate-100 to-cyan-300',
        divider: 'divide-slate-500/10',
        headerBg: 'bg-gradient-to-r from-[#151820] via-[#222733] to-[#151820] border-b border-slate-500/20',
        border: 'border-slate-500/20',
        accentText: 'text-emerald-300',
        fpsBarColor: 'bg-gradient-to-r from-emerald-400 to-cyan-400',
        savedBadge: 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30',
        mutedText: 'text-slate-500',
        glowBg: 'bg-emerald-400',
        rowBg: 'bg-[#20242e]/75',
        stampBorder: 'border-slate-400/30',
    },
    aurora: {
        name: '极光',
        emoji: '✦',
        wrapperBg: 'bg-[#071617]',
        sectionBg: 'bg-[#0b2021]/90 border-teal-400/20',
        categoryText: 'text-teal-200 font-black',
        modelText: 'text-white font-black',
        priceText: 'text-lime-200 font-black',
        totalPriceText: 'text-transparent bg-clip-text bg-gradient-to-r from-teal-200 via-lime-200 to-sky-300',
        divider: 'divide-teal-400/10',
        headerBg: 'bg-gradient-to-r from-[#092021] via-[#12322e] to-[#071617] border-b border-teal-400/20',
        border: 'border-teal-400/20',
        accentText: 'text-teal-200',
        fpsBarColor: 'bg-gradient-to-r from-teal-300 via-lime-300 to-sky-300',
        savedBadge: 'bg-lime-400/15 text-lime-200 border border-lime-300/25',
        mutedText: 'text-teal-700',
        glowBg: 'bg-teal-300',
        rowBg: 'bg-[#12302d]/75',
        stampBorder: 'border-teal-300/35',
    },
    snow: {
        name: '雪域白',
        emoji: '◇',
        wrapperBg: 'bg-slate-100',
        sectionBg: 'bg-white border-slate-200',
        categoryText: 'text-slate-700 font-black',
        modelText: 'text-slate-950 font-black',
        priceText: 'text-blue-700 font-black',
        totalPriceText: 'text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-slate-900 to-emerald-600',
        divider: 'divide-slate-200',
        headerBg: 'bg-gradient-to-r from-white via-slate-50 to-blue-50 border-b border-slate-200',
        border: 'border-slate-200',
        accentText: 'text-blue-700',
        fpsBarColor: 'bg-gradient-to-r from-blue-500 to-emerald-500',
        savedBadge: 'bg-blue-50 text-blue-700 border border-blue-100',
        mutedText: 'text-slate-400',
        glowBg: 'bg-blue-500',
        rowBg: 'bg-slate-50',
        stampBorder: 'border-slate-300',
    },
    crimson: {
        name: '赤焰',
        emoji: '◆',
        wrapperBg: 'bg-[#190f12]',
        sectionBg: 'bg-[#211418]/90 border-red-400/20',
        categoryText: 'text-red-300 font-black',
        modelText: 'text-white font-black',
        priceText: 'text-amber-200 font-black',
        totalPriceText: 'text-transparent bg-clip-text bg-gradient-to-r from-red-300 via-amber-200 to-orange-300',
        divider: 'divide-red-400/10',
        headerBg: 'bg-gradient-to-r from-[#190f12] via-[#30171b] to-[#190f12] border-b border-red-400/20',
        border: 'border-red-400/20',
        accentText: 'text-red-300',
        fpsBarColor: 'bg-gradient-to-r from-red-400 to-amber-300',
        savedBadge: 'bg-amber-400/15 text-amber-200 border border-amber-300/25',
        mutedText: 'text-red-900',
        glowBg: 'bg-red-400',
        rowBg: 'bg-[#2b171b]/75',
        stampBorder: 'border-red-300/35',
    },
    pink: {
        name: '粉色甜酷',
        emoji: '◇',
        wrapperBg: 'bg-[#1f101c]',
        sectionBg: 'bg-[#2a1626]/90 border-pink-400/20',
        categoryText: 'text-pink-200 font-black',
        modelText: 'text-white font-black',
        priceText: 'text-fuchsia-200 font-black',
        totalPriceText: 'text-transparent bg-clip-text bg-gradient-to-r from-pink-200 via-fuchsia-200 to-rose-300',
        divider: 'divide-pink-300/10',
        headerBg: 'bg-gradient-to-r from-[#1f101c] via-[#3a1731] to-[#1f101c] border-b border-pink-300/20',
        border: 'border-pink-300/20',
        accentText: 'text-pink-200',
        fpsBarColor: 'bg-gradient-to-r from-pink-300 via-fuchsia-300 to-rose-300',
        savedBadge: 'bg-pink-400/15 text-pink-100 border border-pink-200/25',
        mutedText: 'text-pink-900',
        glowBg: 'bg-pink-300',
        rowBg: 'bg-[#36192f]/70',
        stampBorder: 'border-pink-200/40',
    },
    orange: {
        name: '橙色脉冲',
        emoji: '◆',
        wrapperBg: 'bg-[#1d1308]',
        sectionBg: 'bg-[#2b1b0d]/90 border-orange-300/20',
        categoryText: 'text-orange-200 font-black',
        modelText: 'text-white font-black',
        priceText: 'text-amber-200 font-black',
        totalPriceText: 'text-transparent bg-clip-text bg-gradient-to-r from-orange-200 via-amber-200 to-yellow-300',
        divider: 'divide-orange-300/10',
        headerBg: 'bg-gradient-to-r from-[#1d1308] via-[#3a220d] to-[#1d1308] border-b border-orange-300/20',
        border: 'border-orange-300/20',
        accentText: 'text-orange-200',
        fpsBarColor: 'bg-gradient-to-r from-orange-300 via-amber-300 to-yellow-300',
        savedBadge: 'bg-orange-400/15 text-orange-100 border border-orange-200/25',
        mutedText: 'text-orange-900',
        glowBg: 'bg-orange-300',
        rowBg: 'bg-[#35200f]/70',
        stampBorder: 'border-orange-200/40',
    },
};

export const ThemeContext = React.createContext<{
    theme: ThemeConfig;
    currentThemeKey: ThemeColor;
    setTheme: (t: ThemeColor) => void;
    isLiveMode: boolean;
    setLiveMode: (v: boolean) => void;
    liveStyle: LiveStyleKey;
    setLiveStyle: (s: LiveStyleKey) => void;
    liveStyleConfig: LiveStyleConfig;
}>({
    theme: THEMES.default,
    currentThemeKey: 'default',
    setTheme: () => { },
    isLiveMode: false,
    setLiveMode: () => { },
    liveStyle: 'cyber',
    setLiveStyle: () => { },
    liveStyleConfig: LIVE_STYLES.cyber,
});
