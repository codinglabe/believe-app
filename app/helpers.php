<?php

if (! function_exists('request_is_merchant_portal')) {
    /**
     * True when the request is on the merchant portal host (see config('merchant.domain')).
     */
    function request_is_merchant_portal(?\Illuminate\Http\Request $request = null): bool
    {
        $request ??= function_exists('request') ? request() : null;

        if (! $request instanceof \Illuminate\Http\Request) {
            return false;
        }

        $host = strtolower($request->getHost());
        $configured = config('merchant.domain');

        if (is_string($configured) && $configured !== '') {
            $normalized = $configured;
            if (str_contains($normalized, '://')) {
                $normalized = (string) parse_url($normalized, PHP_URL_HOST);
            }
            $normalized = strtolower(explode(':', $normalized)[0]);

            if ($normalized !== '' && $host === $normalized) {
                return true;
            }
        }

        return str_contains($host, 'merchant.');
    }
}

if (! function_exists('is_livestock_domain')) {
    /**
     * Check if the current request is on the livestock domain.
     */
    function is_livestock_domain(): bool
    {
        $livestockDomain = config('livestock.domain');

        // Extract hostname from domain (remove protocol if present)
        $domainHost = $livestockDomain;
        if (str_contains($livestockDomain, '://')) {
            $parsed = parse_url($livestockDomain);
            $domainHost = $parsed['host'] ?? $livestockDomain;
        } else {
            $domainHost = explode('/', $livestockDomain)[0];
            $domainHost = explode(':', $domainHost)[0];
        }

        return strtolower(request()->getHost()) === strtolower($domainHost);
    }
}

if (! function_exists('streaming_status_callback_url')) {
    /**
     * Absolute URL enqueued for the AWS streaming worker to report status.
     * When STREAMING_CALLBACK_BASE_URL is set (e.g. ngrok), AWS can reach your local Laravel.
     */
    function streaming_status_callback_url(): string
    {
        $base = trim((string) config('streaming.callback_base_url'));

        if ($base !== '') {
            return rtrim($base, '/').'/api/streaming/status';
        }

        return route('api.streaming.status');
    }
}

if (! function_exists('is_development_site')) {
    /**
     * True on the staging host (501c3ers.com). Not used on production or merchant portal.
     */
    function is_development_site(?\Illuminate\Http\Request $request = null): bool
    {
        $request ??= function_exists('request') ? request() : null;

        if (! $request instanceof \Illuminate\Http\Request || request_is_merchant_portal($request)) {
            return false;
        }

        $host = strtolower($request->getHost());
        $hosts = config('app.development_hosts', []);

        if ($hosts === []) {
            $hosts = ['501c3ers.com', 'www.501c3ers.com'];
        }

        return in_array($host, $hosts, true);
    }
}

if (! function_exists('app_version')) {
    function app_version(): string
    {
        return \App\Support\AppVersion::current();
    }
}

if (! function_exists('request_is_mobile_phone_client')) {
    /**
     * True for phone browsers and installed PWA sessions on phones.
     * Desktop browsers (including narrow viewports) are excluded.
     */
    function request_is_mobile_phone_client(?\Illuminate\Http\Request $request = null): bool
    {
        $request ??= function_exists('request') ? request() : null;

        if (! $request instanceof \Illuminate\Http\Request) {
            return false;
        }

        $userAgent = $request->userAgent() ?? '';

        if ($request->cookie('biu_pwa_standalone') === '1' && request_user_agent_looks_like_phone($userAgent)) {
            return true;
        }

        if ($request->header('Sec-CH-UA-Mobile') === '?1') {
            return true;
        }

        return request_user_agent_looks_like_phone($userAgent);
    }
}

if (! function_exists('request_user_agent_looks_like_phone')) {
    /**
     * Detect phone-class user agents. Excludes typical desktop and tablet UAs.
     */
    function request_user_agent_looks_like_phone(string $userAgent): bool
    {
        if ($userAgent === '') {
            return false;
        }

        return (bool) preg_match(
            '/iPhone|iPod|Android.*Mobile|Mobile.*Android|webOS|BlackBerry|IEMobile|Opera Mini/i',
            $userAgent
        );
    }
}
