<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Order extends Model
{
    /**
     * Included when the model is converted to an array / JSON (e.g. Inertia).
     * Dynamic properties set only on the PHP object are NOT serialized — use accessors instead.
     */
    protected $appends = [
        'delivery_status_label',
        'is_printify_order',
        'has_manual_product',
        'product_type',
        'can_create_shippo_label',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'shipped_at' => 'datetime',
            'delivered_at' => 'datetime',
            'sent_to_production_at' => 'datetime',
            'refunded_at' => 'datetime',
            'paid_at' => 'datetime',
        ];
    }

    protected $fillable = [
        'user_id',
        'reference_number',
        'subtotal',
        'total_amount',
        'shipping_cost',
        'tax_amount',
        'platform_fee',
        'donation_amount',
        'organization_id',
        'status',
        'payment_status',
        'payment_method',
        'stripe_payment_intent_id',
        'stripe_refund_id',
        'refunded_at',
        'printify_order_id',
        'printify_submitted',
        'printify_status',
        'printify_response',
        'tracking_number',
        'tracking_url',
        'shippo_shipment_id',
        'shippo_transaction_id',
        'shipping_status',
        'carrier',
        'label_url',
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

    public function getIsPrintifyOrderAttribute(): bool
    {
        return ! empty($this->printify_order_id);
    }

    public function getHasManualProductAttribute(): bool
    {
        if (! $this->relationLoaded('items')) {
            return false;
        }

        return $this->items->contains(function ($item) {
            $product = $item->product ?? null;

            return $product && empty($product->printify_product_id);
        });
    }

    public function getProductTypeAttribute(): string
    {
        if ($this->is_printify_order) {
            return 'Printify';
        }
        if ($this->has_manual_product) {
            return 'Manual';
        }

        return 'Mixed';
    }

    public function getCanCreateShippoLabelAttribute(): bool
    {
        if (! $this->relationLoaded('items') || ! $this->relationLoaded('shippingInfo')) {
            return false;
        }

        return $this->has_manual_product
            && $this->payment_status === 'paid'
            && $this->shippingInfo !== null
            && empty($this->tracking_number);
    }

    public function getDeliveryStatusLabelAttribute(): ?string
    {
        $status = $this->shipping_status;
        if ($status === null && ! empty($this->tracking_number)) {
            return 'Label created';
        }

        return match ($status) {
            'label_created' => 'Label created',
            'shipped' => 'In transit',
            'completed' => 'Delivered',
            default => $status ? ucfirst(str_replace('_', ' ', (string) $status)) : null,
        };
    }
}
