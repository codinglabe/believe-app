<?php

namespace App\Models\Concerns;

use Carbon\Carbon;

/**
 * Persist created_at / updated_at in UTC regardless of per-request viewer timezone.
 */
trait HasUtcTimestamps
{
    public function freshTimestamp()
    {
        return Carbon::now('UTC');
    }
}
