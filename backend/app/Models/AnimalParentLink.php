<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AnimalParentLink extends Model
{
    use HasFactory;

    protected $fillable = [
        'child_id',
        'father_id',
        'mother_id',
        'breeding_event_id',
    ];

    /**
     * Get the child animal.
     */
    public function child(): BelongsTo
    {
        return $this->belongsTo(LivestockAnimal::class, 'child_id');
    }

    /**
     * Get the father animal.
     */
    public function father(): BelongsTo
    {
        return $this->belongsTo(LivestockAnimal::class, 'father_id');
    }

    /**
     * Get the mother animal.
     */
    public function mother(): BelongsTo
    {
        return $this->belongsTo(LivestockAnimal::class, 'mother_id');
    }

    /**
     * Get the breeding event.
     */
    public function breedingEvent(): BelongsTo
    {
        return $this->belongsTo(BreedingEvent::class, 'breeding_event_id');
    }
}
