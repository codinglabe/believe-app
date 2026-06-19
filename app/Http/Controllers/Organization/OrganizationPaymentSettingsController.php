<?php

namespace App\Http\Controllers\Organization;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\OrganizationPaymentSetting;
use App\Services\Payments\OrganizationPaymentMethodResolver;
use App\Support\ManualPaymentMethodSettingsValidator;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class OrganizationPaymentSettingsController extends Controller
{
    public function edit(Request $request): InertiaResponse|RedirectResponse
    {
        $org = Organization::forAuthUser($request->user());
        if (! $org) {
            return redirect()->route('dashboard')->with('error', 'No organization found.');
        }

        $settings = OrganizationPaymentSetting::forOrganization($org->id);
        $stripeConfigured = OrganizationPaymentMethodResolver::stripePlatformConfigured();
        $paypalConfigured = OrganizationPaymentMethodResolver::paypalPlatformConfigured();

        return Inertia::render('Organization/PaymentSettings', [
            'organization' => [
                'id' => $org->id,
                'name' => $org->name,
            ],
            'settings' => $this->settingsPayload($settings),
            'platform' => [
                'stripe_configured' => $stripeConfigured,
                'paypal_configured' => $paypalConfigured,
            ],
            'stripeConnect' => [
                'connected' => filled($org->stripe_connect_account_id),
                'charges_enabled' => (bool) $org->stripe_connect_charges_enabled,
                'payouts_enabled' => (bool) $org->stripe_connect_payouts_enabled,
            ],
            'flash' => [
                'success' => $request->session()->get('success'),
            ],
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $org = Organization::forAuthUser($request->user());
        if (! $org) {
            abort(403);
        }

        $request->validate([
            'stripe_card_enabled' => 'sometimes|boolean',
            'stripe_ach_enabled' => 'sometimes|boolean',
            'stripe_venmo_enabled' => 'sometimes|boolean',
            'venmo_manual_enabled' => 'sometimes|boolean',
            'venmo_username' => 'nullable|string|max:100',
            'stripe_cash_app_pay_enabled' => 'sometimes|boolean',
            'paypal_enabled' => 'sometimes|boolean',
            'cashapp_manual_enabled' => 'sometimes|boolean',
            'zelle_enabled' => 'sometimes|boolean',
            'cashapp_cashtag' => 'nullable|string|max:100',
            'cashapp_qr_image' => 'nullable|image|max:5120',
            'zelle_email' => 'nullable|email|max:255',
            'zelle_phone' => 'nullable|string|max:30',
            'donation_wallet_info' => 'nullable|string|max:2000',
        ]);

        $settings = OrganizationPaymentSetting::forOrganization($org->id);
        ManualPaymentMethodSettingsValidator::validate($request, $settings->cashapp_qr_image);

        $payload = [
            'stripe_card_enabled' => $request->boolean('stripe_card_enabled'),
            'stripe_ach_enabled' => $request->boolean('stripe_ach_enabled'),
            'stripe_venmo_enabled' => $request->boolean('stripe_venmo_enabled'),
            'venmo_manual_enabled' => $request->boolean('venmo_manual_enabled'),
            'venmo_username' => $request->input('venmo_username'),
            'stripe_cash_app_pay_enabled' => $request->boolean('stripe_cash_app_pay_enabled'),
            'paypal_enabled' => $request->boolean('paypal_enabled'),
            'cashapp_manual_enabled' => $request->boolean('cashapp_manual_enabled'),
            'zelle_enabled' => $request->boolean('zelle_enabled'),
            'cashapp_cashtag' => $request->input('cashapp_cashtag'),
            'zelle_email' => $request->input('zelle_email'),
            'zelle_phone' => $request->input('zelle_phone'),
            'donation_wallet_info' => $request->input('donation_wallet_info'),
        ];

        if ($request->hasFile('cashapp_qr_image')) {
            $payload['cashapp_qr_image'] = $request->file('cashapp_qr_image')
                ->store('organization/cashapp-qr', 'public');
        }

        $settings->update($payload);

        return back()->with('success', 'Donation payment methods saved successfully.');
    }

    /**
     * @return array<string, mixed>
     */
    private function settingsPayload(OrganizationPaymentSetting $settings): array
    {
        return [
            'stripe_card_enabled' => $settings->stripe_card_enabled,
            'stripe_ach_enabled' => $settings->stripe_ach_enabled,
            'stripe_venmo_enabled' => $settings->stripe_venmo_enabled,
            'venmo_manual_enabled' => $settings->venmo_manual_enabled,
            'venmo_username' => $settings->venmo_username,
            'stripe_cash_app_pay_enabled' => $settings->stripe_cash_app_pay_enabled,
            'paypal_enabled' => $settings->paypal_enabled,
            'cashapp_manual_enabled' => $settings->cashapp_manual_enabled,
            'zelle_enabled' => $settings->zelle_enabled,
            'cashapp_cashtag' => $settings->cashapp_cashtag,
            'cashapp_qr_image_url' => $settings->cashapp_qr_image
                ? asset('storage/'.$settings->cashapp_qr_image)
                : null,
            'zelle_email' => $settings->zelle_email,
            'zelle_phone' => $settings->zelle_phone,
            'donation_wallet_info' => $settings->donation_wallet_info,
        ];
    }
}
