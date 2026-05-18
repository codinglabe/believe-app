<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ScheduledDrop extends Model
{
    use HasFactory;

    protected $fillable = [
        'campaign_id',
        'content_item_id',
        'publish_at_utc',
        'status'
    ];

    protected $casts = [
        'publish_at_utc' => 'datetime',
    ];

    public function campaign()
    {
        return $this->belongsTo(Campaign::class);
    }

    public function contentItem()
    {
        return $this->belongsTo(ContentItem::class);
    }

    public function sendJobs()
    {
        return $this->hasMany(SendJob::class);
    }

    // Scopes
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeDue($query)
    {
        return $query->where('publish_at_utc', '<=', now());
    }
}
