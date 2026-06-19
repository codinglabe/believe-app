<?php

namespace App\Http\Controllers;

use App\Models\Donation;
use App\Models\Organization;
use App\Models\PaymentTransaction;
use App\Services\Payments\ManualDonationPaymentService;
use App\Services\Payments\OrganizationPaymentMethodResolver;
use App\Services\Payments\PayPalDonationPaymentService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class DonationPaymentController extends Controller
{
    public function manualConfirm(Request $request, Donation $donation): InertiaResponse|RedirectResponse
    {
        if ((int) $donation->user_id !== (int) $request->user()->id) {
            abort(403);
        }

        $donation->loadMissing('organization');
        $organization = $donation->organization;
        if (! $organization) {
            abort(404);
        }

        $method = $donation->payment_method ?? 'cashapp';
        $instructions = OrganizationPaymentMethodResolver::manualPaymentInstructions($organization, $method);

        return Inertia::render('frontend/donation/manual-confirm', [
            'donation' => [
                'id' => $donation->id,
                'amount' => (float) $donation->amount,
                'payment_method' => $method,
                'status' => $donation->status,
                'organization_name' => $organization->name,
            ],
            'instructions' => $instructions,
            'reward_points' => PaymentTransaction::REWARD_POINTS_AMOUNT,
        ]);
    }

    public function manualConfirmSubmit(
        Request $request,
        Donation $donation,
        ManualDonationPaymentService $manualService
    ): RedirectResponse {
        $request->validate([
            'receipt' => 'nullable|image|max:5120',
        ]);

        $receiptPath = null;
        if ($request->hasFile('receipt')) {
            $receiptPath = $request->file('receipt')->store('donation-receipts', 'public');
        }

        return $manualService->confirmPayment($donation, $request->user(), $receiptPath);
    }

    public function paypalCapture(
        Request $request,
        Donation $donation,
        PayPalDonationPaymentService $paypalService
    ): RedirectResponse {
        if ((int) $donation->user_id !== (int) $request->user()->id) {
            abort(403);
        }

        $token = $request->input('token');
        if (! $token) {
            return redirect()->route('donations.cancel').'?donation_id='.$donation->id;
        }

        $success = $paypalService->captureOrder($donation, $token);

        if ($success) {
            return redirect(route('donations.success').'?donation_id='.$donation->id)
                ->with('success', 'PayPal payment completed! You earned +5 Believe Points.');
        }

        return redirect()->route('donate')->withErrors([
            'message' => 'PayPal payment could not be completed. Please try again.',
        ]);
    }
}
