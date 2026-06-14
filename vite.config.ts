import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
    optimizeDeps: {
        // Crawl lazy Inertia pages up front so visiting a route doesn't trigger "optimized dependencies changed. reloading".
        holdUntilCrawlEnd: true,
        entries: [
            'resources/js/app.tsx',
            'resources/js/pages/**/*.tsx',
            'resources/js/components/**/*.tsx',
        ],
        include: [
            'obs-websocket-js',
            'prettier/standalone',
            'prettier/plugins/html',
            'sonner',
            '@headlessui/react',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-tooltip',
            'cmdk',
        ],
    },
    build: {
        commonjsOptions: {
            include: [/obs-websocket-js/, /node_modules/],
        },
    },
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            ssr: 'resources/js/ssr.tsx',
            refresh: true,
        }),
        react(),
        tailwindcss(),
    ],
    esbuild: {
        jsx: 'automatic',
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, 'resources/js'),
            'ziggy-js': resolve(__dirname, 'vendor/tightenco/ziggy'),
        },
    },
    server: {
        watch: {
            // Exclude vendor and node_modules from file watching
            ignored: [
                '**/vendor/**',
                '**/node_modules/**',
                '**/.git/**',
                '**/storage/**',
                '**/bootstrap/cache/**',
            ],
            // Use polling as fallback if file watching fails
            usePolling: false,
        },
    },
});
