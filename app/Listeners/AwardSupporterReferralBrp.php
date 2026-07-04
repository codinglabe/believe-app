<?php

namespace App\Listeners;

use App\Models\User;
use App\Services\ParticipationActivityService;
use App\Support\BrpParticipationModule;
use Illuminate\Auth\Events\Verified;
use Illuminate\Support\Facades\Log;

/**
 * Awards BRP to the referrer when a referred supporter verifies their email.
 */
class AwardSupporterReferralBrp
{
    public function handle(Verified $event): void
    {
        $user = $event->user;

        if (! $user instanceof User || ($user->role ?? null) !== 'user') {
            return;
        }

        $referrerId = (int) ($user->referred_by ?? 0);
        if ($referrerId <= 0) {
            return;
        }

        $referrer = User::find($referrerId);
        if ($referrer === null) {
            return;
        }

        try {
            ParticipationActivityService::complete(
                $referrer,
                BrpParticipationModule::SUPPORTER_REFERRAL,
                $user->id,
                'Supporter referral reward: referred member verified',
                [
                    'referred_user_id' => $user->id,
                    'referred_user_email' => $user->email,
                ],
            );
        } catch (\Throwable $e) {
            Log::error('Failed to award supporter referral BRP', [
                'referrer_id' => $referrerId,
                'referred_user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
