<?php

namespace App\Observers;

use App\Models\Organization;
use App\Services\ParticipationActivityService;
use App\Support\BrpParticipationModule;

class OrganizationObserver
{
    public function created(Organization $organization): void
    {
        $this->awardReferralIfApproved($organization);
    }

    public function updated(Organization $organization): void
    {
        if (! $organization->wasChanged('registration_status')) {
            return;
        }

        $this->awardReferralIfApproved($organization);
    }

    private function awardReferralIfApproved(Organization $organization): void
    {
        if ($organization->registration_status !== 'approved') {
            return;
        }

        $referrer = $organization->referrer;
        if ($referrer === null) {
            return;
        }

        ParticipationActivityService::complete(
            $referrer,
            BrpParticipationModule::ORGANIZATION_REFERRAL,
            $organization->id,
            'Organization referral reward: referred organization approved',
            [
                'organization_id' => $organization->id,
                'organization_name' => $organization->name,
            ],
        );
    }
}
