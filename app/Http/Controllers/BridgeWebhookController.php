<?php

namespace App\Http\Controllers;

use App\Models\BridgeIntegration;
use App\Models\User;
use App\Models\Organization;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class BridgeWebhookController extends Controller
{
    /**
     * Handle Bridge webhooks
     * Bridge sends webhooks for various events like KYC/KYB status updates, transfer status, etc.
     */
    public function handle(Request $request)
    {
        // Verify webhook signature
        if (!$this->verifySignature($request)) {
            Log::warning('Invalid Bridge webhook signature', [
                'ip' => $request->ip(),
                'headers' => $request->headers->all()
            ]);
            return response()->json(['error' => 'Invalid signature'], 401);
        }

        $payload = $request->all();

        Log::info('Bridge Webhook Received', [
            'type' => $payload['type'] ?? $payload['event'] ?? 'unknown',
            'payload' => $payload
        ]);

        try {
            // Bridge webhooks can have different structures
            // Common event types: kyc.status.updated, kyb.status.updated, transfer.status.updated, etc.
            $eventType = $payload['type'] ?? $payload['event'] ?? $payload['event_type'] ?? null;
            $data = $payload['data'] ?? $payload;

            switch ($eventType) {
                case 'kyc.status.updated':
                case 'kyc_status_updated':
                case 'kyc.updated':
                    $this->handleKYCStatusUpdate($data);
                    break;

                case 'kyb.status.updated':
                case 'kyb_status_updated':
                case 'kyb.updated':
                    $this->handleKYBStatusUpdate($data);
                    break;

                case 'transfer.status.updated':
                case 'transfer_status_updated':
                case 'transfer.updated':
                    $this->handleTransferStatusUpdate($data);
                    break;

                case 'transfer.completed':
                case 'transfer_completed':
                    $this->handleTransferCompleted($data);
                    break;

                case 'transfer.failed':
                case 'transfer_failed':
                    $this->handleTransferFailed($data);
                    break;

                case 'wallet.balance.updated':
                case 'wallet_balance_updated':
                    $this->handleWalletBalanceUpdate($data);
                    break;

                default:
                    // Try to infer event type from payload structure
                    if (isset($data['kyc_status']) || isset($data['kycStatus'])) {
                        $this->handleKYCStatusUpdate($data);
                    } elseif (isset($data['kyb_status']) || isset($data['kybStatus'])) {
                        $this->handleKYBStatusUpdate($data);
                    } elseif (isset($data['transfer_id']) || isset($data['transferId'])) {
                        $this->handleTransferStatusUpdate($data);
                    } else {
                        Log::warning('Unhandled Bridge webhook event', [
                            'type' => $eventType,
                            'payload' => $payload
                        ]);
                    }
            }

            return response()->json(['success' => true]);

        } catch (\Exception $e) {
            Log::error('Bridge webhook processing error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'payload' => $payload
            ]);

            return response()->json(['error' => 'Webhook processing failed'], 500);
        }
    }

    /**
     * Verify webhook signature
     * Bridge typically uses HMAC SHA256 with the webhook secret
     */
    private function verifySignature(Request $request): bool
    {
        $signature = $request->header('X-Bridge-Signature') 
            ?? $request->header('Bridge-Signature')
            ?? $request->header('Signature');
        
        $payload = $request->getContent();
        $secret = config('services.bridge.webhook_secret');

        if (!$signature || !$secret) {
            // In development, you might want to allow unsigned webhooks
            if (config('app.env') === 'local') {
                Log::info('Bridge webhook received without signature (local environment)');
                return true;
            }
            Log::warning('Missing Bridge webhook signature or secret');
            return false;
        }

        // Bridge may send signature in format: sha256=hash or just the hash
        $signature = str_replace('sha256=', '', $signature);
        $expectedSignature = hash_hmac('sha256', $payload, $secret);

        return hash_equals($expectedSignature, $signature);
    }

    /**
     * Handle KYC status update
     */
    private function handleKYCStatusUpdate(array $data)
    {
        $customerId = $data['customer_id'] ?? $data['customerId'] ?? null;
        $linkId = $data['link_id'] ?? $data['linkId'] ?? $data['id'] ?? null;
        $status = $this->normalizeStatus($data['status'] ?? $data['kyc_status'] ?? $data['kycStatus'] ?? null);

        if (!$customerId && !$linkId) {
            Log::warning('Bridge KYC update missing customer_id or link_id', ['data' => $data]);
            return;
        }

        // Find integration by customer_id or link_id
        $integration = null;
        if ($customerId) {
            $integration = BridgeIntegration::where('bridge_customer_id', $customerId)->first();
        }
        
        if (!$integration && $linkId) {
            $integration = BridgeIntegration::where('kyc_link_id', $linkId)->first();
        }

        if (!$integration) {
            Log::warning('Bridge KYC update: Integration not found', [
                'customer_id' => $customerId,
                'link_id' => $linkId
            ]);
            return;
        }

        DB::transaction(function () use ($integration, $status, $linkId, $data) {
            $integration->kyc_status = $status;
            if ($linkId && !$integration->kyc_link_id) {
                $integration->kyc_link_id = $linkId;
            }
            if (isset($data['link_url']) || isset($data['linkUrl'])) {
                $integration->kyc_link_url = $data['link_url'] ?? $data['linkUrl'];
            }
            
            // Update metadata
            $metadata = $integration->bridge_metadata ?? [];
            $metadata['kyc_update'] = [
                'status' => $status,
                'updated_at' => now()->toIso8601String(),
                'data' => $data,
            ];
            $integration->bridge_metadata = $metadata;
            
            $integration->save();

            Log::info('Bridge KYC status updated', [
                'integration_id' => $integration->id,
                'status' => $status,
                'entity_type' => $integration->integratable_type,
            ]);
        });
    }

    /**
     * Handle KYB status update
     */
    private function handleKYBStatusUpdate(array $data)
    {
        $customerId = $data['customer_id'] ?? $data['customerId'] ?? null;
        $linkId = $data['link_id'] ?? $data['linkId'] ?? $data['id'] ?? null;
        $status = $this->normalizeStatus($data['status'] ?? $data['kyb_status'] ?? $data['kybStatus'] ?? null);

        if (!$customerId && !$linkId) {
            Log::warning('Bridge KYB update missing customer_id or link_id', ['data' => $data]);
            return;
        }

        // Find integration by customer_id or link_id
        $integration = null;
        if ($customerId) {
            $integration = BridgeIntegration::where('bridge_customer_id', $customerId)->first();
        }
        
        if (!$integration && $linkId) {
            $integration = BridgeIntegration::where('kyb_link_id', $linkId)->first();
        }

        if (!$integration) {
            Log::warning('Bridge KYB update: Integration not found', [
                'customer_id' => $customerId,
                'link_id' => $linkId
            ]);
            return;
        }

        DB::transaction(function () use ($integration, $status, $linkId, $data) {
            $integration->kyb_status = $status;
            if ($linkId && !$integration->kyb_link_id) {
                $integration->kyb_link_id = $linkId;
            }
            if (isset($data['link_url']) || isset($data['linkUrl'])) {
                $integration->kyb_link_url = $data['link_url'] ?? $data['linkUrl'];
            }
            
            // Update metadata
            $metadata = $integration->bridge_metadata ?? [];
            $metadata['kyb_update'] = [
                'status' => $status,
                'updated_at' => now()->toIso8601String(),
                'data' => $data,
            ];
            $integration->bridge_metadata = $metadata;
            
            $integration->save();

            Log::info('Bridge KYB status updated', [
                'integration_id' => $integration->id,
                'status' => $status,
                'entity_type' => $integration->integratable_type,
            ]);
        });
    }

    /**
     * Handle transfer status update
     */
    private function handleTransferStatusUpdate(array $data)
    {
        $transferId = $data['transfer_id'] ?? $data['transferId'] ?? $data['id'] ?? null;
        $status = $data['status'] ?? null;

        if (!$transferId) {
            Log::warning('Bridge transfer update missing transfer_id', ['data' => $data]);
            return;
        }

        // Find transactions by Bridge transfer ID in metadata
        // There should be two transactions: one for sender (transfer_out) and one for recipient (transfer_in)
        $transactions = Transaction::where(function($query) use ($transferId) {
            $query->whereJsonContains('meta->bridge_transfer_id', $transferId)
                  ->orWhereJsonContains('meta->transfer_id', $transferId);
        })->get();

        if ($transactions->isEmpty()) {
            Log::warning('Bridge transfer update: Transactions not found', [
                'transfer_id' => $transferId
            ]);
            return;
        }

        $mappedStatus = $this->mapBridgeStatusToTransactionStatus($status);
        $isCompleted = $mappedStatus === 'completed';
        $isFailed = $mappedStatus === 'failed';

        DB::transaction(function () use ($transactions, $mappedStatus, $status, $transferId, $isCompleted, $isFailed, $data) {
            foreach ($transactions as $transaction) {
                $oldStatus = $transaction->status;
                $transaction->status = $mappedStatus;
                
                if ($isCompleted && !$transaction->processed_at) {
                    $transaction->processed_at = now();
                    
                    // Update balances when transfer completes
                    $user = $transaction->user;
                    $meta = $transaction->meta ?? [];
                    $amount = (float) $transaction->amount;
                    
                    if ($transaction->type === 'transfer_in' && $oldStatus !== 'completed') {
                        // Add balance to recipient when transfer completes
                        $user->increment('balance', $amount);
                        Log::info('Bridge transfer completed: Balance added to recipient', [
                            'user_id' => $user->id,
                            'amount' => $amount,
                            'transaction_id' => $transaction->id,
                        ]);
                    } elseif ($transaction->type === 'transfer_out' && $isFailed && $oldStatus !== 'failed') {
                        // Refund balance to sender if transfer failed
                        $user->increment('balance', $amount + ($transaction->fee ?? 0));
                        Log::info('Bridge transfer failed: Balance refunded to sender', [
                            'user_id' => $user->id,
                            'amount' => $amount,
                            'transaction_id' => $transaction->id,
                        ]);
                    }
                }
                
                // Update metadata
                $meta = $transaction->meta ?? [];
                $meta['bridge_status'] = $status;
                $meta['bridge_update_at'] = now()->toIso8601String();
                if (isset($data['failure_reason']) || isset($data['failureReason'])) {
                    $meta['failure_reason'] = $data['failure_reason'] ?? $data['failureReason'];
                }
                $transaction->meta = $meta;
                
                $transaction->save();
            }

            Log::info('Bridge transfer status updated', [
                'transfer_id' => $transferId,
                'status' => $status,
                'mapped_status' => $mappedStatus,
                'transaction_count' => $transactions->count(),
            ]);
        });
    }

    /**
     * Handle transfer completed
     */
    private function handleTransferCompleted(array $data)
    {
        $this->handleTransferStatusUpdate(array_merge($data, ['status' => 'completed']));
    }

    /**
     * Handle transfer failed
     */
    private function handleTransferFailed(array $data)
    {
        $this->handleTransferStatusUpdate(array_merge($data, ['status' => 'failed']));
    }

    /**
     * Handle wallet balance update
     */
    private function handleWalletBalanceUpdate(array $data)
    {
        $walletId = $data['wallet_id'] ?? $data['walletId'] ?? null;
        $balance = $data['balance'] ?? null;

        if (!$walletId || $balance === null) {
            Log::warning('Bridge wallet balance update missing data', ['data' => $data]);
            return;
        }

        $integration = BridgeIntegration::where('bridge_wallet_id', $walletId)->first();

        if ($integration) {
            // Update metadata with latest balance
            $metadata = $integration->bridge_metadata ?? [];
            $metadata['wallet_balance'] = $balance;
            $metadata['balance_updated_at'] = now()->toIso8601String();
            $integration->bridge_metadata = $metadata;
            $integration->save();

            Log::info('Bridge wallet balance updated', [
                'integration_id' => $integration->id,
                'wallet_id' => $walletId,
                'balance' => $balance,
            ]);
        }
    }

    /**
     * Normalize status value to our enum values
     */
    private function normalizeStatus(?string $status): string
    {
        if (!$status) {
            return 'not_started';
        }

        $status = strtolower($status);

        // Map various status formats to our enum
        $statusMap = [
            'approved' => 'approved',
            'approve' => 'approved',
            'verified' => 'approved',
            'complete' => 'approved',
            'completed' => 'approved',
            'pending' => 'pending',
            'in_progress' => 'pending',
            'processing' => 'pending',
            'rejected' => 'rejected',
            'reject' => 'rejected',
            'denied' => 'rejected',
            'failed' => 'rejected',
            'not_started' => 'not_started',
            'notstarted' => 'not_started',
            'none' => 'not_started',
        ];

        return $statusMap[$status] ?? 'pending';
    }

    /**
     * Map Bridge transfer status to our transaction status
     */
    private function mapBridgeStatusToTransactionStatus(?string $bridgeStatus): string
    {
        if (!$bridgeStatus) {
            return 'pending';
        }

        $bridgeStatus = strtolower($bridgeStatus);

        $statusMap = [
            'completed' => 'completed',
            'complete' => 'completed',
            'success' => 'completed',
            'succeeded' => 'completed',
            'pending' => 'pending',
            'processing' => 'pending',
            'in_progress' => 'pending',
            'failed' => 'failed',
            'fail' => 'failed',
            'error' => 'failed',
            'cancelled' => 'cancelled',
            'canceled' => 'cancelled',
        ];

        return $statusMap[$bridgeStatus] ?? 'pending';
    }
}

