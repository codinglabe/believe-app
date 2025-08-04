<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;

class Course extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'topic_id',
        'organization_id',
        'user_id',
        'pricing_type',
        'course_fee',
        'start_date',
        'start_time',
        'end_date',
        'duration',
        'format',
        'max_participants',
        'language',
        'target_audience',
        'community_impact',
        'learning_outcomes',
        'prerequisites',
        'materials_needed',
        'accessibility_features',
        'certificate_provided',
        'volunteer_opportunities',
        'image',
        'enrolled',
        'rating',
        'total_reviews',
        'last_updated'
    ];

    protected $casts = [
        'learning_outcomes' => 'array',
        'prerequisites' => 'array',
        'materials_needed' => 'array',
        'accessibility_features' => 'array',
        'certificate_provided' => 'boolean',
        'volunteer_opportunities' => 'boolean',
        'course_fee' => 'decimal:2',
        'rating' => 'decimal:1',
        'start_date' => 'date:Y-m-d',
        'end_date' => 'date:Y-m-d',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    protected $appends = [
        'image_url',
        'formatted_price',
        'formatted_duration',
        'formatted_format',
        'status',
        'enrollment_status'
    ];

    // Relationships
    public function topic(): BelongsTo
    {
        return $this->belongsTo(Topic::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(User::class, 'organization_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class);
    }
    public function activeEnrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class)->where('status', Enrollment::STATUS_ACTIVE);
    }

    // Accessors
    public function getImageUrlAttribute()
    {
        if ($this->image && Storage::disk('public')->exists($this->image)) {
            return Storage::disk('public')->url($this->image);
        }
        return null;
    }

    public function getFormattedPriceAttribute()
    {
        if ($this->pricing_type === 'free' || $this->course_fee == 0) {
            return 'Free';
        }
        return '$' . number_format($this->course_fee, 2);
    }

    public function getFormattedDurationAttribute()
    {
        $durations = [
            '1_session' => 'Single Session',
            '1_week' => '1 Week',
            '2_weeks' => '2 Weeks',
            '1_month' => '1 Month',
            '6_weeks' => '6 Weeks',
            '3_months' => '3 Months',
        ];

        return $durations[$this->duration] ?? $this->duration;
    }

    public function getFormattedFormatAttribute()
    {
        $formats = [
            'online' => 'Online',
            'in_person' => 'In-Person',
            'hybrid' => 'Hybrid',
        ];

        return $formats[$this->format] ?? $this->format;
    }

    public function getStatusAttribute()
    {
        $now = now();
        $startDate = Carbon::parse($this->start_date);
        $endDate = $this->end_date ? Carbon::parse($this->end_date) : null;

        if ($startDate->isFuture()) {
            return 'upcoming';
        }

        if ($startDate->isPast() && (!$endDate || $endDate->isFuture())) {
            return 'active';
        }

        if ($endDate && $endDate->isPast()) {
            return 'completed';
        }

        return 'active';
    }

    public function getEnrollmentStatusAttribute()
    {
        $now = now();
        $courseStart = Carbon::parse($this->start_date);

        if ($courseStart->isPast()) {
            return 'started';
        } elseif ($this->enrolled >= $this->max_participants) {
            return 'full';
        } elseif (($this->enrolled / $this->max_participants) >= 0.8) {
            return 'almost_full';
        } else {
            return 'available';
        }
    }

    // Helper methods
    public function isFull(): bool
    {
        return $this->enrolled >= $this->max_participants;
    }

    public function hasAvailableSpots(): bool
    {
        return $this->enrolled < $this->max_participants;
    }

    public function getAvailableSpots(): int
    {
        return max(0, $this->max_participants - $this->enrolled);
    }

    public function getEnrollmentPercentage(): float
    {
        if ($this->max_participants == 0) {
            return 0;
        }
        return round(($this->enrolled / $this->max_participants) * 100, 1);
    }

    public function canEnroll(): bool
    {
        return $this->hasAvailableSpots() && $this->start_date > now();
    }

    public function isEnrollmentOpen(): bool
    {
        return $this->start_date > now();
    }

    public function getTotalRevenue(): float
    {
        if ($this->pricing_type === 'free') {
            return 0;
        }
        return $this->enrolled * $this->course_fee;
    }

    // Check if user is enrolled
    public function isUserEnrolled($userId): bool
    {
        return $this->enrollments()
            ->where('user_id', $userId)
            ->where('status', Enrollment::STATUS_ACTIVE)
            ->exists();
    }

    // Get user's enrollment
    public function getUserEnrollment($userId)
    {
        return $this->enrollments()
            ->where('user_id', $userId)
            ->first();
    }
}
