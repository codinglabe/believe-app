<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class Merchant extends Authenticatable
{
    use HasFactory, Notifiable;

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
        'phone',
        'address',
        'city',
        'state',
        'zip_code',
        'country',
        'status',
        'role',
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
     * Send the email verification notification.
     *
     * @param string|null $domain The domain from the request context (where user is accessing from)
     * @return void
     */
    public function sendEmailVerificationNotification(?string $domain = null)
    {
        // Get domain from request if not provided
        if (!$domain && request()) {
            // Use actual request host, not config value
            $scheme = request()->getScheme();
            $host = request()->getHost();
            $port = request()->getPort();
            $domain = $scheme . '://' . $host . ($port && $port != 80 && $port != 443 ? ':' . $port : '');
        }
        
        $this->notify(new \App\Notifications\VerifyEmailNotification($domain));
    }
}
