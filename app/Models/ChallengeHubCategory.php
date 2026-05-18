<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ChallengeHubCategory extends Model
{
    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    protected $fillable = [
        'slug',
        'label',
        'icon',
        'cover_image_path',
        'filter_key',
        'is_new',
        'is_active',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'is_new' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function quizSubcategories(): HasMany
    {
        return $this->hasMany(ChallengeQuizSubcategory::class, 'challenge_hub_category_id');
    }
}
