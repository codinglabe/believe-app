<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'description',
        'quantity',
        'unit_price',
        'shipping_charge',
        'ship_from_name',
        'ship_from_street1',
        'ship_from_city',
        'ship_from_state',
        'ship_from_zip',
        'ship_from_country',
        'ship_from_merchant_id',
        'marketplace_product_id',
        'parcel_length_in',
        'parcel_width_in',
        'parcel_height_in',
        'parcel_weight_oz',
        'profit_margin_percentage',
        'admin_owned',
        'owned_by',
        'organization_id',
        'status',
        'publish_status',
        'sku',
        'type',
        'tags',
        'image',
        'quantity_ordered',
        'quantity_available',

        'printify_product_id',
        'printify_blueprint_id',
        'printify_provider_id',

        'pricing_model',
        'starting_bid',
        'buy_now_price',
        'bid_increment',
        'auction_start',
        'auction_end',
        'auto_extend',
        'blind_bid_type',
        'min_bid',
        'reserve_price',
        'bid_deadline',
        'winner_notification',
        'winner_payment_window',
        'offer_to_next_if_unpaid',
        'winner_user_id',
        'winning_bid_id',
        'winner_payment_deadline',
        'winner_status',
    ];

    protected $casts = [
        'auction_start' => 'datetime',
        'auction_end' => 'datetime',
        'bid_deadline' => 'datetime',
        'winner_payment_deadline' => 'datetime',
        'auto_extend' => 'boolean',
        'offer_to_next_if_unpaid' => 'boolean',
    ];

    /**
     * Get the user that owns the product.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function categories()
    {
        return $this->belongsToMany(Category::class, 'product_associated_categories');
    }

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($product) {
            $product->slug = static::generateUniqueSlug($product->name, $product->user_id);
        });
        static::updating(function ($product) {
            if ($product->isDirty('name')) {
                $product->slug = static::generateUniqueSlug($product->name, $product->user_id, $product->id);
            }
        });
    }

    protected static function generateUniqueSlug($name, $userId, $ignoreId = null)
    {
        $slug = \Str::slug($name);
        $baseSlug = $slug;
        $i = 1;
        while (static::where('slug', $slug)->where('user_id', $userId)->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))->exists()) {
            $slug = $baseSlug.'-'.$i;
            $i++;
        }

        return $slug;
    }

    /**
     * Get the image URL.
     */
    protected function image(): Attribute
    {
        return Attribute::make(
            get: function ($value) {
                if (! $value) {
                    return null;
                }

                // If it's already a full URL, return as is
                if (filter_var($value, FILTER_VALIDATE_URL)) {
                    return $value;
                }

                // Return the full URL for stored images
                return asset('storage/'.$value);
            }
        );
    }

    /**
     * Get the organization that owns the product.
     */
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    /** When set, Shippo ship-from uses this merchant's default/business address. */
    public function shipFromMerchant(): BelongsTo
    {
        return $this->belongsTo(Merchant::class, 'ship_from_merchant_id');
    }

    public function sourceMarketplaceProduct(): BelongsTo
    {
        return $this->belongsTo(MarketplaceProduct::class, 'marketplace_product_id');
    }

    public function productCategory()
    {
        return $this->hasMany(ProductAssociatedCategory::class, 'product_id');
    }

    public function cartItems(): HasMany
    {
        return $this->hasMany(CartItem::class);
    }

    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function bids(): HasMany
    {
        return $this->hasMany(Bid::class)->orderByDesc('bid_amount')->orderBy('submitted_at');
    }

    public function isAuction(): bool
    {
        return $this->pricing_model === 'auction';
    }

    public function isBlindBid(): bool
    {
        return $this->pricing_model === 'blind_bid';
    }

    public function isBiddable(): bool
    {
        return $this->isAuction() || $this->isBlindBid();
    }

    public function getCurrentBidAmount(): ?float
    {
        $top = $this->bids()->whereIn('status', ['active', 'winning'])->first();

        return $top ? (float) $top->bid_amount : null;
    }

    public function winningBid(): BelongsTo
    {
        return $this->belongsTo(Bid::class, 'winning_bid_id');
    }

    public function winner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'winner_user_id');
    }

    public function hasWinner(): bool
    {
        return ! empty($this->winner_user_id) && ! empty($this->winning_bid_id);
    }

    public function isBiddingClosed(): bool
    {
        if ($this->hasWinner()) {
            return true;
        }
        $deadline = $this->isAuction() ? $this->auction_end : $this->bid_deadline;

        return $deadline && $deadline->isPast();
    }

    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class);
    }

    public function getFirstVariant(): ?ProductVariant
    {
        return $this->variants()->where('is_available', true)->first();
    }

    /**
     * Check if this is a Printify product
     */
    public function isPrintifyProduct(): bool
    {
        return ! empty($this->printify_product_id);
    }

    /**
     * Check if this is a manual product
     */
    public function isManualProduct(): bool
    {
        return empty($this->printify_product_id);
    }

    /**
     * Get the product type label
     */
    public function getProductTypeLabel(): string
    {
        return $this->isPrintifyProduct() ? 'Printify' : 'Manual';
    }
}
