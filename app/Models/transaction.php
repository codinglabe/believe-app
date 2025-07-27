<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Transaction extends Model
{
    protected $fillable = [
        'user_id',
        'related_id',
        'related_type',
        'type',
        'status',
        'amount',
        'fee',
        'currency',
        'payment_method',
        'transaction_id',
        'meta',
        'processed_at',
    ];

    protected $casts = [
        'meta' => 'array',
        'processed_at' => 'datetime',
    ];

    // Polymorphic relation
    public function related(): MorphTo
    {
        return $this->morphTo();
    }

    // Belongs to user
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Static reusable method to create a transaction.
     */
    public static function record(array $data): self
    {
        return self::create([
            'user_id'        => $data['user_id'],
            'related_id'     => $data['related_id'] ?? null,
            'related_type'   => $data['related_type'] ?? null,
            'type'           => $data['type'] ?? 'purchase',
            'status'         => $data['status'] ?? 'pending',
            'amount'         => $data['amount'],
            'fee'            => $data['fee'] ?? 0,
            'currency'       => $data['currency'] ?? 'USD',
            'payment_method' => $data['payment_method'] ?? null,
            'transaction_id' => $data['transaction_id'] ?? null,
            'meta'           => $data['meta'] ?? null,
            'processed_at'   => $data['processed_at'] ?? now(),
        ]);
    }
}
