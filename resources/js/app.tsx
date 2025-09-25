import '../css/app.css';
import './bootstrap'; // <--- Add this line

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { initializeTheme } from './hooks/use-appearance';
import { NotificationProvider } from './components/frontend/notification-provider';
import { configureEcho } from '@laravel/echo-react';

configureEcho({
    broadcaster: 'reverb',
});

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) => resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
          <NotificationProvider>
            <App {...props} />
          </NotificationProvider>
        );
    },
    progress: {
        color: '#7F03DB',
        showSpinner: true,
    },
});

// This will set light / dark mode on load...
initializeTheme();
