<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * BMF-derived governance compliance: ein, organization_name, irs_status,
 * exempt_since, ntee_category, fiscal_year_end, return_type, last_return_year,
 * next_due_date, filing_status.
 */
class NonprofitCompliance extends Model
{
    protected $table = 'nonprofit_compliance';

    protected $fillable = [
        'organization_id',
        'ein',
        'organization_name',
        'irs_status',
        'exempt_since',
        'ntee_category',
        'fiscal_year_end',
        'return_type',
        'last_return_year',
        'next_due_date',
        'filing_status',
    ];

    protected $casts = [
        'next_due_date' => 'date',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
