<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CareAllianceCampaignSplit extends Model
{
    protected $fillable = [
        'care_alliance_campaign_id',
        'organization_id',
        'is_alliance_fee',
        'percent_bps',
    ];

    protected $casts = [
        'is_alliance_fee' => 'boolean',
        'percent_bps' => 'integer',
    ];

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(CareAllianceCampaign::class, 'care_alliance_campaign_id');
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
