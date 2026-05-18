<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Casts\Attribute;

class FacebookAccount extends Model
{
    protected $fillable = [
        'user_id',
        'organization_id',
        'facebook_user_id',      // Facebook user ID
        'facebook_user_name',    // Facebook user name
        'facebook_page_id',
        'facebook_page_name',
        'page_access_token',
        'page_category',
        'followers_count',
        'page_data',
        'is_connected',
        'last_synced_at',
        'token_expires_at',
    ];

    protected $casts = [
        'page_data' => 'array',
        'is_connected' => 'boolean',
        'token_expires_at' => 'datetime',
        'last_synced_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    public function posts()
    {
        return $this->hasMany(FacebookPost::class);
    }

    public function scopeConnected($query)
    {
        return $query->where('is_connected', true);
    }

    public function scopeForOrganization($query, $organizationId)
    {
        return $query->where('organization_id', $organizationId);
    }

    public function isTokenExpired(): Attribute
    {
        return Attribute::make(
            get: fn() => $this->token_expires_at && $this->token_expires_at->isPast()
        );
    }

    public function getPagePictureUrl($size = 'normal')
    {
        if (!$this->facebook_page_id) {
            return null;
        }

        $sizes = [
            'small' => 50,
            'normal' => 100,
            'large' => 200,
            'square' => 50,
        ];

        $width = $sizes[$size] ?? 100;

        return "https://graph.facebook.com/{$this->facebook_page_id}/picture?width={$width}&height={$width}&access_token={$this->page_access_token}";
    }


    public function getIsConnectedAttribute($value)
    {
        // If manually set to false, return false
        if (!$value) {
            return false;
        }

        // Check if token is expired
        if ($this->token_expires_at && $this->token_expires_at->isPast()) {
            return false;
        }

        // Check if we have required fields
        if (empty($this->page_access_token) || empty($this->facebook_page_id)) {
            return false;
        }

        return true;
    }



    public function scopeByUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeByOrganization($query, $organizationId)
    {
        return $query->where('organization_id', $organizationId);
    }

    public function scopeWithAppCredentials($query)
    {
        return $query->whereNotNull('facebook_app_id')
            ->whereNotNull('facebook_app_secret');
    }


    // public function hasValidAppCredentials()
    // {
    //     return !empty($this->facebook_app_id) && !empty($this->facebook_app_secret);
    // }

    // // Mask sensitive data for display
    // public function getMaskedAppSecret()
    // {
    //     if (!$this->facebook_app_secret) {
    //         return null;
    //     }

    //     $length = strlen($this->facebook_app_secret);
    //     if ($length <= 8) {
    //         return str_repeat('*', $length);
    //     }

    //     return substr($this->facebook_app_secret, 0, 4) . str_repeat('*', $length - 8) . substr($this->facebook_app_secret, -4);
    // }
}
