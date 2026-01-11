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

        // Get categories with counts
        $categories = MerchantHubCategory::where('is_active', true)
            ->withCount(['offers' => function ($query) {
                $query->active()->withAvailableInventory();
            }])
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

        $transformedOffer = [
            'id' => (string) $offer->id,
            'title' => $offer->title,
            'image' => $offer->image_url ?: '/placeholder.jpg',
            'pointsRequired' => $offer->points_required,
            'cashRequired' => $offer->cash_required ? (float) $offer->cash_required : null,
            'merchantName' => $offer->merchant->name,
            'category' => $offer->category->name,
            'description' => $offer->description,
            'shortDescription' => $offer->short_description,
            'isAvailable' => $offer->isAvailable(),
        ];

        return Inertia::render('frontend/merchant-hub/OfferDetail', [
            'offerId' => $id,
            'offer' => $transformedOffer,
            'relatedOffers' => $relatedOffers,
        ]);
    }
}
