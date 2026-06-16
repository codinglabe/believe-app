/** True when this browser context can register FCM (HTTPS, localhost, or common local dev hosts). */
export function isPushCapableBrowser(): boolean {
    if (typeof window === "undefined") {
        return false;
    }
    if (!("serviceWorker" in navigator) || !("Notification" in window)) {
        return false;
    }

    return isServiceWorkerCapable();
}

/** True when a service worker can be registered (PWA updates + push). */
export function isServiceWorkerCapable(): boolean {
    if (typeof window === "undefined") {
        return false;
    }
    if (!("serviceWorker" in navigator)) {
        return false;
    }

    const host = window.location.hostname;

    if (window.isSecureContext) {
        return true;
    }

    if (["localhost", "127.0.0.1", "[::1]"].includes(host)) {
        return true;
    }

    if (host.endsWith(".test") || host.endsWith(".localhost")) {
        return true;
    }

    return false;
}

export function shouldAutoPromptForPushPermission(): boolean {
    if (typeof window === "undefined" || Notification.permission !== "default") {
        return false;
    }
    if (import.meta.env.DEV || isPushCapableBrowser()) {
        return true;
    }
    // Mobile browsers (especially installed PWA) need an explicit permission prompt.
    return isMobilePushClient();
}

/** Persist installed-PWA marker for server-side mobile routing on the next request. */
export function ensureMobilePwaCookie(): void {
    if (typeof document === "undefined" || !isMobilePushClient()) {
        return;
    }

    const userAgent = navigator.userAgent;
    const isPhoneUserAgent = /iPhone|iPod|Android.*Mobile|Mobile.*Android/i.test(userAgent);
    const isStandalonePwa =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (!isPhoneUserAgent && !isStandalonePwa) {
        return;
    }

    document.cookie = "biu_pwa_standalone=1; path=/; max-age=31536000; SameSite=Lax";
}

/** True on phone/tablet browsers where push is expected (Android Chrome, iOS installed PWA). */
export function isMobilePushClient(): boolean {
    if (typeof window === "undefined") {
        return false;
    }
    const ua = navigator.userAgent;
    const isMobileUa = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
    const isStandalonePwa =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true;

    return isMobileUa || isStandalonePwa;
}

export async function logPushDiagnostics(): Promise<void> {
    if (!import.meta.env.DEV) {
        return;
    }

    const reg = await navigator.serviceWorker?.getRegistration("/");
    console.info("[Push diagnostics]", {
        href: window.location.href,
        isSecureContext: window.isSecureContext,
        isPushCapableBrowser: isPushCapableBrowser(),
        notificationPermission: Notification.permission,
        serviceWorker: reg?.active?.scriptURL ?? "none",
        vapidMeta: document.querySelector('meta[name="firebase-vapid-key"]')?.getAttribute("content")?.slice(0, 12) + "…",
    });
}
