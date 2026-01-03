<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class Course extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'user_id',
        'topic_id',
        'type',
        'event_type_id',
        'name',
        'slug',
        'description',
        'meeting_link',
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
        'last_updated',
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
        'start_date' => 'date',
        'end_date' => 'date',
        'last_updated' => 'datetime',
    ];

    protected $appends = ['image_url', 'formatted_price', 'formatted_duration', 'formatted_format'];

    // Relationships
    public function topic(): BelongsTo
    {
        return $this->belongsTo(Topic::class);
    }

    public function eventType(): BelongsTo
    {
        return $this->belongsTo(EventType::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(User::class, 'organization_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function activeEnrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class)->where('status', 'active');
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class);
    }

    public function enrollmentsCount(): HasMany
    {
        return $this->hasMany(Enrollment::class)
            ->whereIn('status', ['active', 'completed', 'pending']);
    }

    public function getImageUrlAttribute()
    {
        if (!$this->image) {
            return null;
        }

        // If image is already a full URL, return it as is
        if (filter_var($this->image, FILTER_VALIDATE_URL)) {
            return $this->image;
        }

        // Check if file exists, if not still return URL (file might be on different server)
        // This ensures the URL is always generated even if file check fails
        try {
            if (Storage::disk('public')->exists($this->image)) {
                return Storage::disk('public')->url($this->image);
            } else {
                // File doesn't exist but still return URL (might be uploaded but not synced)
                return Storage::disk('public')->url($this->image);
            }
        } catch (\Exception $e) {
            // If storage check fails, still return the URL
            return Storage::disk('public')->url($this->image);
        }
    }
    //formated_price return from here
    public function getFormattedPriceAttribute(): string
    {
        return $this->pricing_type === "paid"
            ? "$" . number_format($this->course_fee, 2)
            : "Free";
    }

    public function getFormattedDurationAttribute(): string
    {
        return match($this->duration) {
            '1_session' => '1 Session',
            '1_week' => '1 Week',
            '2_weeks' => '2 Weeks',
            '1_month' => '1 Month',
            '6_weeks' => '6 Weeks',
            '3_months' => '3 Months',
            default => ucfirst(str_replace('_', ' ', $this->duration ?? '')),
        };
    }

    public function getFormattedFormatAttribute(): string
    {
        return match($this->format) {
            'online' => 'Online',
            'in_person' => 'In-Person',
            'hybrid' => 'Hybrid',
            default => ucfirst(str_replace('_', ' ', $this->format ?? '')),
        };
    }
}
