<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProjectList extends Model
{
    protected $fillable = [
        'board_id',
        'name',
        'position',
        'archived_at',
    ];

    protected function casts(): array
    {
        return [
            'position' => 'integer',
            'archived_at' => 'datetime',
        ];
    }

    public function board(): BelongsTo
    {
        return $this->belongsTo(ProjectBoard::class, 'board_id');
    }

    public function cards(): HasMany
    {
        return $this->hasMany(ProjectCard::class, 'list_id')->orderBy('position');
    }

    public function scopeActive($query)
    {
        return $query->whereNull('archived_at');
    }

    public function isArchived(): bool
    {
        return $this->archived_at !== null;
    }
}
