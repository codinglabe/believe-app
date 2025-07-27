<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
use App\Models\NodeBoss;

class NodeReferral extends Model
{
    protected $fillable = [
        'user_id',
        'node_boss_id',
        'node_share_id',
        'node_sell_id',
        'referral_link',
        'parchentage',
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
}
