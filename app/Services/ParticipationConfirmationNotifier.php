<?php

namespace App\Services;

use App\Models\User;
use App\Notifications\ParticipationConfirmedNotification;
use App\Support\BrpParticipationModule;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Sends participation confirmation notifications (no BRP mention).
 */
class ParticipationConfirmationNotifier
{
    public function __construct(
        private readonly FirebaseService $firebaseService,
    ) {}

    /**
     * @param  array<string, mixed>  $metadata
     */
    public function notify(
        User $user,
        string $module,
        int $referenceId,
        string $referenceType = 'default',
        array $metadata = [],
    ): void {
        if ($referenceId <= 0) {
            return;
        }

        if (BrpParticipationSettingsService::awardForUser($user, $module) <= 0) {
            return;
        }

        $userId = $user->id;

        DB::afterCommit(function () use ($userId, $module, $referenceId, $referenceType, $metadata): void {
            $cacheKey = $this->cacheKey($module, $referenceType, $referenceId);
            if (! Cache::add($cacheKey, 1, now()->addDays(30))) {
                return;
            }

            $freshUser = User::query()->find($userId);
            if ($freshUser === null) {
                Cache::forget($cacheKey);

                return;
            }

            $title = BrpParticipationModule::confirmationTitle($module);
            $body = BrpParticipationModule::confirmationMessage($module);
            $deepLink = BrpParticipationModule::resolveDeepLink($module, $metadata);

            try {
                $freshUser->notify(new ParticipationConfirmedNotification(
                    $module,
                    $title,
                    $body,
                    $deepLink,
                    $referenceId,
                    $referenceType,
                    $metadata,
                ));
            } catch (\Throwable $e) {
                Log::warning('Participation confirmation in-app notification failed', [
                    'user_id' => $freshUser->id,
                    'module' => $module,
                    'reference_id' => $referenceId,
                    'error' => $e->getMessage(),
                ]);
            }

            $pushModule = BrpParticipationModule::pushNotificationModule($module);

            $pushData = $this->firebaseService->stringifyFcmData([
                'type' => 'participation_confirmed',
                'title' => $title,
                'body' => $body,
                'url' => $deepLink,
                'click_action' => $deepLink,
                'participation_module' => $module,
                'reference_id' => (string) $referenceId,
                'reference_type' => $referenceType,
                'source_type' => 'participation',
                'source_id' => (string) $referenceId,
                'module_name' => $pushModule->value,
                'module_record_id' => $referenceId,
                'created_by' => $freshUser->id,
                'deep_link' => parse_url($deepLink, PHP_URL_PATH) ?: $deepLink,
            ]);

            try {
                $this->firebaseService->sendToUser($freshUser->id, $title, $body, $pushData);
            } catch (\Throwable $e) {
                Log::warning('Participation confirmation push notification failed', [
                    'user_id' => $freshUser->id,
                    'module' => $module,
                    'reference_id' => $referenceId,
                    'error' => $e->getMessage(),
                ]);
            }
        });
    }

    private function cacheKey(string $module, string $referenceType, int $referenceId): string
    {
        return 'participation_confirm_notify:'.$module.':'.$referenceType.':'.$referenceId;
    }
}
