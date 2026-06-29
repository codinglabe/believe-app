<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BelievePointsLedgerEntry extends Model
{
    public const TYPE_REWARD = 'reward';

    public const TYPE_PURCHASE = 'purchase';

    public const TYPE_DONATION_SPEND = 'donation_spend';

    public const TYPE_ADMIN_ADJUSTMENT = 'admin_adjustment';

    public const TYPE_WALLET_TRANSFER = 'wallet_transfer';

    public const TYPE_WALLET_TRANSFER_REFUND = 'wallet_transfer_refund';

    public const TYPE_SETTLEMENT = 'settlement';

    public const TYPE_GIFT_SENT = 'gift_sent';

    public const TYPE_GIFT_RECEIVED = 'gift_received';

    public const TYPE_REFUND = 'refund';

    protected $fillable = [
        'user_id',
        'payment_transaction_id',
        'amount',
        'entry_type',
        'description',
        'metadata',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'metadata' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function paymentTransaction(): BelongsTo
    {
        return $this->belongsTo(PaymentTransaction::class);
    }
}
