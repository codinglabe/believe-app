import '../css/app.css';
import './bootstrap'; // <--- Add this line

import { createInertiaApp } from '@inertiajs/react';
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
import axios from 'axios';


configureEcho({
    broadcaster: 'reverb',
});

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

// Determine progress bar color based on domain
const getProgressColor = () => {
    if (typeof window !== 'undefined') {
        if (isMerchantDomain()) {
            return '#FF1493'; // French Rose - neon bright merchant theme
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

// This will set light / dark mode on load...
initializeTheme();

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
