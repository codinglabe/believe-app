<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KioskSubcategory extends Model
{
    protected $table = 'kiosk_subcategories';

    protected $fillable = [
        'category_slug',
        'name',
        'sort_order',
    ];

    protected $casts = [
        'sort_order' => 'integer',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(KioskCategory::class, 'category_slug', 'slug');
    }
}
