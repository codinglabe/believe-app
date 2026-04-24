<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\MarketplaceProduct;
use App\Models\Merchant;
use App\Models\MerchantHubCategory;
use App\Models\MerchantHubOffer;
use App\Support\MarketplacePickup;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class MerchantHubOfferController extends Controller
{
    /**
     * Merchant Hub home: tab "offers" (reward deals) or tab "products" (merchant marketplace catalog).
     */
    public function index(Request $request): Response
    {
        $tab = $request->get('tab', 'offers');
        if (! in_array($tab, ['offers', 'products'], true)) {
            $tab = 'offers';
        }

        $perPage = (int) $request->get('per_page', 12);

        if ($tab === 'products') {
            return $this->merchantHubProductsIndex($request, $perPage, $tab);
        }

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

        $offers = $query->paginate($perPage)->withQueryString();

        // Get categories directly from database that have offers
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

        $transformedOffers = $offers->through(function ($offer) {
            $imageUrl = $offer->image_url;
            if ($imageUrl && ! filter_var($imageUrl, FILTER_VALIDATE_URL)) {
                $imageUrl = asset('storage/'.ltrim($imageUrl, '/'));
            }

            return [
                'id' => (string) $offer->id,
                'title' => $offer->title,
                'image' => $imageUrl ?: '/placeholder.jpg',
                'pointsRequired' => $offer->points_required,
                'cashRequired' => $offer->cash_required ? (float) $offer->cash_required : null,
                'merchantName' => $offer->merchant->name,
                'category' => $offer->category->name,
                'description' => $offer->short_description ?: $offer->description,
            ];
        });

        return Inertia::render('frontend/merchant-hub/Index', [
            'tab' => $tab,
            'offers' => $transformedOffers,
            'marketplaceProducts' => null,
            'categories' => $categories,
            'productCategories' => [],
            'filters' => [
                'tab' => $tab,
                'category' => $request->get('category'),
                'search' => $request->get('search'),
                'min_points' => $request->get('min_points'),
                'max_points' => $request->get('max_points'),
                'has_cash' => $request->get('has_cash'),
                'sort' => $sort,
                'per_page' => $perPage,
                'pcategory' => null,
            ],
        ]);
    }

    private function merchantHubProductsIndex(Request $request, int $perPage, string $tab): Response
    {
        // Public hub: show active merchant catalog items (purchase rules are on product detail / checkout).
        $mpQuery = MarketplaceProduct::query()
            ->with(['merchant', 'productCategory'])
            ->where('status', 'active')
            ->where(function ($q) {
                $q->whereNull('inventory_quantity')
                    ->orWhere('inventory_quantity', '>', 0);
            });

        if ($request->filled('search')) {
            $search = $request->string('search');
            $mpQuery->where(function ($q) use ($search) {
                $q->where('name', 'like', '%'.$search.'%')
                    ->orWhere('description', 'like', '%'.$search.'%')
                    ->orWhereHas('merchant', function ($mq) use ($search) {
                        $mq->where('name', 'like', '%'.$search.'%')
                            ->orWhere('business_name', 'like', '%'.$search.'%');
                    });
            });
        }

        $pcategory = $request->get('pcategory');
        if ($pcategory !== null && $pcategory !== '') {
            $cid = (int) $pcategory;
            if ($cid > 0) {
                $mpQuery->where('category_id', $cid);
            }
        }

        $mpQuery->orderByDesc('created_at');

        $marketplaceProducts = $mpQuery->paginate($perPage)->withQueryString();

        $categoryIds = MarketplaceProduct::query()
            ->where('status', 'active')
            ->where(function ($q) {
                $q->whereNull('inventory_quantity')
                    ->orWhere('inventory_quantity', '>', 0);
            })
            ->whereNotNull('category_id')
            ->distinct()
            ->pluck('category_id');

        $productCategories = Category::query()
            ->where('status', 'active')
            ->whereNull('parent_id')
            ->whereIn('id', $categoryIds)
            ->orderBy('name')
            ->get()
            ->map(function (Category $c) {
                $count = MarketplaceProduct::query()
                    ->where('category_id', $c->id)
                    ->where('status', 'active')
                    ->where(function ($q) {
                        $q->whereNull('inventory_quantity')
                            ->orWhere('inventory_quantity', '>', 0);
                    })
                    ->count();

                return [
                    'id' => $c->id,
                    'name' => $c->name,
                    'products_count' => $count,
                ];
            })
            ->values();

        $transformedProducts = $marketplaceProducts->through(function (MarketplaceProduct $mp) {
            $images = $mp->images ?? [];
            $first = is_array($images) && count($images) > 0 ? $images[0] : null;
            $imageUrl = $first
                ? (filter_var($first, FILTER_VALIDATE_URL) ? $first : asset('storage/'.ltrim((string) $first, '/')))
                : '/placeholder.jpg';
            $price = $mp->suggested_retail_price ?? $mp->base_price;
            $merchant = $mp->merchant;

            return [
                'id' => $mp->id,
                'name' => $mp->name,
                'description' => Str::limit((string) ($mp->description ?? ''), 160),
                'price' => (float) $price,
                'price_display' => '$'.number_format((float) $price, 2),
                'image' => $imageUrl,
                'category' => $mp->productCategory?->name ?? '',
                'merchantName' => $merchant ? ($merchant->business_name ?: $merchant->name) : '',
                'url' => route('merchant-hub.product.show', $mp),
            ];
        });

        return Inertia::render('frontend/merchant-hub/Index', [
            'tab' => $tab,
            'offers' => null,
            'marketplaceProducts' => $transformedProducts,
            'categories' => [],
            'productCategories' => $productCategories,
            'filters' => [
                'tab' => $tab,
                'category' => null,
                'search' => $request->get('search'),
                'min_points' => null,
                'max_points' => null,
                'has_cash' => null,
                'sort' => 'newest',
                'per_page' => $perPage,
                'pcategory' => $pcategory ? (string) $pcategory : null,
            ],
        ]);
    }

    /**
     * Display the specified offer.
     */
    public function show(Request $request, $id): Response
    {
        if ($request->has('ref')) {
            $refRedemption = \App\Models\MerchantHubOfferRedemption::where('share_token', $request->get('ref'))
                ->whereIn('status', ['approved', 'fulfilled'])
                ->first();
            if ($refRedemption) {
                $isOwnLink = \Illuminate\Support\Facades\Auth::check()
                    && (int) $refRedemption->user_id === (int) \Illuminate\Support\Facades\Auth::id();
                if (! $isOwnLink) {
                    session(['merchant_hub_ref' => $request->get('ref')]);
                }
            }
        }
        $offer = MerchantHubOffer::with(['merchant', 'category'])
            ->findOrFail($id);

        // Find the Merchant model by matching name to get website
        $merchantWebsite = null;
        $merchantModel = Merchant::where('business_name', $offer->merchant->name)
            ->orWhere('name', $offer->merchant->name)
            ->first();
        if ($merchantModel && $merchantModel->website) {
            $merchantWebsite = $merchantModel->website;
        }
        $pickupAddress = ($offer->pickup_available ?? false) && $merchantModel
            ? MarketplacePickup::pickupAddressForMerchantHubOffer($offer, $merchantModel)
            : null;

        // Convert image_url to same-origin URL (works locally and on live)
        $imageUrl = $offer->image_url;
        if ($imageUrl && ! filter_var($imageUrl, FILTER_VALIDATE_URL)) {
            $imageUrl = asset('storage/'.ltrim($imageUrl, '/'));
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
            'canPayWithCash' => false,
            'reason' => null,
            'userPoints' => 0,
            'monthlyPointsRedeemed' => 0, // kept for backward compatibility (no longer enforced)
            'hasExistingRedemption' => false,
        ];

        if ($user = $request->user()) {
            // Use reward_points for merchant hub redemptions
            // Refresh user to get latest points from database
            $user->refresh();
            $userPoints = (float) ($user->reward_points ?? 0);

            $redemptionEligibility['userPoints'] = $userPoints;
            $redemptionEligibility['monthlyPointsRedeemed'] = 0;
            $redemptionEligibility['hasExistingRedemption'] = false;

            // Check eligibility (can still pay with cash if not enough points)
            if (! $offer->isAvailable()) {
                $redemptionEligibility['canRedeem'] = false;
                $redemptionEligibility['reason'] = 'This offer is no longer available.';
            } elseif ($userPoints < $offer->points_required) {
                $cashAvailable = ((float) ($offer->cash_required ?? 0) > 0) || ((float) ($offer->reference_price ?? 0) > 0);

                if ($cashAvailable) {
                    // Allow redeem via cash even when not enough points (reason explains points shortfall)
                    $redemptionEligibility['canRedeem'] = true;
                    $redemptionEligibility['canPayWithCash'] = true;
                    $redemptionEligibility['reason'] = 'You need '.number_format($offer->points_required).' reward points to claim this offer with points, but you have '.number_format($userPoints).'. You can pay with cash below (full amount).';
                } else {
                    // Points-only offer: no monthly cap anymore, but still require enough points.
                    $redemptionEligibility['canRedeem'] = false;
                    $redemptionEligibility['reason'] = 'You need '.number_format($offer->points_required).' reward points to claim this offer.';
                }
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

        // BIU: reference price and cash option (full amount when paying with cash, no points)
        $referencePrice = (float) ($offer->reference_price ?? 0);
        if ($referencePrice <= 0 && $offer->points_required > 0 && $offer->discount_percentage > 0) {
            $referencePrice = ($offer->points_required / 1000) * 100 / (float) $offer->discount_percentage;
        }
        $refDiscountAmount = $referencePrice > 0 && $offer->discount_percentage
            ? round($referencePrice * ((float) $offer->discount_percentage / 100), 2)
            : 0.0;
        $customerPriceWithPoints = $referencePrice > 0 ? round($referencePrice - $refDiscountAmount, 2) : 0.0;
        $communityCashPrice = $referencePrice > 0 ? round($referencePrice, 2) : 0.0;

        $transformedOffer = [
            'id' => (string) $offer->id,
            'title' => $offer->title,
            'image' => $imageUrl ?: '/placeholder.jpg',
            'pointsRequired' => $offer->points_required,
            'cashRequired' => $offer->cash_required ? (float) $offer->cash_required : null,
            'referencePrice' => $referencePrice > 0 ? round($referencePrice, 2) : null,
            'discountAmount' => $refDiscountAmount,
            'customerPriceWithPoints' => $customerPriceWithPoints,
            'communityCashPrice' => $communityCashPrice,
            'currency' => $offer->currency ?? 'USD',
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
            'pickupAvailable' => (bool) ($offer->pickup_available ?? false),
            'pickupAddress' => $pickupAddress,
        ];

        // Get redemption success data from session if exists
        $redemptionSuccess = $request->session()->get('redemption_success');

        return Inertia::render('frontend/merchant-hub/OfferDetail', [
            'offerId' => $id,
            'offer' => $transformedOffer,
            'redemptionEligibility' => $redemptionEligibility,
            'redemption_success' => $redemptionSuccess,
        ]);
    }
}
