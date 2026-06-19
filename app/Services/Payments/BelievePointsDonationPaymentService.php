<?php

namespace App\Services\Payments;

use App\Contracts\Payments\PaymentServiceInterface;
use App\Models\Donation;
use App\Models\Organization;
use App\Models\PaymentTransaction;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class BelievePointsDonationPaymentService implements PaymentServiceInterface
{
    public function supports(string $paymentMethod): bool
    {
        return $paymentMethod === 'believe_points';
    }

    /**
     * @param  array<string, mixed>  $context
     */
    public function initiateDonation(
        User $user,
        Organization $organization,
        Donation $donation,
        PaymentTransaction $paymentTransaction,
        array $context = []
    ): Response|array {
        $pointsRequired = (float) $donation->amount;
        $user->refresh();

        if ($user->believe_points < $pointsRequired) {
            $donation->update(['status' => 'failed']);
            $paymentTransaction->update(['status' => PaymentTransaction::STATUS_REJECTED]);

            return redirect()->back()->withErrors([
                'payment_method' => "Insufficient Believe Points. You need {$pointsRequired} points but only have {$user->believe_points} points.",
            ]);
        }

        try {
            return DB::transaction(function () use ($user, $donation, $paymentTransaction, $pointsRequired) {
                if (! $user->deductBelievePoints($pointsRequired)) {
                    $donation->update(['status' => 'failed']);
                    $paymentTransaction->update(['status' => PaymentTransaction::STATUS_REJECTED]);

                    return redirect()->back()->withErrors([
                        'payment_method' => 'Failed to deduct Believe Points. Please try again.',
                    ]);
                }

                $ref = 'believe_points_donation_'.$donation->id;

                PaymentTransactionCompletionService::completeDonation(
                    $donation->fresh(),
                    $ref,
                    'believe_points'
                );

                return redirect(route('donations.success').'?donation_id='.$donation->id)
                    ->with('success', 'Donation completed successfully using Believe Points!');
            });
        } catch (\Throwable $e) {
            $donation->update(['status' => 'failed']);
            Log::error('Believe Points donation failed: '.$e->getMessage());

            return redirect()->back()->withErrors([
                'payment_method' => 'Failed to process donation: '.$e->getMessage(),
            ]);
        }
    }
}
