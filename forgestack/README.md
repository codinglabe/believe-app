# Laravel Reverb on ForgeStack

ForgeStack serves `https://believeinunity.test` on **port 443** (nginx + TLS). Reverb runs separately as **plain WebSocket/HTTP on `127.0.0.1:8080`**.

Do **not** point the browser at `wss://believeinunity.test:8080` unless Reverb itself is serving TLS (Herd-style cert paths). With ForgeStack, proxy Reverb through nginx on 443.

## 1. Nginx (one-time per machine)

After ForgeStack regenerates `forgestack-sites.conf`, ensure the `believeinunity.test` `server { }` block includes the locations from [`nginx-reverb-locations.conf`](./nginx-reverb-locations.conf) (before the `location ~ \.php$` block).

Reload nginx from the ForgeStack app or restart ForgeStack.

## 2. `.env` (local ForgeStack)

```env
REVERB_SERVER_HOST=127.0.0.1
REVERB_SERVER_PORT=8080

REVERB_HOST=believeinunity.test
REVERB_PORT=443
REVERB_SCHEME=https

VITE_REVERB_APP_KEY="${REVERB_APP_KEY}"
VITE_REVERB_HOST="${REVERB_HOST}"
VITE_REVERB_PORT="${REVERB_PORT}"
VITE_REVERB_SCHEME="${REVERB_SCHEME}"
```

`REVERB_HOST` / `REVERB_PORT` / `REVERB_SCHEME` are what the **browser** uses (wss on 443).

PHP should publish events over **loopback** (avoids ForgeStack self-signed TLS / cURL error 60):

```env
REVERB_BROADCAST_HOST=127.0.0.1
REVERB_BROADCAST_PORT=8080
REVERB_BROADCAST_SCHEME=http
```

If you insist on `https://believeinunity.test/apps/...` from PHP, set `REVERB_VERIFY_SSL=false` in `.env` (local only).

## 3. Run Reverb

```bash
php artisan reverb:start
```

## 4. Refresh config / frontend

```bash
php artisan config:clear
npm run dev
```

Hard-refresh the browser. Echo should connect to `wss://believeinunity.test/app/...` (port 443, no `:8080` in the URL).
