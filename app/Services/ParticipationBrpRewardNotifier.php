<?php

namespace App\Services;

use App\Models\User;
use App\Notifications\ParticipationBrpRewardNotification;
use App\Support\BrpParticipationModule;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Sends BRP reward notifications after the participation reward engine awards points.
 */
class ParticipationBrpRewardNotifier
{
    public function __construct(
        private readonly FirebaseService $firebaseService,
    ) {}

    /**
     * @param  array<string, mixed>  $metadata
     */
    public function notify(
        int $userId,
        string $module,
        int $referenceId,
        float $pointsAwarded,
        float $currentBalance,
        string $referenceType = 'default',
        array $metadata = [],
    ): void {
        if ($referenceId <= 0 || $pointsAwarded <= 0) {
            return;
        }

        DB::afterCommit(function () use ($userId, $module, $referenceId, $pointsAwarded, $currentBalance, $referenceType, $metadata): void {
            $cacheKey = $this->cacheKey($module, $referenceType, $referenceId);
            if (! Cache::add($cacheKey, 1, now()->addDays(30))) {
                return;
            }

            $user = User::query()->find($userId);
            if ($user === null) {
                Cache::forget($cacheKey);

                return;
            }

            $pointsLabel = self::formatPoints($pointsAwarded);
            $balanceLabel = self::formatPoints($currentBalance);
            $title = 'Believe Reward Points earned';
            $body = "🎉 Thank you for participating! You earned {$pointsLabel} BRPs. Your BRP Balance is {$balanceLabel}.";
            $deepLink = BrpParticipationModule::resolveDeepLink($module, $metadata);

            try {
                $user->notify(new ParticipationBrpRewardNotification(
                    $module,
                    $title,
                    $body,
                    $deepLink,
                    $pointsAwarded,
                    $currentBalance,
                    $referenceId,
                    $referenceType,
                    $metadata,
                ));
            } catch (\Throwable $e) {
                Log::warning('Participation BRP reward in-app notification failed', [
                    'user_id' => $user->id,
                    'module' => $module,
                    'reference_id' => $referenceId,
                    'error' => $e->getMessage(),
                ]);
            }

            $pushModule = BrpParticipationModule::pushNotificationModule($module);

            $pushData = $this->firebaseService->stringifyFcmData([
                'type' => 'participation_brp_reward',
                'title' => $title,
                'body' => $body,
                'url' => $deepLink,
                'click_action' => $deepLink,
                'participation_module' => $module,
                'reference_id' => (string) $referenceId,
                'reference_type' => $referenceType,
                'points_awarded' => (string) $pointsAwarded,
                'current_brp_balance' => (string) $currentBalance,
                'source_type' => 'participation_brp',
                'source_id' => (string) $referenceId,
                'module_name' => $pushModule->value,
                'module_record_id' => $referenceId,
                'created_by' => $user->id,
                'deep_link' => parse_url($deepLink, PHP_URL_PATH) ?: $deepLink,
            ]);

            try {
                $this->firebaseService->sendToUser($user->id, $title, $body, $pushData);
            } catch (\Throwable $e) {
                Log::warning('Participation BRP reward push notification failed', [
                    'user_id' => $user->id,
                    'module' => $module,
                    'reference_id' => $referenceId,
                    'error' => $e->getMessage(),
                ]);
            }
        });
    }

    public static function formatPoints(float $points): string
    {
        return rtrim(rtrim(number_format($points, 2), '0'), '.');
    }

    private function cacheKey(string $module, string $referenceType, int $referenceId): string
    {
        return 'participation_brp_reward_notify:'.$module.':'.$referenceType.':'.$referenceId;
    }
}
