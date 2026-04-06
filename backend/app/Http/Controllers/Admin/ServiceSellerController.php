<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ServiceSellerProfile;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class ServiceSellerController extends Controller
{
    public function index(Request $request)
    {
        // Only admins can access
        $this->authorize('viewAny', ServiceSellerProfile::class);

        $query = ServiceSellerProfile::with(['user:id,name,email,created_at', 'suspendedBy:id,name'])
            ->withCount([
                    'gigs as gigs_count' => function ($query) {
                        $query->where('status', '!=', 'draft');
                    },
                    'gigs as active_gigs_count' => function ($query) {
                        $query->where('status', 'active');
                    }
                ]);

        // Search filter
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->whereHas('user', function ($q) use ($search) {
                $q->where('name', 'LIKE', "%{$search}%")
                    ->orWhere('email', 'LIKE', "%{$search}%");
            });
        }

        // Status filter
        if ($request->has('status') && $request->status !== 'all') {
            $query->where('is_suspended', $request->status === 'suspended');
        }

        // Sort
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        $sellers = $query->paginate(20);

        // Transform data
        $sellers->getCollection()->transform(function ($seller) {
            return [
                'id' => $seller->id,
                'user_id' => $seller->user_id,
                'name' => $seller->user->name,
                'email' => $seller->user->email,
                'bio' => $seller->bio,
                'location' => $seller->location,
                'state' => $seller->state,
                'is_suspended' => $seller->is_suspended,
                'suspended_at' => $seller->suspended_at ? $seller->suspended_at->format('Y-m-d H:i:s') : null,
                'suspension_reason' => $seller->suspension_reason,
                'suspended_by' => $seller->suspendedBy ? [
                    'id' => $seller->suspendedBy->id,
                    'name' => $seller->suspendedBy->name,
                ] : null,
                'gigs_count' => $seller->gigs_count,
                'active_gigs_count' => $seller->active_gigs_count,
                'member_since' => $seller->created_at->format('M d, Y'),
                'joined_date' => $seller->user->created_at->format('M d, Y'),
            ];
        });

        return Inertia::render('admin/ServiceSellers/index', [
            'sellers' => $sellers,
            'filters' => [
                'search' => $request->get('search', ''),
                'status' => $request->get('status', 'all'),
                'sort_by' => $sortBy,
                'sort_order' => $sortOrder,
            ],
        ]);
    }

    public function suspend(Request $request, $id)
    {
        $seller = ServiceSellerProfile::findOrFail($id);

        // Only admins can suspend
        $this->authorize('suspend', $seller);

        $validated = $request->validate([
            'reason' => 'required|string|max:1000',
        ]);

        try {
            DB::transaction(function () use ($seller, $validated) {
                $seller->suspend($validated['reason'], auth()->user());

                // Log the suspension
                activity()
                    ->performedOn($seller)
                    ->causedBy(auth()->user())
                    ->withProperties([
                            'reason' => $validated['reason'],
                            'gigs_suspended' => $seller->user->gigs()->where('status', 'active')->count(),
                        ])
                    ->log('Seller suspended');
            });

            return redirect()->back()->with('success', 'Seller suspended successfully.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Failed to suspend seller: ' . $e->getMessage());
        }
    }

    public function unsuspend($id)
    {
        $seller = ServiceSellerProfile::findOrFail($id);

        // Only admins can unsuspend
        $this->authorize('unsuspend', $seller);

        try {
            DB::transaction(function () use ($seller) {
                $seller->unsuspend();

                // Log the unsuspension
                activity()
                    ->performedOn($seller)
                    ->causedBy(auth()->user())
                    ->withProperties([
                            'gigs_reactivated' => $seller->user->gigs()->where('status', 'suspended')->count(),
                        ])
                    ->log('Seller unsuspended');
            });

            return redirect()->back()->with('success', 'Seller unsuspended successfully.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Failed to unsuspend seller: ' . $e->getMessage());
        }
    }

    public function show($id)
    {
        try {
            Log::info('Attempting to show seller', ['seller_id' => $id, 'user_id' => auth()->id()]);

            // Only admins can access
            if (!auth()->user() || auth()->user()->role !== 'admin') {
                Log::error('Unauthorized access attempt', ['user_id' => auth()->id()]);
                abort(403, 'Unauthorized');
            }

            $seller = ServiceSellerProfile::with([
                'user:id,name,email,image,created_at',
                'suspendedBy:id,name',
            ])->findOrFail($id);

            Log::info('Seller found', ['seller_id' => $seller->id, 'user_name' => $seller->user->name]);

            // Load gigs separately to avoid issues
            $gigs = $seller->user->gigs()->select('id', 'slug', 'user_id', 'title', 'status', 'price', 'created_at')
                ->withCount('orders')
                ->get();

            // Load orders separately
            $recentOrders = $seller->user->serviceOrdersAsSeller()
                ->select('id', 'seller_id', 'status', 'amount', 'created_at', 'order_number')
                ->orderBy('created_at', 'desc')
                ->limit(10)
                ->get();

            $sellerData = [
                'id' => $seller->id,
                'user' => [
                    'id' => $seller->user->id,
                    'name' => $seller->user->name,
                    'email' => $seller->user->email,
                    'image' => $seller->user->image,
                    'created_at' => $seller->user->created_at->format('Y-m-d H:i:s'),
                ],
                'bio' => $seller->bio,
                'location' => $seller->location,
                'state' => $seller->state,
                'phone' => $seller->phone,
                'is_suspended' => $seller->is_suspended,
                'suspended_at' => $seller->suspended_at ? $seller->suspended_at->format('Y-m-d H:i:s') : null,
                'suspension_reason' => $seller->suspension_reason,
                'suspended_by' => $seller->suspendedBy ? [
                    'id' => $seller->suspendedBy->id,
                    'name' => $seller->suspendedBy->name,
                ] : null,
                'gigs' => $gigs->map(function ($gig) {
                    return [
                        'id' => $gig->id,
                        'slug' => $gig->slug,
                        'title' => $gig->title,
                        'status' => $gig->status,
                        'price' => $gig->price,
                        'orders_count' => $gig->orders_count,
                        'created_at' => $gig->created_at->format('Y-m-d'),
                    ];
                }),
                'recent_orders' => $recentOrders->map(function ($order) {
                    return [
                        'id' => $order->id,
                        'order_number' => $order->order_number,
                        'status' => $order->status,
                        'amount' => $order->amount,
                        'created_at' => $order->created_at->format('Y-m-d H:i'),
                    ];
                }),
                'stats' => [
                    'total_gigs' => $gigs->count(),
                    'active_gigs' => $gigs->where('status', 'active')->count(),
                    'suspended_gigs' => $gigs->where('status', 'suspended')->count(),
                    'total_orders' => $recentOrders->count(),
                ],
            ];

            Log::info('Returning seller data', ['seller_id' => $seller->id]);

            return Inertia::render('admin/ServiceSellers/show', [
                'seller' => $sellerData,
            ]);

        } catch (\Exception $e) {
            Log::error('Error in ServiceSellerController@show', [
                'seller_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]);

            // Return a simple error response for debugging
            return response()->json([
                'error' => true,
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ], 500);
        }
    }
}
