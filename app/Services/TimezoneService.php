<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TimezoneService
{
    /**
     * Get timezone based on IP address
     */
    public static function getTimezoneFromIp($ip = null)
    {
        try {
            // Get user's IP if not provided
            if (!$ip) {
                $ip = request()->ip();
            }

            // Skip for local/private IPs
            if (self::isPrivateIp($ip)) {
                // For local development, try to get from browser
                $browserTimezone = request()->header('X-Timezone');
                if ($browserTimezone && self::isValidTimezone($browserTimezone)) {
                    Log::info('Using browser timezone for local IP', [
                        'timezone' => $browserTimezone
                    ]);
                    return $browserTimezone;
                }
                return config('app.timezone', 'UTC');
            }

            // Use ipapi.co for timezone detection
            $response = Http::timeout(5)->get("http://ipapi.co/{$ip}/timezone/");
            
            if ($response->successful()) {
                $timezone = trim($response->body());
                
                // Validate timezone
                if (self::isValidTimezone($timezone)) {
                    Log::info('Timezone detected from IP', [
                        'ip' => $ip,
                        'timezone' => $timezone
                    ]);
                    return $timezone;
                }
            }

            // Fallback to browser timezone if available
            $browserTimezone = request()->header('X-Timezone');
            if ($browserTimezone && self::isValidTimezone($browserTimezone)) {
                Log::info('Using browser timezone', [
                    'timezone' => $browserTimezone
                ]);
                return $browserTimezone;
            }

        } catch (\Exception $e) {
            Log::warning('Timezone detection failed', [
                'ip' => $ip,
                'error' => $e->getMessage()
            ]);
        }

        // Default fallback - try browser timezone first
        $browserTimezone = request()->header('X-Timezone');
        if ($browserTimezone && self::isValidTimezone($browserTimezone)) {
            return $browserTimezone;
        }

        return config('app.timezone', 'UTC');
    }

    /**
     * Get timezone based on country code
     */
    public static function getTimezoneFromCountry($countryCode)
    {
        $countryTimezones = [
            'US' => 'America/New_York',
            'CA' => 'America/Toronto',
            'GB' => 'Europe/London',
            'DE' => 'Europe/Berlin',
            'FR' => 'Europe/Paris',
            'IT' => 'Europe/Rome',
            'ES' => 'Europe/Madrid',
            'AU' => 'Australia/Sydney',
            'JP' => 'Asia/Tokyo',
            'CN' => 'Asia/Shanghai',
            'IN' => 'Asia/Kolkata',
            'BR' => 'America/Sao_Paulo',
            'MX' => 'America/Mexico_City',
            'RU' => 'Europe/Moscow',
            'ZA' => 'Africa/Johannesburg',
            'EG' => 'Africa/Cairo',
            'NG' => 'Africa/Lagos',
            'KE' => 'Africa/Nairobi',
            'AR' => 'America/Argentina/Buenos_Aires',
            'CL' => 'America/Santiago',
            'CO' => 'America/Bogota',
            'PE' => 'America/Lima',
            'VE' => 'America/Caracas',
            'TH' => 'Asia/Bangkok',
            'VN' => 'Asia/Ho_Chi_Minh',
            'ID' => 'Asia/Jakarta',
            'MY' => 'Asia/Kuala_Lumpur',
            'SG' => 'Asia/Singapore',
            'PH' => 'Asia/Manila',
            'KR' => 'Asia/Seoul',
            'TW' => 'Asia/Taipei',
            'HK' => 'Asia/Hong_Kong',
            'NZ' => 'Pacific/Auckland',
            'TR' => 'Europe/Istanbul',
            'PL' => 'Europe/Warsaw',
            'NL' => 'Europe/Amsterdam',
            'BE' => 'Europe/Brussels',
            'CH' => 'Europe/Zurich',
            'AT' => 'Europe/Vienna',
            'SE' => 'Europe/Stockholm',
            'NO' => 'Europe/Oslo',
            'DK' => 'Europe/Copenhagen',
            'FI' => 'Europe/Helsinki',
            'IE' => 'Europe/Dublin',
            'PT' => 'Europe/Lisbon',
            'GR' => 'Europe/Athens',
            'CZ' => 'Europe/Prague',
            'HU' => 'Europe/Budapest',
            'RO' => 'Europe/Bucharest',
            'BG' => 'Europe/Sofia',
            'HR' => 'Europe/Zagreb',
            'SI' => 'Europe/Ljubljana',
            'SK' => 'Europe/Bratislava',
            'LT' => 'Europe/Vilnius',
            'LV' => 'Europe/Riga',
            'EE' => 'Europe/Tallinn',
            'UA' => 'Europe/Kiev',
            'BY' => 'Europe/Minsk',
            'MD' => 'Europe/Chisinau',
            'RS' => 'Europe/Belgrade',
            'BA' => 'Europe/Sarajevo',
            'ME' => 'Europe/Podgorica',
            'MK' => 'Europe/Skopje',
            'AL' => 'Europe/Tirane',
            'XK' => 'Europe/Pristina',
            'BD' => 'Asia/Dhaka', // Bangladesh
        ];

        $timezone = $countryTimezones[strtoupper($countryCode)] ?? config('app.timezone', 'UTC');
        
        Log::info('Timezone set from country', [
            'country' => $countryCode,
            'timezone' => $timezone
        ]);

        return $timezone;
    }

    /**
     * Get user's timezone with fallback chain
     */
    public static function getUserTimezone()
    {
        // 1. Try to get from user's stored preference
        if (\Illuminate\Support\Facades\Auth::check() && \Illuminate\Support\Facades\Auth::user()->timezone) {
            return \Illuminate\Support\Facades\Auth::user()->timezone;
        }

        // 2. Try to get from IP address
        $ipTimezone = self::getTimezoneFromIp();
        if ($ipTimezone !== config('app.timezone', 'UTC')) {
            return $ipTimezone;
        }

        // 3. Try to get from browser header
        $browserTimezone = request()->header('X-Timezone');
        if ($browserTimezone && self::isValidTimezone($browserTimezone)) {
            return $browserTimezone;
        }

        // 4. Default fallback
        return config('app.timezone', 'UTC');
    }

    /**
     * Check if IP is private/local
     */
    private static function isPrivateIp($ip)
    {
        return filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false;
    }

    /**
     * Validate timezone
     */
    private static function isValidTimezone($timezone)
    {
        return in_array($timezone, timezone_identifiers_list());
    }

    /**
     * Convert datetime to user's timezone
     */
    public static function convertToUserTimezone($datetime, $timezone = null)
    {
        if (!$timezone) {
            $timezone = self::getUserTimezone();
        }

        try {
            return \Carbon\Carbon::parse($datetime)->setTimezone($timezone);
        } catch (\Exception $e) {
            Log::warning('Timezone conversion failed', [
                'datetime' => $datetime,
                'timezone' => $timezone,
                'error' => $e->getMessage()
            ]);
            return \Carbon\Carbon::parse($datetime);
        }
    }

    /**
     * Convert datetime from user's timezone to UTC
     */
    public static function convertFromUserTimezone($datetime, $timezone = null)
    {
        if (!$timezone) {
            $timezone = self::getUserTimezone();
        }

        try {
            return \Carbon\Carbon::parse($datetime, $timezone)->utc();
        } catch (\Exception $e) {
            Log::warning('Timezone conversion failed', [
                'datetime' => $datetime,
                'timezone' => $timezone,
                'error' => $e->getMessage()
            ]);
            return \Carbon\Carbon::parse($datetime);
        }
    }
}
