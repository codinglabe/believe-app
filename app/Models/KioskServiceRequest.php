<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KioskServiceRequest extends Model
{
    protected $fillable = [
        'requester_name',
        'requester_email',
        'market_code',
        'state',
        'city',
        'category_slug',
        'subcategory',
        'display_name',
        'url',
        'details',
        'status',
        'ai_decision',
        'ai_reason',
        'ai_suggested_url',
        'ai_tokens_used',
        'edit_token',
        'approved_service_id',
        'approved_at',
        'resolved_at',
    ];

    protected $casts = [
        'ai_tokens_used' => 'integer',
        'approved_service_id' => 'integer',
        'approved_at' => 'datetime',
        'resolved_at' => 'datetime',
    ];

    public function approvedService(): BelongsTo
    {
        return $this->belongsTo(KioskService::class, 'approved_service_id');
    }
}

