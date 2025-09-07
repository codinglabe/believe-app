<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class RaffleTicket extends Model
{
    use HasFactory;

    protected $fillable = [
        'ticket_number',
        'raffle_id',
        'user_id',
        'price',
        'status',
    ];

    protected $casts = [
        'price' => 'decimal:2',
    ];

    public function raffle(): BelongsTo
    {
        return $this->belongsTo(Raffle::class);
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
                $ticket->ticket_number = 'RT' . str_pad(rand(1, 999999), 6, '0', STR_PAD_LEFT);
            }
        });
    }
}
