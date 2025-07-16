<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Donation extends Model
{
    protected $fillable = [
        'user_id',
        'organization_id',
        'amount',
        'frequency',
        'payment_method',
        'transaction_id',
        'status',
        'messages',
    ];

    /**
     * Get the formatted amount in dollars.
     *
     * @return string
     */
    public function getFormattedAmountAttribute()
    {
        return number_format($this->amount / 100, 2);
    }
}
