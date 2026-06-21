<?php

namespace App\Http\Controllers\Organization;

use App\Http\Controllers\Controller;
use App\Models\Donation;
use App\Models\Organization;
use App\Models\PaymentTransaction;
use App\Services\Payments\PaymentTransactionCompletionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class OrganizationManualPaymentVerificationController extends Controller
{
    public function index(Request $request): InertiaResponse|RedirectResponse
    {
        $org = Organization::forAuthUser($request->user());
        if (! $org) {
            return redirect()->route('dashboard')->with('error', 'No organization found.');
        }

        $status = $request->input('status', 'pending');

        $transactions = PaymentTransaction::query()
            ->with(['user:id,name,email', 'payable'])
            ->where('organization_id', $org->id)
            ->whereIn('payment_method', ['cashapp', 'zelle', 'venmo_manual'])
            ->when($status !== 'all', fn ($q) => $q->where('status', $status))
            ->orderByDesc('created_at')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (PaymentTransaction $tx) => $this->transactionPayload($tx));

        return Inertia::render('Organization/ManualPaymentVerification', [
            'organization' => [
                'id' => $org->id,
                'name' => $org->name,
            ],
            'transactions' => $transactions,
            'filters' => ['status' => $status],
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
            ],
        ]);
    }

    public function approve(Request $request, PaymentTransaction $paymentTransaction): RedirectResponse
    {
        $org = Organization::forAuthUser($request->user());
        if (! $org || (int) $paymentTransaction->organization_id !== (int) $org->id) {
            abort(403);
        }

        $request->validate(['admin_notes' => 'nullable|string|max:1000']);

        if (! $paymentTransaction->isManual() || $paymentTransaction->status !== PaymentTransaction::STATUS_PENDING) {
            return back()->with('error', 'This transaction cannot be approved.');
        }

        $donation = $this->resolveDonation($paymentTransaction);
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

        return back()->with('success', 'Payment approved. The donor has been notified and received +5 BRP (Believe Reward Points).');
    }

    public function reject(Request $request, PaymentTransaction $paymentTransaction): RedirectResponse
    {
        $org = Organization::forAuthUser($request->user());
        if (! $org || (int) $paymentTransaction->organization_id !== (int) $org->id) {
            abort(403);
        }

        $request->validate(['admin_notes' => 'required|string|max:1000']);

        if (! $paymentTransaction->isManual() || $paymentTransaction->status !== PaymentTransaction::STATUS_PENDING) {
            return back()->with('error', 'This transaction cannot be rejected.');
        }

        $donation = $this->resolveDonation($paymentTransaction);

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

        return back()->with('success', 'Payment rejected. The donor has been notified.');
    }

    private function resolveDonation(PaymentTransaction $paymentTransaction): ?Donation
    {
        if ($paymentTransaction->payable_type !== Donation::class) {
            return null;
        }

        return Donation::find($paymentTransaction->payable_id);
    }

    /**
     * @return array<string, mixed>
     */
    private function transactionPayload(PaymentTransaction $tx): array
    {
        return [
            'id' => $tx->id,
            'user_name' => $tx->user?->name,
            'user_email' => $tx->user?->email,
            'amount' => (float) $tx->amount,
            'payment_method' => $tx->payment_method,
            'status' => $tx->status,
            'receipt_image_url' => $tx->receipt_image ? asset('storage/'.$tx->receipt_image) : null,
            'donation_id' => $tx->payable_type === Donation::class ? $tx->payable_id : null,
            'metadata' => $tx->metadata,
            'admin_notes' => $tx->admin_notes,
            'created_at' => $tx->created_at?->toDateTimeString(),
            'verified_at' => $tx->verified_at?->toDateTimeString(),
        ];
    }
}
