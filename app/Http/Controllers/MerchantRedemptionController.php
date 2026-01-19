<?php

namespace App\Http\Controllers;

use App\Models\MerchantHubOffer;
use App\Models\MerchantHubOfferRedemption;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class MerchantRedemptionController extends Controller
{
    /**
     * Process redemption request
     */
    public function redeem(Request $request)
    {
        $request->validate([
            'offer_id' => 'required|integer|exists:merchant_hub_offers,id',
        ]);

        $user = Auth::user();

        if (!$user) {
            return back()->withErrors(['error' => 'You must be logged in to redeem offers.']);
        }

        DB::beginTransaction();

        try {
            $offer = MerchantHubOffer::with(['merchant', 'category'])->findOrFail($request->offer_id);
            $merchantId = $offer->merchant_hub_merchant_id;

            // Validate offer is available
            if (!$offer->isAvailable()) {
                return back()->withErrors(['error' => 'This offer is no longer available.']);
            }

            // Check user has enough points
            $userPoints = $user->currentBelievePoints();
            if ($userPoints < $offer->points_required) {
                return back()->withErrors([
                    'error' => 'You do not have enough points. You need ' . number_format($offer->points_required) . ' points, but you only have ' . number_format($userPoints) . ' points.'
                ]);
            }

            // ===== 10% DISCOUNT HUB RULES =====
            
            // Rule 1: Check if user already redeemed from this merchant this month
            $currentMonth = now()->startOfMonth();
            $existingRedemption = MerchantHubOfferRedemption::where('user_id', $user->id)
                ->whereHas('offer', function($q) use ($merchantId) {
                    $q->where('merchant_hub_merchant_id', $merchantId);
                })
                ->where('status', '!=', 'canceled')
                ->where('created_at', '>=', $currentMonth)
                ->first();

            if ($existingRedemption) {
                DB::rollBack();
                return back()->withErrors([
                    'error' => 'You have already redeemed from this merchant this month. One redemption per merchant per month.'
                ]);
            }

            // Rule 2: Check if points exceed 100 per merchant per month
            $monthlyPointsRedeemed = MerchantHubOfferRedemption::where('user_id', $user->id)
                ->whereHas('offer', function($q) use ($merchantId) {
                    $q->where('merchant_hub_merchant_id', $merchantId);
                })
                ->where('status', '!=', 'canceled')
                ->where('created_at', '>=', $currentMonth)
                ->sum('points_spent');

            if ($monthlyPointsRedeemed + $offer->points_required > 100) {
                DB::rollBack();
                $remainingPoints = 100 - $monthlyPointsRedeemed;
                return back()->withErrors([
                    'error' => 'You can only redeem up to 100 points per merchant per month. You have already redeemed ' . $monthlyPointsRedeemed . ' points this month. You can redeem up to ' . $remainingPoints . ' more points.'
                ]);
            }

            // Rule 3: For standard 10% discount offers, must be exactly 100 points
            if ($offer->is_standard_discount && $offer->points_required != 100) {
                DB::rollBack();
                return back()->withErrors([
                    'error' => 'Standard 10% discount offers require exactly 100 points.'
                ]);
            }

            // Generate unique receipt code
            $receiptCode = 'RED-' . strtoupper(Str::random(8));

            // For standard 10% discount offers, no cash is required
            // Only non-standard offers can have cash requirements
            $cashRequired = 0;
            if (!$offer->is_standard_discount && $offer->cash_required) {
                $cashRequired = (float) $offer->cash_required;
            }

            // Create redemption record (pending status if cash required, approved if not)
            $status = $cashRequired > 0 ? 'pending' : 'approved';

            $redemption = MerchantHubOfferRedemption::create([
                'merchant_hub_offer_id' => $offer->id,
                'user_id' => $user->id,
                'points_spent' => $offer->points_required,
                'cash_spent' => $cashRequired,
                'status' => $status,
                'receipt_code' => $receiptCode,
            ]);

            // Deduct points immediately
            $user->deductBelievePoints($offer->points_required);

            // If cash is required (only for non-standard offers), show error
            // Standard 10% discount offers are points-only
            if ($cashRequired > 0) {
                // For now, we'll mark as pending and redirect to payment
                // In production, you'd create a Stripe checkout session here
                DB::commit();

                return redirect()->route('merchant-hub.offer.show', $offer->id)
                    ->with('error', 'Cash payment processing not yet implemented. Please contact support.');
            }

            DB::commit();

            return redirect()->route('merchant-hub.redemption.confirmed', [
                'code' => $receiptCode
            ])->with('redemption', [
                'id' => $redemption->id,
                'code' => $receiptCode,
                'offer' => [
                    'id' => $offer->id,
                    'title' => $offer->title,
                ],
                'points_spent' => $offer->points_required,
                'cash_spent' => $cashRequired,
                'status' => $status,
                'redeemed_at' => $redemption->created_at->toIso8601String(),
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Redemption failed: ' . $e->getMessage());
            return back()->withErrors(['error' => 'An error occurred during redemption. Please try again.']);
        }
    }

    /**
     * Show redemption confirmation page
     */
    public function confirmed(Request $request, $code = null)
    {
        $redemptionData = $request->session()->get('redemption');

        if (!$redemptionData && $code) {
            $redemption = MerchantHubOfferRedemption::with(['offer', 'user'])
                ->where('receipt_code', $code)
                ->firstOrFail();

            $redemptionData = [
                'id' => $redemption->id,
                'code' => $redemption->receipt_code,
                'offer' => [
                    'id' => $redemption->offer->id,
                    'title' => $redemption->offer->title,
                    'image' => $redemption->offer->image_url ?: '/placeholder.jpg',
                ],
                'points_spent' => $redemption->points_spent,
                'cash_spent' => $redemption->cash_spent,
                'status' => $redemption->status,
                'redeemed_at' => $redemption->created_at->toIso8601String(),
                'qr_code_url' => route('merchant-hub.redemption.qr-code', ['code' => $redemption->receipt_code]),
            ];
        }

        if (!$redemptionData) {
            return redirect()->route('merchant-hub.index')
                ->with('error', 'Redemption not found.');
        }

        return Inertia::render('frontend/merchant-hub/RedemptionConfirmed', [
            'redemption' => $redemptionData,
        ]);
    }

    /**
     * Generate QR code for redemption
     */
    public function generateQrCode(Request $request, $code)
    {
        try {
            Log::info('QR Code generation requested', [
                'code' => $code,
                'user_id' => Auth::id(),
                'authenticated' => Auth::check(),
                'ip' => $request->ip()
            ]);

            // Verify the redemption exists (no auth required for QR code generation)
            $redemption = MerchantHubOfferRedemption::where('receipt_code', $code)->first();

            if (!$redemption) {
                Log::warning('QR Code generation attempted for non-existent redemption code: ' . $code);
                // Still generate a QR code with error message
                $errorQr = QrCode::format('svg')
                    ->size(300)
                    ->margin(2)
                    ->generate('Redemption not found: ' . $code);

                return response($errorQr, 200, [
                    'Content-Type' => 'image/svg+xml',
                    'Cache-Control' => 'no-cache, no-store, must-revalidate',
                ]);
            }

            // Create verification URL
            $verificationUrl = route('merchant-hub.redemption.verify', ['code' => $code]);
            Log::info('QR Code verification URL generated', ['url' => $verificationUrl]);

            // Generate QR code as SVG (doesn't require imagick)
            $qrCode = QrCode::format('svg')
                ->size(300)
                ->margin(2)
                ->errorCorrection('M')
                ->generate($verificationUrl);

            Log::info('QR Code generated successfully', ['code' => $code]);

            return response($qrCode, 200, [
                'Content-Type' => 'image/svg+xml',
                'Cache-Control' => 'no-cache, no-store, must-revalidate',
                'Pragma' => 'no-cache',
                'Expires' => '0'
            ]);
        } catch (\Exception $e) {
            Log::error('QR Code generation failed: ' . $e->getMessage());

            // Return error QR code as SVG
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
                return response('QR Code generation failed', 500);
            }
        }
    }

    /**
     * Verify redemption code (for merchant scanning)
     */
    public function verify(Request $request, $code)
    {
        $redemption = MerchantHubOfferRedemption::with(['offer.merchant', 'user', 'eligibleItem'])
            ->where('receipt_code', $code)
            ->first();

        if (!$redemption) {
            return response()->json([
                'error' => 'Redemption code not found.',
            ], 404);
        }

        // Check if already used
        if ($redemption->isUsed()) {
            return response()->json([
                'error' => 'This redemption has already been used.',
                'used_at' => $redemption->used_at->toIso8601String(),
            ], 400);
        }

        // Check if expired (optional - e.g., 30 days)
        if ($redemption->created_at->addDays(30)->isPast()) {
            return response()->json([
                'error' => 'This redemption has expired. Redemptions are valid for 30 days.',
            ], 400);
        }

        // If merchant is authenticated, verify merchant matches
        if (Auth::guard('merchant')->check()) {
            $merchant = Auth::guard('merchant')->user();
            $merchantHubMerchant = $this->getOrCreateMerchantHubMerchant($merchant);
            
            if ($redemption->offer->merchant_hub_merchant_id !== $merchantHubMerchant->id) {
                return response()->json([
                    'error' => 'This redemption is not for your merchant.',
                ], 403);
            }
        }

        // Get eligible items for this merchant
        $eligibleItems = $redemption->offer->merchant->eligibleItems()
            ->where('is_active', true)
            ->get()
            ->map(function($item) {
                return [
                    'id' => $item->id,
                    'item_name' => $item->item_name,
                    'description' => $item->description,
                    'price' => $item->price,
                    'discount_cap' => $item->discount_cap,
                    'has_reached_limit' => $item->hasReachedLimit(),
                ];
            });

        return response()->json([
            'success' => true,
            'redemption' => [
                'id' => $redemption->id,
                'code' => $redemption->receipt_code,
                'user_name' => $redemption->user->name,
                'user_email' => $redemption->user->email,
                'points_spent' => $redemption->points_spent,
                'cash_spent' => $redemption->cash_spent,
                'status' => $redemption->status,
                'discount_percentage' => $redemption->offer->discount_percentage ?? 10,
                'discount_cap' => $redemption->offer->discount_cap,
                'eligible_items' => $eligibleItems,
                'redeemed_at' => $redemption->created_at->toIso8601String(),
            ],
        ]);
    }

    /**
     * Mark redemption as used (for merchant after applying discount)
     */
    public function markAsUsed(Request $request, $code)
    {
        $request->validate([
            'eligible_item_id' => 'nullable|exists:merchant_hub_eligible_items,id',
            'discount_amount' => 'nullable|numeric|min:0',
        ]);

        $merchant = Auth::guard('merchant')->user();
        if (!$merchant) {
            return response()->json([
                'error' => 'Merchant authentication required.',
            ], 401);
        }

        $merchantHubMerchant = $this->getOrCreateMerchantHubMerchant($merchant);

        $redemption = MerchantHubOfferRedemption::with(['offer'])
            ->where('receipt_code', $code)
            ->firstOrFail();

        // Verify merchant matches
        if ($redemption->offer->merchant_hub_merchant_id !== $merchantHubMerchant->id) {
            return response()->json([
                'error' => 'This redemption is not for your merchant.',
            ], 403);
        }

        // Check if already used
        if ($redemption->isUsed()) {
            return response()->json([
                'error' => 'This redemption has already been used.',
            ], 400);
        }

        // Check if eligible item is valid (if provided)
        if ($request->filled('eligible_item_id')) {
            $eligibleItem = $merchantHubMerchant->eligibleItems()
                ->where('id', $request->eligible_item_id)
                ->where('is_active', true)
                ->first();

            if (!$eligibleItem) {
                return response()->json([
                    'error' => 'Invalid eligible item selected.',
                ], 400);
            }

            // Check quantity limit
            if ($eligibleItem->hasReachedLimit()) {
                return response()->json([
                    'error' => 'This item has reached its redemption limit.',
                ], 400);
            }
        }

        DB::beginTransaction();
        try {
            // Mark as used
            $redemption->update([
                'status' => 'fulfilled',
                'used_at' => now(),
                'verified_by_merchant_id' => $merchant->id,
                'eligible_item_id' => $request->eligible_item_id,
                'discount_amount' => $request->discount_amount,
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Redemption marked as used successfully.',
                'redemption' => [
                    'id' => $redemption->id,
                    'code' => $redemption->receipt_code,
                    'used_at' => $redemption->used_at->toIso8601String(),
                ],
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to mark redemption as used: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to mark redemption as used. Please try again.',
            ], 500);
        }
    }

    /**
     * Get or create MerchantHubMerchant for the authenticated merchant.
     */
    private function getOrCreateMerchantHubMerchant($merchant)
    {
        $name = $merchant->business_name ?? $merchant->name;
        $slug = \Illuminate\Support\Str::slug($name);

        // Try to find by name or slug
        $merchantHubMerchant = \App\Models\MerchantHubMerchant::where('name', $name)
            ->orWhere('slug', $slug)
            ->first();

        if (!$merchantHubMerchant) {
            // Ensure slug is unique
            $originalSlug = $slug;
            $counter = 1;
            while (\App\Models\MerchantHubMerchant::where('slug', $slug)->exists()) {
                $slug = $originalSlug . '-' . $counter;
                $counter++;
            }

            // Create new MerchantHubMerchant
            $merchantHubMerchant = \App\Models\MerchantHubMerchant::create([
                'name' => $name,
                'slug' => $slug,
                'is_active' => true,
            ]);
        }

        return $merchantHubMerchant;
    }
}
