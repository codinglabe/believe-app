import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// The app is served over HTTPS on a Valet/Herd `.test` domain. The dev server must use the
// same host and TLS, otherwise the browser blocks its HTTP assets as mixed content.
// Override the host per-machine with VITE_DEV_SERVER_HOST when your local domain differs.
const devServerHost = process.env.VITE_DEV_SERVER_HOST ?? 'bapp.test';

function resolveLocalTlsCertificate(host: string) {
    const certBases = [
        `${homedir()}/.config/valet/Certificates/${host}`,
        `${homedir()}/.valet/Certificates/${host}`,
        `${homedir()}/.config/herd/config/valet/Certificates/${host}`,
    ];

    for (const base of certBases) {
        const keyPath = `${base}.key`;
        const certPath = `${base}.crt`;
        if (existsSync(keyPath) && existsSync(certPath)) {
            return { key: readFileSync(keyPath), cert: readFileSync(certPath) };
        }
    }

    return undefined;
}

const devServerHttps = resolveLocalTlsCertificate(devServerHost);

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
        // Bind to the TLS host (not `--host`/`[::]`) and serve over HTTPS so assets load on https://bapp.test.
        host: devServerHost,
        ...(devServerHttps ? { https: devServerHttps } : {}),
        hmr: {
            host: devServerHost,
        },
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
