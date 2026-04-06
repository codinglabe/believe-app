<?php
// app/Models/FollowingUserPosition.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SupporterUserPosition extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'follower_position_id',
        'experience_level',
        'years_of_experience',
        'is_primary',
        'skills',
        'portfolio_url',
        'is_verified',
    ];

    protected $casts = [
        'is_primary' => 'boolean',
        'is_verified' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function followerPosition()
    {
        return $this->belongsTo(FollowerPosition::class);
    }
}
