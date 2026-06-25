<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BelievePointReserveSettlementAllocation extends Model
{
    protected $fillable = [
        'believe_point_reserve_settlement_credit_id',
        'believe_point_purchase_id',
        'amount',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
    ];

    public function credit(): BelongsTo
    {
        return $this->belongsTo(BelievePointReserveSettlementCredit::class, 'believe_point_reserve_settlement_credit_id');
    }

    public function purchase(): BelongsTo
    {
        return $this->belongsTo(BelievePointPurchase::class, 'believe_point_purchase_id');
    }
}
