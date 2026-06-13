<?php

namespace App\Services;

use App\Mail\SupporterPrimaryOrganizationChangedMail;
use App\Models\Organization;
use App\Models\SupporterPrimaryOrganizationChange;
use App\Models\User;
use App\Models\UserFavoriteOrganization;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

class SupporterPrimaryOrganizationService
{
    /**
     * Resolve a registered, approved organization owned by a referrer user.
     */
    public function registeredOrganizationForReferrer(?User $referrer): ?Organization
    {
        if ($referrer === null) {
            return null;
        }

        $role = (string) ($referrer->role ?? '');
        if (! in_array($role, ['organization', 'organization_pending'], true)) {
            return null;
        }

        return Organization::query()
            ->where('user_id', $referrer->id)
            ->active()
            ->excludingCareAllianceHubs()
            ->first();
    }

    /**
     * Assign primary organization from org referral registration and lock it.
     */
    public function assignLockedPrimaryFromReferrer(User $supporter, User $referrer): void
    {
        $organization = $this->registeredOrganizationForReferrer($referrer);
        if ($organization === null) {
            return;
        }

        $this->ensureFavoriteOrganization($supporter, $organization);

        $supporter->forceFill([
            'primary_organization_id' => $organization->id,
            'primary_organization_locked' => true,
        ])->save();
    }

    public function ensureFavoriteOrganization(User $supporter, Organization $organization): void
    {
        $exists = UserFavoriteOrganization::query()
            ->where('user_id', $supporter->id)
            ->where('organization_id', $organization->id)
            ->exists();

        if ($exists) {
            return;
        }

        UserFavoriteOrganization::create([
            'user_id' => $supporter->id,
            'organization_id' => $organization->id,
            'notifications' => true,
        ]);
    }

    /**
     * Change primary organization for a locked supporter (immediate, stays locked).
     */
    public function changeLockedPrimaryOrganization(User $supporter, int $newOrganizationId, string $reason): void
    {
        if (! $supporter->primary_organization_locked) {
            throw new \InvalidArgumentException('Primary organization is not locked for this supporter.');
        }

        $organization = Organization::query()
            ->active()
            ->excludingCareAllianceHubs()
            ->whereKey($newOrganizationId)
            ->first();

        if ($organization === null) {
            throw new \InvalidArgumentException('The selected organization is not available.');
        }

        $previousOrganizationId = $supporter->primary_organization_id ? (int) $supporter->primary_organization_id : null;

        if ($previousOrganizationId === $organization->id) {
            throw new \InvalidArgumentException('You already have this organization as your primary organization.');
        }

        $favoriteIds = $supporter->favoriteOrganizations()
            ->pluck('organizations.id')
            ->map(fn ($id) => (int) $id)
            ->all();

        if (! in_array($organization->id, $favoriteIds, true)) {
            $this->ensureFavoriteOrganization($supporter, $organization);
        }

        DB::transaction(function () use ($supporter, $organization, $previousOrganizationId, $reason) {
            $secondaryIds = collect($supporter->secondary_organization_ids ?? [])
                ->map(fn ($id) => (int) $id)
                ->filter(fn (int $id) => $id > 0 && $id !== $organization->id)
                ->values()
                ->all();

            $supporter->forceFill([
                'primary_organization_id' => $organization->id,
                'primary_organization_locked' => true,
                'secondary_organization_ids' => $secondaryIds,
            ])->save();

            $change = SupporterPrimaryOrganizationChange::create([
                'user_id' => $supporter->id,
                'previous_organization_id' => $previousOrganizationId,
                'new_organization_id' => $organization->id,
                'notified_organization_id' => $previousOrganizationId,
                'reason' => $reason,
            ]);

            if ($previousOrganizationId !== null) {
                $previousOrg = Organization::query()->find($previousOrganizationId);
                if ($previousOrg !== null) {
                    $this->notifyOrganizationOfChange($previousOrg, $supporter, $change);
                }
            }
        });
    }

    public function notifyOrganizationOfChange(
        Organization $organization,
        User $supporter,
        SupporterPrimaryOrganizationChange $change
    ): void {
        $recipient = $organization->email ?: $organization->user?->email;
        if ($recipient === null || $recipient === '') {
            return;
        }

        $dashboardUrl = route('organization.supporters.index');

        Mail::to($recipient)->queue(
            new SupporterPrimaryOrganizationChangedMail($organization, $supporter, $change, $dashboardUrl)
        );
    }

  /**
     * @return array{primary_count: int, secondary_count: int, change_logs_count: int}
     */
    public function supporterCountsForOrganization(Organization $organization): array
    {
        $orgId = (int) $organization->id;

        return [
            'primary_count' => $this->primarySupportersCountForOrganization($orgId),
            'secondary_count' => $this->secondarySupportersCountForOrganization($orgId),
            'change_logs_count' => SupporterPrimaryOrganizationChange::query()
                ->where('notified_organization_id', $orgId)
                ->count(),
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function primarySupportersForOrganization(Organization $organization, int $limit = 100, ?string $search = null): array
    {
        $orgId = (int) $organization->id;
        $search = $this->normalizeSupporterSearch($search);

        return User::query()
            ->where('role', 'user')
            ->where('primary_organization_id', $orgId)
            ->when($search !== null, fn ($query) => $this->applyUserNameEmailSearch($query, $search))
            ->orderBy('name')
            ->limit($limit)
            ->get(['id', 'name', 'email', 'image', 'slug', 'role', 'primary_organization_id', 'primary_organization_locked'])
            ->map(fn (User $user) => $this->mapSupporterUser($user, 'primary'))
            ->values()
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function secondarySupportersForOrganization(Organization $organization, int $limit = 100, ?string $search = null): array
    {
        $orgId = (int) $organization->id;
        $search = $this->normalizeSupporterSearch($search);

        $secondaryFavorites = UserFavoriteOrganization::query()
            ->where('organization_id', $orgId)
            ->whereHas('user', function ($q) use ($orgId, $search) {
                $q->where('role', 'user')
                    ->where(function ($inner) use ($orgId) {
                        $inner->whereNull('primary_organization_id')
                            ->orWhere('primary_organization_id', '!=', $orgId);
                    });

                if ($search !== null) {
                    $this->applyUserNameEmailSearch($q, $search);
                }
            })
            ->with(['user:id,name,email,image,slug,role,primary_organization_id,primary_organization_locked'])
            ->latest()
            ->limit($limit)
            ->get();

        return $secondaryFavorites
            ->map(function (UserFavoriteOrganization $favorite) {
                if ($favorite->user === null) {
                    return null;
                }

                return array_merge(
                    $this->mapSupporterUser($favorite->user, 'secondary'),
                    [
                        'favorite_id' => $favorite->id,
                        'joined_at' => $favorite->created_at?->toIso8601String(),
                    ]
                );
            })
            ->filter()
            ->values()
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function changeLogsForOrganization(Organization $organization, int $limit = 50): array
    {
        $orgId = (int) $organization->id;

        return SupporterPrimaryOrganizationChange::query()
            ->where('notified_organization_id', $orgId)
            ->with([
                'user:id,name,email,slug,image',
                'newOrganization:id,name',
                'previousOrganization:id,name',
            ])
            ->latest()
            ->limit($limit)
            ->get()
            ->map(function (SupporterPrimaryOrganizationChange $change) {
                return [
                    'id' => $change->id,
                    'reason' => $change->reason,
                    'created_at' => $change->created_at?->toIso8601String(),
                    'supporter' => $change->user ? [
                        'id' => $change->user->id,
                        'name' => $change->user->name,
                        'email' => $change->user->email,
                        'slug' => $change->user->slug,
                        'image' => $change->user->image,
                    ] : null,
                    'previous_organization' => $change->previousOrganization ? [
                        'id' => $change->previousOrganization->id,
                        'name' => $change->previousOrganization->name,
                    ] : null,
                    'new_organization' => $change->newOrganization ? [
                        'id' => $change->newOrganization->id,
                        'name' => $change->newOrganization->name,
                    ] : null,
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @return array{primary: array<int, array<string, mixed>>, secondary: array<int, array<string, mixed>>, primary_count: int, secondary_count: int}
     */
    public function supportersPayloadForOrganization(Organization $organization, int $limit = 50): array
    {
        $counts = $this->supporterCountsForOrganization($organization);

        return [
            'primary' => $this->primarySupportersForOrganization($organization, $limit),
            'secondary' => $this->secondarySupportersForOrganization($organization, $limit),
            'primary_count' => $counts['primary_count'],
            'secondary_count' => $counts['secondary_count'],
        ];
    }

    private function primarySupportersCountForOrganization(int $orgId): int
    {
        return User::query()
            ->where('role', 'user')
            ->where('primary_organization_id', $orgId)
            ->count();
    }

    private function secondarySupportersCountForOrganization(int $orgId): int
    {
        return UserFavoriteOrganization::query()
            ->where('organization_id', $orgId)
            ->whereHas('user', function ($q) use ($orgId) {
                $q->where('role', 'user')
                    ->where(function ($inner) use ($orgId) {
                        $inner->whereNull('primary_organization_id')
                            ->orWhere('primary_organization_id', '!=', $orgId);
                    });
            })
            ->count();
    }

    private function normalizeSupporterSearch(?string $search): ?string
    {
        if ($search === null) {
            return null;
        }

        $search = trim($search);
        if ($search === '') {
            return null;
        }

        return mb_substr($search, 0, 100);
    }

  /**
     * @param  \Illuminate\Database\Eloquent\Builder<User>  $query
     */
    private function applyUserNameEmailSearch($query, string $search): void
    {
        $like = '%'.$this->escapeLike($search).'%';

        $query->where(function ($inner) use ($like) {
            $inner->where('name', 'like', $like)
                ->orWhere('email', 'like', $like);
        });
    }

    private function escapeLike(string $value): string
    {
        return str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $value);
    }

    /**
     * @return array<string, mixed>
     */
    public function mapSupporterUser(User $user, string $organizationStatus): array
    {
        return [
            'id' => (int) $user->id,
            'user_id' => (int) $user->id,
            'slug' => $user->slug,
            'name' => (string) $user->name,
            'email' => (string) $user->email,
            'image' => $user->image,
            'role' => $user->role,
            'organization_status' => $organizationStatus,
            'primary_organization_locked' => (bool) $user->primary_organization_locked,
            'user' => [
                'id' => (int) $user->id,
                'slug' => $user->slug,
                'name' => (string) $user->name,
                'email' => (string) $user->email,
                'image' => $user->image,
                'role' => $user->role,
            ],
        ];
    }

    public function supporterReferralUrl(User $orgOwner): ?string
    {
        if (empty($orgOwner->referral_code)) {
            return null;
        }

        return url('/register/user?ref='.$orgOwner->referral_code);
    }
}
