<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class InterestCategory extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'description',
        'icon',
        'color',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function organizations(): BelongsToMany
    {
        return $this->belongsToMany(Organization::class, 'interest_category_organization')
            ->withTimestamps();
    }

    public function events(): BelongsToMany
    {
        return $this->belongsToMany(Event::class, 'event_interest_category')
            ->withTimestamps();
    }

    public function courses(): BelongsToMany
    {
        return $this->belongsToMany(Course::class, 'course_interest_category')
            ->withTimestamps();
    }

    public function jobPosts(): BelongsToMany
    {
        return $this->belongsToMany(JobPost::class, 'interest_category_job_post')
            ->withTimestamps();
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'interest_category_user')
            ->withTimestamps();
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true)->orderBy('sort_order');
    }
}
