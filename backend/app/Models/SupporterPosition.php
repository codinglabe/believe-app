<?php
// app/Models/FollowerPosition.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SupporterPosition extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'category',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function userPositions()
    {
        return $this->hasMany(SupporterUserPosition::class);
    }

    public function users()
    {
        return $this->belongsToMany(User::class, 'supporter_user_positions', 'follower_position_id', 'user_id');
    }
}
