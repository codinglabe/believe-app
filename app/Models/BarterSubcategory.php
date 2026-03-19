<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BarterSubcategory extends Model
{
    protected $fillable = ['barter_category_id', 'name', 'slug', 'sort_order'];

    public function category(): BelongsTo
    {
        return $this->belongsTo(BarterCategory::class, 'barter_category_id');
    }

    public function listings(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(NonprofitBarterListing::class, 'barter_subcategory_id');
    }
}
