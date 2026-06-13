<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Middleware\CheckTopicsSelected;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Response;

class ProfileSettingsEntryController extends Controller
{
    /**
     * Single entry for /settings/profile — sends each role to the correct profile UI.
     */
    public function show(Request $request): RedirectResponse|Response
    {
        $user = $request->user();
        $role = (string) ($user->role ?? $user->getRoleNames()->first() ?? '');

        if ($role === 'user') {
            return redirect()->route('user.profile.edit');
        }

        if ($role === 'merchant') {
            return redirect()->route('merchant.settings');
        }

        if ($role === 'organization_pending') {
            return redirect()->route('dashboard');
        }

        if (
            in_array($role, ['organization', 'admin', 'care_alliance'], true)
            || $user->hasAnyRole(['organization', 'admin', 'care_alliance'])
        ) {
            return app(CheckTopicsSelected::class)->handle(
                $request,
                fn (Request $req) => app(ProfileController::class)->edit($req),
            );
        }

        return redirect()->route('dashboard');
    }
}
