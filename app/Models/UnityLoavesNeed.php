<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UnityLoavesNeed extends Model
{
    public $timestamps = false;

    protected $table = 'unity_loaves_needs';

    protected $fillable = [
        'location_id',
        'item_name',
        'category',
        'priority_level',
        'quantity_needed',
        'is_active',
    ];

    protected $casts = [
        'is_active'       => 'boolean',
        'quantity_needed'  => 'integer',
    ];

    // Only updated_at is used; created_at is omitted.
    const UPDATED_AT = 'updated_at';
    const CREATED_AT = null;

    public function location(): BelongsTo
    {
        return $this->belongsTo(UnityLoavesLocation::class, 'location_id');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
