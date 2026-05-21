<?php

/**
 * Facebook Page integration (App Review + runtime).
 *
 * Scopes must match what you submit in Meta App Review. Do not request permissions
 * that are not used in the UI flows below /facebook/connect and /facebook/posts.
 */
return [
    'api_version' => env('FACEBOOK_API_VERSION', env('FACEBOOK_DEFAULT_GRAPH_VERSION', 'v21.0')),

    /**
     * Permissions requested during OAuth (comma-separated in dialog).
     * public_profile is included automatically by Facebook Login; listed for in-app disclosure.
     */
    'scopes' => [
        'pages_show_list',
        'pages_read_engagement',
        'pages_manage_posts',
    ],

    'oauth' => [
        'session_key' => 'facebook_oauth_pending',
        'session_ttl_minutes' => 30,
    ],

    /** Meta Developer → Basic → User data deletion → Data deletion instructions URL */
    'data_deletion_url' => env('FACEBOOK_DATA_DELETION_URL', env('APP_URL', 'http://127.0.0.1:8000').'/data-deletion'),
];
