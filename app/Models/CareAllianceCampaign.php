<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class CareAllianceCampaign extends Model
{
    protected $fillable = [
        'care_alliance_id',
        'name',
        'slug',
        'description',
        'alliance_fee_bps_override',
        'status',
    ];

    protected $casts = [
        'alliance_fee_bps_override' => 'integer',
    ];

    protected static function booted(): void
    {
        static::creating(function (CareAllianceCampaign $campaign) {
            if (empty($campaign->slug)) {
                $campaign->slug = static::uniqueSlugForAlliance((int) $campaign->care_alliance_id, (string) $campaign->name);
            }
        });
    }

    public static function uniqueSlugForAlliance(int $careAllianceId, string $name): string
    {
        $base = Str::slug($name);
        if ($base === '') {
            $base = 'campaign';
        }
        $slug = $base;
        $n = 0;
        while (static::query()
            ->where('care_alliance_id', $careAllianceId)
            ->where('slug', $slug)
            ->exists()) {
            $n++;
            $slug = $base.'-'.$n;
        }

        return $slug;
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

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

    public function primaryActionCategories(): BelongsToMany
    {
        return $this->belongsToMany(
            PrimaryActionCategory::class,
            'ca_campaign_primary_action_categories',
            'care_alliance_campaign_id',
            'primary_action_category_id'
        )->withTimestamps();
    }
}
