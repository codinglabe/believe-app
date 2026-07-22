<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectChecklistItem extends Model
{
    protected $fillable = [
        'checklist_id',
        'title',
        'is_complete',
        'position',
    ];

    protected function casts(): array
    {
        return [
            'is_complete' => 'boolean',
            'position' => 'integer',
        ];
    }

    public function checklist(): BelongsTo
    {
        return $this->belongsTo(ProjectChecklist::class, 'checklist_id');
    }
}
