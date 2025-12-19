<?php

namespace App\Policies;

use App\Models\BridgeKycKybSubmission;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class BridgeKycKybSubmissionPolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('kyb.verification.read') || $user->hasPermissionTo('kyb.verification.manage');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, BridgeKycKybSubmission $submission): bool
    {
        return $user->hasPermissionTo('kyb.verification.read') || $user->hasPermissionTo('kyb.verification.manage');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, BridgeKycKybSubmission $submission): bool
    {
        return $user->hasPermissionTo('kyb.verification.approve') || 
               $user->hasPermissionTo('kyb.verification.reject') || 
               $user->hasPermissionTo('kyb.verification.manage');
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, BridgeKycKybSubmission $submission): bool
    {
        return $user->hasPermissionTo('kyb.verification.manage');
    }
}








