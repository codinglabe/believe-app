<?php

namespace App\Http\Controllers;

use App\Models\NodeShare;
use App\Models\NodeBoss;
use App\Models\NodeSell;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class NodeShareController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        // Get user's NodeBoss share purchases with search and status filtering
        $query = NodeSell::with(['nodeBoss:id,name,image', 'nodeShare:id,node_id'])
            ->where('user_id', $user->id)
            ->select('id', 'node_boss_id', 'node_share_id', 'amount', 'status', 'buyer_name', 'buyer_email', 'message', 'certificate_id', 'purchase_date', 'created_at');

        // Apply search filter
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('certificate_id', 'like', '%' . $search . '%')
                    ->orWhere('amount', 'like', '%' . $search . '%')
                    ->orWhere('message', 'like', '%' . $search . '%')
                    ->orWhereHas('nodeBoss', function ($q) use ($search) {
                        $q->where('name', 'like', '%' . $search . '%');
                    })
                    ->orWhereHas('nodeShare', function ($q) use ($search) {
                        $q->where('node_id', 'like', '%' . $search . '%');
                    });
            });
        }

        // Apply status filter
        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        $userShares = $query->orderBy('created_at', 'desc')->paginate(5);

        // Calculate share statistics
        $shareStats = [
            'total_invested' => NodeSell::where('user_id', $user->id)
                ->where('status', 'completed')
                ->sum('amount'),
            'total_shares' => NodeSell::where('user_id', $user->id)->count(),
            'completed_shares' => NodeSell::where('user_id', $user->id)
                ->where('status', 'completed')
                ->count(),
            'pending_shares' => NodeSell::where('user_id', $user->id)
                ->where('status', 'pending')
                ->count(),
        ];

        // Transform the data for frontend
        $userShares->getCollection()->transform(function ($share) {
            return [
                'id' => $share->id,
                'node_boss_name' => $share->nodeBoss->name ?? 'Unknown Project',
                'node_boss_image' => $share->nodeBoss->image ?? null,
                'node_id' => $share->nodeShare->node_id ?? 'N/A',
                'amount' => $share->amount,
                'status' => $share->status,
                'purchase_date' => $share->purchase_date ?? $share->created_at,
                'certificate_id' => $share->certificate_id,
                'message' => $share->message,
            ];
        });

        return Inertia::render('frontend/user-profile/node-boss', [
            'userShares' => $userShares,
            'shareStats' => $shareStats,
            'filters' => [
                'search' => $request->input('search', ''),
                'status' => $request->input('status', ''),
            ]
        ]);
    }

    public function show(NodeShare $nodeShare)
    {
        $nodeShare->load('nodeBoss', 'nodeSells.user');
        return Inertia::render('admin/node-shares/Show', compact('nodeShare'));
    }

    public function edit(NodeShare $nodeShare)
    {
        $nodeShare->load('nodeBoss');
        $nodeBosses = NodeBoss::all();
        return Inertia::render('admin/node-shares/Edit', compact('nodeShare', 'nodeBosses'));
    }

    public function update(Request $request, NodeShare $nodeShare)
    {
        $validated = $request->validate([
            'cost' => 'required|numeric|min:0',
            'sold' => 'required|numeric|min:0',
            'remaining' => 'required|numeric|min:0',
            'status' => 'required|in:open,closed',
        ]);

        $nodeShare->update($validated);

        return redirect()->back()->with('success', 'Share updated successfully.');
    }

    public function destroy(NodeShare $nodeShare)
    {
        $nodeShare->delete();
        return redirect()->back()->with('success', 'Share delete successfully.');
    }
}
