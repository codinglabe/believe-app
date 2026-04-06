const CACHE_NAME = `believe-app-cache-${new Date().getTime()}`;
// Do NOT precache "/" or auth routes — prevents stale CSRF token → 419 Page Expired
const PRECACHE_URLS = ['/manifest.json'];

// Auth and sensitive paths: never cache (SW/CDN/browser)
const AUTH_PATHS = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email', '/wallet', '/api/', '/sanctum/'];
function isAuthOrSensitive(url) {
    const path = new URL(url).pathname;
    return AUTH_PATHS.some((p) => path === p || path.startsWith(p));
}

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
    const url = new URL(request.url);

    // Non-GET: never cache (e.g. POST login) — prevent 419
    if (request.method !== 'GET' || request.headers.has('range')) {
        return;
    }
    // Auth/sensitive routes: network only, no cache
    if (isAuthOrSensitive(url.href)) {
        event.respondWith(fetch(request));
        return;
    }

    const acceptHeader = request.headers.get('accept') || '';
    const isHtmlRequest = request.mode === 'navigate' || acceptHeader.includes('text/html');
    const isInertiaRequest = request.headers.has('x-inertia');

    if (isHtmlRequest || isInertiaRequest || request.destination === 'document') {
        return;
    }

    // Filter out unsupported URL schemes
    const unsupportedSchemes = ['chrome-extension:', 'chrome:', 'moz-extension:', 'safari-extension:'];
    if (unsupportedSchemes.some(scheme => url.protocol.startsWith(scheme))) {
        // Let the browser handle these requests normally
        return;
    }

    // Only cache requests from the same origin
    if (url.origin !== location.origin && !url.protocol.startsWith('http')) {
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

                    // Double-check the URL before caching
                    const responseUrl = new URL(networkResponse.url);
                    if (unsupportedSchemes.some(scheme => responseUrl.protocol.startsWith(scheme))) {
                        return networkResponse;
                    }

                    const responseToCache = networkResponse.clone();

                    caches
                        .open(CACHE_NAME)
                        .then((cache) => cache.put(request, responseToCache))
                        .catch((error) => {
                            // Silently fail for unsupported schemes
                            if (!error.message.includes('chrome-extension') &&
                                !error.message.includes('Request scheme')) {
                                console.error('Cache put failed:', error);
                            }
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

// Listen for skip waiting message from the client
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        console.log('[Service Worker] Received SKIP_WAITING message');
        self.skipWaiting();
    }
});

