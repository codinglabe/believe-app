<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChatRoom extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'type',
        'image',
        'created_by',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'chat_room_members')
            ->withPivot(['role', 'joined_at', 'last_seen_at'])
            ->withTimestamps();
    }

    public function messages(): HasMany
    {
        return $this->hasMany(ChatMessage::class);
    }

    public function latestMessage(): HasMany
    {
        return $this->hasMany(ChatMessage::class)->latest();
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function getUnreadCountAttribute(): int
    {
        $user = auth()->user();
        if (!$user)
            return 0;

        $lastSeen = $this->members()
            ->where('user_id', $user->id)
            ->first()
            ?->pivot
                ?->last_seen_at;

        if (!$lastSeen) {
            return $this->messages()->count();
        }

        return $this->messages()
            ->where('created_at', '>', $lastSeen)
            ->where('user_id', '!=', $user->id)
            ->count();
    }

    public function topics(): BelongsToMany
    {
        return $this->belongsToMany(ChatRoomTopic::class, 'chat_room_topic');
    }
}
