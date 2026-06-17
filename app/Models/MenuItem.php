<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MenuItem extends Model
{
    protected $fillable = [
        'menu_key',
        'title',
        'category',
        'route_name',
        'href',
        'icon',
        'active_path_prefix',
        'default_enabled',
        'supporter_visible',
        'org_visible',
        'admin_visible',
        'requires_auth',
        'bottom_nav_eligible',
        'sort_order',
        'is_active',
        'interest_tags',
    ];

    protected function casts(): array
    {
        return [
            'default_enabled' => 'boolean',
            'supporter_visible' => 'boolean',
            'org_visible' => 'boolean',
            'admin_visible' => 'boolean',
            'requires_auth' => 'boolean',
            'bottom_nav_eligible' => 'boolean',
            'is_active' => 'boolean',
            'interest_tags' => 'array',
        ];
    }

    public function userFavorites(): HasMany
    {
        return $this->hasMany(UserFavoriteMenu::class, 'menu_key', 'menu_key');
    }
}
