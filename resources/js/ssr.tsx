import { createInertiaApp } from '@inertiajs/react';
import createServer from '@inertiajs/react/server';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import ReactDOMServer from 'react-dom/server';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createServer(async (page) => {
    const { route: ziggyRoute } = await import('ziggy-js');
    (global as any).route = (name: string, params?: any, absolute?: boolean) =>
        ziggyRoute(name, params, absolute, {
            ...(page.props as any).ziggy,
            location: new URL((page.props as any).ziggy.location),
        });

    return createInertiaApp({
        page,
        render: ReactDOMServer.renderToString,
        title: (title) => `${title} - ${appName}`,
        resolve: (name) => resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
        setup: ({ App, props }) => <App {...props} />,
    });
});
