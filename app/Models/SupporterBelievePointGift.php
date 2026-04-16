<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupporterBelievePointGift extends Model
{
    protected $fillable = [
        'sender_id',
        'recipient_id',
        'amount',
        'occasion',
        'message',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
    ];

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function recipient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recipient_id');
    }
}
