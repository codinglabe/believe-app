<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MatingFee extends Model
{
    use HasFactory;

    protected $fillable = [
        'male_id',
        'service_provider_seller_id',
        'requesting_seller_id',
        'breeding_event_id',
        'fee_amount',
        'currency',
        'status',
        'paid_at',
        'notes',
    ];

    protected $casts = [
        'fee_amount' => 'decimal:2',
        'paid_at' => 'datetime',
    ];

    /**
     * Get the male animal (stud).
     */
    public function male(): BelongsTo
    {
        return $this->belongsTo(LivestockAnimal::class, 'male_id');
    }

    /**
     * Get the service provider seller.
     */
    public function serviceProvider(): BelongsTo
    {
        return $this->belongsTo(User::class, 'service_provider_seller_id');
    }

    /**
     * Get the requesting seller.
     */
    public function requestingSeller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requesting_seller_id');
    }

    /**
     * Get the breeding event.
     */
    public function breedingEvent(): BelongsTo
    {
        return $this->belongsTo(BreedingEvent::class, 'breeding_event_id');
    }

    /**
     * Check if fee is paid.
     */
    public function isPaid(): bool
    {
        return $this->status === 'paid';
    }

    /**
     * Mark as paid.
     */
    public function markAsPaid(): void
    {
        $this->update([
            'status' => 'paid',
            'paid_at' => now(),
        ]);
    }
}
