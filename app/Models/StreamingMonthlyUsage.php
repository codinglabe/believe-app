<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StreamingMonthlyUsage extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'month_key',
        'total_minutes',
        'billable_minutes',
        'overage_amount_cents',
    ];

    protected $casts = [
        'total_minutes' => 'integer',
        'billable_minutes' => 'integer',
        'overage_amount_cents' => 'integer',
    ];
}
