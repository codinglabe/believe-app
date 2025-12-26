<?php

namespace App\Http\Controllers;

use App\Models\BridgeIntegration;
use App\Models\BridgeWallet;
use App\Models\CardWallet;
use App\Models\LiquidationAddress;
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

                case 'static_memo.activity':
                    $this->handleStaticMemoActivity($eventType, $eventObject, $eventObjectStatus);
                    break;

                case 'wallet':
                    $this->handleWalletEvent($eventType, $eventObject, $eventObjectStatus, $eventObjectChanges);
                    break;

                default:
                    Log::warning('Unhandled Bridge webhook event category', [
                        'event_category' => $eventCategory,
                        'event_type' => $eventType,
                        'event_object' => $eventObject,
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

        // Handle customer deletion
        // Bridge.xyz webhook format for deletion:
        // - event_type: "customer.deleted" or "customer.updated.status_transitioned" with status "deleted"
        // - event_object_status: "deleted" or "offboarded"
        // - event_object may contain: deleted_at, status: "deleted" or "offboarded"
        $isDeleted = false;
        
        // Check event type (e.g., "customer.deleted", "customer.updated.status_transitioned")
        if (str_contains(strtolower($eventType ?? ''), 'deleted')) {
            $isDeleted = true;
        }
        
        // Check event_object_status
        if (!$isDeleted && $status) {
            $statusLower = strtolower($status);
            if (in_array($statusLower, ['deleted', 'offboarded'])) {
                $isDeleted = true;
            }
        }
        
        // Check event_object fields
        if (!$isDeleted) {
            // Check for deleted_at timestamp
            if (isset($eventObject['deleted_at']) && !empty($eventObject['deleted_at'])) {
                $isDeleted = true;
            }
            
            // Check status field in event_object
            if (isset($eventObject['status'])) {
                $objectStatus = strtolower($eventObject['status']);
                if (in_array($objectStatus, ['deleted', 'offboarded'])) {
                    $isDeleted = true;
                }
            }
            
            // Check kyb_status or kyc_status for "offboarded"
            if (isset($eventObject['kyb_status']) && strtolower($eventObject['kyb_status']) === 'offboarded') {
                $isDeleted = true;
            }
            if (isset($eventObject['kyc_status']) && strtolower($eventObject['kyc_status']) === 'offboarded') {
                $isDeleted = true;
            }
        }

        if ($isDeleted) {
            $this->handleCustomerDeletion($integration, $customerId);
            return;
        }

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
            // For businesses, BOTH kyc_status AND kyb_status must be approved
            // For individuals, only kyc_status needs to be approved
            $isApproved = false;
            $isBusiness = $integration->integratable_type === Organization::class;
            
            if ($isBusiness) {
                // For businesses, BOTH KYB and KYC must be approved
                $isApproved = ($integration->kyb_status === 'approved' && $integration->kyc_status === 'approved');
            } else {
                // For individuals, check if KYC is approved
                $isApproved = $integration->kyc_status === 'approved';
            }

            if ($isApproved && $integration->bridge_customer_id) {
                // Auto-create wallet, virtual account, and card account when approved
                $this->createWalletVirtualAccountAndCardAccount($integration, $customerId);
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
            // For businesses, BOTH kyc_status AND kyb_status must be approved
            // For individuals, only kyc_status needs to be approved
            $isApproved = false;
            $isBusiness = $integration->integratable_type === Organization::class;
            
            if ($isBusiness) {
                // For businesses, BOTH KYB and KYC must be approved
                $isApproved = ($integration->kyb_status === 'approved' && $integration->kyc_status === 'approved');
            } else {
                // For individuals, check if KYC is approved
                $isApproved = $integration->kyc_status === 'approved';
            }

            // For businesses, BOTH KYB and KYC must be approved before creating resources
            if ($isBusiness && $integration->kyb_status !== 'approved') {
                $isApproved = false;
                Log::info('Business account KYC approved but KYB not approved yet - waiting for both', [
                    'integration_id' => $integration->id,
                    'customer_id' => $customerId,
                    'kyc_status' => $integration->kyc_status,
                    'kyb_status' => $integration->kyb_status,
                ]);
            }

            if ($isApproved && $integration->bridge_customer_id) {
                // Auto-create wallet, virtual account, and card account when approved
                $this->createWalletVirtualAccountAndCardAccount($integration, $customerId, $linkId);
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
     * 
     * Per Bridge.xyz docs: Transfer events track the state of money transfers
     * States: payment_submitted, payment_processed, failed, etc.
     */
    private function handleTransferEvent(string $eventType, array $eventObject, ?string $status, array $changes)
    {
        $transferId = $eventObject['id'] ?? null;
        $state = $eventObject['state'] ?? $status ?? $eventObject['status'] ?? null;

        if (!$transferId) {
            Log::warning('Bridge transfer event missing transfer id', ['event_object' => $eventObject]);
            return;
        }

        Log::info('Bridge transfer event received', [
            'transfer_id' => $transferId,
            'state' => $state,
            'event_type' => $eventType,
            'event_object_status' => $status,
        ]);

        // Find transactions by Bridge transfer ID
        $transactions = Transaction::where(function($query) use ($transferId) {
            $query->whereJsonContains('meta->bridge_transfer_id', $transferId)
                  ->orWhereJsonContains('meta->transfer_id', $transferId);
        })->get();

        if ($transactions->isEmpty()) {
            // Try to find by source/destination wallet IDs from transfer object
            $sourceWalletId = $eventObject['source']['bridge_wallet_id'] ?? null;
            $destinationWalletId = $eventObject['destination']['bridge_wallet_id'] ?? null;
            
            if ($sourceWalletId || $destinationWalletId) {
                // Try to find transactions by wallet IDs
                $transactions = Transaction::where(function($query) use ($sourceWalletId, $destinationWalletId) {
                    if ($sourceWalletId) {
                        $query->whereJsonContains('meta->bridge_wallet_id', $sourceWalletId);
                    }
                    if ($destinationWalletId) {
                        $query->orWhereJsonContains('meta->bridge_wallet_id', $destinationWalletId);
                    }
                })->where('created_at', '>=', now()->subHours(24)) // Within last 24 hours
                  ->get();
            }

            if ($transactions->isEmpty()) {
                Log::warning('Bridge transfer event: Transactions not found', [
                    'transfer_id' => $transferId,
                    'source_wallet_id' => $sourceWalletId,
                    'destination_wallet_id' => $destinationWalletId,
                ]);
                return;
            }
        }

        $mappedStatus = $this->mapBridgeTransferStateToStatus($state);

        DB::transaction(function () use ($transactions, $mappedStatus, $state, $transferId, $eventObject, $changes, $eventType) {
            foreach ($transactions as $transaction) {
                $oldStatus = $transaction->status;
                $transaction->status = $mappedStatus;

                // Handle completed transfers - add balance to recipient
                if ($mappedStatus === 'completed' && $oldStatus !== 'completed') {
                    $transaction->processed_at = now();

                    $user = $transaction->user;
                    $amount = (float) $transaction->amount;

                    if ($transaction->type === 'transfer_in') {
                        // Only add balance if not already added (check if processed_at was null)
                        if (!$transaction->getOriginal('processed_at')) {
                            $user->increment('balance', $amount);
                            Log::info('Bridge transfer completed: Balance added to recipient', [
                                'user_id' => $user->id,
                                'amount' => $amount,
                                'transaction_id' => $transaction->id,
                                'transfer_id' => $transferId,
                            ]);
                        }
                    } elseif ($transaction->type === 'transfer_out') {
                        // Mark sender transaction as completed
                        Log::info('Bridge transfer completed: Sender transaction confirmed', [
                            'user_id' => $user->id,
                            'amount' => $amount,
                            'transaction_id' => $transaction->id,
                            'transfer_id' => $transferId,
                        ]);
                    }
                }

                // Handle failed/cancelled transfers - refund sender
                if (in_array($mappedStatus, ['failed', 'cancelled']) && !in_array($oldStatus, ['failed', 'cancelled'])) {
                    if ($transaction->type === 'transfer_out') {
                        $user = $transaction->user;
                        $amount = (float) $transaction->amount;
                        $fee = (float) ($transaction->fee ?? 0);
                        
                        // Refund amount + fee to sender
                        $user->increment('balance', $amount + $fee);
                        
                        Log::info('Bridge transfer failed/cancelled: Balance refunded to sender', [
                            'user_id' => $user->id,
                            'amount' => $amount,
                            'fee' => $fee,
                            'total_refund' => $amount + $fee,
                            'transaction_id' => $transaction->id,
                            'transfer_id' => $transferId,
                            'state' => $state,
                        ]);
                    } elseif ($transaction->type === 'transfer_in') {
                        // Remove balance from recipient if transfer failed
                        $user = $transaction->user;
                        $amount = (float) $transaction->amount;
                        
                        // Only deduct if balance was previously added
                        if ($transaction->getOriginal('processed_at')) {
                            $user->decrement('balance', $amount);
                            Log::info('Bridge transfer failed: Balance removed from recipient', [
                                'user_id' => $user->id,
                                'amount' => $amount,
                                'transaction_id' => $transaction->id,
                                'transfer_id' => $transferId,
                            ]);
                        }
                    }
                }

                // Update metadata with latest Bridge transfer information
                $meta = $transaction->meta ?? [];
                $meta['bridge_state'] = $state;
                $meta['bridge_status'] = $state; // Alias for compatibility
                $meta['bridge_update_at'] = now()->toIso8601String();
                $meta['bridge_changes'] = $changes;
                $meta['bridge_event_type'] = $eventType;
                
                // Store receipt if available
                if (isset($eventObject['receipt'])) {
                    $meta['bridge_receipt'] = $eventObject['receipt'];
                }

                // Store source and destination info
                if (isset($eventObject['source'])) {
                    $meta['bridge_source'] = $eventObject['source'];
                }
                if (isset($eventObject['destination'])) {
                    $meta['bridge_destination'] = $eventObject['destination'];
                }

                $transaction->meta = $meta;
                $transaction->save();
            }

            Log::info('Bridge transfer event processed', [
                'transfer_id' => $transferId,
                'state' => $state,
                'mapped_status' => $mappedStatus,
                'transaction_count' => $transactions->count(),
                'event_type' => $eventType,
            ]);
        });
    }

    /**
     * Handle virtual account activity events
     * 
     * Per Bridge.xyz docs: Virtual account activity includes deposits and other events
     * Event types: payment_submitted, payment_processed, etc.
     */
    private function handleVirtualAccountActivity(string $eventType, array $eventObject)
    {
        $activityId = $eventObject['id'] ?? null;
        $virtualAccountId = $eventObject['virtual_account_id'] ?? null;
        $customerId = $eventObject['customer_id'] ?? null;
        $type = $eventObject['type'] ?? null; // e.g., 'payment_submitted', 'payment_processed'
        $amount = $eventObject['amount'] ?? null;
        $state = $eventObject['state'] ?? null;

        Log::info('Bridge virtual account activity', [
            'activity_id' => $activityId,
            'virtual_account_id' => $virtualAccountId,
            'customer_id' => $customerId,
            'type' => $type,
            'state' => $state,
            'amount' => $amount,
            'event_type' => $eventType,
        ]);

        // Find integration by customer ID
        if (!$customerId) {
            Log::warning('Bridge virtual account activity missing customer_id', [
                'activity_id' => $activityId,
                'virtual_account_id' => $virtualAccountId,
            ]);
            return;
        }

        $integration = BridgeIntegration::where('bridge_customer_id', $customerId)->first();
        if (!$integration) {
            Log::warning('Bridge integration not found for virtual account activity', [
                'customer_id' => $customerId,
                'virtual_account_id' => $virtualAccountId,
            ]);
            return;
        }

        // Handle payment_processed - deposit completed
        if ($type === 'payment_processed' || $state === 'payment_processed') {
            try {
                $user = $integration->integratable;
                if (!$user) {
                    Log::warning('User/Organization not found for virtual account deposit', [
                        'integration_id' => $integration->id,
                        'customer_id' => $customerId,
                    ]);
                    return;
                }

                // Get the user model (for organizations, get the associated user)
                if ($integration->integratable_type === Organization::class) {
                    $user = $user->user ?? null;
                }

                if (!$user) {
                    Log::warning('User not found for virtual account deposit', [
                        'integration_id' => $integration->id,
                    ]);
                    return;
                }

                $depositAmount = (float) ($amount ?? 0);
                if ($depositAmount > 0) {
                    // Check if transaction already exists
                    $existingTransaction = Transaction::where('user_id', $user->id)
                        ->where('type', 'deposit')
                        ->whereJsonContains('meta->virtual_account_id', $virtualAccountId)
                        ->whereJsonContains('meta->activity_id', $activityId)
                        ->first();

                    if (!$existingTransaction) {
                        // Add balance to user
                        $user->increment('balance', $depositAmount);

                        // Record deposit transaction
                        $user->recordTransaction([
                            'type' => 'deposit',
                            'amount' => $depositAmount,
                            'status' => 'completed',
                            'payment_method' => 'bridge',
                            'meta' => [
                                'virtual_account_id' => $virtualAccountId,
                                'activity_id' => $activityId,
                                'customer_id' => $customerId,
                                'bridge_event_type' => $eventType,
                                'bridge_state' => $state,
                            ],
                            'processed_at' => now(),
                        ]);

                        Log::info('Bridge virtual account deposit processed', [
                            'user_id' => $user->id,
                            'integration_id' => $integration->id,
                            'amount' => $depositAmount,
                            'virtual_account_id' => $virtualAccountId,
                            'activity_id' => $activityId,
                        ]);
                    } else {
                        Log::info('Bridge virtual account deposit already processed', [
                            'transaction_id' => $existingTransaction->id,
                            'activity_id' => $activityId,
                        ]);
                    }
                }
            } catch (\Exception $e) {
                Log::error('Exception processing virtual account deposit', [
                    'integration_id' => $integration->id,
                    'customer_id' => $customerId,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
            }
        }
    }

    /**
     * Handle card account events
     * 
     * Per Bridge.xyz docs: Card account events track card account status changes
     * Event types: card_account.created, card_account.updated, card_account.status_transitioned
     */
    private function handleCardAccountEvent(string $eventType, array $eventObject, ?string $status)
    {
        $cardAccountId = $eventObject['id'] ?? null;
        $customerId = $eventObject['customer_id'] ?? null;
        $cardStatus = $eventObject['status'] ?? $status;

        Log::info('Bridge card account event', [
            'card_account_id' => $cardAccountId,
            'customer_id' => $customerId,
            'status' => $cardStatus,
            'event_type' => $eventType,
        ]);

        // Update card wallet in database if exists
        if ($cardAccountId && $customerId) {
            try {
                $integration = BridgeIntegration::where('bridge_customer_id', $customerId)->first();
                
                if ($integration) {
                    $cardWallet = CardWallet::where('bridge_integration_id', $integration->id)
                        ->where('bridge_card_account_id', $cardAccountId)
                        ->first();

                    if ($cardWallet) {
                        // Update card wallet with latest data from Bridge
                        $cardWallet->update([
                            'status' => $cardStatus ?? $cardWallet->status,
                            'card_number' => $eventObject['card_number'] ?? $eventObject['last_four'] ?? $cardWallet->card_number,
                            'card_type' => $eventObject['type'] ?? $eventObject['card_type'] ?? $cardWallet->card_type,
                            'card_brand' => $eventObject['brand'] ?? $eventObject['card_brand'] ?? $cardWallet->card_brand,
                            'expiry_month' => $eventObject['expiry_month'] ?? $eventObject['exp_month'] ?? $cardWallet->expiry_month,
                            'expiry_year' => $eventObject['expiry_year'] ?? $eventObject['exp_year'] ?? $cardWallet->expiry_year,
                            'balance' => $eventObject['balance'] ?? $eventObject['available_balance'] ?? $cardWallet->balance,
                            'currency' => $eventObject['currency'] ?? $cardWallet->currency,
                            'card_metadata' => $eventObject, // Store full response
                            'last_balance_sync' => now(),
                        ]);

                        Log::info('Bridge card account updated in database', [
                            'card_wallet_id' => $cardWallet->id,
                            'card_account_id' => $cardAccountId,
                            'status' => $cardStatus,
                        ]);
                    } else {
                        // Card wallet doesn't exist, create it
                        $cardWallet = CardWallet::create([
                            'bridge_integration_id' => $integration->id,
                            'bridge_customer_id' => $customerId,
                            'bridge_card_account_id' => $cardAccountId,
                            'card_number' => $eventObject['card_number'] ?? $eventObject['last_four'] ?? null,
                            'card_type' => $eventObject['type'] ?? $eventObject['card_type'] ?? null,
                            'card_brand' => $eventObject['brand'] ?? $eventObject['card_brand'] ?? null,
                            'expiry_month' => $eventObject['expiry_month'] ?? $eventObject['exp_month'] ?? null,
                            'expiry_year' => $eventObject['expiry_year'] ?? $eventObject['exp_year'] ?? null,
                            'status' => $cardStatus ?? 'active',
                            'balance' => $eventObject['balance'] ?? $eventObject['available_balance'] ?? 0,
                            'currency' => $eventObject['currency'] ?? 'USD',
                            'card_metadata' => $eventObject,
                            'is_primary' => true,
                            'last_balance_sync' => now(),
                        ]);

                        Log::info('Bridge card account created in database from webhook', [
                            'card_wallet_id' => $cardWallet->id,
                            'card_account_id' => $cardAccountId,
                        ]);
                    }
                }
            } catch (\Exception $e) {
                Log::error('Exception handling card account event', [
                    'card_account_id' => $cardAccountId,
                    'customer_id' => $customerId,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
            }
        }
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
     * 
     * Per Bridge.xyz docs: Posted transactions are finalized card transactions
     */
    private function handlePostedCardTransaction(string $eventType, array $eventObject)
    {
        $transactionId = $eventObject['id'] ?? null;
        $cardAccountId = $eventObject['card_account_id'] ?? null;
        $customerId = $eventObject['customer_id'] ?? null;
        $amount = $eventObject['amount'] ?? null;
        $status = $eventObject['status'] ?? null;

        Log::info('Bridge posted card transaction event', [
            'transaction_id' => $transactionId,
            'card_account_id' => $cardAccountId,
            'customer_id' => $customerId,
            'amount' => $amount,
            'status' => $status,
            'event_type' => $eventType,
        ]);

        // Update card wallet balance when transaction is posted
        if ($cardAccountId && $customerId) {
            try {
                $integration = BridgeIntegration::where('bridge_customer_id', $customerId)->first();
                
                if ($integration) {
                    $cardWallet = CardWallet::where('bridge_integration_id', $integration->id)
                        ->where('bridge_card_account_id', $cardAccountId)
                        ->first();

                    if ($cardWallet) {
                        // Update balance from posted transaction
                        if (isset($eventObject['available_balance']) || isset($eventObject['balance'])) {
                            $newBalance = $eventObject['available_balance'] ?? $eventObject['balance'] ?? $cardWallet->balance;
                            $cardWallet->update([
                                'balance' => $newBalance,
                                'last_balance_sync' => now(),
                            ]);
                        }

                        Log::info('Bridge card wallet balance updated from posted transaction', [
                            'card_wallet_id' => $cardWallet->id,
                            'transaction_id' => $transactionId,
                        ]);
                    }
                }
            } catch (\Exception $e) {
                Log::error('Exception handling posted card transaction', [
                    'transaction_id' => $transactionId,
                    'error' => $e->getMessage(),
                ]);
            }
        }
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
     * 
     * Per Bridge.xyz docs: Liquidation address drain events track funds moved from liquidation addresses
     */
    private function handleLiquidationAddressDrain(string $eventType, array $eventObject, ?string $status)
    {
        $drainId = $eventObject['id'] ?? null;
        $liquidationAddressId = $eventObject['liquidation_address_id'] ?? null;
        $customerId = $eventObject['customer_id'] ?? null;
        $amount = $eventObject['amount'] ?? null;

        Log::info('Bridge liquidation address drain event', [
            'event_type' => $eventType,
            'drain_id' => $drainId,
            'liquidation_address_id' => $liquidationAddressId,
            'customer_id' => $customerId,
            'amount' => $amount,
            'status' => $status,
        ]);

        // Implement liquidation address drain handling if needed
        // This typically involves updating balances or recording transactions
    }

    /**
     * Handle static memo activity events
     * 
     * Per Bridge.xyz docs: Static memo activity tracks deposits to static memo addresses
     */
    private function handleStaticMemoActivity(string $eventType, array $eventObject, ?string $status)
    {
        $activityId = $eventObject['id'] ?? null;
        $staticMemoId = $eventObject['static_memo_id'] ?? null;
        $customerId = $eventObject['customer_id'] ?? null;
        $amount = $eventObject['amount'] ?? null;
        $type = $eventObject['type'] ?? null;

        Log::info('Bridge static memo activity event', [
            'activity_id' => $activityId,
            'static_memo_id' => $staticMemoId,
            'customer_id' => $customerId,
            'amount' => $amount,
            'type' => $type,
            'status' => $status,
            'event_type' => $eventType,
        ]);

        // Handle static memo deposits similar to virtual account deposits
        if ($type === 'payment_processed' && $customerId && $amount) {
            try {
                $integration = BridgeIntegration::where('bridge_customer_id', $customerId)->first();
                
                if ($integration) {
                    $user = $integration->integratable;
                    if ($user && $integration->integratable_type === Organization::class) {
                        $user = $user->user ?? null;
                    }

                    if ($user) {
                        $depositAmount = (float) $amount;
                        
                        // Check if transaction already exists
                        $existingTransaction = Transaction::where('user_id', $user->id)
                            ->where('type', 'deposit')
                            ->whereJsonContains('meta->static_memo_id', $staticMemoId)
                            ->whereJsonContains('meta->activity_id', $activityId)
                            ->first();

                        if (!$existingTransaction) {
                            $user->increment('balance', $depositAmount);

                            $user->recordTransaction([
                                'type' => 'deposit',
                                'amount' => $depositAmount,
                                'status' => 'completed',
                                'payment_method' => 'bridge',
                                'meta' => [
                                    'static_memo_id' => $staticMemoId,
                                    'activity_id' => $activityId,
                                    'customer_id' => $customerId,
                                    'bridge_event_type' => $eventType,
                                ],
                                'processed_at' => now(),
                            ]);

                            Log::info('Bridge static memo deposit processed', [
                                'user_id' => $user->id,
                                'amount' => $depositAmount,
                                'static_memo_id' => $staticMemoId,
                            ]);
                        }
                    }
                }
            } catch (\Exception $e) {
                Log::error('Exception processing static memo deposit', [
                    'customer_id' => $customerId,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }

    /**
     * Handle wallet events
     * 
     * Per Bridge.xyz docs: Wallet events track wallet status changes
     */
    private function handleWalletEvent(string $eventType, array $eventObject, ?string $status, array $changes)
    {
        $walletId = $eventObject['id'] ?? null;
        $customerId = $eventObject['customer_id'] ?? null;
        $walletStatus = $eventObject['status'] ?? $status;
        $address = $eventObject['address'] ?? null;
        $chain = $eventObject['chain'] ?? null;

        Log::info('Bridge wallet event', [
            'wallet_id' => $walletId,
            'customer_id' => $customerId,
            'status' => $walletStatus,
            'address' => $address,
            'chain' => $chain,
            'event_type' => $eventType,
        ]);

        // Update wallet in database if exists
        if ($walletId && $customerId) {
            try {
                $integration = BridgeIntegration::where('bridge_customer_id', $customerId)->first();
                
                if ($integration) {
                    $wallet = BridgeWallet::where('bridge_integration_id', $integration->id)
                        ->where('bridge_wallet_id', $walletId)
                        ->first();

                    if ($wallet) {
                        $wallet->update([
                            'status' => $walletStatus ?? $wallet->status,
                            'wallet_address' => $address ?? $wallet->wallet_address,
                            'chain' => $chain ?? $wallet->chain,
                            'wallet_metadata' => $eventObject,
                            'last_balance_sync' => now(),
                        ]);

                        Log::info('Bridge wallet updated in database', [
                            'wallet_id' => $wallet->id,
                            'bridge_wallet_id' => $walletId,
                            'status' => $walletStatus,
                        ]);
                    }
                }
            } catch (\Exception $e) {
                Log::error('Exception handling wallet event', [
                    'wallet_id' => $walletId,
                    'error' => $e->getMessage(),
                ]);
            }
        }
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

    /**
     * Create wallet, virtual account, and card account when customer is approved
     * 
     * This follows Bridge.xyz API documentation exactly for both sandbox and live environments:
     * 
     * SANDBOX MODE (per Bridge.xyz docs):
     * - Wallets: NOT available in sandbox (skipped with info log)
     * - Virtual Accounts: Created with dummy data using Ethereum payment rail, USDC currency, and auto-generated address
     * - Card Accounts: Can be created normally (may be auto-created by Bridge)
     * 
     * PRODUCTION MODE:
     * - Wallets: Created on Solana chain (default)
     * - Virtual Accounts: Created linked to wallet (bridge_wallet) or ACH push if no wallet
     * - Card Accounts: Created normally
     * 
     * @param BridgeIntegration $integration The Bridge integration
     * @param string $customerId The Bridge customer ID
     * @param string|null $linkId Optional KYC link ID for logging
     * @return void
     */
    public function createWalletVirtualAccountAndCardAccount(BridgeIntegration $integration, string $customerId, ?string $linkId = null): void
    {
        $customerId = $integration->bridge_customer_id;
        
        if (!$customerId) {
            Log::warning('Cannot create wallet/virtual account/card account: missing customer ID', [
                'integration_id' => $integration->id,
            ]);
            return;
        }
        
        // For business accounts, BOTH kyc_status AND kyb_status must be approved
        // For individual accounts, only kyc_status needs to be approved
        $isBusiness = $integration->integratable_type === \App\Models\Organization::class;
        
        if ($isBusiness) {
            // Business account: check BOTH statuses
            if ($integration->kyb_status !== 'approved' || $integration->kyc_status !== 'approved') {
                Log::info('Business account not fully approved yet - waiting for both KYB and KYC', [
                    'integration_id' => $integration->id,
                    'customer_id' => $customerId,
                    'kyb_status' => $integration->kyb_status,
                    'kyc_status' => $integration->kyc_status,
                ]);
                return;
            }
        } else {
            // Individual account: check KYC only
            if ($integration->kyc_status !== 'approved') {
                Log::info('Individual account KYC not approved yet', [
                    'integration_id' => $integration->id,
                    'customer_id' => $customerId,
                    'kyc_status' => $integration->kyc_status,
                ]);
                return;
            }
        }

        // 1. Create Wallet (only in production, not available in sandbox)
        $existingWallet = BridgeWallet::where('bridge_integration_id', $integration->id)
            ->where('is_primary', true)
            ->first();

        $walletId = null;
        if (!$existingWallet) {
            try {
                // Create primary wallet (default: Solana)
                // Note: Wallets are not available in sandbox mode per Bridge.xyz docs
                $chain = 'solana';
                $walletResult = $this->bridgeService->createWallet($customerId, $chain);

                if ($walletResult['success'] && isset($walletResult['data'])) {
                    $walletData = $walletResult['data'];
                    $walletId = $walletData['id'] ?? null;
                    
                    // Create wallet record in database
                    $wallet = BridgeWallet::create([
                        'bridge_integration_id' => $integration->id,
                        'bridge_customer_id' => $customerId,
                        'bridge_wallet_id' => $walletId,
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
                        // wallet_address and wallet_chain are stored on BridgeWallet, not BridgeIntegration
                        $integration->save();
                    }

                    Log::info('Bridge wallet auto-created on approval', [
                        'integration_id' => $integration->id,
                        'customer_id' => $customerId,
                        'link_id' => $linkId,
                        'wallet_id' => $walletId,
                        'chain' => $chain,
                        'address' => $wallet->wallet_address,
                    ]);
                } else {
                    // In sandbox, wallet creation will fail - this is expected per Bridge.xyz docs
                    if ($this->bridgeService->isSandbox()) {
                        Log::info('Wallet creation skipped in sandbox mode (not available per Bridge.xyz docs)', [
                            'integration_id' => $integration->id,
                            'customer_id' => $customerId,
                        ]);
                    } else {
                        Log::warning('Failed to auto-create Bridge wallet on approval', [
                            'integration_id' => $integration->id,
                            'customer_id' => $customerId,
                            'error' => $walletResult['error'] ?? 'Unknown error',
                        ]);
                    }
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
            $walletId = $existingWallet->bridge_wallet_id;
            Log::info('Bridge wallet already exists, skipping creation', [
                'integration_id' => $integration->id,
                'customer_id' => $customerId,
                'existing_wallet_id' => $walletId,
            ]);
        }

        // 2. Create Virtual Account (works in both sandbox and production)
        // Per Bridge.xyz docs: Virtual accounts in sandbox use dummy data
        try {
            // Check if virtual account already exists
            $virtualAccountsResult = $this->bridgeService->getVirtualAccounts($customerId);
            $hasVirtualAccount = false;
            
            $existingVirtualAccounts = [];
            if ($virtualAccountsResult['success'] && isset($virtualAccountsResult['data']['data'])) {
                $existingVirtualAccounts = $virtualAccountsResult['data']['data'];
                $hasVirtualAccount = count($existingVirtualAccounts) > 0;
            }

            if (!$hasVirtualAccount) {
                if ($this->bridgeService->isSandbox()) {
                    // Sandbox mode: Create virtual account with dummy data per Bridge.xyz docs
                    // Uses Ethereum payment rail with auto-generated address and USDC currency
                    $source = ['currency' => 'usd'];
                    $destination = [
                        'payment_rail' => 'ethereum',
                        'currency' => 'usdc',
                        'address' => $this->bridgeService->generateEthereumAddress(), // Auto-generated dummy address
                    ];
                    
                    $virtualAccountResult = $this->bridgeService->createVirtualAccount($customerId, $source, $destination);
                } elseif ($walletId) {
                    // Production mode with wallet: Create virtual account linked to wallet
                    $virtualAccountResult = $this->bridgeService->createVirtualAccountForWallet(
                        $customerId,
                        $walletId,
                        'USD'
                    );
                } else {
                    // Production mode without wallet: Create virtual account with ACH push
                    $source = ['currency' => 'usd'];
                    $destination = [
                        'payment_rail' => 'ach_push',
                        'currency' => 'usd',
                    ];
                    
                    $virtualAccountResult = $this->bridgeService->createVirtualAccount($customerId, $source, $destination);
                }

                if ($virtualAccountResult['success'] && isset($virtualAccountResult['data'])) {
                    $virtualAccountData = $virtualAccountResult['data'];
                    $virtualAccountId = $virtualAccountData['id'] ?? null;
                    
                    // Store virtual account in bridge_wallets table
                    if ($virtualAccountId) {
                        // Check if virtual account already exists in database
                        $existingVirtualAccountWallet = BridgeWallet::where('bridge_integration_id', $integration->id)
                            ->where('virtual_account_id', $virtualAccountId)
                            ->first();
                        
                        if (!$existingVirtualAccountWallet) {
                            // Extract address from virtual account data
                            $virtualAccountAddress = $virtualAccountData['destination']['address'] ?? null;
                            $chain = $virtualAccountData['destination']['payment_rail'] ?? ($this->bridgeService->isSandbox() ? 'ethereum' : 'solana');
                            $currency = $virtualAccountData['destination']['currency'] ?? ($this->bridgeService->isSandbox() ? 'usdc' : 'usdb');
                            
                            // Create or update bridge_wallets record for virtual account
                            BridgeWallet::updateOrCreate(
                                [
                                    'bridge_integration_id' => $integration->id,
                                    'virtual_account_id' => $virtualAccountId,
                                ],
                                [
                                    'bridge_customer_id' => $customerId,
                                    'wallet_address' => $virtualAccountAddress,
                                    'chain' => $chain,
                                    'currency' => $currency,
                                    'status' => 'active',
                                    'balance' => 0,
                                    'virtual_account_details' => $virtualAccountData,
                                    'is_primary' => !$existingWallet, // Set as primary if no wallet exists
                                    'last_balance_sync' => now(),
                                ]
                            );
                            
                            Log::info('Bridge virtual account stored in bridge_wallets table', [
                                'integration_id' => $integration->id,
                                'customer_id' => $customerId,
                                'virtual_account_id' => $virtualAccountId,
                                'address' => $virtualAccountAddress,
                                'chain' => $chain,
                                'environment' => $this->bridgeService->isSandbox() ? 'sandbox' : 'production',
                            ]);
                        } else {
                            // Update existing virtual account record
                            $existingVirtualAccountWallet->update([
                                'virtual_account_details' => $virtualAccountData,
                                'wallet_address' => $virtualAccountData['destination']['address'] ?? $existingVirtualAccountWallet->wallet_address,
                                'last_balance_sync' => now(),
                            ]);
                            
                            Log::info('Bridge virtual account updated in bridge_wallets table', [
                                'integration_id' => $integration->id,
                                'customer_id' => $customerId,
                                'virtual_account_id' => $virtualAccountId,
                            ]);
                        }
                    }
                    
                    Log::info('Bridge virtual account auto-created on approval', [
                        'integration_id' => $integration->id,
                        'customer_id' => $customerId,
                        'link_id' => $linkId,
                        'virtual_account_id' => $virtualAccountId,
                        'environment' => $this->bridgeService->isSandbox() ? 'sandbox' : 'production',
                    ]);
                } else {
                    Log::warning('Failed to auto-create Bridge virtual account on approval', [
                        'integration_id' => $integration->id,
                        'customer_id' => $customerId,
                        'error' => $virtualAccountResult['error'] ?? 'Unknown error',
                    ]);
                }
            } else {
                // Virtual account already exists in Bridge - store it in database if not already stored
                if (count($existingVirtualAccounts) > 0) {
                    $virtualAccountData = $existingVirtualAccounts[0];
                    $virtualAccountId = $virtualAccountData['id'] ?? null;
                    
                    if ($virtualAccountId) {
                        $existingVirtualAccountWallet = BridgeWallet::where('bridge_integration_id', $integration->id)
                            ->where('virtual_account_id', $virtualAccountId)
                            ->first();
                        
                        if (!$existingVirtualAccountWallet) {
                            // Store existing virtual account in bridge_wallets table
                            $virtualAccountAddress = $virtualAccountData['destination']['address'] ?? null;
                            $chain = $virtualAccountData['destination']['payment_rail'] ?? ($this->bridgeService->isSandbox() ? 'ethereum' : 'solana');
                            $currency = $virtualAccountData['destination']['currency'] ?? ($this->bridgeService->isSandbox() ? 'usdc' : 'usdb');
                            
                            BridgeWallet::updateOrCreate(
                                [
                                    'bridge_integration_id' => $integration->id,
                                    'virtual_account_id' => $virtualAccountId,
                                ],
                                [
                                    'bridge_customer_id' => $customerId,
                                    'wallet_address' => $virtualAccountAddress,
                                    'chain' => $chain,
                                    'currency' => $currency,
                                    'status' => 'active',
                                    'balance' => 0,
                                    'virtual_account_details' => $virtualAccountData,
                                    'is_primary' => !$existingWallet, // Set as primary if no wallet exists
                                    'last_balance_sync' => now(),
                                ]
                            );
                            
                            Log::info('Bridge existing virtual account stored in bridge_wallets table', [
                                'integration_id' => $integration->id,
                                'customer_id' => $customerId,
                                'virtual_account_id' => $virtualAccountId,
                                'address' => $virtualAccountAddress,
                            ]);
                        }
                    }
                }
                
                Log::info('Bridge virtual account already exists, skipping creation', [
                    'integration_id' => $integration->id,
                    'customer_id' => $customerId,
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Exception while auto-creating Bridge virtual account on approval', [
                'integration_id' => $integration->id,
                'customer_id' => $customerId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }

        // 3. Create Card Account (works in both sandbox and production)
        try {
            // Check if card account already exists in Bridge
            $cardAccountsResult = $this->bridgeService->getCardAccounts($customerId);
            $existingCardAccount = null;
            $cardAccountData = null;
            
            if ($cardAccountsResult['success'] && isset($cardAccountsResult['data']['data'])) {
                $cardAccounts = $cardAccountsResult['data']['data'];
                if (count($cardAccounts) > 0) {
                    // Use the first card account (or primary if available)
                    $existingCardAccount = $cardAccounts[0];
                    $cardAccountData = $existingCardAccount;
                }
            }

            // Check if card wallet already exists in database
            $existingCardWallet = CardWallet::where('bridge_integration_id', $integration->id)
                ->where('is_primary', true)
                ->first();

            if (!$existingCardAccount) {
                // Create card account - Bridge.xyz API may auto-create, but we explicitly create it
                // POST /customers/{customerId}/card_accounts
                // Determine chain and currency based on environment
                $isSandbox = $this->bridgeService->isSandbox();
                $chain = $isSandbox ? 'ethereum' : 'solana';
                $currency = $isSandbox ? 'usdc' : 'usdb';
                
                $cardData = [
                    'chain' => $chain,
                    'currency' => $currency,
                ];
                
                $cardAccountResult = $this->bridgeService->createCardAccount($customerId, $cardData);

                if ($cardAccountResult['success'] && isset($cardAccountResult['data'])) {
                    $cardAccountData = $cardAccountResult['data'];
                } else {
                    // Card account creation may fail if not available or already exists
                    // This is acceptable per Bridge.xyz docs
                    Log::info('Card account creation result (may be auto-created by Bridge)', [
                        'integration_id' => $integration->id,
                        'customer_id' => $customerId,
                        'success' => $cardAccountResult['success'] ?? false,
                        'message' => $cardAccountResult['error'] ?? $cardAccountResult['message'] ?? 'Card account may be auto-created',
                    ]);
                    
                    // Try to fetch card accounts again in case Bridge auto-created it
                    $retryResult = $this->bridgeService->getCardAccounts($customerId);
                    if ($retryResult['success'] && isset($retryResult['data']['data']) && count($retryResult['data']['data']) > 0) {
                        $cardAccountData = $retryResult['data']['data'][0];
                    }
                }
            }

            // Store card account data in card_wallets table if we have data and it doesn't exist
            if ($cardAccountData && !$existingCardWallet) {
                $cardAccountId = $cardAccountData['id'] ?? null;
                
                if ($cardAccountId) {
                    // Extract card information from Bridge response
                    $cardNumber = $cardAccountData['card_number'] ?? $cardAccountData['last_four'] ?? null;
                    $cardType = $cardAccountData['type'] ?? $cardAccountData['card_type'] ?? null;
                    $cardBrand = $cardAccountData['brand'] ?? $cardAccountData['card_brand'] ?? null;
                    $expiryMonth = $cardAccountData['expiry_month'] ?? $cardAccountData['exp_month'] ?? null;
                    $expiryYear = $cardAccountData['expiry_year'] ?? $cardAccountData['exp_year'] ?? null;
                    $status = $cardAccountData['status'] ?? 'active';
                    $balance = $cardAccountData['balance'] ?? $cardAccountData['available_balance'] ?? 0;
                    $currency = $cardAccountData['currency'] ?? 'USD';

                    // Create card wallet record in database
                    $cardWallet = CardWallet::create([
                        'bridge_integration_id' => $integration->id,
                        'bridge_customer_id' => $customerId,
                        'bridge_card_account_id' => $cardAccountId,
                        'card_number' => $cardNumber,
                        'card_type' => $cardType,
                        'card_brand' => $cardBrand,
                        'expiry_month' => $expiryMonth,
                        'expiry_year' => $expiryYear,
                        'status' => $status,
                        'balance' => $balance,
                        'currency' => $currency,
                        'card_metadata' => $cardAccountData, // Store full response for reference
                        'is_primary' => true,
                        'last_balance_sync' => now(),
                    ]);

                    Log::info('Bridge card account stored in card_wallets table', [
                        'integration_id' => $integration->id,
                        'customer_id' => $customerId,
                        'link_id' => $linkId,
                        'card_wallet_id' => $cardWallet->id,
                        'card_account_id' => $cardAccountId,
                        'environment' => $this->bridgeService->isSandbox() ? 'sandbox' : 'production',
                    ]);
                }
            } elseif ($existingCardWallet) {
                // Update existing card wallet if we have new data
                if ($cardAccountData) {
                    $cardAccountId = $cardAccountData['id'] ?? null;
                    
                    // Only update if we have the same card account ID or if it's missing
                    if (!$existingCardWallet->bridge_card_account_id || $existingCardWallet->bridge_card_account_id === $cardAccountId) {
                        $existingCardWallet->update([
                            'bridge_card_account_id' => $cardAccountId ?? $existingCardWallet->bridge_card_account_id,
                            'card_number' => $cardAccountData['card_number'] ?? $cardAccountData['last_four'] ?? $existingCardWallet->card_number,
                            'card_type' => $cardAccountData['type'] ?? $cardAccountData['card_type'] ?? $existingCardWallet->card_type,
                            'card_brand' => $cardAccountData['brand'] ?? $cardAccountData['card_brand'] ?? $existingCardWallet->card_brand,
                            'expiry_month' => $cardAccountData['expiry_month'] ?? $cardAccountData['exp_month'] ?? $existingCardWallet->expiry_month,
                            'expiry_year' => $cardAccountData['expiry_year'] ?? $cardAccountData['exp_year'] ?? $existingCardWallet->expiry_year,
                            'status' => $cardAccountData['status'] ?? $existingCardWallet->status,
                            'balance' => $cardAccountData['balance'] ?? $cardAccountData['available_balance'] ?? $existingCardWallet->balance,
                            'currency' => $cardAccountData['currency'] ?? $existingCardWallet->currency,
                            'card_metadata' => $cardAccountData,
                            'last_balance_sync' => now(),
                        ]);

                        Log::info('Bridge card account updated in card_wallets table', [
                            'integration_id' => $integration->id,
                            'customer_id' => $customerId,
                            'card_wallet_id' => $existingCardWallet->id,
                            'card_account_id' => $cardAccountId,
                        ]);
                    }
                }

                Log::info('Bridge card account already exists in database, skipping creation', [
                    'integration_id' => $integration->id,
                    'customer_id' => $customerId,
                    'card_wallet_id' => $existingCardWallet->id,
                ]);
            }
        } catch (\Exception $e) {
                    Log::error('Exception while auto-creating Bridge card account on approval', [
                        'integration_id' => $integration->id,
                        'customer_id' => $customerId,
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString(),
                    ]);
                }

        // 4. Create Liquidation Addresses for crypto deposits (works in both sandbox and production)
        // Create common liquidation addresses: USDC on Solana and Ethereum
        try {
            // Get primary wallet address (for production) or use virtual account address (for sandbox)
            $destinationAddress = null;
            $destinationPaymentRail = null;
            
            if ($existingWallet && $existingWallet->wallet_address) {
                // Production: Use wallet address
                $destinationAddress = $existingWallet->wallet_address;
                $destinationPaymentRail = $existingWallet->chain ?? 'solana';
            } else {
                // Sandbox: Get virtual account address if available
                $virtualAccountsResult = $this->bridgeService->getVirtualAccounts($customerId);
                if ($virtualAccountsResult['success'] && isset($virtualAccountsResult['data']['data'])) {
                    $virtualAccounts = $virtualAccountsResult['data']['data'];
                    if (count($virtualAccounts) > 0) {
                        $virtualAccount = $virtualAccounts[0];
                        $destinationAddress = $virtualAccount['destination']['address'] ?? null;
                        $destinationPaymentRail = $virtualAccount['destination']['payment_rail'] ?? 'ethereum';
                    }
                }
            }

            if ($destinationAddress) {
                // Check existing liquidation addresses in database first
                $existingAddresses = LiquidationAddress::where('bridge_integration_id', $integration->id)
                    ->get()
                    ->toArray();

                // Determine liquidation address configurations based on environment
                $isSandbox = $this->bridgeService->isSandbox();
                
                if ($isSandbox) {
                    // Sandbox: Only create Ethereum liquidation addresses (per Bridge.xyz docs)
                    // Sandbox uses Ethereum payment rail with USDC currency
                    $liquidationConfigs = [
                        ['chain' => 'ethereum', 'currency' => 'usdc', 'destination_payment_rail' => 'ethereum', 'destination_currency' => 'usdc'],
                    ];
                } else {
                    // Production: Create liquidation addresses for common chains
                    $liquidationConfigs = [
                        ['chain' => 'solana', 'currency' => 'usdc', 'destination_payment_rail' => 'solana', 'destination_currency' => 'usdb'],
                        ['chain' => 'ethereum', 'currency' => 'usdc', 'destination_payment_rail' => 'ethereum', 'destination_currency' => 'usdb'],
                    ];
                }

                foreach ($liquidationConfigs as $config) {
                    // Check if liquidation address already exists for this chain/currency
                    $exists = LiquidationAddress::where('bridge_integration_id', $integration->id)
                        ->where('chain', $config['chain'])
                        ->where('currency', $config['currency'])
                        ->exists();

                    if (!$exists) {
                        try {
                            $liquidationData = [
                                'chain' => $config['chain'],
                                'currency' => $config['currency'],
                                'destination_payment_rail' => $config['destination_payment_rail'],
                                'destination_currency' => $config['destination_currency'],
                                'destination_address' => $destinationAddress,
                            ];

                            $liquidationResult = $this->bridgeService->createLiquidationAddress($customerId, $liquidationData);

                            if ($liquidationResult['success'] && isset($liquidationResult['data'])) {
                                $liquidationData = $liquidationResult['data'];
                                
                                // Store liquidation address in database
                                LiquidationAddress::updateOrCreate(
                                    [
                                        'bridge_integration_id' => $integration->id,
                                        'chain' => $config['chain'],
                                        'currency' => $config['currency'],
                                    ],
                                    [
                                        'bridge_customer_id' => $customerId,
                                        'bridge_liquidation_address_id' => $liquidationData['id'] ?? null,
                                        'address' => $liquidationData['address'] ?? null,
                                        'destination_payment_rail' => $config['destination_payment_rail'],
                                        'destination_currency' => $config['destination_currency'],
                                        'destination_address' => $destinationAddress,
                                        'return_address' => $liquidationData['return_address'] ?? null,
                                        'state' => $liquidationData['state'] ?? 'active',
                                        'liquidation_metadata' => $liquidationData,
                                        'last_sync_at' => now(),
                                    ]
                                );

                                Log::info('Bridge liquidation address auto-created on approval', [
                                    'integration_id' => $integration->id,
                                    'customer_id' => $customerId,
                                    'chain' => $config['chain'],
                                    'currency' => $config['currency'],
                                    'liquidation_address_id' => $liquidationData['id'] ?? null,
                                    'liquidation_address' => $liquidationData['address'] ?? null,
                                ]);
                            } else {
                                Log::warning('Failed to auto-create Bridge liquidation address on approval', [
                                    'integration_id' => $integration->id,
                                    'customer_id' => $customerId,
                                    'chain' => $config['chain'],
                                    'currency' => $config['currency'],
                                    'error' => $liquidationResult['error'] ?? 'Unknown error',
                                ]);
                            }
                        } catch (\Exception $e) {
                            Log::error('Exception while auto-creating Bridge liquidation address on approval', [
                                'integration_id' => $integration->id,
                                'customer_id' => $customerId,
                                'chain' => $config['chain'],
                                'currency' => $config['currency'],
                                'error' => $e->getMessage(),
                                'trace' => $e->getTraceAsString(),
                            ]);
                        }
                    } else {
                        Log::info('Bridge liquidation address already exists, skipping creation', [
                            'integration_id' => $integration->id,
                            'customer_id' => $customerId,
                            'chain' => $config['chain'],
                            'currency' => $config['currency'],
                        ]);
                    }
                }
            } else {
                Log::info('Skipping liquidation address creation: no destination address available', [
                    'integration_id' => $integration->id,
                    'customer_id' => $customerId,
                    'has_wallet' => $existingWallet !== null,
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Exception while auto-creating Bridge liquidation addresses on approval', [
                'integration_id' => $integration->id,
                'customer_id' => $customerId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }

    /**
     * Handle customer deletion - clean up all Bridge-related data
     * 
     * Per Bridge.xyz API documentation, customer deletion webhooks can come in different formats:
     * - event_type: "customer.deleted" or "customer.updated.status_transitioned"
     * - event_object_status: "deleted" or "offboarded"
     * - event_object may contain: deleted_at (timestamp), status: "deleted"/"offboarded"
     * - kyb_status or kyc_status may be "offboarded"
     * 
     * When a Bridge customer is deleted, we clean up:
     * 1. Delete all bridge_wallets (wallets and virtual accounts)
     * 2. Delete all card_wallets
     * 3. Delete all liquidation_addresses
     * 4. Mark bridge_kyc_kyb_submissions as "offboarded" (keep for audit trail)
     * 5. Clear all Bridge-specific fields from bridge_integrations (keep record for re-initialization)
     * 
     * Note: Transactions are kept as they're tied to users/organizations, not Bridge customers directly.
     * Control persons, associated persons, and verification documents are kept for audit trail.
     * 
     * @param BridgeIntegration $integration The Bridge integration
     * @param string $customerId The Bridge customer ID that was deleted
     * @return void
     */
    private function handleCustomerDeletion(BridgeIntegration $integration, string $customerId): void
    {
        Log::info('Processing Bridge customer deletion', [
            'integration_id' => $integration->id,
            'customer_id' => $customerId,
        ]);

        DB::transaction(function () use ($integration, $customerId) {
            try {
                // 1. Delete all bridge_wallets (wallets and virtual accounts)
                $deletedWallets = BridgeWallet::where('bridge_integration_id', $integration->id)->delete();
                Log::info('Deleted bridge wallets for deleted customer', [
                    'integration_id' => $integration->id,
                    'customer_id' => $customerId,
                    'deleted_count' => $deletedWallets,
                ]);

                // 2. Delete all card_wallets
                $deletedCardWallets = CardWallet::where('bridge_integration_id', $integration->id)->delete();
                Log::info('Deleted card wallets for deleted customer', [
                    'integration_id' => $integration->id,
                    'customer_id' => $customerId,
                    'deleted_count' => $deletedCardWallets,
                ]);

                // 3. Delete all liquidation_addresses
                $deletedLiquidationAddresses = LiquidationAddress::where('bridge_integration_id', $integration->id)->delete();
                Log::info('Deleted liquidation addresses for deleted customer', [
                    'integration_id' => $integration->id,
                    'customer_id' => $customerId,
                    'deleted_count' => $deletedLiquidationAddresses,
                ]);

                // 4. Mark bridge_kyc_kyb_submissions as offboarded (keep for audit trail)
                $submissions = \App\Models\BridgeKycKybSubmission::where('bridge_integration_id', $integration->id)
                    ->where('bridge_customer_id', $customerId)
                    ->get();
                
                foreach ($submissions as $submission) {
                    // Update submission status to indicate customer was deleted
                    $submissionData = $submission->submission_data ?? [];
                    if (is_string($submissionData)) {
                        $submissionData = json_decode($submissionData, true) ?? [];
                    }
                    $submissionData['customer_deleted_at'] = now()->toIso8601String();
                    $submissionData['customer_deleted'] = true;
                    $submission->submission_data = $submissionData;
                    $submission->submission_status = 'offboarded'; // Mark as offboarded per Bridge.xyz status
                    $submission->bridge_customer_id = null; // Clear customer ID reference
                    $submission->save();
                }

                Log::info('Marked KYB/KYC submissions as offboarded for deleted customer', [
                    'integration_id' => $integration->id,
                    'customer_id' => $customerId,
                    'submission_count' => $submissions->count(),
                ]);
                
                // Note: control_persons and associated_persons are kept (cascade delete would remove them if we deleted submissions)
                // verification_documents are also kept for audit trail

                // 5. Clear bridge_customer_id and all related fields from integration
                // Keep the integration record but clear Bridge-specific data
                // This allows the user/organization to re-initialize if needed
                $integration->bridge_customer_id = null;
                $integration->bridge_wallet_id = null;
                // wallet_address and wallet_chain are stored on BridgeWallet, not BridgeIntegration
                $integration->kyc_status = 'not_started';
                $integration->kyb_status = 'not_started';
                $integration->tos_status = null;
                // tos_accepted is not a column in bridge_integrations table
                $integration->tos_link_url = null;
                $integration->kyc_link_url = null;
                $integration->kyb_link_url = null;
                $integration->kyc_link_id = null; // Clear KYC link ID if exists
                
                // Update metadata to record deletion
                $metadata = $integration->bridge_metadata ?? [];
                if (is_string($metadata)) {
                    $metadata = json_decode($metadata, true) ?? [];
                }
                $metadata['customer_deleted'] = true;
                $metadata['customer_deleted_at'] = now()->toIso8601String();
                $metadata['deleted_customer_id'] = $customerId;
                $integration->bridge_metadata = $metadata;
                
                $integration->save();

                Log::info('Cleared Bridge customer data from integration', [
                    'integration_id' => $integration->id,
                    'deleted_customer_id' => $customerId,
                ]);

                Log::info('Bridge customer deletion processed successfully', [
                    'integration_id' => $integration->id,
                    'customer_id' => $customerId,
                    'deleted_wallets' => $deletedWallets,
                    'deleted_card_wallets' => $deletedCardWallets,
                    'deleted_liquidation_addresses' => $deletedLiquidationAddresses,
                    'updated_submissions' => $submissions->count(),
                ]);

            } catch (\Exception $e) {
                Log::error('Exception while processing Bridge customer deletion', [
                    'integration_id' => $integration->id,
                    'customer_id' => $customerId,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
                throw $e; // Re-throw to rollback transaction
            }
        });
    }
}