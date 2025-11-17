<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FractionalHolding extends Model
{
    use HasFactory;
    
    protected $fillable = [
        'user_id',
        'offering_id',
        'shares',
        'avg_cost_per_share',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function offering(): BelongsTo
    {
        return $this->belongsTo(FractionalOffering::class, 'offering_id');
    }
}



