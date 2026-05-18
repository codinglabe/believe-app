<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class RaffleWinner extends Model
{
    use HasFactory;

    protected $fillable = [
        'raffle_id',
        'raffle_ticket_id',
        'user_id',
        'position',
        'prize_name',
        'prize_description',
        'prize_amount',
        'announced_at',
    ];

    protected $casts = [
        'announced_at' => 'datetime',
    ];

    public function raffle(): BelongsTo
    {
        return $this->belongsTo(Raffle::class);
    }

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(RaffleTicket::class, 'raffle_ticket_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function getPositionNameAttribute(): string
    {
        return match($this->position) {
            1 => '1st Place',
            2 => '2nd Place',
            3 => '3rd Place',
            default => $this->position . 'th Place'
        };
    }
}
