<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Traits\HasRoles;
use Laravel\Cashier\Billable;

class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, HasRoles, Billable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'balance',
        'user_id',
        'slug',
        'email',
        'password',
        'image',
        'cover_img',
        'dob',
        'contact_number',
        'role',
        'login_status',
        'referral_code',
        'referred_by',
        "is_verified",
        "ownership_verified_at",
        "verification_status",
        'primary_bank_account_id',
        'plaid_access_token',
        'verification_metadata',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'ownership_verified_at' => 'datetime',
            'verification_metadata' => 'array',
            'password' => 'hashed',
        ];
    }

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($user) {
            if (empty($user->referral_code)) {
                do {
                    $code = substr(bin2hex(random_bytes(8)), 0, 12);
                } while (self::where('referral_code', $code)->exists());
                $user->referral_code = $code;
            }
        });
    }

    public function user()
    {
        return $this->hasOne(User::class);
    }

    public function nodeReferrals()
    {
        return $this->hasMany(NodeReferral::class);
    }

    /**
     * Get the URL to the user's profile photo.
     */
    public function getProfilePhotoUrlAttribute(): ?string
    {
        if (!$this->image) {
            return $this->defaultProfilePhotoUrl();
        }

        return Storage::disk("public")->url($this->image);
    }

    /**
     * Get the default profile photo URL if no profile photo has been uploaded.
     */
    protected function defaultProfilePhotoUrl(): string
    {
        $name = trim(collect(explode(' ', $this->name))->map(function ($segment) {
            return mb_substr($segment, 0, 1);
        })->join(' '));

        return 'https://ui-avatars.com/api/?name=' . urlencode($name) . '&color=7F9CF5&background=EBF4FF';
    }

    /**
     * Delete the user's profile photo.
     */
    public function deleteProfilePhoto(): void
    {
        if ($this->image) {
            Storage::disk("public")->delete($this->image);
            $this->forceFill([
                'image' => null,
            ])->save();
        }
    }

    /**
     * Update the user's profile photo.
     */
    public function updateProfilePhoto($photoPath, $disk = 'public'): void
    {
        // Delete old photo if exists
        $this->deleteProfilePhoto();

        // Store new photo path
        $this->forceFill([
            'image' => $photoPath,
        ])->save();
    }

    public function favoriteOrganizations()
    {
        return $this->belongsToMany(Organization::class, 'user_favorite_organizations')
            ->withTimestamps()->with(['user', 'nteeCode']);
    }

    public function jobApplications()
    {
        return $this->hasMany(JobApplication::class);
    }

    public function hasAppliedToJob($jobId)
    {
        return $this->jobApplications()->where('job_post_id', $jobId)->exists();
    }

    public function getApplicationId($jobId)
    {
        $application = $this->jobApplications()
            ->where('job_post_id', $jobId)
            ->first();

        return $application ? $application->id : null;
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }

    /**
     * Record a transaction for the user.
     *
     * @param array $data
     * @return void
     */
    protected function recordTransaction(array $data): void
    {
        // Merge default values, allowing overrides
        $defaultData = [
            'status' => 'completed', // Default status, can be overridden
            'currency' => 'USD',
            'related_id' => null,
            'related_type' => null,
            'processed_at' => now(), // Default processed_at
        ];
        $this->transactions()->create(array_merge($defaultData, $data));
    }

    /**
     * Add funds to the user's balance and record a deposit transaction.
     *
     * @param float $amount
     * @param string $method
     * @param array $meta
     * @return void
     */
    public function addFund(float $amount, string $method = 'wallet', array $meta = []): void
    {
        $this->increment('balance', $amount);
        $this->recordTransaction([
            'type' => 'deposit',
            'amount' => $amount,
            'payment_method' => $method,
            'meta' => $meta,
        ]);
    }

    /**
     * Withdraw funds from the user's balance and record a withdrawal transaction.
     *
     * @param float $amount
     * @param string $method
     * @param array $meta
     * @param int|null $relatedId
     * @param string|null $relatedType
     * @param string $status
     * @return bool
     */
    public function withdrawFund(
        float $amount,
        string $method = 'wallet',
        array $meta = [],
        ?int $relatedId = null,
        ?string $relatedType = null,
        string $status = 'pending' // Default to pending for withdrawals
    ): bool {
        if ($this->balance < $amount) {
            return false;
        }
        $this->decrement('balance', $amount);
        $this->recordTransaction([
            'type' => 'withdrawal',
            'status' => $status, // Use the provided status
            'amount' => $amount,
            'payment_method' => $method,
            'meta' => $meta,
            'related_id' => $relatedId,
            'related_type' => $relatedType,
            'processed_at' => null, // Set to null initially for pending withdrawals
        ]);
        return true;
    }

    /**
     * Alias for addFund.
     *
     * @param float $amount
     * @param string $method
     * @param array $meta
     * @return void
     */
    public function depositFund(float $amount, string $method = 'wallet', array $meta = []): void
    {
        $this->addFund($amount, $method, $meta);
    }

    /**
     * Refund funds to the user's balance and record a refund transaction.
     *
     * @param float $amount
     * @param string $method
     * @param array $meta
     * @return void
     */
    public function refund(float $amount, string $method = 'wallet', array $meta = []): void
    {
        $this->increment('balance', $amount);
        $this->recordTransaction([
            'type' => 'refund',
            'amount' => $amount,
            'payment_method' => $method,
            'meta' => $meta,
        ]);
    }

    /**
     * Add commission to the user's balance and record a commission transaction.
     *
     * @param float $amount
     * @param array $meta
     * @return void
     */
    public function commissionAdd(float $amount, array $meta = []): void
    {
        $this->increment('balance', $amount);
        $this->recordTransaction([
            'type' => 'commission',
            'amount' => $amount,
            'payment_method' => 'system',
            'meta' => $meta,
        ]);
    }

    /**
     * Get the current balance of the user.
     *
     * @return float
     */
    public function currentBalance(): float
    {
        return (float) $this->balance;
    }


    // Add these relationships to your existing User model
    public function chatRooms(): BelongsToMany
    {
        return $this->belongsToMany(ChatRoom::class, 'chat_room_members')
            ->withPivot(['role', 'joined_at', 'last_seen_at'])
            ->withTimestamps();
    }

    public function chatMessages(): HasMany
    {
        return $this->hasMany(ChatMessage::class);
    }

    public function organization(): HasOne
    {
        return $this->hasOne(Organization::class, 'user_id');
    }

    public function getAvatarUrlAttribute(): string
    {
        return $this->image ? asset('storage/' . $this->image) : 'https://ui-avatars.com/api/?name=' . urlencode($this->name) . '&background=random';
    }

    public function getIsOnlineAttribute(): bool
    {
        return $this->login_status == 1;
    }


    /**
     * Get the courses created by this user (as organization).
     */
    public function createdCourses()
    {
        return $this->hasMany(Course::class, 'organization_id');
    }

    /**
     * Get the courses instructed by this user.
     */
    public function instructedCourses()
    {
        return $this->hasMany(Course::class, 'user_id');
    }

    /**
     * Get the enrollments for this user.
     */
    public function enrollments()
    {
        return $this->hasMany(Enrollment::class);
    }

    /**
     * Get the courses this user is enrolled in.
     */
    public function enrolledCourses()
    {
        return $this->belongsToMany(Course::class, 'enrollments')
            ->withPivot(['status', 'amount_paid', 'enrolled_at'])
            ->withTimestamps();
    }

    /**
     * Check if user is enrolled in a specific course
     */
    public function isEnrolledIn(Course $course)
    {
        return $this->enrollments()
            ->where('course_id', $course->id)
            ->where('status', 'active')
            ->exists();
    }


    public function organizations(): HasMany
    {
        return $this->hasMany(Organization::class);
    }

    public function bankAccounts(): HasMany
    {
        return $this->hasMany(BankAccount::class);
    }


    public function bankVerifications(): HasMany
    {
        return $this->hasMany(BankVerification::class);
    }

    public function primaryBankAccount(): HasOne
    {
        return $this->hasOne(BankAccount::class, 'id', 'primary_bank_account_id');
    }

    public function nonprofitVerifications(): HasMany
    {
        return $this->hasMany(NonprofitVerification::class);
    }

    public function latestVerification(): HasOne
    {
        return $this->hasOne(NonprofitVerification::class)->latestOfMany();
    }

    public function isOwnershipVerified(): bool
    {
        return $this->latestVerification && $this->latestVerification->verification_status === 'verified';
    }

    public function hasVerifiedBankAccount(): bool
    {
        return $this->bankAccounts()->where('is_verified', true)->exists();
    }

    public function getVerificationStatus(): string
    {
        $verification = $this->latestVerification;
        return $verification ? $verification->verification_status : 'not_started';
    }
}
