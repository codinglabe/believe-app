<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CareAlliance extends Model
{
    protected $fillable = [
        'creator_user_id',
        'hub_organization_id',
        'slug',
        'name',
        'description',
        'city',
        'state',
        'website',
        'ein',
        'management_fee_bps',
        'fund_model',
        'status',
        'balance_cents',
    ];

    protected $casts = [
        'management_fee_bps' => 'integer',
        'balance_cents' => 'integer',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creator_user_id');
    }

    public function hubOrganization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'hub_organization_id');
    }

    public function primaryActionCategories(): BelongsToMany
    {
        return $this->belongsToMany(PrimaryActionCategory::class, 'ca_primary_action_categories')
            ->withTimestamps();
    }

    public function memberships(): HasMany
    {
        return $this->hasMany(CareAllianceMembership::class);
    }

    public function invitations(): HasMany
    {
        return $this->hasMany(CareAllianceInvitation::class);
    }

    public function joinRequests(): HasMany
    {
        return $this->hasMany(CareAllianceJoinRequest::class);
    }

    public function campaigns(): HasMany
    {
        return $this->hasMany(CareAllianceCampaign::class);
    }

    /**
     * Active alliances an organization may request to join (not already linked, no open invite or pending request).
     *
     * @return array<int, array{id: int, slug: string, name: string, city: string|null, state: string|null}>
     */
    public static function searchForOrganizationJoin(int $organizationId, int $requestingUserId, string $q, int $limit = 20): array
    {
        $q = trim($q);
        if (strlen($q) < 2) {
            return [];
        }

        $escaped = str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $q);
        $like = '%'.$escaped.'%';

        return static::query()
            ->where('status', 'active')
            ->where('creator_user_id', '!=', $requestingUserId)
            ->where(function ($query) use ($like, $q) {
                $query->where('name', 'like', $like)
                    ->orWhere('slug', 'like', $like);
                $digits = preg_replace('/\D/', '', $q);
                if (strlen($digits) >= 2) {
                    $query->orWhere('ein', 'like', '%'.$digits.'%');
                }
            })
            ->whereDoesntHave('memberships', function ($sub) use ($organizationId) {
                $sub->where('organization_id', $organizationId)
                    ->whereIn('status', ['pending', 'active']);
            })
            ->whereDoesntHave('invitations', function ($sub) use ($organizationId) {
                $sub->where('organization_id', $organizationId)
                    ->where('status', 'pending');
            })
            ->whereDoesntHave('joinRequests', function ($sub) use ($organizationId) {
                $sub->where('organization_id', $organizationId)
                    ->where('status', 'pending');
            })
            ->orderBy('name')
            ->limit($limit)
            ->get(['id', 'slug', 'name', 'city', 'state'])
            ->map(fn (self $a) => [
                'id' => $a->id,
                'slug' => $a->slug,
                'name' => $a->name,
                'city' => $a->city,
                'state' => $a->state,
            ])
            ->values()
            ->all();
    }
}
