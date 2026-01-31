<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Auth;

class DetectTimezone
{
    /**
     * Handle an incoming request.
     * Sets the application timezone for the entire request lifecycle.
     * This applies to all Carbon dates, Laravel's now(), and PHP date functions.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $timezone = 'UTC'; // Default
        
        if (Auth::check()) {
            $user = Auth::user();
            $browserTimezone = $request->header('X-Timezone');
            
            // Priority: Browser timezone > User's stored timezone
            if ($browserTimezone && $this->isValidTimezone($browserTimezone)) {
                $timezone = $browserTimezone;
                // Update user's timezone in database if different
                if (!$user->timezone || $user->timezone !== $browserTimezone) {
                    \App\Models\User::where('id', $user->id)->update(['timezone' => $browserTimezone]);
                    // Reload user
                    $user = \App\Models\User::find($user->id);
                    Auth::setUser($user);
                }
            } elseif ($user->timezone) {
                // Use stored timezone from database
                $timezone = $user->timezone;
            }
        } else {
            // For guests, try browser timezone
            $browserTimezone = $request->header('X-Timezone');
            if ($browserTimezone && $this->isValidTimezone($browserTimezone)) {
                $timezone = $browserTimezone;
            }
        }
        
        // Set timezone for the entire application
        // 1. Laravel config (used by Carbon and Laravel's date helpers like now(), today())
        config(['app.timezone' => $timezone]);
        
        // 2. PHP's default timezone (used by date(), DateTime, Carbon::now(), etc.)
        // Carbon automatically uses PHP's default timezone, so this covers everything
        date_default_timezone_set($timezone);

        return $next($request);
    }
    
    /**
     * Validate timezone
     */
    private function isValidTimezone($timezone)
    {
        if (empty($timezone)) {
            return false;
        }
        return in_array($timezone, timezone_identifiers_list());
    }
}
