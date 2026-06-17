<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserFavoriteMenu extends Model
{
    public const PLACEMENT_QUICK = 'quick';

    public const PLACEMENT_BOTTOM_NAV = 'bottom_nav';

    protected $fillable = [
        'user_id',
        'menu_key',
        'sort_order',
        'is_active',
        'placement',
        'bottom_nav_slot',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function menuItem(): BelongsTo
    {
        return $this->belongsTo(MenuItem::class, 'menu_key', 'menu_key');
    }
}
