// firebase-messaging-sw.js - Keep this file only
importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js");

const firebaseConfig = {
    apiKey: "AIzaSyBRd7Jf0kxrlCRFa9zYtwtubiPbPDohVmA",
    authDomain: "c3ers-c6fbe.firebaseapp.com",
    projectId: "c3ers-c6fbe",
    storageBucket: "c3ers-c6fbe.firebasestorage.app",
    messagingSenderId: "554135699251",
    appId: "1:554135699251:web:5a34568d2f0cde065ac846",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Handle background messages - ONLY ONCE
// messaging.onBackgroundMessage((payload) => {
//     console.log("[firebase-messaging-sw.js] Received background message:", payload);

//     const notificationTitle = payload.notification?.title || "New Notification";
//     const notificationOptions = {
//         body: payload.notification?.body || "",
//         icon: "/icon.png",
//         badge: "/badge.png",
//         tag: payload.data?.content_item_id || "notification",
//         data: payload.data || {},
//         requireInteraction: false,
//     };

//     return self.registration.showNotification(notificationTitle, notificationOptions);
// });

// Rest of your service worker code (cache, fetch, etc.)
const CACHE_NAME = "pwa-cache-v1";
const urlsToCache = ["/", "/offline.html", "/manifest.json"];

self.addEventListener("install", (event) => {
    console.log("[Service Worker] Installing...");
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log("[Service Worker] Caching app shell");
            return cache.addAll(urlsToCache);
        }),
    );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    console.log("[Service Worker] Activating...");
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log("[Service Worker] Deleting old cache:", cacheName);
                        return caches.delete(cacheName);
                    }
                }),
            );
        }),
    );
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    // ... your fetch handling code
});

self.addEventListener("notificationclick", (event) => {
    console.log("[firebase-messaging-sw.js] Notification clicked:", event.notification);
    event.notification.close();

    const urlToOpen = event.notification.data?.click_action || event.notification.data?.url || "/";

    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if (client.url === urlToOpen && "focus" in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        }),
    );
});
