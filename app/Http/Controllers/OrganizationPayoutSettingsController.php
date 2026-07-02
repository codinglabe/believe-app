<?php

namespace App\Http\Controllers;

use App\Enums\PreferredPayoutMethod;
use App\Models\Organization;
use App\Services\EntityPayoutSettlementService;
use App\Services\PayPalPayoutEntityService;
use App\Services\StripeConnectOrganizationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class OrganizationPayoutSettingsController extends Controller
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

        return Inertia::render('Integrations/PayoutSettings', [
            'organization' => [
                'name' => $organization->name,
                'email' => $organization->payoutContactEmail(),
            ],
            'readiness' => EntityPayoutSettlementService::readinessPayload($organization),
            'availableMethods' => PayPalPayoutEntityService::availableMethodsForOrganization(),
            'stripeConfigured' => StripeConnectOrganizationService::configureStripe(),
            'paypalConfigured' => PayPalPayoutEntityService::isPlatformConfigured(),
            'modules' => ['marketplace', 'merchant_hub', 'courses', 'events'],
        ]);
    }

    public function updatePreferredMethod(Request $request): RedirectResponse
    {
        $user = $request->user();
        $organization = Organization::forAuthUser($user);
        if (! $organization || $organization->registration_status !== 'approved') {
            abort(403, 'Approved organization profile required.');
        }

        $validated = $request->validate([
            'preferred_payout_method' => ['required', 'string', Rule::in(PreferredPayoutMethod::values())],
        ]);

        $organization->forceFill([
            'preferred_payout_method' => $validated['preferred_payout_method'],
        ])->save();

        return redirect()->route('integrations.payout-settings')
            ->with('success', 'Preferred payout method updated.');
    }
}
