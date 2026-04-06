<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CardWallet;
use App\Models\BridgeIntegration;
use App\Models\Organization;
use Illuminate\Http\Request;

class CardController extends Controller
{
    /**
     * Get user cards
     */
    public function index(Request $request)
    {
        $user = $request->user();
        
        // Check if user is an organization user
        $isOrgUser = $user->hasRole(['organization', 'organization_pending']);
        
        $entity = $isOrgUser ? $user->organization : $user;
        $entityType = $isOrgUser ? Organization::class : \App\Models\User::class;

        // Get integration
        $integration = BridgeIntegration::where('integratable_id', $entity->id)
            ->where('integratable_type', $entityType)
            ->first();

        if (!$integration) {
            return response()->json([
                'success' => true,
                'data' => []
            ]);
        }

        // Get card wallets for this integration
        $cardWallets = CardWallet::where('bridge_integration_id', $integration->id)
            ->orderBy('is_primary', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        // Map to frontend format
        $cards = $cardWallets->map(function ($cardWallet) {
            // Format expiry date
            $expiry = '';
            if ($cardWallet->expiry_month && $cardWallet->expiry_year) {
                $month = str_pad($cardWallet->expiry_month, 2, '0', STR_PAD_LEFT);
                $year = substr($cardWallet->expiry_year, -2);
                $expiry = "{$month}/{$year}";
            }

            // Determine card type (visa or mastercard)
            $cardType = 'visa'; // default
            if ($cardWallet->card_brand) {
                $brand = strtolower($cardWallet->card_brand);
                if (strpos($brand, 'mastercard') !== false || strpos($brand, 'master') !== false) {
                    $cardType = 'mastercard';
                } else {
                    $cardType = 'visa';
                }
            }

            // Map status
            $status = 'active';
            if ($cardWallet->status === 'frozen' || $cardWallet->status === 'suspended') {
                $status = 'frozen';
            } else if ($cardWallet->status === 'cancelled' || $cardWallet->status === 'expired') {
                $status = 'cancelled';
            } else if ($cardWallet->status === 'active') {
                $status = 'active';
            } else {
                $status = 'active'; // default
            }

            // Get card number (last 4 digits)
            $cardNumber = $cardWallet->card_number ?? '';
            // If card_number is full, extract last 4
            if (strlen($cardNumber) > 4) {
                $cardNumber = substr($cardNumber, -4);
            }
            // Format as masked: **** **** **** 1234
            if (strlen($cardNumber) === 4) {
                $cardNumber = "**** **** **** {$cardNumber}";
            }

            // Get card name from metadata or generate default
            $cardName = 'Virtual Card';
            if ($cardWallet->card_metadata && is_array($cardWallet->card_metadata)) {
                $cardName = $cardWallet->card_metadata['name'] ?? 
                           $cardWallet->card_metadata['cardholder_name'] ?? 
                           'Virtual Card';
            }

            // Get CVV from metadata if available
            $cvv = '';
            if ($cardWallet->card_metadata && is_array($cardWallet->card_metadata)) {
                $cvv = $cardWallet->card_metadata['cvv'] ?? 
                      $cardWallet->card_metadata['security_code'] ?? 
                      $cardWallet->card_metadata['cvc'] ?? '';
            }

            return [
                'id' => (string) $cardWallet->id,
                'name' => $cardName,
                'cardNumber' => $cardNumber,
                'cvv' => $cvv,
                'expiry' => $expiry,
                'status' => $status,
                'balance' => (float) ($cardWallet->balance ?? 0),
                'type' => $cardType,
                'createdAt' => $cardWallet->created_at->toISOString(),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $cards->values()->all()
        ]);
    }

    /**
     * Get specific card
     */
    public function show(Request $request, $id)
    {
        $user = $request->user();
        
        // Check if user is an organization user
        $isOrgUser = $user->hasRole(['organization', 'organization_pending']);
        
        $entity = $isOrgUser ? $user->organization : $user;
        $entityType = $isOrgUser ? Organization::class : \App\Models\User::class;

        // Get integration
        $integration = BridgeIntegration::where('integratable_id', $entity->id)
            ->where('integratable_type', $entityType)
            ->first();

        if (!$integration) {
            return response()->json([
                'success' => false,
                'message' => 'Bridge integration not found'
            ], 404);
        }

        // Get card wallet
        $cardWallet = CardWallet::where('bridge_integration_id', $integration->id)
            ->where('id', $id)
            ->first();

        if (!$cardWallet) {
            return response()->json([
                'success' => false,
                'message' => 'Card not found'
            ], 404);
        }

        // Format expiry date
        $expiry = '';
        if ($cardWallet->expiry_month && $cardWallet->expiry_year) {
            $month = str_pad($cardWallet->expiry_month, 2, '0', STR_PAD_LEFT);
            $year = substr($cardWallet->expiry_year, -2);
            $expiry = "{$month}/{$year}";
        }

        // Determine card type
        $cardType = 'visa';
        if ($cardWallet->card_brand) {
            $brand = strtolower($cardWallet->card_brand);
            if (strpos($brand, 'mastercard') !== false || strpos($brand, 'master') !== false) {
                $cardType = 'mastercard';
            }
        }

        // Map status
        $status = 'active';
        if ($cardWallet->status === 'frozen' || $cardWallet->status === 'suspended') {
            $status = 'frozen';
        } else if ($cardWallet->status === 'cancelled' || $cardWallet->status === 'expired') {
            $status = 'cancelled';
        }

        // Get card number
        $cardNumber = $cardWallet->card_number ?? '';
        if (strlen($cardNumber) > 4) {
            $cardNumber = substr($cardNumber, -4);
        }
        if (strlen($cardNumber) === 4) {
            $cardNumber = "**** **** **** {$cardNumber}";
        }

        // Get card name and CVV
        $cardName = 'Virtual Card';
        $cvv = '';
        if ($cardWallet->card_metadata && is_array($cardWallet->card_metadata)) {
            $cardName = $cardWallet->card_metadata['name'] ?? 
                       $cardWallet->card_metadata['cardholder_name'] ?? 
                       'Virtual Card';
            $cvv = $cardWallet->card_metadata['cvv'] ?? 
                  $cardWallet->card_metadata['security_code'] ?? 
                  $cardWallet->card_metadata['cvc'] ?? '';
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id' => (string) $cardWallet->id,
                'name' => $cardName,
                'cardNumber' => $cardNumber,
                'cvv' => $cvv,
                'expiry' => $expiry,
                'status' => $status,
                'balance' => (float) ($cardWallet->balance ?? 0),
                'type' => $cardType,
                'createdAt' => $cardWallet->created_at->toISOString(),
            ]
        ]);
    }
}
