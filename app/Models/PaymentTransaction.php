<?php

namespace App\Models;

use App\Enums\DonationPaymentMethod;
use App\Enums\PaymentTransactionType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class PaymentTransaction extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_PROCESSING = 'processing';

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_REJECTED = 'rejected';

    public const REWARD_POINTS_AMOUNT = 5;

    protected $fillable = [
        'user_id',
        'organization_id',
        'transaction_type',
        'payable_type',
        'payable_id',
        'payment_method',
        'amount',
        'status',
        'reward_points',
        'reward_issued',
        'receipt_image',
        'metadata',
        'external_reference',
        'completed_at',
        'verified_by',
        'verified_at',
        'admin_notes',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'reward_points' => 'integer',
        'reward_issued' => 'boolean',
        'metadata' => 'array',
        'completed_at' => 'datetime',
        'verified_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function payable(): MorphTo
    {
        return $this->morphTo();
    }

    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function isManual(): bool
    {
        $method = DonationPaymentMethod::tryFrom($this->payment_method);

        return $method?->isManual() ?? false;
    }

    public function isCompleted(): bool
    {
        return $this->status === self::STATUS_COMPLETED;
    }

    public function typeEnum(): ?PaymentTransactionType
    {
        return PaymentTransactionType::tryFrom($this->transaction_type);
    }
}
