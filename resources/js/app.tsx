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

// Don't register service worker on livestock domain
if (typeof window !== 'undefined' && !isLivestockDomain()) {
    registerServiceWorker();

    // Listen for service worker controller changes to re-initialize push notifications
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('controllerchange', async () => {
            console.log('[App] Service worker controller changed, re-initializing push notifications');

            try {
                // Wait a bit for the new service worker to be ready
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Re-initialize Firebase messaging
                await initializeMessaging();
                console.log('[App] Firebase messaging re-initialized after controller change');

                // Re-register push token if user is logged in
                // Try to get user ID from various sources
                const windowWithLaravel = window as typeof window & { Laravel?: { user?: { id?: string | number } } }
                const userId = windowWithLaravel.Laravel?.user?.id ||
                              (document.querySelector('meta[name="user-id"]') as HTMLMetaElement)?.content ||
                              (document.querySelector('[data-user-id]') as HTMLElement)?.dataset?.userId;

                if (userId) {
                    const fcmToken = await requestNotificationPermission();
                    if (fcmToken) {
                        const navigatorWithUA = navigator as typeof navigator & { userAgentData?: { brands?: Array<{ brand?: string }> } }
                        const deviceInfo = {
                            device_id: localStorage.getItem('device_id') || `device_${Math.random().toString(36).substr(2, 9)}`,
                            device_type: 'web',
                            device_name: navigator.userAgent,
                            browser: navigatorWithUA.userAgentData?.brands?.[0]?.brand || 'Unknown',
                            platform: navigator.platform,
                            user_agent: navigator.userAgent
                        };

                        // Store device_id if it was generated
                        if (!localStorage.getItem('device_id') && deviceInfo.device_id) {
                            localStorage.setItem('device_id', deviceInfo.device_id);
                        }

                        await axios.post("/push-token", {
                            token: fcmToken,
                            device_info: deviceInfo
                        });
                        console.log('[App] Push token re-registered after controller change');
                    }
                }
            } catch (error) {
                console.error('[App] Failed to re-initialize push notifications after controller change:', error);
            }
        });
    }
}
