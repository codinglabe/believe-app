<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Casts\Attribute;

class FacebookAccount extends Model
{
    protected $fillable = [
        'user_id',
        'organization_id',
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
        'last_synced_at' => 'datetime',
        'token_expires_at' => 'datetime',
        'followers_count' => 'integer',
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

    protected function isTokenExpired(): Attribute
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
}
