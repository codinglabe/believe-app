<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'stripe' => [
        'secret' => env('STRIPE_SECRET'),
        'live_key' => env('STRIPE_LIVE_KEY'),
        'live_secret' => env('STRIPE_LIVE_SECRET'),
    ],

    'plaid' => [
        'client_id' => env('PLAID_CLIENT_ID'),
        'secret' => env('PLAID_SECRET'),
        'environment' => env('PLAID_ENVIRONMENT', 'sandbox'), // sandbox, development, production
        'webhook_url' => env('PLAID_WEBHOOK_URL'),
    ],

    'twilio' => [
        'sid' => env('TWILIO_ACCOUNT_SID'),
        'token' => env('TWILIO_AUTH_TOKEN'),
        'whatsapp_from' => env('TWILIO_FROM', 'whatsapp:+14155238886'),
    ],


    'firebase' => [
        'project_id' => env('FIREBASE_PROJECT_ID'),
        'credentials' => env('FIREBASE_CREDENTIALS', 'app/firebase/firebase-credentials.json'),
        'vapid_key' => env('FIREBASE_VAPID_KEY'),
    ],

    'openai' => [
        'api_key' => env('OPENAI_API_KEY'),
    ],

    'gmail' => [
        'client_id' => env('GMAIL_CLIENT_ID'),
        'client_secret' => env('GMAIL_CLIENT_SECRET'),
        'redirect_uri' => env('GMAIL_REDIRECT_URI', env('APP_URL') . '/email-invite/callback'),
    ],

    'outlook' => [
        'client_id' => env('OUTLOOK_CLIENT_ID'),
        'client_secret' => env('OUTLOOK_CLIENT_SECRET'),
        'redirect_uri' => env('OUTLOOK_REDIRECT_URI', env('APP_URL') . '/email-invite/callback'),
    ],

    'facebook' => [
        'app_id' => env('FACEBOOK_APP_ID'),
        'app_secret' => env('FACEBOOK_APP_SECRET'),
        'redirect_uri' => env('FACEBOOK_REDIRECT_URI', env('APP_URL') . '/facebook/callback'),
        'default_graph_version' => 'v21.0',
    ],

    'bridge' => [
        'api_key' => env('BRIDGE_API_KEY'),
        'environment' => env('BRIDGE_ENVIRONMENT', 'production'), // sandbox or production
        'base_url' => env('BRIDGE_BASE_URL'), // Will be set in BridgeService based on environment
        'webhook_secret' => env('BRIDGE_WEBHOOK_SECRET'),
        'redirect_uri' => env('BRIDGE_REDIRECT_URI'), // Public URL for TOS callback (e.g., ngrok for local dev)
    ],

    'youtube' => [
        'api_key' => env('YOUTUBE_API_KEY', env('VITE_YOUTUBE_API_KEY')),
        'client_id' => env('YOUTUBE_CLIENT_ID', env('GOOGLE_CLIENT_ID')),
        'client_secret' => env('YOUTUBE_CLIENT_SECRET', env('GOOGLE_CLIENT_SECRET')),
        'redirect_uri' => env('YOUTUBE_REDIRECT_URI', env('APP_URL') . '/integrations/youtube/callback'),
    ],

    'phaze' => [
        'api_key' => env('PHAZE_API_KEY'),
        'api_secret' => env('PHAZE_API_SECRET'),
        'base_url' => env('PHAZE_BASE_URL', 'https://api.phaze.io'),
        'environment' => env('PHAZE_ENVIRONMENT', 'sandbox'), // sandbox or production
        'gift_card_platform_commission_percentage' => env('GIFT_CARD_PLATFORM_COMMISSION_PERCENTAGE', 8), // Platform commission percentage (8% default)
        // Note: webhook_api_key is now stored in database (phaze_webhooks table)
        // No need to set PHAZE_WEBHOOK_API_KEY in .env anymore
    ],

    'mediamtx' => [
        // Public URL where users open the browser publish page (e.g. https://stream.yourapp.com). Required for "Go Live from browser" (no OBS).
        'publish_url' => env('MEDIAMTX_PUBLISH_URL', ''),
        // Internal RTMP URL for FFmpeg to pull from (e.g. rtmp://127.0.0.1:1935). Same server as MediaMTX.
        'rtmp_internal' => env('MEDIAMTX_RTMP_INTERNAL', 'rtmp://127.0.0.1:1935'),
    ],

    'dropbox' => [
        'client_id' => env('DROPBOX_CLIENT_ID'),
        'client_secret' => env('DROPBOX_CLIENT_SECRET'),
        'redirect_uri' => env('DROPBOX_REDIRECT_URI', env('APP_URL') . '/integrations/dropbox/callback'),
        'access_token' => env('DROPBOX_ACCESS_TOKEN'), // optional: app-level token for legacy use
        // SSL: set DROPBOX_SSL_VERIFY=false on Windows/local if you get "cURL error 60: unable to get local issuer certificate"
        'verify' => filter_var(env('DROPBOX_SSL_VERIFY', true), FILTER_VALIDATE_BOOLEAN),
    ],

    'irs' => [
        'download_timeout' => (int) env('IRS_DOWNLOAD_TIMEOUT', 900), // seconds per ZIP (15 min default)
        'download_retries' => (int) env('IRS_DOWNLOAD_RETRIES', 3),
        // Job timeout: large ZIPs may need 2–4 hours. Set IRS_JOB_TIMEOUT=14400 for 4 hours.
        'job_timeout' => (int) env('IRS_JOB_TIMEOUT', 7200), // seconds per ProcessIrsZipJob (2 hours default)
        // SSL: set IRS_SSL_VERIFY=false on Windows/local if you get "cURL error 60: unable to get local issuer certificate"
        'ssl_verify' => env('IRS_SSL_VERIFY', true),
        'cafile' => env('IRS_CAFILE', null), // optional: path to cacert.pem (e.g. from https://curl.se/ca/cacert.pem)
    ],

];
