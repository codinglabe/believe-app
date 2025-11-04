const CACHE_NAME = 'believe-app-cache-v1';
const PRECACHE_URLS = ['/', '/manifest.json'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches
            .open(CACHE_NAME)
            .then((cache) => cache.addAll(PRECACHE_URLS))
            .catch((error) => {
                console.error('Precache failed:', error);
            })
    );

    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) =>
            Promise.all(
                cacheNames
                    .filter((cacheName) => cacheName !== CACHE_NAME)
                    .map((cacheName) => caches.delete(cacheName))
            )
        )
    );

    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const { request } = event;

    if (request.method !== 'GET' || request.headers.has('range')) {
        return;
    }

    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(request)
                .then((networkResponse) => {
                    if (
                        !networkResponse ||
                        networkResponse.status !== 200 ||
                        networkResponse.type !== 'basic'
                    ) {
                        return networkResponse;
                    }

                    const responseToCache = networkResponse.clone();

                    caches
                        .open(CACHE_NAME)
                        .then((cache) => cache.put(request, responseToCache))
                        .catch((error) => {
                            console.error('Cache put failed:', error);
                        });

                    return networkResponse;
                })
                .catch(async () => {
                    if (request.mode === 'navigate') {
                        const cachedHomepage = await caches.match('/');
                        if (cachedHomepage) {
                            return cachedHomepage;
                        }
                    }

                    throw new Error('Network request failed and no cache available.');
                });
        })
    );
});

