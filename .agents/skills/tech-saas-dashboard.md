# Tech/SaaS Dashboard Design Skill

## Core Philosophy
Transform consumer-grade or playful interfaces into professional, high-density, premium SaaS/Tech dashboards. This design language emphasizes data density, clarity, precision, and professional aesthetics.

## Key Aesthetics
- **Color Palette**: 
  - Structural elements: Clean whites (`bg-white`), subtle slates (`bg-slate-50`), dark modes (`dark:bg-slate-900`).
  - Accents: Professional Indigo (`text-indigo-600`, `bg-indigo-50`), subtle Emeralds for success, Ambers for warnings.
- **Typography**: 
  - Sans-serif for UI elements (`font-medium`, `font-semibold`).
  - Mono-spaced fonts for numbers and prices (`font-mono tracking-tight`).
  - Small, uppercase, wide-tracked labels for metadata (`text-[10px] uppercase tracking-widest font-bold text-slate-500`).
- **Borders & Radii**: 
  - Crisp, thin borders: `border border-slate-200 dark:border-slate-800`.
  - Moderate border radius: `rounded-lg` or `rounded-xl`. Avoid excessive rounding (`rounded-[32px]` -> `rounded-xl`).
- **Shadows & Glows**: 
  - Remove large, colorful blurred background shapes (`blur-3xl`).
  - Use subtle drop shadows (`shadow-sm`, `shadow-md`) instead of massive colored shadows.
- **Micro-interactions**: 
  - Fast hover states (`transition-all duration-200`).
  - Subtle border color changes (`hover:border-indigo-400`).
  - Slight elevation on cards (`hover:-translate-y-0.5`).
- **Data Density**: 
  - Compact padding (`p-4` or `p-5`).
  - Grid-based structural alignments.

## Application Rules
1. Replace all massive rounded corners with `rounded-xl` or `rounded-2xl`.
2. Replace intense gradients and blurs with solid backgrounds and thin borders.
3. Make typography more professional (smaller sizes, semibold weights, slate-500 for secondary text).
4. Organize data into strict grid or list layouts with clear visual separation.
