import '../css/app.css';
import './lib/polyfills';
import './bootstrap'; // sets window.axios — must run before timezone init
import './lib/timezone-detection'; // X-Timezone on axios + fetch for every page

import type { GlobalEvent } from '@inertiajs/core';
import { createInertiaApp, router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { configureEcho } from '@laravel/echo-react';
import { buildReverbEchoConfig, syncEchoCsrfToken } from './lib/reverb-config';
import { createRoot } from 'react-dom/client';
import { NotificationProvider } from './components/frontend/notification-provider';
import { PwaInstallPrompt } from './components/pwa/pwa-install-prompt';
import { initializeTheme } from './hooks/use-appearance';
import { registerServiceWorker } from './pwa/register-service-worker';
import { PWAUpdatePrompt } from './components/PWAUpdatePrompt';
import { isLivestockDomain } from './lib/livestock-domain';
import { isMerchantDomain } from './lib/merchant-domain';
import { applyFirebaseWebConfig, ensureMessagingReady, resetMessagingRegistration } from './lib/firebase';
import { showNativePushNotification } from './lib/firebase-push-toast';
import { syncPushTokenWithServer } from './lib/push-token-sync';
import { logPushDiagnostics, shouldAutoPromptForPushPermission } from './lib/push-environment';
import { Toaster } from 'react-hot-toast';
import { getBrowserTimezone } from './lib/timezone-detection';
import axios from 'axios';

configureEcho(buildReverbEchoConfig());

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
            syncEchoCsrfToken(initialToken);
        }

        type InitialProps = {
            initialPage?: {
                props?: {
                    csrf_token?: string;
                    auth?: { user?: { id?: number } };
                    firebaseWeb?: Parameters<typeof applyFirebaseWebConfig>[0];
                };
            };
        };
        const initial = props as InitialProps;
        applyFirebaseWebConfig(initial.initialPage?.props?.firebaseWeb);

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
                syncEchoCsrfToken(token);
            }

            const pageProps = event.detail.page?.props as {
                auth?: { user?: { id?: number } };
            };
            const userId = pageProps?.auth?.user?.id;
            if (userId && !isLivestockDomain()) {
                void registerServiceWorker()?.then(async () => {
                    await logPushDiagnostics();
                    await syncPushTokenWithServer({ prompt: shouldAutoPromptForPushPermission() });
                });
            }
        });

        root.render(
          <NotificationProvider>
            <App {...props} />
            <Toaster position="top-right" gutter={8} />
            <PwaInstallPrompt />
            <PWAUpdatePrompt />
          </NotificationProvider>
        );

        const initialUserId = initial.initialPage?.props?.auth?.user?.id;
        if (initialUserId && !isLivestockDomain()) {
            void registerServiceWorker()?.then(async () => {
                await logPushDiagnostics();
                await syncPushTokenWithServer({ prompt: shouldAutoPromptForPushPermission() });
            });
        }
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

// Push → native OS notifications (service worker + Notification API). Requires permission granted.
if (typeof window !== 'undefined' && !isLivestockDomain()) {
    if (import.meta.env.DEV) {
        (window as Window & { enableBelievePush?: () => Promise<string | null> }).enableBelievePush = () =>
            syncPushTokenWithServer({ prompt: true });
        (window as Window & { testBelievePushToast?: () => void }).testBelievePushToast = () =>
            void showNativePushNotification({
                title: 'Unity Meet invitation',
                body: 'Test host invited you to a Unity Meet.',
                data: {
                    type: 'unity_meet_invitation',
                    join_url: '/livestreams/join/test-room',
                    click_action: '/livestreams/join/test-room',
                },
            });
        console.info('[Push] Dev helpers: enableBelievePush(), testBelievePushToast()');
    }

    if ('permissions' in navigator) {
        void navigator.permissions.query({ name: 'notifications' as PermissionName }).then((status) => {
            status.addEventListener('change', () => {
                if (Notification.permission === 'granted') {
                    resetMessagingRegistration();
                    void ensureMessagingReady();
                }
            });
        });
    }
}

// Re-register FCM after SW updates (new firebase-messaging-sw.js deploy)
if (typeof window !== 'undefined' && !isLivestockDomain() && 'serviceWorker' in navigator) {
    let controllerChangeHandled = false;
    navigator.serviceWorker.addEventListener('controllerchange', async () => {
        if (controllerChangeHandled) return;
        controllerChangeHandled = true;
        try {
            await new Promise((r) => setTimeout(r, 1000));
            resetMessagingRegistration();
            const userId = document.querySelector('meta[name="user-id"]')?.getAttribute('content');
            if (userId && Notification.permission === 'granted') {
                await syncPushTokenWithServer();
            }
        } catch (e) {
            console.error('[App] Push re-init after controller change:', e);
        }
    });
}
