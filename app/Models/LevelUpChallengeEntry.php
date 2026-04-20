<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class LevelUpChallengeEntry extends Model
{
    protected $fillable = [
        'level_up_track_id',
        'title',
        'slug',
        'description',
        'subcategory_key',
        'sort_order',
        'is_active',
        'cover_image_path',
        'last_image_prompt',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function track(): BelongsTo
    {
        return $this->belongsTo(LevelUpTrack::class, 'level_up_track_id');
    }

    /**
     * URL segment for `/challenge-hub/{track}/play/{slug}` — unique per track.
     */
    public static function uniqueSlugForTrack(int $trackId, string $title, ?int $exceptEntryId = null): string
    {
        $base = Str::slug($title);
        if ($base === '') {
            $base = 'challenge';
        }
        $base = mb_substr($base, 0, 64);

        $candidate = $base;
        $n = 2;
        while (
            static::query()
                ->where('level_up_track_id', $trackId)
                ->where('slug', $candidate)
                ->when($exceptEntryId !== null, fn ($q) => $q->where('id', '!=', $exceptEntryId))
                ->exists()
        ) {
            $suffix = '-'.$n;
            $maxBaseLen = 64 - mb_strlen($suffix);
            $candidate = mb_substr($base, 0, max(1, $maxBaseLen)).$suffix;
            $n++;
        }

        return $candidate;
    }
}
