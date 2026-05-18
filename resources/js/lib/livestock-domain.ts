/**
 * Get the livestock domain from Inertia shared props or environment
 */
export function getLivestockDomain(): string {
    // Try to get from Inertia props first (runtime)
    if (typeof window !== 'undefined') {
        const page = (window as any).__INERTIA_PROPS__;
        if (page?.livestockDomain) {
            return page.livestockDomain;
        }
    }

    // Fallback to Vite env variable (build-time)
    return import.meta.env.VITE_LIVESTOCK_DOMAIN || 'bidalivestock.test';
}

/**
 * Check if current domain is the livestock domain
 */
export function isLivestockDomain(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    const livestockDomain = getLivestockDomain();
    const currentHost = window.location.hostname;
    
    // Extract hostname from domain (remove protocol if present)
    const domainHost = livestockDomain.replace(/^https?:\/\//, '').split(':')[0].split('/')[0];
    
    return currentHost === domainHost || currentHost.includes(domainHost);
}

