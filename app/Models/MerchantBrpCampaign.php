<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MerchantBrpCampaign extends Model
{
    protected $fillable = [
        'merchant_id',
        'name',
        'fund_amount_usd',
        'merchant_brp_amount',
        'award_triggers',
        'trigger_rules',
        'status',
        'stripe_payment_intent',
    ];

    protected $casts = [
        'fund_amount_usd' => 'decimal:2',
        'merchant_brp_amount' => 'integer',
        'award_triggers' => 'array',
        'trigger_rules' => 'array',
    ];

    public function merchant(): BelongsTo
    {
        return $this->belongsTo(Merchant::class);
    }
}
