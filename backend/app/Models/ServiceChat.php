<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ServiceChat extends Model
{
    protected $fillable = [
        'buyer_id',
        'seller_id',
        'last_message_at',
        'buyer_read',
        'seller_read',
    ];

    protected $casts = [
        'last_message_at' => 'datetime',
        'buyer_read' => 'boolean',
        'seller_read' => 'boolean',
    ];

    public function buyer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'buyer_id');
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(ServiceChatMessage::class)->orderBy('created_at', 'asc');
    }

    public function latestMessage(): HasMany
    {
        return $this->hasMany(ServiceChatMessage::class)->latest();
    }

    public function unreadCountForUser(int $userId): int
    {
        $isBuyer = $this->buyer_id === $userId;
        $readField = $isBuyer ? 'buyer_read' : 'seller_read';

        if ($this->$readField) {
            return 0;
        }

        return $this->messages()
            ->where('user_id', '!=', $userId)
            ->where('created_at', '>', $this->updated_at)
            ->count();
    }
}
