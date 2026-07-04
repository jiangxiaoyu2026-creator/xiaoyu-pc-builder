import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { storage } from '../services/storage';

const VISITOR_KEY = 'xiaoyu_visit_visitor_id';
const SESSION_KEY = 'xiaoyu_visit_session_id';

let lastTrackedPath = '';
let lastTrackedAt = 0;

function createId(prefix: string) {
    const randomPart = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
    return `${prefix}_${randomPart}`;
}

function getStorageId(storageArea: Storage, key: string, prefix: string) {
    try {
        let value = storageArea.getItem(key);
        if (!value) {
            value = createId(prefix);
            storageArea.setItem(key, value);
        }
        return value;
    } catch {
        return createId(prefix);
    }
}

function getDeviceType() {
    if (typeof navigator === 'undefined') return 'desktop';
    const ua = navigator.userAgent.toLowerCase();
    if (/ipad|tablet/.test(ua)) return 'tablet';
    if (/mobile|android|iphone|ipod/.test(ua)) return 'mobile';
    return 'desktop';
}

export function useVisitTracker() {
    const location = useLocation();

    useEffect(() => {
        const path = `${location.pathname}${location.search}`;
        if (path.toLowerCase().startsWith('/admin')) return;
        if (path.toLowerCase().startsWith('/pc3d')) return;

        const now = Date.now();
        if (lastTrackedPath === path && now - lastTrackedAt < 2000) return;
        lastTrackedPath = path;
        lastTrackedAt = now;

        const visitorId = getStorageId(localStorage, VISITOR_KEY, 'visitor');
        const sessionId = getStorageId(sessionStorage, SESSION_KEY, 'session');

        storage.logVisit({
            visitorId,
            sessionId,
            path,
            referrer: document.referrer,
            device: getDeviceType(),
            userAgent: navigator.userAgent,
        }).catch((error) => {
            console.error('Failed to log visit:', error);
        });
    }, [location.pathname, location.search]);
}
