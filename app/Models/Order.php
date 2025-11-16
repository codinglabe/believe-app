<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    protected $fillable = [
        'user_id',
        'organization_id',
        'total_amount',
        'commission_amount',
        'seller_amount',
        'status',
        'payment_status',
        'stripe_payment_intent_id',
        'printify_order_id',
        'printify_status',
        'tracking_number',
        'tracking_url',
        'notes',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function tracking(): HasMany
    {
        return $this->hasMany(OrderTracking::class);
    }

    public function shippingInfo(): BelongsTo
    {
        return $this->belongsTo(OrderShippingInfo::class);
    }
}
