<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\User;

class Raffle extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'description',
        'ticket_price',
        'total_tickets',
        'sold_tickets',
        'draw_date',
        'status',
        'image',
        'prizes',
        'winners_count',
        'organization_id',
    ];

    protected $casts = [
        'draw_date' => 'datetime',
        'prizes' => 'array',
        'ticket_price' => 'decimal:2',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(User::class, 'organization_id');
    }

    public function tickets(): HasMany
    {
        return $this->hasMany(RaffleTicket::class);
    }

    public function winners(): HasMany
    {
        return $this->hasMany(RaffleWinner::class);
    }

    public function getAvailableTicketsAttribute(): int
    {
        return $this->total_tickets - $this->sold_tickets;
    }

    public function getIsActiveAttribute(): bool
    {
        return $this->status === 'active' && $this->draw_date > now();
    }

    public function getIsCompletedAttribute(): bool
    {
        return $this->status === 'completed';
    }

    public function getIsDrawTimeAttribute(): bool
    {
        return $this->draw_date <= now() && $this->status === 'active';
    }
}
