<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class PrimaryActionCategory extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function organizations(): BelongsToMany
    {
        return $this->belongsToMany(Organization::class, 'org_primary_action_category')
            ->withTimestamps();
    }

    /** Supporters who selected this interest on their profile */
    public function supporterUsers(): BelongsToMany
    {
        return $this->belongsToMany(
            User::class,
            'primary_action_category_user',
            'primary_action_category_id',
            'user_id'
        )->withTimestamps();
    }
}
