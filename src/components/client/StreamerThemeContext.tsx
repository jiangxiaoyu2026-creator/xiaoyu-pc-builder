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
    // Surface contrast used by controls and floating panels.
    surface: 'light' | 'dark';
    // Decorative frame treatment; never changes the fixed sheet dimensions.
    frameTreatment: 'tech' | 'soft';
    // Optional animated border language. Favorites use `none` to stay untouched.
    frameMotion: 'none' | 'charge' | 'scan' | 'pulse' | 'warning';
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
        surface: 'dark',
        frameTreatment: 'tech',
        frameMotion: 'charge',
        wrapperBg: 'bg-[#070d18] bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.13),transparent_38%),linear-gradient(135deg,#070d18,#0b1424_55%,#07101c)]',
        sectionBg: 'bg-[#0b1424]/95 border-cyan-300/25',
        panelBg: 'bg-[#101d2f]/90',
        categoryText: 'text-cyan-300 font-black',
        modelText: 'text-slate-50 font-black',
        priceText: 'text-sky-300 font-black',
        totalPriceText: 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-300 to-indigo-300',
        divider: 'divide-cyan-200/12',
        headerBg: 'bg-gradient-to-r from-[#08111f] via-[#0d1b2e] to-[#08111f] border-b border-cyan-300/20',
        border: 'border-cyan-300/20',
        accentText: 'text-cyan-300',
        fpsBarColor: 'bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500',
        savedBadge: 'bg-emerald-400/15 text-emerald-200 border border-emerald-300/25',
        mutedText: 'text-slate-500',
        glowBg: 'bg-cyan-400',
        rowBg: 'bg-[#0e1a2b]',
        stampBorder: 'border-cyan-300/35',
    },
    pixel: {
        name: '马里奥顶蘑菇',
        emoji: '🍄',
        surface: 'light',
        frameTreatment: 'tech',
        frameMotion: 'pulse',
        wrapperBg: 'bg-[#fff4cf] bg-[linear-gradient(90deg,rgba(124,45,18,0.035)_1px,transparent_1px),linear-gradient(0deg,rgba(124,45,18,0.035)_1px,transparent_1px)] bg-[length:32px_24px]',
        sectionBg: 'bg-[#fff8e7] border-4 border-[#7c2d12]',
        panelBg: 'bg-[#fffaf0]',
        categoryText: 'text-[#166534] font-black',
        modelText: 'text-[#3f2a18] font-black',
        priceText: 'text-[#b45309] font-black',
        totalPriceText: 'text-[#c2410c]',
        divider: 'divide-[#b45309]/25',
        headerBg: 'bg-[#ffefbd] bg-[linear-gradient(90deg,rgba(250,204,21,0.18),transparent_42%,rgba(34,197,94,0.10))] border-b-4 border-[#d97706]',
        border: 'border-[#9a5c20]',
        accentText: 'text-[#facc15]',
        fpsBarColor: 'bg-[repeating-linear-gradient(90deg,#22c55e_0_12px,#facc15_12px_24px,#ef4444_24px_30px)]',
        savedBadge: 'bg-[#facc15] text-[#422006] border-2 border-[#b91c1c] shadow-[3px_3px_0_#7c2d12]',
        mutedText: 'text-[#7c6040]',
        glowBg: 'bg-[#22c55e]',
        rowBg: 'bg-[#fff8dc]',
        stampBorder: 'border-[#7c2d12]',
    },
    pixelWhite: {
        name: '像素白板',
        emoji: '□',
        surface: 'light',
        frameTreatment: 'tech',
        frameMotion: 'scan',
        wrapperBg: 'bg-[#f6f7f2] bg-[linear-gradient(90deg,rgba(29,78,216,0.08)_1px,transparent_1px),linear-gradient(0deg,rgba(29,78,216,0.08)_1px,transparent_1px)] bg-[length:18px_18px]',
        sectionBg: 'bg-white border-4 border-[#1e3a5f]',
        panelBg: 'bg-[#f8fbff]',
        categoryText: 'text-[#1d4ed8] font-black',
        modelText: 'text-[#111827] font-black',
        priceText: 'text-[#c2410c] font-black',
        totalPriceText: 'text-[#c2410c]',
        divider: 'divide-[#1e3a5f]/18',
        headerBg: 'bg-[#eaf2ff] border-b-4 border-[#1e3a5f]',
        border: 'border-[#1e3a5f]',
        accentText: 'text-[#0f766e]',
        fpsBarColor: 'bg-[repeating-linear-gradient(90deg,#1d4ed8_0_12px,#38bdf8_12px_24px,#0f766e_24px_34px,#f59e0b_34px_40px)]',
        savedBadge: 'bg-[#dbeafe] text-[#1e3a5f] border-2 border-[#1e3a5f] shadow-[3px_3px_0_#0f172a]',
        mutedText: 'text-slate-500',
        glowBg: 'bg-[#1d4ed8]',
        rowBg: 'bg-white',
        stampBorder: 'border-[#1e3a5f]',
    },
    pixelCream: {
        name: '像素奶油',
        emoji: '▤',
        surface: 'light',
        frameTreatment: 'tech',
        frameMotion: 'none',
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
        surface: 'light',
        frameTreatment: 'tech',
        frameMotion: 'charge',
        wrapperBg: 'bg-[#eafaf7] bg-[linear-gradient(90deg,rgba(15,118,110,0.10)_1px,transparent_1px),linear-gradient(0deg,rgba(15,118,110,0.10)_1px,transparent_1px)] bg-[length:16px_16px]',
        sectionBg: 'bg-[#dff7f1] border-4 border-[#164e63]',
        panelBg: 'bg-[#f5fffc]',
        categoryText: 'text-[#0f766e] font-black',
        modelText: 'text-[#15323a] font-black',
        priceText: 'text-[#c2410c] font-black',
        totalPriceText: 'text-[#c2410c]',
        divider: 'divide-[#164e63]/20',
        headerBg: 'bg-[#ccefe7] border-b-4 border-[#164e63]',
        border: 'border-[#164e63]',
        accentText: 'text-[#0369a1]',
        fpsBarColor: 'bg-[repeating-linear-gradient(90deg,#0f766e_0_12px,#2dd4bf_12px_24px,#38bdf8_24px_34px,#fb7185_34px_40px)]',
        savedBadge: 'bg-[#99f6e4] text-[#15323a] border-2 border-[#164e63] shadow-[3px_3px_0_#083344]',
        mutedText: 'text-[#5b7f82]',
        glowBg: 'bg-[#14b8a6]',
        rowBg: 'bg-[#ebfbf7]',
        stampBorder: 'border-[#164e63]',
    },
    pixelNight: {
        name: '像素夜航',
        emoji: '▥',
        surface: 'dark',
        frameTreatment: 'tech',
        frameMotion: 'pulse',
        wrapperBg: 'bg-[#0b1220] bg-[linear-gradient(90deg,rgba(148,163,184,0.10)_1px,transparent_1px),linear-gradient(0deg,rgba(148,163,184,0.10)_1px,transparent_1px)] bg-[length:16px_16px]',
        sectionBg: 'bg-[#121c2e] border-4 border-[#d9b75f]',
        panelBg: 'bg-[#1a263a]',
        categoryText: 'text-[#f2d58a] font-black',
        modelText: 'text-[#f8fafc] font-black',
        priceText: 'text-[#8bd3f7] font-black',
        totalPriceText: 'text-[#8bd3f7]',
        divider: 'divide-[#d9b75f]/24',
        headerBg: 'bg-[#0d1729] border-b-4 border-[#d9b75f]',
        border: 'border-[#d9b75f]',
        accentText: 'text-[#8bd3f7]',
        fpsBarColor: 'bg-[repeating-linear-gradient(90deg,#d9b75f_0_12px,#8bd3f7_12px_24px,#64748b_24px_30px)]',
        savedBadge: 'bg-[#d9b75f] text-[#0b1220] border-2 border-[#8bd3f7] shadow-[3px_3px_0_#020617]',
        mutedText: 'text-[#8492a7]',
        glowBg: 'bg-[#8bd3f7]',
        rowBg: 'bg-[#162237]',
        stampBorder: 'border-[#d9b75f]',
    },
    pixelSunset: {
        name: '像素夕阳',
        emoji: '▦',
        surface: 'light',
        frameTreatment: 'tech',
        frameMotion: 'charge',
        wrapperBg: 'bg-[#fff4ee] bg-[linear-gradient(90deg,rgba(107,48,73,0.09)_1px,transparent_1px),linear-gradient(0deg,rgba(107,48,73,0.09)_1px,transparent_1px)] bg-[length:16px_16px]',
        sectionBg: 'bg-[#ffe7d6] border-4 border-[#6b3049]',
        panelBg: 'bg-[#fffaf5]',
        categoryText: 'text-[#9f3d47] font-black',
        modelText: 'text-[#30202a] font-black',
        priceText: 'text-[#c2410c] font-black',
        totalPriceText: 'text-[#c2410c]',
        divider: 'divide-[#6b3049]/20',
        headerBg: 'bg-[#ffd7bd] border-b-4 border-[#6b3049]',
        border: 'border-[#6b3049]',
        accentText: 'text-[#0369a1]',
        fpsBarColor: 'bg-[repeating-linear-gradient(90deg,#fb923c_0_12px,#fb7185_12px_24px,#6b3049_24px_34px,#38bdf8_34px_40px)]',
        savedBadge: 'bg-[#fdba74] text-[#30202a] border-2 border-[#6b3049] shadow-[3px_3px_0_#431407]',
        mutedText: 'text-[#8b6675]',
        glowBg: 'bg-[#fb7185]',
        rowBg: 'bg-[#fff0e6]',
        stampBorder: 'border-[#6b3049]',
    },
    gundam: {
        name: '高达',
        emoji: '🤖',
        surface: 'light',
        frameTreatment: 'soft',
        frameMotion: 'scan',
        wrapperBg: 'bg-[#edf2f7] bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.10),transparent_36%)]',
        sectionBg: 'bg-white/95 border-[#1f3b73]/30',
        panelBg: 'bg-[#f4f7fb]/95',
        categoryText: 'text-[#cf2f3b] font-black',
        modelText: 'text-slate-950 font-black',
        priceText: 'text-[#1d4ed8] font-black',
        totalPriceText: 'text-transparent bg-clip-text bg-gradient-to-r from-[#1e3a8a] via-[#2563eb] to-[#cf2f3b]',
        divider: 'divide-[#1f3b73]/15',
        headerBg: 'bg-gradient-to-r from-white via-[#eef4ff] to-white border-b border-[#1f3b73]/20',
        border: 'border-[#1f3b73]/25',
        accentText: 'text-[#1d4ed8]',
        fpsBarColor: 'bg-gradient-to-r from-[#1e3a8a] via-[#2563eb] to-[#cf2f3b]',
        savedBadge: 'bg-[#eef4ff] text-[#1e3a8a] border border-[#bfdbfe]',
        mutedText: 'text-slate-400',
        glowBg: 'bg-[#cf2f3b]',
        rowBg: 'bg-[#f8fafc]',
        stampBorder: 'border-[#1f3b73]/40',
    },
    mecha: {
        name: '机甲硬核',
        emoji: '⚙️',
        surface: 'dark',
        frameTreatment: 'tech',
        frameMotion: 'warning',
        wrapperBg: 'bg-[#0d0f12] bg-[linear-gradient(135deg,rgba(249,115,22,0.08),transparent_35%,rgba(148,163,184,0.05))]',
        sectionBg: 'bg-[#15181d]/95 border-[#f59e0b]/25',
        panelBg: 'bg-[#1b1f26]/95',
        categoryText: 'text-[#f59e0b] font-black',
        modelText: 'text-[#f3f4f6] font-black',
        priceText: 'text-[#fdba74] font-black',
        totalPriceText: 'text-transparent bg-clip-text bg-gradient-to-r from-[#f97316] via-[#f59e0b] to-[#fde68a]',
        divider: 'divide-[#f59e0b]/12',
        headerBg: 'bg-gradient-to-r from-[#101216] via-[#20242a] to-[#101216] border-b border-[#f59e0b]/22',
        border: 'border-[#f59e0b]/20',
        accentText: 'text-[#f59e0b]',
        fpsBarColor: 'bg-gradient-to-r from-[#f97316] via-[#f59e0b] to-[#fde68a]',
        savedBadge: 'bg-[#f59e0b]/15 text-[#fde68a] border border-[#f59e0b]/25',
        mutedText: 'text-slate-500',
        glowBg: 'bg-[#f97316]',
        rowBg: 'bg-[#191d23]',
        stampBorder: 'border-[#f59e0b]/35',
    },
    pure: {
        name: '极简高对比',
        emoji: '⚡',
        surface: 'light',
        frameTreatment: 'soft',
        frameMotion: 'scan',
        wrapperBg: 'bg-[#f3f0e8]',
        sectionBg: 'bg-[#fffdf7] border-slate-900/25',
        panelBg: 'bg-[#faf8f1]/95',
        categoryText: 'text-slate-950 font-black',
        modelText: 'text-slate-950 font-black',
        priceText: 'text-[#1d4ed8] font-black',
        totalPriceText: 'text-transparent bg-clip-text bg-gradient-to-r from-slate-950 via-slate-700 to-[#1d4ed8]',
        divider: 'divide-slate-900/15',
        headerBg: 'bg-[#fffdf7] border-b border-slate-900/20',
        border: 'border-slate-900/20',
        accentText: 'text-[#1d4ed8]',
        fpsBarColor: 'bg-gradient-to-r from-slate-900 via-slate-600 to-[#2563eb]',
        savedBadge: 'bg-[#e7efe8] text-[#166534] border border-[#bbd6bf]',
        mutedText: 'text-slate-500',
        glowBg: 'bg-slate-900',
        rowBg: 'bg-[#f8f5ed]',
        stampBorder: 'border-slate-900/35',
    },
    aurora: {
        name: '极光',
        emoji: '✦',
        surface: 'dark',
        frameTreatment: 'tech',
        frameMotion: 'charge',
        wrapperBg: 'bg-[#041311] bg-[radial-gradient(circle_at_20%_0%,rgba(45,212,191,0.16),transparent_34%),radial-gradient(circle_at_90%_30%,rgba(125,211,252,0.10),transparent_36%)]',
        sectionBg: 'bg-[#08211f]/92 border-teal-200/25',
        panelBg: 'bg-[#0d2d29]/90',
        categoryText: 'text-teal-200 font-black',
        modelText: 'text-[#f0fdfa] font-black',
        priceText: 'text-[#bef264] font-black',
        totalPriceText: 'text-transparent bg-clip-text bg-gradient-to-r from-teal-200 via-[#bef264] to-sky-300',
        divider: 'divide-teal-200/12',
        headerBg: 'bg-gradient-to-r from-[#051816] via-[#0d302b] to-[#061b19] border-b border-teal-200/22',
        border: 'border-teal-200/22',
        accentText: 'text-teal-200',
        fpsBarColor: 'bg-gradient-to-r from-teal-300 via-[#bef264] to-sky-300',
        savedBadge: 'bg-[#bef264]/12 text-[#d9f99d] border border-[#bef264]/25',
        mutedText: 'text-teal-700',
        glowBg: 'bg-teal-300',
        rowBg: 'bg-[#0b2925]',
        stampBorder: 'border-teal-200/35',
    },
    snow: {
        name: '雪域白',
        emoji: '◇',
        surface: 'light',
        frameTreatment: 'soft',
        frameMotion: 'pulse',
        wrapperBg: 'bg-[#eef4f8] bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.12),transparent_35%)]',
        sectionBg: 'bg-[#fbfdff] border-[#9bb8d3]/35',
        panelBg: 'bg-white/92',
        categoryText: 'text-[#355c7d] font-black',
        modelText: 'text-[#14263a] font-black',
        priceText: 'text-[#2563a8] font-black',
        totalPriceText: 'text-transparent bg-clip-text bg-gradient-to-r from-[#1e3a5f] via-[#2563a8] to-[#60a5fa]',
        divider: 'divide-[#9bb8d3]/25',
        headerBg: 'bg-gradient-to-r from-white via-[#eef6ff] to-white border-b border-[#9bb8d3]/30',
        border: 'border-[#9bb8d3]/35',
        accentText: 'text-[#2563a8]',
        fpsBarColor: 'bg-gradient-to-r from-[#2563a8] via-[#60a5fa] to-[#7dd3fc]',
        savedBadge: 'bg-[#e6f1fb] text-[#1e3a5f] border border-[#c6dced]',
        mutedText: 'text-[#7790a6]',
        glowBg: 'bg-[#60a5fa]',
        rowBg: 'bg-[#f5f9fc]',
        stampBorder: 'border-[#6b8fac]/45',
    },
    pink: {
        name: '粉色甜酷',
        emoji: '◇',
        surface: 'light',
        frameTreatment: 'soft',
        frameMotion: 'charge',
        wrapperBg: 'bg-[#fff3f7] bg-[radial-gradient(circle_at_top_left,rgba(244,114,182,0.13),transparent_36%)]',
        sectionBg: 'bg-[#fffafd]/96 border-[#c24178]/25',
        panelBg: 'bg-[#fff1f6]/92',
        categoryText: 'text-[#9d174d] font-black',
        modelText: 'text-[#2b1d2a] font-black',
        priceText: 'text-[#be185d] font-black',
        totalPriceText: 'text-transparent bg-clip-text bg-gradient-to-r from-[#9d174d] via-[#db2777] to-[#7c3aed]',
        divider: 'divide-[#c24178]/16',
        headerBg: 'bg-gradient-to-r from-white via-[#ffe8f1] to-white border-b border-[#c24178]/22',
        border: 'border-[#c24178]/25',
        accentText: 'text-[#7c3aed]',
        fpsBarColor: 'bg-gradient-to-r from-[#db2777] via-[#f472b6] to-[#7c3aed]',
        savedBadge: 'bg-[#fce7f3] text-[#9d174d] border border-[#f9a8d4]',
        mutedText: 'text-[#9b6c83]',
        glowBg: 'bg-[#db2777]',
        rowBg: 'bg-[#fff7fa]',
        stampBorder: 'border-[#9d174d]/38',
    },
    orange: {
        name: '橙色脉冲',
        emoji: '◆',
        surface: 'light',
        frameTreatment: 'soft',
        frameMotion: 'warning',
        wrapperBg: 'bg-[#f8f1e4] bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.14),transparent_36%)]',
        sectionBg: 'bg-[#fffaf0]/96 border-[#9a5a18]/28',
        panelBg: 'bg-[#fff4dd]/92',
        categoryText: 'text-[#9a4d0f] font-black',
        modelText: 'text-[#30261d] font-black',
        priceText: 'text-[#c2410c] font-black',
        totalPriceText: 'text-transparent bg-clip-text bg-gradient-to-r from-[#7c2d12] via-[#ea580c] to-[#d97706]',
        divider: 'divide-[#9a5a18]/18',
        headerBg: 'bg-gradient-to-r from-[#fffaf0] via-[#ffedc2] to-[#fffaf0] border-b border-[#9a5a18]/24',
        border: 'border-[#9a5a18]/28',
        accentText: 'text-[#b45309]',
        fpsBarColor: 'bg-gradient-to-r from-[#c2410c] via-[#f59e0b] to-[#fbbf24]',
        savedBadge: 'bg-[#fef3c7] text-[#92400e] border border-[#f6c86a]',
        mutedText: 'text-[#92765a]',
        glowBg: 'bg-[#f59e0b]',
        rowBg: 'bg-[#fff8e9]',
        stampBorder: 'border-[#7c4a18]/40',
    },
    violet: {
        name: '紫黑机甲',
        emoji: '◇',
        surface: 'light',
        frameTreatment: 'tech',
        frameMotion: 'none',
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
        surface: 'light',
        frameTreatment: 'soft',
        frameMotion: 'scan',
        wrapperBg: 'bg-[#f1f2f2] bg-[linear-gradient(135deg,rgba(185,28,28,0.06),transparent_34%)]',
        sectionBg: 'bg-[#fcfcfb] border-slate-800/28',
        panelBg: 'bg-[#f5f4f2]/95',
        categoryText: 'text-[#b4232c] font-black',
        modelText: 'text-[#151a21] font-black',
        priceText: 'text-[#b4232c] font-black',
        totalPriceText: 'text-transparent bg-clip-text bg-gradient-to-r from-[#151a21] via-[#475569] to-[#b4232c]',
        divider: 'divide-slate-700/16',
        headerBg: 'bg-gradient-to-r from-[#fcfcfb] via-[#f3f1ef] to-[#fcfcfb] border-b border-slate-700/18',
        border: 'border-slate-700/24',
        accentText: 'text-[#b4232c]',
        fpsBarColor: 'bg-gradient-to-r from-[#1f2937] via-[#64748b] to-[#b4232c]',
        savedBadge: 'bg-[#f1f2f2] text-[#374151] border border-slate-300',
        mutedText: 'text-slate-500',
        glowBg: 'bg-[#b4232c]',
        rowBg: 'bg-white',
        stampBorder: 'border-slate-800/38',
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
