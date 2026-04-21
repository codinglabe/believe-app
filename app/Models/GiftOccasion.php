<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GiftOccasion extends Model
{
    protected $fillable = [
        'occasion',
        'icon',
        'category',
    ];

    public function gifts(): HasMany
    {
        return $this->hasMany(SupporterBelievePointGift::class, 'gift_occasion_id');
    }
}
