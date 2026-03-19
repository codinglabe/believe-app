<?php

namespace App\Http\Helpers;

use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Support\Facades\Route;

/**
 * Central place for post-login / post-register / post-verify redirects.
 * Prevents access denied by sending each role to the correct first page.
 */
class AuthRedirectHelper
{
    /**
     * Get the default redirect URL for the authenticated user (by role).
     * - Supporter (user): public profile
     * - Organization / organization_pending: public org page
     * - Admin: dashboard
     */
    public static function defaultRedirectForUser(?Authenticatable $user): string
    {
        if (!$user) {
            return Route::has('dashboard') ? route('dashboard') : '/';
        }

        $role = $user->role ?? (method_exists($user, 'getRoleNames') ? $user->getRoleNames()->first() : null);

        if ($role === 'user') {
            $slug = $user->slug ?? $user->id;
            return Route::has('users.show') ? route('users.show', $slug) : '/';
        }

        if (in_array($role, ['organization', 'organization_pending'], true)) {
            $slug = $user->slug ?? $user->id;
            return Route::has('organizations.show') ? route('organizations.show', $slug) : '/';
        }

        if ($role === 'admin') {
            return Route::has('dashboard') ? route('dashboard') : '/';
        }

        return Route::has('dashboard') ? route('dashboard') : '/';
    }
}
