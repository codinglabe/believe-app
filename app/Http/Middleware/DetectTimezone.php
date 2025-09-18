<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Services\TimezoneService;
use Illuminate\Support\Facades\Auth;

class DetectTimezone
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Only detect timezone for authenticated users
        if (Auth::check()) {
            $user = Auth::user();
            
            // If user doesn't have timezone set, detect and save it
            if (!$user->timezone) {
                $timezone = TimezoneService::getUserTimezone();
                
                // Save timezone to user profile
                \App\Models\User::where('id', $user->id)->update(['timezone' => $timezone]);
                
                // Set timezone in session for immediate use
                session(['user_timezone' => $timezone]);
            } else {
                // Use stored timezone
                session(['user_timezone' => $user->timezone]);
            }
        } else {
            // For guest users, detect timezone but don't save
            $timezone = TimezoneService::getUserTimezone();
            session(['user_timezone' => $timezone]);
        }

        return $next($request);
    }
}
