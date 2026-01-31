// Firebase initialization for React/Inertia app
import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

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

/**
 * Initialize Firebase Messaging only if the browser supports it.
 * Does NOT register the service worker; use registerServiceWorker() (firebase-messaging-sw.js) first.
 */
export const initializeMessaging = async () => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
        return null;
    }
    try {
        const supported = await isSupported();
        if (!supported) {
            return null;
        }
        const registration = await navigator.serviceWorker.getRegistration("/");
        if (!registration) {
            return null;
        }
        messaging = getMessaging(app);

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

        return registration;
    } catch (error) {
        console.error("[Firebase] Messaging init failed:", error);
        return null;
    }
};

export const requestNotificationPermission = async (): Promise<string | null> => {
    if (!messaging) return null;
    try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return null;
        const vapidKey =
            "BC_RUtntF6QVwsng1uiwnd6qHozF8Q8y_P4qG0G1BrgtAK5GKQr4_J8k2509yhssNFB7ZqgqrzHN_frrOVcN-2I";
        const token = await getToken(messaging, { vapidKey });
        return token;
    } catch (error) {
        console.error("[Firebase] Error requesting permission:", error);
        return null;
    }
};

export const getMessagingInstance = () => messaging;
export { app };
