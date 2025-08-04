<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Topic extends Model
{
    use HasFactory;

    protected $fillable = ['name','status'];

    /**
     * Get the courses associated with the topic.
     */
    public function courses(): HasMany
    {
        return $this->hasMany(Course::class);
    }
}
