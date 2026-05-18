<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KioskUserContext extends Model
{
    protected $table = 'kiosk_user_context';

    protected $fillable = [
        'user_id',
        'category_slug',
        'provider_linked',
        'last_accessed_at',
        'next_suggested_action',
        'status',
    ];

    protected $casts = [
        'provider_linked' => 'boolean',
        'last_accessed_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
