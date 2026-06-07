<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UnityCallParticipant extends Model
{
    public const ROLE_CALLER = 'caller';

    public const ROLE_CALLEE = 'callee';

    public const STATUS_RINGING = 'ringing';

    public const STATUS_ACCEPTED = 'accepted';

    public const STATUS_DECLINED = 'declined';

    public const STATUS_MISSED = 'missed';

    public const STATUS_LEFT = 'left';

    protected $fillable = [
        'unity_call_id',
        'user_id',
        'role',
        'status',
    ];

    public function call(): BelongsTo
    {
        return $this->belongsTo(UnityCall::class, 'unity_call_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
