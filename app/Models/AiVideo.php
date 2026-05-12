<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiVideo extends Model
{
    public const STATUS_PENDING_PROMPT = 'pending_prompt';

    public const STATUS_GENERATING = 'generating';

    public const STATUS_VIDEO_GENERATED = 'video_generated';

    public const STATUS_UPLOADING_TO_DROPBOX = 'uploading_to_dropbox';

    public const STATUS_READY_FOR_REVIEW = 'ready_for_review';

    public const STATUS_APPROVED = 'approved';

    public const STATUS_PUBLISHED = 'published';

    public const STATUS_FAILED = 'failed';

    protected $fillable = [
        'organization_id',
        'user_id',
        'title',
        'prompt',
        'fal_prompt',
        'ai_script',
        'caption',
        'hashtags',
        'template_key',
        'template_inputs',
        'fal_provider',
        'fal_model',
        'fal_job_id',
        'video_source_url',
        'duration_seconds',
        'resolution',
        'orientation',
        'dropbox_path',
        'dropbox_shared_link',
        'youtube_video_id',
        'instagram_post_id',
        'tiktok_post_id',
        'status',
        'generation_cost',
        'approved_at',
        'published_at',
        'failure_message',
        'media_studio_credits_charged',
        'media_studio_credits_refunded_at',
    ];

    protected function casts(): array
    {
        return [
            'hashtags' => 'array',
            'template_inputs' => 'array',
            'generation_cost' => 'decimal:4',
            'approved_at' => 'datetime',
            'published_at' => 'datetime',
            'media_studio_credits_refunded_at' => 'datetime',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
