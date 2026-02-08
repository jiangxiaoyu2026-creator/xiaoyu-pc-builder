import { useState, useEffect } from 'react';

/**
 * Hook to detect if the viewport is mobile-sized (< 768px).
 * Uses matchMedia for efficient listening without constant resize events.
 */
export function useIsMobile(): boolean {
    const [isMobile, setIsMobile] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.innerWidth < 768;
    });

    useEffect(() => {
        const mediaQuery = window.matchMedia('(max-width: 767px)');

        const handleChange = (e: MediaQueryListEvent) => {
            setIsMobile(e.matches);
        };

        // Set initial state
        setIsMobile(mediaQuery.matches);

        // Modern browsers
        mediaQuery.addEventListener('change', handleChange);

        return () => {
            mediaQuery.removeEventListener('change', handleChange);
        };
    }, []);

    return isMobile;
}
