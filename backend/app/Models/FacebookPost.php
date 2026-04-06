<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Casts\Attribute;

class FacebookPost extends Model
{
    protected $fillable = [
        'user_id',
        'organization_id',
        'facebook_account_id',
        'facebook_post_id',
        'message',
        'link',
        'image',
        'video',
        'status',
        'scheduled_for',
        'published_at',
        'response_data',
        'error_message',
    ];

    protected $casts = [
        'scheduled_for' => 'datetime',
        'published_at' => 'datetime',
        'response_data' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    public function facebookAccount()
    {
        return $this->belongsTo(FacebookAccount::class);
    }

    protected function formattedMessage(): Attribute
    {
        return Attribute::make(
            get: fn() => htmlspecialchars_decode($this->message, ENT_QUOTES | ENT_HTML5)
        );
    }

    public function scopePublished($query)
    {
        return $query->where('status', 'published');
    }

    public function scopeScheduled($query)
    {
        return $query->where('status', 'pending')
            ->where('scheduled_for', '>', now());
    }

    public function scopeFailed($query)
    {
        return $query->where('status', 'failed');
    }

    public function scopeForOrganization($query, $organizationId)
    {
        return $query->where('organization_id', $organizationId);
    }
}
