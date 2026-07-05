<?php

namespace App\Observers;

use App\Models\User;
use App\Models\UserFavoriteOrganization;
use App\Services\ParticipationActivityService;
use App\Support\BrpParticipationModule;

class UserFavoriteOrganizationObserver
{
    public function created(UserFavoriteOrganization $favorite): void
    {
        if ($favorite->care_alliance_id !== null && $favorite->organization_id === null && $favorite->excel_data_id === null) {
            return;
        }

        $user = $favorite->user;
        if (! $user instanceof User) {
            return;
        }

        $referenceId = (int) ($favorite->organization_id ?? $favorite->excel_data_id ?? $favorite->id);

        ParticipationActivityService::complete(
            $user,
            BrpParticipationModule::ORGANIZATION_FOLLOW,
            $referenceId,
            'Participation reward for following an organization',
            [
                'favorite_id' => $favorite->id,
                'organization_id' => $favorite->organization_id,
                'excel_data_id' => $favorite->excel_data_id,
            ],
            referenceType: $favorite->organization_id ? 'organization' : 'excel_data',
        );
    }
}
