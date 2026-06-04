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
     * Persist the viewer's IANA timezone (browser header → users.timezone).
     * Application config stays UTC so DB timestamps are not reinterpreted per request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $browserTimezone = $request->header('X-Timezone');

        $webUser = Auth::guard('web')->user();
        if ($webUser instanceof User) {
            if ($browserTimezone && $this->isValidTimezone($browserTimezone)) {
                if (! $webUser->timezone || $webUser->timezone !== $browserTimezone) {
                    User::query()->whereKey($webUser->getKey())->update(['timezone' => $browserTimezone]);
                    $reloaded = User::query()->find($webUser->getKey());
                    if ($reloaded instanceof User) {
                        Auth::guard('web')->setUser($reloaded);
                    }
                }
            }
        }

        return $next($request);
    }

    private function isValidTimezone($timezone): bool
    {
        if (empty($timezone)) {
            return false;
        }

        return in_array($timezone, timezone_identifiers_list());
    }
}
