<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class RaffleTicket extends Model
{
    use HasFactory;

    protected $fillable = [
        'ticket_number',
        'raffle_id',
        'user_id',
        'purchase_transaction_id',
        'price',
        'status',
        'purchased_at',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'purchased_at' => 'datetime',
    ];

    public function raffle(): BelongsTo
    {
        return $this->belongsTo(Raffle::class);
    }

    public function purchaseTransaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class, 'purchase_transaction_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function winner(): HasOne
    {
        return $this->hasOne(RaffleWinner::class);
    }

    public function getIsWinnerAttribute(): bool
    {
        return $this->status === 'winner';
    }

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($ticket) {
            if (empty($ticket->ticket_number)) {
                $ticket->ticket_number = 'RT'.str_pad(rand(1, 999999), 6, '0', STR_PAD_LEFT);
            }
        });
    }
}
