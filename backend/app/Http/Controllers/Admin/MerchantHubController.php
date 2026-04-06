<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\BaseController;
use App\Models\MerchantHubCategory;
use App\Models\MerchantHubMerchant;
use App\Models\MerchantHubOffer;
use App\Models\MerchantHubOfferRedemption;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;

class MerchantHubController extends BaseController
{
    /**
     * Display merchant hub dashboard/index.
     */
    public function index(Request $request)
    {
        $this->authorizeRole($request, 'admin');

        // Get statistics
        $stats = [
            'total_merchants' => MerchantHubMerchant::count(),
            'active_merchants' => MerchantHubMerchant::where('is_active', true)->count(),
            'total_offers' => MerchantHubOffer::count(),
            'active_offers' => MerchantHubOffer::where('status', 'active')->count(),
            'total_redemptions' => MerchantHubOfferRedemption::count(),
            'pending_redemptions' => MerchantHubOfferRedemption::where('status', 'pending')->count(),
        ];

        return Inertia::render('admin/MerchantHub/Index', [
            'stats' => $stats,
        ]);
    }

    // ==================== MERCHANTS ====================

    /**
     * Display a listing of merchants.
     */
    public function merchantsIndex(Request $request)
    {
        $this->authorizeRole($request, 'admin');

        $query = MerchantHubMerchant::query();

        // Search
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%");
            });
        }

        // Filter by active status
        if ($request->has('status') && $request->status !== '') {
            $query->where('is_active', $request->status === 'active');
        }

        $merchants = $query->withCount('offers')
            ->orderBy('name')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('admin/MerchantHub/Merchants/Index', [
            'merchants' => $merchants,
            'filters' => [
                'search' => $request->search ?? '',
                'status' => $request->status ?? '',
            ],
        ]);
    }

    /**
     * Show the form for creating a new merchant.
     */
    public function merchantsCreate(Request $request)
    {
        $this->authorizeRole($request, 'admin');

        return Inertia::render('admin/MerchantHub/Merchants/Create');
    }

    /**
     * Store a newly created merchant.
     */
    public function merchantsStore(Request $request)
    {
        $this->authorizeRole($request, 'admin');

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:merchant_hub_merchants,slug',
            'logo' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'is_active' => 'boolean',
        ]);

        // Generate slug if not provided
        if (empty($validated['slug'])) {
            $validated['slug'] = Str::slug($validated['name']);
            // Ensure uniqueness
            $counter = 1;
            $originalSlug = $validated['slug'];
            while (MerchantHubMerchant::where('slug', $validated['slug'])->exists()) {
                $validated['slug'] = $originalSlug . '-' . $counter;
                $counter++;
            }
        }

        // Handle logo upload
        if ($request->hasFile('logo')) {
            $validated['logo_url'] = $request->file('logo')->store('merchant-hub/logos', 'public');
        }
        unset($validated['logo']); // Remove the file object from validated data

        try {
            MerchantHubMerchant::create($validated);

            return redirect()->route('admin.merchant-hub.merchants.index')
                ->with('success', 'Merchant created successfully.');
        } catch (\Exception $e) {
            Log::error('Merchant hub merchant creation error: ' . $e->getMessage());
            return redirect()->back()
                ->withInput()
                ->with('error', 'Failed to create merchant: ' . $e->getMessage());
        }
    }

    /**
     * Show the form for editing the specified merchant.
     */
    public function merchantsEdit(Request $request, MerchantHubMerchant $merchant)
    {
        $this->authorizeRole($request, 'admin');

        // Convert logo_url path to full URL for frontend
        $merchantData = $merchant->toArray();
        if ($merchantData['logo_url']) {
            // Check if it's already a full URL or just a path
            $baseUrl = Storage::disk('public')->url('');
            if (strpos($merchantData['logo_url'], $baseUrl) !== 0) {
                // It's a path, convert to full URL
                $merchantData['logo_url'] = Storage::disk('public')->url($merchantData['logo_url']);
            }
        }

        return Inertia::render('admin/MerchantHub/Merchants/Edit', [
            'merchant' => $merchantData,
        ]);
    }

    /**
     * Update the specified merchant.
     */
    public function merchantsUpdate(Request $request, MerchantHubMerchant $merchant)
    {
        $this->authorizeRole($request, 'admin');

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:merchant_hub_merchants,slug,' . $merchant->id,
            'logo' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'is_active' => 'boolean',
        ], [
            'name.required' => 'The merchant name is required.',
            'name.max' => 'The name may not be greater than 255 characters.',
            'slug.unique' => 'The slug has already been taken.',
            'slug.max' => 'The slug may not be greater than 255 characters.',
            'logo.image' => 'The logo must be an image file.',
            'logo.mimes' => 'The logo must be a file of type: jpeg, png, jpg, gif, webp.',
            'logo.max' => 'The logo may not be greater than 5MB.',
        ]);

        // Generate slug if not provided
        if (empty($validated['slug'])) {
            $validated['slug'] = Str::slug($validated['name']);
            // Ensure uniqueness
            $counter = 1;
            $originalSlug = $validated['slug'];
            while (MerchantHubMerchant::where('slug', $validated['slug'])->where('id', '!=', $merchant->id)->exists()) {
                $validated['slug'] = $originalSlug . '-' . $counter;
                $counter++;
            }
        }

        // Handle logo upload - replace old logo if new one is uploaded
        if ($request->hasFile('logo')) {
            // Delete old logo if it exists
            if ($merchant->logo_url) {
                $oldPath = $merchant->logo_url;
                // If it's a full URL, extract the path
                $baseUrl = Storage::disk('public')->url('');
                if (strpos($oldPath, $baseUrl) === 0) {
                    $oldPath = str_replace($baseUrl, '', $oldPath);
                }
                // Remove leading slash if present
                $oldPath = ltrim($oldPath, '/');

                if ($oldPath && Storage::disk('public')->exists($oldPath)) {
                    Storage::disk('public')->delete($oldPath);
                }
            }

            // Store new logo
            $validated['logo_url'] = $request->file('logo')->store('merchant-hub/logos', 'public');
        }
        unset($validated['logo']); // Remove the file object from validated data

        try {
            $merchant->update($validated);

            return redirect()->route('admin.merchant-hub.merchants.index')
                ->with('success', 'Merchant updated successfully.');
        } catch (\Exception $e) {
            Log::error('Merchant hub merchant update error: ' . $e->getMessage());
            return redirect()->back()
                ->withInput()
                ->withErrors(['error' => 'Failed to update merchant: ' . $e->getMessage()])
                ->with('error', 'Failed to update merchant. Please check the form for errors.');
        }
    }

    /**
     * Remove the specified merchant.
     */
    public function merchantsDestroy(Request $request, MerchantHubMerchant $merchant)
    {
        $this->authorizeRole($request, 'admin');

        try {
            // Check if merchant has offers
            if ($merchant->offers()->count() > 0) {
                return redirect()->back()
                    ->with('error', 'Cannot delete merchant with existing offers. Please remove or reassign offers first.');
            }

            $merchant->delete();

            return redirect()->route('admin.merchant-hub.merchants.index')
                ->with('success', 'Merchant deleted successfully.');
        } catch (\Exception $e) {
            Log::error('Merchant hub merchant deletion error: ' . $e->getMessage());
            return redirect()->back()
                ->with('error', 'Failed to delete merchant: ' . $e->getMessage());
        }
    }

    // ==================== OFFERS ====================

    /**
     * Display a listing of offers.
     */
    public function offersIndex(Request $request)
    {
        $this->authorizeRole($request, 'admin');

        $query = MerchantHubOffer::with(['merchant', 'category']);

        // Search
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('short_description', 'like', "%{$search}%")
                    ->orWhereHas('merchant', function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%");
                    });
            });
        }

        // Filter by status
        if ($request->has('status') && $request->status !== '') {
            $query->where('status', $request->status);
        }

        // Filter by category
        if ($request->has('category_id') && $request->category_id) {
            $query->where('merchant_hub_category_id', $request->category_id);
        }

        // Filter by merchant
        if ($request->has('merchant_id') && $request->merchant_id) {
            $query->where('merchant_hub_merchant_id', $request->merchant_id);
        }

        $offers = $query->orderBy('created_at', 'desc')
            ->paginate(20)
            ->withQueryString();

        // Transform offers to include full image URLs
        $offers->getCollection()->transform(function ($offer) {
            if ($offer->image_url && strpos($offer->image_url, 'http') !== 0) {
                $offer->image_url = Storage::disk('public')->url($offer->image_url);
            }
            return $offer;
        });

        // Get categories and merchants for filters
        $categories = MerchantHubCategory::where('is_active', true)->orderBy('name')->get();
        $merchants = MerchantHubMerchant::where('is_active', true)->orderBy('name')->get();

        return Inertia::render('admin/MerchantHub/Offers/Index', [
            'offers' => $offers,
            'categories' => $categories,
            'merchants' => $merchants,
            'filters' => [
                'search' => $request->search ?? '',
                'status' => $request->status ?? '',
                'category_id' => $request->category_id ?? '',
                'merchant_id' => $request->merchant_id ?? '',
            ],
        ]);
    }

    /**
     * Show the form for creating a new offer.
     */
    public function offersCreate(Request $request)
    {
        $this->authorizeRole($request, 'admin');

        $categories = MerchantHubCategory::where('is_active', true)->orderBy('name')->get();
        $merchants = MerchantHubMerchant::where('is_active', true)->orderBy('name')->get();

        return Inertia::render('admin/MerchantHub/Offers/Create', [
            'categories' => $categories,
            'merchants' => $merchants,
        ]);
    }

    /**
     * Store a newly created offer.
     */
    public function offersStore(Request $request)
    {
        $this->authorizeRole($request, 'admin');

        $validated = $request->validate([
            'merchant_hub_merchant_id' => 'required|exists:merchant_hub_merchants,id',
            'merchant_hub_category_id' => 'required|exists:merchant_hub_categories,id',
            'title' => 'required|string|max:255',
            'short_description' => 'nullable|string|max:500',
            'description' => 'required|string',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'points_required' => 'required|integer|min:0',
            'cash_required' => 'nullable|numeric|min:0',
            'currency' => 'nullable|string|max:3',
            'inventory_qty' => 'nullable|integer|min:0',
            'starts_at' => 'nullable|date',
            'ends_at' => 'nullable|date|after_or_equal:starts_at',
            'status' => 'required|in:draft,active,paused,expired',
        ], [
            'merchant_hub_merchant_id.required' => 'Please select a merchant.',
            'merchant_hub_merchant_id.exists' => 'The selected merchant does not exist.',
            'merchant_hub_category_id.required' => 'Please select a category.',
            'merchant_hub_category_id.exists' => 'The selected category does not exist.',
            'title.required' => 'The offer title is required.',
            'title.max' => 'The title may not be greater than 255 characters.',
            'short_description.max' => 'The short description may not be greater than 500 characters.',
            'description.required' => 'The offer description is required.',
            'image.image' => 'The image must be an image file.',
            'image.mimes' => 'The image must be a file of type: jpeg, png, jpg, gif, webp.',
            'image.max' => 'The image may not be greater than 5MB.',
            'points_required.required' => 'The points required field is required.',
            'points_required.integer' => 'The points required must be an integer.',
            'points_required.min' => 'The points required must be at least 0.',
            'cash_required.numeric' => 'The cash required must be a number.',
            'cash_required.min' => 'The cash required must be at least 0.',
            'currency.max' => 'The currency may not be greater than 3 characters.',
            'inventory_qty.integer' => 'The inventory quantity must be an integer.',
            'inventory_qty.min' => 'The inventory quantity must be at least 0.',
            'starts_at.date' => 'The starts at must be a valid date.',
            'ends_at.date' => 'The ends at must be a valid date.',
            'ends_at.after_or_equal' => 'The ends at must be after or equal to starts at.',
            'status.required' => 'The status field is required.',
            'status.in' => 'The selected status is invalid.',
        ]);

        // Handle image upload
        if ($request->hasFile('image')) {
            $validated['image_url'] = $request->file('image')->store('merchant-hub/offers', 'public');
        }
        unset($validated['image']); // Remove the file object from validated data

        try {
            MerchantHubOffer::create($validated);

            return redirect()->route('admin.merchant-hub.offers.index')
                ->with('success', 'Offer created successfully.');
        } catch (\Exception $e) {
            Log::error('Merchant hub offer creation error: ' . $e->getMessage());
            return redirect()->back()
                ->withInput()
                ->withErrors(['error' => 'Failed to create offer: ' . $e->getMessage()])
                ->with('error', 'Failed to create offer. Please check the form for errors.');
        }
    }

    /**
     * Show the form for editing the specified offer.
     */
    public function offersEdit(Request $request, MerchantHubOffer $offer)
    {
        $this->authorizeRole($request, 'admin');

        $offer->load(['merchant', 'category']);
        $categories = MerchantHubCategory::where('is_active', true)->orderBy('name')->get();
        $merchants = MerchantHubMerchant::where('is_active', true)->orderBy('name')->get();

        // Convert image_url path to full URL for frontend
        $offerData = $offer->toArray();
        if ($offerData['image_url']) {
            // Check if it's already a full URL or just a path
            $baseUrl = Storage::disk('public')->url('');
            if (strpos($offerData['image_url'], $baseUrl) !== 0) {
                // It's a path, convert to full URL
                $offerData['image_url'] = Storage::disk('public')->url($offerData['image_url']);
            }
        }

        return Inertia::render('admin/MerchantHub/Offers/Edit', [
            'offer' => $offerData,
            'categories' => $categories,
            'merchants' => $merchants,
        ]);
    }

    /**
     * Update the specified offer.
     */
    public function offersUpdate(Request $request, MerchantHubOffer $offer)
    {
        $this->authorizeRole($request, 'admin');

        $validated = $request->validate([
            'merchant_hub_merchant_id' => 'required|exists:merchant_hub_merchants,id',
            'merchant_hub_category_id' => 'required|exists:merchant_hub_categories,id',
            'title' => 'required|string|max:255',
            'short_description' => 'nullable|string|max:500',
            'description' => 'required|string',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'points_required' => 'required|integer|min:0',
            'cash_required' => 'nullable|numeric|min:0',
            'currency' => 'nullable|string|max:3',
            'inventory_qty' => 'nullable|integer|min:0',
            'starts_at' => 'nullable|date',
            'ends_at' => 'nullable|date|after_or_equal:starts_at',
            'status' => 'required|in:draft,active,paused,expired',
        ], [
            'merchant_hub_merchant_id.required' => 'Please select a merchant.',
            'merchant_hub_merchant_id.exists' => 'The selected merchant does not exist.',
            'merchant_hub_category_id.required' => 'Please select a category.',
            'merchant_hub_category_id.exists' => 'The selected category does not exist.',
            'title.required' => 'The offer title is required.',
            'title.max' => 'The title may not be greater than 255 characters.',
            'short_description.max' => 'The short description may not be greater than 500 characters.',
            'description.required' => 'The offer description is required.',
            'image.image' => 'The image must be an image file.',
            'image.mimes' => 'The image must be a file of type: jpeg, png, jpg, gif, webp.',
            'image.max' => 'The image may not be greater than 5MB.',
            'points_required.required' => 'The points required field is required.',
            'points_required.integer' => 'The points required must be an integer.',
            'points_required.min' => 'The points required must be at least 0.',
            'cash_required.numeric' => 'The cash required must be a number.',
            'cash_required.min' => 'The cash required must be at least 0.',
            'currency.max' => 'The currency may not be greater than 3 characters.',
            'inventory_qty.integer' => 'The inventory quantity must be an integer.',
            'inventory_qty.min' => 'The inventory quantity must be at least 0.',
            'starts_at.date' => 'The starts at must be a valid date.',
            'ends_at.date' => 'The ends at must be a valid date.',
            'ends_at.after_or_equal' => 'The ends at must be after or equal to starts at.',
            'status.required' => 'The status field is required.',
            'status.in' => 'The selected status is invalid.',
        ]);

        // Handle image upload - replace old image if new one is uploaded
        if ($request->hasFile('image')) {
            // Delete old image if it exists
            if ($offer->image_url) {
                $oldPath = $offer->image_url;
                // If it's a full URL, extract the path
                $baseUrl = Storage::disk('public')->url('');
                if (strpos($oldPath, $baseUrl) === 0) {
                    $oldPath = str_replace($baseUrl, '', $oldPath);
                }
                // Remove leading slash if present
                $oldPath = ltrim($oldPath, '/');

                if ($oldPath && Storage::disk('public')->exists($oldPath)) {
                    Storage::disk('public')->delete($oldPath);
                }
            }

            // Store new image
            $validated['image_url'] = $request->file('image')->store('merchant-hub/offers', 'public');
        }
        unset($validated['image']); // Remove the file object from validated data

        try {
            $offer->update($validated);

            return redirect()->route('admin.merchant-hub.offers.index')
                ->with('success', 'Offer updated successfully.');
        } catch (\Exception $e) {
            Log::error('Merchant hub offer update error: ' . $e->getMessage());
            return redirect()->back()
                ->withInput()
                ->withErrors(['error' => 'Failed to update offer: ' . $e->getMessage()])
                ->with('error', 'Failed to update offer. Please check the form for errors.');
        }
    }

    /**
     * Remove the specified offer.
     */
    public function offersDestroy(Request $request, MerchantHubOffer $offer)
    {
        $this->authorizeRole($request, 'admin');

        try {
            // Check if offer has redemptions
            if ($offer->redemptions()->count() > 0) {
                return redirect()->back()
                    ->with('error', 'Cannot delete offer with existing redemptions.');
            }

            $offer->delete();

            return redirect()->route('admin.merchant-hub.offers.index')
                ->with('success', 'Offer deleted successfully.');
        } catch (\Exception $e) {
            Log::error('Merchant hub offer deletion error: ' . $e->getMessage());
            return redirect()->back()
                ->with('error', 'Failed to delete offer: ' . $e->getMessage());
        }
    }

    // ==================== REDEMPTIONS ====================

    /**
     * Display a listing of redemptions.
     */
    public function redemptionsIndex(Request $request)
    {
        $this->authorizeRole($request, 'admin');

        $query = MerchantHubOfferRedemption::with(['offer.merchant', 'offer.category', 'user']);

        // Filter by status
        if ($request->has('status') && $request->status !== '') {
            $query->where('status', $request->status);
        }

        // Search
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('receipt_code', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    })
                    ->orWhereHas('offer', function ($q) use ($search) {
                        $q->where('title', 'like', "%{$search}%");
                    });
            });
        }

        $redemptions = $query->orderBy('created_at', 'desc')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('admin/MerchantHub/Redemptions/Index', [
            'redemptions' => $redemptions,
            'filters' => [
                'search' => $request->search ?? '',
                'status' => $request->status ?? '',
            ],
        ]);
    }

    /**
     * Update redemption status.
     */
    public function redemptionsUpdateStatus(Request $request, MerchantHubOfferRedemption $redemption)
    {
        $this->authorizeRole($request, 'admin');

        $validated = $request->validate([
            'status' => 'required|in:pending,approved,fulfilled,canceled',
        ]);

        try {
            $oldStatus = $redemption->status;
            $newStatus = $validated['status'];

            // If canceling and wasn't already canceled, refund points
            if ($newStatus === 'canceled' && $oldStatus !== 'canceled') {
                $user = $redemption->user;
                $pointsToRefund = $redemption->points_spent;

                // Refund points to user
                $user->increment('reward_points', $pointsToRefund);

                // Create credit ledger entry for refund
                \App\Models\RewardPointLedger::createCredit(
                    $user->id,
                    'merchant_hub_redemption_refund',
                    $redemption->id,
                    $pointsToRefund,
                    "Refund for canceled redemption: {$redemption->offer->title}",
                    [
                        'redemption_id' => $redemption->id,
                        'offer_id' => $redemption->merchant_hub_offer_id,
                        'offer_title' => $redemption->offer->title,
                        'merchant_name' => $redemption->offer->merchant->name,
                        'receipt_code' => $redemption->receipt_code,
                        'original_points_spent' => $pointsToRefund,
                    ]
                );

                \Illuminate\Support\Facades\Log::info('Redemption canceled and points refunded', [
                    'redemption_id' => $redemption->id,
                    'user_id' => $user->id,
                    'points_refunded' => $pointsToRefund,
                ]);
            }

            $redemption->update(['status' => $newStatus]);

            return redirect()->back()
                ->with('success', 'Redemption status updated successfully.');
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Merchant hub redemption status update error: ' . $e->getMessage());
            return redirect()->back()
                ->with('error', 'Failed to update redemption status: ' . $e->getMessage());
        }
    }
}
