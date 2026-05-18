<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ContentItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'user_id',
        'type',
        'title',
        'body',
        'meta',
        'is_approved'
    ];

    protected $casts = [
        'meta' => 'array',
        'is_approved' => 'boolean',
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
    public function scopePrayers($query)
    {
        return $query->where('type', 'prayer');
    }

    public function scopeApproved($query)
    {
        return $query->where('is_approved', true);
    }

    public function scopeForOrganization($query, $organizationId)
    {
        return $query->where('organization_id', $organizationId);
    }
}
