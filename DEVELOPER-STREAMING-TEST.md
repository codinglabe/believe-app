# Developer guide — end-to-end streaming test

For when you want to verify the **real** Laravel → AWS → YouTube pipeline on your laptop.

You do **not** need AWS console access, AWS CLI, or to touch any Terraform. The AWS side (MediaMTX bridge + Fargate worker autoscaler + SQS) stays running 24/7. Your laptop just produces SQS messages and accepts callbacks.

If you just want to develop the UI and don't care whether video actually reaches YouTube, use simulate mode instead — `STREAMING_SIMULATE_WORKER=true` in `.env` and you can skip this whole document.

## What you need before you start

- PHP 8.2 on the path as `php8.2` (system `php` is 8.1; commands will refuse with a platform check)
- Docker (for the local MySQL)
- `cloudflared` installed and on the path
- `ffmpeg` (only needed for Path A below)
- A YouTube channel + stream key for the destination (any test channel; YouTube Studio → Go Live → Stream → "Stream key")
- These three values from Dosh (paste into `.env` as you go):
  - `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` for the **Laravel producer IAM user**. This key only has `sqs:SendMessage` on the streaming queue — it cannot read the queue, scale workers, or do anything else, so it is safe to put on your laptop.
  - `LARAVEL_CALLBACK_TOKEN`. The worker uses this to authenticate its status callbacks. Must match what AWS Secrets Manager has — otherwise the worker's POSTs get 401 and your UI status pill never updates.

## Setup

```bash
# 1. Clone + install
git clone git@github.com:codinglabe/believe-app.git
cd believe-app
composer install
npm install

# 2. Env
cp .env.example .env
php8.2 artisan key:generate
```

Now edit `.env` and set:

```bash
STREAMING_SIMULATE_WORKER=false
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<paste from Dosh>
AWS_SECRET_ACCESS_KEY=<paste from Dosh>
SQS_STREAMING_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/999296086586/biu-stream-prod-streaming-queue
LARAVEL_CALLBACK_TOKEN=<paste from Dosh>
STREAMING_WORKER_RTMP_PULL_BASE=rtmp://stream.believeinunity.org:1935
# leave STREAMING_CALLBACK_BASE_URL blank for now — we set it in step 4
```

```bash
# 3. Local MySQL — one-liner
docker run -d --name biu-mysql \
  -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=believe \
  -e MYSQL_USER=believe -e MYSQL_PASSWORD=believe \
  -p 127.0.0.1:33066:3306 mysql:8.0
php8.2 artisan migrate

# 4. Public callback URL (so the AWS worker can POST status back to your laptop).
#    Open a second terminal and keep this running:
cloudflared tunnel --url http://localhost:8001
```

Cloudflared prints a URL like `https://<random-words>.trycloudflare.com`. Paste it into `.env`:

```bash
STREAMING_CALLBACK_BASE_URL=https://<random-words>.trycloudflare.com
```

```bash
# 5. Apply the env change
php8.2 artisan config:clear

# 6. Start Laravel — third terminal. composer dev needs Node ≥14; serve is the simple path:
php8.2 artisan serve --host=127.0.0.1 --port=8001
```

You now have:
- `localhost:8001` — Laravel, reachable from your browser
- `<random>.trycloudflare.com` — same Laravel, reachable from the AWS worker
- MySQL on `127.0.0.1:33066`

The AWS side (bridge, worker autoscaler, SQS) is already up — you don't need to start anything there.

## Path A — fast infrastructure smoke (no browser, no UI)

This is the fastest way to confirm Laravel ↔ SQS ↔ worker ↔ bridge ↔ YouTube all wire up. Skips the meeting flow; uses ffmpeg color-bars as the publisher.

In one terminal, start publishing color-bars to the MediaMTX bridge:

```bash
MEETING_ID="dev-$(whoami)-$(date +%s)"
echo "MEETING_ID=$MEETING_ID"
ffmpeg -re -f lavfi -i 'testsrc=size=1280x720:rate=30' \
       -f lavfi -i 'sine=frequency=1000' -pix_fmt yuv420p \
       -c:v libx264 -preset veryfast -tune zerolatency -profile:v main -g 60 \
       -b:v 2500k -maxrate 2500k -bufsize 5000k \
       -c:a aac -b:a 128k -ar 44100 -f flv \
       "rtmp://stream.believeinunity.org:1935/$MEETING_ID"
```

Leave that running — it is your stand-in for a browser publishing into the bridge. Frames will climb steadily; ignore the speed numbers.

In another terminal, fire the smoke job pointing at your YouTube key:

```bash
php8.2 artisan streaming:smoke \
  --meeting-id="$MEETING_ID" \
  --destination="rtmp://a.rtmp.youtube.com/live2/<YOUR_YOUTUBE_STREAM_KEY>" \
  --max-duration=3
```

The command prints the payload it sent to SQS. From here on, you watch the four signals below — you do **not** need AWS CLI to know what's happening.

## Path B — full UI flow (browser publisher via VDO.Ninja)

This is what an actual user will do, and what you should run before signing off on UI changes.

```bash
# Seed a user
php8.2 artisan tinker
>>> $u = App\Models\User::factory()->create(['email' => 'dev@example.test']);
>>> $u->forceFill(['password' => bcrypt('password')])->save();
>>> exit
```

Then in **Chrome 110+** (Firefox/Safari can negotiate AV1, which can't be relayed):

1. Open `http://localhost:8001/login` and log in as `dev@example.test` / `password`.
2. **Livestreams → Create new livestream**. Give it a title, save.
3. On the livestream page, click **"Add Stream Key"**, paste your YouTube stream key, save.
4. Click **"Start Meeting"**.
5. The page shows a **host push URL** — open it in a new tab. It's a VDO.Ninja link that already has `&mediamtx=stream.believeinunity.org&codec=h264` baked in, which routes your camera into the bridge. Grant camera + mic. Leave the tab visible — closing it stops the publish.
6. Back on the main livestream page, click **"Go Live"**.
7. Within ~30s of "Go Live", the status pill goes `starting` → `live`.
8. Open YouTube Studio to confirm the preview is showing.
9. Click **"End Stream"** when you're done.

## Four signals to watch (no AWS CLI required)

Open these in spare terminals/tabs:

| What | Where | What "good" looks like |
|---|---|---|
| Laravel HTTP requests | the `artisan serve` terminal | `POST /api/streaming/status …………… 200` lines appearing every few seconds while the stream is live |
| `streaming_jobs` table | `watch -n 2 'docker exec biu-mysql mysql -ubelieve -pbelieve believe -e "SELECT id, meeting_id, status, failure_reason FROM streaming_jobs ORDER BY id DESC LIMIT 3\G"'` | `status` walks `pending` → `starting` → `live` → `completed` |
| Cloudflared | the `cloudflared` terminal | request log entries; if you see nothing, the worker can't reach you |
| YouTube Studio | youtube.com/livestreaming | "LIVE" badge, healthy connection, ~720p |

The worker takes **up to ~60 seconds** to cold-start the first time after it's been idle (AWS autoscales from 0 on queue depth). Subsequent runs are instant if a worker is still warm.

## Common gotchas

- **Forgot `config:clear` after editing `.env`.** Laravel reads from a config cache; your tunnel URL change won't take effect until the cache is cleared. The Laravel serve terminal will keep using the old value silently. #1 cause of "callbacks never arrive."
- **Used `php` instead of `php8.2`.** System `php` is 8.1; composer/Pest will refuse. Always type `php8.2` explicitly.
- **Forgot to leave the meeting tab open in Path B.** When you close that Chrome tab, the bridge has no publisher, the worker reads nothing, and after ~10 retries the worker reports `status: failed`. Re-open the host push URL and click Go Live again.
- **Used Firefox / Safari.** VDO.Ninja negotiates AV1 there, which can't be re-muxed to RTMP. Stay on Chrome 110+.
- **`status: failed` at the end of a successful run.** Known cosmetic bug — the worker reports `failed` when the `max_duration_minutes` timer fires naturally. If YouTube Studio saw the stream and the row's `duration_minutes` matches the configured cap, the run was actually successful. Will be fixed before launch.
- **Bridge regressions after ~2 days of bridge uptime.** Symptoms: worker logs `ffmpeg_retrying` 10 times then `failed`, your local ffmpeg publisher gets `Broken pipe` after ~30s. Tell Dosh — he force-redeploys the bridge in 90s. You don't need access for this.

## What you DON'T need

- AWS Console / IAM access — the producer IAM key in your `.env` is the only credential you use and it can only `sqs:SendMessage`. Try `aws sts get-caller-identity` with it and you'll get AccessDenied; that's expected.
- AWS CLI on your laptop. You can install it for convenience, but every signal you need is visible from Laravel + MySQL + YouTube Studio.
- Permission to scale the worker, restart the bridge, or change autoscaling settings. The bridge stays up; the worker scales from 0 to N automatically on queue depth and back down to 0 when idle. If something on the AWS side seems broken, message Dosh.

## Costs

Negligible per test. The worker is billed per second of Fargate runtime; a typical 3-minute smoke costs a fraction of a cent. The autoscaler drops back to 0 within ~5 minutes of the queue going empty. The bridge is paid for whether you're testing or not.

Just don't leave a `max-duration=30` smoke running and walk away.
