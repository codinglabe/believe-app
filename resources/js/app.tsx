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
import { syncPushTokenWithServer, startPushTokenRefreshListeners } from './lib/push-token-sync';
import { logPushDiagnostics, shouldAutoPromptForPushPermission } from './lib/push-environment';
import { Toaster } from 'react-hot-toast';
import { getBrowserTimezone } from './lib/timezone-detection';
import { initStoredAppVersion, markPwaUpdateComplete, fetchServerAppVersion } from './lib/pwa-update';
import axios from 'axios';
import { buildCsrfHeaders, refreshCsrfToken, syncCsrfMetaFromCookie, updateCsrfMeta } from './lib/csrf';

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
                updateCsrfMeta(token);
                syncEchoCsrfToken(token);
            } else if (typeof document !== 'undefined') {
                const fromCookie = syncCsrfMetaFromCookie();
                if (fromCookie) {
                    syncEchoCsrfToken(fromCookie);
                }
            }

            const pageProps = event.detail.page?.props as {
                auth?: { user?: { id?: number } };
                pwaVersion?: string;
            };

            const pwaVersion = pageProps?.pwaVersion;
            if (typeof pwaVersion === 'string' && pwaVersion && typeof document !== 'undefined') {
                const versionMeta = document.querySelector('meta[name="app-version"]');
                if (versionMeta) {
                    versionMeta.setAttribute('content', pwaVersion);
                }
            }

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
        if (!isLivestockDomain()) {
            initStoredAppVersion();
            void fetchServerAppVersion().then((server) => {
                if (server?.version) {
                    const stored = localStorage.getItem('biu_pwa_version');
                    if (!stored || stored === server.version) {
                        markPwaUpdateComplete(server.version);
                    }
                }
            });
            void registerServiceWorker()?.then(async () => {
                if (initialUserId) {
                    await logPushDiagnostics();
                    await syncPushTokenWithServer({ prompt: shouldAutoPromptForPushPermission() });
                }
            });
            if (initialUserId) {
                startPushTokenRefreshListeners(() => {
                    const metaUserId = document.querySelector('meta[name="user-id"]')?.getAttribute('content');
                    return Boolean(metaUserId);
                });
            }
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

// Global axios: CSRF from cookie (preferred) or meta — kept in sync by CsrfTokenSync + router.on('success').
if (typeof window !== 'undefined') {
    syncCsrfMetaFromCookie();
    axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
    axios.defaults.withCredentials = true;
    axios.interceptors.request.use((config) => {
        const csrfHeaders = buildCsrfHeaders();
        for (const [key, value] of Object.entries(csrfHeaders)) {
            config.headers[key] = value;
        }
        config.headers['X-Timezone'] = getBrowserTimezone();
        return config;
    });
    axios.interceptors.response.use(
        (r) => r,
        async (err) => {
            const status = err.response?.status;
            const originalRequest = err.config as import('axios').InternalAxiosRequestConfig & {
                _csrfRetried?: boolean;
            };

            if (status === 419 && originalRequest && !originalRequest._csrfRetried) {
                originalRequest._csrfRetried = true;
                const newToken = await refreshCsrfToken();
                if (newToken) {
                    originalRequest.headers['X-CSRF-TOKEN'] = newToken;
                    return axios.request(originalRequest);
                }
            }

            if (status === 419) {
                window.location.reload();
            }
            if (status === 401) {
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
    navigator.serviceWorker.addEventListener('controllerchange', async () => {
        try {
            await new Promise((r) => setTimeout(r, 1000));
            resetMessagingRegistration();
            const userId = document.querySelector('meta[name="user-id"]')?.getAttribute('content');
            if (userId && Notification.permission === 'granted') {
                await syncPushTokenWithServer({ force: true });
            }
        } catch (e) {
            console.error('[App] Push re-init after controller change:', e);
        }
    });
}
