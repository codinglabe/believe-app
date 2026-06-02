<?php

namespace App\Policies;

use App\Enums\PushNotificationModule;
use App\Models\PushNotificationLog;
use App\Models\User;

class PushNotificationLogPolicy
{
    public function viewAny(User $user): bool
    {
        return $this->isPlatformAdmin($user) || $this->hasOrganizationAccess($user);
    }

    public function view(User $user, PushNotificationLog $log): bool
    {
        if ($this->isPlatformAdmin($user)) {
            return true;
        }

        return $this->userCanAccessOrganization($user, $log->organization_id);
    }

    public function repush(User $user, PushNotificationLog $log): bool
    {
        return $this->isPlatformAdmin($user);
    }

    public function export(User $user): bool
    {
        return $this->viewAny($user);
    }

    private function isPlatformAdmin(User $user): bool
    {
        return $user->hasRole('admin') || (string) $user->role === 'admin';
    }

    private function hasOrganizationAccess(User $user): bool
    {
        return $user->hasNonprofitDashboardRole() || $user->organization !== null;
    }

    private function userCanAccessOrganization(User $user, ?int $organizationId): bool
    {
        if ($organizationId === null) {
            return false;
        }

        $scope = $this->organizationScopeForUser($user);

        return in_array((int) $organizationId, $scope, true);
    }

    /**
     * @return list<int>
     */
    public function organizationScopeForUser(User $user): array
    {
        if ($this->isPlatformAdmin($user)) {
            return [];
        }

        $ids = collect();

        $ids = $ids->merge(
            \App\Models\Organization::query()->where('user_id', $user->id)->pluck('id')
        );
        $ids = $ids->merge($user->boardMemberships()->pluck('organization_id'));

        $authOrg = \App\Models\Organization::forAuthUser($user);
        if ($authOrg) {
            $ids->push($authOrg->id);
        }

        return $ids->filter()->unique()->values()->map(fn ($id) => (int) $id)->all();
    }

    /**
     * @return array<string, string>
     */
    public static function moduleOptions(): array
    {
        return PushNotificationModule::labels();
    }
}
