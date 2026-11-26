import { useEffect } from 'react';

const SITE_URL = 'https://diyxx.com';
const DEFAULT_IMAGE = `${SITE_URL}/og-image.jpg`;

interface SeoProps {
    title: string;
    description: string;
    canonicalPath: string;
    image?: string;
    noIndex?: boolean;
}

function absoluteUrl(value: string) {
    if (/^https?:\/\//i.test(value)) return value;
    return `${SITE_URL}${value.startsWith('/') ? value : `/${value}`}`;
}

function setMeta(attribute: 'name' | 'property', key: string, content: string) {
    let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
    if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, key);
        document.head.appendChild(element);
    }
    element.content = content;
}

export default function Seo({
    title,
    description,
    canonicalPath,
    image = DEFAULT_IMAGE,
    noIndex = false,
}: SeoProps) {
    useEffect(() => {
        const canonicalUrl = absoluteUrl(canonicalPath);
        const imageUrl = absoluteUrl(image);

        document.title = title;
        setMeta('name', 'description', description);
        setMeta('name', 'robots', noIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large');
        setMeta('property', 'og:title', title);
        setMeta('property', 'og:description', description);
        setMeta('property', 'og:type', 'website');
        setMeta('property', 'og:url', canonicalUrl);
        setMeta('property', 'og:image', imageUrl);
        setMeta('property', 'og:site_name', '蒋小鱼装机平台');
        setMeta('property', 'og:locale', 'zh_CN');
        setMeta('name', 'twitter:card', 'summary_large_image');
        setMeta('name', 'twitter:title', title);
        setMeta('name', 'twitter:description', description);
        setMeta('name', 'twitter:image', imageUrl);

        let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
        if (!canonical) {
            canonical = document.createElement('link');
            canonical.rel = 'canonical';
            document.head.appendChild(canonical);
        }
        canonical.href = canonicalUrl;

    }, [canonicalPath, description, image, noIndex, title]);

    return null;
}
