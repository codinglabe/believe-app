import '../css/app.css';
import './bootstrap'; // sets window.axios — must run before timezone init
import './lib/timezone-detection'; // X-Timezone on axios + fetch for every page

import type { GlobalEvent } from '@inertiajs/core';
import { createInertiaApp, router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { configureEcho } from '@laravel/echo-react';
import { createRoot } from 'react-dom/client';
import { NotificationProvider } from './components/frontend/notification-provider';
import { PwaInstallPrompt } from './components/pwa/pwa-install-prompt';
import { initializeTheme } from './hooks/use-appearance';
import { registerServiceWorker } from './pwa/register-service-worker';
import { PWAUpdatePrompt } from './components/PWAUpdatePrompt';
import { isLivestockDomain } from './lib/livestock-domain';
import { isMerchantDomain } from './lib/merchant-domain';
import { initializeMessaging, requestNotificationPermission } from './lib/firebase';
import { getBrowserTimezone } from './lib/timezone-detection';
import axios from 'axios';


configureEcho({
    broadcaster: 'reverb',
});

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

// Determine progress bar color based on domain
const getProgressColor = () => {
    if (typeof window !== 'undefined') {
        if (isMerchantDomain()) {
            return '#2563EB'; // BIU Merchant Hub accent
        }
        if (isLivestockDomain()) {
            return '#f59e0b'; // Amber-600 to match livestock theme
        }
    }
    return '#7F03DB'; // Purple for main app
};

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) => resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
    setup({ el, App, props }) {
        const root = createRoot(el);

        // Initial sync: set meta from first page load so CSRF is never stale (e.g. public view, PWA).
        const initialToken = (props as { initialPage?: { props?: { csrf_token?: string } } })?.initialPage?.props?.csrf_token;
        if (initialToken && typeof document !== 'undefined') {
            const meta = document.querySelector('meta[name="csrf-token"]');
            if (meta) meta.setAttribute('content', initialToken);
            else {
                const newMeta = document.createElement('meta');
                newMeta.name = 'csrf-token';
                newMeta.content = initialToken;
                document.head.appendChild(newMeta);
            }
        }

        // After every Inertia navigation (including post-login redirect), sync meta so next POST doesn't get 419.
        router.on('success', (event: GlobalEvent<'success'>) => {
            const raw = event.detail.page?.props?.csrf_token;
            const token = typeof raw === 'string' ? raw : '';
            if (token && typeof document !== 'undefined') {
                const meta = document.querySelector('meta[name="csrf-token"]');
                if (meta) meta.setAttribute('content', token);
                else {
                    const newMeta = document.createElement('meta');
                    newMeta.name = 'csrf-token';
                    newMeta.content = token;
                    document.head.appendChild(newMeta);
                }
            }
        });

        root.render(
          <NotificationProvider>
            <App {...props} />
                <PwaInstallPrompt />
                <PWAUpdatePrompt />
          </NotificationProvider>
        );
    },
    progress: {
        color: getProgressColor(),
        showSpinner: true,
    },
});

// Every Inertia visit (GET/POST/Link) must send the browser IANA timezone so Laravel DetectTimezone applies it.
if (typeof window !== 'undefined') {
    router.on('before', (event: GlobalEvent<'before'>) => {
        event.detail.visit.headers['X-Timezone'] = getBrowserTimezone();
    });
}

// Global axios: always send CSRF from meta (kept in sync by CsrfTokenSync + router.on('success')).
if (typeof window !== 'undefined') {
    const getCsrf = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
    axios.defaults.withCredentials = true;
    axios.interceptors.request.use((config) => {
        config.headers['X-CSRF-TOKEN'] = getCsrf();
        config.headers['X-Timezone'] = getBrowserTimezone();
        return config;
    });
    axios.interceptors.response.use(
        (r) => r,
        (err) => {
            if (err.response?.status === 419) {
                // Refresh page to get new token; CsrfTokenSync will keep meta in sync after.
                window.location.reload();
            }
            if (err.response?.status === 401) {
                window.location.href = '/login';
            }
            return Promise.reject(err);
        }
    );
}

// Add domain class to body for conditional styling
if (typeof window !== 'undefined') {
    if (isMerchantDomain()) {
        document.body.classList.add('merchant-domain');
    } else if (isLivestockDomain()) {
        document.body.classList.add('livestock-domain');
    } else {
        document.body.classList.add('main-domain');
    }
}

// Merchant Hub: default to dark (navy) UI unless explicitly overridden.
if (typeof window !== 'undefined' && isMerchantDomain()) {
    try {
        const existing = localStorage.getItem('appearance');
        if (!existing) {
            localStorage.setItem('appearance', 'dark');
            document.cookie = `appearance=dark;path=/;max-age=${365 * 24 * 60 * 60};SameSite=Lax`;
        }
    } catch {
        // ignore
    }
}

// This will set light / dark mode on load...
initializeTheme();

// Single service worker registration (firebase-messaging-sw.js). Do not register elsewhere.
if (typeof window !== 'undefined' && !isLivestockDomain()) {
    registerServiceWorker();

    // Re-initialize push only once per controller change to avoid loops
    if ('serviceWorker' in navigator) {
        let controllerChangeHandled = false;
        navigator.serviceWorker.addEventListener('controllerchange', async () => {
            if (controllerChangeHandled) return;
            controllerChangeHandled = true;
            try {
                await new Promise((r) => setTimeout(r, 1000));
                await initializeMessaging();
                const windowWithLaravel = window as typeof window & { Laravel?: { user?: { id?: string | number } } };
                const userId = windowWithLaravel.Laravel?.user?.id ||
                    (document.querySelector('meta[name="user-id"]') as HTMLMetaElement)?.content ||
                    (document.querySelector('[data-user-id]') as HTMLElement)?.dataset?.userId;
                if (userId) {
                    const fcmToken = await requestNotificationPermission();
                    if (fcmToken) {
                        const nav = navigator as typeof navigator & { userAgentData?: { brands?: Array<{ brand?: string }> } };
                        await axios.post("/push-token", {
                            token: fcmToken,
                            device_info: {
                                device_id: localStorage.getItem('device_id') || `device_${Math.random().toString(36).substr(2, 9)}`,
                                device_type: 'web',
                                device_name: navigator.userAgent,
                                browser: nav.userAgentData?.brands?.[0]?.brand || 'Unknown',
                                platform: navigator.platform,
                                user_agent: navigator.userAgent,
                            },
                        });
                    }
                }
            } catch (e) {
                console.error('[App] Push re-init after controller change:', e);
            }
        });
    }
}
