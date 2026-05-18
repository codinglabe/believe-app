<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Campaign;

class CampaignPolicy
{
    public function viewAny(User $user)
    {
        return $user->canManageContent();
    }

    public function view(User $user, Campaign $campaign)
    {
        return $user->organization->id === $campaign->organization_id;
    }

    public function create(User $user)
    {
        return $user->canManageContent();
    }

    public function update(User $user, Campaign $campaign)
    {
        return $user->organization->id === $campaign->organization_id &&
            $user->canManageContent();

    }

    public function delete(User $user, Campaign $campaign)
    {
        return $user->organization->id === $campaign->organization_id &&
            $user->canManageContent();
    }
}
