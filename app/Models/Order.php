<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Order extends Model
{
    protected $fillable = [
        'user_id',
        'reference_number',
        'total_amount',
        'shipping_cost',
        'tax_amount',
        'organization_id',
        'status',
        'payment_status',
        'stripe_payment_intent_id',
        'stripe_refund_id',
        'refunded_at',
        'printify_order_id',
        'printify_submitted',
        'printify_status',
        'printify_response',
        'tracking_number',
        'tracking_url',
        'notes',
        'shipped_at',
        'sent_to_production_at',
        'delivered_at',
        'fulfilled_items_count',
        'delivered_items_count',
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

    public function shippingInfo(): HasOne
    {
        return $this->hasOne(OrderShippingInfo::class, 'order_id');
    }
}
