<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EmailConnection extends Model
{
    protected $fillable = [
        'organization_id',
        'provider',
        'email',
        'access_token',
        'refresh_token',
        'id_token',
        'token_expires_at',
        'token_metadata',
        'is_active',
        'is_syncing',
        'last_synced_at',
    ];

    protected $casts = [
        'token_expires_at' => 'datetime',
        'last_synced_at' => 'datetime',
        'token_metadata' => 'array',
        'is_active' => 'boolean',
        'is_syncing' => 'boolean',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function contacts(): HasMany
    {
        return $this->hasMany(EmailContact::class);
    }

    public function isTokenExpired(): bool
    {
        if (!$this->token_expires_at) {
            return true;
        }

        // Consider token expired if it expires within 5 minutes
        return $this->token_expires_at->subMinutes(5)->isPast();
    }
}
