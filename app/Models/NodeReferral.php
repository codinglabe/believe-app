<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;

class NodeReferral extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'node_boss_id',
        'node_share_id',
        'node_sell_id',
        'referral_link',
        'parchentage', // Keeping as 'parchentage' as per your model, but 'percentage' is recommended
        'status',
    ];

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            if (!$model->user_id && Auth::check()) {
                $model->user_id = Auth::id();
            }
            // Get node boss name
            $nodeBoss = NodeBoss::find($model->node_boss_id);
            $label = $nodeBoss?->name ?? 'node-referral';
            // Generate a clean referral link
            $model->referral_link = static::generateUniqueReferralLink($label);
        });
    }

    protected static function generateUniqueReferralLink($label)
    {
        $base = Str::slug($label);
        do {
            $suffix = Str::lower(Str::random(4)); // Short unique suffix
            $link = "{$base}-{$suffix}";
        } while (static::where('referral_link', $link)->exists());
        return $link;
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function nodeBoss()
    {
        return $this->belongsTo(NodeBoss::class);
    }

    /**
     * A referral link can have many sales (NodeSell records).
     */
    public function nodeSells() // Changed from nodeSell() to nodeSells() and hasOne to hasMany
    {
        return $this->hasMany(NodeSell::class, 'node_referral_id');
    }

    /**
     * Get the total commission earned for this referral from all associated sales.
     *
     * @return float
     */
    public function getCommissionEarnedAttribute(): float
    {
        // Sum the commission from all associated nodeSells
        return $this->nodeSells->sum(function ($nodeSell) {
            if ($nodeSell->amount && $this->parchentage !== null) {
                return ($nodeSell->amount * $this->parchentage) / 100;
            }
            return 0.00;
        });
    }

    /**
     * Get the total amount invested through this referral link.
     *
     * @return float
     */
    public function getTotalAmountInvestedAttribute(): float
    {
        return $this->nodeSells->sum('amount');
    }
}
