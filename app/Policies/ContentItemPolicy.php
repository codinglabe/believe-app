<?php

namespace App\Policies;

use App\Models\User;
use App\Models\ContentItem;

class ContentItemPolicy
{
    public function viewAny(User $user)
    {
        return $user->canManageContent();
    }

    public function view(User $user, ContentItem $contentItem)
    {
        return $user->organization->id === $contentItem->organization_id;
    }

    public function create(User $user)
    {
        return $user->canManageContent();
    }

    public function update(User $user, ContentItem $contentItem)
    {
        return $user->organization->id === $contentItem->organization_id &&
            $user->canManageContent();
    }

    public function delete(User $user, ContentItem $contentItem)
    {
        return $user->organization->id === $contentItem->organization_id &&
            ($user->isOrganizationAdmin() || $user->id === $contentItem->user_id);
    }
}
