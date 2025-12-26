<?php

namespace App\Http\Controllers;

use App\Models\Gig;
use App\Models\ServiceCategory;
use App\Models\GigPackage;
use App\Models\GigImage;
use App\Models\GigFavorite;
use App\Models\ServiceOrder;
use App\Models\ServiceReview;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ServiceHubController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Gig::with(['category', 'user', 'primaryImage', 'images'])
            ->where('status', 'active');

        // Search
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'LIKE', "%{$search}%")
                    ->orWhere('description', 'LIKE', "%{$search}%");
            });
        }

        // Category filter
        if ($request->has('category') && $request->category && $request->category !== 'all') {
            $query->whereHas('category', function ($q) use ($request) {
                $q->where('slug', $request->category);
            });
        }

        // Price range filter
        if ($request->has('price_min')) {
            $query->where('price', '>=', $request->price_min);
        }
        if ($request->has('price_max')) {
            $query->where('price', '<=', $request->price_max);
        }

        // Rating filter
        if ($request->has('min_rating')) {
            $query->where('rating', '>=', $request->min_rating);
        }

        // Delivery time filter
        if ($request->has('delivery_time')) {
            $query->where('delivery_time', $request->delivery_time);
        }

        // Sort
        $sortBy = $request->get('sort_by', 'best_selling');
        switch ($sortBy) {
            case 'newest':
                $query->orderBy('created_at', 'desc');
                break;
            case 'price_low':
                $query->orderBy('price', 'asc');
                break;
            case 'price_high':
                $query->orderBy('price', 'desc');
                break;
            case 'rating':
                $query->orderBy('rating', 'desc');
                break;
            default: // best_selling
                $query->orderBy('orders_count', 'desc');
                break;
        }

        $gigs = $query->paginate(12);

        // Transform gigs data for frontend
        $gigs->getCollection()->transform(function ($gig) {
            $primaryImage = $gig->images->where('is_primary', true)->first()
                ?? $gig->images->first();
            $imageUrl = $primaryImage ? Storage::url($primaryImage->image_path) : null;

            return [
                'id' => $gig->id,
                'title' => $gig->title,
                'description' => $gig->description,
                'price' => (float) $gig->price,
                'deliveryTime' => $gig->delivery_time,
                'rating' => (float) $gig->rating,
                'reviews' => $gig->reviews_count,
                'image' => $imageUrl,
                'seller' => [
                    'id' => $gig->user->id,
                    'name' => $gig->user->name,
                    'avatar' => $gig->user->image ? Storage::url($gig->user->image) : null,
                ],
                'category' => $gig->category->name ?? '',
                'tags' => $gig->tags ?? [],
            ];
        });

        // Get categories for filter
        $categories = ServiceCategory::where('is_active', true)
            ->orderBy('sort_order')
            ->get(['id', 'name', 'slug']);

        // Get user favorites if authenticated
        $favoriteIds = [];
        if (Auth::check()) {
            $favoriteIds = GigFavorite::where('user_id', Auth::id())
                ->pluck('gig_id')
                ->toArray();
        }

        return Inertia::render('frontend/service-hub/index', [
            'gigs' => $gigs,
            'categories' => $categories,
            'favoriteIds' => $favoriteIds,
            'filters' => [
                'search' => $request->get('search', ''),
                'category' => $request->get('category', 'all'),
                'price_min' => $request->get('price_min', 0),
                'price_max' => $request->get('price_max', 1000),
                'min_rating' => $request->get('min_rating', 0),
                'delivery_time' => $request->get('delivery_time'),
                'sort_by' => $sortBy,
            ],
        ]);
    }

    public function create(): Response
    {
        $categories = ServiceCategory::where('is_active', true)
            ->orderBy('sort_order')
            ->get();

        return Inertia::render('frontend/service-hub/create', [
            'categories' => $categories,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'category_id' => 'required|exists:service_categories,id',
            'description' => 'required|string|max:500',
            'full_description' => 'nullable|string',
            'tags' => 'nullable|array',
            'tags.*' => 'string|max:50',
            'packages' => 'required|array|min:1',
            'packages.*.name' => 'required|string|max:100',
            'packages.*.price' => 'required|numeric|min:0',
            'packages.*.delivery_time' => 'required|string',
            'packages.*.description' => 'nullable|string',
            'packages.*.features' => 'nullable|array',
            'packages.*.features.*' => 'string|max:255',
            'images' => 'required|array|min:1|max:5',
            'images.*' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        try {
            $gig = Gig::create([
                'user_id' => Auth::id(),
                'category_id' => $validated['category_id'],
                'title' => $validated['title'],
                'description' => $validated['description'],
                'full_description' => $validated['full_description'] ?? null,
                'tags' => $validated['tags'] ?? [],
                'price' => $validated['packages'][0]['price'] ?? 0,
                'delivery_time' => $validated['packages'][0]['delivery_time'] ?? '3 days',
                'status' => 'active',
            ]);
            // Create packages
            foreach ($validated['packages'] as $index => $packageData) {
                GigPackage::create([
                    'gig_id' => $gig->id,
                    'name' => $packageData['name'],
                    'price' => $packageData['price'],
                    'delivery_time' => $packageData['delivery_time'],
                    'description' => $packageData['description'] ?? null,
                    'features' => $packageData['features'] ?? [],
                    'is_popular' => $index === 1, // Mark second package as popular
                    'sort_order' => $index,
                ]);
            }

            // Upload images
            foreach ($request->file('images', []) as $index => $image) {
                $imagePath = $image->store('gigs/' . $gig->id, 'public');
                GigImage::create([
                    'gig_id' => $gig->id,
                    'image_path' => $imagePath,
                    'is_primary' => $index === 0,
                    'sort_order' => $index,
                ]);
            }

            return redirect()->route('service-hub.show', $gig->id)
                ->with('success', 'Service created successfully!');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Failed to create service: ' . $e->getMessage()]);
        }
    }

    public function show(Request $request, $id): Response
    {
        $gig = Gig::with([
            'category',
            'user',
            'packages' => function ($q) {
                $q->orderBy('sort_order');
            },
            'images' => function ($q) {
                $q->orderBy('sort_order');
            },
            'reviews.user' => function ($q) {
                $q->select('id', 'name', 'image');
            },
        ])->findOrFail($id);

        if ($gig->status !== 'active') {
            abort(404);
        }

        // Get recent reviews
        $recentReviews = ServiceReview::with('user:id,name,image')
            ->where('gig_id', $gig->id)
            ->orderBy('created_at', 'desc')
            ->limit(3)
            ->get()
            ->map(function ($review) {
                return [
                    'id' => $review->id,
                    'user' => [
                        'name' => $review->user->name,
                        'avatar' => $review->user->image ? Storage::url($review->user->image) : null,
                    ],
                    'rating' => $review->rating,
                    'comment' => $review->comment,
                    'date' => $review->created_at->diffForHumans(),
                ];
            });

        // Check if favorited
        $isFavorite = false;
        if (Auth::check()) {
            $isFavorite = GigFavorite::where('user_id', Auth::id())
                ->where('gig_id', $gig->id)
                ->exists();
        }

        // Format images
        $images = $gig->images->map(function ($image) {
            return Storage::url($image->image_path);
        })->toArray();

        // Format packages
        $packages = $gig->packages->map(function ($package) {
            return [
                'id' => $package->id,
                'name' => $package->name,
                'price' => (float) $package->price,
                'deliveryTime' => $package->delivery_time,
                'description' => $package->description,
                'features' => $package->features ?? [],
                'popular' => $package->is_popular,
            ];
        })->toArray();

        // Format gig data
        $gigData = [
            'id' => $gig->id,
            'title' => $gig->title,
            'description' => $gig->description,
            'fullDescription' => $gig->full_description ?? '',
            'price' => (float) $gig->price,
            'deliveryTime' => $gig->delivery_time,
            'rating' => (float) $gig->rating,
            'reviews' => $gig->reviews_count,
            'category' => $gig->category->name ?? '',
            'tags' => $gig->tags ?? [],
            'images' => $images,
            'packages' => $packages,
            'seller' => [
                'id' => $gig->user->id,
                'name' => $gig->user->name,
                'avatar' => $gig->user->image ? Storage::url($gig->user->image) : null,
            ],
        ];

        return Inertia::render('frontend/service-hub/show', [
            'gig' => $gigData,
            'recentReviews' => $recentReviews,
            'isFavorite' => $isFavorite,
        ]);
    }

    public function order(Request $request)
    {
        $gigId = $request->get('serviceId');
        $packageId = $request->get('packageId');

        if (!$gigId) {
            return redirect()->route('service-hub.index')
                ->with('error', 'Please select a service first.');
        }

        $gig = Gig::with(['packages', 'user', 'images'])
            ->where('status', 'active')
            ->findOrFail($gigId);

        $package = $packageId ? GigPackage::findOrFail($packageId) : $gig->packages->first();

        // Format gig data
        $primaryImage = $gig->images->where('is_primary', true)->first()
            ?? $gig->images->first();
        $imageUrl = $primaryImage ? Storage::url($primaryImage->image_path) : null;

        $gigData = [
            'id' => $gig->id,
            'title' => $gig->title,
            'image' => $imageUrl,
            'seller' => [
                'id' => $gig->user->id,
                'name' => $gig->user->name,
                'avatar' => $gig->user->image ? Storage::url($gig->user->image) : null,
                'rating' => (float) $gig->rating,
            ],
        ];

        $packageData = [
            'id' => $package->id,
            'name' => $package->name,
            'price' => (float) $package->price,
            'deliveryTime' => $package->delivery_time,
            'features' => $package->features ?? [],
        ];

        return Inertia::render('frontend/service-hub/order', [
            'gig' => $gigData,
            'package' => $packageData,
        ]);
    }

    public function orderStore(Request $request): \Illuminate\Http\RedirectResponse
    {
        $validated = $request->validate([
            'gig_id' => 'required|exists:gigs,id',
            'package_id' => 'required|exists:gig_packages,id',
            'requirements' => 'required|string',
            'special_instructions' => 'nullable|string',
            'payment_method' => 'required|in:wallet,card',
        ]);

        try {
            $gig = Gig::with('packages')->findOrFail($validated['gig_id']);
            $package = GigPackage::findOrFail($validated['package_id']);

            // Calculate fees
            $platformFee = $package->price * 0.05; // 5% platform fee
            $sellerEarnings = $package->price - $platformFee;

            $order = ServiceOrder::create([
                'gig_id' => $gig->id,
                'buyer_id' => Auth::id(),
                'seller_id' => $gig->user_id,
                'package_id' => $package->id,
                'package_type' => $package->name,
                'amount' => $package->price,
                'platform_fee' => $platformFee,
                'seller_earnings' => $sellerEarnings,
                'requirements' => $validated['requirements'],
                'special_instructions' => $validated['special_instructions'] ?? null,
                'status' => 'pending',
                'payment_status' => $validated['payment_method'] === 'wallet' ? 'paid' : 'pending',
            ]);

            // TODO: Handle payment processing here

            return redirect()->route('service-hub.order.success')
                ->with('order_id', $order->id);
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Failed to place order: ' . $e->getMessage()]);
        }
    }

    public function myOrders(Request $request): Response
    {
        $query = ServiceOrder::with(['gig', 'seller:id,name,image', 'package'])
            ->where('buyer_id', Auth::id());

        // Filter by status
        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Search
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'LIKE', "%{$search}%")
                    ->orWhereHas('gig', function ($gq) use ($search) {
                        $gq->where('title', 'LIKE', "%{$search}%");
                    })
                    ->orWhereHas('seller', function ($sq) use ($search) {
                        $sq->where('name', 'LIKE', "%{$search}%");
                    });
            });
        }

        $orders = $query->with(['gig.images'])->orderBy('created_at', 'desc')->paginate(10);

        // Transform orders data
        $orders->getCollection()->transform(function ($order) {
            $gigImage = $order->gig->images->where('is_primary', true)->first()
                ?? $order->gig->images->first();
            $imageUrl = $gigImage ? Storage::url($gigImage->image_path) : null;

            return [
                'id' => $order->id,
                'orderNumber' => $order->order_number,
                'service' => [
                    'id' => $order->gig->id,
                    'title' => $order->gig->title,
                    'image' => $imageUrl,
                ],
                'seller' => [
                    'id' => $order->seller->id,
                    'name' => $order->seller->name,
                    'avatar' => $order->seller->image ? Storage::url($order->seller->image) : null,
                ],
                'package' => $order->package_type ?? 'Standard',
                'amount' => (float) $order->amount,
                'platformFee' => (float) $order->platform_fee,
                'total' => (float) ($order->amount + $order->platform_fee),
                'status' => $order->status,
                'paymentStatus' => $order->payment_status,
                'orderDate' => $order->created_at->format('Y-m-d'),
                'deliveryDate' => $order->created_at->copy()->addDays(3)->format('Y-m-d'), // TODO: Calculate from package delivery time
                'requirements' => $order->requirements,
                'deliverables' => $order->deliverables ?? [],
                'canReview' => $order->status === 'completed' && !ServiceReview::where('order_id', $order->id)->exists(),
                'canCancel' => in_array($order->status, ['pending', 'in_progress']),
            ];
        });

        return Inertia::render('frontend/service-hub/my-orders', [
            'orders' => $orders,
            'filters' => [
                'status' => $request->get('status', 'all'),
                'search' => $request->get('search', ''),
            ],
        ]);
    }

    public function sellerProfile(Request $request, $id): Response
    {
        $seller = \App\Models\User::with([
            'gigs' => function ($q) {
                $q->where('status', 'active')
                    ->with(['category', 'primaryImage'])
                    ->orderBy('created_at', 'desc');
            },
            'gigs.reviews',
        ])->findOrFail($id);

        // Calculate seller stats
        $totalSales = ServiceOrder::where('seller_id', $seller->id)
            ->where('status', 'completed')
            ->count();

        $totalReviews = ServiceReview::whereHas('order', function ($q) use ($seller) {
            $q->where('seller_id', $seller->id);
        })->count();

        $avgRating = ServiceReview::whereHas('order', function ($q) use ($seller) {
            $q->where('seller_id', $seller->id);
        })->avg('rating') ?? 0;

        $recentReviews = ServiceReview::with(['user:id,name,image', 'gig:id,title'])
            ->whereHas('order', function ($q) use ($seller) {
                $q->where('seller_id', $seller->id);
            })
            ->orderBy('created_at', 'desc')
            ->limit(3)
            ->get();

        return Inertia::render('frontend/service-hub/seller-profile', [
            'seller' => $seller,
            'stats' => [
                'totalSales' => $totalSales,
                'totalReviews' => $totalReviews,
                'avgRating' => round($avgRating, 1),
                'totalServices' => $seller->gigs->count(),
            ],
            'recentReviews' => $recentReviews,
        ]);
    }

    public function reviews(Request $request, $id): Response
    {
        $gig = Gig::with('category')->findOrFail($id);

        $reviews = ServiceReview::with('user:id,name,image')
            ->where('gig_id', $gig->id)
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        // Calculate rating distribution
        $ratingDistribution = [];
        for ($i = 5; $i >= 1; $i--) {
            $count = ServiceReview::where('gig_id', $gig->id)
                ->where('rating', $i)
                ->count();
            $total = $reviews->total();
            $ratingDistribution[$i] = $total > 0 ? round(($count / $total) * 100, 1) : 0;
        }

        return Inertia::render('frontend/service-hub/reviews', [
            'gig' => $gig,
            'reviews' => $reviews,
            'ratingDistribution' => $ratingDistribution,
        ]);
    }

    public function reviewsStore(Request $request, $id)
    {
        $validated = $request->validate([
            'order_id' => 'required|exists:service_orders,id',
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'required|string|max:1000',
        ]);

        try {
            $order = ServiceOrder::where('id', $validated['order_id'])
                ->where('buyer_id', Auth::id())
                ->where('status', 'completed')
                ->firstOrFail();

            // Check if review already exists
            if (ServiceReview::where('order_id', $order->id)->exists()) {
                return back()->withErrors(['error' => 'You have already reviewed this order.']);
            }

            ServiceReview::create([
                'gig_id' => $id,
                'order_id' => $order->id,
                'user_id' => Auth::id(),
                'rating' => $validated['rating'],
                'comment' => $validated['comment'],
                'is_verified' => true,
            ]);

            return back()->with('success', 'Review submitted successfully!');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Failed to submit review: ' . $e->getMessage()]);
        }
    }

    public function toggleFavorite(Request $request, $id)
    {
        $gig = Gig::findOrFail($id);

        $favorite = GigFavorite::where('user_id', Auth::id())
            ->where('gig_id', $gig->id)
            ->first();

        if ($favorite) {
            $favorite->delete();
            return response()->json(['favorited' => false]);
        } else {
            GigFavorite::create([
                'user_id' => Auth::id(),
                'gig_id' => $gig->id,
            ]);
            return response()->json(['favorited' => true]);
        }
    }
}
