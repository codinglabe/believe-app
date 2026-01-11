<?php

namespace App\Http\Controllers\Merchant;

use App\Http\Controllers\Controller;
use App\Models\MerchantHubOffer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class HubOfferController extends Controller
{
    /**
     * Display the specified offer by slug.
     */
    public function show(Request $request, string $slug): Response
    {
        $offer = MerchantHubOffer::with(['merchant', 'category'])
            ->where('slug', $slug)
            ->where('status', 'active')
            ->firstOrFail();

        // Convert image_url to full URL
        $imageUrl = $offer->image_url;
        if ($imageUrl && !filter_var($imageUrl, FILTER_VALIDATE_URL)) {
            $imageUrl = Storage::disk('public')->url($imageUrl);
        }

        // Get related offers (same category, exclude current)
        $relatedOffers = MerchantHubOffer::with(['merchant', 'category'])
            ->where('merchant_hub_category_id', $offer->merchant_hub_category_id)
            ->where('id', '!=', $offer->id)
            ->where('status', 'active')
            ->limit(6)
            ->get()
            ->map(function ($relatedOffer) {
                $imageUrl = $relatedOffer->image_url;
                if ($imageUrl && !filter_var($imageUrl, FILTER_VALIDATE_URL)) {
                    $imageUrl = Storage::disk('public')->url($imageUrl);
                }
                return [
                    'id' => (string) $relatedOffer->id,
                    'slug' => $relatedOffer->slug,
                    'title' => $relatedOffer->title,
                    'image' => $imageUrl ?: '/placeholder.jpg',
                    'pointsRequired' => $relatedOffer->points_required,
                    'cashRequired' => $relatedOffer->cash_required ? (float) $relatedOffer->cash_required : null,
                    'merchantName' => $relatedOffer->merchant->name,
                    'category' => $relatedOffer->category->name,
                    'description' => $relatedOffer->short_description ?: $relatedOffer->description,
                ];
            });

        $transformedOffer = [
            'id' => (string) $offer->id,
            'slug' => $offer->slug,
            'title' => $offer->title,
            'image' => $imageUrl ?: '/placeholder.jpg',
            'pointsRequired' => $offer->points_required,
            'cashRequired' => $offer->cash_required ? (float) $offer->cash_required : null,
            'merchantName' => $offer->merchant->name,
            'merchantId' => (string) $offer->merchant->id,
            'merchantSlug' => $offer->merchant->slug,
            'category' => $offer->category->name,
            'categorySlug' => $offer->category->slug,
            'description' => $offer->description,
            'shortDescription' => $offer->short_description,
            'currency' => $offer->currency,
            'inventoryQty' => $offer->inventory_qty,
            'startsAt' => $offer->starts_at?->toIso8601String(),
            'endsAt' => $offer->ends_at?->toIso8601String(),
            'isAvailable' => $offer->isAvailable(),
            'redemptionsCount' => $offer->redemptions()->where('status', '!=', 'canceled')->count(),
        ];

        return Inertia::render('merchant/Hub/OfferDetail', [
            'offer' => $transformedOffer,
            'relatedOffers' => $relatedOffers,
        ]);
    }
}

