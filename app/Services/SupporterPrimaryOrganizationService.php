<?php

namespace App\Services;

use App\Jobs\SendSupporterPrimaryOrganizationChangedEmail;
use App\Models\Organization;
use App\Models\SupporterPrimaryOrganizationChange;
use App\Models\User;
use App\Models\UserFavoriteOrganization;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SupporterPrimaryOrganizationService
{
    /**
     * Default organization filter for listing pages (jobs, events, etc.) — not profile editing.
     */
    public function defaultOrganizationFilterId(?User $user): ?int
    {
        if ($user === null || ($user->role ?? '') !== 'user') {
            return null;
        }

        $id = $user->primary_organization_id;

        return $id !== null && (int) $id > 0 ? (int) $id : null;
    }

    public function defaultOrganizationFilterSlug(?User $user): ?string
    {
        $id = $this->defaultOrganizationFilterId($user);
        if ($id === null) {
            return null;
        }

        $org = Organization::query()->with('user:id,slug')->find($id);

        $slug = $org?->user?->slug;

        return is_string($slug) && $slug !== '' ? $slug : null;
    }

    /**
     * Listing filters: use the query param when the user chose one; otherwise primary org.
     */
    public function resolveListingOrganizationFilterId(Request $request, string $key = 'organization_id'): ?int
    {
        if ($request->has($key)) {
            $value = $request->input($key);
            if ($value === null || $value === '' || $value === 'all') {
                return null;
            }

            $id = (int) $value;

            return $id > 0 ? $id : null;
        }

        return $this->defaultOrganizationFilterId($request->user());
    }

    public function resolveListingOrganizationSlugFilter(Request $request, string $key = 'organization'): ?string
    {
        if ($request->has($key)) {
            $value = $request->input($key);
            if ($value === null || $value === '' || $value === 'all') {
                return null;
            }

            return (string) $value;
        }

        return $this->defaultOrganizationFilterSlug($request->user());
    }

    /**
     * Marketplace-style comma-separated org ids. URL filter only — never updates profile or sends mail.
     *
     * @return array<int, int>
     */
    public function resolveListingOrganizationIdsCsv(Request $request, string $key = 'organizations'): array
    {
        if ($request->has($key)) {
            $raw = trim((string) $request->input($key, ''));
            if ($raw === '' || $raw === 'all') {
                return [];
            }

            return array_values(array_filter(
                array_map('intval', explode(',', $raw)),
                fn (int $id) => $id > 0
            ));
        }

        $defaultId = $this->defaultOrganizationFilterId($request->user());

        return $defaultId ? [$defaultId] : [];
    }

    /**
     * Connection Hub courses use `courses.organization_id` = the org owner's user id.
     * Listing filter: explicit slug in URL, or primary org when the param is absent.
     */
    public function resolveListingCourseOwnerUserId(Request $request, string $key = 'organization'): ?int
    {
        if ($request->has($key)) {
            $value = $request->input($key);
            if ($value === null || $value === '' || $value === 'all') {
                return null;
            }

            $userId = User::query()->where('slug', (string) $value)->value('id');

            return $userId && (int) $userId > 0 ? (int) $userId : null;
        }

        $primaryId = $this->defaultOrganizationFilterId($request->user());
        if ($primaryId === null) {
            return null;
        }

        $userId = Organization::query()->where('id', $primaryId)->value('user_id');

        return $userId && (int) $userId > 0 ? (int) $userId : null;
    }

    /**
     * True when the listing uses the supporter's primary org as default (no org param in URL yet).
     *
     * @return array{locked: bool, primary_id: ?int, primary_name: ?string, primary_slug: ?string}
     */
    public function listingFilterLockState(Request $request, string $paramKey = 'organization_id'): array
    {
        $primaryId = $this->defaultOrganizationFilterId($request->user());
        $locked = $primaryId !== null && ! $request->has($paramKey);

        $primaryName = null;
        $primarySlug = null;
        if ($primaryId !== null) {
            $org = Organization::query()->with('user:id,slug')->find($primaryId);
            $primaryName = $org?->name;
            $primarySlug = $org?->user?->slug;
        }

        return [
            'locked' => $locked,
            'primary_id' => $primaryId,
            'primary_name' => $primaryName,
            'primary_slug' => $primarySlug,
        ];
    }

    /**
     * Profile edit only: audit log + email to the previous primary org when it changes.
     */
    public function recordProfilePrimaryOrganizationChange(
        User $supporter,
        ?int $previousOrganizationId,
        ?int $newOrganizationId,
        ?string $reason = null
    ): void {
        if ($previousOrganizationId === $newOrganizationId) {
            return;
        }

        $change = SupporterPrimaryOrganizationChange::create([
            'user_id' => $supporter->id,
            'previous_organization_id' => $previousOrganizationId,
            'new_organization_id' => $newOrganizationId,
            'notified_organization_id' => $previousOrganizationId,
            'reason' => $reason,
        ]);

        if ($previousOrganizationId !== null) {
            $previousOrg = Organization::query()->with('user:id,email')->find($previousOrganizationId);
            if ($previousOrg !== null) {
                $changeId = $change->id;
                DB::afterCommit(function () use ($changeId) {
                    SendSupporterPrimaryOrganizationChangedEmail::dispatch($changeId);
                });
            }
        }
    }
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

            $this->recordProfilePrimaryOrganizationChange(
                $supporter,
                $previousOrganizationId,
                $organization->id,
                $reason
            );
        });
    }

    /**
     * @deprecated Dispatched via {@see SendSupporterPrimaryOrganizationChangedEmail} on the mail queue.
     */
    public function notifyOrganizationOfChange(
        Organization $organization,
        User $supporter,
        SupporterPrimaryOrganizationChange $change
    ): void {
        SendSupporterPrimaryOrganizationChangedEmail::dispatch($change->id);
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
