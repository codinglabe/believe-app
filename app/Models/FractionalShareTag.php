<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FractionalShareTag extends Model
{
    use HasFactory;

    protected $fillable = [
        'offering_id',
        'tag_number',
        'tokens_filled',
        'tokens_per_share',
        'is_complete',
    ];

    protected $casts = [
        'is_complete' => 'boolean',
    ];

    public function offering(): BelongsTo
    {
        return $this->belongsTo(FractionalOffering::class, 'offering_id');
    }

    public function orders(): HasMany
    {
        return $this->hasMany(FractionalOrder::class, 'tag_number', 'tag_number');
    }
}
