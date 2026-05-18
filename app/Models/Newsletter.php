<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Collection;

class Newsletter extends Model
{
    protected $fillable = [
        'organization_id',
        'newsletter_template_id',
        'subject',
        'content',
        'html_content',
        'send_via',
        'status',
        'scheduled_at',
        'sent_at',
        'total_recipients',
        'sent_count',
        'delivered_count',
        'opened_count',
        'clicked_count',
        'bounced_count',
        'unsubscribed_count',
        'metadata',
        // New scheduling fields
        'send_date',
        'schedule_type',
        'recurring_settings',
        // New targeting fields
        'target_type',
        'target_users',
        'target_organizations',
        'target_roles',
        'target_criteria',
        'is_public',
    ];

    protected $casts = [
        'scheduled_at' => 'datetime',
        'sent_at' => 'datetime',
        'send_date' => 'datetime',
        'metadata' => 'array',
        'recurring_settings' => 'array',
        'target_users' => 'array',
        'target_organizations' => 'array',
        'target_roles' => 'array',
        'target_criteria' => 'array',
        'is_public' => 'boolean',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(NewsletterTemplate::class, 'newsletter_template_id');
    }

    public function emails(): HasMany
    {
        return $this->hasMany(NewsletterEmail::class);
    }

    /**
     * Total recipients for scheduling UI (users or imported emails).
     */
    public function resolvedTotalRecipientsCount(): int
    {
        $segment = $this->target_criteria['organization_segment'] ?? null;
        if ($this->organization_id && $segment === 'newsletter_contacts') {
            $orgId = (int) $this->organization_id;

            return (int) NewsletterRecipient::query()
                ->active()
                ->where(function ($q) use ($orgId) {
                    $q->where('organization_id', $orgId)
                        ->orWhereNull('organization_id');
                })
                ->count();
        }

        return $this->getTargetedUsers()->count();
    }

    /**
     * Resolve user recipients. Org-owned sends may use {@see $target_criteria} {@code organization_segment}
     * (followers, donors, volunteers); imported contacts use {@see newsletter_contacts} and are not Users here.
     */
    public function getTargetedUsers(): Collection
    {
        $segment = $this->target_criteria['organization_segment'] ?? null;

        if ($segment && ! $this->organization_id) {
            return collect();
        }

        if ($this->organization_id && $segment === 'newsletter_contacts') {
            return collect();
        }

        if ($this->organization_id && in_array($segment, ['followers', 'donors', 'volunteers'], true)) {
            return $this->usersForOrganizationSegment((string) $segment);
        }

        switch ($this->target_type) {
            case 'all':
                return User::query()->whereNotNull('email_verified_at')->get();

            case 'roles':
                if (empty($this->target_roles)) {
                    return collect();
                }

                return User::query()
                    ->role($this->target_roles)
                    ->whereNotNull('email_verified_at')
                    ->get();

            case 'users':
                $ids = $this->target_users ?? [];

                return User::query()
                    ->whereIn('id', $ids)
                    ->whereNotNull('email_verified_at')
                    ->get();

            case 'organizations':
                return User::query()
                    ->whereHas('organizations', function ($query) {
                        $query->whereIn('organizations.id', $this->target_organizations ?? []);
                    })
                    ->whereNotNull('email_verified_at')
                    ->get();

            case 'specific':
                $users = collect();

                if (! empty($this->target_users)) {
                    $users = $users->merge(
                        User::query()
                            ->whereIn('id', $this->target_users)
                            ->whereNotNull('email_verified_at')
                            ->get()
                    );
                }

                if (! empty($this->target_organizations)) {
                    $orgUsers = User::query()
                        ->whereHas('organizations', function ($query) {
                            $query->whereIn('organizations.id', $this->target_organizations);
                        })
                        ->whereNotNull('email_verified_at')
                        ->get();
                    $users = $users->merge($orgUsers);
                }

                if (! empty($this->target_roles)) {
                    $roleUsers = User::query()
                        ->role($this->target_roles)
                        ->whereNotNull('email_verified_at')
                        ->get();
                    $users = $users->merge($roleUsers);
                }

                return $users->unique('id')->values();

            default:
                return collect();
        }
    }

    /**
     * Verified users for one organization audience segment (email sends).
     */
    protected function usersForOrganizationSegment(string $segment): Collection
    {
        $orgId = (int) $this->organization_id;

        return match ($segment) {
            'followers' => User::query()
                ->whereHas('favoriteOrganizations', function ($q) use ($orgId) {
                    $q->where('user_favorite_organizations.organization_id', $orgId);
                })
                ->whereNotNull('email_verified_at')
                ->get(),
            'donors' => $this->usersWhoDonatedToOrganization($orgId),
            'volunteers' => User::query()
                ->whereHas('jobApplications', function ($q) use ($orgId) {
                    $q->where('status', 'accepted')
                        ->whereHas('jobPost', function ($q2) use ($orgId) {
                            $q2->where('organization_id', $orgId)
                                ->where('type', 'volunteer');
                        });
                })
                ->whereNotNull('email_verified_at')
                ->get(),
            default => collect(),
        };
    }

    /**
     * Distinct verified users who have completed donations to this organization (wallet + FundMe).
     */
    protected function usersWhoDonatedToOrganization(int $organizationId): Collection
    {
        $ids = Donation::query()
            ->where('organization_id', $organizationId)
            ->whereIn('status', ['completed', 'active'])
            ->whereNotNull('user_id')
            ->pluck('user_id')
            ->merge(
                FundMeDonation::query()
                    ->where('organization_id', $organizationId)
                    ->where('status', FundMeDonation::STATUS_SUCCEEDED)
                    ->whereNotNull('user_id')
                    ->pluck('user_id')
            )
            ->unique()
            ->values()
            ->all();

        if ($ids === []) {
            return collect();
        }

        return User::query()
            ->whereIn('id', $ids)
            ->whereNotNull('email_verified_at')
            ->get();
    }

    public function getTargetedOrganizations(): Collection
    {
        if ($this->organization_id) {
            // Org-owned sends: do not fan out to every nonprofit on the platform unless explicitly selected.
            switch ($this->target_type) {
                case 'organizations':
                case 'specific':
                    return Organization::whereIn('id', $this->target_organizations ?? [])->get();

                default:
                    return collect();
            }
        }

        switch ($this->target_type) {
            case 'all':
                return Organization::where('status', 'active')->get();

            case 'organizations':
                return Organization::whereIn('id', $this->target_organizations ?? [])->get();

            case 'specific':
                if (! empty($this->target_organizations)) {
                    return Organization::whereIn('id', $this->target_organizations)->get();
                }

                return collect();

            default:
                return collect();
        }
    }

    // Helper methods
    public function getOpenRateAttribute(): float
    {
        if ($this->delivered_count === 0) {
            return 0;
        }

        return round(($this->opened_count / $this->delivered_count) * 100, 2);
    }

    public function getClickRateAttribute(): float
    {
        if ($this->delivered_count === 0) {
            return 0;
        }

        return round(($this->clicked_count / $this->delivered_count) * 100, 2);
    }

    public function getBounceRateAttribute(): float
    {
        if ($this->delivered_count === 0) {
            return 0;
        }

        return round(($this->bounced_count / $this->delivered_count) * 100, 2);
    }
}
