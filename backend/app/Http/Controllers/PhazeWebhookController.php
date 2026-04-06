<?php

namespace App\Http\Controllers;

use App\Models\GiftCard;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class PhazeWebhookController extends Controller
{
    /**
     * Handle Phaze webhook for gift card purchase status updates
     * This webhook fires whenever the status of a transaction changes
     *
     * Webhook should be registered with Phaze API using:
     * POST /webhooks
     * {
     *   "url": "https://yourdomain.com/webhooks/phaze",
     *   "apiKey": "your-webhook-secret-key",
     *   "authorizationHeaderName": "authorization"
     * }
     */
    public function handle(Request $request)
    {
        $payload = $request->all();

        Log::info('Phaze Webhook Received', [
            'payload' => $payload,
            'ip' => $request->ip(),
        ]);

        try {
            // Verify webhook authorization against database
            $authHeader = $request->header('authorization') ?? $request->header('Authorization');

            if (empty($authHeader)) {
                Log::warning('Phaze webhook missing authorization header');
                return response()->json(['error' => 'Unauthorized'], 401);
            }

            // Find webhook by API key from database
            $webhook = \App\Models\PhazeWebhook::where('is_active', true)
                ->where('api_key', $authHeader)
                ->first();

            if (!$webhook) {
                Log::warning('Invalid Phaze webhook authorization', [
                    'received_key_preview' => substr($authHeader, 0, 8) . '...',
                    'webhook_count' => \App\Models\PhazeWebhook::where('is_active', true)->count(),
                ]);
                return response()->json(['error' => 'Unauthorized'], 401);
            }

            // Extract transaction data from payload
            $transactionId = $payload['id'] ?? null;
            $orderId = $payload['orderID'] ?? null;
            $status = $payload['status'] ?? null;
            $productId = $payload['productId'] ?? null;
            $externalUserId = $payload['externalUserId'] ?? null;
            $voucher = $payload['voucher'] ?? null;
            $error = $payload['error'] ?? null;

            if (!$transactionId && !$orderId) {
                Log::warning('Phaze webhook missing transaction ID or order ID', [
                    'payload' => $payload,
                ]);
                return response()->json(['error' => 'Missing transaction ID or order ID'], 400);
            }

            // Find gift card by orderId (stored in meta) or external_id
            $giftCard = null;

            if ($orderId) {
                // Search by orderId in meta
                $giftCard = GiftCard::whereJsonContains('meta->orderId', $orderId)->first();
            }

            if (!$giftCard && $transactionId) {
                // Try to find by external_id (Phaze transaction ID)
                $giftCard = GiftCard::where('external_id', $transactionId)->first();
            }

            if (!$giftCard && $externalUserId) {
                // Last resort: find by user_id and productId
                $giftCard = GiftCard::where('user_id', $externalUserId)
                    ->whereJsonContains('meta->productId', $productId)
                    ->whereNotNull('purchased_at')
                    ->orderBy('purchased_at', 'desc')
                    ->first();
            }

            if (!$giftCard) {
                Log::warning('Phaze webhook: Gift card not found', [
                    'transaction_id' => $transactionId,
                    'order_id' => $orderId,
                    'external_user_id' => $externalUserId,
                ]);
                return response()->json(['error' => 'Gift card not found'], 404);
            }

            DB::beginTransaction();

            // Calculate commissions from webhook payload if not already calculated
            // IMPORTANT: The commission amount from Phaze API is the TOTAL commission that should go to the organization
            // Platform (Believe) takes 8% of this total commission, and the nonprofit gets the remaining 92%

            // Phaze provides commission as a direct amount in these fields:
            // 1. 'commission' - direct commission amount (preferred)
            // 2. 'phazeCommission' - alternative field name for commission amount
            // 3. 'commissionAmount' - alternative field name for commission amount

            // If commission is provided as percentage, we calculate it from purchase amount:
            // 'commissionPercentage' or 'commission_percentage' - percentage of purchase amount

            $totalCommission = null;
            $commissionPercentage = null;

            // First, check if Phaze provides commission as a direct amount (this is what organization should receive)
            if (isset($payload['commission']) && is_numeric($payload['commission']) && $giftCard->total_commission === null) {
                $totalCommission = (float)$payload['commission'];
            } elseif (isset($payload['phazeCommission']) && is_numeric($payload['phazeCommission']) && $giftCard->total_commission === null) {
                $totalCommission = (float)$payload['phazeCommission'];
            } elseif (isset($payload['commissionAmount']) && is_numeric($payload['commissionAmount']) && $giftCard->total_commission === null) {
                $totalCommission = (float)$payload['commissionAmount'];
            } else {
                $totalCommission = $giftCard->total_commission;
            }

            // If we have a commission amount, calculate the percentage for reference
            if ($totalCommission !== null && $totalCommission > 0 && $giftCard->amount > 0) {
                $commissionPercentage = ($totalCommission / $giftCard->amount) * 100;
            }

            // If no direct amount found, check for percentage (fallback)
            if ($totalCommission === null || $totalCommission === 0) {
                $commissionPercentage = $payload['commissionPercentage'] ??
                                      $payload['commission_percentage'] ??
                                      $giftCard->commission_percentage;

                if ($commissionPercentage !== null && is_numeric($commissionPercentage) && $giftCard->total_commission === null) {
                    // Commission is a percentage of the purchase amount
                    $totalCommission = ($giftCard->amount * (float)$commissionPercentage) / 100;
                } elseif ($giftCard->total_commission !== null) {
                    $totalCommission = $giftCard->total_commission;
                }
            }

            // Calculate platform and nonprofit commissions if not already set
            // The totalCommission from Phaze is what the organization should receive
            // Platform takes 8% of this total commission
            // Nonprofit gets the remaining 92%
            $platformCommissionPercentage = config('services.phaze.gift_card_platform_commission_percentage', 8);
            $platformCommission = $giftCard->platform_commission;
            $nonprofitCommission = $giftCard->nonprofit_commission;

            if ($totalCommission !== null && $totalCommission > 0 && $platformCommission === null) {
                // Platform takes 8% of the total commission (from Phaze)
                $platformCommission = ($totalCommission * $platformCommissionPercentage) / 100;
                // Nonprofit gets the rest (92% of the total commission)
                $nonprofitCommission = $totalCommission - $platformCommission;
            }

            // Update gift card with Phaze transaction data
            $existingMeta = $giftCard->meta ?? [];
            $updateData = [
                'external_id' => $transactionId ?? $giftCard->external_id,
                'commission_percentage' => $commissionPercentage ?? $giftCard->commission_percentage,
                'total_commission' => $totalCommission ?? $giftCard->total_commission,
                'platform_commission' => $platformCommission ?? $giftCard->platform_commission,
                'nonprofit_commission' => $nonprofitCommission ?? $giftCard->nonprofit_commission,
                'meta' => array_merge($existingMeta, [
                    'phaze_purchase' => $payload, // Store full purchase data from webhook
                    'phaze_webhook' => $payload,
                    'phaze_status' => $status,
                    'phaze_updated_at' => now()->toIso8601String(),
                    'orderId' => $orderId ?? $existingMeta['orderId'] ?? null,
                    'phaze_transaction_id' => $transactionId,
                    'commission_calculation' => array_merge($existingMeta['commission_calculation'] ?? [], [
                        'commission_percentage' => $commissionPercentage,
                        'total_commission' => $totalCommission,
                        'platform_commission_percentage' => $platformCommissionPercentage,
                        'platform_commission' => $platformCommission,
                        'nonprofit_commission' => $nonprofitCommission,
                        'updated_via_webhook' => true,
                    ]),
                ]),
            ];

            // Update voucher if provided
            if ($voucher) {
                $updateData['voucher'] = $voucher;
            }

            // Update card_number if provided in webhook
            if (isset($payload['cardNumber']) && !empty($payload['cardNumber'])) {
                $updateData['card_number'] = $payload['cardNumber'];
            }

            // Update status based on Phaze transaction status
            if ($status === 'failed') {
                $updateData['status'] = 'failed';
                Log::warning('Phaze transaction failed', [
                    'gift_card_id' => $giftCard->id,
                    'error' => $error,
                ]);
            } elseif ($status === 'completed' || $status === 'success') {
                $updateData['status'] = 'active';
            }

            $giftCard->update($updateData);

            // Update transaction record if exists
            if ($giftCard->user) {
                $transaction = \App\Models\Transaction::where('related_id', $giftCard->id)
                    ->where('related_type', GiftCard::class)
                    ->first();

                if ($transaction) {
                    $transaction->update([
                        'status' => $status === 'failed' ? 'failed' : 'completed',
                        'meta' => array_merge($transaction->meta ?? [], [
                            'phaze_status' => $status,
                            'phaze_transaction_id' => $transactionId,
                            'phaze_error' => $error,
                        ]),
                    ]);
                }
            }

            DB::commit();

            Log::info('Phaze webhook processed successfully', [
                'gift_card_id' => $giftCard->id,
                'status' => $status,
                'transaction_id' => $transactionId,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Webhook processed successfully',
            ], 200);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error processing Phaze webhook: ' . $e->getMessage(), [
                'payload' => $payload,
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'error' => 'Internal server error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}

