<?php

namespace App\Http\Controllers;

use App\Models\MerchantHubOffer;
use App\Models\MerchantHubCategory;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MerchantHubOfferController extends Controller
{
    /**
     * Display a listing of offers.
     */
    public function index(Request $request): Response
    {
        $query = MerchantHubOffer::query()
            ->with(['merchant', 'category'])
            ->active()
            ->withAvailableInventory();

        // Category filter
        if ($request->has('category') && $request->category) {
            $category = MerchantHubCategory::where('slug', $request->category)->first();
            if ($category) {
                $query->where('merchant_hub_category_id', $category->id);
            }
        }

        // Search filter
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'LIKE', "%{$search}%")
                    ->orWhere('short_description', 'LIKE', "%{$search}%")
                    ->orWhere('description', 'LIKE', "%{$search}%")
                    ->orWhereHas('merchant', function ($q) use ($search) {
                        $q->where('name', 'LIKE', "%{$search}%");
                    });
            });
        }

        // Points filter
        if ($request->has('min_points') && $request->min_points) {
            $query->where('points_required', '>=', $request->min_points);
        }
        if ($request->has('max_points') && $request->max_points) {
            $query->where('points_required', '<=', $request->max_points);
        }

        // Cash required filter
        if ($request->has('has_cash') && $request->has_cash) {
            $query->whereNotNull('cash_required');
        }

        // Sorting
        $sort = $request->get('sort', 'newest');
        switch ($sort) {
            case 'points_asc':
                $query->orderBy('points_required', 'asc');
                break;
            case 'points_desc':
                $query->orderBy('points_required', 'desc');
                break;
            case 'cash_asc':
                $query->orderBy('cash_required', 'asc')->whereNotNull('cash_required');
                break;
            case 'cash_desc':
                $query->orderBy('cash_required', 'desc')->whereNotNull('cash_required');
                break;
            case 'newest':
            default:
                $query->orderBy('created_at', 'desc');
                break;
        }

        $perPage = $request->get('per_page', 12);
        $offers = $query->paginate($perPage)->withQueryString();

        // Get categories directly from database that have offers
        // Only show categories that have at least one active offer
        $categories = MerchantHubCategory::where('is_active', true)
            ->whereHas('offers', function ($query) {
                $query->active()->withAvailableInventory();
            })
            ->withCount(['offers' => function ($query) {
                $query->active()->withAvailableInventory();
            }])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($category) {
                return [
                    'id' => $category->id,
                    'name' => $category->name,
                    'slug' => $category->slug,
                    'offers_count' => $category->offers_count,
                ];
            });

        // Transform offers for frontend
        $transformedOffers = $offers->through(function ($offer) {
            return [
                'id' => (string) $offer->id,
                'title' => $offer->title,
                'image' => $offer->image_url ?: '/placeholder.jpg',
                'pointsRequired' => $offer->points_required,
                'cashRequired' => $offer->cash_required ? (float) $offer->cash_required : null,
                'merchantName' => $offer->merchant->name,
                'category' => $offer->category->name,
                'description' => $offer->short_description ?: $offer->description,
            ];
        });

        return Inertia::render('frontend/merchant-hub/Index', [
            'offers' => $transformedOffers,
            'categories' => $categories,
            'filters' => [
                'category' => $request->get('category'),
                'search' => $request->get('search'),
                'min_points' => $request->get('min_points'),
                'max_points' => $request->get('max_points'),
                'has_cash' => $request->get('has_cash'),
                'sort' => $sort,
                'per_page' => (int) $perPage,
            ],
        ]);
    }

    /**
     * Display the specified offer.
     */
    public function show(Request $request, $id): Response
    {
        $offer = MerchantHubOffer::with(['merchant', 'category'])
            ->findOrFail($id);

        // Find the Merchant model by matching name to get website
        $merchantWebsite = null;
        $merchantModel = \App\Models\Merchant::where('business_name', $offer->merchant->name)
            ->orWhere('name', $offer->merchant->name)
            ->first();
        if ($merchantModel && $merchantModel->website) {
            $merchantWebsite = $merchantModel->website;
        }

        // Get related offers (same category, exclude current)
        $relatedOffers = MerchantHubOffer::with(['merchant', 'category'])
            ->where('merchant_hub_category_id', $offer->merchant_hub_category_id)
            ->where('id', '!=', $offer->id)
            ->active()
            ->withAvailableInventory()
            ->limit(6)
            ->get()
            ->map(function ($relatedOffer) {
                return [
                    'id' => (string) $relatedOffer->id,
                    'title' => $relatedOffer->title,
                    'image' => $relatedOffer->image_url ?: '/placeholder.jpg',
                    'pointsRequired' => $relatedOffer->points_required,
                    'cashRequired' => $relatedOffer->cash_required ? (float) $relatedOffer->cash_required : null,
                    'merchantName' => $relatedOffer->merchant->name,
                    'category' => $relatedOffer->category->name,
                    'description' => $relatedOffer->short_description ?: $relatedOffer->description,
                ];
            });

        // Convert image_url to full URL
        $imageUrl = $offer->image_url;
        if ($imageUrl && !filter_var($imageUrl, FILTER_VALIDATE_URL)) {
            $imageUrl = \Illuminate\Support\Facades\Storage::disk('public')->url($imageUrl);
        }

        // Get eligible items for this merchant
        $eligibleItems = $offer->merchant->eligibleItems()
            ->where('is_active', true)
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->id,
                    'item_name' => $item->item_name,
                    'description' => $item->description,
                    'price' => $item->price ? (float) $item->price : null,
                    'quantity_limit' => $item->quantity_limit,
                    'discount_cap' => $item->discount_cap ? (float) $item->discount_cap : null,
                    'has_reached_limit' => $item->hasReachedLimit(),
                ];
            });

        // Check redemption eligibility for authenticated users
        $redemptionEligibility = [
            'canRedeem' => true,
            'reason' => null,
            'userPoints' => 0,
            'monthlyPointsRedeemed' => 0,
            'hasExistingRedemption' => false,
        ];

        if ($user = $request->user()) {
            // Use reward_points for merchant hub redemptions
            // Refresh user to get latest points from database
            $user->refresh();
            $userPoints = (float) ($user->reward_points ?? 0);
            $merchantId = $offer->merchant_hub_merchant_id;
            $currentMonth = now()->startOfMonth();

            // Check if user already redeemed from this merchant this month
            $existingRedemption = \App\Models\MerchantHubOfferRedemption::where('user_id', $user->id)
                ->whereHas('offer', function($q) use ($merchantId) {
                    $q->where('merchant_hub_merchant_id', $merchantId);
                })
                ->where('status', '!=', 'canceled')
                ->where('created_at', '>=', $currentMonth)
                ->first();

            // Check monthly points redeemed
            $monthlyPointsRedeemed = \App\Models\MerchantHubOfferRedemption::where('user_id', $user->id)
                ->whereHas('offer', function($q) use ($merchantId) {
                    $q->where('merchant_hub_merchant_id', $merchantId);
                })
                ->where('status', '!=', 'canceled')
                ->where('created_at', '>=', $currentMonth)
                ->sum('points_spent');

            $redemptionEligibility['userPoints'] = $userPoints;
            $redemptionEligibility['monthlyPointsRedeemed'] = (int) $monthlyPointsRedeemed;
            $redemptionEligibility['hasExistingRedemption'] = $existingRedemption !== null;

            // Check eligibility
            if (!$offer->isAvailable()) {
                $redemptionEligibility['canRedeem'] = false;
                $redemptionEligibility['reason'] = 'This offer is no longer available.';
            } elseif ($userPoints < $offer->points_required) {
                $redemptionEligibility['canRedeem'] = false;
                $redemptionEligibility['reason'] = "You need " . number_format($offer->points_required) . " points, but you only have " . number_format($userPoints) . " points.";
            } elseif ($existingRedemption) {
                $redemptionEligibility['canRedeem'] = false;
                $redemptionEligibility['reason'] = 'You have already redeemed from this merchant this month. One redemption per merchant per month.';
            } elseif ($monthlyPointsRedeemed + $offer->points_required > 100) {
                $remainingPoints = 100 - $monthlyPointsRedeemed;
                $redemptionEligibility['canRedeem'] = false;
                $redemptionEligibility['reason'] = "You can only redeem up to 100 points per merchant per month. You have already redeemed {$monthlyPointsRedeemed} points this month.";
            }
        }

        // Calculate pricing breakdown - ALWAYS show if cash_required exists
        $pricingBreakdown = null;
        
        // Determine discount percentage (default 10% for merchant hub)
        $discountPercentage = 10.0;
        if ($offer->discount_percentage !== null && $offer->discount_percentage > 0) {
            $discountPercentage = (float) $offer->discount_percentage;
        }
        
        $discountCap = $offer->discount_cap;
        $regularPrice = null;
        
        // ALWAYS use cash_required as regular price if it exists (this is what user wants)
        if ($offer->cash_required && $offer->cash_required > 0) {
            $regularPrice = (float) $offer->cash_required;
        }
        // Fallback: Use eligible items' prices if available
        elseif ($eligibleItems->isNotEmpty()) {
            $firstItem = $eligibleItems->first();
            if (isset($firstItem['price']) && $firstItem['price'] !== null && $firstItem['price'] > 0) {
                $regularPrice = (float) $firstItem['price'];
            }
        }
        
        // ALWAYS create pricing breakdown if we have cash_required or regular price
        if ($regularPrice !== null && $regularPrice > 0) {
            // Calculate discount amount (10% by default)
            $discountAmount = ($regularPrice * $discountPercentage) / 100;
            
            // Apply discount cap if set
            if ($discountCap !== null && $discountAmount > $discountCap) {
                $discountAmount = (float) $discountCap;
            }
            
            // Calculate discount price (price after discount)
            $discountPrice = $regularPrice - $discountAmount;
            
            $pricingBreakdown = [
                'regularPrice' => round($regularPrice, 2),
                'discountPercentage' => round($discountPercentage, 2),
                'discountAmount' => round($discountAmount, 2),
                'discountPrice' => round($discountPrice, 2),
                'discountCap' => $discountCap ? round((float) $discountCap, 2) : null,
            ];
        }

        $transformedOffer = [
            'id' => (string) $offer->id,
            'title' => $offer->title,
            'image' => $imageUrl ?: '/placeholder.jpg',
            'pointsRequired' => $offer->points_required,
            'cashRequired' => $offer->cash_required ? (float) $offer->cash_required : null,
            'merchantName' => $offer->merchant->name,
            'merchantWebsite' => $merchantWebsite,
            'category' => $offer->category->name,
            'description' => $offer->description,
            'shortDescription' => $offer->short_description,
            'isAvailable' => $offer->isAvailable(),
            'isStandardDiscount' => $offer->is_standard_discount ?? false,
            'discountPercentage' => $offer->discount_percentage ? (float) $offer->discount_percentage : null,
            'discountCap' => $offer->discount_cap ? (float) $offer->discount_cap : null,
            'eligibleItems' => $eligibleItems,
            'pricingBreakdown' => $pricingBreakdown,
        ];

        // Get redemption success data from session if exists
        $redemptionSuccess = $request->session()->get('redemption_success');

        return Inertia::render('frontend/merchant-hub/OfferDetail', [
            'offerId' => $id,
            'offer' => $transformedOffer,
            'relatedOffers' => $relatedOffers,
            'redemptionEligibility' => $redemptionEligibility,
            'redemption_success' => $redemptionSuccess,
        ]);
    }
}
