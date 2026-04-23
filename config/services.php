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
        /**
         * Stripe Tax: when true, Checkout Sessions pass automatic_tax.enabled (gift cards, donations, etc.).
         * You must complete Stripe Dashboard → Tax first, including a valid head office / origin address.
         * Test mode: https://dashboard.stripe.com/test/settings/tax — without this, Stripe returns
         * "You must have a valid head office address to enable automatic tax calculation in test mode."
         * Set STRIPE_AUTOMATIC_TAX=false until Tax settings are done, then turn it back on.
         */
        'automatic_tax' => filter_var(env('STRIPE_AUTOMATIC_TAX', false), FILTER_VALIDATE_BOOLEAN),
        /** Default Stripe product tax codes (see Stripe Tax settings). */
        'tax_code_physical' => env('STRIPE_TAX_CODE_PHYSICAL', 'txcd_99999999'),
        'tax_code_digital' => env('STRIPE_TAX_CODE_DIGITAL', 'txcd_10000000'),
        /** Course enrollment Checkout line items (Stripe Tax product tax codes). */
        'tax_code_course_digital' => env('STRIPE_TAX_CODE_COURSE_DIGITAL', env('STRIPE_TAX_CODE_DIGITAL', 'txcd_10000000')),
        'tax_code_course_physical' => env('STRIPE_TAX_CODE_COURSE_PHYSICAL', env('STRIPE_TAX_CODE_PHYSICAL', 'txcd_99999999')),
        /** BIU: delivery + content mapping (Stripe Tax product tax codes). */
        'tax_code_live_virtual_training' => env('STRIPE_TAX_CODE_LIVE_VIRTUAL_TRAINING', 'txcd_20060045'),
        'tax_code_self_study_web' => env('STRIPE_TAX_CODE_SELF_STUDY_WEB', 'txcd_20060058'),
        'tax_code_on_demand_written' => env('STRIPE_TAX_CODE_ON_DEMAND_WRITTEN', 'txcd_20060358'),
        'tax_code_streamed_prerecorded' => env('STRIPE_TAX_CODE_STREAMED_PRERECORDED', 'txcd_20060158'),
        'tax_code_streamed_downloadable' => env('STRIPE_TAX_CODE_STREAMED_DOWNLOADABLE', 'txcd_20060258'),
        'tax_code_tangible_goods' => env('STRIPE_TAX_CODE_TANGIBLE_GOODS', 'txcd_99999999'),
        /**
         * When course tax_classification is partial_taxable, split the gross charge (after processing-fee gross-up)
         * across two line items (digital instruction vs materials) for Stripe Tax. Replace with explicit
         * materials/course fee fields on the course when you want exact amounts from course managers.
         */
        'course_partial_materials_ratio' => (float) env('STRIPE_COURSE_PARTIAL_MATERIALS_RATIO', 0.35),
        'tax_code_shipping' => env('STRIPE_TAX_CODE_SHIPPING', 'txcd_92010001'),
        /**
         * When true, card/ACH checkout amounts are grossed up so estimated net after Stripe
         * processing fees matches the product/service total (customer pays the fee).
         * Donations keep their own "donor covers fees" toggle; Believe Points checkout already grosses up.
         */
        'customer_pays_processing_fee' => filter_var(env('STRIPE_CUSTOMER_PAYS_PROCESSING_FEE', false), FILTER_VALIDATE_BOOLEAN),
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
        /** E.164 sender for SMS (e.g. +15551234567). Not used for WhatsApp. */
        'sms_from' => env('TWILIO_SMS_FROM'),
        /** Optional: use a Messaging Service SID instead of sms_from. */
        'sms_messaging_service_sid' => env('TWILIO_SMS_SERVICE_SID'),
        /**
         * Force account mode in errors/logs: trial, full, or auto (fetch from Twilio API).
         * Use when API lookup is wrong or unavailable.
         */
        'account_mode' => env('TWILIO_ACCOUNT_MODE', 'auto'),

        /**
         * SSL for Twilio API (cURL). On Windows, set cafile to https://curl.se/ca/cacert.pem or TWILIO_VERIFY_SSL=false for local dev only.
         */
        'verify_ssl' => filter_var(env('TWILIO_VERIFY_SSL', true), FILTER_VALIDATE_BOOL),
        'cafile' => env('TWILIO_CAFILE'),
    ],

    'firebase' => [
        'project_id' => env('FIREBASE_PROJECT_ID'),
        'credentials' => env('FIREBASE_CREDENTIALS', 'app/firebase/firebase-credentials.json'),
        'vapid_key' => env('FIREBASE_VAPID_KEY'),
        /**
         * OAuth + FCM use Guzzle/cURL. On Windows, "SSL certificate problem: unable to get local issuer certificate"
         * is common until php.ini curl.cainfo is set — or set FIREBASE_CAFILE to https://curl.se/ca/cacert.pem path.
         * For local dev only you may set FIREBASE_VERIFY_SSL=false (never in production).
         */
        'verify_ssl' => filter_var(env('FIREBASE_VERIFY_SSL', true), FILTER_VALIDATE_BOOL),
        'cafile' => env('FIREBASE_CAFILE'),
    ],

    'openai' => [
        'api_key' => env('OPENAI_API_KEY'),
        // Set to false only on local/dev if you get "SSL certificate problem: unable to get local issuer certificate"
        'verify_ssl' => env('OPENAI_VERIFY_SSL', true),
    ],

    /*
    | Newsletter / template AI HTML generation (OpenAI JSON mode).
    | Default model is gpt-4o-mini (good layout quality vs cost). Override with NEWSLETTER_AI_MODEL in .env.
    | Keep max_output_tokens <= 4096 unless your model supports higher (otherwise OpenAI returns HTTP 400).
    */
    'newsletter_ai' => [
        'model' => env('NEWSLETTER_AI_MODEL', 'gpt-4o-mini'),
        'temperature' => (float) env('NEWSLETTER_AI_TEMPERATURE', 0.74),
        'max_output_tokens' => (int) env('NEWSLETTER_AI_MAX_TOKENS', 4096),
    ],

    /*
    | AI ingest of local kiosk providers when supporters save city/state on profile.
    */
    'kiosk_provider_ingest' => [
        'enabled' => env('KIOSK_PROVIDER_INGEST_ENABLED', true),
        'cache_ttl_days' => (int) env('KIOSK_GEO_CACHE_TTL_DAYS', 30),
        'model' => env('KIOSK_PROVIDER_INGEST_MODEL', 'gpt-3.5-turbo'),
        /** Max completion tokens (raise if JSON is truncated; model caps still apply). */
        'max_output_tokens' => (int) env('KIOSK_PROVIDER_INGEST_MAX_TOKENS', 4096),
        /** When true, `kiosk:refresh-provider-ingest` runs from the scheduler (monthly). */
        'monthly_refresh_enabled' => env('KIOSK_PROVIDER_MONTHLY_REFRESH_ENABLED', true),
    ],

    /*
    | Level Up / Challenge Hub quiz: OpenAI generation and points.
    | Default: gpt-3.5-turbo. Override with CHALLENGE_QUIZ_AI_MODEL in .env if needed.
    */
    'challenge_quiz' => [
        'model' => env('CHALLENGE_QUIZ_AI_MODEL', 'gpt-3.5-turbo'),
        'max_output_tokens' => (int) env('CHALLENGE_QUIZ_AI_MAX_TOKENS', 4096),
        /** Reward points per correct answer */
        'points_per_correct' => (float) env('CHALLENGE_QUIZ_POINTS_PER_CORRECT', 10),
        /** Deducted on wrong / timeout (defaults to same as correct when env omitted) */
        'points_per_incorrect' => (float) env('CHALLENGE_QUIZ_POINTS_PER_INCORRECT', env('CHALLENGE_QUIZ_POINTS_PER_CORRECT', 10)),
        /** @deprecated No longer enforced (generation is not cache-limited). Kept for .env compatibility. */
        'max_openai_batches_per_user_category_per_day' => (int) env('CHALLENGE_QUIZ_MAX_AI_BATCHES_PER_DAY', 20),
        /** Questions per OpenAI batch when pool is empty */
        'openai_batch_size' => (int) env('CHALLENGE_QUIZ_AI_BATCH_SIZE', 8),
    ],

    /*
    | Challenge Hub: admin-generated cover art (OpenAI Images API, stored on public disk).
    | Default dall-e-2 + 512x512 keeps cost low; resized to image_max_width for smaller files.
    */
    'challenge_hub' => [
        'image_model' => env('CHALLENGE_HUB_IMAGE_MODEL', 'dall-e-2'),
        'image_size' => env('CHALLENGE_HUB_IMAGE_SIZE', '512x512'),
        'image_max_width' => (int) env('CHALLENGE_HUB_IMAGE_MAX_WIDTH', 384),
        'image_prompt_suffix' => env('CHALLENGE_HUB_IMAGE_PROMPT_SUFFIX', 'Isolated subject, centered, simple illustration, generous empty space around the subject, no text, no border, crisp edges, dark purple / gold palette, suitable for overlay on a dark UI (not a full scene).'),
    ],

    'gmail' => [
        'client_id' => env('GMAIL_CLIENT_ID'),
        'client_secret' => env('GMAIL_CLIENT_SECRET'),
        'redirect_uri' => env('GMAIL_REDIRECT_URI', env('APP_URL').'/email-invite/callback'),
    ],

    'outlook' => [
        'client_id' => env('OUTLOOK_CLIENT_ID'),
        'client_secret' => env('OUTLOOK_CLIENT_SECRET'),
        'redirect_uri' => env('OUTLOOK_REDIRECT_URI', env('APP_URL').'/email-invite/callback'),
    ],

    'facebook' => [
        'app_id' => env('FACEBOOK_APP_ID'),
        'app_secret' => env('FACEBOOK_APP_SECRET'),
        'redirect_uri' => env('FACEBOOK_REDIRECT_URI', env('APP_URL').'/facebook/callback'),
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
        'redirect_uri' => env('YOUTUBE_REDIRECT_URI', env('APP_URL').'/integrations/youtube/callback'),
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
        'redirect_uri' => env('DROPBOX_REDIRECT_URI', env('APP_URL').'/integrations/dropbox/callback'),
        'access_token' => env('DROPBOX_ACCESS_TOKEN'), // optional: app-level token for legacy use
        // SSL: set DROPBOX_SSL_VERIFY=false on Windows/local if you get "cURL error 60: unable to get local issuer certificate"
        'verify' => filter_var(env('DROPBOX_SSL_VERIFY', true), FILTER_VALIDATE_BOOLEAN),
    ],

    /*
    | Optional: nonprofit org pool listings (organization adopts merchant SKUs). Hub checkout no longer requires this.
    */
    'marketplace' => [
        'pool_listing_organization_id' => env('MARKETPLACE_POOL_LISTING_ORGANIZATION_ID'),
    ],

    'shippo' => [
        'api_key' => env('SHIPPO_API_KEY'),
        'api_base' => env('SHIPPO_API_BASE', 'https://api.goshippo.com'),
        // When true, Shippo sets extra.bypass_address_validation on shipments (USPS/UPS/LaserShip) so
        // real customer addresses that fail strict CASS "Address not found" can still get rates/labels.
        'bypass_address_validation' => filter_var(env('SHIPPO_BYPASS_ADDRESS_VALIDATION', 'true'), FILTER_VALIDATE_BOOLEAN),
        // USPS requires non-empty seller (ship-from) email AND phone. Used when org/user data is incomplete.
        'fallback_seller_email' => env('SHIPPO_FALLBACK_SELLER_EMAIL', env('MAIL_FROM_ADDRESS')),
        // Last-resort US digits only if nothing else is set (override in production via SHIPPO_FALLBACK_SELLER_PHONE).
        'fallback_seller_phone' => env('SHIPPO_FALLBACK_SELLER_PHONE', '5555555555'),
        // Webhook URL: {APP_URL}/api/webhooks/shippo — optional security (Shippo docs: HMAC or ?token=)
        'webhook_hmac_secret' => env('SHIPPO_WEBHOOK_HMAC_SECRET'),
        'webhook_query_token' => env('SHIPPO_WEBHOOK_TOKEN'),
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
