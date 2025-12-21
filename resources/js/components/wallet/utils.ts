// Utility functions for wallet components

/**
 * Helper function to get CSRF token with multiple fallbacks
 */
export const getCsrfToken = (): string => {
    // Method 1: From meta tag (most common and reliable)
    try {
        const metaToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
        if (metaToken && metaToken.trim()) return metaToken.trim()
    } catch (e) {
        console.warn('Failed to get CSRF token from meta tag:', e)
    }
    
    // Method 2: From cookie (XSRF-TOKEN) - Laravel stores it as XSRF-TOKEN
    try {
        const cookies = document.cookie.split('; ')
        const xsrfCookie = cookies.find(row => row.startsWith('XSRF-TOKEN='))
        if (xsrfCookie) {
            const cookieToken = decodeURIComponent(xsrfCookie.split('=')[1])
            if (cookieToken && cookieToken.trim()) return cookieToken.trim()
        }
    } catch (e) {
        console.warn('Failed to get CSRF token from cookie:', e)
    }
    
    // Method 3: Try alternative cookie name (some configurations use csrf_token)
    try {
        const cookies = document.cookie.split('; ')
        const csrfCookie = cookies.find(row => row.startsWith('csrf_token='))
        if (csrfCookie) {
            const cookieToken = decodeURIComponent(csrfCookie.split('=')[1])
            if (cookieToken && cookieToken.trim()) return cookieToken.trim()
        }
    } catch (e) {
        console.warn('Failed to get CSRF token from alternative cookie:', e)
    }
    
    console.error('CSRF token not found. Please refresh the page.')
    return ''
}

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

