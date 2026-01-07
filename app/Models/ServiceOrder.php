<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class ServiceOrder extends Model
{
    protected $table = 'service_orders';

    protected $fillable = [
        'gig_id',
        'buyer_id',
        'seller_id',
        'package_id',
        'order_number',
        'package_type',
        'amount',
        'platform_fee',
        'transaction_fee',
        'sales_tax',
        'sales_tax_rate',
        'buyer_state',
        'seller_earnings',
        'currency',
        'requirements',
        'special_instructions',
        'status',
        'payment_status',
        'payment_method',
        'stripe_response',
        'stripe_session_id',
        'stripe_payment_intent_id',
        'delivered_at',
        'completed_at',
        'cancelled_at',
        'cancellation_reason',
        'deliverables',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'platform_fee' => 'decimal:2',
        'transaction_fee' => 'decimal:2',
        'sales_tax' => 'decimal:2',
        'sales_tax_rate' => 'decimal:2',
        'seller_earnings' => 'decimal:2',
        'deliverables' => 'array',
        'stripe_response' => 'array',
        'delivered_at' => 'datetime',
        'completed_at' => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($order) {
            if (empty($order->order_number)) {
                $order->order_number = 'SO-' . strtoupper(Str::random(10));
                // Ensure uniqueness
                while (static::where('order_number', $order->order_number)->exists()) {
                    $order->order_number = 'SO-' . strtoupper(Str::random(10));
                }
            }
        });
    }

    /**
     * Get the gig for this order.
     */
    public function gig(): BelongsTo
    {
        return $this->belongsTo(Gig::class, 'gig_id');
    }

    /**
     * Get the buyer (user) for this order.
     */
    public function buyer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'buyer_id');
    }

    /**
     * Get the seller (user) for this order.
     */
    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_id');
    }

    /**
     * Get the package for this order.
     */
    public function package(): BelongsTo
    {
        return $this->belongsTo(GigPackage::class, 'package_id');
    }

    /**
     * Get the buyer review for this order.
     */
    public function buyerReview(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(ServiceReview::class, 'order_id', 'id')->where('reviewer_type', 'buyer');
    }

    /**
     * Get the seller review for this order.
     */
    public function sellerReview(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(ServiceReview::class, 'order_id', 'id')->where('reviewer_type', 'seller');
    }

    /**
     * Get the review for this order (backward compatibility - returns buyer review).
     */
    public function review(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->buyerReview();
    }

    /**
     * Check if order can be reviewed.
     */
    public function canBeReviewed(): bool
    {
        return $this->status === 'completed' && !$this->review;
    }

    /**
     * Mark order as delivered.
     */
    public function markAsDelivered(array $deliverables = [])
    {
        $this->update([
            'status' => 'delivered',
            'delivered_at' => now(),
            'deliverables' => $deliverables,
        ]);
    }

    /**
     * Mark order as completed.
     */
    public function markAsCompleted()
    {
        $this->update([
            'status' => 'completed',
            'completed_at' => now(),
        ]);

        // Update gig orders count
        $this->gig->increment('orders_count');
    }

    /**
     * Cancel the order.
     */
    public function cancel(string $reason = null)
    {
        $this->update([
            'status' => 'cancelled',
            'cancelled_at' => now(),
            'cancellation_reason' => $reason,
        ]);
    }
}
