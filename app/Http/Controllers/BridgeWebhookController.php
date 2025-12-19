<?php

namespace App\Http\Controllers;

use App\Models\BridgeIntegration;
use App\Models\BridgeWallet;
use App\Models\User;
use App\Models\Organization;
use App\Models\Transaction;
use App\Services\BridgeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class BridgeWebhookController extends Controller
{
    protected BridgeService $bridgeService;

    public function __construct(BridgeService $bridgeService)
    {
        $this->bridgeService = $bridgeService;
    }

    /**
     * Handle Bridge webhooks
     */
    public function handle(Request $request)
    {
        // Log webhook received (before verification)
        Log::info('Bridge webhook received', [
            'method' => $request->method(),
            'url' => $request->fullUrl(),
            'path' => $request->path(),
            'has_signature' => $request->hasHeader('X-Webhook-Signature'),
            'content_length' => $request->header('Content-Length'),
            'ip' => $request->ip(),
            'app_env' => config('app.env'),
        ]);

        // Verify webhook signature
        $signatureValid = $this->verifySignature($request);
        
        if (!$signatureValid) {
            Log::warning('Invalid Bridge webhook signature', [
                'ip' => $request->ip(),
                'app_env' => config('app.env'),
            ]);
            
            // In development, allow webhook to proceed even if signature fails
            if (config('app.env') === 'local' || config('app.env') === 'development') {
                Log::info('Allowing webhook in development environment despite signature failure');
            } else {
                return response()->json(['error' => 'Invalid signature'], 401);
            }
        }

        $payload = $request->all();

        Log::info('Bridge Webhook Received', [
            'event_type' => $payload['event_type'] ?? 'unknown',
            'event_category' => $payload['event_category'] ?? 'unknown',
            'event_id' => $payload['event_id'] ?? 'unknown',
            'event_object_id' => $payload['event_object']['id'] ?? null,
            'event_object_status' => $payload['event_object_status'] ?? null,
            'customer_id' => $payload['event_object']['id'] ?? null,
            'kyb_status' => $payload['event_object']['kyb_status'] ?? null,
            'kyc_status' => $payload['event_object']['kyc_status'] ?? null,
            'full_payload' => json_encode($payload),
        ]);

        try {
            // Bridge webhook structure
            $eventType = $payload['event_type'] ?? null;
            $eventCategory = $payload['event_category'] ?? null;
            $eventObject = $payload['event_object'] ?? [];
            $eventObjectStatus = $payload['event_object_status'] ?? null;
            $eventObjectChanges = $payload['event_object_changes'] ?? [];

            // Handle by event category
            switch ($eventCategory) {
                case 'customer':
                    $this->handleCustomerEvent($eventType, $eventObject, $eventObjectStatus, $eventObjectChanges);
                    break;

                case 'kyc_link':
                    $this->handleKYCLinkEvent($eventType, $eventObject, $eventObjectStatus, $eventObjectChanges);
                    break;

                case 'transfer':
                    $this->handleTransferEvent($eventType, $eventObject, $eventObjectStatus, $eventObjectChanges);
                    break;

                case 'virtual_account.activity':
                    $this->handleVirtualAccountActivity($eventType, $eventObject);
                    break;

                case 'card_account':
                    $this->handleCardAccountEvent($eventType, $eventObject, $eventObjectStatus);
                    break;

                case 'card_transaction':
                    $this->handleCardTransactionEvent($eventType, $eventObject, $eventObjectStatus, $eventObjectChanges);
                    break;

                case 'posted_card_account_transaction':
                    $this->handlePostedCardTransaction($eventType, $eventObject);
                    break;

                case 'card_withdrawal':
                    $this->handleCardWithdrawal($eventType, $eventObject, $eventObjectStatus);
                    break;

                case 'liquidation_address.drain':
                    $this->handleLiquidationAddressDrain($eventType, $eventObject, $eventObjectStatus);
                    break;

                default:
                    Log::warning('Unhandled Bridge webhook event category', [
                        'event_category' => $eventCategory,
                        'event_type' => $eventType,
                    ]);
            }

            return response()->json(['received' => true], 200);

        } catch (\Exception $e) {
            Log::error('Bridge webhook processing error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'event_id' => $payload['event_id'] ?? 'unknown',
            ]);

            return response()->json(['error' => 'Webhook processing failed'], 500);
        }
    }

    /**
     * Verify webhook signature using RSA public key
     * Bridge signature format: X-Webhook-Signature: t=<timestamp>,v0=<base64-encoded-signature>
     */
    private function verifySignature(Request $request): bool
    {
        $signatureHeader = $request->header('X-Webhook-Signature');
        $payload = $request->getContent();
        
        // Load webhook public key from database (similar to BridgeService)
        $publicKeyPem = null;
        $bridgeConfig = \App\Models\PaymentMethod::getConfig('bridge');
        
        if ($bridgeConfig) {
            // Determine environment - check database first, then fallback to config/env
            $environment = null;
            if ($bridgeConfig->mode_environment) {
                $environment = trim(strtolower($bridgeConfig->mode_environment));
            } else {
                $environment = trim(strtolower(env('BRIDGE_ENVIRONMENT', config('services.bridge.environment', 'sandbox'))));
            }
            
            // Try to get from database based on environment
            if ($environment === 'sandbox' && !empty($bridgeConfig->sandbox_webhook_public_key)) {
                $publicKeyPem = $bridgeConfig->sandbox_webhook_public_key;
            } elseif ($environment === 'live' && !empty($bridgeConfig->live_webhook_public_key)) {
                $publicKeyPem = $bridgeConfig->live_webhook_public_key;
            }
        }
        
        // Fallback to config/env if not found in database
        if (!$publicKeyPem) {
            $publicKeyPem = config('services.bridge.webhook_public_key', env('BRIDGE_WEBHOOK_PUBLIC_KEY', ''));
        }

        if (!$signatureHeader) {
            if (config('app.env') === 'local') {
                Log::info('Bridge webhook received without signature (local environment)');
                return true;
            }
            Log::warning('Missing Bridge webhook signature header');
            return false;
        }

        if (!$publicKeyPem) {
            Log::warning('Missing Bridge webhook public key in config');
            return false;
        }

        // Parse signature header: t=timestamp,v0=signature
        $parts = explode(',', $signatureHeader);
        $timestamp = null;
        $signature = null;

        foreach ($parts as $part) {
            if (str_starts_with($part, 't=')) {
                $timestamp = substr($part, 2);
            } elseif (str_starts_with($part, 'v0=')) {
                $signature = substr($part, 3);
            }
        }

        if (!$timestamp || !$signature) {
            Log::warning('Invalid Bridge webhook signature format');
            return false;
        }

        // Check timestamp (reject events older than 10 minutes)
        $currentTimeMs = (int)(microtime(true) * 1000);
        $timestampMs = (int)$timestamp;
        
        if (($currentTimeMs - $timestampMs) > 600000) { // 10 minutes in milliseconds
            Log::warning('Bridge webhook timestamp too old', [
                'timestamp' => $timestamp,
                'current_time' => $currentTimeMs,
            ]);
            return false;
        }

        // Create signed payload: timestamp.payload
        $signedPayload = $timestamp . '.' . $payload;

        try {
            // Decode the base64 signature
            $signatureBytes = base64_decode($signature, true);
            if ($signatureBytes === false) {
                Log::warning('Failed to decode Bridge webhook signature');
                return false;
            }

            // Parse the public key
            $publicKey = openssl_pkey_get_public($publicKeyPem);
            if ($publicKey === false) {
                $opensslError = openssl_error_string();
                Log::warning('Failed to parse Bridge webhook public key', [
                    'error' => $opensslError,
                    'public_key_preview' => substr($publicKeyPem, 0, 50) . '...',
                    'environment' => $environment ?? 'unknown',
                ]);
                
                // In development/local, allow webhook if public key is not configured
                if (config('app.env') === 'local' || config('app.env') === 'development') {
                    Log::info('Allowing webhook in development environment (public key not configured)');
                    return true;
                }
                return false;
            }

            // Hash the signed payload twice with SHA256
            $hash = hash('sha256', $signedPayload, true);
            $doubleHash = hash('sha256', $hash, true);

            // Verify the signature
            $result = openssl_verify($doubleHash, $signatureBytes, $publicKey, OPENSSL_ALGO_SHA256);

            if ($result === 1) {
                Log::info('Bridge webhook signature verified successfully');
                return true;
            } elseif ($result === 0) {
                Log::warning('Bridge webhook signature verification failed', [
                    'timestamp' => $timestamp,
                    'environment' => $environment ?? 'unknown',
                    'has_public_key' => !empty($publicKeyPem),
                ]);
                
                // In development/local, allow webhook if signature verification fails (for testing)
                if (config('app.env') === 'local' || config('app.env') === 'development') {
                    Log::info('Allowing webhook in development environment (signature verification failed)');
                    return true;
                }
                return false;
            } else {
                $opensslError = openssl_error_string();
                Log::warning('Bridge webhook signature verification error', [
                    'error' => $opensslError,
                    'environment' => $environment ?? 'unknown',
                ]);
                
                // In development/local, allow webhook on openssl errors (for testing)
                if (config('app.env') === 'local' || config('app.env') === 'development') {
                    Log::info('Allowing webhook in development environment (openssl error)');
                    return true;
                }
                return false;
            }

        } catch (\Exception $e) {
            Log::error('Bridge webhook signature verification exception', [
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Handle customer events
     * 
     * Example webhook structure:
     * {
     *   "event_type": "customer.updated.status_transitioned",
     *   "event_object_status": "approved",
     *   "event_object": {
     *     "id": "cust_12345",
     *     "type": "business",
     *     "kyb_status": "approved",
     *     ...
     *   },
     *   "event_object_changes": {
     *     "kyb_status": ["under_review", "approved"]
     *   }
     * }
     */
    private function handleCustomerEvent(string $eventType, array $eventObject, ?string $status, array $changes)
    {
        $customerId = $eventObject['id'] ?? null;
        
        if (!$customerId) {
            Log::warning('Bridge customer event missing customer id', ['event_object' => $eventObject]);
            return;
        }

        $integration = BridgeIntegration::where('bridge_customer_id', $customerId)->first();

        if (!$integration) {
            Log::warning('Bridge customer event: Integration not found', [
                'customer_id' => $customerId,
                'event_type' => $eventType,
                'event_object' => $eventObject,
            ]);
            return;
        }

        Log::info('Processing Bridge customer event', [
            'integration_id' => $integration->id,
            'customer_id' => $customerId,
            'event_type' => $eventType,
            'current_kyb_status' => $integration->kyb_status,
            'current_kyc_status' => $integration->kyc_status,
            'event_object_kyb_status' => $eventObject['kyb_status'] ?? null,
            'event_object_kyc_status' => $eventObject['kyc_status'] ?? null,
            'event_object_changes' => $changes,
        ]);

        DB::transaction(function () use ($integration, $eventType, $eventObject, $status, $changes, $customerId) {
            $statusUpdated = false;

            // Handle status transitions from event_object_changes
            if (!empty($changes)) {
                // Check for kyb_status change
                if (isset($changes['kyb_status']) && is_array($changes['kyb_status']) && count($changes['kyb_status']) >= 2) {
                    $newKybStatus = $this->normalizeStatus($changes['kyb_status'][1] ?? $eventObject['kyb_status'] ?? null);
                    if ($newKybStatus) {
                        $integration->kyb_status = $newKybStatus;
                        $statusUpdated = true;
                        
                        Log::info('Bridge KYB status transitioned', [
                            'integration_id' => $integration->id,
                            'customer_id' => $customerId,
                            'from' => $changes['kyb_status'][0] ?? null,
                            'to' => $newKybStatus,
                        ]);
                    }
                }

                // Check for kyc_status change
                if (isset($changes['kyc_status']) && is_array($changes['kyc_status']) && count($changes['kyc_status']) >= 2) {
                    $newKycStatus = $this->normalizeStatus($changes['kyc_status'][1] ?? $eventObject['kyc_status'] ?? null);
                    if ($newKycStatus) {
                        $integration->kyc_status = $newKycStatus;
                        $statusUpdated = true;
                        
                        Log::info('Bridge KYC status transitioned', [
                            'integration_id' => $integration->id,
                            'customer_id' => $customerId,
                            'from' => $changes['kyc_status'][0] ?? null,
                            'to' => $newKycStatus,
                        ]);
                    }
                }
            }

            // Fallback: Update from event_object if changes not available
            // Also update if status exists in event_object (to ensure we always have latest status)
                if (isset($eventObject['kyc_status'])) {
                $newKycStatus = $this->normalizeStatus($eventObject['kyc_status']);
                if ($newKycStatus) {
                    $oldKycStatus = $integration->kyc_status;
                    if ($oldKycStatus !== $newKycStatus) {
                        $integration->kyc_status = $newKycStatus;
                        $statusUpdated = true;
                        
                        Log::info('Bridge KYC status updated from event_object', [
                            'integration_id' => $integration->id,
                            'customer_id' => $customerId,
                            'old_status' => $oldKycStatus,
                            'new_status' => $newKycStatus,
                        ]);
                    }
                }
                }

                // Update KYB status for business customers
                if (isset($eventObject['kyb_status'])) {
                $newKybStatus = $this->normalizeStatus($eventObject['kyb_status']);
                if ($newKybStatus) {
                    $oldKybStatus = $integration->kyb_status;
                    if ($oldKybStatus !== $newKybStatus) {
                        $integration->kyb_status = $newKybStatus;
                        $statusUpdated = true;
                        
                        Log::info('Bridge KYB status updated from event_object', [
                            'integration_id' => $integration->id,
                            'customer_id' => $customerId,
                            'old_status' => $oldKybStatus,
                            'new_status' => $newKybStatus,
                        ]);
                    }
                }
            }

            // Update BridgeKycKybSubmission status if exists
            $submission = \App\Models\BridgeKycKybSubmission::where('bridge_integration_id', $integration->id)
                ->where('bridge_customer_id', $customerId)
                ->first();
            
            if ($submission) {
                // Map Bridge customer status to submission status
                $submissionStatus = null;
                if (isset($eventObject['kyb_status'])) {
                    $submissionStatus = $this->normalizeStatus($eventObject['kyb_status']);
                } elseif (isset($eventObject['kyc_status'])) {
                    $submissionStatus = $this->normalizeStatus($eventObject['kyc_status']);
                }
                
                if ($submissionStatus && in_array($submissionStatus, ['approved', 'rejected', 'under_review', 'awaiting_ubo', 'awaiting_questionnaire', 'incomplete'])) {
                    $submission->submission_status = $submissionStatus;
                    $submission->save();
                    
                    Log::info('Bridge KYB/KYC submission status updated from webhook', [
                        'submission_id' => $submission->id,
                        'new_status' => $submissionStatus,
                    ]);
                }
            }

            // Store endorsements if available
            if (isset($eventObject['endorsements'])) {
                $metadata = $integration->bridge_metadata ?? [];
                $metadata['endorsements'] = $eventObject['endorsements'];
                $integration->bridge_metadata = $metadata;
            }

            // Update metadata
            $metadata = $integration->bridge_metadata ?? [];
            $metadata['customer_update'] = [
                'event_type' => $eventType,
                'status' => $status,
                'changes' => $changes,
                'updated_at' => now()->toIso8601String(),
            ];
            $integration->bridge_metadata = $metadata;

            $integration->save();

            // Auto-create wallet when account is approved
            $isApproved = false;
            $isBusiness = $integration->integratable_type === Organization::class;
            
            if ($isBusiness) {
                // For businesses, check if KYB is approved
                $isApproved = $integration->kyb_status === 'approved';
            } else {
                // For individuals, check if KYC is approved
                $isApproved = $integration->kyc_status === 'approved';
            }

            if ($isApproved && $integration->bridge_customer_id) {
                // Check if wallet already exists
                $existingWallet = BridgeWallet::where('bridge_integration_id', $integration->id)
                    ->where('is_primary', true)
                    ->first();

                if (!$existingWallet) {
                    try {
                        // Create primary wallet (default: Solana)
                        $chain = 'solana'; // Default chain, can be made configurable
                        $walletResult = $this->bridgeService->createWallet(
                            $integration->bridge_customer_id,
                            $chain
                        );

                        if ($walletResult['success'] && isset($walletResult['data'])) {
                            $walletData = $walletResult['data'];
                            
                            // Create wallet record in database
                            $wallet = BridgeWallet::create([
                                'bridge_integration_id' => $integration->id,
                                'bridge_customer_id' => $integration->bridge_customer_id,
                                'bridge_wallet_id' => $walletData['id'] ?? null,
                                'wallet_address' => $walletData['address'] ?? null,
                                'chain' => $chain,
                                'status' => 'active',
                                'balance' => 0,
                                'currency' => 'USD',
                                'wallet_metadata' => $walletData,
                                'is_primary' => true,
                                'last_balance_sync' => now(),
                            ]);

                            // Update integration with primary wallet info (for backward compatibility)
                            if (!$integration->bridge_wallet_id) {
                                $integration->bridge_wallet_id = $wallet->bridge_wallet_id;
                                $integration->wallet_address = $wallet->wallet_address;
                                $integration->wallet_chain = $chain;
                                $integration->save();
                            }

                            Log::info('Bridge wallet auto-created on account approval', [
                                'integration_id' => $integration->id,
                                'customer_id' => $customerId,
                                'wallet_id' => $wallet->bridge_wallet_id,
                                'chain' => $chain,
                                'address' => $wallet->wallet_address,
                            ]);
                        } else {
                            Log::warning('Failed to auto-create Bridge wallet on approval', [
                                'integration_id' => $integration->id,
                                'customer_id' => $customerId,
                                'error' => $walletResult['error'] ?? 'Unknown error',
                            ]);
                        }
                    } catch (\Exception $e) {
                        Log::error('Exception while auto-creating Bridge wallet on approval', [
                            'integration_id' => $integration->id,
                            'customer_id' => $customerId,
                            'error' => $e->getMessage(),
                            'trace' => $e->getTraceAsString(),
                        ]);
                    }
                } else {
                    Log::info('Bridge wallet already exists, skipping auto-creation', [
                        'integration_id' => $integration->id,
                        'customer_id' => $customerId,
                        'existing_wallet_id' => $existingWallet->bridge_wallet_id,
                    ]);
                }
            }

            Log::info('Bridge customer event processed', [
                'integration_id' => $integration->id,
                'event_type' => $eventType,
                'event_object_status' => $status,
                'customer_id' => $customerId,
                'kyb_status' => $integration->kyb_status,
                'kyc_status' => $integration->kyc_status,
            ]);
        });
    }

    /**
     * Handle KYC Link events
     * 
     * Example webhook structure for ToS acceptance:
     * {
     *   "event_type": "kyc_link.updated.status_transitioned",
     *   "event_object_status": "incomplete",
     *   "event_object": {
     *     "id": "3694522e-6bed-4660-a803-f599b50c7691",
     *     "type": "individual",
     *     "email": "user@example.com",
     *     "tos_status": "approved",
     *     "kyc_status": "incomplete",
     *     "customer_id": null
     *   },
     *   "event_object_changes": {
     *     "tos_status": ["pending", "approved"]
     *   }
     * }
     */
    private function handleKYCLinkEvent(string $eventType, array $eventObject, ?string $status, array $changes)
    {
        $linkId = $eventObject['id'] ?? null;
        $customerId = $eventObject['customer_id'] ?? null;
        $kycStatus = $eventObject['kyc_status'] ?? null;
        $tosStatus = $eventObject['tos_status'] ?? null;

        if (!$linkId) {
            Log::warning('Bridge KYC link event missing link id', ['event_object' => $eventObject]);
            return;
        }

        // Find integration by link_id or customer_id
        $integration = BridgeIntegration::where('kyc_link_id', $linkId)->first();
        
        if (!$integration && $customerId) {
            $integration = BridgeIntegration::where('bridge_customer_id', $customerId)->first();
        }

        // Also try to find by email if available (for KYC links created before customer_id is assigned)
        if (!$integration && isset($eventObject['email'])) {
            $email = $eventObject['email'];
            // Try to find via user or organization email
            $user = \App\Models\User::where('email', $email)->first();
            if ($user) {
                $integration = BridgeIntegration::where('integratable_type', \App\Models\User::class)
                    ->where('integratable_id', $user->id)
                    ->first();
            } else {
                $organization = \App\Models\Organization::where('email', $email)->first();
                if ($organization) {
                    $integration = BridgeIntegration::where('integratable_type', \App\Models\Organization::class)
                        ->where('integratable_id', $organization->id)
                        ->first();
                }
            }
        }

        if (!$integration) {
            Log::warning('Bridge KYC link event: Integration not found', [
                'link_id' => $linkId,
                'customer_id' => $customerId,
                'email' => $eventObject['email'] ?? null,
            ]);
            return;
        }

        DB::transaction(function () use ($integration, $eventType, $eventObject, $kycStatus, $tosStatus, $status, $changes, $linkId, $customerId) {
            $statusUpdated = false;

            // Handle ToS status transition from event_object_changes
            if (!empty($changes) && isset($changes['tos_status']) && is_array($changes['tos_status']) && count($changes['tos_status']) >= 2) {
                $newTosStatus = $this->normalizeTosStatus($changes['tos_status'][1] ?? $eventObject['tos_status'] ?? null);
                if ($newTosStatus) {
                    $integration->tos_status = $newTosStatus;
                    $statusUpdated = true;
                    
                    Log::info('Bridge ToS status transitioned via KYC link webhook', [
                        'integration_id' => $integration->id,
                        'link_id' => $linkId,
                        'from' => $changes['tos_status'][0] ?? null,
                        'to' => $newTosStatus,
                    ]);
                }
            } elseif ($tosStatus) {
                // Fallback: Update from event_object if changes not available
                $integration->tos_status = $this->normalizeTosStatus($tosStatus);
                $statusUpdated = true;
            }

            // Handle KYC status transition from event_object_changes
            if (!empty($changes) && isset($changes['kyc_status']) && is_array($changes['kyc_status']) && count($changes['kyc_status']) >= 2) {
                $newKycStatus = $this->normalizeStatus($changes['kyc_status'][1] ?? $eventObject['kyc_status'] ?? null);
                if ($newKycStatus) {
                    $integration->kyc_status = $newKycStatus;
                    $statusUpdated = true;
                    
                    Log::info('Bridge KYC status transitioned via KYC link webhook', [
                        'integration_id' => $integration->id,
                        'link_id' => $linkId,
                        'from' => $changes['kyc_status'][0] ?? null,
                        'to' => $newKycStatus,
                    ]);
                }
            } elseif ($kycStatus) {
                // Fallback: Update from event_object if changes not available
                $oldKycStatus = $integration->kyc_status;
                $newKycStatus = $this->normalizeStatus($kycStatus);
                if ($oldKycStatus !== $newKycStatus) {
                    $integration->kyc_status = $newKycStatus;
                $statusUpdated = true;
                    
                    Log::info('Bridge KYC status updated from event_object (KYC link)', [
                        'integration_id' => $integration->id,
                        'link_id' => $linkId,
                        'old_status' => $oldKycStatus,
                        'new_status' => $newKycStatus,
                    ]);
                }
            }
            
            // Also check for KYB status in event_object (for business customers)
            if (isset($eventObject['kyb_status'])) {
                $newKybStatus = $this->normalizeStatus($eventObject['kyb_status']);
                if ($newKybStatus) {
                    $oldKybStatus = $integration->kyb_status;
                    if ($oldKybStatus !== $newKybStatus) {
                        $integration->kyb_status = $newKybStatus;
                        $statusUpdated = true;
                        
                        Log::info('Bridge KYB status updated from KYC link event_object', [
                            'integration_id' => $integration->id,
                            'link_id' => $linkId,
                            'old_status' => $oldKybStatus,
                            'new_status' => $newKybStatus,
                        ]);
                    }
                }
            }

            // Store customer_id if newly created
            if (isset($eventObject['customer_id']) && !$integration->bridge_customer_id) {
                $integration->bridge_customer_id = $eventObject['customer_id'];
            }

            // Store kyc_link_id if not set
            if ($linkId && !$integration->kyc_link_id) {
                $integration->kyc_link_id = $linkId;
            }

            // Update BridgeKycKybSubmission status if exists and KYC status changed
            if ($statusUpdated && $integration->bridge_customer_id) {
                $submission = \App\Models\BridgeKycKybSubmission::where('bridge_integration_id', $integration->id)
                    ->where('bridge_customer_id', $integration->bridge_customer_id)
                    ->first();
                
                if ($submission && $kycStatus) {
                    $submissionStatus = $this->normalizeStatus($kycStatus);
                    if (in_array($submissionStatus, ['approved', 'rejected', 'under_review', 'awaiting_ubo', 'awaiting_questionnaire', 'incomplete'])) {
                        $submission->submission_status = $submissionStatus;
                        $submission->save();
                        
                        Log::info('Bridge KYB/KYC submission status updated from KYC link webhook', [
                            'submission_id' => $submission->id,
                            'new_status' => $submissionStatus,
                        ]);
                    }
                }
            }

            // Update metadata
            $metadata = $integration->bridge_metadata ?? [];
            $metadata['kyc_link_update'] = [
                'event_type' => $eventType,
                'event_object_status' => $status,
                'kyc_status' => $kycStatus,
                'tos_status' => $tosStatus,
                'changes' => $changes,
                'updated_at' => now()->toIso8601String(),
            ];
            $integration->bridge_metadata = $metadata;

            $integration->save();

            // Auto-create wallet when account is approved
            $isApproved = false;
            $isBusiness = $integration->integratable_type === Organization::class;
            
            if ($isBusiness) {
                // For businesses, check if KYB is approved
                $isApproved = $integration->kyb_status === 'approved';
            } else {
                // For individuals, check if KYC is approved
                $isApproved = $integration->kyc_status === 'approved';
            }

            if ($isApproved && $integration->bridge_customer_id) {
                // Check if wallet already exists
                $existingWallet = BridgeWallet::where('bridge_integration_id', $integration->id)
                    ->where('is_primary', true)
                    ->first();

                if (!$existingWallet) {
                    try {
                        // Create primary wallet (default: Solana)
                        $chain = 'solana'; // Default chain, can be made configurable
                        $walletResult = $this->bridgeService->createWallet(
                            $integration->bridge_customer_id,
                            $chain
                        );

                        if ($walletResult['success'] && isset($walletResult['data'])) {
                            $walletData = $walletResult['data'];
                            
                            // Create wallet record in database
                            $wallet = BridgeWallet::create([
                                'bridge_integration_id' => $integration->id,
                                'bridge_customer_id' => $integration->bridge_customer_id,
                                'bridge_wallet_id' => $walletData['id'] ?? null,
                                'wallet_address' => $walletData['address'] ?? null,
                                'chain' => $chain,
                                'status' => 'active',
                                'balance' => 0,
                                'currency' => 'USD',
                                'wallet_metadata' => $walletData,
                                'is_primary' => true,
                                'last_balance_sync' => now(),
                            ]);

                            // Update integration with primary wallet info (for backward compatibility)
                            if (!$integration->bridge_wallet_id) {
                                $integration->bridge_wallet_id = $wallet->bridge_wallet_id;
                                $integration->wallet_address = $wallet->wallet_address;
                                $integration->wallet_chain = $chain;
                                $integration->save();
                            }

                            Log::info('Bridge wallet auto-created on KYC link approval', [
                                'integration_id' => $integration->id,
                                'customer_id' => $customerId,
                                'link_id' => $linkId,
                                'wallet_id' => $wallet->bridge_wallet_id,
                                'chain' => $chain,
                                'address' => $wallet->wallet_address,
                            ]);
                        } else {
                            Log::warning('Failed to auto-create Bridge wallet on KYC link approval', [
                                'integration_id' => $integration->id,
                                'customer_id' => $customerId,
                                'link_id' => $linkId,
                                'error' => $walletResult['error'] ?? 'Unknown error',
                            ]);
                        }
                    } catch (\Exception $e) {
                        Log::error('Exception while auto-creating Bridge wallet on KYC link approval', [
                            'integration_id' => $integration->id,
                            'customer_id' => $customerId,
                            'link_id' => $linkId,
                            'error' => $e->getMessage(),
                            'trace' => $e->getTraceAsString(),
                        ]);
                    }
                }
            }

            Log::info('Bridge KYC link event processed', [
                'integration_id' => $integration->id,
                'event_type' => $eventType,
                'event_object_status' => $status,
                'link_id' => $linkId,
                'customer_id' => $customerId,
                'kyc_status' => $integration->kyc_status,
                'tos_status' => $integration->tos_status,
            ]);
        });
    }

    /**
     * Handle transfer events
     */
    private function handleTransferEvent(string $eventType, array $eventObject, ?string $status, array $changes)
    {
        $transferId = $eventObject['id'] ?? null;
        $state = $eventObject['state'] ?? $status;

        if (!$transferId) {
            Log::warning('Bridge transfer event missing transfer id', ['event_object' => $eventObject]);
            return;
        }

        // Find transactions by Bridge transfer ID
        $transactions = Transaction::where(function($query) use ($transferId) {
            $query->whereJsonContains('meta->bridge_transfer_id', $transferId)
                  ->orWhereJsonContains('meta->transfer_id', $transferId);
        })->get();

        if ($transactions->isEmpty()) {
            Log::warning('Bridge transfer event: Transactions not found', ['transfer_id' => $transferId]);
            return;
        }

        $mappedStatus = $this->mapBridgeTransferStateToStatus($state);

        DB::transaction(function () use ($transactions, $mappedStatus, $state, $transferId, $eventObject, $changes) {
            foreach ($transactions as $transaction) {
                $oldStatus = $transaction->status;
                $transaction->status = $mappedStatus;

                // Handle completed transfers
                if ($mappedStatus === 'completed' && $oldStatus !== 'completed') {
                    $transaction->processed_at = now();

                    $user = $transaction->user;
                    $amount = (float) $transaction->amount;

                    if ($transaction->type === 'transfer_in') {
                        $user->increment('balance', $amount);
                        Log::info('Bridge transfer completed: Balance added to recipient', [
                            'user_id' => $user->id,
                            'amount' => $amount,
                            'transaction_id' => $transaction->id,
                        ]);
                    }
                }

                // Handle failed transfers - refund sender
                if ($mappedStatus === 'failed' && $oldStatus !== 'failed') {
                    if ($transaction->type === 'transfer_out') {
                        $user = $transaction->user;
                        $amount = (float) $transaction->amount;
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
                $meta['bridge_state'] = $state;
                $meta['bridge_update_at'] = now()->toIso8601String();
                $meta['bridge_changes'] = $changes;
                
                // Store receipt if available
                if (isset($eventObject['receipt'])) {
                    $meta['bridge_receipt'] = $eventObject['receipt'];
                }

                $transaction->meta = $meta;
                $transaction->save();
            }

            Log::info('Bridge transfer event processed', [
                'transfer_id' => $transferId,
                'state' => $state,
                'mapped_status' => $mappedStatus,
                'transaction_count' => $transactions->count(),
            ]);
        });
    }

    /**
     * Handle virtual account activity events
     */
    private function handleVirtualAccountActivity(string $eventType, array $eventObject)
    {
        $activityId = $eventObject['id'] ?? null;
        $virtualAccountId = $eventObject['virtual_account_id'] ?? null;
        $customerId = $eventObject['customer_id'] ?? null;
        $type = $eventObject['type'] ?? null; // e.g., 'payment_submitted'
        $amount = $eventObject['amount'] ?? null;

        Log::info('Bridge virtual account activity', [
            'activity_id' => $activityId,
            'virtual_account_id' => $virtualAccountId,
            'customer_id' => $customerId,
            'type' => $type,
            'amount' => $amount,
        ]);

        // Implement your virtual account activity handling logic here
    }

    /**
     * Handle card account events
     */
    private function handleCardAccountEvent(string $eventType, array $eventObject, ?string $status)
    {
        $cardAccountId = $eventObject['id'] ?? null;
        $customerId = $eventObject['customer_id'] ?? null;

        Log::info('Bridge card account event', [
            'card_account_id' => $cardAccountId,
            'customer_id' => $customerId,
            'status' => $status,
            'event_type' => $eventType,
        ]);

        // Implement your card account handling logic here
    }

    /**
     * Handle card transaction events
     */
    private function handleCardTransactionEvent(string $eventType, array $eventObject, ?string $status, array $changes)
    {
        $transactionId = $eventObject['id'] ?? null;
        $cardAccountId = $eventObject['card_account_id'] ?? null;
        $amount = $eventObject['amount'] ?? null;
        $merchantName = $eventObject['merchant_name'] ?? null;

        Log::info('Bridge card transaction event', [
            'transaction_id' => $transactionId,
            'card_account_id' => $cardAccountId,
            'status' => $status,
            'amount' => $amount,
            'merchant_name' => $merchantName,
            'event_type' => $eventType,
        ]);

        // Implement your card transaction handling logic here
    }

    /**
     * Handle posted card account transaction events
     */
    private function handlePostedCardTransaction(string $eventType, array $eventObject)
    {
        $transactionId = $eventObject['id'] ?? null;
        $cardAccountId = $eventObject['card_account_id'] ?? null;
        $amount = $eventObject['amount'] ?? null;
        $status = $eventObject['status'] ?? null;

        Log::info('Bridge posted card transaction event', [
            'transaction_id' => $transactionId,
            'card_account_id' => $cardAccountId,
            'amount' => $amount,
            'status' => $status,
        ]);

        // Implement your posted transaction handling logic here
    }

    /**
     * Handle card withdrawal events
     */
    private function handleCardWithdrawal(string $eventType, array $eventObject, ?string $status)
    {
        Log::info('Bridge card withdrawal event', [
            'event_type' => $eventType,
            'status' => $status,
            'event_object' => $eventObject,
        ]);

        // Implement your card withdrawal handling logic here
    }

    /**
     * Handle liquidation address drain events
     */
    private function handleLiquidationAddressDrain(string $eventType, array $eventObject, ?string $status)
    {
        Log::info('Bridge liquidation address drain event', [
            'event_type' => $eventType,
            'status' => $status,
            'event_object' => $eventObject,
        ]);

        // Implement your liquidation address handling logic here
    }

    /**
     * Normalize ToS status values to Bridge's documented statuses
     * 
     * Bridge ToS statuses:
     * - pending
     * - approved
     */
    private function normalizeTosStatus(?string $status): string
    {
        if (!$status) {
            return 'pending';
        }

        $status = strtolower(trim($status));

        // Valid Bridge ToS statuses
        $validTosStatuses = [
            'pending',
            'approved',
        ];

        // If status is already a valid Bridge ToS status, return it as-is
        if (in_array($status, $validTosStatuses)) {
            return $status;
        }

        // Legacy status mapping
        $legacyStatusMap = [
            'accepted' => 'approved', // Legacy accepted = approved
        ];

        return $legacyStatusMap[$status] ?? 'pending';
    }

    /**
     * Normalize KYC/KYB status values to Bridge's documented statuses
     * 
     * Bridge KYC/KYB Link statuses:
     * - not_started
     * - incomplete
     * - under_review
     * - awaiting_questionnaire
     * - awaiting_ubo (for businesses)
     * - approved
     * - rejected
     * - paused
     * - offboarded
     * 
     * Bridge Customer statuses:
     * - not_started
     * - active
     * - under_review
     * - rejected
     */
    private function normalizeStatus(?string $status): string
    {
        if (!$status) {
            return 'not_started';
        }

        $status = strtolower(trim($status));

        // Valid Bridge KYC/KYB Link statuses
        $validKycKybStatuses = [
            'not_started',
            'incomplete',
            'under_review',
            'awaiting_questionnaire',
            'awaiting_ubo',
            'approved',
            'rejected',
            'paused',
            'offboarded',
        ];

        // Valid Bridge Customer statuses
        $validCustomerStatuses = [
            'not_started',
            'active',
            'under_review',
            'rejected',
        ];

        // Valid Bridge ToS statuses
        $validTosStatuses = [
            'pending',
            'approved',
        ];

        // If status is already a valid Bridge status, return it as-is
        if (in_array($status, array_merge($validKycKybStatuses, $validCustomerStatuses, $validTosStatuses))) {
            return $status;
        }

        // Legacy status mapping for backward compatibility
        $legacyStatusMap = [
            'active' => 'approved', // Customer active = approved
            'verified' => 'approved', // Legacy verified = approved
            'pending' => 'under_review', // Legacy pending = under_review for KYC/KYB
            'manual_review' => 'under_review',
            'in_review' => 'under_review',
            'submitted' => 'under_review',
        ];

        return $legacyStatusMap[$status] ?? 'not_started';
    }

    /**
     * Map Bridge transfer state to transaction status
     */
    private function mapBridgeTransferStateToStatus(?string $state): string
    {
        if (!$state) {
            return 'pending';
        }

        $state = strtolower($state);

        $stateMap = [
            'payment_processed' => 'completed',
            'completed' => 'completed',
            'funds_received' => 'pending',
            'payment_submitted' => 'pending',
            'awaiting_funds' => 'pending',
            'in_review' => 'pending',
            'failed' => 'failed',
            'returned' => 'failed',
            'refunded' => 'failed',
            'canceled' => 'cancelled',
            'cancelled' => 'cancelled',
        ];

        return $stateMap[$state] ?? 'pending';
    }
}