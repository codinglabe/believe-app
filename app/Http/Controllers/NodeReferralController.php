<?php

namespace App\Http\Controllers;

use App\Models\NodeReferral;
use App\Models\NodeBoss;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;

class NodeReferralController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $filters = $request->only(['referrals_search', 'referrals_status']);

        $query = NodeReferral::query()
            ->with(['user', 'nodeBoss', 'nodeSells']); // Eager load nodeSells (plural)

        // Apply search filter
        if ($filters['referrals_search'] ?? false) {
            $search = $filters['referrals_search'];
            $query->where(function ($q) use ($search) {
                $q->where('referral_link', 'like', '%' . $search . '%')
                  ->orWhereHas('user', function ($userQuery) use ($search) {
                      $userQuery->where('name', 'like', '%' . $search . '%')
                                ->orWhere('email', 'like', '%' . $search . '%');
                  })
                  ->orWhereHas('nodeBoss', function ($nodeBossQuery) use ($search) {
                      $nodeBossQuery->where('name', 'like', '%' . $search . '%');
                  })
                  ->orWhereHas('nodeSells', function ($nodeSellQuery) use ($search) { // Changed to nodeSells
                      $nodeSellQuery->where('buyer_name', 'like', '%' . $search . '%')
                                    ->orWhere('buyer_email', 'like', '%' . $search . '%')
                                    ->orWhere('amount', 'like', '%' . $search . '%')
                                    ->orWhere('status', 'like', '%' . $search . '%');
                  });
            });
        }

        // Apply status filter (from NodeSell status)
        if ($filters['referrals_status'] ?? false) {
            $status = $filters['referrals_status'];
            if ($status === 'pending') {
                // If status is pending, include referrals with no nodeSells or nodeSells with pending status
                $query->where(function ($q) {
                    $q->whereDoesntHave('nodeSells') // No associated sales
                      ->orWhereHas('nodeSells', function ($nodeSellQuery) {
                          $nodeSellQuery->where('status', 'pending');
                      });
                });
            } else {
                $query->whereHas('nodeSells', function ($nodeSellQuery) use ($status) { // Changed to nodeSells
                    $nodeSellQuery->where('status', $status);
                });
            }
        }

        $referrals = $query->paginate(10)->through(function ($referral) {
            // Determine overall status based on associated sales
            $overallStatus = 'pending'; // Default if no sales
            if ($referral->nodeSells->isNotEmpty()) {
                // If any sale is completed, consider it completed
                if ($referral->nodeSells->contains('status', 'completed')) {
                    $overallStatus = 'completed';
                } elseif ($referral->nodeSells->contains('status', 'failed')) {
                    $overallStatus = 'failed';
                } elseif ($referral->nodeSells->contains('status', 'canceled')) {
                    $overallStatus = 'canceled';
                } else {
                    $overallStatus = 'pending'; // All sales are pending or other non-completed status
                }
            }

            return [
                'id' => $referral->id,
                'referrer_name' => $referral->user->name ?? 'N/A',
                'node_boss_name' => $referral->nodeBoss->name ?? 'N/A',
                'referral_link_used' => $referral->referral_link,
                'total_amount_invested' => $referral->total_amount_invested, // Use accessor
                'total_commission_earned' => $referral->commission_earned, // Use accessor
                'status' => $overallStatus, // Overall status
                'created_at' => $referral->created_at->toDateTimeString(),
                'buyers' => $referral->nodeSells->map(function ($nodeSell) use ($referral) {
                    return [
                        'id' => $nodeSell->id,
                        'name' => $nodeSell->buyer_name ?? 'N/A',
                        'email' => $nodeSell->buyer_email ?? 'N/A',
                        'amount_invested' => $nodeSell->amount,
                        'commission_earned' => ($nodeSell->amount * $referral->parchentage) / 100,
                        'status' => $nodeSell->status,
                        'sold_at' => $nodeSell->sold_at ?? $nodeSell->created_at->toDateTimeString(),
                    ];
                })->toArray(),
            ];
        });

        return Inertia::render("admin/referral/index", [
            'referrals' => $referrals,
            'filters' => $filters,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $nodeBosses = NodeBoss::all(['id', 'name']);
        return Inertia::render("admin/referral/create", [
            'nodeBosses' => $nodeBosses,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'node_boss_id' => ['required', 'exists:node_bosses,id'],
            'parchentage' => ['required', 'numeric', 'min:0', 'max:100'],
        ]);

        NodeReferral::create([
            'user_id' => Auth::id(),
            'node_boss_id' => $request->node_boss_id,
            'parchentage' => $request->parchentage,
            'status' => 'active',
        ]);

        return redirect()->route('node-referral.index')->with('success', 'Node Referral link created successfully.');
    }

    /**
     * Display the specified resource.
     */
    public function show(NodeReferral $nodeReferral)
    {
        $nodeReferral->load(['user', 'nodeBoss', 'nodeSells']); // Load nodeSells (plural)

        // Determine overall status based on associated sales
        $overallStatus = 'pending'; // Default if no sales
        if ($nodeReferral->nodeSells->isNotEmpty()) {
            if ($nodeReferral->nodeSells->contains('status', 'completed')) {
                $overallStatus = 'completed';
            } elseif ($nodeReferral->nodeSells->contains('status', 'failed')) {
                $overallStatus = 'failed';
            } elseif ($nodeReferral->nodeSells->contains('status', 'canceled')) {
                $overallStatus = 'canceled';
            } else {
                $overallStatus = 'pending';
            }
        }

        return Inertia::render("admin/referral/show", [
            'referral' => [
                'id' => $nodeReferral->id,
                'referrer_name' => $nodeReferral->user->name ?? 'N/A',
                'node_boss_name' => $nodeReferral->nodeBoss->name ?? 'N/A',
                'referral_link_used' => route("nodeboss.index",["ref"=>$nodeReferral->referral_link]),
                'total_amount_invested' => $nodeReferral->total_amount_invested, // Use accessor
                'total_commission_earned' => $nodeReferral->commission_earned, // Use accessor
                'status' => $overallStatus, // Overall status
                'created_at' => $nodeReferral->created_at->toDateTimeString(),
                'buyers' => $nodeReferral->nodeSells->map(function ($nodeSell) use ($nodeReferral) {
                    return [
                        'id' => $nodeSell->id,
                        'name' => $nodeSell->buyer_name ?? 'N/A',
                        'email' => $nodeSell->buyer_email ?? 'N/A',
                        'amount_invested' => $nodeSell->amount,
                        'commission_earned' => ($nodeSell->amount * $nodeReferral->parchentage) / 100,
                        'status' => $nodeSell->status,
                        'sold_at' => $nodeSell->sold_at ?? $nodeSell->created_at->toDateTimeString(),
                    ];
                })->toArray(),
            ],
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(NodeReferral $nodeReferral)
    {
        $nodeBosses = NodeBoss::all(['id', 'name']);
        return Inertia::render("admin/referral/edit", [
            'referral' => $nodeReferral,
            'nodeBosses' => $nodeBosses,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, NodeReferral $nodeReferral)
    {
        $request->validate([
            'node_boss_id' => ['required', 'exists:node_bosses,id'],
            'parchentage' => ['required', 'numeric', 'min:0', 'max:100'],
            'status' => ['required', 'string', 'in:active,inactive'],
        ]);

        $nodeReferral->update($request->only(['node_boss_id', 'parchentage', 'status']));

        return redirect()->route('node-referral.index')->with('success', 'Node Referral link updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(NodeReferral $nodeReferral)
    {
        $nodeReferral->delete();
        return redirect()->route('node-referral.index')->with('success', 'Node Referral link deleted successfully.');
    }
}
