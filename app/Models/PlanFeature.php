<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlanFeature extends Model
{
    protected $fillable = [
        'plan_id',
        'name',
        'description',
        'icon',
        'sort_order',
        'is_unlimited',
    ];

    protected $casts = [
        'is_unlimited' => 'boolean',
        'sort_order' => 'integer',
    ];

    /**
     * Get the plan that owns the feature.
     */
    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }
}
