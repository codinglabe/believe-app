<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
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
        'contact_number',
        'role',
        'login_status',
        'referral_code',
        'referred_by',
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

    public function organization()
    {
        return $this->hasOne(Organization::class);
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

<<<<<<< Updated upstream
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
=======


    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }

    protected function recordTransaction(array $data): void
    {
        $this->transactions()->create(array_merge([
            'status' => 'completed',
            'currency' => 'USD',
        ], $data));
    }

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

    public function withdrawFund(float $amount, string $method = 'wallet', array $meta = []): bool
    {
        if ($this->balance < $amount) {
            return false;
        }

        $this->decrement('balance', $amount);
        $this->recordTransaction([
            'type' => 'withdrawal',
            'amount' => $amount,
            'payment_method' => $method,
            'meta' => $meta,
        ]);

        return true;
    }

    public function depositFund(float $amount, string $method = 'wallet', array $meta = []): void
    {
        $this->addFund($amount, $method, $meta);
    }

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

    public function currentBalance(): float
    {
        return $this->balance;
>>>>>>> Stashed changes
    }
}
