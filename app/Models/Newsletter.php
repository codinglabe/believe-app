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
     * Resolve user recipients. Not limited to donation/follow lists — uses roles, selections, and org links only.
     */
    public function getTargetedUsers(): Collection
    {
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
