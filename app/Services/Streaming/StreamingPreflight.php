<?php

namespace App\Services\Streaming;

use App\Models\OrganizationLivestream;
use App\Models\StreamingMonthlyUsage;
use App\Models\User;
use App\Models\UserLivestream;
use Carbon\Carbon;

/**
 * Spec gates 3, 4, 7 (INTEGRATION.pdf):
 *   3. organization subscription is active
 *   4. user permission to stream
 *   7. streaming hours / billing precheck
 *
 * Step 6 (recording-consent acceptance) is intentionally not enforced here:
 * the existing `livestream_recording_declines` records are written by *guests*
 * after they join, so a queue-time check would always pass. Consent gating
 * belongs in the join flow / recording trigger, not at SQS enqueue.
 *
 * Every gate is opt-in via config('streaming.gates.*') and disabled by default.
 */
final class StreamingPreflight
{
    public function check(
        UserLivestream|OrganizationLivestream $livestream,
        User $user,
    ): PreflightResult {
        if ($result = $this->checkSubscription($user)) {
            return $result;
        }

        if ($result = $this->checkPermission($user)) {
            return $result;
        }

        if ($result = $this->checkMonthlyQuota($livestream)) {
            return $result;
        }

        return PreflightResult::allow();
    }

    private function checkSubscription(User $user): ?PreflightResult
    {
        if (! (bool) config('streaming.gates.require_subscription', false)) {
            return null;
        }

        // Cashier's `subscribed()` falls back to the "default" subscription type
        // when none is given. Let env override the type if the project uses
        // multiple subscription products.
        $type = (string) config('streaming.gates.subscription_type', 'default');
        if (! $user->subscribed($type)) {
            return PreflightResult::deny(
                'Active subscription is required to start a cloud stream.',
                'subscription_inactive',
            );
        }

        return null;
    }

    private function checkPermission(User $user): ?PreflightResult
    {
        $permission = (string) config('streaming.gates.permission_name', '');
        if ($permission === '') {
            return null;
        }

        if (! $user->can($permission)) {
            return PreflightResult::deny(
                "You do not have permission to start a cloud stream ({$permission}).",
                'permission_denied',
            );
        }

        return null;
    }

    private function checkMonthlyQuota(
        UserLivestream|OrganizationLivestream $livestream,
    ): ?PreflightResult {
        $hardCap = (int) config('streaming.gates.hard_quota_minutes', 0);
        if ($hardCap <= 0) {
            return null;
        }

        $orgId = $this->organizationKey($livestream);
        $usage = StreamingMonthlyUsage::query()
            ->where('organization_id', $orgId)
            ->where('month_key', Carbon::now()->format('Y-m'))
            ->first();

        $used = (int) ($usage?->total_minutes ?? 0);
        if ($used >= $hardCap) {
            return PreflightResult::deny(
                "Monthly streaming quota exhausted ({$used}/{$hardCap} minutes).",
                'quota_exhausted',
            );
        }

        return null;
    }

    /**
     * Mirror StreamingQueueService::accountUsageIfNeeded — usage rows key off
     * organization_id for org streams and user id for supporter streams.
     */
    private function organizationKey(UserLivestream|OrganizationLivestream $livestream): int
    {
        return $livestream instanceof OrganizationLivestream
            ? (int) $livestream->organization_id
            : (int) $livestream->user_id;
    }
}
