<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BelievePointWalletTransfer extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_SUBMITTED = 'submitted';

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_FAILED = 'failed';

    public const STATUS_REFUNDED = 'refunded';

    protected $fillable = [
        'user_id',
        'bridge_integration_id',
        'amount',
        'status',
        'bridge_transfer_id',
        'bridge_transfer_state',
        'idempotency_key',
        'failure_message',
        'metadata',
        'completed_at',
        'retry_until',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'metadata' => 'array',
        'completed_at' => 'datetime',
        'retry_until' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function bridgeIntegration(): BelongsTo
    {
        return $this->belongsTo(BridgeIntegration::class);
    }

    public function isTerminal(): bool
    {
        return in_array($this->status, [
            self::STATUS_COMPLETED,
            self::STATUS_FAILED,
            self::STATUS_REFUNDED,
        ], true);
    }
}
