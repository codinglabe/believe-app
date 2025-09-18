/**
 * Timezone detection utilities
 */

/**
 * Get browser timezone
 */
export function getBrowserTimezone(): string {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (error) {
        console.warn('Failed to detect browser timezone:', error);
        return 'UTC';
    }
}

/**
 * Get timezone offset in minutes
 */
export function getTimezoneOffset(): number {
    return new Date().getTimezoneOffset();
}

/**
 * Get timezone info object
 */
export function getTimezoneInfo() {
    const timezone = getBrowserTimezone();
    const offset = getTimezoneOffset();
    
    return {
        timezone,
        offset,
        offsetHours: Math.abs(offset) / 60,
        offsetSign: offset <= 0 ? '+' : '-',
        offsetString: `${offset <= 0 ? '+' : '-'}${Math.abs(offset) / 60}`,
    };
}

/**
 * Set timezone header for requests
 */
export function setTimezoneHeader() {
    const timezone = getBrowserTimezone();
    
    // Set default header for all requests
    if (typeof window !== 'undefined' && window.axios) {
        window.axios.defaults.headers.common['X-Timezone'] = timezone;
    }
    
    // Also set for fetch requests
    if (typeof window !== 'undefined') {
        const originalFetch = window.fetch;
        window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
            const headers = new Headers(init?.headers);
            headers.set('X-Timezone', timezone);
            
            return originalFetch(input, {
                ...init,
                headers,
            });
        };
    }
}

/**
 * Format date in user's timezone
 */
export function formatDateInTimezone(date: string | Date, timezone?: string): string {
    try {
        const timezoneToUse = timezone || getBrowserTimezone();
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        
        return new Intl.DateTimeFormat('en-US', {
            timeZone: timezoneToUse,
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        }).format(dateObj);
    } catch (error) {
        console.warn('Failed to format date in timezone:', error);
        return date instanceof Date ? date.toLocaleString() : new Date(date).toLocaleString();
    }
}

/**
 * Convert UTC date to user's timezone
 */
export function convertUTCToUserTimezone(utcDate: string | Date, timezone?: string): Date {
    try {
        const timezoneToUse = timezone || getBrowserTimezone();
        const dateObj = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
        
        // The date is already in UTC, just return it as the browser will display it in local timezone
        return dateObj;
    } catch (error) {
        console.warn('Failed to convert UTC to user timezone:', error);
        return typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
    }
}

/**
 * Convert user's timezone date to UTC
 */
export function convertUserTimezoneToUTC(userDate: string | Date, timezone?: string): Date {
    try {
        // The input date is already in the user's local timezone
        // JavaScript Date objects are always in local timezone
        // We need to convert it to UTC by adjusting for the timezone offset
        
        const dateObj = typeof userDate === 'string' ? new Date(userDate) : userDate;
        
        // Get the timezone offset in minutes (positive means behind UTC, negative means ahead)
        const timezoneOffset = dateObj.getTimezoneOffset();
        
        // Convert to UTC by adding the offset (since getTimezoneOffset returns the opposite)
        const utcTime = dateObj.getTime() + (timezoneOffset * 60000);
        
        return new Date(utcTime);
    } catch (error) {
        console.warn('Failed to convert user timezone to UTC:', error);
        return typeof userDate === 'string' ? new Date(userDate) : userDate;
    }
}

/**
 * Initialize timezone detection
 */
export function initializeTimezoneDetection() {
    // Set timezone header for all requests
    setTimezoneHeader();
    
    // Log timezone info for debugging
    const timezoneInfo = getTimezoneInfo();
    console.log('Timezone detected:', timezoneInfo);
    
    return timezoneInfo;
}

// Auto-initialize when module is loaded
if (typeof window !== 'undefined') {
    initializeTimezoneDetection();
}
