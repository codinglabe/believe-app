<?php

namespace App\Http\Controllers\Merchant;

use App\Http\Controllers\Controller;
use App\Models\MerchantHubOffer;
use App\Models\MerchantHubCategory;
use App\Models\MerchantHubMerchant;
use App\Models\Merchant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;

class MerchantOfferController extends Controller
{
    /**
     * Display a listing of offers for the authenticated merchant.
     */
    public function index(Request $request)
    {
        $merchant = Auth::guard('merchant')->user();

        // Get or create MerchantHubMerchant for this merchant
        $merchantHubMerchant = $this->getOrCreateMerchantHubMerchant($merchant);

        $query = MerchantHubOffer::where('merchant_hub_merchant_id', $merchantHubMerchant->id)
            ->with(['category']);

        // Search
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Filter by status
        if ($request->has('status') && $request->status !== '') {
            $query->where('status', $request->status);
        }

        $offers = $query->orderBy('created_at', 'desc')
            ->paginate(20)
            ->withQueryString();

        // Convert image_url to same-origin URL (works on merchant subdomain)
        $offers->getCollection()->transform(function ($offer) {
            if ($offer->image_url) {
                if (!filter_var($offer->image_url, FILTER_VALIDATE_URL)) {
                    $offer->image_url = asset('storage/' . ltrim($offer->image_url, '/'));
                }
            }
            return $offer;
        });

        return Inertia::render('merchant/Offers/Index', [
            'offers' => $offers,
            'filters' => [
                'search' => $request->search ?? '',
                'status' => $request->status ?? '',
            ],
        ]);
    }

    /**
     * Show the form for creating a new offer.
     */
    public function create(Request $request)
    {
        $categories = MerchantHubCategory::where('is_active', true)->orderBy('name')->get();

        return Inertia::render('merchant/Offers/Create', [
            'categories' => $categories,
        ]);
    }

    /**
     * Store a newly created offer.
     */
    public function store(Request $request)
    {
        $merchant = Auth::guard('merchant')->user();

        // Get or create MerchantHubMerchant for this merchant
        $merchantHubMerchant = $this->getOrCreateMerchantHubMerchant($merchant);

        $validated = $request->validate([
            'merchant_hub_category_id' => 'required|exists:merchant_hub_categories,id',
            'title' => 'required|string|max:255',
            'short_description' => 'nullable|string|max:500',
            'description' => 'required|string',
            'reference_price' => 'required|numeric|min:0.01',
            'discount_percentage' => 'required|numeric|min:1|max:10',
            'discount_cap' => 'nullable|numeric|min:0',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'cash_required' => 'nullable|numeric|min:0',
            'currency' => 'nullable|string|max:3',
            'inventory_qty' => 'nullable|integer|min:0',
            'starts_at' => 'nullable|date',
            'ends_at' => 'nullable|date|after_or_equal:starts_at',
            'status' => 'required|in:draft,active,paused,expired',
        ], [
            'merchant_hub_category_id.required' => 'Please select a category.',
            'merchant_hub_category_id.exists' => 'The selected category does not exist.',
            'title.required' => 'The offer title is required.',
            'title.max' => 'The title may not be greater than 255 characters.',
            'short_description.max' => 'The short description may not be greater than 500 characters.',
            'description.required' => 'The offer description is required.',
            'reference_price.required' => 'Retail price is required.',
            'reference_price.numeric' => 'Retail price must be a number.',
            'reference_price.min' => 'Retail price must be at least 0.01.',
            'discount_percentage.required' => 'Discount percentage is required (1–10%).',
            'discount_percentage.numeric' => 'Discount must be a number.',
            'discount_percentage.min' => 'Discount must be between 1% and 10%.',
            'discount_percentage.max' => 'Discount must be between 1% and 10%.',
            'image.image' => 'The image must be an image file.',
            'image.mimes' => 'The image must be a file of type: jpeg, png, jpg, gif, webp.',
            'image.max' => 'The image may not be greater than 5MB.',
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

        // Set merchant_hub_merchant_id
        $validated['merchant_hub_merchant_id'] = $merchantHubMerchant->id;

        // BIU: Points are auto-calculated; merchants cannot edit. $1 discount = 1,000 points.
        $validated['points_required'] = MerchantHubOffer::calculatePointsRequired(
            (float) $validated['reference_price'],
            (float) $validated['discount_percentage'],
            isset($validated['discount_cap']) ? (float) $validated['discount_cap'] : null
        );

        // Handle image upload
        if ($request->hasFile('image')) {
            $validated['image_url'] = $request->file('image')->store('merchant-hub/offers', 'public');
        }
        unset($validated['image']); // Remove the file object from validated data

        try {
            MerchantHubOffer::create($validated);

            return redirect()->route('offers.index')
                ->with('success', 'Offer created successfully.');
        } catch (\Exception $e) {
            Log::error('Merchant offer creation error: ' . $e->getMessage());
            return redirect()->back()
                ->withInput()
                ->withErrors(['error' => 'Failed to create offer: ' . $e->getMessage()])
                ->with('error', 'Failed to create offer. Please check the form for errors.');
        }
    }

    /**
     * Display the specified offer.
     */
    public function show(Request $request, MerchantHubOffer $offer)
    {
        $merchant = Auth::guard('merchant')->user();
        $merchantHubMerchant = $this->getOrCreateMerchantHubMerchant($merchant);

        // Verify the offer belongs to this merchant
        if ($offer->merchant_hub_merchant_id !== $merchantHubMerchant->id) {
            abort(403, 'Unauthorized access to this offer.');
        }

        $offer->load(['category']);

        // Convert image_url to same-origin URL
        $offerData = $offer->toArray();
        if (!empty($offerData['image_url']) && !filter_var($offerData['image_url'], FILTER_VALIDATE_URL)) {
            $offerData['image_url'] = asset('storage/' . ltrim($offerData['image_url'], '/'));
        }

        return Inertia::render('merchant/Offers/Show', [
            'offer' => $offerData,
        ]);
    }

    /**
     * Show the form for editing the specified offer.
     */
    public function edit(Request $request, MerchantHubOffer $offer)
    {
        $merchant = Auth::guard('merchant')->user();
        $merchantHubMerchant = $this->getOrCreateMerchantHubMerchant($merchant);

        // Verify the offer belongs to this merchant
        if ($offer->merchant_hub_merchant_id !== $merchantHubMerchant->id) {
            abort(403, 'Unauthorized access to this offer.');
        }

        $offer->load(['category']);
        $categories = MerchantHubCategory::where('is_active', true)->orderBy('name')->get();

        // Convert image_url to same-origin URL
        $offerData = $offer->toArray();
        if (!empty($offerData['image_url']) && !filter_var($offerData['image_url'], FILTER_VALIDATE_URL)) {
            $offerData['image_url'] = asset('storage/' . ltrim($offerData['image_url'], '/'));
        }

        return Inertia::render('merchant/Offers/Edit', [
            'offer' => $offerData,
            'categories' => $categories,
        ]);
    }

    /**
     * Update the specified offer.
     */
    public function update(Request $request, MerchantHubOffer $offer)
    {
        $merchant = Auth::guard('merchant')->user();
        $merchantHubMerchant = $this->getOrCreateMerchantHubMerchant($merchant);

        // Verify the offer belongs to this merchant
        if ($offer->merchant_hub_merchant_id !== $merchantHubMerchant->id) {
            abort(403, 'Unauthorized access to this offer.');
        }

        $validated = $request->validate([
            'merchant_hub_category_id' => 'required|exists:merchant_hub_categories,id',
            'title' => 'required|string|max:255',
            'short_description' => 'nullable|string|max:500',
            'description' => 'required|string',
            'reference_price' => 'required|numeric|min:0.01',
            'discount_percentage' => 'required|numeric|min:1|max:10',
            'discount_cap' => 'nullable|numeric|min:0',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'cash_required' => 'nullable|numeric|min:0',
            'currency' => 'nullable|string|max:3',
            'inventory_qty' => 'nullable|integer|min:0',
            'starts_at' => 'nullable|date',
            'ends_at' => 'nullable|date|after_or_equal:starts_at',
            'status' => 'required|in:draft,active,paused,expired',
        ], [
            'merchant_hub_category_id.required' => 'Please select a category.',
            'merchant_hub_category_id.exists' => 'The selected category does not exist.',
            'title.required' => 'The offer title is required.',
            'title.max' => 'The title may not be greater than 255 characters.',
            'short_description.max' => 'The short description may not be greater than 500 characters.',
            'description.required' => 'The offer description is required.',
            'reference_price.required' => 'Retail price is required.',
            'reference_price.numeric' => 'Retail price must be a number.',
            'reference_price.min' => 'Retail price must be at least 0.01.',
            'discount_percentage.required' => 'Discount percentage is required (1–10%).',
            'discount_percentage.numeric' => 'Discount must be a number.',
            'discount_percentage.min' => 'Discount must be between 1% and 10%.',
            'discount_percentage.max' => 'Discount must be between 1% and 10%.',
            'image.image' => 'The image must be an image file.',
            'image.mimes' => 'The image must be a file of type: jpeg, png, jpg, gif, webp.',
            'image.max' => 'The image may not be greater than 5MB.',
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

        // BIU: Points auto-calculated; merchants cannot edit.
        $validated['points_required'] = MerchantHubOffer::calculatePointsRequired(
            (float) $validated['reference_price'],
            (float) $validated['discount_percentage'],
            isset($validated['discount_cap']) ? (float) $validated['discount_cap'] : null
        );

        // Handle image upload - replace old image if new one is uploaded
        if ($request->hasFile('image')) {
            // Delete old image if it exists
            if ($offer->image_url) {
                $oldPath = $offer->image_url;
                // Extract path from URL if it's a full URL
                if (filter_var($oldPath, FILTER_VALIDATE_URL)) {
                    $baseUrl = Storage::disk('public')->url('');
                    if (strpos($oldPath, $baseUrl) === 0) {
                        $oldPath = str_replace($baseUrl, '', $oldPath);
                    }
                }
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

            return redirect()->route('offers.index')
                ->with('success', 'Offer updated successfully.');
        } catch (\Exception $e) {
            Log::error('Merchant offer update error: ' . $e->getMessage());
            return redirect()->back()
                ->withInput()
                ->withErrors(['error' => 'Failed to update offer: ' . $e->getMessage()])
                ->with('error', 'Failed to update offer. Please check the form for errors.');
        }
    }

    /**
     * Remove the specified offer.
     */
    public function destroy(Request $request, MerchantHubOffer $offer)
    {
        $merchant = Auth::guard('merchant')->user();
        $merchantHubMerchant = $this->getOrCreateMerchantHubMerchant($merchant);

        // Verify the offer belongs to this merchant
        if ($offer->merchant_hub_merchant_id !== $merchantHubMerchant->id) {
            abort(403, 'Unauthorized access to this offer.');
        }

        try {
            // Check if offer has redemptions
            if ($offer->redemptions()->count() > 0) {
                return redirect()->back()
                    ->with('error', 'Cannot delete offer with existing redemptions.');
            }

            // Delete image if it exists
            if ($offer->image_url) {
                $oldPath = $offer->image_url;
                if (filter_var($oldPath, FILTER_VALIDATE_URL)) {
                    $baseUrl = Storage::disk('public')->url('');
                    if (strpos($oldPath, $baseUrl) === 0) {
                        $oldPath = str_replace($baseUrl, '', $oldPath);
                    }
                }
                $oldPath = ltrim($oldPath, '/');
                if ($oldPath && Storage::disk('public')->exists($oldPath)) {
                    Storage::disk('public')->delete($oldPath);
                }
            }

            $offer->delete();

            return redirect()->route('offers.index')
                ->with('success', 'Offer deleted successfully.');
        } catch (\Exception $e) {
            Log::error('Merchant offer deletion error: ' . $e->getMessage());
            return redirect()->back()
                ->with('error', 'Failed to delete offer: ' . $e->getMessage());
        }
    }

    /**
     * Get or create MerchantHubMerchant for the authenticated merchant.
     */
    private function getOrCreateMerchantHubMerchant(Merchant $merchant)
    {
        $name = $merchant->business_name ?? $merchant->name;
        $slug = Str::slug($name);

        // Try to find by name or slug
        $merchantHubMerchant = MerchantHubMerchant::where('name', $name)
            ->orWhere('slug', $slug)
            ->first();

        if (!$merchantHubMerchant) {
            // Ensure slug is unique
            $originalSlug = $slug;
            $counter = 1;
            while (MerchantHubMerchant::where('slug', $slug)->exists()) {
                $slug = $originalSlug . '-' . $counter;
                $counter++;
            }

            // Create new MerchantHubMerchant
            $merchantHubMerchant = MerchantHubMerchant::create([
                'name' => $name,
                'slug' => $slug,
                'is_active' => true,
            ]);
        }

        return $merchantHubMerchant;
    }
}

