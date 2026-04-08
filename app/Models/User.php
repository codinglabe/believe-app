<?php

namespace App\Models;

use App\Jobs\ProcessBelievePointsAutoReplenishJob;
// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Laravel\Cashier\Billable;
use Laravel\Passport\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use Billable, HasApiTokens, HasFactory, HasRoles, Notifiable;

    /**
     * The guard name for Spatie Permission
     */
    protected $guard_name = 'web';

    /**
     * Get the guard name for Spatie Permission
     */
    public function getGuardName(): string
    {
        return $this->guard_name ?? 'web';
    }

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'balance',
        'reward_points',
        'believe_points',
        'believe_points_auto_replenish_enabled',
        'believe_points_auto_replenish_threshold',
        'believe_points_auto_replenish_amount',
        'believe_points_auto_replenish_pm_id',
        'believe_points_auto_replenish_card_brand',
        'believe_points_auto_replenish_card_last4',
        'believe_points_auto_replenish_agreed_at',
        'believe_points_last_auto_replenish_at',
        'user_id',
        'slug',
        'email',
        'password',
        'registered_user_image',
        'image',
        'cover_img',
        'dob',
        'contact_number',
        'role',
        'organization_role',
        'whatsapp_opt_in',
        'push_token',
        'login_status',
        'referral_code',
        'referred_by',
        'is_verified',
        'email_verified_at',
        'two_fa_enabled',
        'biometric_enabled',
        'ownership_verified_at',
        'verification_status',
        'primary_bank_account_id',
        'plaid_access_token',
        'verification_metadata',
        'timezone',
        'wallet_access_token',
        'wallet_encrypted_token',
        'wallet_user_id',
        'wallet_token_expires_at',
        'wallet_connected_at',
        'emails_included',
        'emails_used',
        'ai_tokens_included',
        'ai_tokens_used',
        'current_plan_details',
        'current_plan_id',
        'city',
        'state',
        'zipcode',
        'volunteer_interest_statement',
        'youtube_channel_url',
        'youtube_access_token',
        'youtube_refresh_token',
        'youtube_token_expires_at',
        'dropbox_refresh_token',
        'dropbox_access_token',
        'dropbox_token_expires_at',
        'dropbox_folder_name',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'youtube_access_token',
        'youtube_refresh_token',
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
            'wallet_token_expires_at' => 'datetime',
            'wallet_connected_at' => 'datetime',
            'current_plan_details' => 'array',
            'emails_included' => 'integer',
            'emails_used' => 'integer',
            'ai_tokens_included' => 'integer',
            'ai_tokens_used' => 'integer',
            'believe_points' => 'decimal:2',
            'believe_points_auto_replenish_enabled' => 'boolean',
            'believe_points_auto_replenish_threshold' => 'decimal:2',
            'believe_points_auto_replenish_amount' => 'decimal:2',
            'believe_points_auto_replenish_agreed_at' => 'datetime',
            'believe_points_last_auto_replenish_at' => 'datetime',
            'youtube_token_expires_at' => 'datetime',
            'dropbox_token_expires_at' => 'datetime',
        ];
    }

    protected static function boot()
    {
        parent::boot();

        // Set default guard for Spatie Permission
        static::creating(function ($user) {
            if (empty($user->referral_code)) {
                do {
                    $code = substr(bin2hex(random_bytes(8)), 0, 12);
                } while (self::where('referral_code', $code)->exists());
                $user->referral_code = $code;
            }

            // Auto-generate slug if not provided
            if (empty($user->slug) && ! empty($user->name)) {
                $baseSlug = Str::slug($user->name);
                $slug = $baseSlug;
                $counter = 1;

                while (self::where('slug', $slug)->exists()) {
                    $slug = $baseSlug.'-'.$counter;
                    $counter++;
                }

                $user->slug = $slug;
            }

            // Ensure guard_name is set
            if (empty($user->guard_name)) {
                $user->guard_name = 'web';
            }
        });

        // Set guard_name for existing models when retrieved
        static::retrieved(function ($user) {
            if (empty($user->guard_name)) {
                $user->guard_name = 'web';
            }
        });
    }

    public function receivesBroadcastNotificationsOn(): string
    {
        return 'users.'.$this->id;
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
        if (! $this->image) {
            return $this->defaultProfilePhotoUrl();
        }

        return Storage::disk('public')->url($this->image);
    }

    /**
     * Get the default profile photo URL if no profile photo has been uploaded.
     */
    protected function defaultProfilePhotoUrl(): string
    {
        $name = trim(collect(explode(' ', $this->name))->map(function ($segment) {
            return mb_substr($segment, 0, 1);
        })->join(' '));

        return 'https://ui-avatars.com/api/?name='.urlencode($name).'&color=7F9CF5&background=EBF4FF';
    }

    /**
     * Delete the user's profile photo.
     */
    public function deleteProfilePhoto(): void
    {
        if ($this->image) {
            Storage::disk('public')->delete($this->image);
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

    public function savedNewsArticles(): BelongsToMany
    {
        return $this->belongsToMany(NonprofitNewsArticle::class, 'user_saved_nonprofit_news', 'user_id', 'nonprofit_news_article_id')
            ->withTimestamps();
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
     */
    public function recordTransaction(array $data): Transaction
    {
        // Merge default values, allowing overrides
        $defaultData = [
            'user_id' => $this->id,
            'status' => 'completed', // Default status, can be overridden
            'currency' => 'USD',
            'related_id' => null,
            'related_type' => null,
            'processed_at' => now(), // Default processed_at
        ];

        return $this->transactions()->create(array_merge($defaultData, $data));
    }

    /**
     * Add funds to the user's balance and record a deposit transaction.
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
     */
    public function depositFund(float $amount, string $method = 'wallet', array $meta = []): void
    {
        $this->addFund($amount, $method, $meta);
    }

    /**
     * Refund funds to the user's balance and record a refund transaction.
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

    // public function organization(): HasOne
    // {
    //     return $this->hasOne(Organization::class, 'user_id');
    // }

    public function organization()
    {
        // Use hasOneThrough relationship but fix ambiguous column issue.
        // Only include youtube columns if they exist (migrations may not be run yet).
        $base = 'organizations.id, organizations.name, organizations.user_id, organizations.ein, organizations.description, organizations.mission, organizations.website, organizations.email, organizations.phone, organizations.contact_name, organizations.contact_title, organizations.city, organizations.state, organizations.zip, organizations.registration_status, organizations.created_at, organizations.updated_at';
        $youtube = Schema::hasColumn('organizations', 'youtube_channel_url') ? ', organizations.youtube_channel_url' : '';
        $youtubeOAuth = '';
        if (Schema::hasColumn('organizations', 'youtube_access_token')) {
            $youtubeOAuth .= ', organizations.youtube_access_token, organizations.youtube_refresh_token, organizations.youtube_token_expires_at';
        }
        $select = $base.$youtube.$youtubeOAuth.', board_members.user_id as laravel_through_key';

        return $this->hasOneThrough(
            Organization::class,
            BoardMember::class,
            'user_id', // Foreign key on board_members table
            'id', // Foreign key on organizations table
            'id', // Local key on users table
            'organization_id' // Local key on board_members table
        )->selectRaw($select);
    }

    public function isOrganizationAdmin()
    {
        return $this->organization_role === 'admin' && $this->organization;
    }

    public function isOrganizationLeader()
    {
        return $this->organization_role === 'leader' && $this->organization;
    }

    public function boardMemberships()
    {
        return $this->hasMany(BoardMember::class);
    }

    public function canManageContent()
    {
        return $this->isOrganizationAdmin() || $this->isOrganizationLeader();
    }

    public function contentItems()
    {
        return $this->hasMany(ContentItem::class);
    }

    public function campaigns()
    {
        return $this->hasMany(Campaign::class);
    }

    public function createdCareAlliances(): HasMany
    {
        return $this->hasMany(CareAlliance::class, 'creator_user_id');
    }

    /**
     * Care Alliance creators need a 9-digit EIN on their alliance record to use wallet / Bridge flows.
     * Everyone else is unrestricted by this rule.
     */
    public function careAllianceWalletEligible(): bool
    {
        if (! $this->hasRole('care_alliance')) {
            return true;
        }

        $alliance = CareAlliance::query()->where('creator_user_id', $this->id)->first();
        if (! $alliance) {
            return true;
        }

        $digits = $alliance->ein ? preg_replace('/\D/', '', $alliance->ein) : '';

        return strlen($digits) === 9;
    }

    /**
     * Whether the app header (navbar + dashboard sidebar) should show the wallet control.
     * Care Alliance hubs need a 9-digit EIN on the alliance row; organizations need a 9-digit org EIN.
     */
    public function walletHeaderVisible(): bool
    {
        if ($this->hasRole('care_alliance')) {
            $alliance = CareAlliance::query()->where('creator_user_id', $this->id)->first();
            if (! $alliance) {
                return false;
            }
            $digits = $alliance->ein ? preg_replace('/\D/', '', (string) $alliance->ein) : '';

            return strlen($digits) === 9;
        }

        if ($this->hasRole('organization') || $this->hasRole('organization_pending')) {
            $org = Organization::forAuthUser($this);
            if (! $org) {
                return false;
            }
            $digits = $org->ein ? preg_replace('/\D/', '', (string) $org->ein) : '';

            return strlen($digits) === 9;
        }

        return true;
    }

    /**
     * Nonprofit-side dashboard users: approved org, Form 1023 pending, or Care Alliance hub.
     * Uses Spatie roles and falls back to the legacy {@see $fillable} `role` column when out of sync.
     */
    public function hasNonprofitDashboardRole(): bool
    {
        if ($this->hasAnyRole(['organization', 'organization_pending', 'care_alliance'])) {
            return true;
        }

        return in_array((string) $this->role, ['organization', 'organization_pending', 'care_alliance'], true);
    }

    /**
     * Whether this account may follow nonprofits (Explore by Cause, favorites, etc.).
     * Organization / Care Alliance / admin accounts cannot follow other organizations.
     */
    public function canFollowOrganizations(): bool
    {
        if ($this->hasRole('admin') || (string) $this->role === 'admin') {
            return false;
        }

        if ($this->hasNonprofitDashboardRole()) {
            return false;
        }

        return $this->hasRole('user') || (string) $this->role === 'user';
    }

    public function sendJobs()
    {
        return $this->hasMany(SendJob::class);
    }

    /**
     * Get the Bridge integration for this user
     */
    public function bridgeIntegration(): HasOne
    {
        return $this->hasOne(BridgeIntegration::class, 'integratable_id')
            ->where('integratable_type', self::class);
    }

    // Notification preferences
    public function shouldReceivePush()
    {
        return ! empty($this->push_token) && $this->login_status;
    }

    public function shouldReceiveWhatsApp()
    {
        return $this->whatsapp_opt_in && ! empty($this->contact_number);
    }

    public function getLocalTimezone()
    {
        return $this->timezone ?? 'America/Chicago';
    }

    /**
     * Route notifications for Twilio channel (WhatsApp)
     */
    public function routeNotificationForTwilio()
    {
        return $this->contact_number ? 'whatsapp:'.$this->contact_number : null;
    }

    // public function organizations()
    // {
    //     return $this->hasManyThrough(Organization::class, BoardMember::class, 'user_id', 'id', 'id', 'organization_id');
    // }

    public function getAvatarUrlAttribute(): string
    {
        return $this->image ? asset('storage/'.$this->image) : 'https://ui-avatars.com/api/?name='.urlencode($this->name).'&background=random';
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

    // public function organizations(): HasMany
    // {
    //     return $this->hasMany(Organization::class);
    // }

    public function bankAccounts(): HasMany
    {
        return $this->hasMany(BankAccount::class);
    }

    /**
     * Livestreams created by this user (supporter meetings — VDO.Ninja).
     */
    public function userLivestreams(): HasMany
    {
        return $this->hasMany(UserLivestream::class);
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

    public function interestedTopics()
    {
        return $this->belongsToMany(ChatTopic::class, 'user_interested_topics', 'user_id', 'topic_id')
            ->withTimestamps();
    }

    /**
     * Get the social media accounts for this user.
     */
    public function socialMediaAccounts(): HasMany
    {
        return $this->hasMany(SocialMediaAccount::class);
    }

    /**
     * Get the social media posts for this user.
     */
    public function socialMediaPosts(): HasMany
    {
        return $this->hasMany(SocialMediaPost::class);
    }

    /**
     * Get the user's notifications with pagination
     */
    public function notifications()
    {
        return $this->morphMany(\Illuminate\Notifications\DatabaseNotification::class, 'notifiable')
            ->orderBy('created_at', 'desc');
    }

    /**
     * Get the user's unread notifications
     */
    public function unreadNotifications()
    {
        return $this->notifications()->whereNull('read_at');
    }

    public function pushTokens()
    {
        return $this->hasMany(UserPushToken::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function cart(): HasOne
    {
        return $this->hasOne(Cart::class);
    }

    /**
     * Get the user's current plan
     */
    public function currentPlan(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Plan::class, 'current_plan_id');
    }

    public function supporterPositions()
    {
        // If using pivot table
        return $this->belongsToMany(
            SupporterPosition::class,
            'supporter_user_positions', // pivot table name
            'user_id',
            'follower_position_id'
        )->withTimestamps();
    }

    /**
     * Primary action categories this supporter is interested in (profile: Supporters Interest).
     */
    public function supporterInterestCategories(): BelongsToMany
    {
        return $this->belongsToMany(
            PrimaryActionCategory::class,
            'primary_action_category_user',
            'user_id',
            'primary_action_category_id'
        )->withTimestamps();
    }

    /**
     * Get the gigs created by this user
     */
    public function gigs(): HasMany
    {
        return $this->hasMany(Gig::class);
    }

    public function interestCategories(): BelongsToMany
    {
        return $this->belongsToMany(InterestCategory::class, 'interest_category_user')
            ->withTimestamps();
    }

    /**
     * Get the favorite gigs for this user
     */
    public function favoriteGigs(): BelongsToMany
    {
        return $this->belongsToMany(Gig::class, 'gig_favorites')
            ->withTimestamps();
    }

    /**
     * Get service orders where user is buyer
     */
    public function serviceOrdersAsBuyer(): HasMany
    {
        return $this->hasMany(ServiceOrder::class, 'buyer_id');
    }

    /**
     * Get service orders where user is seller
     */
    public function serviceOrdersAsSeller(): HasMany
    {
        return $this->hasMany(ServiceOrder::class, 'seller_id');
    }

    /**
     * Get the service seller profile for this user.
     */
    public function serviceSellerProfile(): HasOne
    {
        return $this->hasOne(ServiceSellerProfile::class);
    }

    /**
     * Get believe point purchases for this user.
     */
    public function believePointPurchases(): HasMany
    {
        return $this->hasMany(BelievePointPurchase::class);
    }

    /**
     * Add believe points to the user's balance.
     */
    public function addBelievePoints(float $points): void
    {
        $this->increment('believe_points', $points);
    }

    /**
     * Deduct believe points from the user's balance.
     *
     * @return bool Returns true if deduction was successful, false if insufficient points
     */
    public function deductBelievePoints(float $points): bool
    {
        if ($this->believe_points < $points) {
            return false;
        }
        $this->decrement('believe_points', $points);

        ProcessBelievePointsAutoReplenishJob::dispatch($this->id)->afterResponse();

        return true;
    }

    /**
     * Get the current believe points balance of the user.
     */
    public function currentBelievePoints(): float
    {
        return (float) ($this->believe_points ?? 0);
    }

    /**
     * Add reward points to the user's balance and create a ledger entry.
     *
     * @param  string  $source  (e.g., 'nonprofit_assessment')
     * @param  int|float  $points  Supports fractional reward points (e.g. 0.10 per $1 USD).
     * @param  int|null  $referenceId  (e.g., assessment_id)
     */
    public function addRewardPoints(
        int|float $points,
        string $source,
        ?int $referenceId = null,
        ?string $description = null,
        ?array $metadata = null
    ): void {
        $points = round((float) $points, 2);
        if ($points <= 0) {
            return;
        }

        $this->increment('reward_points', $points);

        RewardPointLedger::createCredit(
            $this->id,
            $source,
            $referenceId,
            $points,
            $description,
            $metadata
        );
    }

    /**
     * Deduct reward points from the user's balance and create a ledger entry.
     *
     * @param  string  $source  (e.g., 'merchant_reward_redemption')
     * @param  int|null  $referenceId  (e.g., redemption_id)
     * @return bool Returns true if deduction was successful, false if insufficient points
     */
    public function deductRewardPoints(
        int|float $points,
        string $source,
        ?int $referenceId = null,
        ?string $description = null,
        ?array $metadata = null
    ): bool {
        $points = round((float) $points, 2);
        if ($points <= 0) {
            return true;
        }

        $balance = round((float) ($this->reward_points ?? 0), 2);
        if ($balance < $points) {
            return false;
        }

        $this->decrement('reward_points', $points);

        RewardPointLedger::createDebit(
            $this->id,
            $source,
            $referenceId,
            $points,
            $description,
            $metadata
        );

        return true;
    }

    /**
     * Get the current reward points balance of the user.
     */
    public function currentRewardPoints(): float
    {
        return round((float) ($this->reward_points ?? 0), 2);
    }

    /**
     * Send the email verification notification.
     *
     * @param  string|null  $domain  The domain from the request context (where user is accessing from)
     * @return void
     */
    public function sendEmailVerificationNotification(?string $domain = null)
    {
        // Get domain from request if not provided
        if (! $domain && request()) {
            // Use actual request host, not config value
            $scheme = request()->getScheme();
            $host = request()->getHost();
            $port = request()->getPort();
            $domain = $scheme.'://'.$host.($port && $port != 80 && $port != 443 ? ':'.$port : '');
        }

        $this->notify(new \App\Notifications\VerifyEmailNotification($domain));
    }
}
