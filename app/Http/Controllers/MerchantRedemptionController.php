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

            // Generate unique receipt code
            $receiptCode = 'RED-' . strtoupper(Str::random(8));

            // Check if cash payment is required
            $cashRequired = $offer->cash_required ?? 0;

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

            // If cash is required, create Stripe checkout session
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
        $redemption = MerchantHubOfferRedemption::with(['offer', 'user'])
            ->where('receipt_code', $code)
            ->first();

        $valid = $redemption && in_array($redemption->status, ['approved', 'fulfilled']);

        return Inertia::render('frontend/merchant-hub/RedemptionVerify', [
            'code' => $code,
            'valid' => $valid,
            'redemption' => $valid ? [
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
