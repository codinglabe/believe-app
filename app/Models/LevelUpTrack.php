<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LevelUpTrack extends Model
{
    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    protected $fillable = [
        'slug',
        'name',
        'status',
        'subject_categories',
        'hub_category_id',
        'quiz_subcategory',
        'sort_order',
        'cover_image_path',
        'hub_card_description',
    ];

    protected function casts(): array
    {
        return [
            'subject_categories' => 'array',
        ];
    }

    public function hubCategory(): BelongsTo
    {
        return $this->belongsTo(ChallengeHubCategory::class, 'hub_category_id');
    }

    public function questionEvents(): HasMany
    {
        return $this->hasMany(UserChallengeQuestionEvent::class, 'level_up_track_id');
    }

    public function challengeEntries(): HasMany
    {
        return $this->hasMany(LevelUpChallengeEntry::class, 'level_up_track_id');
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }
}
