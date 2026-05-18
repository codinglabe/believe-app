<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiChatMessage extends Model
{
    protected $fillable = [
        'conversation_id',
        'role',
        'content',
    ];

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(AiChatConversation::class, 'conversation_id');
    }
}
