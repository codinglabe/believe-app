<?php

namespace App\Observers;

use App\Models\NodeReferral;
use App\Models\NodeSell;
use Illuminate\Support\Facades\Auth;

class NodeSellObserver
{
    /**
     * Handle the NodeSell "created" event.
     */
    public function created(NodeSell $nodeSell): void
    {
        // Optionally check if a referral already exists for this node_boss_id and user
        $userId = Auth::id();

        if (!$userId) {
            return; // prevent creating if unauthenticated
        }

        $exists = NodeReferral::where('user_id', $userId)
            ->where('node_boss_id', $nodeSell->node_boss_id)
            ->exists();

        if (!$exists) {
            NodeReferral::create([
                'node_boss_id' => $nodeSell->node_boss_id,
                'node_share_id'=> $nodeSell->node_share_id,
                'node_sell_id' => $nodeSell->id,
                'status' => 'inactive',
            ]);
        }
    }

    /**
     * Handle the NodeSell "updated" event.
     */
    public function updated(NodeSell $nodeSell): void
    {
        //
    }

    /**
     * Handle the NodeSell "deleted" event.
     */
    public function deleted(NodeSell $nodeSell): void
    {
        //
    }

    /**
     * Handle the NodeSell "restored" event.
     */
    public function restored(NodeSell $nodeSell): void
    {
        //
    }

    /**
     * Handle the NodeSell "force deleted" event.
     */
    public function forceDeleted(NodeSell $nodeSell): void
    {
        //
    }
}
