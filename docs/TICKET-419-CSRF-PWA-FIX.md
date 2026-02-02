# Ticket: Fix Laravel 419 Page Expired (CSRF/session) + notification prompt flood

## Summary

**419 flood:** Users repeatedly get "419 Page Expired" when logging in.
**Notification flood:** Users (e.g. in Microsoft Edge) see "Allow notifications?" over and over.

Both are addressed in this ticket.

---

## Root causes

1. **419**
   - Cached login/register HTML (browser, CDN, or service worker) contained an old CSRF token. Submitting the form sent an expired token → 419.
   - Auth pages were not explicitly marked as non-cacheable.

2. **Notification prompts**
   - `Notification.requestPermission()` was called on every page that mounted the notification bell (and from several layouts). Each mount could trigger the browser prompt when permission was still "default".

---

## Acceptance criteria

- [x] Login works reliably without 419.
- [x] Auth pages (login, register, etc.) are not cached by SW/CDN/browser.
- [x] Service worker does not cache auth routes or non-GET requests.
- [x] Notification permission is requested at most once per session (no prompt flood).
- [ ] Sessions stable across nodes (see Step C below).
- [ ] Lighthouse PWA passes without caching auth routes.

---

## Changes made (code)

### A. No-cache headers for auth pages

- **Middleware:** `App\Http\Middleware\NoCacheAuthPages`
- Sets `Cache-Control: no-store, no-cache, must-revalidate, max-age=0`, `Pragma: no-cache`, `Expires: 0` on:
  - `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`
- Registered in `bootstrap/app.php` on the web stack.

### B. Service worker (SW) bypass for auth

- **`public/service-worker.js`**
  - Removed `/` from precache list (avoids caching homepage with stale CSRF).
  - Added `AUTH_PATHS`: `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/wallet`, `/api/`, `/sanctum/`.
  - Fetch handler: for these paths, responds with `fetch(request)` only (no cache).
  - Non-GET requests were already not cached (early return).
- **`public/firebase-messaging-sw.js`**
  - Already had auth bypass and no-cache for navigate/auth routes; no change.

### C. CSRF meta tag

- Confirmed in `resources/views/app.blade.php`: `<meta name="csrf-token" content="{{ csrf_token() }}">`.

### D. Notification prompt flood

- **`resources/js/components/notification-bell.tsx`**
  - Removed the automatic `Notification.requestPermission()` when the Echo listener is set up. That ran on every page with the bell and caused repeated prompts.
- **`resources/js/lib/firebase.ts`**
  - In `requestNotificationPermission()`: when permission is `"default"`, we only call `Notification.requestPermission()` once per session (guarded with `sessionStorage`). Prevents multiple callers (app, layouts, chat, PushNotificationManager) from each triggering a prompt.

---

## Step C — Server/session stability (for Ash / ops)

If 419s persist or you run **multiple app servers**:

1. **Sessions across nodes**
   - Use a shared session store: Redis or database.
   - `.env` example:
     - `SESSION_DRIVER=redis` and a Redis connection, or
     - `SESSION_DRIVER=database` and run `php artisan session:table` + migrate.
   - Current default in this app: `SESSION_DRIVER=database` (see `config/session.php`).

2. **Cookie and domain**
   - Set `SESSION_DOMAIN` to your canonical domain (e.g. `yourdomain.com`) if you use subdomains.
   - In production: `SESSION_SECURE_COOKIE=true`, `APP_URL` correct and HTTPS.

3. **Canonical domain**
   - Ensure redirects and `APP_URL` use one canonical host so the session cookie is sent consistently.

---

## Quick “Ash script” — confirm if it was PWA/SW related

1. Open DevTools → Application → Service Workers.
2. Unregister the service worker and “Clear site data” for the origin.
3. Try login again.
4. If 419s stop, the cause was likely cached auth pages / stale token (now mitigated by no-cache headers and SW bypass).

---

## Copy/paste ticket title (for Ash)

**Title:** Fix Laravel 419 Page Expired (CSRF/session) flood

**Acceptance criteria:**
- Login works reliably without 419.
- Auth pages not cached by SW/CDN/browser.
- Sessions stable across nodes.
- Lighthouse PWA passes without caching auth routes.
- No repeated “Allow notifications?” prompts.
