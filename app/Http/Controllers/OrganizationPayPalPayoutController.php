<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Services\PayPalPayoutEntityService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OrganizationPayPalPayoutController extends Controller
{
    public function show(Request $request): Response|RedirectResponse
    {
        $user = $request->user();
        $organization = Organization::forAuthUser($user);
        if (! $organization || $organization->registration_status !== 'approved') {
            abort(403, 'Approved organization profile required.');
        }

        return Inertia::render('Integrations/PayPalPayouts', [
            'organization' => [
                'name' => $organization->name,
            ],
            'paypal' => PayPalPayoutEntityService::statusPayload($organization),
            'paypalConfigured' => PayPalPayoutEntityService::isPlatformConfigured(),
            'preferredPayoutMethod' => $organization->getPreferredPayoutMethod()?->value,
        ]);
    }

    public function connect(Request $request): RedirectResponse
    {
        $user = $request->user();
        $organization = Organization::forAuthUser($user);
        if (! $organization || $organization->registration_status !== 'approved') {
            abort(403, 'Approved organization profile required.');
        }

        if (! PayPalPayoutEntityService::isPlatformConfigured()) {
            return redirect()->route('integrations.paypal-payouts')
                ->with('error', 'PayPal is not configured for this application. Ask the platform admin to set PayPal keys.');
        }

        $validated = $request->validate([
            'paypal_payout_email' => ['required', 'email', 'max:255'],
        ]);

        try {
            PayPalPayoutEntityService::connectPayPalEmail($organization, $validated['paypal_payout_email']);
        } catch (\Throwable $e) {
            return redirect()->route('integrations.paypal-payouts')
                ->with('error', $e->getMessage());
        }

        return redirect()->route('integrations.paypal-payouts')
            ->with('success', 'PayPal Business payout email saved. You can receive payouts for Marketplace, Merchant Hub, Courses, and Events.');
    }

    public function disconnect(Request $request): RedirectResponse
    {
        $user = $request->user();
        $organization = Organization::forAuthUser($user);
        if (! $organization || $organization->registration_status !== 'approved') {
            abort(403, 'Approved organization profile required.');
        }

        PayPalPayoutEntityService::disconnectPayPal($organization);

        return redirect()->route('integrations.paypal-payouts')
            ->with('success', 'PayPal payout connection removed.');
    }
}
