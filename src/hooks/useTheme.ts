import { useState, useEffect } from 'react';

type Theme = 'light' | 'dark' | 'system';

export function useTheme() {
    const [theme, setTheme] = useState<Theme>(() => {
        if (typeof window !== 'undefined') {
            const savedTheme = localStorage.getItem('xiaoyu-theme') as Theme;
            if (savedTheme) return savedTheme;
        }
        return 'system';
    });

    useEffect(() => {
        const root = window.document.documentElement;
        
        const applyTheme = (currentTheme: Theme) => {
            root.classList.remove('light', 'dark');
            
            if (currentTheme === 'system') {
                const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (systemPrefersDark) {
                    root.classList.add('dark');
                } else {
                    root.classList.add('light'); // Although light is default, we can add it for explicitly
                }
            } else {
                root.classList.add(currentTheme);
            }
        };

        applyTheme(theme);
        localStorage.setItem('xiaoyu-theme', theme);

        // Listen for system changes if set to system
        if (theme === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handleChange = () => applyTheme('system');
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }
    }, [theme]);

    return { theme, setTheme };
}
