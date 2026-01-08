<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use SimpleSoftwareIO\QrCode\Facades\QrCode;
use Illuminate\Support\Str;

class MerchantRedemptionController extends Controller
{
    /**
     * Process redemption request
     */
    public function redeem(Request $request)
    {
        $request->validate([
            'offer_id' => 'required|string',
            'points_used' => 'required|integer|min:1',
            'cash_paid' => 'nullable|numeric|min:0',
        ]);

        $user = Auth::user();

        // Generate unique redemption code
        $redemptionCode = 'RED-' . strtoupper(Str::random(8));
        $redemptionId = Str::uuid()->toString();

        // Create verification URL for QR code
        $verificationUrl = route('merchant.redemption.verify', ['code' => $redemptionCode]);

        // Store redemption data (in production, save to database)
        // For now, we'll just return the data
        $redemption = [
            'id' => $redemptionId,
            'code' => $redemptionCode,
            'offer_id' => $request->offer_id,
            'points_used' => $request->points_used,
            'cash_paid' => $request->cash_paid ?? 0,
            'user_id' => $user->id,
            'user_name' => $user->name,
            'user_email' => $user->email,
            'redeemed_at' => now()->toIso8601String(),
            'status' => 'completed',
            'qr_code_url' => route('merchant.redemption.qr-code', ['code' => $redemptionCode]),
        ];

        return redirect()->route('merchant.redemption.confirmed', [
            'code' => $redemptionCode
        ])->with('redemption', $redemption);
    }

    /**
     * Show redemption confirmation page
     */
    public function confirmed(Request $request, $code = null)
    {
        $redemption = $request->session()->get('redemption');

        // If no redemption in session, create a mock one for demo
        if (!$redemption && $code) {
            $redemption = [
                'code' => $code,
                'points_used' => 5000,
                'cash_paid' => 10,
                'status' => 'completed',
                'qr_code_url' => route('merchant.redemption.qr-code', ['code' => $code]),
            ];
        }

        return Inertia::render('merchant/RedemptionConfirmed', [
            'redemption' => $redemption,
        ]);
    }

    /**
     * Generate QR code for redemption
     */
    public function generateQrCode(Request $request, $code)
    {
        try {
            // Create verification URL
            $verificationUrl = route('merchant.redemption.verify', ['code' => $code]);

            // Generate QR code as PNG
            $qrCode = QrCode::format('png')
                ->size(300)
                ->margin(2)
                ->errorCorrection('M')
                ->color(0, 0, 0)
                ->backgroundColor(255, 255, 255)
                ->generate($verificationUrl);

            return response($qrCode, 200, [
                'Content-Type' => 'image/png',
                'Cache-Control' => 'no-cache, no-store, must-revalidate',
                'Pragma' => 'no-cache',
                'Expires' => '0'
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('QR Code generation failed: ' . $e->getMessage());
            
            // Return error QR code
            $errorQr = QrCode::format('png')
                ->size(300)
                ->margin(2)
                ->color(0, 0, 0)
                ->backgroundColor(255, 255, 255)
                ->generate('Error: Unable to generate QR code');

            return response($errorQr, 200, [
                'Content-Type' => 'image/png',
                'Cache-Control' => 'no-cache, no-store, must-revalidate',
                'Pragma' => 'no-cache',
                'Expires' => '0'
            ]);
        }
    }

    /**
     * Verify redemption code (for merchant scanning)
     */
    public function verify(Request $request, $code)
    {
        // In production, verify code against database
        return Inertia::render('merchant/RedemptionVerify', [
            'code' => $code,
            'valid' => true, // In production, check database
        ]);
    }
}
