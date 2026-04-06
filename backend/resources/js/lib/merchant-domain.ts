/**
 * Get the merchant domain from config or environment
 */
export function getMerchantDomain(): string {
    // Try to get from Inertia props first (runtime)
    if (typeof window !== 'undefined') {
        const page = (window as any).__INERTIA_PROPS__;
        if (page?.merchantDomain) {
            return page.merchantDomain;
        }
    }

    // Fallback to Vite env variable (build-time)
    return import.meta.env.VITE_MERCHANT_DOMAIN || 'merchant.believeinunity.org';
}

/**
 * Check if current domain is the merchant domain
 */
export function isMerchantDomain(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    // First check: body class (set by app.tsx) - most reliable
    if (document.body.classList.contains('merchant-domain')) {
        return true;
    }

    const merchantDomain = getMerchantDomain();
    const currentHost = window.location.hostname;
    
    // Extract hostname from domain (remove protocol if present)
    const domainHost = merchantDomain.replace(/^https?:\/\//, '').split(':')[0].split('/')[0];
    
    // Check exact match or if hostname includes merchant subdomain
    const isExactMatch = currentHost === domainHost;
    const isSubdomainMatch = currentHost.includes(domainHost);
    
    // Also check if hostname starts with "merchant."
    const startsWithMerchant = currentHost.startsWith('merchant.');
    
    return isExactMatch || isSubdomainMatch || startsWithMerchant;
}

