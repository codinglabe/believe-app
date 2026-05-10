<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class UnityLoavesLocation extends Model
{
    protected $table = 'unity_loaves_locations';

    protected $fillable = [
        'organization_id',
        'name',
        'description',
        'address',
        'city',
        'state',
        'zip',
        'latitude',
        'longitude',
        'phone',
        'website',
        'image_url',
        'meal_type',
        'accepts_food_donations',
        'dropoff_instructions',
        'is_active',
    ];

    protected $casts = [
        'latitude'               => 'decimal:7',
        'longitude'              => 'decimal:7',
        'accepts_food_donations' => 'boolean',
        'is_active'              => 'boolean',
    ];

    /* ------------------------------------------------------------------ */
    /*  Relationships                                                      */
    /* ------------------------------------------------------------------ */

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function schedules(): HasMany
    {
        return $this->hasMany(UnityLoavesSchedule::class, 'location_id');
    }

    public function needs(): HasMany
    {
        return $this->hasMany(UnityLoavesNeed::class, 'location_id');
    }

    public function impactStat(): HasOne
    {
        return $this->hasOne(UnityLoavesImpactStat::class, 'location_id');
    }

    /* ------------------------------------------------------------------ */
    /*  Scopes                                                             */
    /* ------------------------------------------------------------------ */

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeAcceptsDonations($query)
    {
        return $query->where('accepts_food_donations', true);
    }

    public function scopeByMealType($query, string $type)
    {
        return $query->where('meal_type', $type);
    }
}
