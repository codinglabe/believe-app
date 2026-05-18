<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InvestmentClick extends Model
{
    protected $fillable = [
        'user_id',
        'fundraise_lead_id',
        'ip_address',
        'user_agent',
        'clicked_at',
    ];

    protected $casts = [
        'clicked_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function fundraiseLead(): BelongsTo
    {
        return $this->belongsTo(FundraiseLead::class);
    }
}
