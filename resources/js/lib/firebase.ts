// Firebase initialization for React/Inertia app
import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
    apiKey: "AIzaSyBRd7Jf0kxrlCRFa9zYtwtubiPbPDohVmA",
    authDomain: "c3ers-c6fbe.firebaseapp.com",
    projectId: "c3ers-c6fbe",
    storageBucket: "c3ers-c6fbe.firebasestorage.app",
    messagingSenderId: "554135699251",
    appId: "1:554135699251:web:5a34568d2f0cde065ac846",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging and get a reference to the service
let messaging: any = null;

export const initializeMessaging = async () => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
        try {
            // First, check if service worker is already registered
            let registration = await navigator.serviceWorker.getRegistration("/");

            if (!registration) {
                // Register service worker only if not already registered
                registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
                    scope: "/",
                });
                // console.log("[Firebase] Service Worker registered:", registration);
            } else {
                console.log("[Firebase] Service Worker already registered:", registration);
            }

            // Initialize messaging
            messaging = getMessaging(app);

            // Handle foreground messages
            onMessage(messaging, (payload) => {
                console.log("[Firebase] Message received in foreground:", payload);

                // Dispatch custom event for React components to listen to
                window.dispatchEvent(
                    new CustomEvent("firebase-notification", {
                        detail: {
                            title: payload.notification?.title,
                            body: payload.notification?.body,
                            data: payload.data,
                        },
                    }),
                );

                // // Show notification even in foreground
                if (Notification.permission === "granted") {
                    new Notification(payload.notification?.title || "Notification", {
                        body: payload.notification?.body,
                        icon: payload.notification?.icon || "/favicon-96x96.png",
                        badge: payload.notification?.badge || "/badge.png",
                        tag: payload.data?.content_item_id || "notification",
                    });
                }
            });

            return registration;
        } catch (error) {
            console.error("[Firebase] Service Worker registration failed:", error);
            throw error;
        }
    }
    return null;
};

export const requestNotificationPermission = async (): Promise<string | null> => {
    if (!messaging) {
        console.warn("[Firebase] Messaging not initialized");
        return null;
    }

    try {
        // Request permission
        const permission = await Notification.requestPermission();

        if (permission === "granted") {
            // console.log("[Firebase] Notification permission granted");

            // Use your VAPID key directly
            const vapidKey = "BC_RUtntF6QVwsng1uiwnd6qHozF8Q8y_P4qG0G1BrgtAK5GKQr4_J8k2509yhssNFB7ZqgqrzHN_frrOVcN-2I";

            // Get token
            const token = await getToken(messaging, {
                vapidKey: vapidKey,
            });

            // console.log("[Firebase] FCM Token:", token);
            return token;
        } else {
            console.log("[Firebase] Notification permission denied");
            return null;
        }
    } catch (error) {
        console.error("[Firebase] Error requesting permission:", error);
        return null;
    }
};

export const getMessagingInstance = () => messaging;
export { app };
