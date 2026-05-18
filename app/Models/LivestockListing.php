<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LivestockListing extends Model
{
    use HasFactory;

    protected $table = 'livestock_listings';

    protected $fillable = [
        'animal_id',
        'livestock_user_id',
        'title',
        'description',
        'price',
        'currency',
        'status',
        'listed_at',
        'sold_at',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'listed_at' => 'datetime',
        'sold_at' => 'datetime',
    ];

    /**
     * Get the animal being listed.
     */
    public function animal(): BelongsTo
    {
        return $this->belongsTo(LivestockAnimal::class, 'animal_id');
    }

    /**
     * Get the seller.
     */
    public function seller(): BelongsTo
    {
        return $this->belongsTo(LivestockUser::class, 'livestock_user_id');
    }

    /**
     * Check if listing is active.
     */
    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    /**
     * Check if listing is sold.
     */
    public function isSold(): bool
    {
        return $this->status === 'sold';
    }

    /**
     * Mark listing as sold.
     */
    public function markAsSold(): void
    {
        $this->update([
            'status' => 'sold',
            'sold_at' => now(),
        ]);
    }
}
