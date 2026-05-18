<?php

namespace App\Http\Controllers;

use App\Models\NodeReferral;
use App\Models\NodeBoss;
use App\Models\User;
use App\Models\Transaction; // Import the Transaction model
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
        $filters = $request->only(['referrals_search', 'referrals_status', 'referrals_type']);
        
        $query = NodeReferral::query()
            ->with(['user', 'nodeBoss', 'nodeSells', 'parentReferral.user', 'childReferrals']);

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
                  ->orWhereHas('nodeSells', function ($nodeSellQuery) use ($search) {
                      $nodeSellQuery->where('buyer_name', 'like', '%' . $search . '%')
                                    ->orWhere('buyer_email', 'like', '%' . $search . '%')
                                    ->orWhere('amount', 'like', '%' . $search . '%')
                                    ->orWhere('certificate_id', 'like', '%' . $search . '%');
                  });
            });
        }

        // Apply status filter
        if ($filters['referrals_status'] ?? false) {
            $status = $filters['referrals_status'];
            if ($status === 'pending') {
                $query->where(function ($q) {
                    $q->whereDoesntHave('nodeSells')
                      ->orWhereHas('nodeSells', function ($nodeSellQuery) {
                          $nodeSellQuery->where('status', 'pending');
                      });
                });
            } else {
                $query->whereHas('nodeSells', function ($nodeSellQuery) use ($status) {
                    $nodeSellQuery->where('status', $status);
                });
            }
        }

        // Apply type filter (Big Boss or Regular)
        if ($filters['referrals_type'] ?? false) {
            $type = $filters['referrals_type'];
            if ($type === 'big_boss') {
                $query->where('is_big_boss', true);
            } elseif ($type === 'regular') {
                $query->where('is_big_boss', false);
            }
        }

        $referrals = $query->orderBy('created_at', 'desc')->paginate(10)->through(function ($referral) {
            // Determine overall status based on associated sales
            $overallStatus = 'pending';
            if ($referral->nodeSells->isNotEmpty()) {
                if ($referral->nodeSells->contains('status', 'completed')) {
                    $overallStatus = 'completed';
                } elseif ($referral->nodeSells->contains('status', 'failed')) {
                    $overallStatus = 'failed';
                } elseif ($referral->nodeSells->contains('status', 'canceled')) {
                    $overallStatus = 'canceled';
                } else {
                    $overallStatus = 'pending';
                }
            }

            return [
                'id' => $referral->id,
                'referrer_name' => $referral->user->name ?? 'N/A',
                'referrer_email' => $referral->user->email ?? 'N/A',
                'node_boss_name' => $referral->nodeBoss->name ?? 'N/A',
                'referral_link_used' => $referral->referral_link,
                'full_referral_url' => route('nodeboss.index', [
                    'nodeBoss' => $referral->node_boss_id, 
                    'ref' => $referral->referral_link
                ]),
                'total_amount_invested' => $referral->total_amount_invested,
                'total_commission_earned' => $referral->commission_earned,
                'commission_percentage' => $referral->parchentage,
                'is_big_boss' => $referral->is_big_boss,
                'level' => $referral->level,
                'parent_referrer' => $referral->parentReferral ? [
                    'id' => $referral->parentReferral->id,
                    'name' => $referral->parentReferral->user->name ?? 'N/A',
                    'is_big_boss' => $referral->parentReferral->is_big_boss,
                ] : null,
                'child_referrals_count' => $referral->childReferrals->count(),
                'total_sales_count' => $referral->nodeSells->count(),
                'completed_sales_count' => $referral->nodeSells->where('status', 'completed')->count(),
                'status' => $overallStatus,
                'referral_status' => $referral->status,
                'created_at' => $referral->created_at->toDateTimeString(),
                'updated_at' => $referral->updated_at->toDateTimeString(),
                'buyers' => $referral->nodeSells->map(function ($nodeSell) use ($referral) {
                    return [
                        'id' => $nodeSell->id,
                        'name' => $nodeSell->buyer_name ?? 'N/A',
                        'email' => $nodeSell->buyer_email ?? 'N/A',
                        'amount_invested' => $nodeSell->amount,
                        'commission_earned' => ($nodeSell->amount * $referral->parchentage) / 100,
                        'status' => $nodeSell->status,
                        'is_big_boss' => $nodeSell->is_big_boss,
                        'certificate_id' => $nodeSell->certificate_id,
                        'transaction_id' => $nodeSell->transaction_id,
                        'payment_method' => $nodeSell->payment_method,
                        'purchase_date' => $nodeSell->purchase_date?->toDateTimeString(),
                        'sold_at' => $nodeSell->purchase_date?->toDateTimeString() ?? $referral->created_at->toDateTimeString(),
                    ];
                })->toArray(),
                'total_user_commissions_earned' => $referral->user->transactions()->where('type', 'commission')->sum('amount'),
            ];
        });

        // Get summary statistics
        $totalReferrals = NodeReferral::count();
        $bigBossReferrals = NodeReferral::where('is_big_boss', true)->count();
        $activeReferrals = NodeReferral::where('status', 'active')->count();
        $totalCommissionsPaid = Transaction::where('type', 'commission')->sum('amount');

        return Inertia::render("admin/referral/index", [
            'referrals' => $referrals,
            'filters' => $filters,
            'statistics' => [
                'total_referrals' => $totalReferrals,
                'big_boss_referrals' => $bigBossReferrals,
                'regular_referrals' => $totalReferrals - $bigBossReferrals,
                'active_referrals' => $activeReferrals,
                'total_commissions_paid' => $totalCommissionsPaid,
            ],
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $nodeBosses = NodeBoss::all(['id', 'name', 'description']);
        $users = User::all(['id', 'name', 'email']);
        
        return Inertia::render("admin/referral/create", [
            'nodeBosses' => $nodeBosses,
            'users' => $users,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'user_id' => ['required', 'exists:users,id'],
            'node_boss_id' => ['required', 'exists:node_bosses,id'],
            'parchentage' => ['required', 'numeric', 'min:0', 'max:100'],
            'is_big_boss' => ['boolean'],
            'parent_referral_id' => ['nullable', 'exists:node_referrals,id'],
            'status' => ['required', 'string', 'in:active,inactive'],
        ]);

        // Check if referral already exists for this user and node boss
        $existingReferral = NodeReferral::where('user_id', $request->user_id)
            ->where('node_boss_id', $request->node_boss_id)
            ->first();

        if ($existingReferral) {
            return redirect()->back()->withErrors([
                'user_id' => 'A referral link already exists for this user and node boss combination.'
            ]);
        }

        // Determine level based on parent referral
        $level = 1;
        if ($request->parent_referral_id) {
            $parentReferral = NodeReferral::find($request->parent_referral_id);
            $level = $parentReferral ? $parentReferral->level + 1 : 2;
        }

        NodeReferral::create([
            'user_id' => $request->user_id,
            'node_boss_id' => $request->node_boss_id,
            'parent_referral_id' => $request->parent_referral_id,
            'parchentage' => $request->parchentage,
            'is_big_boss' => $request->boolean('is_big_boss'),
            'level' => $level,
            'status' => $request->status,
        ]);

        return redirect()->route('node-referral.index')->with('success', 'Node Referral link created successfully.');
    }

    /**
     * Display the specified resource.
     */
    public function show(NodeReferral $nodeReferral)
    {
        // Eager load necessary relationships for the current referral and its hierarchy
        $nodeReferral->load([
            'user.transactions', // Load user and their transactions
            'nodeBoss', 
            'nodeSells.user', 
            'parentReferral.user', 
            'childReferrals.user'
        ]);

        // Determine the root of the hierarchy for the diagram
        $rootReferral = $nodeReferral;
        // Traverse up to find the top-level parent (level 1 or no parent)
        // Ensure parentReferral is loaded for traversal
        while ($rootReferral->parentReferral_id && $rootReferral->level > 1) {
            $rootReferral->load('parentReferral.user'); // Load parent and its user for the tree
            $rootReferral = $rootReferral->parentReferral;
        }

        // Now, load the full hierarchy for the determined root
        // This ensures all children and their children are loaded for the tree view.
        // For very deep hierarchies, consider adjusting this eager loading or fetching via a separate API.
        $rootReferral->load([
            'user',
            'childReferrals.user',
            'childReferrals.childReferrals.user',
            'childReferrals.childReferrals.childReferrals.user', // Added another level for deeper visualization
            'childReferrals.childReferrals.childReferrals.childReferrals.user', // Added another level
        ]);

        // Build the full hierarchy tree starting from the determined root
        $referralTree = $this->buildReferralTree($rootReferral);

        // Determine overall status based on associated sales
        $overallStatus = 'pending';
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
                'referrer_email' => $nodeReferral->user->email ?? 'N/A',
                'node_boss_name' => $nodeReferral->nodeBoss->name ?? 'N/A',
                'node_boss_description' => $nodeReferral->nodeBoss->description ?? 'N/A',
                'referral_link_used' => $nodeReferral->referral_link,
                'full_referral_url' => route('nodeboss.index', [
                    'nodeBoss' => $nodeReferral->node_boss_id, 
                    'ref' => $nodeReferral->referral_link
                ]),
                'total_amount_invested' => $nodeReferral->total_amount_invested,
                'total_commission_earned' => $nodeReferral->commission_earned, // Direct commissions from this link
                'commission_percentage' => $nodeReferral->parchentage,
                'is_big_boss' => $nodeReferral->is_big_boss,
                'level' => $nodeReferral->level,
                'parent_referrer' => $nodeReferral->parentReferral ? [
                    'id' => $nodeReferral->parentReferral->id,
                    'name' => $nodeReferral->parentReferral->user->name ?? 'N/A',
                    'email' => $nodeReferral->parentReferral->user->email ?? 'N/A',
                    'is_big_boss' => $nodeReferral->parentReferral->is_big_boss,
                    'commission_percentage' => $nodeReferral->parentReferral->parchentage,
                ] : null,
                'child_referrals' => $nodeReferral->childReferrals->map(function ($childReferral) {
                    return [
                        'id' => $childReferral->id,
                        'name' => $childReferral->user->name ?? 'N/A',
                        'email' => $childReferral->user->email ?? 'N/A',
                        'commission_percentage' => $childReferral->parchentage,
                        'total_sales' => $childReferral->nodeSells->count(),
                        'total_earned' => $childReferral->commission_earned,
                        'status' => $childReferral->status,
                        'created_at' => $childReferral->created_at->toDateTimeString(),
                    ];
                })->toArray(),
                'total_sales_count' => $nodeReferral->nodeSells->count(),
                'completed_sales_count' => $nodeReferral->nodeSells->where('status', 'completed')->count(),
                'pending_sales_count' => $nodeReferral->nodeSells->where('status', 'pending')->count(),
                'failed_sales_count' => $nodeReferral->nodeSells->where('status', 'failed')->count(),
                'status' => $overallStatus,
                'referral_status' => $nodeReferral->status,
                'created_at' => $nodeReferral->created_at->toDateTimeString(),
                'updated_at' => $nodeReferral->updated_at->toDateTimeString(),
                'buyers' => $nodeReferral->nodeSells->map(function ($nodeSell) use ($nodeReferral) {
                    return [
                        'id' => $nodeSell->id,
                        'name' => $nodeSell->buyer_name ?? 'N/A',
                        'email' => $nodeSell->buyer_email ?? 'N/A',
                        'amount_invested' => $nodeSell->amount,
                        'commission_earned' => ($nodeSell->amount * $nodeReferral->parchentage) / 100,
                        'status' => $nodeSell->status,
                        'is_big_boss' => $nodeSell->is_big_boss,
                        'certificate_id' => $nodeSell->certificate_id,
                        'transaction_id' => $nodeSell->transaction_id,
                        'payment_method' => $nodeSell->payment_method,
                        'message' => $nodeSell->message,
                        'purchase_date' => $nodeSell->purchase_date?->toDateTimeString(),
                        'sold_at' => $nodeSell->purchase_date?->toDateTimeString() ?? $nodeSell->created_at->toDateTimeString(),
                        'user_info' => [
                            'id' => $nodeSell->user->id ?? null,
                            'name' => $nodeSell->user->name ?? 'N/A',
                            'email' => $nodeSell->user->email ?? 'N/A',
                        ],
                    ];
                })->toArray(),
                'total_user_commissions_earned' => $nodeReferral->user->transactions()->where('type', 'commission')->sum('amount'),
                'user_commission_transactions' => $nodeReferral->user->transactions()
                    ->where('type', 'commission')
                    ->orderBy('created_at', 'desc')
                    ->get()
                    ->map(function ($transaction) {
                        return [
                            'id' => $transaction->id,
                            'amount' => $transaction->amount,
                            'type' => $transaction->type, // Should always be 'commission' here
                            'description' => $transaction->description,
                            'source' => $transaction->source, // e.g., 'direct_sale', 'override_commission'
                            'created_at' => $transaction->created_at->toDateTimeString(),
                        ];
                    })->toArray(),
                'referral_tree_data' => $referralTree, // Pass the full tree data
            ],
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(NodeReferral $nodeReferral)
    {
        $nodeBosses = NodeBoss::all(['id', 'name', 'description']);
        $users = User::all(['id', 'name', 'email']);
        
        // Get potential parent referrals (exclude self and children to prevent circular references)
        $potentialParents = NodeReferral::where('id', '!=', $nodeReferral->id)
            ->where('node_boss_id', $nodeReferral->node_boss_id)
            ->whereNotIn('id', $nodeReferral->childReferrals->pluck('id'))
            ->with('user')
            ->get()
            ->map(function ($referral) {
                return [
                    'id' => $referral->id,
                    'name' => $referral->user->name ?? 'N/A',
                    'email' => $referral->user->email ?? 'N/A',
                    'is_big_boss' => $referral->is_big_boss,
                    'level' => $referral->level,
                ];
            });

        return Inertia::render("admin/referral/edit", [
            'referral' => [
                'id' => $nodeReferral->id,
                'user_id' => $nodeReferral->user_id,
                'node_boss_id' => $nodeReferral->node_boss_id,
                'parent_referral_id' => $nodeReferral->parent_referral_id,
                'referral_link' => $nodeReferral->referral_link,
                'parchentage' => $nodeReferral->parchentage,
                'is_big_boss' => $nodeReferral->is_big_boss,
                'level' => $nodeReferral->level,
                'status' => $nodeReferral->status,
            ],
            'nodeBosses' => $nodeBosses,
            'users' => $users,
            'potentialParents' => $potentialParents,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, NodeReferral $nodeReferral)
    {
        $request->validate([
            'user_id' => ['required', 'exists:users,id'],
            'node_boss_id' => ['required', 'exists:node_bosses,id'],
            'parent_referral_id' => ['nullable', 'exists:node_referrals,id'],
            'parchentage' => ['required', 'numeric', 'min:0', 'max:100'],
            'is_big_boss' => ['boolean'],
            'status' => ['required', 'string', 'in:active,inactive'],
            'referral_link' => ['required', 'string', 'unique:node_referrals,referral_link,' . $nodeReferral->id],
        ]);

        // Check if user/node_boss combination already exists (excluding current record)
        $existingReferral = NodeReferral::where('user_id', $request->user_id)
            ->where('node_boss_id', $request->node_boss_id)
            ->where('id', '!=', $nodeReferral->id)
            ->first();

        if ($existingReferral) {
            return redirect()->back()->withErrors([
                'user_id' => 'A referral link already exists for this user and node boss combination.'
            ]);
        }

        // Prevent circular references
        if ($request->parent_referral_id) {
            $childIds = $nodeReferral->childReferrals->pluck('id')->toArray();
            if (in_array($request->parent_referral_id, $childIds) || $request->parent_referral_id == $nodeReferral->id) {
                return redirect()->back()->withErrors([
                    'parent_referral_id' => 'Cannot set a child referral or self as parent to prevent circular references.'
                ]);
            }
        }

        // Update level based on parent referral
        $level = 1;
        if ($request->parent_referral_id) {
            $parentReferral = NodeReferral::find($request->parent_referral_id);
            $level = $parentReferral ? $parentReferral->level + 1 : 2;
        }

        $nodeReferral->update([
            'user_id' => $request->user_id,
            'node_boss_id' => $request->node_boss_id,
            'parent_referral_id' => $request->parent_referral_id,
            'referral_link' => $request->referral_link,
            'parchentage' => $request->parchentage,
            'is_big_boss' => $request->boolean('is_big_boss'),
            'level' => $level,
            'status' => $request->status,
        ]);

        return redirect()->route('node-referral.index')->with('success', 'Node Referral link updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(NodeReferral $nodeReferral)
    {
        // Check if referral has associated sales
        if ($nodeReferral->nodeSells()->exists()) {
            return redirect()->back()->withErrors([
                'delete' => 'Cannot delete referral link that has associated sales. Please contact system administrator.'
            ]);
        }

        // Update child referrals to remove parent reference
        $nodeReferral->childReferrals()->update(['parent_referral_id' => null, 'level' => 1]);

        $nodeReferral->delete();

        return redirect()->route('node-referral.index')->with('success', 'Node Referral link deleted successfully.');
    }

    /**
     * Get referral hierarchy for a specific node boss
     */
    public function hierarchy(Request $request, $nodeBossId)
    {
        $nodeBoss = NodeBoss::findOrFail($nodeBossId);
        
        // Get all referrals for this node boss with hierarchy
        $referrals = NodeReferral::with(['user', 'childReferrals.user', 'nodeSells'])
            ->where('node_boss_id', $nodeBossId)
            ->whereNull('parent_referral_id') // Start with top-level referrals
            ->get()
            ->map(function ($referral) {
                return $this->buildReferralTree($referral);
            });

        return Inertia::render("admin/referral/hierarchy", [
            'nodeBoss' => $nodeBoss,
            'referralTree' => $referrals,
        ]);
    }

    /**
     * Build referral tree recursively
     */
    private function buildReferralTree($referral)
    {
        // Ensure user and nodeBoss are loaded for the current referral
        $referral->loadMissing(['user', 'nodeBoss']);

        // Calculate total earned for this specific node, including direct sales and override commissions from children
        // This assumes NodeReferral has a method or accessor to calculate its total earned from all sources
        // For simplicity, if NodeReferral->commission_earned is only direct, you might need a more complex query here
        // For now, we'll use the existing commission_earned from the model, assuming it's the direct commission for this link.
        // The total_user_commissions_earned (from transactions) is passed separately for the main referrer.
        $totalEarnedForNode = $referral->commission_earned; 

        // Construct the full referral URL for this node
        $fullReferralUrl = null;
        if ($referral->node_boss_id && $referral->referral_link) {
            $fullReferralUrl = route('nodeboss.index', [
                'nodeBoss' => $referral->node_boss_id, 
                'ref' => $referral->referral_link
            ]);
        }

        return [
            'id' => $referral->id,
            'user_name' => $referral->user->name ?? 'N/A',
            'user_email' => $referral->user->email ?? 'N/A',
            'is_big_boss' => $referral->is_big_boss,
            'level' => $referral->level,
            'commission_percentage' => $referral->parchentage,
            'total_sales' => $referral->nodeSells->count(),
            'total_earned' => $totalEarnedForNode, // This is direct commission for this link
            'status' => $referral->status,
            'created_at' => $referral->created_at->toDateTimeString(), // Add created_at for modal
            'full_referral_url' => $fullReferralUrl, // Add the full referral URL here
            'children' => $referral->childReferrals->map(function ($child) {
                // Recursively load children's children for deeper tree
                $child->loadMissing(['childReferrals.user', 'nodeBoss']); // Ensure nodeBoss is loaded for child as well
                return $this->buildReferralTree($child);
            })->toArray(),
        ];
    }

    /**
     * Activate/Deactivate referral
     */
    public function toggleStatus(NodeReferral $nodeReferral)
    {
        $newStatus = $nodeReferral->status === 'active' ? 'inactive' : 'active';
        $nodeReferral->update(['status' => $newStatus]);

        return redirect()->back()->with('success', "Referral link {$newStatus} successfully.");
    }

    /**
     * Bulk actions for referrals
     */
    public function bulkAction(Request $request)
    {
        $request->validate([
            'action' => ['required', 'in:activate,deactivate,delete'],
            'referral_ids' => ['required', 'array'],
            'referral_ids.*' => ['exists:node_referrals,id'],
        ]);

        $referrals = NodeReferral::whereIn('id', $request->referral_ids);

        switch ($request->action) {
            case 'activate':
                $referrals->update(['status' => 'active']);
                $message = 'Selected referrals activated successfully.';
                break;
            case 'deactivate':
                $referrals->update(['status' => 'inactive']);
                $message = 'Selected referrals deactivated successfully.';
                break;
            case 'delete':
                // Check if any referral has associated sales
                $hasAssociatedSales = $referrals->whereHas('nodeSells')->exists();
                if ($hasAssociatedSales) {
                    return redirect()->back()->withErrors([
                        'bulk' => 'Cannot delete referrals that have associated sales.'
                    ]);
                }
                $referrals->delete();
                $message = 'Selected referrals deleted successfully.';
                break;
        }

        return redirect()->back()->with('success', $message);
    }
}
