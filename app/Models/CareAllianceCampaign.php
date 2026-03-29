<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CareAllianceCampaign extends Model
{
    protected $fillable = [
        'care_alliance_id',
        'name',
        'description',
        'alliance_fee_bps_override',
        'status',
    ];

    protected $casts = [
        'alliance_fee_bps_override' => 'integer',
    ];

    public function careAlliance(): BelongsTo
    {
        return $this->belongsTo(CareAlliance::class, 'care_alliance_id');
    }

    public function splits(): HasMany
    {
        return $this->hasMany(CareAllianceCampaignSplit::class);
    }

    public function donations(): HasMany
    {
        return $this->hasMany(CareAllianceDonation::class);
    }
}
