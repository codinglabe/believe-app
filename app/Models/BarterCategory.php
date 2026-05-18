<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BarterCategory extends Model
{
    protected $fillable = ['name', 'slug', 'sort_order'];

    public function subcategories(): HasMany
    {
        return $this->hasMany(BarterSubcategory::class, 'barter_category_id')->orderBy('sort_order');
    }

    public function listings(): HasMany
    {
        return $this->hasMany(NonprofitBarterListing::class, 'barter_category_id');
    }
}
