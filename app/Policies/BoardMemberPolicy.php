<?php

namespace App\Policies;

use App\Models\BoardMember;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class BoardMemberPolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user, ?Organization $organization = null): bool
    {
        // If no organization is provided, check if user can view any organizations
        if (!$organization) {
            return $user->organizations()->exists() || $user->boardMemberships()->exists();
        }

        // If organization is provided, check if user can view board members for this specific organization
        return $user->id === $organization->user_id ||
            $organization->boardMembers()->where('user_id', $user->id)->exists();
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, BoardMember $boardMember): bool
    {
        return $user->id === $boardMember->organization->user_id ||
            $user->id === $boardMember->user_id;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user, Organization $organization): bool
    {
        return $user->id === $organization->user_id;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, BoardMember $boardMember): bool
    {
        return $user->id === $boardMember->organization->user_id;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, BoardMember $boardMember): bool
    {
        return $user->id === $boardMember->organization->user_id;
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, BoardMember $boardMember): bool
    {
        return $user->id === $boardMember->organization->user_id;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, BoardMember $boardMember): bool
    {
        return $user->id === $boardMember->organization->user_id;
    }
}
