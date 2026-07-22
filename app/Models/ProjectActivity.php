<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectActivity extends Model
{
    protected $fillable = [
        'board_id',
        'card_id',
        'user_id',
        'action',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'meta' => 'array',
        ];
    }

    public function board(): BelongsTo
    {
        return $this->belongsTo(ProjectBoard::class, 'board_id');
    }

    public function card(): BelongsTo
    {
        return $this->belongsTo(ProjectCard::class, 'card_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
