<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MerchantBrpTransaction extends Model
{
    protected $fillable = [
        'merchant_id',
        'type',
        'amount_brp',
        'reference_type',
        'reference_id',
        'description',
        'stripe_payment_id',
    ];

    protected $casts = [
        'amount_brp' => 'integer',
    ];

    public function merchant(): BelongsTo
    {
        return $this->belongsTo(Merchant::class);
    }
}
