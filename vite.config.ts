import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            // Only enable SSR in dev
            ssr: process.env.NODE_ENV === 'development' ? 'resources/js/ssr.tsx' : undefined,
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
            'ziggy-js': resolve(__dirname, 'vendor/tightenco/ziggy'),
        },
    },
    build: {
        outDir: 'public/build',
        manifest: true,
        rollupOptions: {
            // Prevent SSR entry in production
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
        },
    },
});