<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SmsPackage extends Model
{
    protected $fillable = [
        'name',
        'description',
        'sms_count',
        'price',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'sms_count' => 'integer',
        'price' => 'decimal:2',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order')->orderBy('price');
    }
}
