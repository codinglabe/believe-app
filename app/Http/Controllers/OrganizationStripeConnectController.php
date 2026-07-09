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
        $connectClientConfigured = StripeConnectOrganizationService::connectClientId() !== null;
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
            'connectClientConfigured' => $connectClientConfigured,
            'isLegacyExpressAccount' => $isLegacyExpress,
            'oauthCallbackUrl' => route('integrations.stripe-connect.callback'),
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
                return $this->backWithConnectError('Stripe credentials are not configured for this application. Ask the platform admin to set Stripe keys.');
            }

            if (StripeConnectOrganizationService::connectClientId() === null) {
                return $this->backWithConnectError(
                    'Stripe Connect client ID is not configured. Ask the platform admin to set it under Settings → Payment Methods → Stripe.'
                );
            }

            $url = StripeConnectOrganizationService::createStandardOAuthAuthorizeUrl($organization);
        } catch (\Throwable $e) {
            Log::warning('Stripe Connect OAuth start failed', [
                'organization_id' => $organization->id,
                'error' => $e->getMessage(),
            ]);

            return $this->backWithConnectError($e->getMessage());
        }

        return redirect()->away($url);
    }

    public function oauthCallback(Request $request): RedirectResponse
    {
        $user = $request->user();
        $organization = Organization::forAuthUser($user);
        if (! $organization || $organization->registration_status !== 'approved') {
            abort(403, 'Approved organization profile required.');
        }

        if ($request->filled('error')) {
            $description = (string) ($request->query('error_description') ?: $request->query('error'));

            return $this->backWithConnectError('Stripe connection was cancelled or denied: '.$description);
        }

        $expectedState = (string) $request->session()->pull('stripe_connect_oauth_state', '');
        $expectedOrgId = (int) $request->session()->pull('stripe_connect_oauth_org_id', 0);
        $state = (string) $request->query('state', '');
        $code = (string) $request->query('code', '');

        if ($expectedState === '' || ! hash_equals($expectedState, $state) || $expectedOrgId !== (int) $organization->id) {
            return $this->backWithConnectError('Invalid or expired Stripe connection session. Please try again.');
        }

        if ($code === '') {
            return $this->backWithConnectError('Stripe did not return an authorization code. Please try again.');
        }

        try {
            StripeConnectOrganizationService::completeStandardOAuth($organization, $code);
            $organization->refresh();
        } catch (\Throwable $e) {
            Log::warning('Stripe Connect OAuth callback failed', [
                'organization_id' => $organization->id,
                'error' => $e->getMessage(),
            ]);

            return $this->backWithConnectError($e->getMessage());
        }

        $ready = StripeConnectOrganizationService::organizationCanAcceptDirectDonations($organization);

        return redirect()->route('integrations.stripe-connect')
            ->with('success', $ready
                ? 'Your Standard Stripe account is connected — qualifying donations settle directly with your nonprofit.'
                : 'Stripe account linked. Complete any remaining setup in your Stripe Dashboard to enable payouts.');
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
            ->with('success', 'Stripe account disconnected. Connect again with your Standard Stripe account when ready.');
    }

    public function onboardingReturn(Request $request): RedirectResponse
    {
        return redirect()->route('integrations.stripe-connect');
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
