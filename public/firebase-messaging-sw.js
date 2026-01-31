// firebase-messaging-sw.js - Single service worker at site root
// Do NOT cache "/" or any HTML/auth routes to prevent 419 CSRF issues.
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

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Background message handler - commented out until SW is stable
// messaging.onBackgroundMessage((payload) => { ... });

// Cache version bump for post-deploy cleanup (invalidates old caches)
const CACHE_NAME = "pwa-cache-v2";
// Only cache static assets; do NOT cache "/" or HTML/auth routes
const urlsToCache = ["/offline.html", "/manifest.json"];

const noCachePaths = ["/", "/login", "/register", "/wallet", "/api/", "/sanctum/"];
function shouldBypassCache(url) {
    const path = new URL(url).pathname;
    return noCachePaths.some((p) => path === p || path.startsWith(p));
}

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
    );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Navigation and auth routes: network only (no cache) to prevent stale CSRF → 419
self.addEventListener("fetch", (event) => {
    const url = event.request.url;
    const isNavigate = event.request.mode === "navigate";

    if (isNavigate || shouldBypassCache(url)) {
        event.respondWith(fetch(event.request));
        return;
    }
    // Static assets: optional cache (e.g. manifest, offline page)
    if (event.request.url.includes("/manifest.json") || event.request.url.includes("/offline.html")) {
        event.respondWith(
            caches.match(event.request).then((cached) => cached || fetch(event.request))
        );
        return;
    }
    // All other requests: network first (no caching of HTML/API)
    event.respondWith(fetch(event.request));
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const urlToOpen = event.notification.data?.click_action || event.notification.data?.url || "/";
    event.waitUntil(
        self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url === urlToOpen && "focus" in client) {
                    return client.focus();
                }
            }
            if (self.clients.openWindow) {
                return self.clients.openWindow(urlToOpen);
            }
        })
    );
});
