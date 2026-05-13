<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SweepstakesEntry extends Model
{
    protected $fillable = [
        'raffle_id',
        'user_id',
        'entry_method',
        'donation_transaction_id',
        'ip_address',
        'device_fingerprint',
        'status',
        'meta',
    ];

    protected $casts = [
        'meta' => 'array',
    ];

    public function raffle(): BelongsTo
    {
        return $this->belongsTo(Raffle::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function donationTransaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class, 'donation_transaction_id');
    }
}
