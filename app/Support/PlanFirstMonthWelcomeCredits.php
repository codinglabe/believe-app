<?php

namespace App\Support;

use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * One-time welcome allowance on first plan subscription: $5 AI pack + $1 email credits.
 * Not granted on renewals or re-subscribe after cancel.
 */
final class PlanFirstMonthWelcomeCredits
{
    public static function aiTokensAmount(): int
    {
        return max(0, (int) config('services.plan_subscription.first_month_ai_tokens', 25_000));
    }

    public static function emailsAmount(): int
    {
        return max(0, (int) config('services.plan_subscription.first_month_emails', 1_000));
    }

    public static function alreadyGranted(User $user): bool
    {
        return Transaction::query()
            ->where('user_id', $user->id)
            ->where('type', 'plan_welcome_bonus')
            ->where('status', Transaction::STATUS_COMPLETED)
            ->exists();
    }

    /**
     * @return array{granted: bool, ai_tokens: int, emails: int}
     */
    public static function grantIfEligible(User $user, int $planId, string $sessionId): array
    {
        $aiTokens = self::aiTokensAmount();
        $emails = self::emailsAmount();

        if ($aiTokens === 0 && $emails === 0) {
            return ['granted' => false, 'ai_tokens' => 0, 'emails' => 0];
        }

        if (self::alreadyGranted($user)) {
            return ['granted' => false, 'ai_tokens' => 0, 'emails' => 0];
        }

        return DB::transaction(function () use ($user, $planId, $sessionId, $aiTokens, $emails) {
            $lockedUser = User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();

            if (self::alreadyGranted($lockedUser)) {
                return ['granted' => false, 'ai_tokens' => 0, 'emails' => 0];
            }

            if ($aiTokens > 0) {
                $lockedUser->increment('ai_tokens_included', $aiTokens);
            }

            if ($emails > 0) {
                $lockedUser->increment('emails_included', $emails);
            }

            Transaction::create([
                'user_id' => $lockedUser->id,
                'type' => 'plan_welcome_bonus',
                'status' => Transaction::STATUS_COMPLETED,
                'amount' => 0,
                'currency' => 'USD',
                'payment_method' => 'included',
                'transaction_id' => 'WELCOME-'.$sessionId,
                'meta' => StripeReferenceMode::withStoredLivemode([
                    'description' => 'First month welcome bonus: AI pack + email credits',
                    'stripe_session_id' => $sessionId,
                    'plan_id' => $planId,
                    'ai_tokens_added' => $aiTokens,
                    'emails_added' => $emails,
                ], $sessionId),
                'related_id' => $planId,
                'related_type' => \App\Models\Plan::class,
                'processed_at' => now(),
            ]);

            return ['granted' => true, 'ai_tokens' => $aiTokens, 'emails' => $emails];
        });
    }
}
