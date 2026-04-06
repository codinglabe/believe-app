<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CareAllianceDonation extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_FAILED = 'failed';

    protected $fillable = [
        'care_alliance_campaign_id',
        'donor_user_id',
        'amount_cents',
        'currency',
        'status',
        'split_snapshot',
        'payment_reference',
    ];

    protected $casts = [
        'amount_cents' => 'integer',
        'split_snapshot' => 'array',
    ];

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(CareAllianceCampaign::class, 'care_alliance_campaign_id');
    }

    public function donor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'donor_user_id');
    }
}
