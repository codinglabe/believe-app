<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JobPosition extends Model
{
    protected $fillable = [
        'category_id',
        'title',
        'default_description',
        'default_requirements',
    ];

    public function category()
    {
        return $this->belongsTo(PositionCategory::class, 'category_id');
    }

    public function jobPosts()
    {
        return $this->hasMany(JobPost::class, 'position_id');
    }
}
