<?php
// app/Models/ChatMessage.php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ChatMessage extends Model
{
    use HasFactory;

    protected $fillable = [
        'chat_room_id',
        'user_id',
        'message',
        'attachments',
        'reply_to_message_id',
        'is_edited',
        'edited_at'
    ];

    protected $casts = [
        'attachments' => 'array',
        'is_edited' => 'boolean',
        'edited_at' => 'datetime',
    ];

    public function chatRoom(): BelongsTo
    {
        return $this->belongsTo(ChatRoom::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function replyToMessage(): BelongsTo
    {
        return $this->belongsTo(ChatMessage::class, 'reply_to_message_id');
    }

    public function replies(): HasMany
    {
        return $this->hasMany(ChatMessage::class, 'reply_to_message_id');
    }

    public function reads()
    {
        return $this->belongsToMany(User::class, 'chat_message_reads', 'message_id', 'user_id')
            ->withTimestamps();
    }
}
