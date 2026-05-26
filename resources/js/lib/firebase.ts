// Firebase initialization for React/Inertia app
import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import { registerServiceWorker } from "@/pwa/register-service-worker";
import axios from "axios";

const firebaseConfig = {
    apiKey: "AIzaSyBRd7Jf0kxrlCRFa9zYtwtubiPbPDohVmA",
    authDomain: "c3ers-c6fbe.firebaseapp.com",
    projectId: "c3ers-c6fbe",
    storageBucket: "c3ers-c6fbe.firebasestorage.app",
    messagingSenderId: "554135699251",
    appId: "1:554135699251:web:5a34568d2f0cde065ac846",
};

const app = initializeApp(firebaseConfig);
let messaging: ReturnType<typeof getMessaging> | null = null;
let messagingInitPromise: Promise<ServiceWorkerRegistration | null> | null = null;
let foregroundHandlerAttached = false;

const VAPID_KEY =
    "BC_RUtntF6QVwsng1uiwnd6qHozF8Q8y_P4qG0G1BrgtAK5GKQr4_J8k2509yhssNFB7ZqgqrzHN_frrOVcN-2I";

async function waitForServiceWorker(maxMs = 10000): Promise<ServiceWorkerRegistration | null> {
    registerServiceWorker();
    const deadline = Date.now() + maxMs;
    while (Date.now() < deadline) {
        const registration = await navigator.serviceWorker.getRegistration("/");
        if (registration?.active) {
            return registration;
        }
        await new Promise((r) => setTimeout(r, 200));
    }
    return navigator.serviceWorker.getRegistration("/");
}

/**
 * Initialize Firebase Messaging only if the browser supports it.
 * Waits for firebase-messaging-sw.js registration when needed.
 */
export const initializeMessaging = async () => {
    if (messagingInitPromise) {
        return messagingInitPromise;
    }

    messagingInitPromise = (async () => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
        return null;
    }
    try {
        const supported = await isSupported();
        if (!supported) {
            return null;
        }
        let registration = await navigator.serviceWorker.getRegistration("/");
        if (!registration?.active) {
            registration = await waitForServiceWorker();
        }
        if (!registration) {
            return null;
        }
        if (!messaging) {
            messaging = getMessaging(app);
        }

        if (!foregroundHandlerAttached) {
            foregroundHandlerAttached = true;
            onMessage(messaging, (payload) => {
                window.dispatchEvent(
                    new CustomEvent("firebase-notification", {
                        detail: {
                            title: payload.notification?.title,
                            body: payload.notification?.body,
                            data: payload.data,
                        },
                    })
                );
                if (Notification.permission === "granted") {
                    new Notification(payload.notification?.title || "Notification", {
                        body: payload.notification?.body,
                        icon: payload.notification?.icon || "/favicon-96x96.png",
                        badge: payload.notification?.badge || "/favicon-96x96.png",
                        tag: payload.data?.content_item_id || "notification",
                    });
                }
            });
        }

        return registration;
    } catch (error) {
        console.error("[Firebase] Messaging init failed:", error);
        messagingInitPromise = null;
        return null;
    }
    })();

    return messagingInitPromise;
};

const NOTIFICATION_ASKED_KEY = "notification_permission_asked";

export const requestNotificationPermission = async (): Promise<string | null> => {
    if (typeof window === "undefined") return null;
    try {
        await initializeMessaging();
        if (!messaging) return null;

        // Only show the browser prompt once per session when permission is "default"
        // to avoid repeated "Allow notifications?" prompts (e.g. in Edge).
        if (Notification.permission === "default") {
            if (sessionStorage.getItem(NOTIFICATION_ASKED_KEY) === "1") return null;
        }
        const permission = await Notification.requestPermission();
        if (Notification.permission === "default" || Notification.permission === "denied") {
            sessionStorage.setItem(NOTIFICATION_ASKED_KEY, "1");
        }
        if (permission !== "granted") return null;
        const token = await getToken(messaging, { vapidKey: VAPID_KEY });
        return token;
    } catch (error) {
        console.error("[Firebase] Error requesting permission:", error);
        return null;
    }
};

function getDeviceInfo() {
    const nav = navigator as Navigator & { userAgentData?: { brands?: Array<{ brand?: string }> } };
    let deviceId = localStorage.getItem("device_id");
    if (!deviceId) {
        deviceId = `device_${Math.random().toString(36).slice(2, 11)}`;
        localStorage.setItem("device_id", deviceId);
    }
    return {
        device_id: deviceId,
        device_type: "web",
        device_name: navigator.userAgent,
        browser: nav.userAgentData?.brands?.[0]?.brand || "Unknown",
        platform: navigator.platform,
        user_agent: navigator.userAgent,
    };
}

/** Request FCM token (if allowed) and persist it for the logged-in user. */
export async function savePushTokenToBackend(): Promise<boolean> {
    const token = await requestNotificationPermission();
    if (!token) return false;

    await axios.post("/push-token", {
        token,
        device_info: getDeviceInfo(),
    });
    return true;
}

export const getMessagingInstance = () => messaging;
export { app };
