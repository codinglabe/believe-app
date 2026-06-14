<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ReferralLinkController extends Controller
{
    public function edit(Request $request)
    {
        $user = $request->user();
        $organization = $user->organization;
        $supporterReferralUrl = null;
        $isOrganizationReferral = false;

        if ($organization !== null && in_array((string) ($user->role ?? ''), ['organization', 'organization_pending'], true)) {
            $isOrganizationReferral = true;
            $supporterReferralUrl = app(\App\Services\SupporterPrimaryOrganizationService::class)
                ->supporterReferralUrl($user);
        }

        return Inertia::render('settings/referral', [
            'referral_code' => $user->referral_code,
            'is_organization_referral' => $isOrganizationReferral,
            'supporter_referral_url' => $supporterReferralUrl,
            'organization_name' => $organization?->name,
        ]);
    }
} 