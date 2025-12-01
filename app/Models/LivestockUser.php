<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Cashier\Billable;

class LivestockUser extends Authenticatable implements MustVerifyEmail
{
    use HasFactory, Notifiable, SoftDeletes, Billable;

    protected $table = 'livestock_users';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'phone',
        'address',
        'city',
        'state',
        'zip_code',
        'country',
        'date_of_birth',
        'status',
        'is_verified',
        'profile_image',
        'bio',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
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
            'date_of_birth' => 'date',
            'is_verified' => 'boolean',
        ];
    }

    /**
     * Get the seller profile for this user.
     */
    public function sellerProfile(): HasOne
    {
        return $this->hasOne(SellerProfile::class, 'livestock_user_id');
    }

    /**
     * Get the buyer profile for this user.
     */
    public function buyerProfile(): HasOne
    {
        return $this->hasOne(BuyerProfile::class, 'livestock_user_id');
    }

    /**
     * Get all animals owned by this user.
     */
    public function animals(): HasMany
    {
        return $this->hasMany(LivestockAnimal::class, 'current_owner_livestock_user_id');
    }

    /**
     * Get all animals sold by this user.
     */
    public function soldAnimals(): HasMany
    {
        return $this->hasMany(LivestockAnimal::class, 'livestock_user_id');
    }

    /**
     * Get all listings created by this user.
     */
    public function listings(): HasMany
    {
        return $this->hasMany(LivestockListing::class, 'livestock_user_id');
    }

    /**
     * Get all payouts for this user.
     */
    public function payouts(): HasMany
    {
        return $this->hasMany(LivestockPayout::class, 'livestock_user_id');
    }

    /**
     * Check if user is a seller.
     */
    public function isSeller(): bool
    {
        return $this->sellerProfile()->exists();
    }

    /**
     * Check if user is verified.
     */
    public function isVerified(): bool
    {
        return $this->is_verified && $this->email_verified_at !== null;
    }

    /**
     * Check if user is active.
     */
    public function isActive(): bool
    {
        return $this->status === 'active';
    }
}
