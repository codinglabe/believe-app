<?php

namespace App\Services;

use App\Models\User;
use App\Support\BrpParticipationModule;

/**
 * Coordinates participation confirmation and BRP reward for qualifying activities.
 */
final class ParticipationActivityService
{
    /**
     * Notify participation confirmation, then award BRP via the reward engine.
     *
     * Donations use {@see DonationCompletionNotifier} for confirmation instead.
     *
     * @param  array<string, mixed>  $metadata
     */
    public static function complete(
        User $user,
        string $module,
        int $referenceId,
        string $description,
        array $metadata = [],
        ?string $ledgerSource = null,
        string $referenceType = 'default',
    ): bool {
        if ($module !== BrpParticipationModule::DONATION) {
            app(ParticipationConfirmationNotifier::class)->notify(
                $user,
                $module,
                $referenceId,
                $referenceType,
                $metadata,
            );
        }

        return ParticipationBrpAwardService::award(
            $user,
            $module,
            $referenceId,
            $description,
            $metadata,
            $ledgerSource,
            $referenceType,
        );
    }
}
