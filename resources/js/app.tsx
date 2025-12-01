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


configureEcho({
    broadcaster: 'reverb',
});

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

// Determine progress bar color based on domain
const getProgressColor = () => {
    if (typeof window !== 'undefined' && isLivestockDomain()) {
        return '#f59e0b'; // Amber-600 to match livestock theme
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

// Add livestock domain class to body for conditional styling
if (typeof window !== 'undefined') {
    if (isLivestockDomain()) {
        document.body.classList.add('livestock-domain');
    } else {
        document.body.classList.add('main-domain');
    }
}

// Don't register service worker on livestock domain
if (typeof window !== 'undefined' && !isLivestockDomain()) {
    registerServiceWorker();
}
