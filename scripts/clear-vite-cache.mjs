import { rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const cacheDir = resolve(root, 'node_modules', '.vite');

if (existsSync(cacheDir)) {
    rmSync(cacheDir, { recursive: true, force: true });
    console.log('[vite] Cleared', cacheDir);
} else {
    console.log('[vite] No cache to clear');
}
