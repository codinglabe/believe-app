const CACHE_NAME = "pwa-cache-v1"
const urlsToCache = ["/", "/offline.html", "/manifest.json"]

// Import Firebase scripts
importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js")
importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js")

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBRd7Jf0kxrlCRFa9zYtwtubiPbPDohVmA",
    authDomain: "c3ers-c6fbe.firebaseapp.com",
    projectId: "c3ers-c6fbe",
    storageBucket: "c3ers-c6fbe.firebasestorage.app",
    messagingSenderId: "554135699251",
    appId: "1:554135699251:web:5a34568d2f0cde065ac846",
}

// Initialize Firebase
try {
    firebase.initializeApp(firebaseConfig)
    const messaging = firebase.messaging()
    console.log('Firebasessssssss initialized in Service Worker')
} catch (error) {
    console.error('Firebase initialization failed:', error)
}

// Install event
self.addEventListener("install", (event) => {
    console.log("[Service Worker] Installing...")
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log("[Service Worker] Caching app shell")
            return cache.addAll(urlsToCache)
        }),
    )
    self.skipWaiting()
})

// Activate event
self.addEventListener("activate", (event) => {
    console.log("[Service Worker] Activating...")
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log("[Service Worker] Deleting old cache:", cacheName)
                        return caches.delete(cacheName)
                    }
                }),
            )
        }),
    )
    self.clients.claim()
})

// Fetch event - Network first, fallback to cache
self.addEventListener("fetch", (event) => {
    const { request } = event
    const url = new URL(request.url)

    // Skip non-GET requests
    if (request.method !== "GET") {
        return
    }

    // Skip API calls - use network only
    if (url.pathname.startsWith("/api/")) {
        event.respondWith(
            fetch(request)
                .then((response) => response)
                .catch(() => {
                    return new Response(JSON.stringify({ error: "Offline" }), {
                        status: 503,
                        headers: { "Content-Type": "application/json" },
                    })
                }),
        )
        return
    }

    // For other requests, use network first strategy
    event.respondWith(
        fetch(request)
            .then((response) => {
                // Cache successful responses
                if (response.status === 200) {
                    const responseToCache = response.clone()
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, responseToCache)
                    })
                }
                return response
            })
            .catch(() => {
                // Return cached version or offline page
                return caches.match(request).then((response) => {
                    return response || caches.match("/offline.html")
                })
            }),
    )
})

// Firebase Background Message Handler
// if (typeof messaging !== 'undefined') {
//     messaging.onBackgroundMessage((payload) => {
//         console.log("[Service Worker] Received background message:", payload)

//         const notificationTitle = payload.notification?.title || "New Prayer"
//         const notificationOptions = {
//             body: payload.notification?.body || "",
//             icon: "/icons/icon-192x192.png",
//             badge: "/icons/icon-192x192.png",
//             tag: payload.data?.content_item_id || "prayer-notification",
//             data: payload.data || {},
//             requireInteraction: false,
//         }

//         return self.registration.showNotification(notificationTitle, notificationOptions)
//     })
// }

// Handle notification click
// self.addEventListener("notificationclick", (event) => {
//     console.log("Notification clicked:", event.notification)

//     event.notification.close()

//     // Default URL - adjust as needed
//     const urlToOpen = event.notification.data?.url || "/"

//     event.waitUntil(
//         clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
//             // Check if there's already a window/tab open with the target URL
//             for (const client of clientList) {
//                 if (client.url === urlToOpen && "focus" in client) {
//                     return client.focus()
//                 }
//             }
//             // If not, open a new window/tab with the target URL
//             if (clients.openWindow) {
//                 return clients.openWindow(urlToOpen)
//             }
//         })
//     )
// })

// Handle messages from clients
self.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SKIP_WAITING") {
        self.skipWaiting()
    }
})
