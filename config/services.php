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

    'phaze' => [
        'api_key' => env('PHAZE_API_KEY'),
        'api_secret' => env('PHAZE_API_SECRET'),
        'base_url' => env('PHAZE_BASE_URL', 'https://api.phaze.io'),
        'environment' => env('PHAZE_ENVIRONMENT', 'sandbox'), // sandbox or production
        'gift_card_platform_commission_percentage' => env('GIFT_CARD_PLATFORM_COMMISSION_PERCENTAGE', 8), // Platform commission percentage (8% default)
        // Note: webhook_api_key is now stored in database (phaze_webhooks table)
        // No need to set PHAZE_WEBHOOK_API_KEY in .env anymore
    ],

];
