<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Newsletter extends Model
{
    protected $fillable = [
        'organization_id',
        'newsletter_template_id',
        'subject',
        'content',
        'html_content',
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
        'is_public'
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
        'is_public' => 'boolean'
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

    // Targeting methods
    public function getTargetedUsers()
    {
        switch ($this->target_type) {
            case 'all':
                return User::where('email_verified_at', '!=', null)->get();
            
            case 'users':
                return User::whereIn('id', $this->target_users ?? [])->get();
            
            case 'organizations':
                return User::whereHas('organizations', function($query) {
                    $query->whereIn('organizations.id', $this->target_organizations ?? []);
                })->get();
            
            case 'specific':
                $users = collect();
                
                // Add specific users
                if (!empty($this->target_users)) {
                    $users = $users->merge(User::whereIn('id', $this->target_users)->get());
                }
                
                // Add users from organizations
                if (!empty($this->target_organizations)) {
                    $orgUsers = User::whereHas('organizations', function($query) {
                        $query->whereIn('organizations.id', $this->target_organizations);
                    })->get();
                    $users = $users->merge($orgUsers);
                }
                
                // Add users by roles
                if (!empty($this->target_roles)) {
                    $roleUsers = User::role($this->target_roles)->get();
                    $users = $users->merge($roleUsers);
                }
                
                return $users->unique('id');
            
            default:
                return collect();
        }
    }

    public function getTargetedOrganizations()
    {
        switch ($this->target_type) {
            case 'all':
                return Organization::where('status', 'active')->get();
            
            case 'organizations':
                return Organization::whereIn('id', $this->target_organizations ?? [])->get();
            
            case 'specific':
                if (!empty($this->target_organizations)) {
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
        if ($this->delivered_count == 0) return 0;
        return round(($this->opened_count / $this->delivered_count) * 100, 2);
    }

    public function getClickRateAttribute(): float
    {
        if ($this->delivered_count == 0) return 0;
        return round(($this->clicked_count / $this->delivered_count) * 100, 2);
    }

    public function getBounceRateAttribute(): float
    {
        if ($this->sent_count == 0) return 0;
        return round(($this->bounced_count / $this->sent_count) * 100, 2);
    }
}