<?php

namespace App\Services;

use App\Models\AiVideo;
use App\Models\Organization;
use App\Models\User;
use App\Support\PlanAiMediaStudioSubscriptionCredits;
use Illuminate\Database\Eloquent\Builder;

/**
 * AI Media Studio balance breakdown for the dashboard (calendar-month billing cycle).
 */
class AiMediaStudioBalanceService
{
    /**
     * @return array{
     *     current_balance: float,
     *     monthly_included: float,
     *     used_this_month: float,
     *     pending_renders: float,
     *     refunded_this_month: float,
     *     billing_cycle: array{label: string, start: string, end: string, days_until_reset: int}
     * }
     */
    public function summaryForUser(User $user): array
    {
        $start = now()->startOfMonth();
        $end = now()->endOfMonth();
        $scope = $this->videosQuery($user);

        $pending = (float) (clone $scope)
            ->whereNotIn('status', [
                AiVideo::STATUS_READY_FOR_REVIEW,
                AiVideo::STATUS_APPROVED,
                AiVideo::STATUS_PUBLISHED,
                AiVideo::STATUS_FAILED,
            ])
            ->sum('media_studio_credits_charged');

        $refunded = (float) (clone $scope)
            ->whereNotNull('media_studio_credits_refunded_at')
            ->whereBetween('media_studio_credits_refunded_at', [$start, $end])
            ->sum('media_studio_credits_charged');

        $used = (float) (clone $scope)
            ->whereBetween('created_at', [$start, $end])
            ->whereIn('status', [
                AiVideo::STATUS_READY_FOR_REVIEW,
                AiVideo::STATUS_APPROVED,
                AiVideo::STATUS_PUBLISHED,
            ])
            ->whereNull('media_studio_credits_refunded_at')
            ->sum('media_studio_credits_charged');

        $daysUntilReset = max(0, (int) now()->diffInDays($end->copy()->endOfDay(), false));

        return [
            'current_balance' => round((float) ($user->ai_media_studio_credits ?? 0), 2),
            'monthly_included' => round($this->monthlyIncludedCredits($user), 2),
            'used_this_month' => round($used, 2),
            'pending_renders' => round($pending, 2),
            'refunded_this_month' => round($refunded, 2),
            'billing_cycle' => [
                'label' => $start->format('M j').' – '.$end->format('M j, Y'),
                'start' => $start->toDateString(),
                'end' => $end->toDateString(),
                'days_until_reset' => $daysUntilReset,
            ],
        ];
    }

    /**
     * @return array{amount: float, sign: 'positive'|'negative', kind: 'charge'|'refunded'}|null
     */
    public function costDisplayForVideo(AiVideo $video): ?array
    {
        $charged = round((float) ($video->media_studio_credits_charged ?? 0), 2);
        if ($charged <= 0) {
            return null;
        }

        if ($video->media_studio_credits_refunded_at !== null) {
            return [
                'amount' => $charged,
                'sign' => 'positive',
                'kind' => 'refunded',
            ];
        }

        if ($video->status === AiVideo::STATUS_FAILED) {
            return null;
        }

        return [
            'amount' => $charged,
            'sign' => 'negative',
            'kind' => 'charge',
        ];
    }

    /**
     * @return Builder<AiVideo>
     */
    public function videosQuery(User $user): Builder
    {
        $org = Organization::forAuthUser($user);
        if ($org) {
            return AiVideo::query()->where('organization_id', $org->id);
        }

        return AiVideo::query()->where('user_id', $user->id);
    }

    private function monthlyIncludedCredits(User $user): float
    {
        if ($user->subscribed()) {
            return PlanAiMediaStudioSubscriptionCredits::renewalGrantAmount();
        }

        $org = Organization::forAuthUser($user);
        if ($org?->user && $org->user->subscribed()) {
            return PlanAiMediaStudioSubscriptionCredits::renewalGrantAmount();
        }

        return 0.0;
    }
}
