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
        'sweepstakes_type',
        'npn_entry_enabled',
        'entry_free_online_enabled',
        'entry_donation_enabled',
        'entry_mail_in_enabled',
        'entry_social_bonus_enabled',
        'entry_volunteer_enabled',
        'official_rules',
        'eligibility_rules',
        'max_entries_per_person',
        'max_free_entries',
        'max_donation_entries',
        'minimum_age',
        'country_restrictions',
        'state_restrictions',
        'winner_selected_at',
        'winner_selected_by_user_id',
    ];

    protected $casts = [
        'draw_date' => 'datetime',
        'prizes' => 'array',
        'ticket_price' => 'decimal:2',
        'npn_entry_enabled' => 'boolean',
        'entry_free_online_enabled' => 'boolean',
        'entry_donation_enabled' => 'boolean',
        'entry_mail_in_enabled' => 'boolean',
        'entry_social_bonus_enabled' => 'boolean',
        'entry_volunteer_enabled' => 'boolean',
        'country_restrictions' => 'array',
        'state_restrictions' => 'array',
        'winner_selected_at' => 'datetime',
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

    public function sweepstakesEntries(): HasMany
    {
        return $this->hasMany(SweepstakesEntry::class);
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
