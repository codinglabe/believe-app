<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AnimalPhoto extends Model
{
    use HasFactory;

    protected $fillable = [
        'animal_id',
        'url',
        'is_primary',
        'display_order',
    ];

    protected $casts = [
        'is_primary' => 'boolean',
        'display_order' => 'integer',
    ];

    /**
     * Get the animal that owns this photo.
     */
    public function animal(): BelongsTo
    {
        return $this->belongsTo(LivestockAnimal::class, 'animal_id');
    }
}
