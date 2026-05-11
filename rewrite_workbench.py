import re

with open('src/components/client/StreamerWorkbench.tsx', 'r') as f:
    content = f.read()

# 1. Imports
imports_old = """import React, { useState, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate as fmAnimate } from 'framer-motion';
import { Zap, X, Sparkles, Trash2, ChevronDown, Save, RefreshCw, Share2, Download, Monitor, TrendingUp, Recycle, Crown, MonitorPlay, BarChart3, Clock, Activity, Gamepad2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { BuildEntry, HardwareItem } from '../../types/clientTypes';
import { CATEGORY_MAP } from '../../data/clientData';
import { storage } from '../../services/storage';
import { aiBuilder, AIBuildResult } from '../../services/aiBuilder';
import { getIconByCategory } from './Shared';
import { AiGenerateModal } from './AiGenerateModal';
import { ChatSettingsModal } from '../admin/ChatSettingsModal';
import PriceTrendChart from '../admin/PriceTrendChart';
import StreamerRecycleTab from './StreamerRecycleTab';
import HardwareLeaderboard from './HardwareLeaderboard';
import { ThemeColor, THEMES, ThemeContext } from './StreamerThemeContext';
import { gamesFpsData, gamesList, Resolution } from '../../data/gameFpsData';"""

imports_new = """import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X, Sparkles, Trash2, ChevronDown, Save, RefreshCw, Share2, Download, TrendingUp, Recycle } from 'lucide-react';
import { BuildEntry } from '../../types/clientTypes';
import { CATEGORY_MAP } from '../../data/clientData';
import { storage } from '../../services/storage';
import { aiBuilder, AIBuildResult } from '../../services/aiBuilder';
import { getIconByCategory } from './Shared';
import { AiGenerateModal } from './AiGenerateModal';
import { ChatSettingsModal } from '../admin/ChatSettingsModal';
import PriceTrendChart from '../admin/PriceTrendChart';
import StreamerRecycleTab from './StreamerRecycleTab';
import HardwareLeaderboard from './HardwareLeaderboard';
import { ThemeColor, THEMES, ThemeContext } from './StreamerThemeContext';
import { StreamerRow, StreamerRowHandle } from './StreamerRow';
import { StreamerPerformanceSidebar } from './StreamerPerformanceSidebar';
import { StreamerPosterTemplate } from './StreamerPosterTemplate';
import { StreamerPermissionWall } from './StreamerPermissionWall';"""

if imports_old in content:
    content = content.replace(imports_old, imports_new)
else:
    print("Warning: Imports replace failed")

# 2. Extract out components
# From `// Bouncy number animation component` to `// Helper for sound effect (simulated ticker)`
comp_pattern = re.compile(r'// Bouncy number animation component.*?// Helper for sound effect \(simulated ticker\)', re.DOTALL)
content = comp_pattern.sub('// Components extracted to StreamerRow.tsx and StreamerPerformanceSidebar.tsx\n\n// Helper for sound effect (simulated ticker)', content)

# 3. Remove simResult and fps data logic
sim_pattern = re.compile(r'// === Performance Sidebar State ===.*?}, \[cpuItem, gpuItem, sidebarResolution\]\);\n', re.DOTALL)
content = sim_pattern.sub('', content)

# 4. Update html2canvas import inside handleGeneratePoster
poster_old = """    const handleGeneratePoster = async () => {
        if (!posterRef.current || isGeneratingPoster) return;
        setIsGeneratingPoster(true);
        try {
            posterRef.current.style.display = 'block';
            await new Promise(resolve => setTimeout(resolve, 100)); // allow DOM refresh
            const canvas = await html2canvas(posterRef.current, {"""

poster_new = """    const handleGeneratePoster = async () => {
        if (!posterRef.current || isGeneratingPoster) return;
        setIsGeneratingPoster(true);
        try {
            posterRef.current.style.display = 'block';
            await new Promise(resolve => setTimeout(resolve, 100)); // allow DOM refresh
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(posterRef.current, {"""

if poster_old in content:
    content = content.replace(poster_old, poster_new)
else:
    print("Warning: html2canvas replace failed")

# 5. Poster Template JSX
poster_jsx_pattern = re.compile(r'{/\* Hidden Poster Template \*/}.*?{/\* Permission Overlay \*/}', re.DOTALL)
poster_jsx_new = """{/* Hidden Poster Template */}
            <StreamerPosterTemplate 
                ref={posterRef}
                validPosterItems={validPosterItems}
                pricingStrategy={pricingStrategy}
                pricing={pricing}
            />

            {/* Permission Overlay */}"""
content = poster_jsx_pattern.sub(poster_jsx_new, content)

# 6. Permission Overlay JSX
perm_jsx_pattern = re.compile(r'{/\* Permission Overlay \*/}\n\s*\{!hasPermission && \(\n\s*<div className="fixed inset-0.*?</div>\n\s*</div>\n\s*\)}', re.DOTALL)
perm_jsx_new = """{/* Permission Overlay */}
            {!hasPermission && <StreamerPermissionWall />}"""
content = perm_jsx_pattern.sub(perm_jsx_new, content)

# 7. Sidebar JSX
sidebar_jsx_pattern = re.compile(r'{/\* === Right: Performance Sidebar === \*/}\n\s*<div className="hidden xl:flex flex-col gap-4 w-\[280px\].*?</div>\n\s*</div>\n\s*</div>\n\s*</>', re.DOTALL)
sidebar_jsx_new = """{/* === Right: Performance Sidebar === */}
                    <StreamerPerformanceSidebar buildList={buildList} />
                    </div>
                </>"""
content = sidebar_jsx_pattern.sub(sidebar_jsx_new, content)


with open('src/components/client/StreamerWorkbench.tsx', 'w') as f:
    f.write(content)

print("Done replacing.")
