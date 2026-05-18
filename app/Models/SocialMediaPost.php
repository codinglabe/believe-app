<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class SocialMediaPost extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'content',
        'media_files',
        'status',
        'scheduled_at',
        'published_at',
        'platform_post_id',
        'platform_response',
        'error_message',
        'analytics',
        'is_published',
    ];

    protected $casts = [
        'scheduled_at' => 'datetime',
        'published_at' => 'datetime',
        'media_files' => 'array',
        'platform_response' => 'array',
        'analytics' => 'array',
        'is_published' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function socialMediaAccounts(): BelongsToMany
    {
        return $this->belongsToMany(SocialMediaAccount::class, 'social_media_post_accounts');
    }

    public function scopeDraft($query)
    {
        return $query->where('status', 'draft');
    }

    public function scopeScheduled($query)
    {
        return $query->where('status', 'scheduled');
    }

    public function scopePublished($query)
    {
        return $query->where('status', 'published');
    }

    public function scopeFailed($query)
    {
        return $query->where('status', 'failed');
    }

    public function isScheduled(): bool
    {
        return $this->status === 'scheduled' && $this->scheduled_at && $this->scheduled_at->isFuture();
    }

    public function isPublished(): bool
    {
        return $this->status === 'published' && $this->is_published;
    }

    public function isDraft(): bool
    {
        return $this->status === 'draft';
    }

    public function isFailed(): bool
    {
        return $this->status === 'failed';
    }

    public function getStatusColorAttribute(): string
    {
        return match ($this->status) {
            'draft' => 'bg-gray-100 text-gray-800',
            'scheduled' => 'bg-blue-100 text-blue-800',
            'published' => 'bg-green-100 text-green-800',
            'failed' => 'bg-red-100 text-red-800',
            default => 'bg-gray-100 text-gray-800',
        };
    }

    public function getStatusIconAttribute(): string
    {
        return match ($this->status) {
            'draft' => 'edit',
            'scheduled' => 'clock',
            'published' => 'check-circle',
            'failed' => 'x-circle',
            default => 'circle',
        };
    }
}
