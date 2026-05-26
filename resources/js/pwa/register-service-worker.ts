// Single service worker: firebase-messaging-sw.js at site root.
// Register only once to avoid "Service Worker already registered" and controllerchange loops.
const FIREBASE_MESSAGING_SW_URL = "/firebase-messaging-sw.js";
const SW_SCOPE = "/";

import { isLivestockDomain } from "../lib/livestock-domain";
import { isPushCapableBrowser } from "../lib/push-environment";

let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

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

    if (!isPushCapableBrowser()) {
        console.warn("[PWA] Push skipped: use https://, localhost, 127.0.0.1, or a .test domain");
        return Promise.resolve(null);
    }

    if (registrationPromise) {
        return registrationPromise;
    }

    const doRegister = async (): Promise<ServiceWorkerRegistration | null> => {
        try {
            const existing = await navigator.serviceWorker.getRegistration(SW_SCOPE);
            const activeUrl = existing?.active?.scriptURL ?? "";

            // A different SW (e.g. legacy /service-worker.js) has no pushManager — replace it.
            if (existing && activeUrl && !activeUrl.includes("firebase-messaging-sw")) {
                console.warn("[PWA] Replacing non-FCM service worker:", activeUrl);
                await existing.unregister();
                registrationPromise = null;
            } else if (existing?.active?.scriptURL?.includes("firebase-messaging-sw")) {
                return navigator.serviceWorker.ready;
            }

            await navigator.serviceWorker.register(FIREBASE_MESSAGING_SW_URL, {
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
