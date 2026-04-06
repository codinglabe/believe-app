<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class LivestockPayout extends Model
{
    use HasFactory;

    protected $table = 'livestock_payouts';

    protected $fillable = [
        'livestock_user_id',
        'amount',
        'currency',
        'payout_type',
        'reference_model',
        'reference_id',
        'status',
        'failure_reason',
        'paid_at',
        'notes',
        'metadata',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'paid_at' => 'datetime',
        'metadata' => 'array',
    ];

    /**
     * Get the livestock user receiving the payout.
     */
    public function livestockUser(): BelongsTo
    {
        return $this->belongsTo(LivestockUser::class, 'livestock_user_id');
    }

    /**
     * Get the reference model (polymorphic-like relationship).
     */
    public function reference()
    {
        if (!$this->reference_model || !$this->reference_id) {
            return null;
        }

        return $this->reference_model::find($this->reference_id);
    }

    /**
     * Check if payout is paid.
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
