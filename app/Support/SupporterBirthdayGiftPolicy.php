<?php

namespace App\Support;

use App\Models\Organization;
use App\Models\User;
use App\Models\UserFavoriteOrganization;
use App\Models\UserFollow;

class SupporterBirthdayGiftPolicy
{
    /**
     * Sender may send a birthday Believe Points gift if they follow the celebrant on the supporter graph,
     * if they follow at least one of the same registered nonprofits (favorite organizations) as the celebrant,
     * or if they are the nonprofit owner or a board member of a registered org the celebrant favorites.
     */
    public static function maySendGift(User $sender, User $celebrant): bool
    {
        if ($sender->id === $celebrant->id) {
            return false;
        }

        if (UserFollow::query()
            ->where('follower_id', $sender->id)
            ->where('following_id', $celebrant->id)
            ->exists()) {
            return true;
        }

        $celebrantOrgIds = UserFavoriteOrganization::query()
            ->where('user_id', $celebrant->id)
            ->whereNotNull('organization_id')
            ->pluck('organization_id')
            ->unique()
            ->filter()
            ->values();

        if ($celebrantOrgIds->isEmpty()) {
            return false;
        }

        if (UserFavoriteOrganization::query()
            ->where('user_id', $sender->id)
            ->whereIn('organization_id', $celebrantOrgIds)
            ->exists()) {
            return true;
        }

        return Organization::query()
            ->whereIn('id', $celebrantOrgIds)
            ->where(function ($q) use ($sender) {
                $q->where('user_id', $sender->id)
                    ->orWhereHas('boardMembers', function ($b) use ($sender) {
                        $b->where('user_id', $sender->id)->whereNotNull('user_id');
                    });
            })
            ->exists();
    }
}
