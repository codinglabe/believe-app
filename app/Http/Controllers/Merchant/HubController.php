<?php

namespace App\Http\Controllers\Merchant;

use App\Http\Controllers\Controller;
use App\Models\MerchantHubOffer;
use App\Models\MerchantHubCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class HubController extends Controller
{
    /**
     * Display a listing of offers for the public hub.
     */
    public function index(Request $request): Response
    {
        $query = MerchantHubOffer::with(['merchant', 'category'])
            ->where('status', 'active')
            ->where(function ($q) {
                $q->whereNull('starts_at')
                    ->orWhere('starts_at', '<=', now());
            })
            ->where(function ($q) {
                $q->whereNull('ends_at')
                    ->orWhere('ends_at', '>=', now());
            });

        // Category filter
        if ($request->has('category') && $request->category) {
            $category = MerchantHubCategory::where('slug', $request->category)->first();
            if ($category) {
                $query->where('merchant_hub_category_id', $category->id);
            }
        }

        // Merchant filter
        if ($request->has('merchant') && $request->merchant) {
            $query->whereHas('merchant', function ($q) use ($request) {
                $q->where('slug', $request->merchant);
            });
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

        // Transform offers for frontend
        $transformedOffers = $offers->through(function ($offer) {
            $imageUrl = $offer->image_url;
            if ($imageUrl && !filter_var($imageUrl, FILTER_VALIDATE_URL)) {
                $imageUrl = Storage::disk('public')->url($imageUrl);
            }

            return [
                'id' => (string) $offer->id,
                'slug' => $offer->slug,
                'title' => $offer->title,
                'image' => $imageUrl ?: '/placeholder.jpg',
                'pointsRequired' => $offer->points_required,
                'cashRequired' => $offer->cash_required ? (float) $offer->cash_required : null,
                'currency' => $offer->currency,
                'merchantName' => $offer->merchant->name,
                'merchantSlug' => $offer->merchant->slug,
                'category' => $offer->category->name,
                'categorySlug' => $offer->category->slug,
                'description' => $offer->short_description ?: $offer->description,
            ];
        });

        // Get categories with counts
        $categories = MerchantHubCategory::where('is_active', true)
            ->withCount(['offers' => function ($query) {
                $query->where('status', 'active')
                    ->where(function ($q) {
                        $q->whereNull('starts_at')
                            ->orWhere('starts_at', '<=', now());
                    })
                    ->where(function ($q) {
                        $q->whereNull('ends_at')
                            ->orWhere('ends_at', '>=', now());
                    });
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

        return Inertia::render('merchant/Hub/Index', [
            'offers' => $transformedOffers,
            'categories' => $categories,
            'filters' => [
                'category' => $request->get('category'),
                'merchant' => $request->get('merchant'),
                'search' => $request->get('search'),
                'min_points' => $request->get('min_points'),
                'max_points' => $request->get('max_points'),
                'has_cash' => $request->get('has_cash'),
                'sort' => $sort,
                'per_page' => (int) $perPage,
            ],
        ]);
    }
}

