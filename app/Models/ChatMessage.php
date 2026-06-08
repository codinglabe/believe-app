<?php
// app/Models/ChatMessage.php
namespace App\Models;

use App\Casts\UtcDatetime;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ChatMessage extends Model
{
    use HasFactory;

    public const TYPE_TEXT = 'text';

    public const TYPE_UNITY_CALL = 'unity_call';

    protected $fillable = [
        'chat_room_id',
        'user_id',
        'message',
        'message_type',
        'attachments',
        'metadata',
        'reply_to_message_id',
        'is_edited',
        'edited_at'
    ];

    protected $casts = [
        'attachments' => 'array',
        'metadata' => 'array',
        'is_edited' => 'boolean',
        'created_at' => UtcDatetime::class,
        'updated_at' => UtcDatetime::class,
        'edited_at' => UtcDatetime::class,
    ];

  /**
   * Always persist model timestamps in UTC regardless of request timezone.
   */
    public function freshTimestamp()
    {
        return Carbon::now('UTC');
    }

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
