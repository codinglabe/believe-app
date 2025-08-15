<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class ChatTopic extends Model
{
    protected $fillable = [
        'name',
        'description',
        'is_active'
    ];

    protected $casts = [
        'is_active' => 'boolean'
    ];

    public function chatRooms(): BelongsToMany
    {
        // Changed from 'chat_topics' to 'chat_room_topics' to match your migration
        return $this->belongsToMany(ChatRoom::class, 'chat_room_topics', 'topic_id', 'chat_room_id')
            ->withTimestamps();
    }

    public function users(): BelongsToMany
    {
        // Changed to match your 'user_interested_topics' table
        return $this->belongsToMany(User::class, 'user_interested_topics', 'topic_id', 'user_id')
            ->withTimestamps();
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    // Helper method to check if topic can be deleted
    public function canBeDeleted(): bool
    {
        return !$this->chatRooms()->exists() && !$this->users()->exists();
    }
}
