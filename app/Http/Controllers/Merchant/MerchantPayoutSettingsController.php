<?php

namespace App\Http\Controllers\Merchant;

use App\Enums\PreferredPayoutMethod;
use App\Http\Controllers\Controller;
use App\Models\Merchant;
use App\Services\EntityPayoutSettlementService;
use App\Services\PayPalPayoutEntityService;
use App\Services\StripeConnectMerchantService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class MerchantPayoutSettingsController extends Controller
{
    public function index(Request $request): Response
    {
        /** @var Merchant $merchant */
        $merchant = Auth::guard('merchant')->user();

        StripeConnectMerchantService::syncAccountStatusFromStripe($merchant);
        $merchant->refresh();

        return Inertia::render('merchant/PayoutSettings', [
            'merchant' => [
                'name' => $merchant->name,
                'business_name' => $merchant->business_name,
                'email' => $merchant->email,
            ],
            'readiness' => EntityPayoutSettlementService::readinessPayload($merchant),
            'availableMethods' => PayPalPayoutEntityService::availableMethodsForMerchant(),
            'stripeConfigured' => StripeConnectMerchantService::configureStripe(),
            'paypalConfigured' => PayPalPayoutEntityService::isPlatformConfigured(),
            'modules' => ['marketplace', 'merchant_hub', 'courses', 'events'],
            'connectError' => $request->session()->get('connect_error'),
        ]);
    }

    public function updatePreferredMethod(Request $request): RedirectResponse
    {
        /** @var Merchant $merchant */
        $merchant = Auth::guard('merchant')->user();

        $validated = $request->validate([
            'preferred_payout_method' => ['required', 'string', Rule::in(PreferredPayoutMethod::values())],
        ]);

        $merchant->forceFill([
            'preferred_payout_method' => $validated['preferred_payout_method'],
        ])->save();

        return back()->with('flash', ['success' => 'Preferred payout method updated.']);
    }

    public function connectPayPal(Request $request): RedirectResponse
    {
        /** @var Merchant $merchant */
        $merchant = Auth::guard('merchant')->user();

        if (! PayPalPayoutEntityService::isPlatformConfigured()) {
            return back()->with('flash', ['error' => 'PayPal is not configured for this application.']);
        }

        $validated = $request->validate([
            'paypal_payout_email' => ['required', 'email', 'max:255'],
        ]);

        PayPalPayoutEntityService::connectPayPalEmail($merchant, $validated['paypal_payout_email']);

        return back()->with('flash', ['success' => 'PayPal Business payout email saved.']);
    }

    public function disconnectPayPal(Request $request): RedirectResponse
    {
        /** @var Merchant $merchant */
        $merchant = Auth::guard('merchant')->user();

        PayPalPayoutEntityService::disconnectPayPal($merchant);

        return back()->with('flash', ['success' => 'PayPal payout connection removed.']);
    }

    public function startStripeConnect(Request $request): RedirectResponse
    {
        /** @var Merchant $merchant */
        $merchant = Auth::guard('merchant')->user();

        try {
            if (! StripeConnectMerchantService::configureStripe()) {
                return $this->backWithConnectError('Stripe credentials are not configured for this application.');
            }

            $url = StripeConnectMerchantService::createAccountOnboardingLink($merchant);
        } catch (\Throwable $e) {
            Log::warning('Merchant Stripe Connect onboarding start failed', [
                'merchant_id' => $merchant->id,
                'error' => $e->getMessage(),
            ]);

            return $this->backWithConnectError($e->getMessage());
        }

        return redirect()->away($url);
    }

    public function stripeConnectReturn(Request $request): RedirectResponse
    {
        /** @var Merchant $merchant */
        $merchant = Auth::guard('merchant')->user();

        StripeConnectMerchantService::syncAccountStatusFromStripe($merchant);
        $merchant->refresh();

        $ready = StripeConnectMerchantService::merchantCanReceivePayouts($merchant);

        return redirect()->route('merchant.payouts.index')
            ->with('flash', [
                'success' => $ready
                    ? 'Stripe payouts are ready for Marketplace, Merchant Hub, Courses, and Events.'
                    : 'Stripe saved your progress. Complete onboarding to receive payouts.',
            ]);
    }

    public function stripeConnectRefresh(Request $request): RedirectResponse
    {
        return $this->startStripeConnect($request);
    }

    private function backWithConnectError(string $message): RedirectResponse
    {
        return redirect()->route('merchant.payouts.index')
            ->with('flash', ['error' => $message])
            ->with('connect_error', $message)
            ->withErrors(['stripe' => $message]);
    }
}
