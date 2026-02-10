<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CommunityVideo extends Model
{
    protected $fillable = [
        'title',
        'slug',
        'description',
        'thumbnail_url',
        'video_url',
        'duration_seconds',
        'views',
        'likes',
        'organization_id',
        'user_id',
        'category',
        'location',
        'is_featured',
    ];

    protected $casts = [
        'is_featured' => 'boolean',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function getCreatorNameAttribute(): string
    {
        if ($this->organization_id && $this->relationLoaded('organization')) {
            return $this->organization->name ?? 'Unknown';
        }
        if ($this->user_id && $this->relationLoaded('user')) {
            return $this->user->name ?? 'Unknown';
        }
        return 'Community';
    }

    public function getFormattedDurationAttribute(): string
    {
        $m = (int) floor($this->duration_seconds / 60);
        $s = $this->duration_seconds % 60;
        return sprintf('%d:%02d', $m, $s);
    }

    public function getTimeAgoAttribute(): string
    {
        return $this->created_at->diffForHumans();
    }
}
