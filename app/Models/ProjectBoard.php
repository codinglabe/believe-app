<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProjectBoard extends Model
{
    protected $fillable = [
        'organization_id',
        'created_by',
        'name',
        'description',
        'background',
        'is_starred',
        'archived_at',
    ];

    protected function casts(): array
    {
        return [
            'is_starred' => 'boolean',
            'archived_at' => 'datetime',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function lists(): HasMany
    {
        return $this->hasMany(ProjectList::class, 'board_id')->orderBy('position');
    }

    public function labels(): HasMany
    {
        return $this->hasMany(ProjectLabel::class, 'board_id');
    }

    public function cards(): HasMany
    {
        return $this->hasMany(ProjectCard::class, 'board_id');
    }

    public function activities(): HasMany
    {
        return $this->hasMany(ProjectActivity::class, 'board_id')->latest();
    }

    public function scopeActive($query)
    {
        return $query->whereNull('archived_at');
    }

    public function scopeArchived($query)
    {
        return $query->whereNotNull('archived_at');
    }

    public function isArchived(): bool
    {
        return $this->archived_at !== null;
    }
}
