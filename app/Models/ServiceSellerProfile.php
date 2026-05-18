<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class ServiceSellerProfile extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'profile_image',
        'bio',
        'location',
        'state',
        'timezone',
        'phone',
        'skills',
        'languages',
        'education',
        'experience',
        'response_time',
        'website',
        'linkedin',
        'twitter',
        'facebook',
        'instagram',
        'verification_status',
        'rejection_reason',
        'total_orders',
        'average_rating',
        'response_rate',
        'member_since',

        'is_suspended',
        'suspended_at',
        'suspension_reason',
        'suspended_by',
    ];

    protected $casts = [
        'is_suspended' => 'boolean',
        'suspended_at' => 'datetime',
        'skills' => 'array',
        'languages' => 'array',
        'education' => 'array',
        'experience' => 'array',
        'average_rating' => 'decimal:2',
        'response_rate' => 'integer',
        'total_orders' => 'integer',
    ];

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($profile) {
            if (empty($profile->member_since)) {
                $profile->member_since = now()->format('Y-m-d');
            }
        });
    }

    /**
     * Get the user that owns the seller profile.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the profile image URL.
     */
    public function getProfileImageUrlAttribute(): ?string
    {
        if (!$this->profile_image) {
            return null;
        }

        if (filter_var($this->profile_image, FILTER_VALIDATE_URL)) {
            return $this->profile_image;
        }

        return Storage::url($this->profile_image);
    }

    /**
     * Check if seller is verified.
     */
    public function isVerified(): bool
    {
        return $this->verification_status === 'verified';
    }

    /**
     * Check if seller profile is pending verification.
     */
    public function isPending(): bool
    {
        return $this->verification_status === 'pending';
    }

    /**
     * Update seller stats from their gigs and orders.
     */
    public function updateStats(): void
    {
        $user = $this->user;

        // Calculate total orders
        $totalOrders = \App\Models\ServiceOrder::where('seller_id', $user->id)
            ->where('status', 'completed')
            ->count();

        // Calculate average rating
        $reviews = \App\Models\ServiceReview::whereHas('order', function ($q) use ($user) {
            $q->where('seller_id', $user->id);
        })->get();

        $averageRating = $reviews->count() > 0
            ? round($reviews->avg('rating'), 2)
            : 0;

        // Calculate response rate (would need message/response tracking)
        // For now, set to 100% as default
        $responseRate = 100;

        $this->update([
            'total_orders' => $totalOrders,
            'average_rating' => $averageRating,
            'response_rate' => $responseRate,
        ]);
    }

    // Relationship to admin who suspended
    public function suspendedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'suspended_by');
    }

    // Check if seller is active (not suspended)
    public function isActive(): bool
    {
        return !$this->is_suspended;
    }

    // Suspend seller
    public function suspend(string $reason, User $admin): void
    {
        $this->update([
            'is_suspended' => true,
            'suspended_at' => now(),
            'suspension_reason' => $reason,
            'suspended_by' => $admin->id,
        ]);

        // Also suspend all active gigs
        $this->user->gigs()->where('status', 'active')->update(['status' => 'suspended']);
    }

    // Unsuspend seller
    public function unsuspend(): void
    {
        $this->update([
            'is_suspended' => false,
            'suspended_at' => null,
            'suspension_reason' => null,
            'suspended_by' => null,
        ]);

        // Reactivate suspended gigs
        $this->user->gigs()->where('status', 'suspended')->update(['status' => 'active']);
    }

    // Relationship to gigs through user
    public function gigs()
    {
        return $this->hasManyThrough(
            Gig::class,
            User::class,
            'id', // Foreign key on users table
            'user_id', // Foreign key on gigs table
            'user_id', // Local key on service_seller_profiles table
            'id' // Local key on users table
        );
    }

    // Relationship to orders through user (as seller)
    public function ordersAsSeller()
    {
        return $this->hasManyThrough(
            ServiceOrder::class,
            User::class,
            'id', // Foreign key on users table
            'seller_id', // Foreign key on service_orders table
            'user_id', // Local key on service_seller_profiles table
            'id' // Local key on users table
        );
    }

    /**
     * Get orders where this user is the buyer
     */
    public function ordersAsBuyer()
    {
        return $this->hasMany(ServiceOrder::class, 'buyer_id');
    }

    /**
     * Get the service seller profile
     */
    public function serviceSellerProfile()
    {
        return $this->hasOne(ServiceSellerProfile::class);
    }
}
