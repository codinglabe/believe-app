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
        'parent_referral_id',
        'referral_link',
        'parchentage',
        'status',
        'is_big_boss',
        'level',
    ];

    protected $casts = [
        'parchentage' => 'decimal:2',
        'is_big_boss' => 'boolean',
        'level' => 'integer',
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
            
            // Generate a clean referral link if not provided
            if (!$model->referral_link) {
                $model->referral_link = static::generateUniqueReferralLink($label);
            }
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

    public function nodeShare()
    {
        return $this->belongsTo(NodeShare::class);
    }

    public function nodeSell()
    {
        return $this->belongsTo(NodeSell::class);
    }

    // Parent referral (Big Boss)
    public function parentReferral()
    {
        return $this->belongsTo(NodeReferral::class, 'parent_referral_id');
    }

    // Child referrals (users referred by this referral)
    public function childReferrals()
    {
        return $this->hasMany(NodeReferral::class, 'parent_referral_id');
    }

    /**
     * A referral link can have many sales (NodeSell records).
     */
    public function nodeSells()
    {
        return $this->hasMany(NodeSell::class, 'node_referral_id');
    }

    /**
     * Get the total commission earned for this referral from all associated sales.
     */
    public function getCommissionEarnedAttribute(): float
    {
        return $this->nodeSells->sum(function ($nodeSell) {
            if ($nodeSell->amount && $this->parchentage !== null) {
                return ($nodeSell->amount * $this->parchentage) / 100;
            }
            return 0.00;
        });
    }

    /**
     * Get the total amount invested through this referral link.
     */
    public function getTotalAmountInvestedAttribute(): float
    {
        return $this->nodeSells->sum('amount');
    }

    /**
     * Get all users referred by this referral link
     */
    public function getReferredUsersAttribute()
    {
        return $this->nodeSells->map(function ($nodeSell) {
            return $nodeSell->user;
        })->unique('id');
    }

    /**
     * Scope for Big Boss referrals
     */
    public function scopeBigBoss($query)
    {
        return $query->where('is_big_boss', true);
    }

    /**
     * Scope for active referrals
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope for level 1 referrals (direct Big Boss referrals)
     */
    public function scopeLevel1($query)
    {
        return $query->where('level', 1);
    }

    /**
     * Scope for level 2 referrals (referred by other users)
     */
    public function scopeLevel2($query)
    {
        return $query->where('level', 2);
    }
}
