<?php

use Illuminate\Http\Request;

test('phone user agents are detected as mobile clients', function () {
    $request = Request::create('/', 'GET', [], [], [], [
        'HTTP_USER_AGENT' => 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    ]);

    expect(request_is_mobile_phone_client($request))->toBeTrue();
});

test('android phone user agents are detected as mobile clients', function () {
    $request = Request::create('/', 'GET', [], [], [], [
        'HTTP_USER_AGENT' => 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
    ]);

    expect(request_is_mobile_phone_client($request))->toBeTrue();
});

test('desktop user agents are not treated as mobile clients', function () {
    $request = Request::create('/', 'GET', [], [], [], [
        'HTTP_USER_AGENT' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ]);

    expect(request_is_mobile_phone_client($request))->toBeFalse();
});

test('sec-ch-ua-mobile header marks phone clients', function () {
    $request = Request::create('/', 'GET', [], [], [], [
        'HTTP_USER_AGENT' => 'Mozilla/5.0',
        'HTTP_SEC_CH_UA_MOBILE' => '?1',
    ]);

    expect(request_is_mobile_phone_client($request))->toBeTrue();
});

test('installed pwa cookie with phone user agent marks mobile clients', function () {
    $request = Request::create('/', 'GET', [], [
        'biu_pwa_standalone' => '1',
    ], [], [
        'HTTP_USER_AGENT' => 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    ]);

    expect(request_is_mobile_phone_client($request))->toBeTrue();
});
