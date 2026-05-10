<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UnityLoavesImpactStat extends Model
{
    public $timestamps = false;

    protected $table = 'unity_loaves_impact_stats';

    protected $fillable = [
        'location_id',
        'loaves_served',
        'families_helped',
        'total_loaves_year',
        'last_updated',
    ];

    protected $casts = [
        'loaves_served'    => 'integer',
        'families_helped'  => 'integer',
        'total_loaves_year' => 'integer',
        'last_updated'     => 'datetime',
    ];

    public function location(): BelongsTo
    {
        return $this->belongsTo(UnityLoavesLocation::class, 'location_id');
    }
}
