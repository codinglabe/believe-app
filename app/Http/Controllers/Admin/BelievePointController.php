<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\BaseController;
use App\Models\AdminSetting;
use App\Models\BelievePointPurchase;
use App\Models\BelievePointsPaymentSetting;
use App\Services\BelievePointPurchaseSettlementStatusService;
use App\Services\BelievePointsPurchaseSettingsService;
use App\Services\Payments\BelievePointsPaymentMethodResolver;
use App\Support\ManualPaymentMethodSettingsValidator;
use Illuminate\Http\Request;
use Inertia\Inertia;

class BelievePointController extends BaseController
{
    /**
     * Display the believe points management page.
     */
    public function index(Request $request)
    {
        $this->authorizeRole($request, 'admin');

        $isEnabled = (bool) AdminSetting::get('believe_points_enabled', true);
        $minPurchaseAmount = (float) AdminSetting::get('believe_points_min_purchase', 1.00);
        $maxPurchaseAmount = (float) AdminSetting::get('believe_points_max_purchase', 10000.00);

        $totalPurchases = BelievePointPurchase::where('status', 'completed')->count();
        $totalRevenue = BelievePointPurchase::where('status', 'completed')->sum('amount');
        $totalPointsIssued = BelievePointPurchase::where('status', 'completed')->sum('points');

        $recentPurchases = BelievePointPurchase::with('user')
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get()
            ->map(static fn (BelievePointPurchase $purchase) => array_merge(
                $purchase->toArray(),
                BelievePointPurchaseSettlementStatusService::historyPayload($purchase),
            ));

        $paymentSettings = BelievePointsPaymentSetting::instance();

        return Inertia::render('admin/BelievePoints/Index', [
            'settings' => [
                'enabled' => $isEnabled,
                'min_purchase_amount' => $minPurchaseAmount,
                'max_purchase_amount' => $maxPurchaseAmount,
                ...BelievePointsPurchaseSettingsService::adminPayload(),
            ],
            'paymentSettings' => BelievePointsPaymentMethodResolver::settingsPayload($paymentSettings),
            'platform' => [
                'stripe_configured' => BelievePointsPaymentMethodResolver::stripePlatformConfigured(),
                'paypal_configured' => BelievePointsPaymentMethodResolver::paypalPlatformConfigured(),
            ],
            'statistics' => [
                'total_purchases' => $totalPurchases,
                'total_revenue' => $totalRevenue,
                'total_points_issued' => $totalPointsIssued,
            ],
            'recentPurchases' => $recentPurchases,
        ]);
    }

    /**
     * Update the believe points settings.
     */
    public function update(Request $request)
    {
        $this->authorizeRole($request, 'admin');

        $request->validate([
            'enabled' => ['required', 'boolean'],
            'min_purchase_amount' => ['required', 'numeric', 'min:1', 'max:1000'],
            'max_purchase_amount' => ['required', 'numeric', 'min:1', 'max:100000'],
            'brp_value' => ['required', 'numeric', 'min:0', 'max:100'],
            'platform_fee_percent' => ['required', 'numeric', 'min:0', 'max:100'],
            'processing_fee_percent' => ['required', 'numeric', 'min:0', 'max:100'],
            'free_brp_award' => ['required', 'numeric', 'min:0', 'max:10000'],
            'prime_brp_award' => ['required', 'numeric', 'min:0', 'max:10000'],
            'card_hold_hours' => ['required', 'integer', 'min:0', 'max:720'],
            'ach_hold_hours' => ['required', 'integer', 'min:0', 'max:720'],
            'supporter_pays_processing_fee' => ['sometimes', 'boolean'],
            'supporter_pays_platform_fee' => ['sometimes', 'boolean'],
            'card_settlement_business_days' => ['required', 'integer', 'min:0', 'max:30'],
            'ach_settlement_business_days' => ['required', 'integer', 'min:0', 'max:30'],
            'require_bridge_reserve_confirmation' => ['required', 'boolean'],
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
            'payment_instructions' => 'nullable|string|max:2000',
        ]);

        $paymentSettings = BelievePointsPaymentSetting::instance();
        ManualPaymentMethodSettingsValidator::validate($request, $paymentSettings->cashapp_qr_image);

        AdminSetting::set('believe_points_enabled', $request->input('enabled'), 'boolean');
        AdminSetting::set('believe_points_min_purchase', $request->input('min_purchase_amount'), 'float');
        AdminSetting::set('believe_points_max_purchase', $request->input('max_purchase_amount'), 'float');
        AdminSetting::set(BelievePointsPurchaseSettingsService::KEY_BRP_VALUE, $request->input('brp_value'), 'float');
        AdminSetting::set(BelievePointsPurchaseSettingsService::KEY_PLATFORM_FEE_PERCENT, $request->input('platform_fee_percent'), 'float');
        AdminSetting::set(BelievePointsPurchaseSettingsService::KEY_PROCESSING_FEE_PERCENT, $request->input('processing_fee_percent'), 'float');
        AdminSetting::set(BelievePointsPurchaseSettingsService::KEY_FREE_BRP_AWARD, $request->input('free_brp_award'), 'float');
        AdminSetting::set(BelievePointsPurchaseSettingsService::KEY_PRIME_BRP_AWARD, $request->input('prime_brp_award'), 'float');
        AdminSetting::set(BelievePointsPurchaseSettingsService::KEY_CARD_HOLD_HOURS, $request->input('card_hold_hours'), 'integer');
        AdminSetting::set(BelievePointsPurchaseSettingsService::KEY_ACH_HOLD_HOURS, $request->input('ach_hold_hours'), 'integer');
        AdminSetting::set(BelievePointsPurchaseSettingsService::KEY_SUPPORTER_PAYS_PROCESSING_FEE, $request->boolean('supporter_pays_processing_fee'), 'boolean');
        AdminSetting::set(BelievePointsPurchaseSettingsService::KEY_SUPPORTER_PAYS_PLATFORM_FEE, $request->boolean('supporter_pays_platform_fee'), 'boolean');
        AdminSetting::set(BelievePointsPurchaseSettingsService::KEY_CARD_SETTLEMENT_BUSINESS_DAYS, $request->input('card_settlement_business_days'), 'integer');
        AdminSetting::set(BelievePointsPurchaseSettingsService::KEY_ACH_SETTLEMENT_BUSINESS_DAYS, $request->input('ach_settlement_business_days'), 'integer');
        AdminSetting::set(BelievePointsPurchaseSettingsService::KEY_REQUIRE_BRIDGE_RESERVE, $request->boolean('require_bridge_reserve_confirmation'), 'boolean');

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
            'payment_instructions' => $request->input('payment_instructions'),
        ];

        if ($request->hasFile('cashapp_qr_image')) {
            $payload['cashapp_qr_image'] = $request->file('cashapp_qr_image')
                ->store('believe-points/cashapp-qr', 'public');
        }

        $paymentSettings->update($payload);

        return redirect()->back()->with('success', 'Believe Points settings updated successfully.');
    }
}
