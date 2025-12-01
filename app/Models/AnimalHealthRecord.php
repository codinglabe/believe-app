<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AnimalHealthRecord extends Model
{
    use HasFactory;

    protected $table = 'animal_health_records';

    protected $fillable = [
        'animal_id',
        'record_type',
        'description',
        'medication',
        'vet_name',
        'record_date',
        'document_files',
    ];

    protected $casts = [
        'record_date' => 'date',
        'document_files' => 'array',
    ];

    /**
     * Get the animal this health record belongs to.
     */
    public function animal(): BelongsTo
    {
        return $this->belongsTo(LivestockAnimal::class, 'animal_id');
    }
}
