# Laravel Reverb on ForgeStack

ForgeStack serves `https://believeinunity.test` on **port 443** (nginx + TLS). Reverb runs separately as **plain WebSocket/HTTP on `127.0.0.1:8080`**.

Do **not** point the browser at `wss://believeinunity.test:8080` unless Reverb itself is serving TLS (Herd-style cert paths). With ForgeStack, proxy Reverb through nginx on 443.

## 1. Nginx (one-time per machine)

After ForgeStack regenerates `forgestack-sites.conf`, run from `backend/`:

```powershell
.\forgestack\apply-reverb-nginx.ps1
```

That adds an `include` to the project file [`nginx-reverb-locations.conf`](./nginx-reverb-locations.conf) inside the `believeinunity.test` server block (before `location ~ \.php$`).

Or paste those locations manually if you prefer. Reload nginx from ForgeStack when prompted.

## 2. `.env` (local ForgeStack)

```env
REVERB_SERVER_HOST=127.0.0.1
REVERB_SERVER_PORT=8080

REVERB_HOST=believeinunity.test
REVERB_PORT=443
REVERB_SCHEME=https

VITE_REVERB_APP_KEY=your-reverb-app-key
VITE_REVERB_HOST=believeinunity.test
VITE_REVERB_PORT=443
VITE_REVERB_SCHEME=https
```

Use **literal** values for `VITE_REVERB_*` (Vite does not expand `${REVERB_*}` from `.env`). After changing them, restart `npm run dev`.

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
