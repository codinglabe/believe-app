<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class SocialMediaAccount extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'platform',
        'username',
        'display_name',
        'profile_url',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function posts(): BelongsToMany
    {
        return $this->belongsToMany(SocialMediaPost::class, 'social_media_post_accounts');
    }

    public function getPlatformIconAttribute(): string
    {
        return match ($this->platform) {
            'facebook' => 'facebook',
            'twitter' => 'twitter',
            'instagram' => 'instagram',
            'linkedin' => 'linkedin',
            'youtube' => 'youtube',
            'tiktok' => 'tiktok',
            default => 'globe',
        };
    }

    public function getPlatformColorAttribute(): string
    {
        return match ($this->platform) {
            'facebook' => '#1877F2',
            'twitter' => '#1DA1F2',
            'instagram' => '#E4405F',
            'linkedin' => '#0A66C2',
            'youtube' => '#FF0000',
            'tiktok' => '#000000',
            default => '#6B7280',
        };
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeByPlatform($query, $platform)
    {
        return $query->where('platform', $platform);
    }
}
