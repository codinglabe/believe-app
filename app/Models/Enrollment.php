<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class Enrollment extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'course_id',
        'status',
        'amount_paid',
        'payment_intent_id',
        'payment_status',
        'refund_id',
        'enrolled_at',
        'completed_at',
        'cancelled_at',
        'refunded_at',
        'cancellation_reason',
    ];

    protected $casts = [
        'amount_paid' => 'decimal:2',
        'enrolled_at' => 'datetime',
        'completed_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'refunded_at' => 'datetime',
    ];

    public const STATUS_ACTIVE = 'active';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_CANCELLED = 'cancelled';
    public const STATUS_REFUNDED = 'refunded';


    /**
     * Get the user that owns the enrollment.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the course that the enrollment belongs to.
     */
    public function course()
    {
        return $this->belongsTo(Course::class);
    }

    /**
     * Check if enrollment can be cancelled
     */
    public function getCanBeCancelledAttribute()
    {
        if ($this->status !== 'active') {
            return false;
        }

        // Can't cancel if course has already started
        if (now()->gt($this->course->start_date)) {
            return false;
        }

        // Can't cancel less than 24 hours before start
        $hoursUntilStart = now()->diffInHours($this->course->start_date, false);
        return $hoursUntilStart >= 24;
    }

    /**
     * Check if enrollment can be refunded
     */
    public function getCanBeRefundedAttribute()
    {
        if (!in_array($this->status, ['active', 'cancelled'])) {
            return false;
        }

        if ($this->amount_paid <= 0) {
            return false;
        }

        // Check if within refund period (7 days from enrollment)
        $daysFromEnrollment = $this->enrolled_at->diffInDays(now());
        return $daysFromEnrollment <= 7;
    }

    /**
     * Get human-readable status label
     */
    public function getStatusLabelAttribute()
    {
        return match ($this->status) {
            'active' => 'Active',
            'completed' => 'Completed',
            'cancelled' => 'Cancelled',
            'refunded' => 'Refunded',
            default => 'Unknown'
        };
    }

    /**
     * Scope for active enrollments
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope for completed enrollments
     */
    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }
}
