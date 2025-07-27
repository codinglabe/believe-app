<?php

namespace App\Http\Controllers;

use App\Models\PaymentMethod;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PaymentMethodSettingController extends Controller
{
    /**
     * Display the payment method settings page.
     */
    public function index()
    {
        $paypal = PaymentMethod::getConfig('paypal');
        $stripe = PaymentMethod::getConfig('stripe');

        $settings = [
            'paypal_mode' => $paypal->mode ?? 'manual',
            'paypal_client_id' => $paypal->client_id ?? null,
            'paypal_client_secret' => $paypal->client_secret ?? null,
            'paypal_mode_environment' => $paypal->mode_environment ?? 'sandbox',

            'stripe_mode' => $stripe->mode ?? 'manual',
            'stripe_client_id' => $stripe->client_id ?? null,
            'stripe_client_secret' => $stripe->client_secret ?? null,
            'stripe_mode_environment' => $stripe->mode_environment ?? 'sandbox',
        ];

        return Inertia::render('settings/payment-methods', [
            'settings' => $settings,
        ]);
    }

    /**
     * Update the payment method settings.
     */
    public function update(Request $request)
    {
        $request->validate([
            'paypal_mode' => ['required', 'string', 'in:automatic,manual'],
            'paypal_client_id' => ['nullable', 'string', 'max:255'],
            'paypal_client_secret' => ['nullable', 'string', 'max:255'],
            'paypal_mode_environment' => ['required', 'string', 'in:sandbox,live'],

            'stripe_mode' => ['required', 'string', 'in:automatic,manual'],
            'stripe_client_id' => ['nullable', 'string', 'max:255'],
            'stripe_client_secret' => ['nullable', 'string', 'max:255'],
            'stripe_mode_environment' => ['required', 'string', 'in:sandbox,live'],
        ]);

        PaymentMethod::setConfig('paypal', [
            'mode' => $request->paypal_mode,
            'client_id' => $request->paypal_client_id,
            'client_secret' => $request->paypal_client_secret,
            'mode_environment' => $request->paypal_mode_environment,
        ]);

        PaymentMethod::setConfig('stripe', [
            'mode' => $request->stripe_mode,
            'client_id' => $request->stripe_client_id,
            'client_secret' => $request->stripe_client_secret,
            'mode_environment' => $request->stripe_mode_environment,
        ]);

        return redirect()->back()->with('success', 'Payment method settings updated successfully.');
    }
}
