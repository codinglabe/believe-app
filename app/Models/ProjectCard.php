<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProjectCard extends Model
{
    protected $fillable = [
        'board_id',
        'list_id',
        'created_by',
        'title',
        'description',
        'position',
        'due_at',
        'cover_color',
        'archived_at',
    ];

    protected function casts(): array
    {
        return [
            'position' => 'integer',
            'due_at' => 'datetime',
            'archived_at' => 'datetime',
        ];
    }

    public function board(): BelongsTo
    {
        return $this->belongsTo(ProjectBoard::class, 'board_id');
    }

    public function list(): BelongsTo
    {
        return $this->belongsTo(ProjectList::class, 'list_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function labels(): BelongsToMany
    {
        return $this->belongsToMany(ProjectLabel::class, 'project_card_label', 'card_id', 'label_id');
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'project_card_member', 'card_id', 'user_id');
    }

    public function checklists(): HasMany
    {
        return $this->hasMany(ProjectChecklist::class, 'card_id')->orderBy('position');
    }

    public function comments(): HasMany
    {
        return $this->hasMany(ProjectComment::class, 'card_id')->latest();
    }

    public function rootComments(): HasMany
    {
        return $this->hasMany(ProjectComment::class, 'card_id')
            ->whereNull('parent_id')
            ->latest();
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(ProjectAttachment::class, 'card_id')->latest();
    }

    public function activities(): HasMany
    {
        return $this->hasMany(ProjectActivity::class, 'card_id')->latest();
    }

    public function scopeActive($query)
    {
        return $query->whereNull('archived_at');
    }

    public function isArchived(): bool
    {
        return $this->archived_at !== null;
    }

    public function isOverdue(): bool
    {
        return $this->due_at !== null && $this->due_at->isPast() && ! $this->isArchived();
    }
}
