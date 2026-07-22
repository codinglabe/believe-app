<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProjectChecklist extends Model
{
    protected $fillable = [
        'card_id',
        'title',
        'position',
    ];

    protected function casts(): array
    {
        return [
            'position' => 'integer',
        ];
    }

    public function card(): BelongsTo
    {
        return $this->belongsTo(ProjectCard::class, 'card_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(ProjectChecklistItem::class, 'checklist_id')->orderBy('position');
    }
}
