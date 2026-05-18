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

        // Convert image_url to same-origin URL (works on merchant subdomain)
        $imageUrl = $offer->image_url;
        if ($imageUrl && !filter_var($imageUrl, FILTER_VALIDATE_URL)) {
            $imageUrl = asset('storage/' . ltrim($imageUrl, '/'));
        }

        // Get related offers (same category, exclude current)
        $relatedOffers = MerchantHubOffer::with(['merchant', 'category'])
            ->where('merchant_hub_category_id', $offer->merchant_hub_category_id)
            ->where('id', '!=', $offer->id)
            ->where('status', 'active')
            ->limit(6)
            ->get()
            ->map(function ($relatedOffer) {
                $relImageUrl = $relatedOffer->image_url;
                if ($relImageUrl && !filter_var($relImageUrl, FILTER_VALIDATE_URL)) {
                    $relImageUrl = asset('storage/' . ltrim($relImageUrl, '/'));
                }
                return [
                    'id' => (string) $relatedOffer->id,
                    'slug' => $relatedOffer->slug,
                    'title' => $relatedOffer->title,
                    'image' => $relImageUrl ?: '/placeholder.jpg',
                    'pointsRequired' => $relatedOffer->points_required,
                    'cashRequired' => $relatedOffer->cash_required ? (float) $relatedOffer->cash_required : null,
                    'merchantName' => $relatedOffer->merchant->name,
                    'category' => $relatedOffer->category->name,
                    'description' => $relatedOffer->short_description ?: $relatedOffer->description,
                ];
            });

        // Use reference_price from DB, or derive from points + discount so "Pay with cash" always has an amount
        $referencePrice = (float) ($offer->reference_price ?? 0);
        if ($referencePrice <= 0 && $offer->points_required > 0 && $offer->discount_percentage > 0) {
            $referencePrice = ($offer->points_required / 1000) * 100 / (float) $offer->discount_percentage;
        }
        $discountAmount = $referencePrice > 0 && $offer->discount_percentage
            ? round($referencePrice * ((float) $offer->discount_percentage / 100), 2)
            : 0.0;
        $customerPriceWithPoints = $referencePrice > 0 ? round($referencePrice - $discountAmount, 2) : 0.0;
        $communityCashPrice = $referencePrice > 0 ? round($referencePrice, 2) : 0.0; // Full amount when paying with cash (no points)

        $transformedOffer = [
            'id' => (string) $offer->id,
            'slug' => $offer->slug,
            'title' => $offer->title,
            'image' => $imageUrl ?: '/placeholder.jpg',
            'referencePrice' => $referencePrice > 0 ? round($referencePrice, 2) : null,
            'discountPercentage' => $offer->discount_percentage ? (float) $offer->discount_percentage : null,
            'discountAmount' => $discountAmount,
            'pointsRequired' => $offer->points_required,
            'customerPriceWithPoints' => $customerPriceWithPoints,
            'communityCashPrice' => $communityCashPrice,
            'cashRequired' => $offer->cash_required ? (float) $offer->cash_required : null,
            'merchantName' => $offer->merchant->name,
            'merchantId' => (string) $offer->merchant->id,
            'merchantSlug' => $offer->merchant->slug,
            'category' => $offer->category->name,
            'categorySlug' => $offer->category->slug,
            'description' => $offer->description,
            'shortDescription' => $offer->short_description,
            'currency' => $offer->currency ?? 'USD',
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

