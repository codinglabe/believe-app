<?php

namespace App\Casts;

use Carbon\Carbon;
use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;

/**
 * Store and read datetimes as UTC wall-clock values in the database,
 * independent of the per-request app timezone (DetectTimezone middleware).
 */
class UtcDatetime implements CastsAttributes
{
    public function get(Model $model, string $key, mixed $value, array $attributes): ?Carbon
    {
        if ($value === null) {
            return null;
        }

        $raw = $attributes[$key] ?? $value;

        return Carbon::parse($raw, 'UTC');
    }

    public function set(Model $model, string $key, mixed $value, array $attributes): array
    {
        if ($value === null) {
            return [$key => null];
        }

        return [$key => Carbon::parse($value)->utc()->format('Y-m-d H:i:s')];
    }
}
