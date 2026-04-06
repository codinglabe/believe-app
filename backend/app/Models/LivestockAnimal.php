<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class LivestockAnimal extends Model
{
    use HasFactory;

    protected $table = 'livestock_animals';

    protected $fillable = [
        'livestock_user_id',
        'current_owner_livestock_user_id',
        'species',
        'breed',
        'sex',
        'ear_tag',
        'original_ear_tag',
        'date_of_birth',
        'age_months',
        'weight_kg',
        'color_markings',
        'location',
        'health_status',
        'fertility_status',
        'original_purchase_price',
        'current_market_value',
        'status',
        'notes',
    ];

    protected $casts = [
        'date_of_birth' => 'date',
        'weight_kg' => 'decimal:2',
        'original_purchase_price' => 'decimal:2',
        'current_market_value' => 'decimal:2',
    ];

    /**
     * Get the seller (original owner).
     */
    public function seller(): BelongsTo
    {
        return $this->belongsTo(LivestockUser::class, 'livestock_user_id');
    }

    /**
     * Get the current owner.
     */
    public function currentOwner(): BelongsTo
    {
        return $this->belongsTo(LivestockUser::class, 'current_owner_livestock_user_id');
    }

    /**
     * Get all photos for this animal.
     */
    public function photos(): HasMany
    {
        return $this->hasMany(AnimalPhoto::class, 'animal_id');
    }

    /**
     * Get primary photo.
     */
    public function primaryPhoto(): HasOne
    {
        return $this->hasOne(AnimalPhoto::class, 'animal_id')->where('is_primary', true);
    }

    /**
     * Get all health records.
     */
    public function healthRecords(): HasMany
    {
        return $this->hasMany(AnimalHealthRecord::class, 'animal_id');
    }

    /**
     * Get the listing for this animal.
     */
    public function listing(): HasOne
    {
        return $this->hasOne(LivestockListing::class, 'animal_id');
    }

    /**
     * Get fractional listing for this animal.
     */
    public function fractionalListing(): HasOne
    {
        return $this->hasOne(\App\Models\FractionalListing::class, 'livestock_animal_id');
    }


    /**
     * Get ownership history.
     */
    public function ownershipHistory(): HasMany
    {
        return $this->hasMany(OwnershipHistory::class, 'animal_id');
    }

    /**
     * Get parent link (if this is an offspring).
     */
    public function parentLink(): HasOne
    {
        return $this->hasOne(AnimalParentLink::class, 'child_id');
    }

    /**
     * Get father (if known) via parent link.
     */
    public function father()
    {
        return $this->hasOneThrough(
            LivestockAnimal::class,
            AnimalParentLink::class,
            'child_id',
            'id',
            'id',
            'father_id'
        );
    }

    /**
     * Get mother (if known) via parent link.
     */
    public function mother()
    {
        return $this->hasOneThrough(
            LivestockAnimal::class,
            AnimalParentLink::class,
            'child_id',
            'id',
            'id',
            'mother_id'
        );
    }

    /**
     * Get offspring (as father).
     */
    public function offspringAsFather(): HasMany
    {
        return $this->hasMany(AnimalParentLink::class, 'father_id');
    }

    /**
     * Get offspring (as mother).
     */
    public function offspringAsMother(): HasMany
    {
        return $this->hasMany(AnimalParentLink::class, 'mother_id');
    }

    /**
     * Check if animal is available for sale.
     */
    public function isAvailable(): bool
    {
        return $this->status === 'available';
    }

    /**
     * Check if animal is male.
     */
    public function isMale(): bool
    {
        return $this->sex === 'male';
    }

    /**
     * Check if animal is female.
     */
    public function isFemale(): bool
    {
        return $this->sex === 'female';
    }
}
