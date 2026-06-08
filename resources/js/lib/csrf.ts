/**
 * Laravel CSRF for fetch/axios.
 *
 * X-CSRF-TOKEN must be the plain session token (meta / Inertia csrf_token).
 * The XSRF-TOKEN cookie is excluded from encryption in bootstrap/app.php so JS can read it as a fallback.
 * Do not send the encrypted cookie value as X-CSRF-TOKEN — Laravel only decrypts that via X-XSRF-TOKEN.
 */

export function getCsrfTokenFromMeta(): string {
    if (typeof document === "undefined") {
        return "";
    }
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute("content")?.trim() || "";
}

export function getXsrfTokenFromCookie(): string {
    if (typeof document === "undefined") {
        return "";
    }
    try {
        const row = document.cookie.split("; ").find((c) => c.startsWith("XSRF-TOKEN="));
        if (!row) {
            return "";
        }
        return decodeURIComponent(row.slice("XSRF-TOKEN=".length)).trim();
    } catch {
        return "";
    }
}

/** Plain token for X-CSRF-TOKEN — meta first, then unencrypted XSRF-TOKEN cookie. */
export function getCsrfToken(): string {
    const meta = getCsrfTokenFromMeta();
    if (meta) {
        return meta;
    }
    return getXsrfTokenFromCookie();
}

/** Keep meta aligned with the session cookie when meta is missing or stale. */
export function syncCsrfMetaFromCookie(): string {
    const cookie = getXsrfTokenFromCookie();
    if (!cookie || typeof document === "undefined") {
        return "";
    }
    const meta = document.querySelector('meta[name="csrf-token"]');
    if (meta) {
        meta.setAttribute("content", cookie);
    }
    return cookie;
}

/** Headers to attach on same-origin POST/DELETE (fetch or axios). */
export function getCsrfHeaders(): Record<string, string> {
    const token = getCsrfToken();
    if (!token) {
        return {};
    }
    return { "X-CSRF-TOKEN": token };
}

/** Attach CSRF + session cookies to an axios instance (chat, wallet, etc.). */
export function attachCsrfToAxios(api: import("axios").AxiosInstance): void {
    api.defaults.headers.common["X-Requested-With"] = "XMLHttpRequest";
    api.defaults.withCredentials = true;

    api.interceptors.request.use((config) => {
        const headers = getCsrfHeaders();
        for (const [key, value] of Object.entries(headers)) {
            config.headers.set(key, value);
        }
        return config;
    });

    api.interceptors.response.use(
        (response) => response,
        (error) => {
            if (error.response?.status === 419) {
                syncCsrfMetaFromCookie();
            }
            if (error.response?.status === 401) {
                window.location.href = "/login";
            }
            return Promise.reject(error);
        },
    );
}
