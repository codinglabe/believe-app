<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MerchantHubReferralReward extends Model
{
    protected $table = 'merchant_hub_referral_rewards';

    protected $fillable = [
        'referrer_user_id',
        'referral_redemption_id',
        'points_awarded',
    ];

    protected $casts = [
        'points_awarded' => 'integer',
    ];

    public function referrer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'referrer_user_id');
    }

    public function referralRedemption(): BelongsTo
    {
        return $this->belongsTo(MerchantHubOfferRedemption::class, 'referral_redemption_id');
    }
}
