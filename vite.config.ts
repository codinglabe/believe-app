import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import dns from 'node:dns';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { defineConfig, loadEnv } from 'vite';

function hostResolves(host: string): boolean {
    if (!host || host === '127.0.0.1' || host === 'localhost' || host === '0.0.0.0') {
        return true;
    }

    try {
        dns.lookupSync(host);
        return true;
    } catch {
        return false;
    }
}

function hostnameFromAppUrl(appUrl: string | undefined): string | null {
    if (!appUrl) {
        return null;
    }

    try {
        return new URL(appUrl).hostname;
    } catch {
        return null;
    }
}

function resolveDevServerHost(env: Record<string, string>): string {
    const explicit = env.VITE_DEV_SERVER_HOST?.trim();
    if (explicit) {
        return explicit;
    }

    const candidates = [
        hostnameFromAppUrl(env.APP_URL),
        'bapp.test',
        '127.0.0.1',
    ].filter((value): value is string => Boolean(value));

    for (const host of candidates) {
        if (hostResolves(host)) {
            return host;
        }
    }

    return '127.0.0.1';
}

function resolveLocalTlsCertificate(host: string) {
    if (host === '127.0.0.1' || host === 'localhost' || host === '0.0.0.0') {
        return undefined;
    }

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

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const devServerHost = resolveDevServerHost(env);
    const devServerHttps = resolveLocalTlsCertificate(devServerHost);

    return {
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
            // Prefer APP_URL / VITE_DEV_SERVER_HOST; fall back to 127.0.0.1 when `.test` hosts are missing from DNS.
            host: devServerHost,
            ...(devServerHttps ? { https: devServerHttps } : {}),
            hmr: {
                host: devServerHost === '127.0.0.1' ? 'localhost' : devServerHost,
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
    };
});
