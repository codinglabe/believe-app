<?php

namespace App\Jobs;

use App\Models\SmsPackage;
use App\Models\User;
use App\Services\BelievePointsPaymentMethodSyncService;
use App\Support\StripeCustomerChargeAmount;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Laravel\Cashier\Cashier;
use Stripe\Exception\ApiErrorException;

class ProcessSmsWalletAutoRechargeJob
{
    use Dispatchable, SerializesModels;

    public function __construct(public int $userId) {}

    public function handle(): void
    {
        $user = User::query()->find($this->userId);
        if (! $user || ! $user->sms_auto_recharge_enabled) {
            return;
        }

        $pmId = $user->sms_auto_recharge_pm_id;
        if (! $pmId || ! $user->hasStripeId()) {
            return;
        }

        $threshold = $user->sms_auto_recharge_threshold !== null
            ? (int) $user->sms_auto_recharge_threshold
            : 50;

        $package = SmsPackage::active()->find((int) ($user->sms_auto_recharge_package_id ?? 0))
            ?? SmsPackage::active()->ordered()->first();

        if (! $package) {
            Log::warning('SMS auto-recharge: no active SMS package', ['user_id' => $user->id]);

            return;
        }

        Cache::lock('sms-wallet-auto-recharge:'.$user->id, 120)->block(10, function () use ($user, $threshold, $package, $pmId) {
            $user->refresh();

            if (! $user->sms_auto_recharge_enabled || $user->sms_auto_recharge_pm_id !== $pmId) {
                return;
            }

            $included = (int) ($user->sms_included ?? 0);
            $used = (int) ($user->sms_used ?? 0);
            $left = max(0, $included - $used);

            if ($left > $threshold) {
                return;
            }

            if ($user->sms_last_auto_recharge_at
                && $user->sms_last_auto_recharge_at->gt(now()->subHour())) {
                return;
            }

            BelievePointsPaymentMethodSyncService::ensurePaymentMethodBelongsToCustomer($user, $pmId);
            $user->refresh();

            $transaction = $user->recordTransaction([
                'type' => 'sms_purchase',
                'amount' => $package->price,
                'payment_method' => 'stripe',
                'status' => 'pending',
                'meta' => [
                    'type' => 'sms_purchase',
                    'source' => 'auto_recharge',
                    'sms_to_add' => $package->sms_count,
                    'package_id' => $package->id,
                    'package_name' => $package->name,
                    'description' => 'Auto-recharge '.$package->name,
                ],
            ]);

            $amountCents = StripeCustomerChargeAmount::chargeCentsFromNetUsd((float) $package->price, 'card');
            $stripe = Cashier::stripe();

            try {
                $intent = $stripe->paymentIntents->create([
                    'amount' => $amountCents,
                    'currency' => config('cashier.currency'),
                    'customer' => $user->stripe_id,
                    'payment_method' => $pmId,
                    'off_session' => true,
                    'confirm' => true,
                    'description' => 'SMS wallet auto-recharge',
                    'metadata' => [
                        'transaction_id' => (string) $transaction->id,
                        'user_id' => (string) $user->id,
                        'type' => 'sms_auto_recharge',
                        'sms_to_add' => (string) $package->sms_count,
                        'package_id' => (string) $package->id,
                    ],
                ], [
                    'idempotency_key' => 'sms-ar-'.$transaction->id,
                ]);

                if ($intent->status === 'succeeded') {
                    $smsToAdd = (int) $package->sms_count;
                    if ($smsToAdd > 0) {
                        $user->increment('sms_included', $smsToAdd);
                    }

                    $transaction->update([
                        'status' => 'completed',
                        'meta' => array_merge($transaction->meta ?? [], [
                            'stripe_payment_intent' => $intent->id,
                            'sms_added' => $smsToAdd,
                            'source' => 'auto_recharge',
                        ]),
                    ]);

                    $user->update(['sms_last_auto_recharge_at' => now()]);

                    Log::info('SMS wallet auto-recharge succeeded', [
                        'user_id' => $user->id,
                        'transaction_id' => $transaction->id,
                        'sms_added' => $smsToAdd,
                    ]);
                } else {
                    $err = $intent->last_payment_error ?? null;
                    $failureMessage = $err ? ($err->message ?? null) : 'Payment status: '.$intent->status;
                    $transaction->update([
                        'status' => 'failed',
                        'meta' => array_merge($transaction->meta ?? [], [
                            'failure' => $failureMessage,
                        ]),
                    ]);
                    $this->disableAutoRechargeOnFailure($user->fresh(), $failureMessage ?? 'payment_failed');
                }
            } catch (\Throwable $e) {
                $failureCode = $e instanceof ApiErrorException ? $e->getStripeCode() : 'auto_recharge_error';
                $transaction->update([
                    'status' => 'failed',
                    'meta' => array_merge($transaction->meta ?? [], [
                        'failure' => $e->getMessage(),
                        'failure_code' => $failureCode,
                    ]),
                ]);
                $this->disableAutoRechargeOnFailure($user->fresh(), $failureCode ?? $e->getMessage());
                Log::warning('SMS wallet auto-recharge error', [
                    'user_id' => $user->id,
                    'transaction_id' => $transaction->id,
                    'error' => $e->getMessage(),
                ]);
            }
        });
    }

    private function disableAutoRechargeOnFailure(User $user, string $reason): void
    {
        $user->update([
            'sms_auto_recharge_enabled' => false,
        ]);

        Log::info('SMS auto-recharge disabled after failure', [
            'user_id' => $user->id,
            'reason' => $reason,
        ]);
    }
}
