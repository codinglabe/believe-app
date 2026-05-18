<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

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

        $browserTimezone = $request->header('X-Timezone');

        // Only the web guard uses App\Models\User and the users.timezone column.
        // Default Auth::user() can be a Merchant (e.g. AUTH_GUARD=merchant), which would make
        // User::find($id) return null and crash SessionGuard::setUser(null).
        $webUser = Auth::guard('web')->user();
        if ($webUser instanceof User) {
            if ($browserTimezone && $this->isValidTimezone($browserTimezone)) {
                $timezone = $browserTimezone;
                if (! $webUser->timezone || $webUser->timezone !== $browserTimezone) {
                    User::query()->whereKey($webUser->getKey())->update(['timezone' => $browserTimezone]);
                    $reloaded = User::query()->find($webUser->getKey());
                    if ($reloaded instanceof User) {
                        Auth::guard('web')->setUser($reloaded);
                    }
                }
            } elseif ($webUser->timezone) {
                $timezone = $webUser->timezone;
            }
        } elseif (Auth::guard('merchant')->check() || Auth::guard('livestock')->check()) {
            // Merchant / livestock accounts do not use users.timezone; prefer browser when valid.
            if ($browserTimezone && $this->isValidTimezone($browserTimezone)) {
                $timezone = $browserTimezone;
            }
        } elseif ($browserTimezone && $this->isValidTimezone($browserTimezone)) {
            $timezone = $browserTimezone;
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
