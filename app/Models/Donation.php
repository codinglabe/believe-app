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
        'message',
        'donation_date',
    ];

    protected $casts = [
        'donation_date' => 'datetime',
        'amount' => 'decimal:2',
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

    /**
     * Get the user that made the donation.
     */
    public function user()
    {
        return $this->belongsTo(User::class);  
    }

    /**
     * Get the organization that received the donation.
     */
    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }
}
