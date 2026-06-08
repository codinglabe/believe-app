// Utility functions for wallet components

import {
    csrfFetch,
    getCsrfToken,
    isCsrfMismatch,
    refreshCsrfToken,
    syncCsrfMetaFromCookie,
    type CsrfFetchOptions,
} from '@/lib/csrf';

export {
    getCsrfToken,
    isCsrfMismatch,
    refreshCsrfToken,
    syncCsrfMetaFromCookie,
};

export type FetchOptions = CsrfFetchOptions;

/** Wallet API fetch with automatic CSRF handling and retry on 419. */
export const walletFetch = (url: string, options: FetchOptions = {}): Promise<Response> =>
    csrfFetch(url, options);

/**
 * Format address for display (truncate if too long)
 */
export const formatAddress = (address: string, maxLength: number = 20): string => {
    if (!address) return ''
    if (address.length <= maxLength) return address
    return `${address.slice(0, maxLength)}...`
}

/**
 * Format currency amount
 */
export const formatCurrency = (amount: number | null, decimals: number = 2): string => {
    if (amount === null) return '0.00'
    return amount.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    })
}

/**
 * Format date for display
 */
export const formatDate = (dateString: string): string => {
    try {
        const date = new Date(dateString)
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    } catch (e) {
        return dateString
    }
}
