<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GigPackage extends Model
{
    protected $fillable = [
        'gig_id',
        'name',
        'description',
        'price',
        'delivery_time',
        'features',
        'is_popular',
        'sort_order',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'features' => 'array',
        'is_popular' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function gig(): BelongsTo
    {
        return $this->belongsTo(Gig::class, 'gig_id');
    }
}
