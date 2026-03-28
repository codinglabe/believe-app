<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Cashier\Billable;
use Laravel\Cashier\Subscription;

class Merchant extends Authenticatable
{
    use Billable, HasFactory, Notifiable;

    /**
     * Get all of the merchant's subscriptions.
     */
    public function subscriptions(): MorphMany
    {
        return $this->morphMany(Subscription::class, 'user', 'user_type', 'user_id');
    }

    public function marketplaceProducts(): HasMany
    {
        return $this->hasMany(MarketplaceProduct::class);
    }

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'business_name',
        'business_description',
        'website',
        'phone',
        'address',
        'city',
        'state',
        'zip_code',
        'country',
        'shipping_contact_name',
        'shipping_address',
        'shipping_city',
        'shipping_state',
        'shipping_zip',
        'shipping_country',
        'status',
        'role',
        'stripe_id',
        'pm_type',
        'pm_last_four',
        'trial_ends_at',
        'pm_expires_at',
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
        ];
    }

    /**
     * Check if merchant is active
     */
    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    /**
     * Check if merchant is admin
     */
    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    /**
     * Ship-from line for Shippo: dedicated profile fields, else business address columns.
     *
     * @return array{street1: string, city: string, state: string, zip: string, country: string, name: string}
     */
    public function shipFromAddressForRates(): array
    {
        $country = trim((string) ($this->shipping_country ?: $this->country ?: 'US'));

        return [
            'name' => trim((string) ($this->shipping_contact_name ?: $this->business_name ?: $this->name ?: 'Seller')),
            'street1' => trim((string) ($this->shipping_address ?: ($this->address ?? ''))),
            'city' => trim((string) ($this->shipping_city ?: ($this->city ?? ''))),
            'state' => trim((string) ($this->shipping_state ?: ($this->state ?? ''))),
            'zip' => trim((string) ($this->shipping_zip ?: ($this->zip_code ?? ''))),
            'country' => $country !== '' ? $country : 'US',
        ];
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
