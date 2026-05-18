<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NodeShare extends Model
{
    protected $fillable = [
        'node_boss_id',
        'node_id',
        'cost',
        'sold',
        'remaining',
        'status'
    ];

    protected $casts = [
        'cost' => 'decimal:2',
        'sold' => 'decimal:2',
        'remaining' => 'decimal:2'
    ];

    const DEFAULT_SHARE_AMOUNT = 2000;


    public static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            do {
                $prefix = 'NB-' . mt_rand(100000, 999999);
            } while (self::where('node_id', $prefix)->exists());

            $model->node_id = $prefix;
        });
    }
    public function nodeBoss()
    {
        return $this->belongsTo(NodeBoss::class, 'node_boss_id');
    }
}
