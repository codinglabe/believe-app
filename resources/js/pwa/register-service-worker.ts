// Single service worker: firebase-messaging-sw.js at site root.
// Register only once to avoid "Service Worker already registered" and controllerchange loops.
const FIREBASE_MESSAGING_SW_URL = "/firebase-messaging-sw.js";
const SW_SCOPE = "/";

function isSecureContext() {
    if (typeof window === "undefined") return false;
    return window.isSecureContext || window.location.hostname === "localhost";
}

import { isLivestockDomain } from "../lib/livestock-domain";

let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

export function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> | void {
    if (typeof window === "undefined" || typeof navigator === "undefined") return;
    if (isLivestockDomain()) return;
    if (!("serviceWorker" in navigator)) return;

    const isLocalhost = ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
    const shouldRegister = import.meta.env.PROD || isLocalhost;
    if (!shouldRegister || !isSecureContext()) return;

    if (registrationPromise) return registrationPromise;

    const doRegister = async () => {
        try {
            const existing = await navigator.serviceWorker.getRegistration(SW_SCOPE);
            if (existing?.active?.scriptURL?.includes("firebase-messaging-sw")) {
                return existing;
            }
            return await navigator.serviceWorker.register(FIREBASE_MESSAGING_SW_URL, {
                scope: SW_SCOPE,
            });
        } catch (err) {
            console.error("[PWA] Service worker registration failed:", err);
            return null;
        }
    };

    registrationPromise = doRegister();
    return registrationPromise;
}
