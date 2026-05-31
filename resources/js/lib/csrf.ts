/** Read CSRF token from meta (kept in sync by CsrfTokenSync + Inertia router.on('success')). */
export function getCsrfToken(): string {
    if (typeof document === "undefined") {
        return "";
    }
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "";
}

/** Attach CSRF + session cookies to an axios instance (chat, wallet, etc.). */
export function attachCsrfToAxios(api: import("axios").AxiosInstance): void {
    api.defaults.headers.common["X-Requested-With"] = "XMLHttpRequest";
    api.defaults.withCredentials = true;

    api.interceptors.request.use((config) => {
        config.headers.set("X-CSRF-TOKEN", getCsrfToken());
        return config;
    });

    api.interceptors.response.use(
        (response) => response,
        (error) => {
            if (error.response?.status === 419) {
                window.location.reload();
            }
            if (error.response?.status === 401) {
                window.location.href = "/login";
            }
            return Promise.reject(error);
        },
    );
}
