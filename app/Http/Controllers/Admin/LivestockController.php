<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\BaseController;
use App\Models\SellerProfile;
use App\Models\BuyerProfile;
use App\Models\LivestockUser;
use App\Models\LivestockListing;
use App\Models\LivestockPayout;
use App\Models\FractionalListing;
use App\Models\FractionalOffering;
use Illuminate\Support\Facades\Hash;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class LivestockController extends BaseController
{
    /**
     * Display livestock admin dashboard.
     */
    public function index(Request $request): Response
    {
        $this->authorizePermission($request, 'admin.livestock.read');

        $stats = [
            'total_sellers' => SellerProfile::count(),
            'pending_sellers' => SellerProfile::where('verification_status', 'pending')->count(),
            'active_listings' => LivestockListing::where('status', 'active')->count(),
            'pending_payouts' => LivestockPayout::where('status', 'pending')->count(),
            'total_payouts' => LivestockPayout::where('status', 'paid')->sum('amount'),
        ];

        return Inertia::render('admin/Livestock/Index', [
            'stats' => $stats,
        ]);
    }

    /**
     * Display sellers list.
     */
    public function sellers(Request $request): Response
    {
        $this->authorizePermission($request, 'admin.livestock.read');

        $perPage = (int) $request->get('per_page', 12);
        $page = (int) $request->get('page', 1);
        $status = $request->get('status', '');

        $query = SellerProfile::with('livestockUser')
            ->select('seller_profiles.*')
            ->selectRaw('(SELECT COUNT(*) FROM livestock_listings WHERE livestock_listings.livestock_user_id = seller_profiles.livestock_user_id) as listings_count');

        if ($status) {
            $query->where('verification_status', $status);
        }

        $sellers = $query->orderBy('created_at', 'desc')
            ->paginate($perPage, ['*'], 'page', $page)
            ->withQueryString();

        // Transform sellers data to include user information
        $sellers->through(function ($seller) {
            return [
                'id' => $seller->id,
                'farm_name' => $seller->farm_name,
                'verification_status' => $seller->verification_status,
                'rejection_reason' => $seller->rejection_reason,
                'address' => $seller->address,
                'phone' => $seller->phone,
                'national_id_number' => $seller->national_id_number,
                'payee_type' => $seller->payee_type,
                'payee_details' => $seller->payee_details,
                'listings_count' => (int) $seller->listings_count,
                'user' => $seller->livestockUser ? [
                    'id' => $seller->livestockUser->id,
                    'name' => $seller->livestockUser->name,
                    'email' => $seller->livestockUser->email,
                ] : null,
            ];
        });

        return Inertia::render('admin/Livestock/Sellers', [
            'sellers' => $sellers,
            'filters' => [
                'status' => $status,
                'per_page' => $perPage,
                'page' => $page,
            ],
        ]);
    }

    /**
     * Display seller listings.
     */
    public function sellerListings(Request $request, $id): Response
    {
        $this->authorizePermission($request, 'admin.livestock.read');

        $seller = SellerProfile::with('livestockUser')->findOrFail($id);
        
        if (!$seller->livestockUser) {
            abort(404, 'Seller user not found');
        }

        $perPage = (int) $request->get('per_page', 12);
        $page = (int) $request->get('page', 1);
        $search = $request->get('search', '');
        $breed = $request->get('breed', '');

        $query = LivestockListing::with(['animal.primaryPhoto'])
            ->where('livestock_user_id', $seller->livestockUser->id);

        // Apply search filter
        if ($search) {
            $query->where(function($q) use ($search) {
                $q->where('title', 'LIKE', "%{$search}%")
                  ->orWhere('description', 'LIKE', "%{$search}%")
                  ->orWhereHas('animal', function($animalQuery) use ($search) {
                      $animalQuery->where('breed', 'LIKE', "%{$search}%")
                                  ->orWhere('ear_tag', 'LIKE', "%{$search}%");
                  });
            });
        }

        // Apply breed filter
        if ($breed) {
            $query->whereHas('animal', function($q) use ($breed) {
                $q->where('breed', 'LIKE', "%{$breed}%");
            });
        }

        $listings = $query->orderBy('created_at', 'desc')
            ->paginate($perPage, ['*'], 'page', $page)
            ->withQueryString();

        // Get unique breeds for filter
        $breedsList = LivestockListing::where('livestock_user_id', $seller->livestockUser->id)
            ->whereHas('animal')
            ->with('animal')
            ->get()
            ->pluck('animal.breed')
            ->filter()
            ->unique()
            ->values();

        $sellerData = [
            'id' => $seller->id,
            'farm_name' => $seller->farm_name,
            'user' => [
                'id' => $seller->livestockUser->id,
                'name' => $seller->livestockUser->name,
                'email' => $seller->livestockUser->email,
            ],
        ];

        return Inertia::render('admin/Livestock/SellerListings', [
            'seller' => $sellerData,
            'listings' => $listings,
            'breedsList' => $breedsList,
            'filters' => [
                'search' => $search,
                'breed' => $breed,
                'per_page' => $perPage,
                'page' => $page,
            ],
        ]);
    }

    /**
     * Display seller details.
     */
    public function showSeller(Request $request, $id): Response
    {
        $this->authorizePermission($request, 'admin.livestock.read');

        $seller = SellerProfile::with('livestockUser')->findOrFail($id);

        $sellerData = [
            'id' => $seller->id,
            'farm_name' => $seller->farm_name,
            'verification_status' => $seller->verification_status,
            'rejection_reason' => $seller->rejection_reason,
            'address' => $seller->address,
            'phone' => $seller->phone,
            'national_id_number' => $seller->national_id_number,
            'payee_type' => $seller->payee_type,
            'payee_details' => $seller->payee_details,
            'user' => $seller->livestockUser ? [
                'id' => $seller->livestockUser->id,
                'name' => $seller->livestockUser->name,
                'email' => $seller->livestockUser->email,
            ] : null,
        ];

        // Get all listings for this seller
        $listings = [];
        if ($seller->livestockUser) {
            $listingsQuery = LivestockListing::with(['animal.primaryPhoto'])
                ->where('livestock_user_id', $seller->livestockUser->id)
                ->orderBy('created_at', 'desc')
                ->get();

            $listings = $listingsQuery->map(function ($listing) {
                return [
                    'id' => $listing->id,
                    'title' => $listing->title,
                    'description' => $listing->description,
                    'price' => $listing->price,
                    'currency' => $listing->currency,
                    'status' => $listing->status,
                    'listed_at' => $listing->listed_at?->toISOString(),
                    'sold_at' => $listing->sold_at?->toISOString(),
                    'animal' => [
                        'id' => $listing->animal->id,
                        'species' => $listing->animal->species,
                        'breed' => $listing->animal->breed,
                        'primary_photo' => $listing->animal->primaryPhoto ? [
                            'url' => $listing->animal->primaryPhoto->url,
                        ] : null,
                    ],
                ];
            })->toArray();
        }

        return Inertia::render('admin/Livestock/SellerView', [
            'seller' => $sellerData,
            'listings' => $listings,
        ]);
    }

    /**
     * Verify a seller.
     */
    public function verifySeller(Request $request, $id)
    {
        $this->authorizePermission($request, 'admin.livestock.manage');

        $seller = SellerProfile::findOrFail($id);
        $seller->update([
            'verification_status' => 'verified',
            'rejection_reason' => null,
        ]);

        return back()->with('success', 'Seller verified successfully.');
    }

    /**
     * Reject a seller.
     */
    public function rejectSeller(Request $request, $id)
    {
        $this->authorizePermission($request, 'admin.livestock.manage');

        $validated = $request->validate([
            'rejection_reason' => 'required|string',
        ]);

        $seller = SellerProfile::findOrFail($id);
        $seller->update([
            'verification_status' => 'rejected',
            'rejection_reason' => $validated['rejection_reason'],
        ]);

        return back()->with('success', 'Seller rejected.');
    }

    /**
     * Display listings list.
     */
    public function listings(Request $request): Response
    {
        $this->authorizePermission($request, 'admin.livestock.read');

        $perPage = (int) $request->get('per_page', 12);
        $page = (int) $request->get('page', 1);
        $status = $request->get('status', '');

        $query = LivestockListing::with(['animal.primaryPhoto', 'seller']);

        if ($status) {
            $query->where('status', $status);
        }

        $listings = $query->orderBy('created_at', 'desc')
            ->paginate($perPage, ['*'], 'page', $page)
            ->withQueryString();

        // Calculate stats
        $stats = [
            'total' => LivestockListing::count(),
            'active' => LivestockListing::where('status', 'active')->count(),
            'pending' => LivestockListing::where('status', 'pending')->count(),
            'sold' => LivestockListing::where('status', 'sold')->count(),
            'removed' => LivestockListing::where('status', 'removed')->count(),
        ];

        return Inertia::render('admin/Livestock/Listings', [
            'listings' => $listings,
            'stats' => $stats,
            'filters' => [
                'status' => $status,
                'per_page' => $perPage,
                'page' => $page,
            ],
        ]);
    }

    /**
     * Display listing details.
     */
    public function showListing(Request $request, $id): Response
    {
        $this->authorizePermission($request, 'admin.livestock.read');

        $listing = LivestockListing::with([
            'animal' => function($q) {
                $q->with([
                    'photos',
                    'healthRecords' => function($healthQuery) {
                        $healthQuery->orderBy('record_date', 'desc')->limit(5);
                    },
                    'parentLink.father',
                    'parentLink.mother',
                    'seller',
                    'currentOwner',
                ]);
            },
            'seller.sellerProfile'
        ])->findOrFail($id);

        // Get seller profile ID if exists
        $sellerProfileId = null;
        if ($listing->seller && $listing->seller->sellerProfile) {
            $sellerProfileId = $listing->seller->sellerProfile->id;
        }

        return Inertia::render('admin/Livestock/ListingView', [
            'listing' => $listing,
            'sellerProfileId' => $sellerProfileId,
        ]);
    }

    /**
     * Remove a listing.
     */
    public function removeListing(Request $request, $id)
    {
        $this->authorizePermission($request, 'admin.livestock.manage');

        $listing = LivestockListing::findOrFail($id);
        $listing->update(['status' => 'removed']);

        return back()->with('success', 'Listing removed.');
    }

    /**
     * Display payouts list.
     */
    public function payouts(Request $request): Response
    {
        $this->authorizePermission($request, 'admin.livestock.read');

        $perPage = (int) $request->get('per_page', 12);
        $page = (int) $request->get('page', 1);
        $status = $request->get('status', '');

        $query = LivestockPayout::with('user');

        if ($status) {
            $query->where('status', $status);
        }

        $payouts = $query->orderBy('created_at', 'desc')
            ->paginate($perPage, ['*'], 'page', $page)
            ->withQueryString();

        return Inertia::render('admin/Livestock/Payouts', [
            'payouts' => $payouts,
            'filters' => [
                'status' => $status,
                'per_page' => $perPage,
                'page' => $page,
            ],
        ]);
    }

    /**
     * Approve a payout.
     */
    public function approvePayout(Request $request, $id)
    {
        $this->authorizePermission($request, 'admin.livestock.manage');

        $payout = LivestockPayout::findOrFail($id);
        $payout->markAsPaid();

        return back()->with('success', 'Payout approved and marked as paid.');
    }

    /**
     * Delete a seller.
     */
    public function deleteSeller(Request $request, $id)
    {
        $this->authorizePermission($request, 'admin.livestock.manage');

        $seller = SellerProfile::findOrFail($id);
        $seller->delete();

        return back()->with('success', 'Seller deleted successfully.');
    }

    /**
     * Display buyers list.
     */
    public function buyers(Request $request): Response
    {
        $this->authorizePermission($request, 'admin.livestock.read');

        $perPage = (int) $request->get('per_page', 12);
        $page = (int) $request->get('page', 1);
        $status = $request->get('status', '');
        $search = $request->get('search', '');

        $query = BuyerProfile::with('livestockUser');

        if ($status) {
            $query->where('verification_status', $status);
        }

        if ($search) {
            $query->where(function($q) use ($search) {
                $q->where('farm_name', 'LIKE', "%{$search}%")
                  ->orWhere('phone', 'LIKE', "%{$search}%")
                  ->orWhere('email', 'LIKE', "%{$search}%")
                  ->orWhereHas('livestockUser', function($userQuery) use ($search) {
                      $userQuery->where('name', 'LIKE', "%{$search}%")
                                ->orWhere('email', 'LIKE', "%{$search}%");
                  });
            });
        }

        $buyers = $query->orderBy('created_at', 'desc')
            ->paginate($perPage, ['*'], 'page', $page)
            ->withQueryString();

        // Transform buyers data to include livestock user information
        $buyers->through(function ($buyer) {
            return [
                'id' => $buyer->id,
                'farm_name' => $buyer->farm_name,
                'verification_status' => $buyer->verification_status,
                'rejection_reason' => $buyer->rejection_reason,
                'address' => $buyer->address,
                'description' => $buyer->description,
                'phone' => $buyer->phone,
                'email' => $buyer->email,
                'city' => $buyer->city,
                'state' => $buyer->state,
                'zip_code' => $buyer->zip_code,
                'country' => $buyer->country,
                'national_id_number' => $buyer->national_id_number,
                'farm_type' => $buyer->farm_type,
                'farm_size_acres' => $buyer->farm_size_acres,
                'number_of_animals' => $buyer->number_of_animals,
                'specialization' => $buyer->specialization,
                'user' => $buyer->livestockUser ? [
                    'id' => $buyer->livestockUser->id,
                    'name' => $buyer->livestockUser->name,
                    'email' => $buyer->livestockUser->email,
                ] : null,
            ];
        });

        return Inertia::render('admin/Livestock/Buyers', [
            'buyers' => $buyers,
            'filters' => [
                'status' => $status,
                'search' => $search,
                'per_page' => $perPage,
                'page' => $page,
            ],
        ]);
    }

    /**
     * Show the form for creating a new buyer.
     */
    public function createBuyer(Request $request): Response
    {
        $this->authorizePermission($request, 'admin.livestock.manage');

        // Get available fractional assets (livestock type only)
        $availableAssets = \App\Models\FractionalAsset::whereIn('type', ['goat', 'livestock', 'livestock_goat'])
            ->orderBy('name')
            ->get(['id', 'name', 'type']);

        return Inertia::render('admin/Livestock/CreateBuyer', [
            'availableAssets' => $availableAssets,
        ]);
    }

    /**
     * Store a newly created buyer.
     */
    public function storeBuyer(Request $request)
    {
        $this->authorizePermission($request, 'admin.livestock.manage');

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:livestock_users,email',
            'password' => 'required|string|min:8|confirmed',
            'phone' => 'required|string|max:20',
            'farm_name' => 'required|string|max:255',
            'address' => 'required|string',
            'description' => 'nullable|string',
            'email_buyer' => 'nullable|string|email|max:255',
            'city' => 'nullable|string|max:255',
            'state' => 'nullable|string|max:255',
            'zip_code' => 'nullable|string|max:20',
            'country' => 'nullable|string|max:255',
            'national_id_number' => 'nullable|string|max:255',
            'farm_type' => 'nullable|string|max:255',
            'farm_size_acres' => 'nullable|integer|min:0',
            'number_of_animals' => 'nullable|integer|min:0',
            'specialization' => 'nullable|string|max:255',
            'fractional_asset_id' => 'nullable|exists:fractional_assets,id',
        ]);

        // Create livestock user
        $user = LivestockUser::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'phone' => $validated['phone'],
            'status' => 'active',
            'is_verified' => true,
            'email_verified_at' => now(),
        ]);

        // Validate asset if provided
        if (isset($validated['fractional_asset_id']) && $validated['fractional_asset_id']) {
            $asset = \App\Models\FractionalAsset::find($validated['fractional_asset_id']);
            if ($asset && !$asset->isLivestockAsset()) {
                return back()->withErrors([
                    'fractional_asset_id' => 'Only livestock/animal assets (goat, livestock) can be linked to buyers.'
                ])->withInput();
            }
        }

        // Create buyer profile
        BuyerProfile::create([
            'livestock_user_id' => $user->id,
            'fractional_asset_id' => $validated['fractional_asset_id'] ?? null,
            'farm_name' => $validated['farm_name'],
            'address' => $validated['address'],
            'description' => $validated['description'] ?? null,
            'phone' => $validated['phone'],
            'email' => $validated['email_buyer'] ?? null,
            'city' => $validated['city'] ?? null,
            'state' => $validated['state'] ?? null,
            'zip_code' => $validated['zip_code'] ?? null,
            'country' => $validated['country'] ?? null,
            'national_id_number' => $validated['national_id_number'] ?? null,
            'farm_type' => $validated['farm_type'] ?? null,
            'farm_size_acres' => $validated['farm_size_acres'] ?? null,
            'number_of_animals' => $validated['number_of_animals'] ?? null,
            'specialization' => $validated['specialization'] ?? null,
            'verification_status' => 'verified',
        ]);

        return redirect()->route('admin.livestock.buyers')
            ->with('success', 'Buyer created successfully.');
    }

    /**
     * Display a specific buyer.
     */
    public function showBuyer(Request $request, $id): Response
    {
        $this->authorizePermission($request, 'admin.livestock.read');

        $buyer = BuyerProfile::with(['livestockUser', 'fractionalAsset'])->findOrFail($id);

        // Get available fractional assets (livestock type only)
        $availableAssets = \App\Models\FractionalAsset::whereIn('type', ['goat', 'livestock', 'livestock_goat'])
            ->orderBy('name')
            ->get(['id', 'name', 'type']);

        $buyerData = [
            'id' => $buyer->id,
            'farm_name' => $buyer->farm_name,
            'verification_status' => $buyer->verification_status,
            'rejection_reason' => $buyer->rejection_reason,
            'address' => $buyer->address,
            'description' => $buyer->description,
            'phone' => $buyer->phone,
            'email' => $buyer->email,
            'city' => $buyer->city,
            'state' => $buyer->state,
            'zip_code' => $buyer->zip_code,
            'country' => $buyer->country,
            'national_id_number' => $buyer->national_id_number,
            'farm_type' => $buyer->farm_type,
            'farm_size_acres' => $buyer->farm_size_acres,
            'number_of_animals' => $buyer->number_of_animals,
            'specialization' => $buyer->specialization,
            'fractional_asset_id' => $buyer->fractional_asset_id,
            'fractional_asset' => $buyer->fractionalAsset ? [
                'id' => $buyer->fractionalAsset->id,
                'name' => $buyer->fractionalAsset->name,
                'type' => $buyer->fractionalAsset->type,
            ] : null,
            'user' => $buyer->livestockUser ? [
                'id' => $buyer->livestockUser->id,
                'name' => $buyer->livestockUser->name,
                'email' => $buyer->livestockUser->email,
            ] : null,
        ];

        return Inertia::render('admin/Livestock/BuyerView', [
            'buyer' => $buyerData,
            'availableAssets' => $availableAssets,
        ]);
    }

    /**
     * Link a fractional asset to a buyer.
     */
    public function linkAssetToBuyer(Request $request, $id): \Illuminate\Http\RedirectResponse
    {
        $this->authorizePermission($request, 'admin.livestock.manage');

        $validated = $request->validate([
            'fractional_asset_id' => 'nullable|exists:fractional_assets,id',
        ]);

        $buyer = BuyerProfile::with('livestockUser')->findOrFail($id);

        // If asset_id is provided, validate it's a livestock asset
        if ($validated['fractional_asset_id']) {
            $asset = \App\Models\FractionalAsset::find($validated['fractional_asset_id']);
            if ($asset && !$asset->isLivestockAsset()) {
                return back()->withErrors([
                    'fractional_asset_id' => 'Only livestock/animal assets (goat, livestock) can be linked to buyers.'
                ]);
            }
        }

        // Update buyer's asset
        $buyer->update([
            'fractional_asset_id' => $validated['fractional_asset_id'],
        ]);

        // Auto-update all existing fractional listings for this buyer
        if ($buyer->livestockUser) {
            FractionalListing::where('livestock_user_id', $buyer->livestock_user_id)
                ->whereIn('status', ['active', 'pending'])
                ->update([
                    'fractional_asset_id' => $validated['fractional_asset_id'],
                ]);
        }

        return back()->with('success', 'Asset linked successfully. All existing listings have been updated.');
    }

    /**
     * Verify a buyer.
     */
    public function verifyBuyer(Request $request, $id)
    {
        $this->authorizePermission($request, 'admin.livestock.manage');

        $buyer = BuyerProfile::findOrFail($id);
        $buyer->update([
            'verification_status' => 'verified',
            'rejection_reason' => null,
        ]);

        return back()->with('success', 'Buyer verified successfully.');
    }

    /**
     * Reject a buyer.
     */
    public function rejectBuyer(Request $request, $id)
    {
        $this->authorizePermission($request, 'admin.livestock.manage');

        $validated = $request->validate([
            'rejection_reason' => 'required|string|max:1000',
        ]);

        $buyer = BuyerProfile::findOrFail($id);
        $buyer->update([
            'verification_status' => 'rejected',
            'rejection_reason' => $validated['rejection_reason'],
        ]);

        return back()->with('success', 'Buyer rejected successfully.');
    }

    /**
     * Delete a buyer.
     */
    public function deleteBuyer(Request $request, $id)
    {
        $this->authorizePermission($request, 'admin.livestock.manage');

        $buyer = BuyerProfile::findOrFail($id);
        $user = $buyer->livestockUser;
        
        $buyer->delete();
        if ($user) {
            $user->delete();
        }

        return redirect()->route('admin.livestock.buyers')
            ->with('success', 'Buyer deleted successfully.');
    }

    /**
     * Display fractional listings (buyer-listed tag numbers).
     */
    public function fractionalListings(Request $request): Response
    {
        $this->authorizePermission($request, 'admin.livestock.read');

        $perPage = (int) $request->get('per_page', 12);
        $page = (int) $request->get('page', 1);
        $status = $request->get('status', '');
        $search = $request->get('search', '');

        $query = FractionalListing::with([
            'animal.primaryPhoto',
            'livestockUser.buyerProfile',
            'livestockUser.sellerProfile',
            'fractionalAsset.offerings' => function($q) {
                $q->whereIn('status', ['live', 'sold_out']);
            }
        ]);

        // Search filter
        if ($search) {
            $query->where(function($q) use ($search) {
                $q->where('tag_number', 'LIKE', "%{$search}%")
                  ->orWhere('country_code', 'LIKE', "%{$search}%")
                  ->orWhereHas('animal', function($animalQuery) use ($search) {
                      $animalQuery->where('breed', 'LIKE', "%{$search}%")
                                   ->orWhere('ear_tag', 'LIKE', "%{$search}%");
                  })
                  ->orWhereHas('livestockUser', function($userQuery) use ($search) {
                      $userQuery->where('name', 'LIKE', "%{$search}%")
                                 ->orWhere('email', 'LIKE', "%{$search}%");
                  });
            });
        }

        // Status filter - handle both database status and computed statuses
        if ($status && $status !== 'all') {
            // Handle special statuses that need to be computed
            if ($status === 'awaiting_assignment') {
                $query->whereNull('livestock_animal_id');
            } elseif ($status !== 'sold') {
                // Regular database status (active, pending, sold_out, cancelled)
                $query->where('status', $status);
            }
            // 'sold' status will be filtered after progress calculation
        }

        // Get all matching listings (without pagination) to calculate progress and apply sold filter
        $allListings = $query->orderBy('created_at', 'desc')->get();

        // Transform listings to include progress information
        $transformedListings = $allListings->map(function($listing) {
            $progressPercentage = 0;
            $soldShares = 0;
            $totalShares = 0;
            $soldTokens = 0;
            $totalTokensAvailable = 0;
            $remainingTokens = 0;
            $remainingShares = 0;
            $offering = null;
            $hasTokenSelling = false;

            // Get the first active offering from the fractional asset
            if ($listing->fractionalAsset) {
                $offering = $listing->fractionalAsset->offerings->first();
                if ($offering && $offering->total_shares > 0) {
                    $hasTokenSelling = true;
                    $tokensPerShare = $offering->tokens_per_share;
                    
                    // For livestock assets, each tag represents ONE share
                    // So total tokens available for THIS tag = tokensPerShare (not total_shares * tokensPerShare)
                    $totalTokensAvailable = $tokensPerShare; // Each tag = 1 share = tokensPerShare tokens
                    $totalShares = 1; // Each tag = 1 share
                    
                    // Calculate tokens sold for THIS SPECIFIC TAG only
                    // IMPORTANT: Avoid double-counting!
                    // If an order has tag_allocations in meta, use ONLY that (don't count from tag_number field)
                    // If an order doesn't have tag_allocations, count from tag_number field
                    $totalTokensSold = \App\Models\FractionalOrder::where('offering_id', $offering->id)
                        ->where('status', 'paid')
                        ->get()
                        ->sum(function ($order) use ($listing) {
                            $meta = $order->meta ?? [];
                            $tagAllocs = $meta['tag_allocations'] ?? [];
                            
                            // If order has tag_allocations in meta, use that (more accurate for multi-tag orders)
                            if (!empty($tagAllocs) && isset($tagAllocs[$listing->tag_number])) {
                                return $tagAllocs[$listing->tag_number];
                            }
                            
                            // Otherwise, if tag_number matches directly and no tag_allocations, count the tokens
                            // Only count if tag_allocations is empty to avoid double-counting
                            if (empty($tagAllocs) && $order->tag_number === $listing->tag_number) {
                                return $order->tokens;
                            }
                            
                            return 0;
                        });
                    
                    $soldTokens = min($totalTokensSold, $totalTokensAvailable);
                    $remainingTokens = max(0, $totalTokensAvailable - $soldTokens);
                    // For livestock: each tag = 1 share, so sold_shares is 0 or 1
                    $soldShares = $soldTokens >= $totalTokensAvailable ? 1 : 0; // 1 if fully sold, 0 otherwise
                    $remainingShares = 1 - $soldShares; // 0 if fully sold, 1 if not sold
                    
                    if ($totalTokensAvailable > 0) {
                        $progressPercentage = round(($soldTokens / $totalTokensAvailable) * 100, 2);
                    }
                    
                    // Show progress if there are tokens available (even if 0 sold)
                    if ($totalTokensAvailable > 0) {
                        $hasTokenSelling = true;
                    }
                }
            }

            // Check if tag is fully sold
            $isFullySold = ($totalTokensAvailable > 0 && $soldTokens >= $totalTokensAvailable);
            
            // Check if awaiting animal assignment
            $awaitingAssignment = is_null($listing->livestock_animal_id);

            return [
                'id' => $listing->id,
                'tag_number' => $listing->tag_number,
                'country_code' => $listing->country_code,
                'status' => $listing->status,
                'notes' => $listing->notes,
                'created_at' => $listing->created_at,
                'livestock_animal_id' => $listing->livestock_animal_id,
                'is_fully_sold' => $isFullySold,
                'awaiting_assignment' => $awaitingAssignment,
                'animal' => $listing->animal ? [
                    'id' => $listing->animal->id,
                    'species' => $listing->animal->species,
                    'breed' => $listing->animal->breed,
                    'sex' => $listing->animal->sex,
                    'ear_tag' => $listing->animal->ear_tag,
                    'primary_photo' => $listing->animal->primaryPhoto ? [
                        'url' => $listing->animal->primaryPhoto->url,
                    ] : null,
                ] : null,
                'owner' => $listing->livestockUser ? [
                    'id' => $listing->livestockUser->id,
                    'name' => $listing->livestockUser->name,
                    'email' => $listing->livestockUser->email,
                    'farm_name' => $listing->livestockUser->buyerProfile?->farm_name 
                        ?? $listing->livestockUser->sellerProfile?->farm_name 
                        ?? null,
                ] : null,
                'progress' => [
                    'has_token_selling' => $hasTokenSelling,
                    'percentage' => $progressPercentage,
                    'sold_shares' => $soldShares,
                    'total_shares' => $totalShares,
                    'sold_tokens' => $soldTokens ?? 0,
                    'total_tokens' => $totalTokensAvailable ?? 0,
                    'remaining_tokens' => $remainingTokens ?? 0,
                    'remaining_shares' => $remainingShares ?? 0,
                ],
            ];
        });

        // Apply sold filter after progress calculation (since we need progress to determine if sold)
        if ($status === 'sold') {
            $transformedListings = $transformedListings->filter(function($listing) {
                return $listing['is_fully_sold'] === true;
            })->values();
        }

        // Manual pagination after all filters
        $total = $transformedListings->count();
        $offset = ($page - 1) * $perPage;
        $paginatedItems = $transformedListings->slice($offset, $perPage)->values();

        // Create paginator
        $listings = new \Illuminate\Pagination\LengthAwarePaginator(
            $paginatedItems,
            $total,
            $perPage,
            $page,
            ['path' => $request->url(), 'query' => $request->query()]
        );

        // Calculate stats
        $stats = [
            'total' => FractionalListing::count(),
            'active' => FractionalListing::where('status', 'active')->count(),
            'pending' => FractionalListing::where('status', 'pending')->count(),
            'sold_out' => FractionalListing::where('status', 'sold_out')->count(),
            'cancelled' => FractionalListing::where('status', 'cancelled')->count(),
        ];

        return Inertia::render('admin/Livestock/FractionalListings', [
            'listings' => $listings,
            'stats' => $stats,
            'filters' => [
                'search' => $search,
                'status' => $status,
                'per_page' => $perPage,
            ],
        ]);
    }

    /**
     * Display fractional listing details.
     */
    public function showFractionalListing(Request $request, $id): Response
    {
        $this->authorizePermission($request, 'admin.livestock.read');

        $listing = FractionalListing::with([
            'animal' => function($q) {
                $q->with([
                    'photos',
                    'primaryPhoto',
                    'healthRecords' => function($healthQuery) {
                        $healthQuery->orderBy('record_date', 'desc')->limit(5);
                    },
                    'parentLink.father',
                    'parentLink.mother',
                ]);
            },
            'livestockUser.buyerProfile',
            'livestockUser.sellerProfile',
            'fractionalAsset.offerings' => function($q) {
                $q->whereIn('status', ['live', 'sold_out'])->orderBy('created_at', 'desc');
            }
        ])->findOrFail($id);

        // Calculate progress
        $progressPercentage = 0;
        $soldShares = 0;
        $totalShares = 0;
        $soldTokens = 0;
        $totalTokensAvailable = 0;
        $remainingTokens = 0;
        $remainingShares = 0;
        $offering = null;

        if ($listing->fractionalAsset && $listing->fractionalAsset->offerings->count() > 0) {
            $offering = $listing->fractionalAsset->offerings->first();
            if ($offering && $offering->total_shares > 0) {
                $tokensPerShare = $offering->tokens_per_share;
                $totalTokensAvailable = $offering->total_shares * $tokensPerShare;
                
                // Calculate total tokens sold from paid orders
                $totalTokensSold = \App\Models\FractionalOrder::where('offering_id', $offering->id)
                    ->where('status', 'paid')
                    ->sum('tokens');
                
                $totalShares = $offering->total_shares;
                $soldTokens = min($totalTokensSold, $totalTokensAvailable);
                $remainingTokens = max(0, $totalTokensAvailable - $soldTokens);
                $remainingShares = floor($remainingTokens / $tokensPerShare);
                $soldShares = $totalShares - $remainingShares;
                
                if ($totalTokensAvailable > 0) {
                    $progressPercentage = round(($soldTokens / $totalTokensAvailable) * 100, 2);
                }
            }
        }

        // Get farm name
        $farmName = $listing->livestockUser->buyerProfile?->farm_name 
            ?? $listing->livestockUser->sellerProfile?->farm_name 
            ?? $listing->livestockUser->name;

        // Get available fractional assets for linking (only livestock assets)
        // Only livestock/animal assets can be linked to fractional listings
        $availableAssets = \App\Models\FractionalAsset::whereIn('type', ['goat', 'livestock', 'livestock_goat'])
            ->orderBy('name')
            ->get(['id', 'name', 'type']);

        return Inertia::render('admin/Livestock/FractionalListingView', [
            'listing' => [
                'id' => $listing->id,
                'tag_number' => $listing->tag_number,
                'country_code' => $listing->country_code,
                'status' => $listing->status,
                'notes' => $listing->notes,
                'fractional_asset_id' => $listing->fractional_asset_id,
                'fractional_asset' => $listing->fractionalAsset ? [
                    'id' => $listing->fractionalAsset->id,
                    'name' => $listing->fractionalAsset->name,
                    'type' => $listing->fractionalAsset->type,
                ] : null,
                'created_at' => $listing->created_at,
                'animal' => $listing->animal ? [
                    'id' => $listing->animal->id,
                    'species' => $listing->animal->species,
                    'breed' => $listing->animal->breed,
                    'sex' => $listing->animal->sex,
                    'ear_tag' => $listing->animal->ear_tag,
                    'date_of_birth' => $listing->animal->date_of_birth,
                    'age_months' => $listing->animal->age_months,
                    'weight_kg' => $listing->animal->weight_kg,
                    'color_markings' => $listing->animal->color_markings,
                    'location' => $listing->animal->location,
                    'health_status' => $listing->animal->health_status,
                    'fertility_status' => $listing->animal->fertility_status,
                    'current_market_value' => $listing->animal->current_market_value,
                    'status' => $listing->animal->status,
                    'photos' => $listing->animal->photos->map(function($photo) {
                        return [
                            'id' => $photo->id,
                            'url' => $photo->url,
                            'is_primary' => $photo->is_primary,
                        ];
                    }),
                    'health_records' => $listing->animal->healthRecords->map(function($record) {
                        return [
                            'id' => $record->id,
                            'record_type' => $record->record_type,
                            'description' => $record->description,
                            'record_date' => $record->record_date,
                        ];
                    }),
                    'parent_link' => $listing->animal->parentLink ? [
                        'father' => $listing->animal->parentLink->father ? [
                            'id' => $listing->animal->parentLink->father->id,
                            'breed' => $listing->animal->parentLink->father->breed,
                            'ear_tag' => $listing->animal->parentLink->father->ear_tag,
                        ] : null,
                        'mother' => $listing->animal->parentLink->mother ? [
                            'id' => $listing->animal->parentLink->mother->id,
                            'breed' => $listing->animal->parentLink->mother->breed,
                            'ear_tag' => $listing->animal->parentLink->mother->ear_tag,
                        ] : null,
                    ] : null,
                ] : null,
                'owner' => $listing->livestockUser ? [
                    'id' => $listing->livestockUser->id,
                    'name' => $listing->livestockUser->name,
                    'email' => $listing->livestockUser->email,
                    'farm_name' => $farmName,
                ] : null,
                'progress' => [
                    'percentage' => $progressPercentage,
                    'sold_shares' => $soldShares,
                    'total_shares' => $totalShares,
                    'sold_tokens' => $soldTokens ?? 0,
                    'total_tokens' => $totalTokensAvailable ?? 0,
                    'remaining_tokens' => $remainingTokens ?? 0,
                    'remaining_shares' => $remainingShares ?? 0,
                    'offering' => $offering ? [
                        'id' => $offering->id,
                        'title' => $offering->title,
                        'price_per_share' => $offering->price_per_share,
                        'token_price' => $offering->token_price,
                        'currency' => $offering->currency,
                        'status' => $offering->status,
                    ] : null,
                ],
            ],
            'availableAssets' => $availableAssets,
        ]);
    }

    /**
     * Link a fractional asset to a fractional listing.
     */
    public function linkAssetToFractionalListing(Request $request, $id): \Illuminate\Http\RedirectResponse
    {
        $this->authorizePermission($request, 'admin.livestock.manage');

        $validated = $request->validate([
            'fractional_asset_id' => 'nullable|exists:fractional_assets,id',
        ]);

        $listing = FractionalListing::findOrFail($id);

        // If asset_id is provided, validate it's a livestock asset
        if ($validated['fractional_asset_id']) {
            $asset = \App\Models\FractionalAsset::find($validated['fractional_asset_id']);
            if ($asset && !$asset->isLivestockAsset()) {
                return back()->withErrors([
                    'fractional_asset_id' => 'Only livestock/animal assets (goat, livestock) can be linked to fractional listings.'
                ]);
            }
        }

        $listing->update([
            'fractional_asset_id' => $validated['fractional_asset_id'],
        ]);

        return back()->with('success', 'Asset linked successfully.');
    }
}

