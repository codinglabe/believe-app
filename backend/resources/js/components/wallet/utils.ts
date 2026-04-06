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
 * Refresh CSRF token by making a GET request
 */
export const refreshCsrfToken = async (): Promise<string> => {
    try {
        // Make a simple GET request to refresh the session and get CSRF token
        await fetch('/wallet/plans', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
            credentials: 'include',
            cache: 'no-store',
        })
        // Try to get token again after the request
        return getCsrfToken()
    } catch (e) {
        console.warn('Failed to refresh CSRF token:', e)
        return ''
    }
}

/**
 * Reusable fetch function with automatic CSRF token handling and retry logic
 * 
 * @param url - The URL to fetch
 * @param options - Fetch options (method, body, headers, etc.)
 * @param retryOnCsrfError - Whether to retry on CSRF errors (default: true)
 * @param maxRetries - Maximum number of retries (default: 1)
 * @returns Promise<Response>
 */
export interface FetchOptions extends RequestInit {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
    body?: BodyInit | object | null
    headers?: HeadersInit
    retryOnCsrfError?: boolean
    maxRetries?: number
}

export const walletFetch = async (
    url: string,
    options: FetchOptions = {},
    retryOnCsrfError: boolean = true,
    maxRetries: number = 1
): Promise<Response> => {
    const {
        method = 'GET',
        body,
        headers = {},
        retryOnCsrfError: optionRetryOnCsrf = retryOnCsrfError,
        maxRetries: optionMaxRetries = maxRetries,
        ...restOptions
    } = options

    // Get CSRF token
    let csrfToken = getCsrfToken()

    // If token is missing, try to refresh it
    if (!csrfToken && optionRetryOnCsrf) {
        csrfToken = await refreshCsrfToken()
    }

    // Prepare headers
    const defaultHeaders: HeadersInit = {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...(csrfToken && { 'X-CSRF-TOKEN': csrfToken }),
    }

    // Add Content-Type for requests with body
    if (body && method !== 'GET') {
        if (typeof body === 'object' && !(body instanceof FormData) && !(body instanceof Blob)) {
            defaultHeaders['Content-Type'] = 'application/json'
        }
    }

    // Merge with provided headers
    const mergedHeaders = {
        ...defaultHeaders,
        ...headers,
    }

    // Prepare body
    let requestBody: BodyInit | null = null
    if (body) {
        if (typeof body === 'object' && !(body instanceof FormData) && !(body instanceof Blob) && !(body instanceof ArrayBuffer)) {
            requestBody = JSON.stringify(body)
        } else {
            requestBody = body as BodyInit
        }
    }

    // Make the request
    const makeRequest = async (token: string): Promise<Response> => {
        const requestHeaders = {
            ...mergedHeaders,
            'X-CSRF-TOKEN': token,
        }

        return fetch(url, {
            method,
            headers: requestHeaders,
            body: requestBody,
            credentials: 'include',
            cache: 'no-store',
            ...restOptions,
        })
    }

    try {
        let response = await makeRequest(csrfToken)

        // Handle CSRF token mismatch with retry logic
        if (!response.ok && optionRetryOnCsrf && optionMaxRetries > 0) {
            const contentType = response.headers.get('content-type')
            if (contentType && contentType.includes('application/json')) {
                try {
                    const errorData = await response.clone().json()
                    const isCsrfError = response.status === 419 || 
                        errorData.message?.includes('CSRF') || 
                        errorData.message?.includes('419') ||
                        response.status === 403

                    if (isCsrfError) {
                        console.warn('CSRF token mismatch detected, refreshing token and retrying...')
                        
                        // Refresh token
                        const newToken = await refreshCsrfToken()
                        if (newToken) {
                            // Retry the request with fresh token
                            response = await makeRequest(newToken)
                        } else {
                            console.error('Failed to refresh CSRF token for retry')
                            // Return the original response instead of throwing
                            return response
                        }
                    }
                } catch (e) {
                    // If JSON parsing fails, check status code
                    if (response.status === 419 || response.status === 403) {
                        const newToken = await refreshCsrfToken()
                        if (newToken) {
                            response = await makeRequest(newToken)
                        }
                    }
                }
            } else {
                // For non-JSON responses, still check for CSRF errors
                if (response.status === 419 || response.status === 403) {
                    const newToken = await refreshCsrfToken()
                    if (newToken) {
                        response = await makeRequest(newToken)
                    }
                }
            }
        }

        return response
    } catch (error) {
        // If fetch itself fails (network error, etc.), re-throw it
        console.error('walletFetch network error:', error)
        throw error
    }
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

