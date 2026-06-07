// Firebase initialization for React/Inertia app
import { initializeApp, type FirebaseApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported, type Messaging } from "firebase/messaging";
import { isPushCapableBrowser } from "@/lib/push-environment";
import { registerServiceWorker } from "@/pwa/register-service-worker";

type FirebaseWebConfig = {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    vapidKey?: string | null;
};

const FALLBACK_CONFIG: FirebaseWebConfig = {
    apiKey: "AIzaSyD2t6nAHQzhfWWso5nqV0mClX7R-Q6HjlA",
    authDomain: "believe-in-unity-d8adc.firebaseapp.com",
    projectId: "believe-in-unity-d8adc",
    storageBucket: "believe-in-unity-d8adc.firebasestorage.app",
    messagingSenderId: "829146180648",
    appId: "1:829146180648:web:8ba15be8d65c2c54d5991d",
    vapidKey: "BJFh0nhZNQCWlgxQd_mxVma112zteSV2YBsbJeJ44Ils4Yz9V17FIiFV0ZfcEbMvR7m20T-EYt0jaVL1vBfF_eA",
};

function readFirebaseWebConfig(): FirebaseWebConfig {
    if (typeof window !== "undefined") {
        const inertiaCfg = (window as Window & { __FIREBASE_WEB__?: FirebaseWebConfig }).__FIREBASE_WEB__;
        if (inertiaCfg?.apiKey) {
            return { ...FALLBACK_CONFIG, ...inertiaCfg };
        }
    }

    const vapidMeta = typeof document !== "undefined"
        ? document.querySelector('meta[name="firebase-vapid-key"]')?.getAttribute("content")
        : null;

    return {
        ...FALLBACK_CONFIG,
        ...(vapidMeta ? { vapidKey: vapidMeta } : {}),
    };
}

let webConfig = readFirebaseWebConfig();
let app: FirebaseApp | null = null;

function firebaseApp(): FirebaseApp {
    if (!app) {
        app = initializeApp({
            apiKey: webConfig.apiKey,
            authDomain: webConfig.authDomain,
            projectId: webConfig.projectId,
            storageBucket: webConfig.storageBucket,
            messagingSenderId: webConfig.messagingSenderId,
            appId: webConfig.appId,
        });
    }
    return app;
}

/** Call once Inertia shared props are available (app bootstrap). */
export function applyFirebaseWebConfig(cfg: FirebaseWebConfig | null | undefined): void {
    if (!cfg?.apiKey) {
        return;
    }
    webConfig = { ...FALLBACK_CONFIG, ...cfg };
    (window as Window & { __FIREBASE_WEB__?: FirebaseWebConfig }).__FIREBASE_WEB__ = webConfig;
    messaging = null;
    messagingListenersAttached = false;
    messagingInitPromise = null;
    activeRegistration = null;
}

function vapidKey(): string {
    return (
        webConfig.vapidKey ||
        document.querySelector('meta[name="firebase-vapid-key"]')?.getAttribute("content") ||
        FALLBACK_CONFIG.vapidKey ||
        ""
    );
}

let messaging: Messaging | null = null;
let messagingListenersAttached = false;
let messagingInitPromise: Promise<ServiceWorkerRegistration | null> | null = null;
let activeRegistration: ServiceWorkerRegistration | null = null;

function registrationSupportsPush(registration: ServiceWorkerRegistration | null): boolean {
    return Boolean(registration?.active && registration.pushManager);
}

async function waitForServiceWorkerActive(
    registration: ServiceWorkerRegistration,
    timeoutMs = 12000,
): Promise<ServiceWorkerRegistration> {
    if (registration.active) {
        return registration;
    }

    const worker = registration.installing || registration.waiting;
    if (!worker) {
        return registration;
    }

    await new Promise<void>((resolve) => {
        const timer = window.setTimeout(resolve, timeoutMs);
        worker.addEventListener("statechange", () => {
            if (worker.state === "activated") {
                window.clearTimeout(timer);
                resolve();
            }
        });
    });

    return registration;
}

async function resolveServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
    await registerServiceWorker();

    const ready = await waitForServiceWorkerActive(await navigator.serviceWorker.ready);

    if (!registrationSupportsPush(ready)) {
        console.warn(
            "[Firebase] Service worker is active but pushManager is missing — unregister old workers and reload",
            ready.active?.scriptURL,
        );
        return null;
    }

    return ready;
}

function attachForegroundMessageListener(instance: Messaging) {
    if (messagingListenersAttached) {
        return;
    }
    messagingListenersAttached = true;

    onMessage(instance, (payload) => {
        const data = (payload.data ?? {}) as Record<string, string | undefined>;
        const title = payload.notification?.title ?? data.title;
        const body = payload.notification?.body ?? data.body ?? data.message;
        const detail = { title, body, data };

        if (data.type === "incoming_call") {
            void import("@/lib/unityCallEvents").then(({ buildIncomingCallFromPush, dispatchUnityCallIncoming }) => {
                void import("@/lib/swIncomingCallBridge").then(({ storePendingIncomingCall }) => {
                    storePendingIncomingCall(data)
                })
                const metaUserId = document.querySelector('meta[name="user-id"]')?.getAttribute("content");
                const userId = metaUserId ? Number(metaUserId) : NaN;
                if (Number.isFinite(userId) && userId > 0) {
                    const incoming = buildIncomingCallFromPush(data, userId);
                    if (incoming) {
                        dispatchUnityCallIncoming(incoming);
                        return;
                    }
                }
                void import("@/lib/firebase-push-toast").then(({ showNativePushNotification }) => {
                    void showNativePushNotification(detail);
                });
            });
            return;
        }

        // Foreground: native OS notification (same as background / device tray).
        void import("@/lib/firebase-push-toast").then(({ showNativePushNotification }) => {
            void showNativePushNotification(detail);
        });
    });
}

async function prepareServiceWorkerOnly(): Promise<ServiceWorkerRegistration | null> {
    const supported = await isSupported();
    if (!supported) {
        console.warn("[Firebase] Messaging not supported in this browser");
        return null;
    }

    const registration = await resolveServiceWorkerRegistration();
    if (!registrationSupportsPush(registration)) {
        console.warn("[Firebase] No push-capable service worker for messaging");
        return null;
    }

    activeRegistration = registration;

    return registration;
}

function attachMessagingInstance(registration: ServiceWorkerRegistration): void {
    const needsNewMessaging = !messaging || activeRegistration !== registration;
    if (!needsNewMessaging) {
        return;
    }

    messagingListenersAttached = false;
    messaging = getMessaging(firebaseApp());
    attachForegroundMessageListener(messaging);
}

/**
 * Wait for firebase-messaging-sw.js, then attach Firebase Messaging for foreground pushes.
 */
export async function ensureMessagingReady(): Promise<ServiceWorkerRegistration | null> {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
        return null;
    }

    if (!isPushCapableBrowser()) {
        console.warn(
            "[Firebase] Push not available on this URL. Use http://127.0.0.1:8000 or http://localhost:8000 (not a custom HTTP host).",
        );
        return null;
    }

    // Permission not granted yet: register SW only (do not cache — avoids stale init without onMessage).
    if (Notification.permission !== "granted") {
        try {
            return await prepareServiceWorkerOnly();
        } catch (error) {
            console.error("[Firebase] Service worker prep failed:", error);
            return null;
        }
    }

    // Permission granted but foreground listener missing (e.g. cached partial init) — re-init.
    if (messagingInitPromise && !messaging) {
        messagingInitPromise = null;
    }

    if (messagingInitPromise) {
        return messagingInitPromise;
    }

    messagingInitPromise = (async () => {
        try {
            const registration = await prepareServiceWorkerOnly();
            if (!registration) {
                return null;
            }

            attachMessagingInstance(registration);

            if (import.meta.env.DEV) {
                console.info("[Firebase] Foreground messaging listener active");
            }

            return registration;
        } catch (error) {
            console.error("[Firebase] Messaging init failed:", error);
            return null;
        }
    })();

    return messagingInitPromise;
}

/** Call after permission is granted and FCM token is saved so foreground toasts work. */
export async function activateForegroundMessaging(): Promise<void> {
    if (Notification.permission !== "granted") {
        return;
    }
    // Only reset if the messaging instance isn't already live - avoids a redundant
    // teardown/rebuild when called immediately after a successful syncPushTokenWithServer,
    // which eliminates the brief window where foreground pushes produce no toast.
    if (!messaging || !messagingListenersAttached) {
        resetMessagingRegistration();
    }
    await ensureMessagingReady();
}

/** @deprecated Use ensureMessagingReady() */
export const initializeMessaging = ensureMessagingReady;

/**
 * Obtain an FCM device token. Does not POST to the server — use syncPushTokenWithServer().
 */
export async function requestFcmToken(options?: { prompt?: boolean }): Promise<string | null> {
    if (Notification.permission === "denied") {
        console.warn("[Firebase] Notification permission denied");
        return null;
    }

    if (Notification.permission === "default") {
        if (!options?.prompt) {
            return null;
        }
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
            return null;
        }
        resetMessagingRegistration();
    }

    const registration = (await ensureMessagingReady()) ?? activeRegistration;
    if (!registration || !messaging || !registrationSupportsPush(registration)) {
        return null;
    }

    const key = vapidKey();
    if (!key) {
        console.error("[Firebase] Missing VAPID key (set FIREBASE_VAPID_KEY in .env)");
        return null;
    }

    try {
        const token = await getToken(messaging, {
            vapidKey: key,
            serviceWorkerRegistration: registration,
        });

        if (token) {
            console.info("[Firebase] FCM token obtained");
        }

        return token || null;
    } catch (error) {
        console.error("[Firebase] Error obtaining FCM token:", error);
        return null;
    }
}

/** @deprecated Use requestFcmToken() */
export const requestNotificationPermission = requestFcmToken;

/** Call after the service worker controller changes (e.g. after deploy). */
export function resetMessagingRegistration(): void {
    messagingInitPromise = null;
    messaging = null;
    messagingListenersAttached = false;
    activeRegistration = null;
}

export const getMessagingInstance = () => messaging;
export { firebaseApp as app };
