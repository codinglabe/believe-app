<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KioskProvider extends Model
{
    protected $fillable = [
        'organization_id',
        'state_abbr',
        'normalized_city',
        'zip_normalized',
        'category_slug',
        'subcategory_slug',
        'provider_slug',
        'name',
        'website',
        'payment_url',
        'login_url',
        'account_link_supported',
        'meta',
    ];

    protected $casts = [
        'account_link_supported' => 'boolean',
        'meta' => 'array',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(KioskCategory::class, 'category_slug', 'slug');
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
