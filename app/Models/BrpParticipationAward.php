<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BrpParticipationAward extends Model
{
    protected $fillable = [
        'user_id',
        'module',
        'reference_type',
        'reference_id',
        'points_awarded',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'points_awarded' => 'decimal:2',
            'metadata' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
