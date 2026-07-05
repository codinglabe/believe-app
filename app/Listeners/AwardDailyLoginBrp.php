<?php

namespace App\Listeners;

use App\Models\User;
use App\Services\ParticipationActivityService;
use App\Support\BrpParticipationModule;
use Illuminate\Auth\Events\Login;
use Illuminate\Support\Facades\Log;

/**
 * Awards daily login BRP once per calendar day when the module is enabled.
 */
class AwardDailyLoginBrp
{
    public function handle(Login $event): void
    {
        $user = $event->user;

        if (! $user instanceof User || ($user->role ?? null) !== 'user') {
            return;
        }

        try {
            ParticipationActivityService::complete(
                $user,
                BrpParticipationModule::DAILY_LOGIN,
                $user->id,
                'Participation reward for daily login',
                ['login_date' => now()->toDateString()],
                referenceType: 'daily_'.now()->format('Ymd'),
            );
        } catch (\Throwable $e) {
            Log::error('Failed to award daily login BRP', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
