// const CACHE_NAME = "pwa-cache-v1"
// const urlsToCache = ["/", "/offline.html", "/manifest.json"]

// // Install event
// self.addEventListener("install", (event) => {
//     console.log("[Service Worker] Installing...")
//     event.waitUntil(
//         caches.open(CACHE_NAME).then((cache) => {
//             console.log("[Service Worker] Caching app shell")
//             return cache.addAll(urlsToCache)
//         }),
//     )
//     self.skipWaiting()
// })

// // Activate event
// self.addEventListener("activate", (event) => {
//     console.log("[Service Worker] Activating...")
//     event.waitUntil(
//         caches.keys().then((cacheNames) => {
//             return Promise.all(
//                 cacheNames.map((cacheName) => {
//                     if (cacheName !== CACHE_NAME) {
//                         console.log("[Service Worker] Deleting old cache:", cacheName)
//                         return caches.delete(cacheName)
//                     }
//                 }),
//             )
//         }),
//     )
//     self.clients.claim()
// })

// // Fetch event - Network first, fallback to cache
// self.addEventListener("fetch", (event) => {
//     const { request } = event
//     const url = new URL(request.url)

//     // Skip non-GET requests
//     if (request.method !== "GET") {
//         return
//     }

//     // Skip API calls - use network only
//     if (url.pathname.startsWith("/api/")) {
//         event.respondWith(
//             fetch(request)
//                 .then((response) => response)
//                 .catch(() => {
//                     return new Response(JSON.stringify({ error: "Offline" }), {
//                         status: 503,
//                         headers: { "Content-Type": "application/json" },
//                     })
//                 }),
//         )
//         return
//     }

//     // For other requests, use network first strategy
//     event.respondWith(
//         fetch(request)
//             .then((response) => {
//                 // Cache successful responses
//                 if (response.status === 200) {
//                     const responseToCache = response.clone()
//                     caches.open(CACHE_NAME).then((cache) => {
//                         cache.put(request, responseToCache)
//                     })
//                 }
//                 return response
//             })
//             .catch(() => {
//                 // Return cached version or offline page
//                 return caches.match(request).then((response) => {
//                     return response || caches.match("/offline.html")
//                 })
//             }),
//     )
// })

// // Handle messages from clients
// self.addEventListener("message", (event) => {
//     if (event.data && event.data.type === "SKIP_WAITING") {
//         self.skipWaiting()
//     }
// })
