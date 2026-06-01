// Single service worker: firebase-messaging-sw.js at site root.
// Register only once to avoid "Service Worker already registered" and controllerchange loops.
const SW_SCOPE = "/";

import { isLivestockDomain } from "../lib/livestock-domain";
import { isServiceWorkerCapable } from "../lib/push-environment";
import { serviceWorkerScriptUrl } from "../lib/pwa-update";

let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

export function resetServiceWorkerRegistrationCache(): void {
    registrationPromise = null;
}

export async function unregisterServiceWorker(): Promise<void> {
    resetServiceWorkerRegistrationCache();
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
        return;
    }
    const existing = await navigator.serviceWorker.getRegistration(SW_SCOPE);
    if (existing) {
        await existing.unregister();
    }
}

export function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
        return Promise.resolve(null);
    }
    if (isLivestockDomain()) {
        return Promise.resolve(null);
    }
    if (!("serviceWorker" in navigator)) {
        return Promise.resolve(null);
    }

    if (!isServiceWorkerCapable()) {
        console.warn("[PWA] Service worker skipped: requires HTTPS, localhost, or a .test domain");
        return Promise.resolve(null);
    }

    if (registrationPromise) {
        return registrationPromise;
    }

    const swUrl = serviceWorkerScriptUrl();

    const doRegister = async (): Promise<ServiceWorkerRegistration | null> => {
        try {
            const existing = await navigator.serviceWorker.getRegistration(SW_SCOPE);
            const activeUrl = existing?.active?.scriptURL ?? "";

            // A different SW (e.g. legacy /service-worker.js) has no pushManager — replace it.
            if (existing && activeUrl && !activeUrl.includes("firebase-messaging-sw")) {
                console.warn("[PWA] Replacing non-FCM service worker:", activeUrl);
                await existing.unregister();
                resetServiceWorkerRegistrationCache();
            } else if (existing?.active?.scriptURL?.includes("firebase-messaging-sw")) {
                await existing.update().catch(console.error);
                return navigator.serviceWorker.ready;
            }

            await navigator.serviceWorker.register(swUrl, {
                scope: SW_SCOPE,
            });

            return navigator.serviceWorker.ready;
        } catch (err) {
            console.error("[PWA] Service worker registration failed:", err);
            return null;
        }
    };

    registrationPromise = doRegister();
    return registrationPromise;
}
