<?php

namespace App\Http\Controllers;

use App\Models\Gig;
use App\Models\ServiceCategory;
use App\Models\GigPackage;
use App\Models\GigImage;
use App\Models\GigFavorite;
use App\Models\ServiceOrder;
use App\Models\ServiceReview;
use App\Models\ServiceSellerProfile;
use App\Models\ServiceChat;
use App\Models\ServiceChatMessage;
use App\Models\CustomOffer;
use App\Services\StripeConfigService;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;
use Stripe\Stripe;
use Stripe\Checkout\Session as StripeSession;

class ServiceHubController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Gig::with(['category', 'user.serviceSellerProfile', 'primaryImage', 'images'])
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

            // Get seller profile image if available, otherwise use user image
            $sellerProfile = $gig->user->serviceSellerProfile;
            $sellerAvatar = null;
            if ($sellerProfile && $sellerProfile->profile_image) {
                $sellerAvatar = Storage::url($sellerProfile->profile_image);
            } elseif ($gig->user->image) {
                $sellerAvatar = Storage::url($gig->user->image);
            }

            return [
                'id' => $gig->id,
                'slug' => $gig->slug,
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
                    'avatar' => $sellerAvatar,
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
        $totalUnread = 0;
        if (Auth::check()) {
            $favoriteIds = GigFavorite::where('user_id', Auth::id())
                ->pluck('gig_id')
                ->toArray();

            // Calculate total unread messages for service chats
            $chats = ServiceChat::where(function ($query) {
                $query->where('buyer_id', Auth::id())
                    ->orWhere('seller_id', Auth::id());
            })->get();

            $totalUnread = $chats->sum(function ($chat) {
                return $chat->unreadCountForUser(Auth::id());
            });
        }

        return Inertia::render('frontend/service-hub/index', [
            'gigs' => $gigs,
            'categories' => $categories,
            'favoriteIds' => $favoriteIds,
            'totalUnread' => $totalUnread,
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

    public function create(): Response|RedirectResponse
    {
        $user = Auth::user();

        // Check if user has a seller profile
        if (!$user->serviceSellerProfile) {
            return redirect()->route('service-hub.seller-profile.create')
                ->with('error', 'Please create a seller profile before creating a service.');
        }

        $categories = ServiceCategory::where('is_active', true)
            ->orderBy('sort_order')
            ->get();

        return Inertia::render('frontend/service-hub/create', [
            'categories' => $categories,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = Auth::user();

        // Check if user has a seller profile
        if (!$user->serviceSellerProfile) {
            return redirect()->route('service-hub.seller-profile.create')
                ->with('error', 'Please create a seller profile before creating a service.');
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'category_id' => 'required|exists:service_categories,id',
            'description' => 'required|string|max:500',
            'full_description' => 'nullable|string',
            'tags' => 'nullable|array',
            'tags.*' => 'string|max:50',
            'faqs' => 'nullable|array',
            'faqs.*.question' => 'required|string|max:255',
            'faqs.*.answer' => 'required|string|max:1000',
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
            // Format FAQs
            $faqs = [];
            if (isset($validated['faqs']) && is_array($validated['faqs'])) {
                foreach ($validated['faqs'] as $faq) {
                    if (!empty($faq['question']) && !empty($faq['answer'])) {
                        $faqs[] = [
                            'question' => $faq['question'],
                            'answer' => $faq['answer'],
                        ];
                    }
                }
            }

            $gig = Gig::create([
                'user_id' => Auth::id(),
                'category_id' => $validated['category_id'],
                'title' => $validated['title'],
                'description' => $validated['description'],
                'full_description' => $validated['full_description'] ?? null,
                'tags' => $validated['tags'] ?? [],
                'faqs' => $faqs,
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

            return redirect()->route('service-hub.show', $gig->slug)
                ->with('success', 'Service created successfully!');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Failed to create service: ' . $e->getMessage()]);
        }
    }

    public function edit(Request $request, $slug): Response|RedirectResponse
    {
        $gig = Gig::with(['category', 'packages', 'images'])
            ->where('slug', $slug)
            ->firstOrFail();

        // Check if user owns this service
        if ($gig->user_id !== Auth::id()) {
            abort(403, 'You do not have permission to edit this service.');
        }

        $categories = ServiceCategory::where('is_active', true)
            ->orderBy('sort_order')
            ->get();

        // Format existing images
        $existingImages = $gig->images->map(function ($image) {
            return [
                'id' => $image->id,
                'url' => Storage::url($image->image_path),
                'path' => $image->image_path,
            ];
        })->toArray();

        // Format packages
        $packages = $gig->packages->map(function ($package) {
            return [
                'id' => $package->id,
                'name' => $package->name,
                'price' => (float) $package->price,
                'deliveryTime' => $package->delivery_time,
                'description' => $package->description ?? '',
                'features' => $package->features ?? [],
            ];
        })->toArray();

        return Inertia::render('frontend/service-hub/edit', [
            'gig' => [
                'id' => $gig->id,
                'slug' => $gig->slug,
                'title' => $gig->title,
                'category_id' => $gig->category_id,
                'description' => $gig->description,
                'fullDescription' => $gig->full_description ?? '',
                'tags' => $gig->tags ?? [],
                'faqs' => $gig->faqs ?? [],
                'images' => $existingImages,
                'packages' => $packages,
            ],
            'categories' => $categories,
        ]);
    }

    public function update(Request $request, $slug): RedirectResponse
    {
        $gig = Gig::where('slug', $slug)->firstOrFail();

        // Check if user owns this service
        if ($gig->user_id !== Auth::id()) {
            abort(403, 'You do not have permission to update this service.');
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'category_id' => 'required|exists:service_categories,id',
            'description' => 'required|string|max:500',
            'full_description' => 'nullable|string',
            'tags' => 'nullable|array',
            'tags.*' => 'string|max:50',
            'faqs' => 'nullable|array',
            'faqs.*.question' => 'required|string|max:255',
            'faqs.*.answer' => 'required|string|max:1000',
            'packages' => 'required|array|min:1',
            'packages.*.name' => 'required|string|max:100',
            'packages.*.price' => 'required|numeric|min:0',
            'packages.*.delivery_time' => 'required|string',
            'packages.*.description' => 'nullable|string',
            'packages.*.features' => 'nullable|array',
            'packages.*.features.*' => 'string|max:255',
            'images' => 'nullable|array|max:5',
            'images.*' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'existing_images' => 'nullable|array',
            'existing_images.*' => 'nullable|string',
            'deleted_images' => 'nullable|array',
            'deleted_images.*' => 'nullable|integer',
        ]);

        try {
            // Format FAQs
            $faqs = [];
            if (isset($validated['faqs']) && is_array($validated['faqs'])) {
                foreach ($validated['faqs'] as $faq) {
                    if (!empty($faq['question']) && !empty($faq['answer'])) {
                        $faqs[] = [
                            'question' => $faq['question'],
                            'answer' => $faq['answer'],
                        ];
                    }
                }
            }

            // Update gig
            $gig->update([
                'category_id' => $validated['category_id'],
                'title' => $validated['title'],
                'description' => $validated['description'],
                'full_description' => $validated['full_description'] ?? null,
                'tags' => $validated['tags'] ?? [],
                'faqs' => $faqs,
                'price' => $validated['packages'][0]['price'] ?? 0,
                'delivery_time' => $validated['packages'][0]['delivery_time'] ?? '3 days',
            ]);

            // Handle deleted images
            if (isset($validated['deleted_images']) && is_array($validated['deleted_images'])) {
                foreach ($validated['deleted_images'] as $imageId) {
                    $image = GigImage::find($imageId);
                    if ($image && $image->gig_id === $gig->id) {
                        Storage::disk('public')->delete($image->image_path);
                        $image->delete();
                    }
                }
            }

            // Handle new images
            $existingImageCount = count($validated['existing_images'] ?? []);
            $newImageIndex = $existingImageCount;
            if ($request->hasFile('images')) {
                foreach ($request->file('images') as $index => $image) {
                    $imagePath = $image->store('gigs/' . $gig->id, 'public');
                    GigImage::create([
                        'gig_id' => $gig->id,
                        'image_path' => $imagePath,
                        'is_primary' => $existingImageCount === 0 && $index === 0,
                        'sort_order' => $newImageIndex + $index,
                    ]);
                }
            }

            // Update packages
            $packageIds = [];
            foreach ($validated['packages'] as $index => $packageData) {
                if (isset($packageData['id'])) {
                    // Update existing package
                    $package = GigPackage::where('id', $packageData['id'])
                        ->where('gig_id', $gig->id)
                        ->first();
                    if ($package) {
                        $package->update([
                            'name' => $packageData['name'],
                            'price' => $packageData['price'],
                            'delivery_time' => $packageData['delivery_time'],
                            'description' => $packageData['description'] ?? null,
                            'features' => $packageData['features'] ?? [],
                            'is_popular' => $index === 1,
                            'sort_order' => $index,
                        ]);
                        $packageIds[] = $package->id;
                    }
                } else {
                    // Create new package
                    $package = GigPackage::create([
                        'gig_id' => $gig->id,
                        'name' => $packageData['name'],
                        'price' => $packageData['price'],
                        'delivery_time' => $packageData['delivery_time'],
                        'description' => $packageData['description'] ?? null,
                        'features' => $packageData['features'] ?? [],
                        'is_popular' => $index === 1,
                        'sort_order' => $index,
                    ]);
                    $packageIds[] = $package->id;
                }
            }

            // Delete packages that are no longer in the list
            GigPackage::where('gig_id', $gig->id)
                ->whereNotIn('id', $packageIds)
                ->delete();

            return redirect()->route('service-hub.show', $gig->slug)
                ->with('success', 'Service updated successfully!');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Failed to update service: ' . $e->getMessage()]);
        }
    }

    public function show(Request $request, $slug): Response
    {
        $gig = Gig::with([
            'category',
            'user.serviceSellerProfile',
            'packages' => function ($q) {
                $q->orderBy('sort_order');
            },
            'images' => function ($q) {
                $q->orderBy('sort_order');
            },
            'reviews.user' => function ($q) {
                $q->select('id', 'name', 'image');
            },
        ])->where('slug', $slug)->firstOrFail();

        if ($gig->status !== 'active') {
            abort(404);
        }

        // Get recent reviews (only buyer reviews)
        $recentReviews = ServiceReview::with('user:id,name,image')
            ->where('gig_id', $gig->id)
            ->where('reviewer_type', 'buyer')
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

        // Calculate buyer reviews count (only buyer reviews should be counted)
        $buyerReviewsCount = ServiceReview::where('gig_id', $gig->id)
            ->where('reviewer_type', 'buyer')
            ->count();

        // Format gig data
        $gigData = [
            'id' => $gig->id,
            'slug' => $gig->slug,
            'title' => $gig->title,
            'description' => $gig->description,
            'fullDescription' => $gig->full_description ?? '',
            'price' => (float) $gig->price,
            'deliveryTime' => $gig->delivery_time,
            'rating' => (float) $gig->rating,
            'reviews' => $buyerReviewsCount, // Use actual buyer reviews count
            'category' => $gig->category->name ?? '',
            'tags' => $gig->tags ?? [],
            'faqs' => $gig->faqs ?? [],
            'images' => $images,
            'packages' => $packages,
            'seller' => [
                'id' => $gig->user->id,
                'name' => $gig->user->name,
                'avatar' => $gig->user->serviceSellerProfile && $gig->user->serviceSellerProfile->profile_image
                    ? Storage::url($gig->user->serviceSellerProfile->profile_image)
                    : ($gig->user->image ? Storage::url($gig->user->image) : null),
                'phone' => $gig->user->serviceSellerProfile ? $gig->user->serviceSellerProfile->phone : null,
            ],
        ];

        // Check if current user is the owner
        $isOwner = Auth::check() && $gig->user_id === Auth::id();

        // Get seller's gigs for offer creation
        $sellerGigs = [];
        if ($isOwner) {
            $sellerGigs = Gig::where('user_id', Auth::id())
                ->where('status', 'active')
                ->select('id', 'slug', 'title', 'description', 'price')
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($g) {
                    $primaryImage = $g->images()->where('is_primary', true)->first()
                        ?? $g->images()->first();
                    return [
                        'id' => $g->id,
                        'slug' => $g->slug,
                        'title' => $g->title,
                        'description' => $g->description,
                        'price' => (float) $g->price,
                        'image' => $primaryImage ? Storage::url($primaryImage->image_path) : null,
                    ];
                })
                ->toArray();
        }

        return Inertia::render('frontend/service-hub/show', [
            'gig' => $gigData,
            'recentReviews' => $recentReviews,
            'isFavorite' => $isFavorite,
            'isOwner' => $isOwner,
            'sellerGigs' => $sellerGigs,
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

        $gig = Gig::with(['packages', 'user.serviceSellerProfile', 'images'])
            ->where('status', 'active')
            ->findOrFail($gigId);

        $package = $packageId ? GigPackage::findOrFail($packageId) : $gig->packages->first();

        // Format gig data
        $primaryImage = $gig->images->where('is_primary', true)->first()
            ?? $gig->images->first();
        $imageUrl = $primaryImage ? Storage::url($primaryImage->image_path) : null;

        $gigData = [
            'id' => $gig->id,
            'slug' => $gig->slug,
            'title' => $gig->title,
            'image' => $imageUrl,
            'seller' => [
                'id' => $gig->user->id,
                'name' => $gig->user->name,
                'avatar' => $gig->user->serviceSellerProfile && $gig->user->serviceSellerProfile->profile_image
                    ? Storage::url($gig->user->serviceSellerProfile->profile_image)
                    : ($gig->user->image ? Storage::url($gig->user->image) : null),
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

    public function orderStore(Request $request)
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
            $user = Auth::user();

            // Calculate fees
            $platformFee = $package->price * 0.05; // 5% platform fee
            $sellerEarnings = $package->price - $platformFee;

            $order = ServiceOrder::create([
                'gig_id' => $gig->id,
                'buyer_id' => $user->id,
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

            // Handle wallet payment
            if ($validated['payment_method'] === 'wallet') {
                // TODO: Deduct from wallet balance
                return redirect()->route('service-hub.order.success')
                    ->with('order_id', $order->id);
            }

            // For card payments, return order ID so frontend can create checkout session
            // Check if this is an Inertia request
            if ($request->header('X-Inertia')) {
                return back()->with('order_id', $order->id);
            }

            // For API requests, return JSON with order ID
            return response()->json([
                'success' => true,
                'order_id' => $order->id,
                'message' => 'Order created successfully. Please create checkout session.',
            ]);
        } catch (\Exception $e) {
            Log::error('Service order creation failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return back()->withErrors(['error' => 'Failed to place order: ' . $e->getMessage()]);
        }
    }

    public function createCheckoutSession(Request $request)
    {
        $validated = $request->validate([
            'gig_id' => 'required|exists:gigs,id',
            'package_id' => 'required|exists:gig_packages,id',
            'requirements' => 'required|string',
            'special_instructions' => 'nullable|string',
        ]);

        try {
            $gig = Gig::with('packages')->findOrFail($validated['gig_id']);
            $package = GigPackage::findOrFail($validated['package_id']);
            $user = Auth::user();

            // Calculate fees
            $platformFee = $package->price * 0.05; // 5% platform fee
            $sellerEarnings = $package->price - $platformFee;
            $totalAmount = $package->price + $platformFee;

            // Step 1: Create the order
            $order = ServiceOrder::create([
                'gig_id' => $gig->id,
                'buyer_id' => $user->id,
                'seller_id' => $gig->user_id,
                'package_id' => $package->id,
                'package_type' => $package->name,
                'amount' => $package->price,
                'platform_fee' => $platformFee,
                'seller_earnings' => $sellerEarnings,
                'requirements' => $validated['requirements'],
                'special_instructions' => $validated['special_instructions'] ?? null,
                'status' => 'pending',
                'payment_status' => 'pending',
            ]);

            // Step 2: Create Stripe checkout session

            // Get Stripe credentials from database or fallback to .env
            $stripeEnv = StripeConfigService::getEnvironment();
            $credentials = StripeConfigService::getCredentials($stripeEnv);

            if ($credentials && !empty($credentials['secret_key'])) {
                Stripe::setApiKey($credentials['secret_key']);
            } else {
                // Fallback to .env
                Stripe::setApiKey(config('services.stripe.secret'));
            }

            // Get Stripe credentials from database or fallback to .env
            $stripeEnv = StripeConfigService::getEnvironment();
            $credentials = StripeConfigService::getCredentials($stripeEnv);

            if ($credentials && !empty($credentials['secret_key'])) {
                Stripe::setApiKey($credentials['secret_key']);
            } else {
                // Fallback to .env
                Stripe::setApiKey(config('services.stripe.secret'));
            }

            // Create Stripe checkout session
            $lineItems = [
                [
                    'price_data' => [
                        'currency' => 'usd',
                        'product_data' => [
                            'name' => $gig->title . ' - ' . $package->name,
                            'description' => 'Service Order: ' . $gig->title,
                        ],
                        'unit_amount' => (int)($totalAmount * 100), // Convert to cents
                    ],
                    'quantity' => 1,
                ],
            ];

            $session = StripeSession::create([
                'payment_method_types' => ['card'],
                'line_items' => $lineItems,
                'mode' => 'payment',
                'customer_email' => $user->email,
                'success_url' => route('service-hub.order.success') . '?session_id={CHECKOUT_SESSION_ID}',
                'cancel_url' => route('service-hub.order') . '?serviceId=' . $gig->id . '&packageId=' . $package->id,
                'metadata' => [
                    'order_id' => $order->id,
                    'user_id' => $user->id,
                    'gig_id' => $gig->id,
                    'package_id' => $package->id,
                    'type' => 'service_order',
                ],
            ]);

            // Store Stripe session ID in order when checkout session is created
            $order->update([
                'stripe_session_id' => $session->id,
            ]);

            // Return JSON response with checkout URL
            return response()->json([
                'success' => true,
                'url' => $session->url,
            ]);
        } catch (\Exception $e) {
            Log::error('Stripe checkout session creation failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'gig_id' => $validated['gig_id'] ?? null,
            ]);
            return response()->json([
                'success' => false,
                'error' => 'Failed to create checkout session: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function myOrders(Request $request): Response
    {
        $query = ServiceOrder::with(['gig', 'seller.serviceSellerProfile', 'package'])
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
                    'slug' => $order->gig->slug,
                    'title' => $order->gig->title,
                    'image' => $imageUrl,
                ],
                'seller' => [
                    'id' => $order->seller->id,
                    'name' => $order->seller->name,
                    'avatar' => $order->seller->serviceSellerProfile && $order->seller->serviceSellerProfile->profile_image
                        ? Storage::url($order->seller->serviceSellerProfile->profile_image)
                        : ($order->seller->image ? Storage::url($order->seller->image) : null),
                ],
                'package' => $order->package_type ?? 'Standard',
                'amount' => (float) $order->amount,
                'platformFee' => (float) $order->platform_fee,
                'total' => (float) ($order->amount + $order->platform_fee),
                'status' => $order->status,
                'paymentStatus' => $order->payment_status,
                'orderDate' => $order->created_at->format('Y-m-d'),
                'deliveryDate' => $order->created_at->copy()->addDays(3)->format('Y-m-d'), // TODO: Calculate from package delivery time
                'cancelledAt' => $order->cancelled_at ? $order->cancelled_at->format('Y-m-d H:i') : null,
                'cancellationReason' => $order->cancellation_reason,
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

    public function sellerOrders(Request $request): Response
    {
        $query = ServiceOrder::with(['gig', 'buyer', 'package'])
            ->where('seller_id', Auth::id());

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
                    ->orWhereHas('buyer', function ($bq) use ($search) {
                        $bq->where('name', 'LIKE', "%{$search}%");
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
                    'slug' => $order->gig->slug,
                    'title' => $order->gig->title,
                    'image' => $imageUrl,
                ],
                'buyer' => [
                    'id' => $order->buyer->id,
                    'name' => $order->buyer->name,
                    'avatar' => $order->buyer->image ? Storage::url($order->buyer->image) : null,
                ],
                'package' => $order->package_type ?? 'Standard',
                'amount' => (float) $order->amount,
                'platformFee' => (float) $order->platform_fee,
                'sellerEarnings' => (float) $order->seller_earnings,
                'total' => (float) ($order->amount + $order->platform_fee),
                'status' => $order->status,
                'paymentStatus' => $order->payment_status,
                'orderDate' => $order->created_at->format('Y-m-d'),
                'deliveryDate' => $order->created_at->copy()->addDays(3)->format('Y-m-d'),
                'deliveredAt' => $order->delivered_at ? $order->delivered_at->format('Y-m-d H:i') : null,
                'requirements' => $order->requirements,
                'specialInstructions' => $order->special_instructions,
                'deliverables' => $order->deliverables ?? [],
                'canDeliver' => in_array($order->status, ['pending', 'in_progress']),
                'canApprove' => $order->status === 'pending',
                'canReject' => $order->status === 'pending',
            ];
        });

        return Inertia::render('frontend/service-hub/seller-orders', [
            'orders' => $orders,
            'filters' => [
                'status' => $request->get('status', 'all'),
                'search' => $request->get('search', ''),
            ],
        ]);
    }

    public function orderDetail(Request $request, $orderId): Response
    {
        $order = ServiceOrder::with([
            'gig.images',
            'gig.category',
            'buyer',
            'seller.serviceSellerProfile',
            'package',
            'buyerReview',
            'sellerReview',
        ])->findOrFail($orderId);

        // Check if user has access to this order
        if ($order->buyer_id !== Auth::id() && $order->seller_id !== Auth::id()) {
            abort(403, 'You do not have permission to view this order.');
        }

        $isBuyer = $order->buyer_id === Auth::id();
        $isSeller = $order->seller_id === Auth::id();

        $gigImage = $order->gig->images->where('is_primary', true)->first()
            ?? $order->gig->images->first();
        $imageUrl = $gigImage ? Storage::url($gigImage->image_path) : null;

        $orderData = [
            'id' => $order->id,
            'orderNumber' => $order->order_number,
            'service' => [
                'id' => $order->gig->id,
                'slug' => $order->gig->slug,
                'title' => $order->gig->title,
                'description' => $order->gig->description,
                'image' => $imageUrl,
                'category' => $order->gig->category->name ?? '',
            ],
            'buyer' => [
                'id' => $order->buyer->id,
                'name' => $order->buyer->name,
                'avatar' => $order->buyer->image ? Storage::url($order->buyer->image) : null,
            ],
            'seller' => [
                'id' => $order->seller->id,
                'name' => $order->seller->name,
                'avatar' => $order->seller->serviceSellerProfile && $order->seller->serviceSellerProfile->profile_image
                    ? Storage::url($order->seller->serviceSellerProfile->profile_image)
                    : ($order->seller->image ? Storage::url($order->seller->image) : null),
            ],
            'package' => [
                'id' => $order->package_id,
                'name' => $order->package_type ?? 'Standard',
                'price' => (float) $order->amount,
            ],
            'amount' => (float) $order->amount,
            'platformFee' => (float) $order->platform_fee,
            'sellerEarnings' => (float) $order->seller_earnings,
            'total' => (float) ($order->amount + $order->platform_fee),
            'status' => $order->status,
            'paymentStatus' => $order->payment_status,
            'orderDate' => $order->created_at->format('Y-m-d H:i'),
            'deliveredAt' => $order->delivered_at ? $order->delivered_at->format('Y-m-d H:i') : null,
            'completedAt' => $order->completed_at ? $order->completed_at->format('Y-m-d H:i') : null,
            'cancelledAt' => $order->cancelled_at ? $order->cancelled_at->format('Y-m-d H:i') : null,
            'cancellationReason' => $order->cancellation_reason,
            'requirements' => $order->requirements,
            'specialInstructions' => $order->special_instructions,
            'deliverables' => $order->deliverables ?? [],
            'canDeliver' => $isSeller && in_array($order->status, ['pending', 'in_progress']),
            'canAcceptDelivery' => $isBuyer && $order->status === 'delivered',
            'canComplete' => $isBuyer && $order->status === 'delivered',
            'canApprove' => $isSeller && $order->status === 'pending',
            'canReject' => $isSeller && $order->status === 'pending',
            'canCancel' => in_array($order->status, ['pending', 'in_progress']),
            'canReview' => $isBuyer && $order->status === 'completed' && !$order->buyerReview,
            'canSellerReview' => $isSeller && $order->status === 'completed' && $order->buyerReview && !$order->sellerReview,
            'hasBuyerReview' => $order->buyerReview ? [
                'rating' => $order->buyerReview->rating,
                'comment' => $order->buyerReview->comment,
                'created_at' => $order->buyerReview->created_at->format('Y-m-d'),
            ] : null,
            'hasSellerReview' => $order->sellerReview ? [
                'rating' => $order->sellerReview->rating,
                'comment' => $order->sellerReview->comment,
                'created_at' => $order->sellerReview->created_at->format('Y-m-d'),
            ] : null,
        ];

        return Inertia::render('frontend/service-hub/order-detail', [
            'order' => $orderData,
            'isBuyer' => $isBuyer,
            'isSeller' => $isSeller,
        ]);
    }

    public function deliverOrder(Request $request, $orderId): RedirectResponse
    {
        $order = ServiceOrder::findOrFail($orderId);

        // Check if user is the seller
        if ($order->seller_id !== Auth::id()) {
            abort(403, 'Only the seller can deliver orders.');
        }

        // Check if order can be delivered
        if (!in_array($order->status, ['pending', 'in_progress'])) {
            return back()->withErrors(['error' => 'This order cannot be delivered in its current status.']);
        }

        $validated = $request->validate([
            'deliverables' => 'required|array|min:1',
            'deliverables.*.name' => 'required|string|max:255',
            'deliverables.*.description' => 'nullable|string|max:1000',
            'deliverables.*.file' => 'nullable|file|max:10240', // 10MB max
            'deliverables.*.url' => 'nullable|url',
            'deliverables.*.type' => 'nullable|string|max:50',
        ]);

        try {
            // Process deliverables with file uploads
            $processedDeliverables = [];
            foreach ($validated['deliverables'] as $index => $deliverable) {
                $deliverableData = [
                    'name' => $deliverable['name'],
                    'description' => $deliverable['description'] ?? null,
                    'type' => $deliverable['type'] ?? 'file',
                ];

                // Handle file upload
                if ($request->hasFile("deliverables.{$index}.file")) {
                    $file = $request->file("deliverables.{$index}.file");
                    $path = $file->store("orders/{$order->id}/deliverables", 'public');
                    $deliverableData['url'] = Storage::url($path);
                    $deliverableData['file_name'] = $file->getClientOriginalName();
                    $deliverableData['file_size'] = $file->getSize();
                    $deliverableData['mime_type'] = $file->getMimeType();
                } elseif (isset($deliverable['url'])) {
                    // If URL is provided instead of file
                    $deliverableData['url'] = $deliverable['url'];
                } else {
                    return back()->withErrors(['error' => "Deliverable {$index} must have either a file or URL."]);
                }

                $processedDeliverables[] = $deliverableData;
            }

            $order->markAsDelivered($processedDeliverables);

            return redirect()->route('service-hub.order.detail', $order->id)
                ->with('success', 'Order delivered successfully!');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Failed to deliver order: ' . $e->getMessage()]);
        }
    }

    public function acceptDelivery(Request $request, $orderId): RedirectResponse
    {
        $order = ServiceOrder::findOrFail($orderId);

        // Check if user is the buyer
        if ($order->buyer_id !== Auth::id()) {
            abort(403, 'Only the buyer can accept delivery.');
        }

        // Check if order is delivered
        if ($order->status !== 'delivered') {
            return back()->withErrors(['error' => 'This order is not in delivered status.']);
        }

        try {
            $order->markAsCompleted();

            return redirect()->route('service-hub.order.detail', $order->id)
                ->with('success', 'Order completed! You can now leave a review.');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Failed to accept delivery: ' . $e->getMessage()]);
        }
    }

    public function completeOrder(Request $request, $orderId): RedirectResponse
    {
        return $this->acceptDelivery($request, $orderId);
    }

    public function approveOrder(Request $request, $orderId): RedirectResponse
    {
        $order = ServiceOrder::findOrFail($orderId);

        // Check if user is the seller
        if ($order->seller_id !== Auth::id()) {
            abort(403, 'Only the seller can approve this order.');
        }

        // Check if order is pending
        if ($order->status !== 'pending') {
            return back()->withErrors(['error' => 'Only pending orders can be approved.']);
        }

        try {
            $order->update([
                'status' => 'in_progress',
            ]);

            return redirect()->route('service-hub.seller-orders')
                ->with('success', 'Order approved successfully! You can now start working on it.');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Failed to approve order: ' . $e->getMessage()]);
        }
    }

    public function rejectOrder(Request $request, $orderId): RedirectResponse
    {
        $order = ServiceOrder::findOrFail($orderId);

        // Check if user is the seller
        if ($order->seller_id !== Auth::id()) {
            abort(403, 'Only the seller can reject this order.');
        }

        // Check if order is pending
        if ($order->status !== 'pending') {
            return back()->withErrors(['error' => 'Only pending orders can be rejected.']);
        }

        $validated = $request->validate([
            'rejection_reason' => 'nullable|string|max:500',
        ]);

        try {
            $order->update([
                'status' => 'cancelled',
                'cancelled_at' => now(),
                'cancellation_reason' => $validated['rejection_reason'] ?? 'Rejected by seller',
            ]);

            // If payment was made, handle refund logic here if needed
            // For now, we'll just cancel the order

            return redirect()->route('service-hub.seller-orders')
                ->with('success', 'Order rejected successfully.');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Failed to reject order: ' . $e->getMessage()]);
        }
    }

    public function orderSuccess(Request $request): Response
    {
        $sessionId = $request->get('session_id');
        $orderId = null;
        $paymentStatus = 'pending';

        if ($sessionId) {
            try {
                // Get Stripe credentials
                $stripeEnv = StripeConfigService::getEnvironment();
                $credentials = StripeConfigService::getCredentials($stripeEnv);

                if ($credentials && !empty($credentials['secret_key'])) {
                    Stripe::setApiKey($credentials['secret_key']);
                } else {
                    Stripe::setApiKey(config('services.stripe.secret'));
                }

                // Retrieve session from Stripe
                $session = StripeSession::retrieve($sessionId);

                // Convert Stripe session object to array for storage
                $stripeResponse = [
                    'session_id' => $session->id,
                    'payment_status' => $session->payment_status,
                    'payment_intent' => $session->payment_intent,
                    'customer_email' => $session->customer_email,
                    'amount_total' => $session->amount_total,
                    'currency' => $session->currency,
                    'metadata' => $session->metadata ? (array) $session->metadata : null,
                    'created' => $session->created,
                    'retrieved_at' => now()->toIso8601String(),
                ];

                if ($session->payment_status === 'paid' && isset($session->metadata->order_id)) {
                    $orderId = $session->metadata->order_id;
                    $order = ServiceOrder::find($orderId);

                    if ($order && $order->buyer_id === Auth::id()) {
                        // Update order payment status and store Stripe response
                        $order->update([
                            'payment_status' => 'paid',
                            'stripe_response' => $stripeResponse,
                            'stripe_session_id' => $sessionId,
                        ]);
                        $paymentStatus = 'paid';
                    }
                } elseif (isset($session->metadata->order_id)) {
                    // Store Stripe response even if payment is not completed yet
                    $orderId = $session->metadata->order_id;
                    $order = ServiceOrder::find($orderId);

                    if ($order && $order->buyer_id === Auth::id()) {
                        $order->update([
                            'stripe_response' => $stripeResponse,
                            'stripe_session_id' => $sessionId,
                        ]);
                    }
                }
            } catch (\Exception $e) {
                Log::error('Stripe session retrieval failed', [
                    'session_id' => $sessionId,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return Inertia::render('frontend/service-hub/order-success', [
            'order_id' => $orderId,
            'payment_status' => $paymentStatus,
            'session_id' => $sessionId,
        ]);
    }

    public function sellerProfile(Request $request, $id): Response
    {
        $seller = \App\Models\User::with([
            'gigs' => function ($q) {
                $q->where('status', 'active')
                    ->with(['category', 'images', 'packages', 'reviews'])
                    ->orderBy('created_at', 'desc');
            },
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

        $sellerProfile = $seller->serviceSellerProfile;

        // Transform gigs to services format
        $services = $seller->gigs->map(function ($gig) {
            $primaryImage = $gig->images->where('is_primary', true)->first()
                ?? $gig->images->first();
            $imageUrl = $primaryImage ? Storage::url($primaryImage->image_path) : null;

            // Get cheapest package price or base price
            $price = $gig->packages->min('price') ?? $gig->price ?? 0;

            return [
                'id' => $gig->id,
                'slug' => $gig->slug,
                'title' => $gig->title,
                'price' => (float) $price,
                'rating' => (float) $gig->rating ?? 0,
                'reviews' => $gig->reviews->count(),
                'image' => $imageUrl,
                'category' => $gig->category->name ?? '',
            ];
        })->toArray();

        // Transform seller data
        $sellerAvatar = null;
        if ($sellerProfile && $sellerProfile->profile_image) {
            $sellerAvatar = Storage::url($sellerProfile->profile_image);
        } elseif ($seller->image) {
            $sellerAvatar = Storage::url($seller->image);
        }

        $sellerData = [
            'id' => $seller->id,
            'name' => $seller->name,
            'avatar' => $sellerAvatar,
            'description' => $sellerProfile?->bio ?? '',
        ];

        // Transform recent reviews
        $transformedReviews = $recentReviews->map(function ($review) {
            return [
                'id' => $review->id,
                'user' => [
                    'name' => $review->user->name,
                    'avatar' => $review->user->image ? Storage::url($review->user->image) : null,
                ],
                'rating' => $review->rating,
                'comment' => $review->comment,
                'service' => $review->gig->title ?? '',
                'date' => $review->created_at->diffForHumans(),
            ];
        })->toArray();

        return Inertia::render('frontend/service-hub/seller-profile', [
            'seller' => $sellerData,
            'sellerProfile' => $sellerProfile,
            'services' => $services,
            'stats' => [
                'totalSales' => $totalSales,
                'totalReviews' => $totalReviews,
                'avgRating' => round($avgRating, 1),
                'totalServices' => $seller->gigs->count(),
                'repeatBuyers' => 0, // Can be calculated later
                'onTimeDelivery' => 95, // Can be calculated later
                'orderCompletion' => 98, // Can be calculated later
            ],
            'recentReviews' => $transformedReviews,
            'isOwner' => Auth::check() && Auth::id() == $seller->id,
        ]);
    }

    public function sellerReviews(Request $request, $id): Response
    {
        $seller = \App\Models\User::findOrFail($id);
        $sellerProfile = $seller->serviceSellerProfile;

        $reviews = ServiceReview::with(['user:id,name,image', 'gig:id,title,slug'])
            ->whereHas('order', function ($q) use ($seller) {
                $q->where('seller_id', $seller->id);
            })
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        // Calculate rating distribution
        $ratingDistribution = [];
        $totalReviews = ServiceReview::whereHas('order', function ($q) use ($seller) {
            $q->where('seller_id', $seller->id);
        })->count();

        for ($i = 5; $i >= 1; $i--) {
            $count = ServiceReview::whereHas('order', function ($q) use ($seller) {
                $q->where('seller_id', $seller->id);
            })->where('rating', $i)->count();
            $ratingDistribution[$i] = $totalReviews > 0 ? round(($count / $totalReviews) * 100, 1) : 0;
        }

        $avgRating = ServiceReview::whereHas('order', function ($q) use ($seller) {
            $q->where('seller_id', $seller->id);
        })->avg('rating') ?? 0;

        // Transform seller data
        $sellerAvatar = null;
        if ($sellerProfile && $sellerProfile->profile_image) {
            $sellerAvatar = Storage::url($sellerProfile->profile_image);
        } elseif ($seller->image) {
            $sellerAvatar = Storage::url($seller->image);
        }

        $sellerData = [
            'id' => $seller->id,
            'name' => $seller->name,
            'avatar' => $sellerAvatar,
        ];

        // Transform reviews
        $transformedReviews = $reviews->getCollection()->map(function ($review) {
            return [
                'id' => $review->id,
                'user' => [
                    'name' => $review->user->name,
                    'avatar' => $review->user->image ? Storage::url($review->user->image) : null,
                ],
                'rating' => $review->rating,
                'comment' => $review->comment,
                'service' => [
                    'id' => $review->gig->id,
                    'title' => $review->gig->title,
                    'slug' => $review->gig->slug,
                ],
                'date' => $review->created_at->diffForHumans(),
                'created_at' => $review->created_at->format('Y-m-d H:i:s'),
            ];
        })->toArray();

        return Inertia::render('frontend/service-hub/seller-reviews', [
            'seller' => $sellerData,
            'reviews' => [
                'data' => $transformedReviews,
                'current_page' => $reviews->currentPage(),
                'last_page' => $reviews->lastPage(),
                'per_page' => $reviews->perPage(),
                'total' => $reviews->total(),
            ],
            'ratingDistribution' => $ratingDistribution,
            'avgRating' => round($avgRating, 1),
            'totalReviews' => $totalReviews,
        ]);
    }

    public function reviews(Request $request, $slug): Response
    {
        $gig = Gig::with('category')->where('slug', $slug)->firstOrFail();

        $query = ServiceReview::with('user:id,name,image')
            ->where('gig_id', $gig->id)
            ->where('reviewer_type', 'buyer');

        // Handle sorting
        $sortBy = $request->get('sort_by', 'most_recent');
        switch ($sortBy) {
            case 'most_helpful':
                $query->orderBy('helpful_count', 'desc')->orderBy('created_at', 'desc');
                break;
            case 'highest_rated':
                $query->orderBy('rating', 'desc')->orderBy('created_at', 'desc');
                break;
            case 'lowest_rated':
                $query->orderBy('rating', 'asc')->orderBy('created_at', 'desc');
                break;
            case 'most_recent':
            default:
                $query->orderBy('created_at', 'desc');
                break;
        }

        $reviews = $query->paginate(10);

        // Calculate rating distribution (only for buyer reviews)
        $ratingDistribution = [];
        $totalBuyerReviews = ServiceReview::where('gig_id', $gig->id)
            ->where('reviewer_type', 'buyer')
            ->count();

        for ($i = 5; $i >= 1; $i--) {
            $count = ServiceReview::where('gig_id', $gig->id)
                ->where('reviewer_type', 'buyer')
                ->where('rating', $i)
                ->count();
            $ratingDistribution[$i] = $totalBuyerReviews > 0 ? round(($count / $totalBuyerReviews) * 100, 1) : 0;
        }

        // Format gig data
        $gigData = [
            'id' => $gig->id,
            'slug' => $gig->slug,
            'title' => $gig->title,
            'rating' => (float) $gig->rating ?? 0,
            'totalReviews' => $gig->reviews_count ?? 0,
        ];

        // Transform reviews
        $transformedReviews = $reviews->getCollection()->map(function ($review) {
            return [
                'id' => $review->id,
                'user' => [
                    'name' => $review->user->name,
                    'avatar' => $review->user->image ? Storage::url($review->user->image) : null,
                ],
                'rating' => $review->rating,
                'comment' => $review->comment,
                'date' => $review->created_at->diffForHumans(),
                'helpful' => $review->helpful_count ?? 0,
                'verified' => $review->is_verified ?? false,
            ];
        })->toArray();

        return Inertia::render('frontend/service-hub/reviews', [
            'gig' => $gigData,
            'reviews' => [
                'data' => $transformedReviews,
                'current_page' => $reviews->currentPage(),
                'last_page' => $reviews->lastPage(),
                'per_page' => $reviews->perPage(),
                'total' => $reviews->total(),
            ],
            'ratingDistribution' => $ratingDistribution,
        ]);
    }

    public function reviewsStore(Request $request, $slug)
    {
        $validated = $request->validate([
            'order_id' => 'required|exists:service_orders,id',
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'required|string|max:1000',
        ]);

        try {
            $gig = Gig::where('slug', $slug)->firstOrFail();
            $order = ServiceOrder::where('id', $validated['order_id'])
                ->where('buyer_id', Auth::id())
                ->where('status', 'completed')
                ->firstOrFail();

            // Check if review already exists
            if (ServiceReview::where('order_id', $order->id)->exists()) {
                return back()->withErrors(['error' => 'You have already reviewed this order.']);
            }

            ServiceReview::create([
                'gig_id' => $gig->id,
                'order_id' => $order->id,
                'user_id' => Auth::id(),
                'reviewer_type' => 'buyer',
                'rating' => $validated['rating'],
                'comment' => $validated['comment'],
                'is_verified' => true,
            ]);

            return back()->with('success', 'Review submitted successfully!');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Failed to submit review: ' . $e->getMessage()]);
        }
    }

    public function sellerReviewStore(Request $request, $orderId)
    {
        $validated = $request->validate([
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'required|string|max:1000',
        ]);

        try {
            $order = ServiceOrder::findOrFail($orderId);

            // Check if user is the seller
            if ($order->seller_id !== Auth::id()) {
                abort(403, 'Only the seller can submit a seller review.');
            }

            // Check if order is completed
            if ($order->status !== 'completed') {
                return back()->withErrors(['error' => 'Order must be completed before seller can review.']);
            }

            // Check if buyer has reviewed
            if (!$order->buyerReview) {
                return back()->withErrors(['error' => 'Buyer must review first before seller can review.']);
            }

            // Check if seller review already exists
            if ($order->sellerReview) {
                return back()->withErrors(['error' => 'You have already reviewed this order.']);
            }

            ServiceReview::create([
                'gig_id' => $order->gig_id,
                'order_id' => $order->id,
                'user_id' => Auth::id(),
                'reviewer_type' => 'seller',
                'rating' => $validated['rating'],
                'comment' => $validated['comment'],
                'is_verified' => true,
            ]);

            return redirect()->route('service-hub.order.detail', $order->id)
                ->with('success', 'Seller review submitted successfully!');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Failed to submit review: ' . $e->getMessage()]);
        }
    }

    public function toggleFavorite(Request $request, $slug)
    {
        $gig = Gig::where('slug', $slug)->firstOrFail();

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

    public function sellerProfileCreate(): Response|RedirectResponse
    {
        $user = Auth::user();

        // If user already has a seller profile, redirect to edit
        if ($user->serviceSellerProfile) {
            return redirect()->route('service-hub.seller-profile.edit')
                ->with('info', 'You already have a seller profile. You can update it here.');
        }

        return Inertia::render('frontend/service-hub/seller-profile/create');
    }

    public function sellerProfileStore(Request $request): RedirectResponse
    {
        $user = Auth::user();

        // Check if user already has a seller profile
        if ($user->serviceSellerProfile) {
            return redirect()->route('service-hub.seller-profile.edit')
                ->with('error', 'You already have a seller profile.');
        }

        $validated = $request->validate([
            'profile_image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'bio' => 'required|string|max:1000',
            'location' => 'nullable|string|max:255',
            'timezone' => 'nullable|string|max:100',
            'phone' => 'nullable|string|max:20',
            'skills' => 'nullable|array',
            'skills.*' => 'string|max:50',
            'languages' => 'nullable|array',
            'languages.*.name' => 'nullable|string|max:100',
            'languages.*.level' => 'nullable|in:basic,conversational,fluent,native',
            'education' => 'nullable|array',
            'education.*.institution' => 'nullable|string|max:255',
            'education.*.degree' => 'nullable|string|max:255',
            'education.*.year' => 'nullable|integer|min:1900|max:' . date('Y'),
            'experience' => 'nullable|array',
            'experience.*.company' => 'nullable|string|max:255',
            'experience.*.position' => 'nullable|string|max:255',
            'experience.*.duration' => 'nullable|string|max:100',
            'response_time' => 'nullable|string|max:50',
            'website' => 'nullable|url|max:255',
            'linkedin' => 'nullable|url|max:255',
            'twitter' => 'nullable|url|max:255',
            'facebook' => 'nullable|url|max:255',
            'instagram' => 'nullable|url|max:255',
        ]);

        // Handle profile image upload
        $profileImage = null;
        if ($request->hasFile('profile_image')) {
            $profileImage = $request->file('profile_image')->store('seller-profiles', 'public');
        }

        $profile = ServiceSellerProfile::create([
            'user_id' => $user->id,
            'bio' => $validated['bio'],
            'location' => $validated['location'] ?? null,
            'timezone' => $validated['timezone'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'skills' => $validated['skills'] ?? [],
            'languages' => $validated['languages'] ?? [],
            'education' => $validated['education'] ?? [],
            'experience' => $validated['experience'] ?? [],
            'response_time' => $validated['response_time'] ?? null,
            'website' => $validated['website'] ?? null,
            'linkedin' => $validated['linkedin'] ?? null,
            'twitter' => $validated['twitter'] ?? null,
            'facebook' => $validated['facebook'] ?? null,
            'instagram' => $validated['instagram'] ?? null,
            'profile_image' => $profileImage,
            'member_since' => now()->format('Y-m-d'),
        ]);

        return redirect()->route('service-hub.seller.profile', $user->id)
            ->with('success', 'Seller profile created successfully!');
    }

    public function sellerProfileEdit(): Response|RedirectResponse
    {
        $user = Auth::user();
        $profile = $user->serviceSellerProfile;

        if (!$profile) {
            return redirect()->route('service-hub.seller-profile.create')
                ->with('error', 'Please create a seller profile first.');
        }

        return Inertia::render('frontend/service-hub/seller-profile/edit', [
            'profile' => [
                'id' => $profile->id,
                'bio' => $profile->bio,
                'location' => $profile->location,
                'timezone' => $profile->timezone,
                'phone' => $profile->phone,
                'skills' => $profile->skills ?? [],
                'languages' => $profile->languages ?? [],
                'education' => $profile->education ?? [],
                'experience' => $profile->experience ?? [],
                'response_time' => $profile->response_time,
                'website' => $profile->website,
                'linkedin' => $profile->linkedin,
                'twitter' => $profile->twitter,
                'facebook' => $profile->facebook,
                'instagram' => $profile->instagram,
                'profile_image' => $profile->profile_image,
            ],
        ]);
    }

    public function sellerProfileUpdate(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $profile = $user->serviceSellerProfile;

        if (!$profile) {
            return redirect()->route('service-hub.seller-profile.create')
                ->with('error', 'Please create a seller profile first.');
        }

        $validated = $request->validate([
            'profile_image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'bio' => 'required|string|max:1000',
            'location' => 'nullable|string|max:255',
            'timezone' => 'nullable|string|max:100',
            'phone' => 'nullable|string|max:20',
            'skills' => 'nullable|array',
            'skills.*' => 'string|max:50',
            'languages' => 'nullable|array',
            'languages.*.name' => 'nullable|string|max:100',
            'languages.*.level' => 'nullable|in:basic,conversational,fluent,native',
            'education' => 'nullable|array',
            'education.*.institution' => 'nullable|string|max:255',
            'education.*.degree' => 'nullable|string|max:255',
            'education.*.year' => 'nullable|integer|min:1900|max:' . date('Y'),
            'experience' => 'nullable|array',
            'experience.*.company' => 'nullable|string|max:255',
            'experience.*.position' => 'nullable|string|max:255',
            'experience.*.duration' => 'nullable|string|max:100',
            'response_time' => 'nullable|string|max:50',
            'website' => 'nullable|url|max:255',
            'linkedin' => 'nullable|url|max:255',
            'twitter' => 'nullable|url|max:255',
            'facebook' => 'nullable|url|max:255',
            'instagram' => 'nullable|url|max:255',
        ]);

        // Handle profile image upload
        $updateData = [
            'bio' => $validated['bio'],
            'location' => $validated['location'] ?? null,
            'timezone' => $validated['timezone'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'skills' => $validated['skills'] ?? [],
            'languages' => $validated['languages'] ?? [],
            'education' => $validated['education'] ?? [],
            'experience' => $validated['experience'] ?? [],
            'response_time' => $validated['response_time'] ?? null,
            'website' => $validated['website'] ?? null,
            'linkedin' => $validated['linkedin'] ?? null,
            'twitter' => $validated['twitter'] ?? null,
            'facebook' => $validated['facebook'] ?? null,
            'instagram' => $validated['instagram'] ?? null,
        ];

        if ($request->hasFile('profile_image')) {
            // Delete old image if exists
            if ($profile->profile_image) {
                Storage::disk('public')->delete($profile->profile_image);
            }
            $updateData['profile_image'] = $request->file('profile_image')->store('seller-profiles', 'public');
        }

        $profile->update($updateData);

        return redirect()->route('service-hub.seller.profile', $user->id)
            ->with('success', 'Seller profile updated successfully!');
    }

    public function createOrGetServiceChat(Request $request, $slug)
    {
        $gig = Gig::where('slug', $slug)->firstOrFail();
        $buyerId = Auth::id();
        $sellerId = $gig->user_id;

        if ($buyerId === $sellerId) {
            return response()->json(['error' => 'You cannot chat with yourself.'], 403);
        }

        // Find or create service chat
        $serviceChat = ServiceChat::firstOrCreate(
            [
                'buyer_id' => $buyerId,
                'seller_id' => $sellerId,
            ],
            [
                'buyer_read' => true,
                'seller_read' => false,
            ]
        );

        // Load relationships
        $serviceChat->load([
            'buyer:id,name,image',
            'seller:id,name,image',
            'latestMessage.user:id,name,image',
        ]);

        return response()->json([
            'chat' => [
                'id' => $serviceChat->id,
                'buyer' => [
                    'id' => $serviceChat->buyer->id,
                    'name' => $serviceChat->buyer->name,
                    'avatar' => $serviceChat->buyer->image ? Storage::url($serviceChat->buyer->image) : null,
                ],
                'seller' => [
                    'id' => $serviceChat->seller->id,
                    'name' => $serviceChat->seller->name,
                    'avatar' => $serviceChat->seller->image ? Storage::url($serviceChat->seller->image) : null,
                ],
                'last_message' => $serviceChat->latestMessage->first() ? [
                    'message' => $serviceChat->latestMessage->first()->message,
                    'created_at' => $serviceChat->latestMessage->first()->created_at->toISOString(),
                    'user' => [
                        'id' => $serviceChat->latestMessage->first()->user->id,
                        'name' => $serviceChat->latestMessage->first()->user->name,
                    ],
                ] : null,
                'unread_count' => $serviceChat->unreadCountForUser($buyerId),
            ],
        ]);
    }

    public function getServiceChatMessages(Request $request, $chatId)
    {
        $serviceChat = ServiceChat::with(['buyer', 'seller'])
            ->where(function ($query) {
                $query->where('buyer_id', Auth::id())
                    ->orWhere('seller_id', Auth::id());
            })
            ->findOrFail($chatId);

        $allMessages = ServiceChatMessage::where('service_chat_id', $chatId)
            ->orderBy('created_at', 'asc')
            ->get();

        Log::info('ServiceChat Messages Query', [
            'chat_id' => $chatId,
            'total_messages' => $allMessages->count(),
            'message_ids' => $allMessages->pluck('id')->toArray(),
            'auth_id' => Auth::id(),
        ]);

        $messages = $allMessages->map(function ($message) {
                // Load user directly
                $user = \App\Models\User::select('id', 'name', 'image')->find($message->user_id);

                Log::info('Processing message', [
                    'message_id' => $message->id,
                    'user_id' => $message->user_id,
                    'has_user' => $user !== null,
                    'is_mine' => $message->user_id === Auth::id(),
                ]);

                return [
                    'id' => $message->id,
                    'user_id' => $message->user_id,
                    'user' => $user ? [
                        'id' => $user->id,
                        'name' => $user->name,
                        'avatar' => $user->image ? Storage::url($user->image) : null,
                    ] : null,
                    'message' => $message->message,
                    'attachments' => $message->attachments ?? [],
                    'created_at' => $message->created_at->toISOString(),
                    'is_mine' => $message->user_id === Auth::id(),
                ];
            });

        // Convert to array to ensure all messages are included
        $messagesArray = $messages->values()->toArray();

        Log::info('ServiceChat Messages Response', [
            'total_messages_returned' => count($messagesArray),
            'message_ids' => array_column($messagesArray, 'id'),
        ]);

        // Mark messages as read
        if (Auth::id() === $serviceChat->buyer_id) {
            $serviceChat->update(['buyer_read' => true]);
        } else {
            $serviceChat->update(['seller_read' => true]);
        }

        ServiceChatMessage::where('service_chat_id', $chatId)
            ->where('user_id', '!=', Auth::id())
            ->update(['is_read' => true]);

        return response()->json(['messages' => $messagesArray]);
    }

    public function sendServiceChatMessage(Request $request, $chatId)
    {
        $serviceChat = ServiceChat::where(function ($query) {
            $query->where('buyer_id', Auth::id())
                ->orWhere('seller_id', Auth::id());
        })->findOrFail($chatId);

        $request->validate([
            'message' => 'required|string|max:2000',
            'attachments.*' => 'nullable|file|max:10240',
        ]);

        $attachmentsData = [];
        if ($request->hasFile('attachments')) {
            foreach ($request->file('attachments') as $file) {
                $path = $file->store('service_chat_attachments', 'public');
                $attachmentsData[] = [
                    'name' => $file->getClientOriginalName(),
                    'url' => Storage::url($path),
                    'type' => $file->getClientMimeType(),
                    'size' => $file->getSize(),
                ];
            }
        }

        $message = ServiceChatMessage::create([
            'service_chat_id' => $chatId,
            'user_id' => Auth::id(),
            'message' => $request->input('message'),
            'attachments' => $attachmentsData,
            'is_read' => false,
        ]);

        // Update chat last message time and read status
        $isBuyer = Auth::id() === $serviceChat->buyer_id;
        $serviceChat->update([
            'last_message_at' => now(),
            $isBuyer ? 'buyer_read' : 'seller_read' => true,
            !$isBuyer ? 'buyer_read' : 'seller_read' => false,
        ]);

        // Reload the message with user relationship to ensure it's fresh
        $message->refresh();
        $message->load(['user' => function ($query) {
            $query->select('id', 'name', 'image');
        }]);

        // Ensure user is loaded - if not, load it again
        if (!$message->user) {
            $message->load('user:id,name,image');
        }

        // Double check user exists
        if (!$message->user) {
            \Illuminate\Support\Facades\Log::error('Message created but user not found', [
                'message_id' => $message->id,
                'user_id' => $message->user_id,
                'chat_id' => $chatId,
            ]);
            return response()->json(['error' => 'User not found for message'], 500);
        }

        return response()->json([
            'message' => [
                'id' => $message->id,
                'user_id' => $message->user_id,
                'user' => [
                    'id' => $message->user->id,
                    'name' => $message->user->name,
                    'avatar' => $message->user->image ? Storage::url($message->user->image) : null,
                ],
                'message' => $message->message,
                'attachments' => $message->attachments ?? [],
                'created_at' => $message->created_at->toISOString(),
                'is_mine' => true,
            ],
        ]);
    }

    public function getServiceChats(Request $request)
    {
        $chats = ServiceChat::with([
            'buyer:id,name,image',
            'seller:id,name,image',
            'latestMessage.user:id,name,image',
        ])
            ->where(function ($query) {
                $query->where('buyer_id', Auth::id())
                    ->orWhere('seller_id', Auth::id());
            })
            ->orderBy('last_message_at', 'desc')
            ->get()
            ->map(function ($chat) {
                $latestMessage = $chat->latestMessage->first();
                $otherUser = Auth::id() === $chat->buyer_id ? $chat->seller : $chat->buyer;

                return [
                    'id' => $chat->id,
                    'other_user' => [
                        'id' => $otherUser->id,
                        'name' => $otherUser->name,
                        'avatar' => $otherUser->image ? Storage::url($otherUser->image) : null,
                    ],
                    'last_message' => $latestMessage ? [
                        'message' => $latestMessage->message,
                        'created_at' => $latestMessage->created_at->toISOString(),
                        'user' => [
                            'id' => $latestMessage->user->id,
                            'name' => $latestMessage->user->name,
                        ],
                    ] : null,
                    'unread_count' => $chat->unreadCountForUser(Auth::id()),
                    'updated_at' => $chat->updated_at->toISOString(),
                ];
            });

        $totalUnread = array_sum(array_column($chats->toArray(), 'unread_count'));

        return response()->json([
            'chats' => $chats,
            'total_unread' => $totalUnread,
        ]);
    }

    public function getUnreadCount(Request $request)
    {

        if (!Auth::check()) {
            return response()->json(['total_unread' => 0]);
        }

        $chats = ServiceChat::where(function ($query) {
            $query->where('buyer_id', Auth::id())
                ->orWhere('seller_id', Auth::id());
        })->get();

        $totalUnread = $chats->sum(function ($chat) {
            return $chat->unreadCountForUser(Auth::id());
        });

        return response()->json([
            'total_unread' => $totalUnread,
        ]);
    }

    public function chats(Request $request): Response
    {
        $chats = ServiceChat::with([
            'buyer:id,name,image',
            'seller:id,name,image',
            'latestMessage.user:id,name,image',
        ])
            ->where(function ($query) {
                $query->where('buyer_id', Auth::id())
                    ->orWhere('seller_id', Auth::id());
            })
            ->orderBy('last_message_at', 'desc')
            ->get()
            ->map(function ($chat) {
                $latestMessage = $chat->latestMessage->first();
                $otherUser = Auth::id() === $chat->buyer_id ? $chat->seller : $chat->buyer;

                return [
                    'id' => $chat->id,
                    'other_user' => [
                        'id' => $otherUser->id,
                        'name' => $otherUser->name,
                        'avatar' => $otherUser->image ? Storage::url($otherUser->image) : null,
                    ],
                    'last_message' => $latestMessage ? [
                        'message' => $latestMessage->message,
                        'created_at' => $latestMessage->created_at->toISOString(),
                        'user' => [
                            'id' => $latestMessage->user->id,
                            'name' => $latestMessage->user->name,
                        ],
                    ] : null,
                    'unread_count' => $chat->unreadCountForUser(Auth::id()),
                    'updated_at' => $chat->updated_at->toISOString(),
                ];
            });

        $totalUnread = array_sum(array_column($chats->toArray(), 'unread_count'));

        return Inertia::render('frontend/service-hub/chats', [
            'chats' => $chats,
            'total_unread' => $totalUnread,
        ]);
    }

    public function serviceChat(Request $request, $chatId)
    {
        $serviceChat = ServiceChat::with([
            'buyer:id,name,image',
            'seller:id,name,image',
        ])
            ->where(function ($query) {
                $query->where('buyer_id', Auth::id())
                    ->orWhere('seller_id', Auth::id());
            })
            ->findOrFail($chatId);

        $otherUser = Auth::id() === $serviceChat->buyer_id ? $serviceChat->seller : $serviceChat->buyer;

        $chatData = [
            'id' => $serviceChat->id,
            'other_user' => [
                'id' => $otherUser->id,
                'name' => $otherUser->name,
                'avatar' => $otherUser->image ? Storage::url($otherUser->image) : null,
            ],
            'buyer_id' => $serviceChat->buyer_id,
            'seller_id' => $serviceChat->seller_id,
        ];

        // Get seller's gigs if current user is seller
        $sellerGigs = [];
        $isSeller = Auth::id() === $serviceChat->seller_id;
        if ($isSeller) {
            $sellerGigs = Gig::where('user_id', Auth::id())
                ->where('status', 'active')
                ->with(['images' => function ($q) {
                    $q->where('is_primary', true)->orWhere(function ($q2) {
                        $q2->orderBy('sort_order')->limit(1);
                    });
                }])
                ->select('id', 'slug', 'title', 'description', 'price')
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($g) {
                    $primaryImage = $g->images->first();
                    return [
                        'id' => $g->id,
                        'slug' => $g->slug,
                        'title' => $g->title,
                        'description' => $g->description,
                        'price' => (float) $g->price,
                        'image' => $primaryImage ? Storage::url($primaryImage->image_path) : null,
                    ];
                })
                ->toArray();
        }

        // Get offers for this chat
        $offers = CustomOffer::with(['gig'])
            ->where(function ($query) use ($serviceChat) {
                $query->where('buyer_id', $serviceChat->buyer_id)
                    ->where('seller_id', $serviceChat->seller_id);
            })
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($offer) {
                return [
                    'id' => $offer->id,
                    'gig_id' => $offer->gig_id,
                    'title' => $offer->title,
                    'description' => $offer->description,
                    'price' => (float) $offer->price,
                    'delivery_time' => $offer->delivery_time,
                    'requirements' => $offer->requirements,
                    'status' => $offer->status,
                    'created_at' => $offer->created_at->toISOString(),
                ];
            })
            ->toArray();

        return Inertia::render('frontend/service-hub/chat', [
            'chat' => $chatData,
            'sellerGigs' => $sellerGigs,
            'isSeller' => $isSeller,
            'offers' => $offers,
        ]);
    }

    public function createCustomOffer(Request $request, $slug): \Illuminate\Http\JsonResponse
    {
        $gig = Gig::where('slug', $slug)->firstOrFail();

        // Check if user is the seller
        if ($gig->user_id !== Auth::id()) {
            return response()->json(['error' => 'Only the seller can create offers.'], 403);
        }

        $validated = $request->validate([
            'buyer_id' => 'nullable|exists:users,id',
            'chat_id' => 'nullable|exists:service_chats,id',
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'price' => 'required|numeric|min:5',
            'delivery_time' => 'required|string|max:100',
            'requirements' => 'nullable|string',
        ]);

        // Get buyer_id from chat if chat_id is provided
        $buyerId = $validated['buyer_id'] ?? null;
        if (!$buyerId && isset($validated['chat_id']) && $validated['chat_id']) {
            $serviceChat = ServiceChat::findOrFail($validated['chat_id']);
            $buyerId = Auth::id() === $serviceChat->seller_id ? $serviceChat->buyer_id : $serviceChat->seller_id;
        }

        // Check if buyer is not the seller
        if ($buyerId && $buyerId == Auth::id()) {
            return response()->json(['error' => 'You cannot create an offer for yourself.'], 400);
        }

        // If buyer_id is still not provided, return error
        if (!$buyerId || $buyerId == 0) {
            return response()->json([
                'error' => 'Buyer ID is required. Please provide buyer ID or chat ID.',
            ], 400);
        }

        $offer = CustomOffer::create([
            'gig_id' => $gig->id,
            'seller_id' => Auth::id(),
            'buyer_id' => $buyerId,
            'title' => $validated['title'],
            'description' => $validated['description'],
            'price' => $validated['price'],
            'delivery_time' => $validated['delivery_time'],
            'requirements' => $validated['requirements'] ?? null,
            'status' => 'pending',
            'expires_at' => now()->addDays(7), // Offer expires in 7 days
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Custom offer created successfully!',
            'offer' => [
                'id' => $offer->id,
                'title' => $offer->title,
                'price' => $offer->price,
                'delivery_time' => $offer->delivery_time,
            ],
        ]);
    }

    public function acceptCustomOffer(Request $request, $offerId): RedirectResponse
    {
        $offer = CustomOffer::with(['gig', 'seller', 'buyer'])->findOrFail($offerId);

        // Check if user is the buyer
        if ($offer->buyer_id !== Auth::id()) {
            abort(403, 'You do not have permission to accept this offer.');
        }

        // Check if offer is still valid
        if ($offer->status !== 'pending') {
            return back()->withErrors(['error' => 'This offer is no longer available.']);
        }

        if ($offer->isExpired()) {
            $offer->update(['status' => 'expired']);
            return back()->withErrors(['error' => 'This offer has expired.']);
        }

        try {
            // Calculate fees
            $platformFee = $offer->price * 0.05; // 5% platform fee
            $sellerEarnings = $offer->price - $platformFee;

            // Create order from offer
            $order = ServiceOrder::create([
                'gig_id' => $offer->gig_id,
                'buyer_id' => $offer->buyer_id,
                'seller_id' => $offer->seller_id,
                'package_id' => null, // Custom offer, no package
                'package_type' => 'Custom Offer',
                'amount' => $offer->price,
                'platform_fee' => $platformFee,
                'seller_earnings' => $sellerEarnings,
                'requirements' => $offer->requirements,
                'special_instructions' => $offer->description,
                'status' => 'pending',
                'payment_status' => 'pending',
            ]);

            // Mark offer as accepted
            $offer->accept();

            return redirect()->route('service-hub.order.detail', $order->id)
                ->with('success', 'Offer accepted! Order created successfully.');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Failed to accept offer: ' . $e->getMessage()]);
        }
    }

    public function rejectCustomOffer(Request $request, $offerId): RedirectResponse
    {
        $offer = CustomOffer::findOrFail($offerId);

        // Check if user is the buyer
        if ($offer->buyer_id !== Auth::id()) {
            abort(403, 'You do not have permission to reject this offer.');
        }

        if ($offer->status !== 'pending') {
            return back()->withErrors(['error' => 'This offer is no longer available.']);
        }

        $offer->reject();

        return back()->with('success', 'Offer rejected.');
    }
}
