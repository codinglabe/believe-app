<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GigImage extends Model
{
    protected $fillable = [
        'gig_id',
        'image_path',
        'sort_order',
        'is_primary',
    ];

    protected $casts = [
        'is_primary' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function gig(): BelongsTo
    {
        return $this->belongsTo(Gig::class, 'gig_id');
    }
}
