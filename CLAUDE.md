# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

The Laravel side of the BIU / Unity Meet platform — a multi-domain Inertia + React app (~250 models, ~550 migrations, ~170 frontend page directories) that serves:

- **Main site** (default host): nonprofit registry, donations, livestreams, social feed, learning hub.
- **Merchant portal** (`merchant.*` host, or `config('merchant.domain')`): merchant onboarding, marketplace, BRP wallet, feedback rewards.
- **Livestock portal** (`config('livestock.domain')`): standalone livestock marketplace.

All three are served from the **same Laravel app** and share the DB; the host name decides which routes, layouts, auth guards, and Inertia pages are exposed. Read `app/helpers.php` (`request_is_merchant_portal()`, `is_livestock_domain()`) before touching anything that branches on domain — these are also used in `bootstrap/app.php` to swap login/dashboard redirects.

## Stack

- PHP **8.2** + Laravel 12 (slim `bootstrap/app.php` style; no `App\Http\Kernel`).
- Inertia 2 + React 19 + TypeScript, bundled by Vite with `@tailwindcss/vite`.
- MySQL (prod = Hostinger); SQLite for the test suite (`phpunit.xml` forces `DB_CONNECTION=sqlite`).
- Pest 3 for testing.
- Reverb for websockets (Laravel Echo on the frontend).
- Spatie permission for RBAC (`HasRoles` on `User`).
- AWS SDK PHP — used for the streaming pipeline (`StreamingQueueService` → SQS).
- Cashier (Stripe), PayPal, Twilio, FCM, Google API client, Ziggy.

The system shell defaults to `php8.1`; **always invoke `php8.2` explicitly** for `artisan` / `composer` commands or composer will refuse with "platform requirement php ^8.2".

## Commands

```bash
# Dev — concurrently runs serve, queue:listen, vite (default port: 8001 via APP_URL)
composer dev

# Tests — clears config cache then runs Pest with SQLite
composer test
php8.2 artisan test --filter=DashboardTest                 # single file
php8.2 artisan test --filter='it stores ein digits'        # single Pest test

# Frontend
npm run dev       # vite watcher
npm run build     # production build
npm run lint      # eslint --fix
npm run format    # prettier --write resources/
npm run types     # tsc --noEmit

# Code style (no pint.json — falls back to Pint defaults)
vendor/bin/pint
vendor/bin/pint --test     # check without writing
```

There is no `.env.example`; the canonical local `.env` is gitignored. New env keys should be documented in the relevant `config/*.php` file's comment block (see `config/streaming.php` for the pattern).

## Local DB

`.env` defaults to MySQL on `127.0.0.1:33066` with `believe/believe` creds. The simplest setup is a one-shot Docker container:

```bash
docker run -d --name biu-mysql \
  -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=believe \
  -e MYSQL_USER=believe -e MYSQL_PASSWORD=believe \
  -p 127.0.0.1:33066:3306 mysql:8.0
php8.2 artisan migrate
```

The test suite uses SQLite (forced in `phpunit.xml`), so unit/feature tests run without the Docker MySQL.

## Architectural notes

### Multi-domain routing (read before changing middleware or auth)

`bootstrap/app.php` rewires `redirectGuestsTo` and `redirectUsersTo` based on `request_is_merchant_portal()` so unauthenticated merchants land on `merchant.login` (not the main `login`). Several middleware (`CheckPermission`, `CheckRole`, `RequireMerchantSubscription`) duplicate this branching when generating back URLs. If you add a new portal host or rename a route name, audit those middleware too — otherwise users get redirect loops between login and dashboard.

Route files mounted from `routes/`:

| File | Purpose | Loaded by |
|---|---|---|
| `web.php` | Main site (~300 routes) | `withRouting(web: …)` |
| `api.php` | Bearer-token API + webhooks; **CSRF disabled via `validateCsrfTokens(except: ['api/*'])`** | `withRouting(api: …)` |
| `auth.php`, `settings.php` | Auth + user settings | included from `web.php` |
| `merchant.php` | Merchant portal routes | host-constrained in a service provider |
| `livestock.php` | Livestock portal routes | host-constrained in a service provider |
| `console.php` | Scheduled tasks | `withRouting(commands: …)` |

`api/*` and `webhooks/bridge` are pre-excluded from CSRF (`bootstrap/app.php`). External callers like the AWS streaming worker and Stripe/Printify webhooks rely on this; signature/bearer verification lives inside the controllers.

### Streaming feature (active workstream)

End-to-end shape:

```
Browser (VDO.Ninja, WebRTC)
   └─► MediaMTX bridge (Fargate)        ← lives in companion repo biu-streaming-aws
       └─► RTMP at :1935
            └─► Fargate FFmpeg worker
                 └─► YouTube Live
                       └─► POST /api/streaming/status (bearer-token auth) → Laravel
```

Laravel produces jobs into SQS (`StreamingQueueService::enqueue`) and applies status updates from the worker callbacks (`StreamingStatusCallbackController` → `applyCallbackStatus`). Key invariants:

- **Job contract** lives in `biu-streaming-aws/laravel/INTEGRATION.md`. Treat its message shape (`meeting_id`, `organization_id`, `source_url`, `destination_url`, `callback_url`, `max_duration_minutes`) as a public API. Changes there are breaking changes.
- `StreamingWorkerSourceUrl::resolve()` is the only place that builds the worker's RTMP source URL. It defers to `STREAMING_WORKER_SOURCE_URL_TEMPLATE` first, then `STREAMING_WORKER_RTMP_PULL_BASE`, then `services.mediamtx.rtmp_public`. Do not bypass it.
- `STREAMING_SIMULATE_WORKER=true` short-circuits the SQS call and applies `starting` → `live` in-process — use this locally when AWS isn't wired. It is **ignored in `production` env** unless `STREAMING_SIMULATE_WORKER_FORCE=true` (don't set that).
- `StreamingPreflight` is the gate that runs before `queueStreamRelayJob`. All gates are opt-in via `STREAMING_REQUIRE_SUBSCRIPTION`, `STREAMING_PERMISSION_NAME`, `STREAMING_HARD_QUOTA_MINUTES`. Off by default.
- Billing math (`accountUsageIfNeeded`) is authoritative on the **terminal** callback's `duration_minutes` — never derive it from `(ended_at - started_at)`. Free tier is `STREAMING_FREE_MINUTES_PER_MONTH` (default 1800), overage `STREAMING_RATE_CENTS_PER_HOUR` (default 8c/hr).
- `php8.2 artisan streaming:smoke` (in `app/Console/Commands/StreamingSmoke.php`) sends a synthetic job to real SQS to verify the whole pipeline. Flags: `--meeting-id=`, `--destination=`, `--max-duration=`, `--dry-run`. Needs `STREAMING_CALLBACK_BASE_URL` pointing at a public tunnel (cloudflared) if you want the worker callback to actually reach a local Laravel.
- The companion AWS repo lives at `/home/dosh/Documents/Kenneth/biu-streaming-aws` — its `CLAUDE.md` explains the Fargate worker, MediaMTX bridge, and IAM split. Bridge has been Dosh-owned since 2026-05-07; the Laravel side was reassigned from Riyad to Dosh on 2026-05-12.

### Domain services pattern

Business logic that touches more than one model lives in `app/Services/*` (74 services). The convention is **service classes are stateless**, take models in / return primitives or arrays, and `DB::transaction` themselves when they mutate. Controllers wire HTTP ↔ service ↔ Inertia render. Don't add business logic to controllers or models beyond accessors/scopes.

Sub-namespaces (`Services/Admin`, `Services/Streaming`, `Services/Facebook`) are domain folders — match the namespace when adding a new service in that domain.

### Tests

- Pest is the default; one PHPUnit suite path (`tests/Unit/Services`) exists alongside Pest tests in `tests/Feature`.
- `tests/Pest.php` wires `RefreshDatabase` into `Feature/` tests by default — adding a new feature suite means it gets a fresh SQLite schema per test.
- The migrate-graceful step in `phpunit.xml` lets the SQLite file be reused; if a new migration only works on MySQL (e.g. specific column types), guard it with `if (DB::getDriverName() !== 'sqlite')` or it will break the suite.

## House rules

- **No Claude trailers in commits.** Omit `Co-Authored-By: Claude` and "Generated with Claude Code" footers from commit messages and PR bodies in this repo.
- **Stick to the client spec.** When given an instruction from Kenneth (the client), interpret it literally and don't redesign across role boundaries (Laravel side vs AWS side vs frontend) without confirming first.
