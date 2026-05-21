# Production Reverb setup (believeinunity.org)

## 1. Server `.env` (Laravel → Reverb on same machine)

```ini
BROADCAST_CONNECTION=reverb
REVERB_HOST=127.0.0.1
REVERB_PORT=8080
REVERB_SCHEME=http
REVERB_SERVER_PORT=8080

# Browser (Echo) — public site
VITE_REVERB_APP_KEY=<same as REVERB_APP_KEY>
VITE_REVERB_HOST=believeinunity.org
VITE_REVERB_PORT=443
VITE_REVERB_SCHEME=https
```

Do **not** set `REVERB_HOST=believeinunity.org` for PHP broadcasting — nginx `/apps` was missing and caused 500 on Go Unity Live.

## 2. Keep Reverb process running

```bash
mkdir -p ~/bin ~/logs
cp deploy/reverb-ensure-running-believeinunity.sh ~/bin/reverb-ensure-running.sh
chmod +x ~/bin/reverb-ensure-running.sh
~/bin/reverb-ensure-running.sh
```

Cron (cPanel → Cron Jobs):

```cron
* * * * * /home/believeinunity/bin/reverb-ensure-running.sh >> /home/believeinunity/logs/reverb-cron.log 2>&1
```

## 3. Nginx WebSocket proxy (root / WHM — once)

Without this, browsers cannot connect to Reverb (Unity Live viewer updates).

```bash
mkdir -p /etc/nginx/conf.d/users/believeinunity/believeinunity.org
cp /home/believeinunity/tmp/reverb.conf /etc/nginx/conf.d/users/believeinunity/believeinunity.org/reverb.conf
nginx -t && systemctl reload nginx
```

Use `deploy/nginx-reverb-believeinunity.conf` as the file content.

## 4. After deploy

```bash
cd ~/public_html
php artisan config:clear && php artisan config:cache
~/bin/reverb-ensure-running.sh
```
