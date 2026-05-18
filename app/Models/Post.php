<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Post extends Model
{
    public const POST_TYPE_STANDARD = 'standard';

    public const POST_TYPE_YOUTUBE_SHORT = 'youtube_short';

    public const POST_TYPE_YOUTUBE_VIDEO = 'youtube_video';

    protected $fillable = [
        'user_id',
        'post_type',
        'content',
        'images',
        'youtube_url',
        'youtube_video_id',
        'thumbnail_url',
        'caption',
        'organization_id',
        'campaign_id',
        'fundme_id',
        'community_video_id',
        'visibility',
        'is_edited',
    ];

    protected $casts = [
        'images' => 'array',
        'is_edited' => 'boolean',
    ];

    /**
     * @var list<string>
     */
    protected $hidden = [
        'attachedOrganization',
        'attachedCampaign',
        'attachedFundMe',
    ];

    public function attachedOrganization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    public function attachedCampaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class, 'campaign_id');
    }

    public function attachedFundMe(): BelongsTo
    {
        return $this->belongsTo(FundMeCampaign::class, 'fundme_id');
    }

    public function communityVideo(): BelongsTo
    {
        return $this->belongsTo(CommunityVideo::class, 'community_video_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reactions(): HasMany
    {
        return $this->hasMany(PostReaction::class);
    }

    public function comments(): HasMany
    {
        return $this->hasMany(PostComment::class)->latest();
    }

    public function getReactionsCountAttribute(): int
    {
        return $this->reactions()->count();
    }

    public function getCommentsCountAttribute(): int
    {
        return $this->comments()->count();
    }
}
