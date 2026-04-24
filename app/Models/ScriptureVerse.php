<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScriptureVerse extends Model
{
    protected $fillable = [
        'scripture_book_id',
        'chapter_number',
        'verse_number',
        'text',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'chapter_number' => 'integer',
            'verse_number' => 'integer',
        ];
    }

    /** @return BelongsTo<ScriptureBook, $this> */
    public function book(): BelongsTo
    {
        return $this->belongsTo(ScriptureBook::class, 'scripture_book_id');
    }
}
