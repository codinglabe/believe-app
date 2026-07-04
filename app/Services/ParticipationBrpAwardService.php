<?php

namespace App\Services;

use App\Models\BrpParticipationAward;
use App\Models\User;
use App\Support\BrpParticipationModule;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Idempotent flat BRP participation rewards across all platform modules.
 */
final class ParticipationBrpAwardService
{
    /**
     * Award flat participation BRP if the module is enabled and this reference has not been rewarded.
     */
    public static function award(
        User $user,
        string $module,
        int $referenceId,
        string $description,
        array $metadata = [],
        ?string $ledgerSource = null,
        string $referenceType = 'default',
    ): bool {
        if ($referenceId <= 0) {
            return false;
        }

        $points = BrpParticipationSettingsService::awardForUser($user, $module);
        if ($points <= 0) {
            return false;
        }

        $awardContext = null;

        $awarded = (bool) DB::transaction(function () use ($user, $module, $referenceId, $description, $metadata, $ledgerSource, $points, $referenceType, &$awardContext) {
            $existing = BrpParticipationAward::query()
                ->where('module', $module)
                ->where('reference_type', $referenceType)
                ->where('reference_id', $referenceId)
                ->lockForUpdate()
                ->first();

            if ($existing !== null) {
                return false;
            }

            $lockedUser = User::lockForUpdate()->find($user->id);
            if ($lockedUser === null) {
                return false;
            }

            $source = $ledgerSource ?? BrpParticipationModule::ledgerSource($module);

            $lockedUser->addRewardPoints(
                $points,
                $source,
                $referenceId,
                $description,
                array_merge([
                    'participation_module' => $module,
                    'reference_type' => $referenceType,
                    'money_moves' => BrpParticipationSettingsService::moneyMoves($module),
                    'category' => BrpParticipationModule::categoryFor(
                        $module,
                        BrpParticipationSettingsService::moneyMoves($module),
                    ),
                ], $metadata),
            );

            BrpParticipationAward::create([
                'user_id' => $lockedUser->id,
                'module' => $module,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'points_awarded' => $points,
                'metadata' => $metadata !== [] ? $metadata : null,
            ]);

            Log::info('Participation BRP awarded', [
                'user_id' => $lockedUser->id,
                'module' => $module,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'points' => $points,
            ]);

            $awardContext = [
                'user_id' => $lockedUser->id,
                'module' => $module,
                'reference_id' => $referenceId,
                'reference_type' => $referenceType,
                'points' => $points,
                'current_balance' => $lockedUser->fresh()->availableRewardPointsBalance(),
                'metadata' => $metadata,
            ];

            return true;
        });

        if ($awarded && $awardContext !== null) {
            app(ParticipationBrpRewardNotifier::class)->notify(
                $awardContext['user_id'],
                $awardContext['module'],
                $awardContext['reference_id'],
                $awardContext['points'],
                $awardContext['current_balance'],
                $awardContext['reference_type'],
                $awardContext['metadata'],
            );
        }

        return $awarded;
    }

    public static function previewAmount(?User $user, string $module): float
    {
        return BrpParticipationSettingsService::awardForUser($user, $module);
    }

    public static function alreadyAwarded(string $module, int $referenceId, string $referenceType = 'default'): bool
    {
        return BrpParticipationAward::query()
            ->where('module', $module)
            ->where('reference_type', $referenceType)
            ->where('reference_id', $referenceId)
            ->exists();
    }
}
