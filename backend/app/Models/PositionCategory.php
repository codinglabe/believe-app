<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PositionCategory extends Model
{
    protected $fillable = ['name', 'description'];

    /**
     * Get the job positions associated with this category.
     */
    public function jobPositions()
    {
        return $this->hasMany(JobPosition::class, 'category_id');
    }
}
