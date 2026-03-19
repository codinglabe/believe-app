<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class BarterBenefitGroup extends Model
{
    protected $fillable = ['name', 'slug', 'sort_order'];

    public function listings(): BelongsToMany
    {
        return $this->belongsToMany(
            NonprofitBarterListing::class,
            'barter_listing_benefit_groups',
            'barter_benefit_group_id',
            'nonprofit_barter_listing_id'
        );
    }
}
