<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminSetting;
use App\Services\StripeProcessingFeeEstimator;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProcessingFeeSettingsController extends Controller
{
    public function index(): Response
    {
        $rates = StripeProcessingFeeEstimator::ratesForFrontend();

        return Inertia::render('admin/processing-fees/Index', [
            'rates' => $rates,
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'card_percent' => ['required', 'numeric', 'min:0', 'max:0.2'],
            'card_fixed_usd' => ['required', 'numeric', 'min:0', 'max:25'],
            'ach_percent' => ['required', 'numeric', 'min:0', 'max:0.1'],
            'ach_fee_cap_usd' => ['required', 'numeric', 'min:0', 'max:100'],
        ]);

        $payload = [
            'card_percent' => (float) $validated['card_percent'],
            'card_fixed_usd' => (float) $validated['card_fixed_usd'],
            'ach_percent' => (float) $validated['ach_percent'],
            'ach_fee_cap_usd' => (float) $validated['ach_fee_cap_usd'],
        ];

        AdminSetting::set('stripe_processing_fee_estimates', $payload, 'json');
        StripeProcessingFeeEstimator::forgetRatesCache();

        return redirect()->route('admin.processing-fees.index')
            ->with('success', 'Stripe processing fee estimates saved. They apply anywhere the app estimates card or ACH fees.');
    }
}
