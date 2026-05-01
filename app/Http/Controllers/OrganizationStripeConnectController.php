<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Services\StripeConnectOrganizationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OrganizationStripeConnectController extends Controller
{
    public function show(Request $request): Response|RedirectResponse
    {
        $user = $request->user();
        $organization = Organization::forAuthUser($user);
        if (! $organization || $organization->registration_status !== 'approved') {
            abort(403, 'Approved organization profile required.');
        }

        StripeConnectOrganizationService::syncAccountStatusFromStripe($organization);
        $organization->refresh();

        return Inertia::render('Integrations/StripeDonations', [
            'organization' => [
                'name' => $organization->name,
                'stripe_connect_account_id' => $organization->stripe_connect_account_id,
                'stripe_connect_charges_enabled' => (bool) $organization->stripe_connect_charges_enabled,
                'stripe_connect_payouts_enabled' => (bool) $organization->stripe_connect_payouts_enabled,
            ],
            'requireConnectForPublicDonations' => (bool) config('donations.require_org_stripe_connect_for_direct_donations', false),
        ]);
    }

    public function start(Request $request): RedirectResponse
    {
        $user = $request->user();
        $organization = Organization::forAuthUser($user);
        if (! $organization || $organization->registration_status !== 'approved') {
            abort(403, 'Approved organization profile required.');
        }

        try {
            if (! StripeConnectOrganizationService::configureStripe()) {
                return redirect()->route('integrations.stripe-connect')
                    ->withErrors(['stripe' => 'Stripe is not configured for this application.']);
            }

            $url = StripeConnectOrganizationService::createAccountOnboardingLink($organization);
        } catch (\Throwable $e) {
            return redirect()->route('integrations.stripe-connect')
                ->withErrors(['stripe' => 'Could not open Stripe onboarding: '.$e->getMessage()]);
        }

        return redirect()->away($url);
    }

    public function onboardingReturn(Request $request): RedirectResponse
    {
        $user = $request->user();
        $organization = Organization::forAuthUser($user);
        if ($organization) {
            StripeConnectOrganizationService::syncAccountStatusFromStripe($organization);
            $organization->refresh();
        }

        $ready = $organization && StripeConnectOrganizationService::organizationCanAcceptDirectDonations($organization);

        return redirect()->route('integrations.stripe-connect')
            ->with('success', $ready
                ? 'Stripe payouts are ready — qualifying donations settle directly with your nonprofit.'
                : 'Stripe saved your progress. Complete onboarding to receive direct payouts.');
    }

    public function onboardingRefresh(Request $request): RedirectResponse
    {
        return $this->start($request);
    }
}
