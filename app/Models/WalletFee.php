<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WalletFee extends Model
{
    protected $fillable = [
        'transaction_type',
        'fee_type',
        'fee_amount',
        'min_fee',
        'max_fee',
        'is_active',
        'description',
    ];

    protected $casts = [
        'fee_amount' => 'decimal:2',
        'min_fee' => 'decimal:2',
        'max_fee' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    /**
     * Calculate fee for a given amount
     */
    public function calculateFee(float $amount): float
    {
        if (!$this->is_active) {
            return 0;
        }

        if ($this->fee_type === 'fixed') {
            return (float) $this->fee_amount;
        }

        // Percentage fee
        $fee = ($amount * $this->fee_amount) / 100;

        // Apply min/max constraints
        if ($this->min_fee && $fee < $this->min_fee) {
            $fee = (float) $this->min_fee;
        }

        if ($this->max_fee && $fee > $this->max_fee) {
            $fee = (float) $this->max_fee;
        }

        return round($fee, 2);
    }

    /**
     * Get active fee for transaction type
     */
    public static function getActiveFee(string $transactionType): ?self
    {
        return self::where('transaction_type', $transactionType)
            ->where('is_active', true)
            ->first();
    }
}
