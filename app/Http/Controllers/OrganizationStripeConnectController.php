<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Services\StripeConnectOrganizationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
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

        $syncError = StripeConnectOrganizationService::syncAccountStatusFromStripe($organization);
        $organization->refresh();

        $configured = StripeConnectOrganizationService::configureStripe();
        $isLegacyExpress = StripeConnectOrganizationService::isLegacyExpressAccount($organization);

        return Inertia::render('Integrations/StripeDonations', [
            'organization' => [
                'name' => $organization->name,
                'stripe_connect_account_id' => $organization->stripe_connect_account_id,
                'stripe_connect_charges_enabled' => (bool) $organization->stripe_connect_charges_enabled,
                'stripe_connect_payouts_enabled' => (bool) $organization->stripe_connect_payouts_enabled,
                'stripe_connect_account_type' => $organization->stripe_connect_account_type,
                'email' => $organization->email ?: $organization->platform_email ?: $organization->user?->email,
            ],
            'requireConnectForPublicDonations' => (bool) config('donations.require_org_stripe_connect_for_direct_donations', false),
            'stripeConfigured' => $configured,
            'isLegacyExpressAccount' => $isLegacyExpress,
            'syncError' => $syncError,
            'connectError' => $request->session()->get('connect_error'),
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
                return $this->backWithConnectError('Stripe credentials are not configured for this application. Ask the platform admin to set Stripe keys under Settings → Payment Methods.');
            }

            $url = StripeConnectOrganizationService::createAccountOnboardingLink($organization);
        } catch (\Throwable $e) {
            Log::warning('Stripe Connect onboarding start failed', [
                'organization_id' => $organization->id,
                'error' => $e->getMessage(),
            ]);

            return $this->backWithConnectError($e->getMessage());
        }

        return redirect()->away($url);
    }

    public function oauthCallback(Request $request): RedirectResponse
    {
        return redirect()->route('integrations.stripe-connect')
            ->with('success', 'Stripe Connect now uses automatic Standard account onboarding. Click Connect to continue.');
    }

    public function disconnect(Request $request): RedirectResponse
    {
        $user = $request->user();
        $organization = Organization::forAuthUser($user);
        if (! $organization || $organization->registration_status !== 'approved') {
            abort(403, 'Approved organization profile required.');
        }

        StripeConnectOrganizationService::disconnectAccount($organization);

        return redirect()->route('integrations.stripe-connect')
            ->with('success', 'Stripe account disconnected. Connect again when ready.');
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
                ? 'Your Standard Stripe account is ready — qualifying donations settle directly with your nonprofit.'
                : 'Stripe saved your progress. Complete onboarding to enable payouts, or open your Stripe Dashboard to finish setup.');
    }

    public function onboardingRefresh(Request $request): RedirectResponse
    {
        return $this->start($request);
    }

    /**
     * Persist a Connect-specific error and surface it both as a toast and as an inline alert prop.
     */
    private function backWithConnectError(string $message): RedirectResponse
    {
        return redirect()->route('integrations.stripe-connect')
            ->with('error', $message)
            ->with('connect_error', $message)
            ->withErrors(['stripe' => $message]);
    }
}
