<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserPushToken extends Model
{
    protected $table = 'user_push_tokens';

    protected $fillable = [
        'user_id',
        'push_token',
        'device_id',
        'device_type',
        'device_name',
        'browser',
        'platform',
        'is_active',
        'last_used_at',
    ];
}
