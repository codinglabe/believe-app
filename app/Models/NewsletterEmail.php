<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NewsletterEmail extends Model
{
    protected $fillable = [
        'newsletter_id',
        'newsletter_recipient_id',
        'email',
        'status',
        'sent_at',
        'delivered_at',
        'opened_at',
        'clicked_at',
        'bounced_at',
        'error_message',
        'message_id',
        'tracking_data',
        'metadata'
    ];

    protected $casts = [
        'sent_at' => 'datetime',
        'delivered_at' => 'datetime',
        'opened_at' => 'datetime',
        'clicked_at' => 'datetime',
        'bounced_at' => 'datetime',
        'tracking_data' => 'array',
        'metadata' => 'array'
    ];

    public function newsletter(): BelongsTo
    {
        return $this->belongsTo(Newsletter::class);
    }

    public function recipient(): BelongsTo
    {
        return $this->belongsTo(NewsletterRecipient::class);
    }

    public function scopeSent($query)
    {
        return $query->where('status', 'sent');
    }

    public function scopeDelivered($query)
    {
        return $query->where('status', 'delivered');
    }

    public function scopeOpened($query)
    {
        return $query->where('status', 'opened');
    }

    public function scopeClicked($query)
    {
        return $query->where('status', 'clicked');
    }

    public function scopeBounced($query)
    {
        return $query->where('status', 'bounced');
    }
}