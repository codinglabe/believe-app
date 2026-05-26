<?php

namespace App\Models;

use App\Support\DigitalProductDelivery;
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
        'has_digital_items',
        'is_digital_only',
        'product_type',
        'fulfillment_label',
        'can_create_shippo_label',
        'digital_fulfillment_items',
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
        'stripe_fee_amount',
        'stripe_processing_fee_addon',
        'printify_tax_amount',
        'additional_sales_tax_adjustment',
        'platform_fee',
        'organization_markup_basis',
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

    public function orderSplit(): HasOne
    {
        return $this->hasOne(OrderSplit::class);
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
            if ($item->marketplace_product_id || $item->organization_product_id) {
                return true;
            }
            $product = $item->product ?? null;

            return $product && empty($product->printify_product_id);
        });
    }

    public function getHasDigitalItemsAttribute(): bool
    {
        if (! $this->relationLoaded('items')) {
            return false;
        }

        return $this->items->contains(fn (OrderItem $item) => DigitalProductDelivery::orderItemIsDigital($item));
    }

    public function getIsDigitalOnlyAttribute(): bool
    {
        return DigitalProductDelivery::orderIsDigitalOnly($this);
    }

    public function getProductTypeAttribute(): string
    {
        if ($this->is_printify_order) {
            return 'Printify';
        }

        if (! $this->relationLoaded('items')) {
            return 'Unknown';
        }

        $hasDigital = false;
        $hasPhysicalManual = false;

        foreach ($this->items as $item) {
            if (DigitalProductDelivery::orderItemIsDigital($item)) {
                $hasDigital = true;

                continue;
            }

            if ($item->marketplace_product_id || $item->organization_product_id) {
                $hasPhysicalManual = true;

                continue;
            }

            $product = $item->product;
            if ($product && empty($product->printify_product_id)) {
                $hasPhysicalManual = true;
            }
        }

        if ($hasDigital && ! $hasPhysicalManual) {
            return 'Digital';
        }

        if ($hasDigital && $hasPhysicalManual) {
            return 'Mixed';
        }

        if ($hasPhysicalManual) {
            return 'Manual';
        }

        return 'Mixed';
    }

    public function getFulfillmentLabelAttribute(): ?string
    {
        if ($this->is_digital_only) {
            $totalFiles = 0;
            $digitalLines = 0;
            foreach ($this->items as $item) {
                if (! DigitalProductDelivery::orderItemIsDigital($item)) {
                    continue;
                }
                $digitalLines++;
                if ($item->relationLoaded('digitalDeliveries')) {
                    $totalFiles += $item->digitalDeliveries->filter(fn ($d) => $d->isReleased())->count();
                }
            }

            if ($digitalLines === 0) {
                return 'Digital';
            }

            return $totalFiles > 0
                ? "{$totalFiles} file(s) ready for buyer"
                : 'Awaiting file upload';
        }

        return $this->delivery_status_label;
    }

    /**
     * @return array<int, array{id: int, name: string, is_digital: bool, digital_deliveries: array<int, array<string, mixed>>}>
     */
    public function getDigitalFulfillmentItemsAttribute(): array
    {
        if (! $this->relationLoaded('items')) {
            return [];
        }

        return $this->items
            ->filter(fn (OrderItem $item) => DigitalProductDelivery::orderItemIsDigital($item))
            ->map(function (OrderItem $item) {
                $name = $item->product?->name
                    ?? ($item->product_details['name'] ?? null)
                    ?? $item->marketplaceProduct?->name
                    ?? $item->organizationProduct?->marketplaceProduct?->name
                    ?? 'Product';

                return [
                    'id' => $item->id,
                    'name' => $name,
                    'is_digital' => true,
                    'digital_deliveries' => $item->relationLoaded('digitalDeliveries')
                        ? $item->digitalDeliveries->map(fn ($d) => [
                            'id' => $d->id,
                            'original_filename' => $d->original_filename,
                            'file_size' => $d->file_size,
                        ])->values()->all()
                        : [],
                ];
            })
            ->values()
            ->all();
    }

    public function getCanCreateShippoLabelAttribute(): bool
    {
        if ($this->is_digital_only) {
            return false;
        }

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
