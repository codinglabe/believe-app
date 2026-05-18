<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ServiceChatMessage extends Model
{
    protected $fillable = [
        'service_chat_id',
        'user_id',
        'message',
        'attachments',
        'is_read',
    ];

    protected $casts = [
        'attachments' => 'array',
        'is_read' => 'boolean',
    ];

    public function serviceChat(): BelongsTo
    {
        return $this->belongsTo(ServiceChat::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
