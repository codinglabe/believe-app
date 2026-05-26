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

const UNITY_MEET_INVITATION_TYPE = "unity_meet_invitation";

function notificationIconUrl() {
    return new URL("/favicon-96x96.png", self.location.origin).href;
}

function resolveClickUrl(data) {
    return data.join_url || data.click_action || data.url || "/";
}

function buildNotificationOptions(title, body, data) {
    const clickUrl = resolveClickUrl(data);
    const tag = (data.type || "push") + ":" + (data.livestream_id || data.source_id || title);
    const icon = notificationIconUrl();
    const options = {
        body: body || undefined,
        icon: icon,
        badge: icon,
        tag: tag,
        data: Object.assign({}, data, {
            click_action: clickUrl,
            url: clickUrl,
            join_url: data.join_url || clickUrl,
        }),
    };

    if (data.type === UNITY_MEET_INVITATION_TYPE) {
        options.actions = [{ action: "join", title: "Join" }];
    }

    return options;
}

/** Native OS notification (Windows/macOS/Android) when the app is in the background. */
messaging.onBackgroundMessage((payload) => {
    const data = payload.data || {};
    const title =
        payload.notification?.title || data.title || "Believe In Unity";
    const body =
        payload.notification?.body || data.body || data.message || "";

    return self.registration.showNotification(
        title,
        buildNotificationOptions(title, body, data),
    );
});

// Cache version bump for post-deploy cleanup (invalidates old caches)
const CACHE_NAME = "pwa-cache-v9";
// Only cache static assets; do NOT cache "/" or HTML/auth routes
const urlsToCache = ["/offline.html", "/manifest.json"];

const noCachePaths = ["/", "/login", "/register", "/wallet", "/api/", "/sanctum/"];
function shouldBypassCache(url) {
    const path = new URL(url).pathname;
    return noCachePaths.some((p) => path === p || path.startsWith(p));
}

function isFirebaseOrGoogleUrl(url) {
    return (
        url.includes("googleapis.com") ||
        url.includes("gstatic.com") ||
        url.includes("google.com") ||
        url.includes("firebaseio.com")
    );
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
// Do NOT intercept API/data routes: let the browser handle them natively to avoid
// "Failed to fetch" / net::ERR_FAILED (e.g. /wallet/balance, Inertia XHR, unity-videos).
self.addEventListener("fetch", (event) => {
    const url = event.request.url;

    // Never intercept Firebase / Google push infrastructure (breaks FCM token + delivery)
    if (isFirebaseOrGoogleUrl(url)) {
        return;
    }

    const path = new URL(url).pathname;
    const isNavigate = event.request.mode === "navigate";

    // Let browser handle same-origin API/data requests without SW (avoids fetch failures)
    if (!isNavigate) {
        if (path.startsWith("/api/") || path.startsWith("/wallet/") || path.startsWith("/sanctum/") ||
            path.startsWith("/unity-videos/") || path === "/" || path.startsWith("/login") || path.startsWith("/register")) {
            return; // do not call respondWith — browser handles request natively
        }
    }

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

function openNotificationUrl(clientList, absoluteUrl) {
    for (const client of clientList) {
        if ("focus" in client) {
            if ("navigate" in client) {
                return client.focus().then(() => client.navigate(absoluteUrl));
            }
            return client.focus();
        }
    }
    if (self.clients.openWindow) {
        return self.clients.openWindow(absoluteUrl);
    }
}

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const data = event.notification.data || {};
    let urlToOpen = resolveClickUrl(data);

    if (event.action === "join") {
        urlToOpen = data.join_url || data.click_action || data.url || "/";
    }

    const absoluteUrl = new URL(urlToOpen, self.location.origin).href;

    event.waitUntil(
        self.clients
            .matchAll({ type: "window", includeUncontrolled: true })
            .then((clientList) => openNotificationUrl(clientList, absoluteUrl)),
    );
});
