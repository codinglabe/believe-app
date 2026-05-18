<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrganizationProduct extends Model
{
    protected $fillable = [
        'organization_id',
        'marketplace_product_id',
        'custom_price',
        'supporter_message',
        'is_featured',
        'status',
        'pickup_available',
    ];

    protected function casts(): array
    {
        return [
            'custom_price' => 'decimal:2',
            'is_featured' => 'boolean',
            'pickup_available' => 'boolean',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function marketplaceProduct(): BelongsTo
    {
        return $this->belongsTo(MarketplaceProduct::class);
    }
}
