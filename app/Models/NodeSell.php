<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

class NodeSell extends Model
{
    protected $fillable = [
        "user_id",
        "node_boss_id",
        "node_share_id",
        "node_referral_id",
        "amount",
        "buyer_name",
        "buyer_email",
        "message",
        "status",
        "payment_method",
        "transaction_id",
        "certificate_id",
        "purchase_date"
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'purchase_date' => 'datetime',
    ];

    // Status constants
    const STATUS_PENDING = 'pending';
    const STATUS_COMPLETED = 'completed';
    const STATUS_FAILED = 'failed';
    const STATUS_CANCELED = 'canceled';

    public static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (!$model->user_id) {
                $model->user_id = Auth::id();
            }
        });
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function nodeShare()
    {
        return $this->belongsTo(NodeShare::class, 'node_share_id');
    }

    public function nodeBoss()
    {
        return $this->belongsTo(NodeBoss::class, 'node_boss_id');
    }

    // Scope for completed purchases
    public function scopeCompleted($query)
    {
        return $query->where('status', self::STATUS_COMPLETED);
    }

    // Scope for pending purchases
    public function scopePending($query)
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    public function nodeReferral()
    {
        return $this->belongsTo(NodeReferral::class, 'node_referral_id');
    }
}
