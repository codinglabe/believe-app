<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FundMeDonation extends Model
{
    use HasFactory;

    protected $table = 'fundme_donations';

    protected $fillable = [
        'fundme_campaign_id',
        'organization_id',
        'user_id',
        'amount',
        'donor_name',
        'donor_email',
        'anonymous',
        'status',
        'payment_reference',
        'receipt_number',
    ];

    protected $casts = [
        'amount' => 'integer',
        'anonymous' => 'boolean',
    ];

    public const STATUS_PENDING = 'pending';
    public const STATUS_SUCCEEDED = 'succeeded';
    public const STATUS_FAILED = 'failed';
    public const STATUS_REFUNDED = 'refunded';

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(FundMeCampaign::class, 'fundme_campaign_id');
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function amountDollars(): float
    {
        return $this->amount / 100;
    }

    public static function generateReceiptNumber(): string
    {
        $prefix = 'BFM';
        $date = now()->format('Ymd');
        $random = strtoupper(substr(uniqid(), -6));
        $seq = str_pad((string) (self::whereDate('created_at', today())->count() + 1), 4, '0', STR_PAD_LEFT);
        return "{$prefix}-{$date}-{$random}{$seq}";
    }
}
