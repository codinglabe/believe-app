<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FractionalAsset extends Model
{
    use HasFactory;

    protected $fillable = [
        'type',
        'name',
        'symbol',
        'description',
        'media',
        'meta',
    ];

    protected $casts = [
        'media' => 'array',
        'meta' => 'array',
    ];

    public function offerings(): HasMany
    {
        return $this->hasMany(FractionalOffering::class, 'asset_id');
    }
}


