<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OwnershipHistory extends Model
{
    use HasFactory;

    protected $table = 'ownership_history';

    protected $fillable = [
        'animal_id',
        'previous_owner_id',
        'new_owner_id',
        'transfer_date',
        'method',
        'notes',
    ];

    protected $casts = [
        'transfer_date' => 'date',
    ];

    /**
     * Get the animal.
     */
    public function animal(): BelongsTo
    {
        return $this->belongsTo(LivestockAnimal::class, 'animal_id');
    }

    /**
     * Get the previous owner.
     */
    public function previousOwner(): BelongsTo
    {
        return $this->belongsTo(LivestockUser::class, 'previous_owner_id');
    }

    /**
     * Get the new owner.
     */
    public function newOwner(): BelongsTo
    {
        return $this->belongsTo(LivestockUser::class, 'new_owner_id');
    }
}
