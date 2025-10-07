<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Campaign extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'user_id',
        'name',
        'start_date',
        'end_date',
        'send_time_local',
        'channels',
        'rrule',
        'status'
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'channels' => 'array',
        'rrule' => 'array',
    ];

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function scheduledDrops()
    {
        return $this->hasMany(ScheduledDrop::class);
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function selectedUsers()
    {
        return $this->belongsToMany(User::class, 'campaign_user')
            ->withTimestamps();
    }

    public function scopeForOrganization($query, $organizationId)
    {
        return $query->where('organization_id', $organizationId);
    }
}
