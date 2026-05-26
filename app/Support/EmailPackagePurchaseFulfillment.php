<?php

namespace App\Support;

use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Facades\Log;

final class EmailPackagePurchaseFulfillment
{
    /**
     * @return array{emails_added: int, already_fulfilled: bool, transaction: Transaction|null}
     */
    public static function fulfill(User $user, object $session, string $sessionId): array
    {
        $metadata = is_object($session->metadata ?? null)
            ? (array) $session->metadata
            : (array) ($session->metadata ?? []);

        $transaction = self::resolveTransaction($user, $metadata, $session);
        $emailsToAdd = self::resolveEmailsToAdd($metadata, $transaction);

        if ($transaction && $transaction->status === 'completed') {
            $prior = (int) ($transaction->meta['emails_added'] ?? $emailsToAdd);

            return [
                'emails_added' => $prior,
                'already_fulfilled' => true,
                'transaction' => $transaction,
            ];
        }

        if ($emailsToAdd > 0) {
            $user->increment('emails_included', $emailsToAdd);
        }

        if ($transaction) {
            $transaction->update([
                'status' => 'completed',
                'meta' => array_merge(
                    is_array($transaction->meta) ? $transaction->meta : [],
                    [
                        'type' => 'email_purchase',
                        'stripe_session_id' => $sessionId,
                        'stripe_payment_intent' => $session->payment_intent ?? null,
                        'payment_status' => $session->payment_status ?? null,
                        'emails_added' => $emailsToAdd,
                    ]
                ),
            ]);
        }

        Log::info('Email package purchase fulfilled', [
            'user_id' => $user->id,
            'transaction_id' => $transaction?->id,
            'emails_added' => $emailsToAdd,
            'session_id' => $sessionId,
        ]);

        return [
            'emails_added' => $emailsToAdd,
            'already_fulfilled' => false,
            'transaction' => $transaction,
        ];
    }

    /**
     * Stripe Checkout metadata values must be strings.
     *
     * @param  array<string, mixed>  $metadata
     */
    public static function checkoutMetadata(User $user, Transaction $transaction, int $emailsCount, int $packageId, float $amount, array $extra = []): array
    {
        return array_merge([
            'user_id' => (string) $user->id,
            'transaction_id' => (string) $transaction->id,
            'type' => 'email_purchase',
            'emails_to_add' => (string) $emailsCount,
            'package_id' => (string) $packageId,
            'amount' => (string) $amount,
        ], $extra);
    }

    /**
     * @param  array<string, mixed>  $metadata
     */
    private static function resolveTransaction(User $user, array $metadata, object $session): ?Transaction
    {
        $transactionId = $metadata['transaction_id'] ?? null;
        if ($transactionId !== null && $transactionId !== '') {
            $transaction = Transaction::query()->find((int) $transactionId);
            if ($transaction && (int) $transaction->user_id === (int) $user->id) {
                return $transaction;
            }
        }

        $amountUsd = isset($session->amount_total) ? round(((int) $session->amount_total) / 100, 2) : null;

        $query = Transaction::query()
            ->where('user_id', $user->id)
            ->where('type', 'email_purchase')
            ->where('status', 'pending')
            ->orderByDesc('id');

        if ($amountUsd !== null) {
            $match = (clone $query)->where('amount', $amountUsd)->first();
            if ($match) {
                return $match;
            }
        }

        return $query->first();
    }

    /**
     * @param  array<string, mixed>  $metadata
     */
    private static function resolveEmailsToAdd(array $metadata, ?Transaction $transaction): int
    {
        $fromMetadata = (int) ($metadata['emails_to_add'] ?? 0);
        if ($fromMetadata > 0) {
            return $fromMetadata;
        }

        if ($transaction) {
            $meta = is_array($transaction->meta) ? $transaction->meta : [];

            return (int) ($meta['emails_to_add'] ?? 0);
        }

        return 0;
    }
}
