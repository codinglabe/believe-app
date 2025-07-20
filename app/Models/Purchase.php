<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Purchase extends Model
{
    protected $fillable = [
        'user_id',
        'organization_id',
        'purchase_order_id',
        'amount',
        'status',
        'transaction_id',
        'created_by',
        'model_relationship'
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'status' => 'string',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function nodeBoss()
    {
        return $this->belongsTo(NodeBoss::class , 'purchase_order_id');
    }
}
