<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BreedingEvent extends Model
{
    use HasFactory;

    protected $fillable = [
        'male_id',
        'female_id',
        'breeding_method',
        'stud_fee',
        'breeding_date',
        'expected_kidding_date',
        'actual_kidding_date',
        'number_of_kids',
        'notes',
    ];

    protected $casts = [
        'breeding_date' => 'date',
        'expected_kidding_date' => 'date',
        'actual_kidding_date' => 'date',
        'stud_fee' => 'decimal:2',
        'number_of_kids' => 'integer',
    ];

    /**
     * Get the male animal.
     */
    public function male(): BelongsTo
    {
        return $this->belongsTo(LivestockAnimal::class, 'male_id');
    }

    /**
     * Get the female animal.
     */
    public function female(): BelongsTo
    {
        return $this->belongsTo(LivestockAnimal::class, 'female_id');
    }

    /**
     * Get offspring from this breeding event.
     */
    public function offspring(): HasMany
    {
        return $this->hasMany(AnimalParentLink::class, 'breeding_event_id');
    }
}
