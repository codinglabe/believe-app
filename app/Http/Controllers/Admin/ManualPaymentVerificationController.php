<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\BelievePointPurchase;
use App\Models\Donation;
use App\Models\PaymentTransaction;
use App\Services\BelievePointPurchaseSettlementService;
use App\Services\Payments\BelievePointsRewardService;
use App\Services\Payments\PaymentTransactionCompletionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class ManualPaymentVerificationController extends Controller
{
    public function index(Request $request): InertiaResponse
    {
        $status = $request->input('status', 'pending');

        $transactions = PaymentTransaction::query()
            ->with(['user:id,name,email', 'organization:id,name', 'payable'])
            ->whereIn('payment_method', ['cashapp', 'zelle', 'venmo_manual'])
            ->when($status !== 'all', fn ($q) => $q->where('status', $status))
            ->orderByDesc('created_at')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (PaymentTransaction $tx) => [
                'id' => $tx->id,
                'user_name' => $tx->user?->name,
                'user_email' => $tx->user?->email,
                'organization_name' => $tx->organization?->name,
                'amount' => (float) $tx->amount,
                'payment_method' => $tx->payment_method,
                'transaction_type' => $tx->transaction_type,
                'status' => $tx->status,
                'receipt_image_url' => $tx->receipt_image ? asset('storage/'.$tx->receipt_image) : null,
                'donation_id' => $tx->payable_type === Donation::class ? $tx->payable_id : null,
                'believe_point_purchase_id' => $tx->payable_type === BelievePointPurchase::class ? $tx->payable_id : null,
                'metadata' => $tx->metadata,
                'admin_notes' => $tx->admin_notes,
                'created_at' => $tx->created_at?->toDateTimeString(),
                'verified_at' => $tx->verified_at?->toDateTimeString(),
            ]);

        return Inertia::render('admin/payments/ManualVerification', [
            'transactions' => $transactions,
            'filters' => ['status' => $status],
        ]);
    }

    public function approve(Request $request, PaymentTransaction $paymentTransaction): RedirectResponse
    {
        $request->validate(['admin_notes' => 'nullable|string|max:1000']);

        if (! $paymentTransaction->isManual() || $paymentTransaction->status !== PaymentTransaction::STATUS_PENDING) {
            return back()->with('error', 'This transaction cannot be approved.');
        }

        if ($paymentTransaction->payable_type === BelievePointPurchase::class) {
            $purchase = BelievePointPurchase::find($paymentTransaction->payable_id);
            if (! $purchase) {
                return back()->with('error', 'Linked Believe Points purchase not found.');
            }

            BelievePointPurchaseSettlementService::settleManualPurchase(
                $purchase->id,
                'manual_'.$paymentTransaction->id.'_'.now()->timestamp,
                $paymentTransaction->payment_method,
                $request->user()->id,
                $request->input('admin_notes')
            );

            return back()->with('success', 'Believe Points purchase approved. Points have been credited to the user.');
        }

        $donation = $paymentTransaction->payable_type === Donation::class
            ? Donation::find($paymentTransaction->payable_id)
            : null;

        if (! $donation) {
            return back()->with('error', 'Linked donation not found.');
        }

        PaymentTransactionCompletionService::completeDonation(
            $donation,
            'manual_'.$paymentTransaction->id.'_'.now()->timestamp,
            $paymentTransaction->payment_method,
            $request->user()->id,
            $request->input('admin_notes')
        );

        $brp = (int) ($paymentTransaction->fresh()->reward_points
            ?? BelievePointsRewardService::donationBrpAmountForUser($donation->user));

        return back()->with('success', "Payment approved. +{$brp} BRP (Believe Reward Points) issued to donor.");
    }

    public function reject(Request $request, PaymentTransaction $paymentTransaction): RedirectResponse
    {
        $request->validate(['admin_notes' => 'required|string|max:1000']);

        if (! $paymentTransaction->isManual() || $paymentTransaction->status !== PaymentTransaction::STATUS_PENDING) {
            return back()->with('error', 'This transaction cannot be rejected.');
        }

        if ($paymentTransaction->payable_type === BelievePointPurchase::class) {
            $purchase = BelievePointPurchase::find($paymentTransaction->payable_id);
            if ($purchase) {
                BelievePointPurchaseSettlementService::rejectManualPurchase(
                    $purchase,
                    $request->user()->id,
                    $request->input('admin_notes')
                );
            } else {
                $paymentTransaction->update([
                    'status' => PaymentTransaction::STATUS_REJECTED,
                    'verified_by' => $request->user()->id,
                    'verified_at' => now(),
                    'admin_notes' => $request->input('admin_notes'),
                ]);
            }

            return back()->with('success', 'Believe Points purchase payment rejected.');
        }

        $donation = $paymentTransaction->payable_type === Donation::class
            ? Donation::find($paymentTransaction->payable_id)
            : null;

        if ($donation) {
            PaymentTransactionCompletionService::rejectManualDonation(
                $donation,
                $request->user()->id,
                $request->input('admin_notes')
            );
        } else {
            $paymentTransaction->update([
                'status' => PaymentTransaction::STATUS_REJECTED,
                'verified_by' => $request->user()->id,
                'verified_at' => now(),
                'admin_notes' => $request->input('admin_notes'),
            ]);
        }

        return back()->with('success', 'Payment rejected.');
    }
}
