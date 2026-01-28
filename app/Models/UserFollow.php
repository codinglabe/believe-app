<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserFollow extends Model
{
    protected $table = 'user_follows';

    protected $fillable = [
        'follower_id',
        'following_id',
    ];

    protected $casts = [
        'follower_id' => 'integer',
        'following_id' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function follower()
    {
        return $this->belongsTo(User::class, 'follower_id');
    }

    public function following()
    {
        return $this->belongsTo(User::class, 'following_id');
    }
}
