<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmailContact extends Model
{
    protected $fillable = [
        'email_connection_id',
        'organization_id',
        'email',
        'name',
        'provider_contact_id',
        'metadata',
        'invite_sent',
        'invite_sent_at',
        'has_joined',
        'joined_at',
    ];

    protected $casts = [
        'metadata' => 'array',
        'invite_sent' => 'boolean',
        'invite_sent_at' => 'datetime',
        'has_joined' => 'boolean',
        'joined_at' => 'datetime',
    ];

    public function emailConnection(): BelongsTo
    {
        return $this->belongsTo(EmailConnection::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
