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

        if ($value instanceof Carbon) {
            return [$key => $value->copy()->utc()->format('Y-m-d H:i:s')];
        }

        $str = trim((string) $value);
        if ($str === '') {
            return [$key => null];
        }

        // ISO strings with Z / offset: normalize to UTC wall clock for MySQL.
        if (preg_match('/[Zz]|[+-]\d{2}:?\d{2}$/', $str)) {
            return [$key => Carbon::parse($str)->utc()->format('Y-m-d H:i:s')];
        }

        // Naive Y-m-d H:i:s values in chat_messages are UTC wall clock (see freshTimestamp).
        $normalized = str_contains($str, 'T') ? $str : str_replace(' ', 'T', $str);

        return [$key => Carbon::parse($normalized, 'UTC')->format('Y-m-d H:i:s')];
    }
}
