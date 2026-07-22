<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Auth;

class ProjectComment extends Model
{
    protected $fillable = [
        'card_id',
        'parent_id',
        'user_id',
        'body',
    ];

    public function card(): BelongsTo
    {
        return $this->belongsTo(ProjectCard::class, 'card_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function replies(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id')->oldest();
    }

    public function likes(): HasMany
    {
        return $this->hasMany(ProjectCommentLike::class, 'comment_id');
    }

    public function scopeRoots($query)
    {
        return $query->whereNull('parent_id');
    }

    public function isLikedBy(?int $userId = null): bool
    {
        $userId = $userId ?? Auth::id();
        if (! $userId) {
            return false;
        }

        if ($this->relationLoaded('likes')) {
            return $this->likes->contains('user_id', $userId);
        }

        return $this->likes()->where('user_id', $userId)->exists();
    }
}
