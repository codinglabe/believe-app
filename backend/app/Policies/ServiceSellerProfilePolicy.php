<?php

namespace App\Policies;

use App\Models\ServiceSellerProfile;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class ServiceSellerProfilePolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->role === 'admin';
    }

    public function view(User $user, ServiceSellerProfile $seller): bool
    {
        return $user->role === 'admin';
    }

    public function suspend(User $user, ServiceSellerProfile $seller): bool
    {
        return $user->role === 'admin' && !$seller->is_suspended;
    }

    public function unsuspend(User $user, ServiceSellerProfile $seller): bool
    {
        return $user->role === 'admin' && $seller->is_suspended;
    }

    public function delete(User $user, ServiceSellerProfile $seller): bool
    {
        return $user->role === 'admin';
    }
}
