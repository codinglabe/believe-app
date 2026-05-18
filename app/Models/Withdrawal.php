<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphOne;

class Withdrawal extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'amount',
        'payment_method',
        'paypal_email',
        'status',
        'transaction_id',
        'admin_notes',
        'processed_at',
    ];

    protected $casts = [
        'processed_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the transaction associated with the withdrawal.
     */
    public function transaction(): MorphOne
    {
        return $this->morphOne(Transaction::class, 'related');
    }
}
