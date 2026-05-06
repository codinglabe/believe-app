<?php

namespace App\Models;

use App\Support\ConnectionHubType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Validation\Rule;

class EventType extends Model
{
    /** Event types with this category prefix are reserved for Connection Hub “Companion” listings. */
    public const COMPANION_HUB_CATEGORY_PREFIX = 'Companion · ';

    protected $fillable = [
        'name',
        'category',
        'description',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function events(): HasMany
    {
        return $this->hasMany(Event::class);
    }

    public function courses(): HasMany
    {
        return $this->hasMany(Course::class);
    }

    public function scopeForCompanionHub($query)
    {
        return $query->where('category', 'like', self::COMPANION_HUB_CATEGORY_PREFIX.'%');
    }

    /** Active “topic” rows for Learning / Events / Earning (excludes companion-only catalog). */
    public static function generalCatalogForProps()
    {
        return static::query()
            ->where('is_active', true)
            ->where(function ($q) {
                $q->whereNull('category')
                    ->orWhere('category', 'not like', self::COMPANION_HUB_CATEGORY_PREFIX.'%');
            })
            ->orderBy('category')
            ->orderBy('name')
            ->get(['id', 'name', 'category']);
    }

    /** Active companion topic rows (category prefixed with {@see COMPANION_HUB_CATEGORY_PREFIX}). */
    public static function companionCatalogForProps()
    {
        return static::query()
            ->where('is_active', true)
            ->forCompanionHub()
            ->orderBy('category')
            ->orderBy('name')
            ->get(['id', 'name', 'category']);
    }

    /**
     * @return array<int, \Illuminate\Contracts\Validation\Rule|string>
     */
    public static function validationRulesForHubType(string $type): array
    {
        return [
            'required',
            Rule::exists('event_types', 'id')->where(function ($query) use ($type) {
                $query->where('is_active', true);
                if ($type === ConnectionHubType::COMPANION) {
                    $query->where('category', 'like', self::COMPANION_HUB_CATEGORY_PREFIX.'%');
                } else {
                    $query->where(function ($q) {
                        $q->whereNull('category')
                            ->orWhere('category', 'not like', self::COMPANION_HUB_CATEGORY_PREFIX.'%');
                    });
                }
            }),
        ];
    }
}
