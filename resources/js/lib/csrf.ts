/** CSRF helpers for Laravel session + SPA fetch/axios. */

const META_SELECTOR = 'meta[name="csrf-token"]';

export function readXsrfCookieValue(): string {
    if (typeof document === 'undefined') {
        return '';
    }

    try {
        const cookies = document.cookie.split('; ');
        const xsrfCookie = cookies.find((row) => row.startsWith('XSRF-TOKEN='));
        if (!xsrfCookie) {
            return '';
        }

        const value = decodeURIComponent(xsrfCookie.split('=').slice(1).join('='));
        return value?.trim() || '';
    } catch {
        return '';
    }
}

export function updateCsrfMeta(token: string): void {
    if (typeof document === 'undefined' || !token) {
        return;
    }

    const meta = document.querySelector(META_SELECTOR);
    if (meta) {
        meta.setAttribute('content', token);
    } else {
        const newMeta = document.createElement('meta');
        newMeta.name = 'csrf-token';
        newMeta.content = token;
        document.head.appendChild(newMeta);
    }
}

/** Sync meta from XSRF-TOKEN cookie (readable when excluded from cookie encryption). */
export function syncCsrfMetaFromCookie(): string {
    const fromCookie = readXsrfCookieValue();
    if (fromCookie) {
        updateCsrfMeta(fromCookie);
    }

    return fromCookie;
}

/** Read CSRF token from cookie (preferred) or meta tag. */
export function getCsrfToken(): string {
    const fromCookie = syncCsrfMetaFromCookie();
    if (fromCookie) {
        return fromCookie;
    }

    if (typeof document === 'undefined') {
        return '';
    }

    return document.querySelector(META_SELECTOR)?.getAttribute('content')?.trim() || '';
}

/** Plain Laravel session CSRF tokens are short; encrypted cookie values are much longer. */
function isLikelyPlainCsrfToken(value: string): boolean {
    return value.length > 0 && value.length <= 80;
}

/**
 * Headers for Laravel CSRF verification.
 * When the cookie is present, use it instead of meta — stale meta blocks Laravel's X-XSRF-TOKEN fallback.
 */
export function buildCsrfHeaders(): Record<string, string> {
    const cookie = readXsrfCookieValue();
    if (cookie) {
        if (isLikelyPlainCsrfToken(cookie)) {
            return { 'X-CSRF-TOKEN': cookie };
        }

        return { 'X-XSRF-TOKEN': cookie };
    }

    const meta =
        typeof document !== 'undefined'
            ? document.querySelector(META_SELECTOR)?.getAttribute('content')?.trim()
            : '';

    if (meta) {
        return { 'X-CSRF-TOKEN': meta };
    }

    return {};
}

export function isCsrfMismatch(status: number, message?: string | null): boolean {
    if (status === 419) {
        return true;
    }

    if (!message) {
        return false;
    }

    const lower = message.toLowerCase();

    return lower.includes('csrf') || lower.includes('page expired') || lower.includes('session expired');
}

/** GET /csrf-cookie refreshes session CSRF and sets XSRF-TOKEN cookie. */
export async function refreshCsrfToken(): Promise<string> {
    if (typeof window === 'undefined') {
        return '';
    }

    try {
        const response = await fetch('/csrf-cookie', {
            method: 'GET',
            credentials: 'include',
            cache: 'no-store',
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
        });

        if (response.ok) {
            const data = (await response.json().catch(() => null)) as { token?: string } | null;
            if (data?.token) {
                updateCsrfMeta(data.token);
                return data.token;
            }
        }

        return syncCsrfMetaFromCookie() || getCsrfToken();
    } catch (e) {
        console.warn('Failed to refresh CSRF token:', e);
        return syncCsrfMetaFromCookie() || getCsrfToken();
    }
}

export interface CsrfFetchOptions extends RequestInit {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    body?: BodyInit | object | null;
    headers?: HeadersInit;
    retryOnCsrfError?: boolean;
    maxRetries?: number;
}

export async function csrfFetch(url: string, options: CsrfFetchOptions = {}): Promise<Response> {
    const {
        method = 'GET',
        body,
        headers = {},
        retryOnCsrfError = true,
        maxRetries = 1,
        ...restOptions
    } = options;

    let csrfHeaders = buildCsrfHeaders();
    if (!Object.keys(csrfHeaders).length && retryOnCsrfError) {
        await refreshCsrfToken();
        csrfHeaders = buildCsrfHeaders();
    }

    const defaultHeaders: Record<string, string> = {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...csrfHeaders,
    };

    if (body && method !== 'GET') {
        if (typeof body === 'object' && !(body instanceof FormData) && !(body instanceof Blob)) {
            defaultHeaders['Content-Type'] = 'application/json';
        }
    }

    const mergedHeaders = { ...defaultHeaders, ...headers };

    let requestBody: BodyInit | null = null;
    if (body) {
        if (
            typeof body === 'object' &&
            !(body instanceof FormData) &&
            !(body instanceof Blob) &&
            !(body instanceof ArrayBuffer)
        ) {
            requestBody = JSON.stringify(body);
        } else {
            requestBody = body as BodyInit;
        }
    }

    const makeRequest = (hdrs: Record<string, string>) =>
        fetch(url, {
            method,
            headers: { ...mergedHeaders, ...hdrs },
            body: requestBody,
            credentials: 'include',
            cache: 'no-store',
            ...restOptions,
        });

    let response = await makeRequest(csrfHeaders);

    if (!response.ok && retryOnCsrfError && maxRetries > 0) {
        let isCsrfError = response.status === 419 || response.status === 403;

        if (response.headers.get('content-type')?.includes('application/json')) {
            try {
                const errorData = await response.clone().json();
                isCsrfError =
                    isCsrfError ||
                    isCsrfMismatch(
                        response.status,
                        typeof errorData.message === 'string' ? errorData.message : null,
                    );
            } catch {
                // keep status-based detection
            }
        }

        if (isCsrfError) {
            const newToken = await refreshCsrfToken();
            if (newToken) {
                response = await makeRequest({ 'X-CSRF-TOKEN': newToken });
            }
        }
    }

    return response;
}

/** Attach CSRF + session cookies to an axios instance (chat, wallet, etc.). */
export function attachCsrfToAxios(api: import('axios').AxiosInstance): void {
    api.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
    api.defaults.withCredentials = true;

    api.interceptors.request.use((config) => {
        const csrfHeaders = buildCsrfHeaders();
        for (const [key, value] of Object.entries(csrfHeaders)) {
            config.headers.set(key, value);
        }

        return config;
    });

    api.interceptors.response.use(
        (response) => response,
        async (error) => {
            const status = error.response?.status;
            const originalRequest = error.config as import('axios').InternalAxiosRequestConfig & {
                _csrfRetried?: boolean;
            };

            if (status === 419 && originalRequest && !originalRequest._csrfRetried) {
                originalRequest._csrfRetried = true;
                const newToken = await refreshCsrfToken();
                if (newToken) {
                    originalRequest.headers.set('X-CSRF-TOKEN', newToken);
                    return api.request(originalRequest);
                }
            }

            if (status === 419) {
                window.location.reload();
            }

            if (status === 401) {
                window.location.href = '/login';
            }

            return Promise.reject(error);
        },
    );
}
