<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Test / sandbox entity identification (NOT per-row flags — pattern match)
    |--------------------------------------------------------------------------
    |
    | Used by TestDataAuditService and test-data:audit to find seeded/demo accounts
    | and count (or optionally purge) associated wallet, Bridge, Stripe, donation data.
    |
    */

    'user_email_patterns' => [
        '%@501c3ers.com',
        '%@test.com',
        '%@example.com',
        '%@merchant.com',
        'org.test@%',
        'contact@testnonprofit.org',
    ],

    'user_email_exact' => [
        'admin@501c3ers.com',
        'organization@501c3ers.com',
        'supporter@501c3ers.com',
        'merchant@test.com',
        'admin@merchant.com',
    ],

    'organization_eins' => [
        '001028397', // testUserSeeder
    ],

    'organization_name_patterns' => [
        '%TEST ORGANIZATION%',
        '%Fake %', // ExploreByCauseFakeDataSeeder
    ],

    'organization_ein_patterns' => [
        '99-%', // demo fake EINs
    ],

    /*
    | Allow destructive purge on production (default: local/development/testing only).
    | Set TEST_DATA_PURGE=true in .env to enable delete via seeder or --delete --force.
    */
    'allow_purge_envs' => ['local', 'development', 'testing'],

];
