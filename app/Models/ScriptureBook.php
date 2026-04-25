<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ScriptureBook extends Model
{
    protected $fillable = [
        'religion',
        'identifier',
        'name',
        'short_name',
        'language',
        'translation_label',
        'topics',
        'is_active',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'topics' => 'array',
            'is_active' => 'boolean',
        ];
    }

    /** @return HasMany<ScriptureVerse, $this> */
    public function verses(): HasMany
    {
        return $this->hasMany(ScriptureVerse::class);
    }
}
