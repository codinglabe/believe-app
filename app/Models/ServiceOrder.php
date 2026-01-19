<?php

namespace App\Models;

use App\Events\OrderAutoCompleted;
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
        'auto_completed_at',
        'was_auto_completed',
        'is_refunded',
        'refunded_at',
        'refund_reason',
        'refund_amount',
        'stripe_refund_id',
        'refund_status',
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


    /**
     * Check if order can be cancelled by buyer
     */
    public function canBeCancelledByBuyer(): bool
    {
        // Only buyer can cancel their own orders
        if (auth()->id() !== $this->buyer_id) {
            return false;
        }

        // Can only cancel pending or in_progress orders
        if (!in_array($this->status, ['pending', 'in_progress'])) {
            return false;
        }

        // Check 24-hour rule
        $orderAge = now()->diffInHours($this->created_at);

        // If order is more than 24 hours old AND seller has approved it, cannot cancel
        if ($orderAge > 24 && $this->status === 'in_progress') {
            return false;
        }

        return true;
    }

    /**
     * Check if order needs resubmission (buyer cancelled after delivery)
     */
    public function needsResubmission(): bool
    {
        return $this->status === 'in_progress' && $this->delivered_at;
    }


    /**
     * Check if order needs automatic approval (after 48 hours of delivery)
     */
    public function needsAutomaticApproval(): bool
    {
        return $this->status === 'delivered' &&
            $this->delivered_at &&
            now()->diffInHours($this->delivered_at) >= 48;
    }

    /**
     * Automatically approve delivered order after 48 hours
     */
    public function autoApproveIfNeeded(): void
    {
        if ($this->needsAutomaticApproval()) {
            $this->status = 'completed';
            $this->completed_at = now();
            $this->save();

            // Send notification
            event(new OrderAutoCompleted($this));
        }
    }

    /**
     * Cancel order by buyer
     */
    public function cancelByBuyer(string $reason): bool
    {
        if (!$this->canBeCancelledByBuyer()) {
            return false;
        }

        $this->update([
            'status' => 'cancelled',
            'cancelled_at' => now(),
            'cancellation_reason' => $reason . ' (Cancelled by buyer)',
        ]);

        // If order was delivered and cancelled, revert to in_progress
        if ($this->status === 'delivered') {
            $this->update([
                'status' => 'in_progress',
                'delivered_at' => null,
                'deliverables' => null,
            ]);
        }

        return true;
    }

    /**
     * Check if order is within 24-hour cancellation window
     */
    public function isWithinCancellationWindow(): bool
    {
        return now()->diffInHours($this->created_at) <= 24;
    }

    /**
     * Get remaining cancellation time in hours
     */
    public function getRemainingCancellationTime(): int
    {
        $hoursPassed = now()->diffInHours($this->created_at);
        return max(0, 24 - $hoursPassed);
    }

    /**
     * Get remaining auto-approval time for delivered order
     */
    public function getRemainingAutoApprovalTime(): int
    {
        if (!$this->delivered_at || $this->status !== 'delivered') {
            return 0;
        }

        $hoursPassed = now()->diffInHours($this->delivered_at);
        return max(0, 48 - $hoursPassed);
    }
}
