<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChatRoomTopic extends Model
{
    protected $fillable = [
        'chat_room_id',
        'topic_id',
    ];

    public function chatRoom()
    {
        return $this->belongsTo(ChatRoom::class);
    }

    public function topic()
    {
        return $this->belongsTo(ChatTopic::class);
    }
}
