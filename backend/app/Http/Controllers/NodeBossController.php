<?php

namespace App\Http\Controllers;

use App\Models\NodeBoss;
use App\Models\NodeReferral;
use App\Models\NodeSell;
use App\Models\NodeShare;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Inertia\Inertia;

class NodeBossController extends Controller
{
    public function index(Request $request)
    {
        $nodeBoss = NodeBoss::first();

        if ($nodeBoss) {
            // Get shares with search and status filtering
            $sharesQuery = NodeShare::where('node_boss_id', $nodeBoss->id)
                ->select('id', 'node_id', 'cost', 'sold', 'remaining', 'status');

            // Apply search filter for shares - only if search term is not empty
            if ($request->filled('shares_search')) {
                $search = $request->input('shares_search');
                $sharesQuery->where(function ($q) use ($search) {
                    $q->where('node_id', 'like', '%' . $search . '%')
                        ->orWhere('cost', 'like', '%' . $search . '%')
                        ->orWhere('sold', 'like', '%' . $search . '%')
                        ->orWhere('remaining', 'like', '%' . $search . '%')
                        ->orWhere('status', 'like', '%' . $search . '%');
                });
            }

            // Apply status filter for shares - only if status is not empty
            if ($request->filled('shares_status')) {
                $sharesQuery->where('status', $request->input('shares_status'));
            }

            $sharesData = $sharesQuery->orderBy('created_at', 'desc')->paginate(5, ['*'], 'shares_page');

            // Get sold shares with search and status filtering
            $soldSharesQuery = NodeSell::with(['user:id,name', 'nodeShare:id,node_id'])
                ->where('node_boss_id', $nodeBoss->id)
                ->select('id', 'user_id', 'node_share_id', 'amount', 'status', 'buyer_name', 'buyer_email', 'created_at');

            // Apply search filter for sold shares - only if search term is not empty
            if ($request->filled('sold_search')) {
                $search = $request->input('sold_search');
                $soldSharesQuery->where(function ($q) use ($search) {
                    $q->where('buyer_name', 'like', '%' . $search . '%')
                        ->orWhere('buyer_email', 'like', '%' . $search . '%')
                        ->orWhere('amount', 'like', '%' . $search . '%')
                        ->orWhere('status', 'like', '%' . $search . '%')
                        ->orWhereHas('user', function ($q) use ($search) {
                            $q->where('name', 'like', '%' . $search . '%');
                        })
                        ->orWhereHas('nodeShare', function ($q) use ($search) {
                            $q->where('node_id', 'like', '%' . $search . '%');
                        });
                });
            }

            // Apply status filter for sold shares - only if status is not empty
            if ($request->filled('sold_status')) {
                $soldSharesQuery->where('status', $request->input('sold_status'));
            }

            $soldShares = $soldSharesQuery->orderBy('created_at', 'desc')->paginate(5, ['*'], 'sold_shares_page');

            // Transform the data for frontend
            $sharesData->getCollection()->transform(function ($share) {
                return [
                    'id' => $share->id,
                    'node_id' => $share->node_id,
                    'cost_of_node' => $share->cost,
                    'accumulate_cost' => $share->sold,
                    'reminder' => $share->remaining,
                    'status' => $share->status,
                ];
            });

            $soldShares->getCollection()->transform(function ($soldShare) {
                return [
                    'id' => $soldShare->id,
                    'name' => $soldShare->user->name ?? $soldShare->buyer_name ?? 'Unknown User',
                    'email' => $soldShare->buyer_email ?? $soldShare->user->email ?? 'N/A',
                    'node_id' => $soldShare->nodeShare->node_id ?? 'N/A',
                    'price' => $soldShare->amount,
                    'status' => $soldShare->status,
                    'created_at' => $soldShare->created_at,
                ];
            });

            $shares = NodeShare::whereHas('nodeBoss', function ($query) {
                $query->where('status', 'active');
            })->get();

            // Calculate total targeted amount (sum of cost)
            $totalTargetAmount = $shares->sum('cost');

            // Calculate total raised amount (cost - remaining)
            $totalSoldAmount = $shares->sum(function ($share) {
                return $share->cost - $share->remaining;
            });

            // Calculate total remaining amount
            $remainingAmount = $shares->sum('remaining');

            // Calculate overall progress percentage
            $progressPercentage = $totalTargetAmount > 0
                ? ($totalSoldAmount / $totalTargetAmount) * 100
                : 0;

            // Get all active NodeBosses
            $nodeBosses = NodeBoss::where('status', 'active')->latest()->get();

            // Add statistics to each NodeBoss
            $nodeBosses->each(function ($nodeBoss) {
                $shares = NodeShare::where('node_boss_id', $nodeBoss->id)->get();

                $nodeBoss->total_target = $shares->sum('cost');
                $nodeBoss->total_sold = $shares->sum(function ($share) {
                    return $share->cost - $share->remaining;
                });
                $nodeBoss->remaining_amount = $shares->sum('remaining');

                $nodeBoss->progress_percentage = $nodeBoss->total_target > 0
                    ? ($nodeBoss->total_sold / $nodeBoss->total_target) * 100
                    : 0;

                $nodeBoss->total_shares_count = $shares->count();

                $nodeBoss->completed_purchases = NodeSell::where('node_boss_id', $nodeBoss->id)
                    ->where('status', 'completed')
                    ->count();
            });
            return Inertia::render('admin/node-boss/index', [
                'nodeBoss' => $nodeBoss,
                'shares' => $sharesData,
                'soldShares' => $soldShares,
                'filters' => [
                    'shares_search' => $request->input('shares_search', ''),
                    'shares_status' => $request->input('shares_status', ''),
                    'sold_search' => $request->input('sold_search', ''),
                    'sold_status' => $request->input('sold_status', ''),
                ],
                'statistics' => [
                    'total_target_amount' => $totalTargetAmount,
                    'total_sold_amount' => $totalSoldAmount,
                    'remaining_amount' => $remainingAmount,
                    'progress_percentage' => round($progressPercentage, 2),
                    'total_projects' => $nodeBosses->count(),
                    'total_investors' => NodeSell::whereHas('nodeBoss', function ($query) {
                        $query->where('status', 'active');
                    })->where('status', 'completed')->distinct('user_id')->count('user_id'),
                ]
            ]);
        } else {
            return Inertia::render('admin/node-boss/index', [
                'nodeBoss' => $nodeBoss,
                'shares' => [],
                'soldShares' => 0,
                'filters' => [
                    'shares_search' => $request->input('shares_search', ''),
                    'shares_status' => $request->input('shares_status', ''),
                    'sold_search' => $request->input('sold_search', ''),
                    'sold_status' => $request->input('sold_status', ''),
                ],
                'statistics' => [
                    'total_target_amount' => 0,
                    'total_sold_amount' => 0,
                    'remaining_amount' => 0,
                    'progress_percentage' => round(0, 2),
                    'total_projects' => 0,
                    'total_investors' => NodeSell::whereHas('nodeBoss', function ($query) {
                        $query->where('status', 'active');
                    })->where('status', 'completed')->distinct('user_id')->count('user_id'),
                ]
            ]);
        }
    }

    public function frontendIndex(Request $request)
    {
        $nodeBoss = NodeBoss::first();
        $ref = $request->ref;
        if ($nodeBoss) {
            // Get all shares for this NodeBoss
            $shares = NodeShare::where('node_boss_id', $nodeBoss->id)->get();

            // Calculate total targeted amount (sum of cost)
            $totalTargetAmount = $shares->sum('cost');

            // Calculate total sold amount (cost - remaining)
            $totalSoldAmount = $shares->sum(function ($share) {
                return $share->cost - $share->remaining;
            });

            // Calculate total remaining amount
            $remainingAmount = $shares->sum('remaining');

            // Calculate progress percentage
            $progressPercentage = $totalTargetAmount > 0
                ? ($totalSoldAmount / $totalTargetAmount) * 100
                : 0;

            // Get current open shares (remaining > 0, status = 'open')
            $openShares = $shares->filter(function ($share) {
                return $share->status === 'open' && $share->remaining > 0;
            })->values();
            if ($request->user()?->hasRole(['admin', 'organization'])) {
                $isReferral = true;
            } else {
                $isReferral = NodeReferral::where('referral_link', $ref)->where('user_id', Auth::user()?->id)->exists();
            }
            return Inertia::render('frontend/nodeboss/nodeboss', [
                'nodeBoss' => $nodeBoss,
                'openShares' => $openShares,
                'stripeKey' => \App\Services\StripeConfigService::getPublishableKey() ?? config('cashier.key'),
                'statistics' => [
                    'total_target_amount' => $totalTargetAmount,
                    'total_sold_amount' => $totalSoldAmount,
                    'remaining_amount' => $remainingAmount,
                    'progress_percentage' => round($progressPercentage, 2),
                ],
                'isRefOwner' => $isReferral,
                'user' => Auth::user() ? [
                    'name' => Auth::user()->name,
                    'email' => Auth::user()->email,
                ] : null,
            ]);
        } else {

            return Inertia::render('frontend/nodeboss/nodeboss', [
                'nodeBoss' => $nodeBoss,
                'openShares' => [],
                'stripeKey' => \App\Services\StripeConfigService::getPublishableKey() ?? config('cashier.key'),
                'statistics' => [
                    'total_target_amount' => 0,
                    'total_sold_amount' => 0,
                    'remaining_amount' => 0,
                    'progress_percentage' => round(0, 2),
                ],
                'referrelLink' => false,
                'user' => Auth::user() ? [
                    'name' => Auth::user()->name,
                    'email' => Auth::user()->email,
                ] : null,
            ]);
        }
    }



    public function frontendShow($slug)
    {
        $nodeBoss = NodeBoss::where('slug', $slug)->firstOrFail();
        // Get all shares for this NodeBoss
        $shares = NodeShare::where('node_boss_id', $nodeBoss->id)->get();

        // Calculate total targeted amount (sum of cost)
        $totalTargetAmount = $shares->sum('cost');

        // Calculate total sold amount (cost - remaining)
        $totalSoldAmount = $shares->sum(function ($share) {
            return $share->cost - $share->remaining;
        });

        // Calculate total remaining amount
        $remainingAmount = $shares->sum('remaining');

        // Calculate progress percentage
        $progressPercentage = $totalTargetAmount > 0
            ? ($totalSoldAmount / $totalTargetAmount) * 100
            : 0;

        // Get current open shares (remaining > 0, status = 'open')
        $openShares = $shares->filter(function ($share) {
            return $share->status === 'open' && $share->remaining > 0;
        })->values();

        return Inertia::render('frontend/nodeboss/buy-nodeboss', [
            'nodeBoss' => $nodeBoss,
            'openShares' => $openShares,
            'stripeKey' => \App\Services\StripeConfigService::getPublishableKey() ?? config('cashier.key'),
            'statistics' => [
                'total_target_amount' => $totalTargetAmount,
                'total_sold_amount' => $totalSoldAmount,
                'remaining_amount' => $remainingAmount,
                'progress_percentage' => round($progressPercentage, 2),
            ],
            'user' => Auth::user() ? [
                'name' => Auth::user()->name,
                'email' => Auth::user()->email,
            ] : null,
        ]);
    }

    //buy sahres with stripe laravel cashier payment method
    public function shareBuy(Request $request) {}

    public function create()
    {
        return Inertia::render('admin/node-boss/create');
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'price' => 'required|decimal:0,2|min:0.01',
            'description' => 'required|string',
            'suggested_amounts' => 'required|array|min:1',
            'suggested_amounts.*' => 'numeric|min:1',
            'is_closed' => 'boolean',
            'status' => 'required|in:active,inactive,draft',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:10240', // 10MB max
        ]);

        if ($validator->fails()) {
            return back()->withErrors($validator)->withInput();
        }

        $data = $request->all();

        // Handle image upload
        if ($request->hasFile('image')) {
            $image = $request->file('image');
            $imageName = time() . '_' . uniqid() . '.' . $image->getClientOriginalExtension();
            $imagePath = $image->storeAs('node-boss-images', $imageName, 'public');
            $data['image'] = $imagePath;
        }

        // Convert suggested amounts to JSON
        $data['suggested_amounts'] = json_encode($request->suggested_amounts);
        $data['created_by'] = Auth::id(); // Assuming you want to track who created the NodeBoss
        $data['slug'] = Str::slug($data['name'], '-');
        $data['user_id'] = Auth::id(); // Set the user ID to the currently authenticated user
        $nodeboss = NodeBoss::create($data);
        if ($nodeboss) {
            NodeShare::create([
                "node_boss_id" => $nodeboss->id,
                "cost" => $data['price'],
                'remaining' => NodeShare::DEFAULT_SHARE_AMOUNT,
            ]);
        }
        return redirect()->route('node-boss.index')->with('success', 'NodeBoss created successfully!');
    }

    public function show(Request $request, $id)
    {
        $nodeBoss = NodeBoss::findOrFail($id);

        // Get shares with search and status filtering
        $sharesQuery = NodeShare::where('node_boss_id', $id)
            ->select('id', 'node_id', 'cost', 'sold', 'remaining', 'status');

        // Apply search filter for shares - only if search term is not empty
        if ($request->filled('shares_search')) {
            $search = $request->input('shares_search');
            $sharesQuery->where(function ($q) use ($search) {
                $q->where('node_id', 'like', '%' . $search . '%')
                    ->orWhere('cost', 'like', '%' . $search . '%')
                    ->orWhere('sold', 'like', '%' . $search . '%')
                    ->orWhere('remaining', 'like', '%' . $search . '%')
                    ->orWhere('status', 'like', '%' . $search . '%');
            });
        }

        // Apply status filter for shares - only if status is not empty
        if ($request->filled('shares_status')) {
            $sharesQuery->where('status', $request->input('shares_status'));
        }

        $shares = $sharesQuery->orderBy('created_at', 'desc')->paginate(5, ['*'], 'shares_page');

        // Get sold shares with search and status filtering
        $soldSharesQuery = NodeSell::with(['user:id,name', 'nodeShare:id,node_id'])
            ->where('node_boss_id', $id)
            ->select('id', 'user_id', 'node_share_id', 'amount', 'status', 'buyer_name', 'buyer_email', 'created_at');

        // Apply search filter for sold shares - only if search term is not empty
        if ($request->filled('sold_search')) {
            $search = $request->input('sold_search');
            $soldSharesQuery->where(function ($q) use ($search) {
                $q->where('buyer_name', 'like', '%' . $search . '%')
                    ->orWhere('buyer_email', 'like', '%' . $search . '%')
                    ->orWhere('amount', 'like', '%' . $search . '%')
                    ->orWhere('status', 'like', '%' . $search . '%')
                    ->orWhereHas('user', function ($q) use ($search) {
                        $q->where('name', 'like', '%' . $search . '%');
                    })
                    ->orWhereHas('nodeShare', function ($q) use ($search) {
                        $q->where('node_id', 'like', '%' . $search . '%');
                    });
            });
        }

        // Apply status filter for sold shares - only if status is not empty
        if ($request->filled('sold_status')) {
            $soldSharesQuery->where('status', $request->input('sold_status'));
        }

        $soldShares = $soldSharesQuery->orderBy('created_at', 'desc')->paginate(5, ['*'], 'sold_shares_page');

        // Transform the data for frontend
        $shares->getCollection()->transform(function ($share) {
            return [
                'id' => $share->id,
                'node_id' => $share->node_id,
                'cost_of_node' => $share->cost,
                'accumulate_cost' => $share->sold,
                'reminder' => $share->remaining,
                'status' => $share->status,
            ];
        });

        $soldShares->getCollection()->transform(function ($soldShare) {
            return [
                'id' => $soldShare->id,
                'name' => $soldShare->user->name ?? $soldShare->buyer_name ?? 'Unknown User',
                'email' => $soldShare->buyer_email ?? $soldShare->user->email ?? 'N/A',
                'node_id' => $soldShare->nodeShare->node_id ?? 'N/A',
                'price' => $soldShare->amount,
                'status' => $soldShare->status,
                'created_at' => $soldShare->created_at,
            ];
        });

        return Inertia::render('admin/node-boss/Show', [
            'nodeBoss' => $nodeBoss,
            'shares' => $shares,
            'soldShares' => $soldShares,
            'filters' => [
                'shares_search' => $request->input('shares_search', ''),
                'shares_status' => $request->input('shares_status', ''),
                'sold_search' => $request->input('sold_search', ''),
                'sold_status' => $request->input('sold_status', ''),
            ]
        ]);
    }


    public function edit($id)
    {
        $nodeBoss = NodeBoss::findOrFail($id);

        return Inertia::render('admin/node-boss/edit', [
            'nodeBoss' => $nodeBoss,
        ]);
    }

    public function update(Request $request, $id)
    {
        //dd($request->all());
        $nodeBoss = NodeBoss::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'price' => 'required|decimal:0,2|min:0.01',
            'description' => 'required|string',
            'suggested_amounts' => 'required|array|min:1',
            'suggested_amounts.*' => 'numeric|min:1',
            'is_closed' => 'boolean',
            'status' => 'required|in:active,inactive,draft',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:10240',
        ]);

        if ($validator->fails()) {
            return back()->withErrors($validator)->withInput();
        }

        $data = $request->only([
            'name',
            'price',
            'description',
            'suggested_amounts',
            'is_closed',
            'status',
        ]);

        // Handle image upload
        if ($request->hasFile('image')) {
            // Delete old image
            if ($nodeBoss->image && Storage::disk('public')->exists($nodeBoss->image)) {
                Storage::disk('public')->delete($nodeBoss->image);
            }

            $image = $request->file('image');
            $imageName = time() . '_' . uniqid() . '.' . $image->getClientOriginalExtension();
            $imagePath = $image->storeAs('node-boss-images', $imageName, 'public');
            $data['image'] = $imagePath;
        }

        // Convert suggested amounts to JSON
        $data['suggested_amounts'] = json_encode($data['suggested_amounts']);

        $nodeBoss->update($data);
        // if ($nodeBoss) {
        //     NodeShare::update([
        //         "node_boss_id" => $nodeBoss->id,
        //         "cost" => $data['price']
        //     ]);
        // }
        return redirect()->route('node-boss.index')->with('success', 'NodeBoss updated successfully!');
    }

    public function destroy($id)
    {
        $nodeBoss = NodeBoss::findOrFail($id);

        // Delete image file
        if ($nodeBoss->image && Storage::disk('public')->exists($nodeBoss->image)) {
            Storage::disk('public')->delete($nodeBoss->image);
        }

        $nodeBoss->delete();

        return redirect()->route('node-boss.index')->with('success', 'NodeBoss deleted successfully!');
    }
}
