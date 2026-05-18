<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChallengeGroundingPassage extends Model
{
    protected $fillable = [
        'religion',
        'source_type',
        'reference',
        'text',
        'topics',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'topics' => 'array',
        ];
    }
}
