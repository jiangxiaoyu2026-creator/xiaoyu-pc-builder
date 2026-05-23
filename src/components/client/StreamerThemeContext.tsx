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
export type LiveStyleKey = 'cyber' | 'pixel' | 'pixelWhite' | 'pixelCream' | 'pixelOcean' | 'pixelNight' | 'pixelSunset' | 'mecha' | 'pure' | 'gundam' | 'aurora' | 'snow' | 'pink' | 'orange' | 'violet' | 'redline';

export interface LiveStyleConfig {
    name: string;
    emoji: string;
    // Wrapper bg
    wrapperBg: string;
    // Card/section bg
    sectionBg: string;
    // Right sidebar panel bg
    panelBg: string;
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
        panelBg: 'bg-white/[0.06]',
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
    pixel: {
        name: '像素街机',
        emoji: '▣',
        wrapperBg: 'bg-[#162033] bg-[linear-gradient(90deg,rgba(125,211,252,0.12)_1px,transparent_1px),linear-gradient(0deg,rgba(125,211,252,0.12)_1px,transparent_1px)] bg-[length:16px_16px]',
        sectionBg: 'bg-[#1e2b44] border-4 border-sky-300',
        panelBg: 'bg-[#253452]',
        categoryText: 'text-sky-200 font-black',
        modelText: 'text-[#fff7d6] font-black',
        priceText: 'text-[#ffd166] font-black',
        totalPriceText: 'text-[#ffd166]',
        divider: 'divide-sky-300/30',
        headerBg: 'bg-[#17243b] border-b-4 border-sky-300',
        border: 'border-sky-300',
        accentText: 'text-[#ff8a7a]',
        fpsBarColor: 'bg-[repeating-linear-gradient(90deg,#7dd3fc_0_10px,#ffd166_10px_20px,#ff8a7a_20px_30px)]',
        savedBadge: 'bg-[#ffd166] text-[#17243b] border-2 border-sky-200 shadow-[3px_3px_0_#07111f]',
        mutedText: 'text-[#92a6c7]',
        glowBg: 'bg-[#ff8a7a]',
        rowBg: 'bg-[#22304c]',
        stampBorder: 'border-sky-300',
    },
    pixelWhite: {
        name: '像素白板',
        emoji: '□',
        wrapperBg: 'bg-white bg-[linear-gradient(90deg,rgba(15,23,42,0.08)_1px,transparent_1px),linear-gradient(0deg,rgba(15,23,42,0.08)_1px,transparent_1px)] bg-[length:18px_18px]',
        sectionBg: 'bg-[#f8fafc] border-4 border-slate-900',
        panelBg: 'bg-white',
        categoryText: 'text-slate-950 font-black',
        modelText: 'text-slate-950 font-black',
        priceText: 'text-[#e34f3f] font-black',
        totalPriceText: 'text-[#e34f3f]',
        divider: 'divide-slate-900/18',
        headerBg: 'bg-[#eef4ff] border-b-4 border-slate-900',
        border: 'border-slate-900',
        accentText: 'text-[#0077b6]',
        fpsBarColor: 'bg-[repeating-linear-gradient(90deg,#0f172a_0_10px,#38bdf8_10px_20px,#fbbf24_20px_30px,#e34f3f_30px_40px)]',
        savedBadge: 'bg-[#fbbf24] text-slate-950 border-2 border-slate-950 shadow-[3px_3px_0_#0f172a]',
        mutedText: 'text-slate-500',
        glowBg: 'bg-[#38bdf8]',
        rowBg: 'bg-white',
        stampBorder: 'border-slate-900',
    },
    pixelCream: {
        name: '像素奶油',
        emoji: '▤',
        wrapperBg: 'bg-[#fff7e6] bg-[linear-gradient(90deg,rgba(88,64,48,0.12)_1px,transparent_1px),linear-gradient(0deg,rgba(88,64,48,0.12)_1px,transparent_1px)] bg-[length:18px_18px]',
        sectionBg: 'bg-[#ffe8b8] border-4 border-[#584030]',
        panelBg: 'bg-[#fffaf0]',
        categoryText: 'text-[#584030] font-black',
        modelText: 'text-[#2d241c] font-black',
        priceText: 'text-[#d94832] font-black',
        totalPriceText: 'text-[#d94832]',
        divider: 'divide-[#584030]/25',
        headerBg: 'bg-[#ffd98a] border-b-4 border-[#584030]',
        border: 'border-[#584030]',
        accentText: 'text-[#0f766e]',
        fpsBarColor: 'bg-[repeating-linear-gradient(90deg,#584030_0_10px,#f59e0b_10px_20px,#0f766e_20px_30px,#d94832_30px_40px)]',
        savedBadge: 'bg-[#0f766e] text-white border-2 border-[#584030] shadow-[3px_3px_0_#2d241c]',
        mutedText: 'text-[#806852]',
        glowBg: 'bg-[#f59e0b]',
        rowBg: 'bg-[#fff0cc]',
        stampBorder: 'border-[#584030]',
    },
    pixelOcean: {
        name: '像素海盐',
        emoji: '▧',
        wrapperBg: 'bg-[#092b33] bg-[linear-gradient(90deg,rgba(153,246,228,0.12)_1px,transparent_1px),linear-gradient(0deg,rgba(153,246,228,0.12)_1px,transparent_1px)] bg-[length:16px_16px]',
        sectionBg: 'bg-[#0e3a43] border-4 border-teal-200',
        panelBg: 'bg-[#144b55]',
        categoryText: 'text-teal-100 font-black',
        modelText: 'text-[#f2fff8] font-black',
        priceText: 'text-[#ffd6a5] font-black',
        totalPriceText: 'text-[#ffd6a5]',
        divider: 'divide-teal-200/28',
        headerBg: 'bg-[#0b323b] border-b-4 border-teal-200',
        border: 'border-teal-200',
        accentText: 'text-[#ff8f70]',
        fpsBarColor: 'bg-[repeating-linear-gradient(90deg,#99f6e4_0_10px,#67e8f9_10px_20px,#ffd6a5_20px_30px,#ff8f70_30px_40px)]',
        savedBadge: 'bg-teal-200 text-[#092b33] border-2 border-[#ffd6a5] shadow-[3px_3px_0_#03191f]',
        mutedText: 'text-[#7fb8bd]',
        glowBg: 'bg-[#ff8f70]',
        rowBg: 'bg-[#123f49]',
        stampBorder: 'border-teal-200',
    },
    pixelNight: {
        name: '像素夜航',
        emoji: '▥',
        wrapperBg: 'bg-[#101827] bg-[linear-gradient(90deg,rgba(251,191,36,0.10)_1px,transparent_1px),linear-gradient(0deg,rgba(251,191,36,0.10)_1px,transparent_1px)] bg-[length:16px_16px]',
        sectionBg: 'bg-[#172033] border-4 border-amber-300',
        panelBg: 'bg-[#202b42]',
        categoryText: 'text-amber-200 font-black',
        modelText: 'text-[#f8fafc] font-black',
        priceText: 'text-[#7dd3fc] font-black',
        totalPriceText: 'text-[#7dd3fc]',
        divider: 'divide-amber-300/28',
        headerBg: 'bg-[#111b2e] border-b-4 border-amber-300',
        border: 'border-amber-300',
        accentText: 'text-[#fb7185]',
        fpsBarColor: 'bg-[repeating-linear-gradient(90deg,#fbbf24_0_10px,#7dd3fc_10px_20px,#fb7185_20px_30px)]',
        savedBadge: 'bg-amber-300 text-[#101827] border-2 border-sky-200 shadow-[3px_3px_0_#020617]',
        mutedText: 'text-[#94a3b8]',
        glowBg: 'bg-[#7dd3fc]',
        rowBg: 'bg-[#1b263b]',
        stampBorder: 'border-amber-300',
    },
    pixelSunset: {
        name: '像素夕阳',
        emoji: '▦',
        wrapperBg: 'bg-[#261833] bg-[linear-gradient(90deg,rgba(253,186,116,0.11)_1px,transparent_1px),linear-gradient(0deg,rgba(253,186,116,0.11)_1px,transparent_1px)] bg-[length:16px_16px]',
        sectionBg: 'bg-[#37214a] border-4 border-orange-200',
        panelBg: 'bg-[#442958]',
        categoryText: 'text-orange-100 font-black',
        modelText: 'text-[#fff1e6] font-black',
        priceText: 'text-[#fde68a] font-black',
        totalPriceText: 'text-[#fde68a]',
        divider: 'divide-orange-200/28',
        headerBg: 'bg-[#2d1d3c] border-b-4 border-orange-200',
        border: 'border-orange-200',
        accentText: 'text-[#67e8f9]',
        fpsBarColor: 'bg-[repeating-linear-gradient(90deg,#fdba74_0_10px,#fde68a_10px_20px,#67e8f9_20px_30px)]',
        savedBadge: 'bg-[#fdba74] text-[#261833] border-2 border-[#fde68a] shadow-[3px_3px_0_#12091a]',
        mutedText: 'text-[#b9a0c9]',
        glowBg: 'bg-[#67e8f9]',
        rowBg: 'bg-[#3c2550]',
        stampBorder: 'border-orange-200',
    },
    gundam: {
        name: '高达',
        emoji: '🤖',
        wrapperBg: 'bg-[#1a1c2e]',
        sectionBg: 'bg-[#1e2035]/90 border-blue-500/20',
        panelBg: 'bg-white/[0.07]',
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
        panelBg: 'bg-white/[0.06]',
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
        panelBg: 'bg-white/85',
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
    aurora: {
        name: '极光',
        emoji: '✦',
        wrapperBg: 'bg-[#061314]',
        sectionBg: 'bg-[#0a2424]/76 border-teal-300/20',
        panelBg: 'bg-white/[0.08]',
        categoryText: 'text-teal-200 font-black',
        modelText: 'text-white font-black',
        priceText: 'text-lime-200 font-black',
        totalPriceText: 'text-transparent bg-clip-text bg-gradient-to-r from-teal-200 via-lime-200 to-sky-300',
        divider: 'divide-teal-400/10',
        headerBg: 'bg-gradient-to-r from-[#061314]/95 via-[#103532]/78 to-[#061314]/95 border-b border-teal-300/20',
        border: 'border-teal-400/20',
        accentText: 'text-teal-200',
        fpsBarColor: 'bg-gradient-to-r from-teal-300 via-lime-300 to-sky-300',
        savedBadge: 'bg-lime-400/15 text-lime-200 border border-lime-300/25',
        mutedText: 'text-teal-600',
        glowBg: 'bg-teal-300',
        rowBg: 'bg-[#12302d]/75',
        stampBorder: 'border-teal-300/35',
    },
    snow: {
        name: '雪域白',
        emoji: '◇',
        wrapperBg: 'bg-slate-100',
        sectionBg: 'bg-white border-slate-200',
        panelBg: 'bg-white/90',
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
    pink: {
        name: '粉色甜酷',
        emoji: '◇',
        wrapperBg: 'bg-[#1b0d18]',
        sectionBg: 'bg-[#2b1430]/76 border-pink-300/20',
        panelBg: 'bg-white/[0.08]',
        categoryText: 'text-pink-200 font-black',
        modelText: 'text-white font-black',
        priceText: 'text-fuchsia-200 font-black',
        totalPriceText: 'text-transparent bg-clip-text bg-gradient-to-r from-pink-200 via-fuchsia-200 to-rose-300',
        divider: 'divide-pink-300/10',
        headerBg: 'bg-gradient-to-r from-[#1b0d18]/95 via-[#3b1840]/76 to-[#1b0d18]/95 border-b border-pink-300/20',
        border: 'border-pink-300/20',
        accentText: 'text-pink-200',
        fpsBarColor: 'bg-gradient-to-r from-pink-300 via-fuchsia-300 to-rose-300',
        savedBadge: 'bg-pink-400/15 text-pink-100 border border-pink-200/25',
        mutedText: 'text-pink-700',
        glowBg: 'bg-pink-300',
        rowBg: 'bg-[#36192f]/70',
        stampBorder: 'border-pink-200/40',
    },
    orange: {
        name: '橙色脉冲',
        emoji: '◆',
        wrapperBg: 'bg-[#1a1006]',
        sectionBg: 'bg-[#2c1a08]/76 border-orange-300/20',
        panelBg: 'bg-white/[0.08]',
        categoryText: 'text-orange-200 font-black',
        modelText: 'text-white font-black',
        priceText: 'text-amber-200 font-black',
        totalPriceText: 'text-transparent bg-clip-text bg-gradient-to-r from-orange-200 via-amber-200 to-yellow-300',
        divider: 'divide-orange-300/10',
        headerBg: 'bg-gradient-to-r from-[#1a1006]/95 via-[#3d2308]/76 to-[#1a1006]/95 border-b border-orange-300/20',
        border: 'border-orange-300/20',
        accentText: 'text-orange-200',
        fpsBarColor: 'bg-gradient-to-r from-orange-300 via-amber-300 to-yellow-300',
        savedBadge: 'bg-orange-400/15 text-orange-100 border border-orange-200/25',
        mutedText: 'text-orange-700',
        glowBg: 'bg-orange-300',
        rowBg: 'bg-[#35200f]/70',
        stampBorder: 'border-orange-200/40',
    },
    violet: {
        name: '紫黑机甲',
        emoji: '◇',
        wrapperBg: 'bg-[#f6f3fb]',
        sectionBg: 'bg-white/95 border-violet-600/30',
        panelBg: 'bg-violet-50/65',
        categoryText: 'text-violet-600 font-black',
        modelText: 'text-slate-950 font-black',
        priceText: 'text-fuchsia-600 font-black',
        totalPriceText: 'text-transparent bg-clip-text bg-gradient-to-r from-violet-700 via-fuchsia-600 to-rose-500',
        divider: 'divide-violet-500/20',
        headerBg: 'bg-gradient-to-r from-white via-violet-50/80 to-white border-b border-violet-600/25',
        border: 'border-violet-600/30',
        accentText: 'text-violet-600',
        fpsBarColor: 'bg-gradient-to-r from-violet-700 via-fuchsia-500 to-rose-500',
        savedBadge: 'bg-violet-50 text-violet-700 border border-violet-100',
        mutedText: 'text-slate-400',
        glowBg: 'bg-violet-600',
        rowBg: 'bg-white/95',
        stampBorder: 'border-violet-700/45',
    },
    redline: {
        name: '红黑机甲',
        emoji: '◆',
        wrapperBg: 'bg-slate-50',
        sectionBg: 'bg-white border-red-500/25',
        panelBg: 'bg-red-50/65',
        categoryText: 'text-red-600 font-black',
        modelText: 'text-slate-950 font-black',
        priceText: 'text-rose-600 font-black',
        totalPriceText: 'text-transparent bg-clip-text bg-gradient-to-r from-red-700 via-rose-600 to-orange-500',
        divider: 'divide-red-500/20',
        headerBg: 'bg-gradient-to-r from-white via-red-50 to-white border-b border-red-500/20',
        border: 'border-red-600/30',
        accentText: 'text-red-600',
        fpsBarColor: 'bg-gradient-to-r from-red-700 via-rose-500 to-orange-500',
        savedBadge: 'bg-red-50 text-red-700 border border-red-100',
        mutedText: 'text-slate-400',
        glowBg: 'bg-red-600',
        rowBg: 'bg-white',
        stampBorder: 'border-red-700/45',
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
    liveStyle: 'violet',
    setLiveStyle: () => { },
    liveStyleConfig: LIVE_STYLES.violet,
});
