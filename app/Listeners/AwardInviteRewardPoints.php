<?php

namespace App\Listeners;

use App\Models\Organization;
use App\Models\OrganizationInvite;
use Illuminate\Auth\Events\Verified;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Starts the organization-invite Believe Points schedule when the invited org verifies email.
 *
 * Installment 1 (10 Believe Points) runs here. Months 2–24 are credited by the scheduled Artisan
 * command `organizations:process-invite-believe-point-schedule` (10/month for installments 1–12,
 * then 5/month for 13–24).
 *
 * Legacy invites that already have `points_awarded_at` set (old one-time Merchant Hub reward_points)
 * are skipped.
 */
class AwardInviteRewardPoints
{
    public function handle(Verified $event): void
    {
        $user = $event->user;

        if (! in_array($user->role, ['organization', 'organization_pending'], true)) {
            return;
        }

        try {
            $organization = Organization::where('user_id', $user->id)->first();

            if ($organization === null) {
                return;
            }

            $invite = OrganizationInvite::query()
                ->where('email', $user->email)
                ->where('ein', $organization->ein)
                ->where('status', 'accepted')
                ->where('believe_points_installments_credited', 0)
                ->first();

            if ($invite === null) {
                return;
            }

            // Legacy: one-time Merchant Hub reward_points + points_awarded_at — do not start BP schedule
            if ($invite->points_awarded_at !== null) {
                return;
            }

            $inviter = $invite->inviter;

            if ($inviter === null) {
                Log::warning('Inviter not found for organization invite', [
                    'invite_id' => $invite->id,
                ]);

                return;
            }

            DB::transaction(function () use ($invite, $inviter) {
                $now = now();
                $invite->update([
                    'believe_points_schedule_started_at' => $now,
                    'believe_points_installments_credited' => 1,
                ]);

                $inviter->increment('believe_points', 10);

                Log::info('Organization invite Believe Points schedule started (installment 1/24)', [
                    'inviter_id' => $inviter->id,
                    'invite_id' => $invite->id,
                    'amount' => 10,
                    'new_believe_points' => $inviter->fresh()->believe_points,
                ]);
            });
        } catch (\Exception $e) {
            Log::error('Failed to start organization invite Believe Points schedule', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }
}
