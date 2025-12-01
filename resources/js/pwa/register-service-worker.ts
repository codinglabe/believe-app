const SERVICE_WORKER_URL = '/service-worker.js';

function isSecureContext() {
    if (typeof window === 'undefined') {
        return false;
    }

    return window.isSecureContext || window.location.hostname === 'localhost';
}

import { isLivestockDomain } from '../lib/livestock-domain';

export function registerServiceWorker() {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
        return;
    }

    // Don't register service worker on livestock domain
    if (isLivestockDomain()) {
        return;
    }

    if (!('serviceWorker' in navigator)) {
        return;
    }

    const isLocalhost = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
    const shouldRegister = import.meta.env.PROD || isLocalhost;

    if (!shouldRegister || !isSecureContext()) {
        return;
    }

    window.addEventListener('load', async () => {
        try {
            await navigator.serviceWorker.register(SERVICE_WORKER_URL, {
                scope: '/',
            });
        } catch (error) {
            console.error('Service worker registration failed:', error);
        }
    });
}

