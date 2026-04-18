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
