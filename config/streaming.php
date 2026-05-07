<?php

return [
    'region' => env('AWS_REGION', env('AWS_DEFAULT_REGION', 'us-east-1')),
    'aws_key' => env('AWS_ACCESS_KEY_ID'),
    'aws_secret' => env('AWS_SECRET_ACCESS_KEY'),
    'queue_url' => env('SQS_STREAMING_QUEUE_URL'),
    'callback_token' => env('LARAVEL_CALLBACK_TOKEN'),

    /*
     * Public base URL AWS workers must use to POST /api/streaming/status.
     * Leave empty to use APP_URL (route(...)) — localhost will NOT receive callbacks from AWS.
     *
     * Local + real worker: expose this app via ngrok/Cloudflare Tunnel and set e.g.
     *   STREAMING_CALLBACK_BASE_URL=https://abc123.ngrok-free.app
     * (same host where Laravel answers; bearer token unchanged)
     */
    'callback_base_url' => env('STREAMING_CALLBACK_BASE_URL'),
    'max_duration_minutes' => (int) env('STREAMING_MAX_DURATION_MINUTES', 120),
    // FFmpeg source URL template for worker jobs.
    // Placeholders: {room} {room_slug} {livestream_id} {user_id} {organization_id} {mediamtx_path}
    'worker_source_url_template' => env('STREAMING_WORKER_SOURCE_URL_TEMPLATE', ''),
    // RTMP base URL worker can pull from when no template is provided.
    // If empty, falls back to MEDIAMTX_RTMP_PUBLIC from config/services.php.
    'worker_rtmp_pull_base' => env('STREAMING_WORKER_RTMP_PULL_BASE', ''),

    /*
     * SQS uses the AWS SDK (Guzzle/cURL). On some Windows PHP installs you get
     * "cURL error 60: unable to get local issuer certificate".
     *
     * Preferred: download https://curl.se/ca/cacert.pem and set either env:
     *   AWS_CA_BUNDLE=C:\path\to\cacert.pem
     *   STREAMING_AWS_CA_BUNDLE=C:\path\to\cacert.pem
     *
     * Local-only fallback (insecure — do not use in production):
     *   STREAMING_HTTP_VERIFY=false
     */
    'aws_ca_bundle' => env('AWS_CA_BUNDLE', env('STREAMING_AWS_CA_BUNDLE')),
    'http_verify' => filter_var(
        env('STREAMING_HTTP_VERIFY', true),
        FILTER_VALIDATE_BOOLEAN
    ),
    'billing' => [
        'free_minutes_per_month' => (int) env('STREAMING_FREE_MINUTES_PER_MONTH', 1800),
        'rate_cents_per_hour' => (int) env('STREAMING_RATE_CENTS_PER_HOUR', 8),
    ],

    /*
     * Without a real ECS/Lambda/etc. worker that polls SQS and POSTs /api/streaming/status,
     * meetings stay queued forever and never show "live".
     *
     * Local / staging only — skips SQS and applies starting → live in-process:
     *   STREAMING_SIMULATE_WORKER=true
     * Ignored in production unless:
     *   STREAMING_SIMULATE_WORKER_FORCE=true
     */
    'simulate_worker' => filter_var(
        env('STREAMING_SIMULATE_WORKER', false),
        FILTER_VALIDATE_BOOLEAN
    ),
    'simulate_worker_force' => filter_var(
        env('STREAMING_SIMULATE_WORKER_FORCE', false),
        FILTER_VALIDATE_BOOLEAN
    ),
];
