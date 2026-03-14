<?php

namespace App\Http\Controllers\Merchant;

use App\Http\Controllers\Controller;
use App\Models\MerchantHubOfferRedemption;
use App\Models\MerchantHubMerchant;
use App\Models\Merchant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class MerchantRedemptionsController extends Controller
{
    /**
     * Format shipping address for display (null if no shipping data).
     */
    protected function formatShippingAddress(MerchantHubOfferRedemption $redemption): ?array
    {
        if (empty($redemption->shipping_line1) && empty($redemption->shipping_city)) {
            return null;
        }
        return [
            'name' => $redemption->shipping_name,
            'line1' => $redemption->shipping_line1,
            'line2' => $redemption->shipping_line2,
            'city' => $redemption->shipping_city,
            'state' => $redemption->shipping_state,
            'postalCode' => $redemption->shipping_postal_code,
            'country' => $redemption->shipping_country,
        ];
    }

    /**
     * Get or create MerchantHubMerchant for the authenticated merchant
     */
    protected function getOrCreateMerchantHubMerchant(Merchant $merchant): MerchantHubMerchant
    {
        $merchantHubMerchant = MerchantHubMerchant::where('name', $merchant->business_name ?? $merchant->name)
            ->orWhere('slug', \Illuminate\Support\Str::slug($merchant->business_name ?? $merchant->name))
            ->first();

        if (!$merchantHubMerchant) {
            $merchantHubMerchant = MerchantHubMerchant::create([
                'name' => $merchant->business_name ?? $merchant->name,
                'slug' => \Illuminate\Support\Str::slug($merchant->business_name ?? $merchant->name) . '-' . $merchant->id,
                'is_active' => true,
            ]);
        }

        return $merchantHubMerchant;
    }

    /**
     * Display a listing of redemptions for the authenticated merchant's offers.
     */
    public function index(Request $request)
    {
        $merchant = Auth::guard('merchant')->user();

        // Get or create MerchantHubMerchant for this merchant
        $merchantHubMerchant = $this->getOrCreateMerchantHubMerchant($merchant);

        // Get all offer IDs for this merchant
        $offerIds = \App\Models\MerchantHubOffer::where('merchant_hub_merchant_id', $merchantHubMerchant->id)
            ->pluck('id')
            ->toArray();

        // If merchant has no offers, return empty results
        if (empty($offerIds)) {
            return Inertia::render('merchant/Redemptions/Index', [
                'redemptions' => new \Illuminate\Pagination\LengthAwarePaginator(
                    collect([]),
                    0,
                    20,
                    1
                ),
                'stats' => [
                    'total' => 0,
                    'completed' => 0,
                    'pending' => 0,
                    'totalPoints' => 0,
                    'totalCash' => 0.0,
                ],
                'filters' => [
                    'search' => $request->search ?? '',
                    'status' => $request->status ?? '',
                ],
            ]);
        }

        // Query redemptions for this merchant's offers
        $query = MerchantHubOfferRedemption::with(['offer', 'user'])
            ->whereIn('merchant_hub_offer_id', $offerIds);

        // Filter by status
        if ($request->has('status') && $request->status !== '' && $request->status !== 'all') {
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

        // Log for debugging
        \Illuminate\Support\Facades\Log::info('Merchant Redemptions Query', [
            'merchant_id' => $merchant->id,
            'offer_ids' => $offerIds,
            'status_filter' => $request->status,
            'total_results' => $redemptions->total(),
            'current_page' => $redemptions->currentPage(),
        ]);

        // Transform redemptions for frontend
        $transformedRedemptions = $redemptions->through(function ($redemption) {
            $offer = $redemption->offer;
            // Calculate pricing breakdown - use reference_price or cash_required as regular price
            $referencePrice = (float) ($offer->reference_price ?? 0);
            if ($referencePrice <= 0 && $offer->points_required > 0 && $offer->discount_percentage > 0) {
                $referencePrice = ($offer->points_required / 1000) * 100 / (float) $offer->discount_percentage;
            }
            if ($referencePrice <= 0 && $offer->cash_required > 0) {
                $referencePrice = (float) $offer->cash_required;
            }
            $pricingBreakdown = null;
            if ($referencePrice > 0) {
                $discountPercentage = $offer->discount_percentage ? (float) $offer->discount_percentage : 10.0;
                $discountAmount = round($referencePrice * ($discountPercentage / 100), 2);
                if ($offer->discount_cap && $discountAmount > (float) $offer->discount_cap) {
                    $discountAmount = (float) $offer->discount_cap;
                }
                $discountPrice = round($referencePrice - $discountAmount, 2);
                $communityCashPrice = round($referencePrice * 0.90, 2);
                $pricingBreakdown = [
                    'regularPrice' => round($referencePrice, 2),
                    'discountPercentage' => round($discountPercentage, 2),
                    'discountAmount' => $discountAmount,
                    'discountPrice' => $discountPrice,
                    'communityCashPrice' => $communityCashPrice,
                    'currency' => $offer->currency ?? 'USD',
                ];
            }

            $pointsUsed = (int) $redemption->points_spent;
            $cashPaid = $redemption->cash_spent ? (float) $redemption->cash_spent : 0;
            $paymentMethod = $pointsUsed > 0 && $cashPaid > 0 ? 'points_and_cash'
                : ($pointsUsed > 0 ? 'points' : 'cash');

            return [
                'id' => (string) $redemption->id,
                'offerTitle' => $redemption->offer->title ?? 'N/A',
                'customerName' => $redemption->user->name ?? 'N/A',
                'customerEmail' => $redemption->user->email ?? 'N/A',
                'pointsUsed' => $pointsUsed,
                'cashPaid' => $cashPaid > 0 ? $cashPaid : null,
                'paymentMethod' => $paymentMethod,
                'status' => $redemption->status,
                'redeemedAt' => $redemption->created_at->toIso8601String(),
                'usedAt' => $redemption->used_at ? $redemption->used_at->toIso8601String() : null,
                'code' => $redemption->receipt_code,
                'pricingBreakdown' => $pricingBreakdown,
                'currency' => $redemption->offer->currency ?? 'USD',
            ];
        });

        // Calculate stats
        $allRedemptions = MerchantHubOfferRedemption::whereIn('merchant_hub_offer_id', $offerIds)->get();
        $stats = [
            'total' => $allRedemptions->count(),
            'completed' => $allRedemptions->whereIn('status', ['approved', 'fulfilled'])->count(),
            'pending' => $allRedemptions->where('status', 'pending')->count(),
            'totalPoints' => (int) $allRedemptions->sum('points_spent'),
            'totalCash' => (float) $allRedemptions->sum('cash_spent'),
        ];

        return Inertia::render('merchant/Redemptions/Index', [
            'redemptions' => $transformedRedemptions,
            'stats' => $stats,
            'filters' => [
                'search' => $request->search ?? '',
                'status' => $request->status ?? '',
            ],
        ]);
    }

    /**
     * Display a single redemption details.
     */
    public function show(Request $request, $id)
    {
        $merchant = Auth::guard('merchant')->user();

        // Get or create MerchantHubMerchant for this merchant
        $merchantHubMerchant = $this->getOrCreateMerchantHubMerchant($merchant);

        // Get all offer IDs for this merchant
        $offerIds = \App\Models\MerchantHubOffer::where('merchant_hub_merchant_id', $merchantHubMerchant->id)
            ->pluck('id')
            ->toArray();

        // Get redemption and verify it belongs to this merchant
        $redemption = MerchantHubOfferRedemption::with(['offer.merchant', 'offer.category', 'user'])
            ->whereIn('merchant_hub_offer_id', $offerIds)
            ->findOrFail($id);

        // Transform redemption data — use same-origin URL so image loads on merchant dashboard
        $imageUrl = $redemption->offer->image_url ?? null;
        if ($imageUrl && !filter_var($imageUrl, FILTER_VALIDATE_URL)) {
            $imageUrl = asset('storage/' . ltrim($imageUrl, '/'));
        }

        // Build calculation / what supporter paid (works for reference_price BIU and cash_required)
        $offer = $redemption->offer;
        $referencePrice = (float) ($offer->reference_price ?? 0);
        if ($referencePrice <= 0 && $offer->points_required > 0 && $offer->discount_percentage > 0) {
            $referencePrice = ($offer->points_required / 1000) * 100 / (float) $offer->discount_percentage;
        }
        if ($referencePrice <= 0 && $offer->cash_required > 0) {
            $referencePrice = (float) $offer->cash_required;
        }
        $discountPercentage = $offer->discount_percentage ? (float) $offer->discount_percentage : 10.0;
        $discountAmount = $referencePrice > 0 ? round($referencePrice * ($discountPercentage / 100), 2) : 0.0;
        if ($offer->discount_cap && $discountAmount > (float) $offer->discount_cap) {
            $discountAmount = (float) $offer->discount_cap;
        }
        $priceAfterDiscount = $referencePrice > 0 ? round($referencePrice - $discountAmount, 2) : 0.0;
        $communityCashPrice = $referencePrice > 0 ? round($referencePrice * 0.90, 2) : 0.0;
        $currency = $offer->currency ?? 'USD';

        $pricingBreakdown = null;
        if ($referencePrice > 0) {
            $pricingBreakdown = [
                'regularPrice' => round($referencePrice, 2),
                'discountPercentage' => round($discountPercentage, 2),
                'discountAmount' => $discountAmount,
                'discountPrice' => $priceAfterDiscount,
                'communityCashPrice' => $communityCashPrice,
                'currency' => $currency,
            ];
        }

        $redemptionData = [
            'id' => (string) $redemption->id,
            'code' => $redemption->receipt_code,
            'offerTitle' => $redemption->offer->title ?? 'N/A',
            'offerDescription' => $redemption->offer->description ?? '',
            'offerImage' => $imageUrl ?: '/placeholder.jpg',
            'customerName' => $redemption->user->name ?? 'N/A',
            'customerEmail' => $redemption->user->email ?? 'N/A',
            'pointsUsed' => $redemption->points_spent,
            'cashPaid' => $redemption->cash_spent ? (float) $redemption->cash_spent : null,
            'status' => $redemption->status,
            'redeemedAt' => $redemption->created_at->toIso8601String(),
            'updatedAt' => $redemption->updated_at->toIso8601String(),
            'usedAt' => $redemption->used_at ? $redemption->used_at->toIso8601String() : null,
            'qrCodeUrl' => route('redemptions.qr-code', ['code' => $redemption->receipt_code]),
            'pricingBreakdown' => $pricingBreakdown,
            'currency' => $currency,
            'shippingAddress' => $this->formatShippingAddress($redemption),
        ];

        return Inertia::render('merchant/Redemptions/Show', [
            'redemption' => $redemptionData,
        ]);
    }

    /**
     * Generate QR code for redemption
     */
    public function generateQrCode(Request $request, $code)
    {
        try {
            $merchant = Auth::guard('merchant')->user();

            if (!$merchant) {
                // Return a simple error QR code if not authenticated
                $errorQr = QrCode::format('svg')
                    ->size(300)
                    ->margin(2)
                    ->generate('Authentication required');

                return response($errorQr, 200, [
                    'Content-Type' => 'image/svg+xml',
                    'Cache-Control' => 'no-cache, no-store, must-revalidate',
                ]);
            }

            // Get or create MerchantHubMerchant for this merchant
            $merchantHubMerchant = $this->getOrCreateMerchantHubMerchant($merchant);

            // Get all offer IDs for this merchant
            $offerIds = \App\Models\MerchantHubOffer::where('merchant_hub_merchant_id', $merchantHubMerchant->id)
                ->pluck('id')
                ->toArray();

            if (empty($offerIds)) {
                // Return error QR if merchant has no offers
                $errorQr = QrCode::format('svg')
                    ->size(300)
                    ->margin(2)
                    ->generate('No offers found');

                return response($errorQr, 200, [
                    'Content-Type' => 'image/svg+xml',
                    'Cache-Control' => 'no-cache, no-store, must-revalidate',
                ]);
            }

            // Verify redemption belongs to this merchant
            $redemption = MerchantHubOfferRedemption::whereIn('merchant_hub_offer_id', $offerIds)
                ->where('receipt_code', $code)
                ->first();

            if (!$redemption) {
                // Return error QR if redemption not found
                $errorQr = QrCode::format('svg')
                    ->size(300)
                    ->margin(2)
                    ->generate('Redemption not found');

                return response($errorQr, 200, [
                    'Content-Type' => 'image/svg+xml',
                    'Cache-Control' => 'no-cache, no-store, must-revalidate',
                ]);
            }

            // Create verification URL
            $verificationUrl = route('redemptions.verify', ['code' => $code]);

            // Generate QR code as SVG (doesn't require imagick)
            $qrCode = QrCode::format('svg')
                ->size(300)
                ->margin(2)
                ->errorCorrection('M')
                ->generate($verificationUrl);

            return response($qrCode, 200, [
                'Content-Type' => 'image/svg+xml',
                'Cache-Control' => 'no-cache, no-store, must-revalidate',
                'Pragma' => 'no-cache',
                'Expires' => '0'
            ]);
        } catch (\Exception $e) {
            Log::error('QR Code generation failed: ' . $e->getMessage());

            // Return error QR code as SVG (doesn't require imagick)
            try {
                $errorQr = QrCode::format('svg')
                    ->size(300)
                    ->margin(2)
                    ->generate('Error: Unable to generate QR code');

                return response($errorQr, 200, [
                    'Content-Type' => 'image/svg+xml',
                    'Cache-Control' => 'no-cache, no-store, must-revalidate',
                    'Pragma' => 'no-cache',
                    'Expires' => '0'
                ]);
            } catch (\Exception $e2) {
                // If even SVG fails, return a simple text response
                return response('QR Code generation failed', 500);
            }
        }
    }

    /**
     * Verify redemption code
     */
    public function verify(Request $request, $code)
    {
        $merchant = Auth::guard('merchant')->user();

        // Get or create MerchantHubMerchant for this merchant
        $merchantHubMerchant = $this->getOrCreateMerchantHubMerchant($merchant);

        // Get all offer IDs for this merchant
        $offerIds = \App\Models\MerchantHubOffer::where('merchant_hub_merchant_id', $merchantHubMerchant->id)
            ->pluck('id')
            ->toArray();

        $redemption = MerchantHubOfferRedemption::with(['offer', 'user'])
            ->whereIn('merchant_hub_offer_id', $offerIds)
            ->where('receipt_code', $code)
            ->first();

        $valid = $redemption && in_array($redemption->status, ['approved', 'fulfilled']);

        return Inertia::render('merchant/Redemptions/Verify', [
            'code' => $code,
            'valid' => $valid,
            'redemption' => $valid && $redemption ? [
                'id' => $redemption->id,
                'code' => $redemption->receipt_code,
                'offer' => [
                    'title' => $redemption->offer->title,
                ],
                'user' => [
                    'name' => $redemption->user->name,
                    'email' => $redemption->user->email,
                ],
                'points_spent' => $redemption->points_spent,
                'cash_spent' => $redemption->cash_spent,
                'status' => $redemption->status,
                'redeemed_at' => $redemption->created_at->toIso8601String(),
            ] : null,
        ]);
    }
}

