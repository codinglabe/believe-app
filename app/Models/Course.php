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

    protected $appends = ['image_url', 'formatted_price'];

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

    public function activeEnrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class)->where('status', 'active');
    }

    public function getImageUrlAttribute()
    {
        if ($this->image && Storage::disk('public')->exists($this->image)) {
            return Storage::disk('public')->url($this->image);
        }
        return null;
    }
    //formated_price return from here
    public function getFormattedPriceAttribute(): string
    {
        return $this->pricing_type === "paid"
            ? "$" . number_format($this->course_fee, 2)
            : "Free";
    }
}
