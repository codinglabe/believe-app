<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Event extends Model
{
    protected $fillable = [
        'organization_id',
        'name',
        'description',
        'start_date',
        'end_date',
        'location',
        'address',
        'city',
        'state',
        'zip',
        'poster_image',
        'status',
        'max_participants',
        'registration_fee',
        'requirements',
        'contact_info',
    ];

    protected $casts = [
        'start_date' => 'datetime',
        'end_date' => 'datetime',
        'registration_fee' => 'decimal:2',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function getFullAddressAttribute(): string
    {
        $parts = array_filter([$this->address, $this->city, $this->state, $this->zip]);
        return implode(', ', $parts);
    }

    public function getStatusColorAttribute(): string
    {
        return match($this->status) {
            'upcoming' => 'blue',
            'ongoing' => 'green',
            'completed' => 'gray',
            'cancelled' => 'red',
            default => 'gray',
        };
    }
}
