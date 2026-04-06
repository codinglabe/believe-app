<?php

if (!function_exists('is_livestock_domain')) {
    /**
     * Check if the current request is on the livestock domain.
     *
     * @return bool
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



