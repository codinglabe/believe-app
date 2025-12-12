<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Organization;
use App\Models\BridgeIntegration;
use App\Models\WalletFee;
use App\Models\Transaction;
use App\Services\BridgeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class BridgeWalletController extends Controller
{
    protected BridgeService $bridgeService;

    public function __construct(BridgeService $bridgeService)
    {
        $this->bridgeService = $bridgeService;
    }

    /**
     * Initialize Bridge customer and wallet for user/organization
     */
    public function initializeBridge(Request $request)
    {
        try {
            $user = Auth::user();
            $isOrgUser = in_array($user->role, ['organization', 'organization_pending']);

            if ($isOrgUser) {
                $organization = $user->organization;
                if (!$organization) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Organization not found.',
                    ], 404);
                }
                $entity = $organization;
                $entityType = Organization::class;
            } else {
                $entity = $user;
                $entityType = User::class;
            }

            // Check if already initialized
            $integration = BridgeIntegration::where('integratable_id', $entity->id)
                ->where('integratable_type', $entityType)
                ->first();

            if ($integration && $integration->bridge_customer_id && $integration->bridge_wallet_id) {
                return response()->json([
                    'success' => true,
                    'message' => 'Bridge already initialized',
                    'data' => [
                        'customer_id' => $integration->bridge_customer_id,
                        'wallet_id' => $integration->bridge_wallet_id,
                    ],
                ]);
            }

            DB::beginTransaction();

            try {
                $bridgeCustomerId = null;
                
                // If customer already exists but no wallet, update customer to accept terms
                if ($integration && $integration->bridge_customer_id) {
                    $bridgeCustomerId = $integration->bridge_customer_id;
                    
                    // Update customer to accept terms
                    // Bridge may require multiple field names for terms acceptance
                    $updateData = [
                        'accepted_terms' => true,
                        'terms_accepted' => true,
                        'has_accepted_terms' => true,
                    ];
                    
                    if ($isOrgUser) {
                        $businessName = $organization->name ?? $user->name;
                        $updateData['name'] = $businessName;
                        $updateData['business_name'] = $businessName;
                    }
                    
                    $updateResult = $this->bridgeService->updateCustomer($bridgeCustomerId, $updateData);
                    
                    if (!$updateResult['success']) {
                        Log::warning('Failed to update Bridge customer terms', [
                            'customer_id' => $bridgeCustomerId,
                            'error' => $updateResult['error'] ?? 'Unknown error',
                        ]);
                        // Continue anyway, might already be accepted
                    }
                } else {
                    // Create new customer in Bridge
                    // Validate required fields first
                    $email = trim($entity->email ?? $user->email ?? '');
                    $name = trim($isOrgUser ? ($organization->name ?? $user->name ?? '') : ($user->name ?? ''));
                    
                    if (empty($email)) {
                        throw new \Exception('Email is required to create Bridge customer');
                    }
                    
                    if (empty($name)) {
                        throw new \Exception('Name is required to create Bridge customer');
                    }
                    
                    // Bridge may require multiple field names for terms acceptance
                    $customerData = [
                        'email' => $email,
                        'name' => $name,
                        'accepted_terms' => true, // Bridge requires terms acceptance
                        'terms_accepted' => true,
                        'has_accepted_terms' => true,
                    ];

                    if ($isOrgUser) {
                        $customerData['type'] = 'business';
                        // For business, use business_name (Bridge API expects this for business type)
                        $businessName = trim($organization->name ?? $user->name ?? $name);
                        $customerData['business_name'] = $businessName;
                        // Remove 'name' field for business as Bridge uses business_name
                        unset($customerData['name']);
                        
                        // Add additional business fields if available
                        if (!empty($organization->phone)) {
                            $customerData['phone'] = $organization->phone;
                        }
                        if (!empty($organization->website)) {
                            $customerData['website'] = $organization->website;
                        }
                    } else {
                        $customerData['type'] = 'individual';
                        // For individual, Bridge might expect first_name and last_name
                        // Try to split name if it contains a space
                        $nameParts = explode(' ', $name, 2);
                        if (count($nameParts) >= 2) {
                            $customerData['first_name'] = $nameParts[0];
                            $customerData['last_name'] = $nameParts[1];
                            unset($customerData['name']); // Remove 'name' if using first_name/last_name
                        }
                        // Add phone if available for individual
                        if (!empty($user->contact_number)) {
                            $customerData['phone'] = $user->contact_number;
                        }
                    }

                    Log::info('Creating Bridge customer', [
                        'is_org_user' => $isOrgUser,
                        'customer_data' => $customerData,
                        'organization_id' => $isOrgUser ? $organization->id : null,
                        'organization_name' => $isOrgUser ? $organization->name : null,
                        'user_name' => $user->name,
                        'raw_name' => $name,
                        'business_name_value' => $isOrgUser ? ($customerData['business_name'] ?? 'NOT SET') : 'N/A',
                    ]);

                    $customerResult = $this->bridgeService->createCustomer($customerData);
                    
                    // Log the response to see what Bridge returns
                    Log::info('Bridge customer creation response', [
                        'success' => $customerResult['success'] ?? false,
                        'customer_id' => $customerResult['data']['id'] ?? $customerResult['data']['customer_id'] ?? null,
                        'response_data' => $customerResult['data'] ?? null,
                        'error' => $customerResult['error'] ?? null,
                    ]);

                    if (!$customerResult['success']) {
                        $errorMsg = $customerResult['error'] ?? 'Failed to create Bridge customer';
                        
                        // If Bridge returned details about missing parameters, include them
                        if (isset($customerResult['response']['missing_parameters']) || 
                            isset($customerResult['response']['invalid_parameters']) ||
                            isset($customerResult['response']['errors'])) {
                            $errorMsg .= ' Response: ' . json_encode($customerResult['response']);
                        }
                        
                        Log::error('Bridge customer creation failed', [
                            'customer_data' => $customerResult['response'] ?? $customerData,
                            'error' => $errorMsg,
                        ]);
                        
                        throw new \Exception($errorMsg);
                    }

                    $bridgeCustomerId = $customerResult['data']['id'] ?? $customerResult['data']['customer_id'] ?? null;

                    if (!$bridgeCustomerId) {
                        throw new \Exception('Bridge customer ID not returned');
                    }
                }

                // Create wallet
                $walletResult = $this->bridgeService->createWallet($bridgeCustomerId);

                if (!$walletResult['success']) {
                    throw new \Exception($walletResult['error'] ?? 'Failed to create Bridge wallet');
                }

                $bridgeWalletId = $walletResult['data']['id'] ?? $walletResult['data']['wallet_id'] ?? null;

                if (!$bridgeWalletId) {
                    throw new \Exception('Bridge wallet ID not returned');
                }

                // Save integration
                if (!$integration) {
                    $integration = new BridgeIntegration();
                    $integration->integratable_id = $entity->id;
                    $integration->integratable_type = $entityType;
                }

                $integration->bridge_customer_id = $bridgeCustomerId;
                $integration->bridge_wallet_id = $bridgeWalletId;
                $integration->bridge_metadata = [
                    'customer_data' => $customerResult['data'],
                    'wallet_data' => $walletResult['data'],
                ];
                $integration->save();

                DB::commit();

                return response()->json([
                    'success' => true,
                    'message' => 'Bridge initialized successfully',
                    'data' => [
                        'customer_id' => $bridgeCustomerId,
                        'wallet_id' => $bridgeWalletId,
                    ],
                ]);
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }
        } catch (\Exception $e) {
            Log::error('Bridge initialization error', [
                'user_id' => Auth::id(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            // Check if it's an API key issue
            $errorMessage = $e->getMessage();
            if (str_contains(strtolower($errorMessage), 'invalid credentials') || 
                str_contains(strtolower($errorMessage), 'wrong environment')) {
                $errorMessage = 'Invalid credentials - The API key doesn\'t match the environment. ' .
                               'Please ensure you\'re using the correct API key. ' .
                               'Bridge uses the same base URL (https://api.bridge.xyz/v0) for both sandbox and production. ' .
                               'The difference is in the API key itself. ' .
                               'Check your BRIDGE_API_KEY in .env file and verify it matches your Bridge dashboard environment. ' .
                               'Make sure there are no extra spaces or quotes around the API key.';
            }

            return response()->json([
                'success' => false,
                'message' => 'Failed to initialize Bridge: ' . $errorMessage,
            ], 500);
        }
    }

    /**
     * Check if Bridge wallet is initialized (without fetching balance)
     */
    public function checkBridgeStatus(Request $request)
    {
        try {
            $user = Auth::user();
            $isOrgUser = in_array($user->role, ['organization', 'organization_pending']);

            if ($isOrgUser) {
                $organization = $user->organization;
                if (!$organization) {
                    return response()->json(['success' => false, 'message' => 'Organization not found.'], 404);
                }
                $entity = $organization;
                $entityType = Organization::class;
            } else {
                $entity = $user;
                $entityType = User::class;
            }

            $integration = BridgeIntegration::where('integratable_id', $entity->id)
                ->where('integratable_type', $entityType)
                ->first();

            if (!$integration || !$integration->bridge_wallet_id) {
                return response()->json([
                    'success' => false,
                    'initialized' => false,
                    'message' => 'Bridge wallet not initialized.',
                ], 200); // Return 200 so frontend can handle it gracefully
            }

            return response()->json([
                'success' => true,
                'initialized' => true,
                'customer_id' => $integration->bridge_customer_id,
                'wallet_id' => $integration->bridge_wallet_id,
            ]);
        } catch (\Exception $e) {
            Log::error('Bridge status check error', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'initialized' => false,
                'message' => 'Failed to check Bridge status',
            ], 500);
        }
    }

    /**
     * Get Bridge balance
     */
    public function getBridgeBalance(Request $request)
    {
        try {
            $user = Auth::user();
            $isOrgUser = in_array($user->role, ['organization', 'organization_pending']);

            if ($isOrgUser) {
                $organization = $user->organization;
                if (!$organization) {
                    return response()->json(['success' => false, 'message' => 'Organization not found.'], 404);
                }
                $entity = $organization;
                $entityType = Organization::class;
            } else {
                $entity = $user;
                $entityType = User::class;
            }

            $integration = BridgeIntegration::where('integratable_id', $entity->id)
                ->where('integratable_type', $entityType)
                ->first();

            if (!$integration || !$integration->bridge_wallet_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bridge wallet not initialized. Please initialize first.',
                ], 404);
            }

            // Get wallet to retrieve balance
            $walletResult = $this->bridgeService->getWallet($integration->bridge_customer_id, $integration->bridge_wallet_id);
            
            if (!$walletResult['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $walletResult['error'] ?? 'Failed to fetch wallet',
                ], 500);
            }
            
            // Extract balance from wallet data
            $walletData = $walletResult['data'];
            $balance = $walletData['balance'] ?? $walletData['available_balance'] ?? $walletData['total_balance'] ?? 0;
            $currency = $walletData['currency'] ?? 'USD';
            
            $balanceResult = [
                'success' => true,
                'balance' => (float) $balance,
                'currency' => $currency,
            ];

            if (!$balanceResult['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $balanceResult['error'] ?? 'Failed to fetch balance',
                ], 500);
            }

            return response()->json([
                'success' => true,
                'balance' => $balanceResult['balance'] ?? 0,
                'currency' => $balanceResult['currency'] ?? 'USD',
            ]);
        } catch (\Exception $e) {
            Log::error('Bridge balance error', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'Failed to fetch balance'], 500);
        }
    }

    /**
     * Create KYC link for user
     */
    public function createKYCLink(Request $request)
    {
        try {
            $user = Auth::user();
            $isOrgUser = in_array($user->role, ['organization', 'organization_pending']);

            if ($isOrgUser) {
                $organization = $user->organization;
                if (!$organization) {
                    return response()->json(['success' => false, 'message' => 'Organization not found.'], 404);
                }
                $entity = $organization;
                $entityType = Organization::class;
                $linkType = 'kyb';
            } else {
                $entity = $user;
                $entityType = User::class;
                $linkType = 'kyc';
            }

            $integration = BridgeIntegration::where('integratable_id', $entity->id)
                ->where('integratable_type', $entityType)
                ->first();

            if (!$integration || !$integration->bridge_customer_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bridge customer not initialized. Please initialize first.',
                ], 404);
            }

            $linkResult = $linkType === 'kyb' 
                ? $this->bridgeService->createKYBLink($integration->bridge_customer_id, [
                    'redirect_url' => $request->input('redirect_url', url('/wallet/kyb-callback')),
                ])
                : $this->bridgeService->createKYCLink($integration->bridge_customer_id, [
                    'redirect_url' => $request->input('redirect_url', url('/wallet/kyc-callback')),
                ]);

            if (!$linkResult['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $linkResult['error'] ?? 'Failed to create KYC/KYB link',
                ], 500);
            }

            $linkId = $linkResult['data']['id'] ?? null;
            $linkUrl = $linkResult['data']['url'] ?? $linkResult['data']['link_url'] ?? null;

            if ($linkType === 'kyb') {
                $integration->kyb_link_id = $linkId;
                $integration->kyb_link_url = $linkUrl;
                $integration->kyb_status = 'pending';
            } else {
                $integration->kyc_link_id = $linkId;
                $integration->kyc_link_url = $linkUrl;
                $integration->kyc_status = 'pending';
            }
            $integration->save();

            return response()->json([
                'success' => true,
                'message' => ucfirst($linkType) . ' link created successfully',
                'data' => [
                    'link_id' => $linkId,
                    'link_url' => $linkUrl,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('KYC/KYB link creation error', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'Failed to create link'], 500);
        }
    }

    /**
     * Deposit money using Bridge
     */
    public function deposit(Request $request)
    {
        try {
            $validated = $request->validate([
                'amount' => 'required|numeric|min:0.01',
            ]);

            $user = Auth::user();
            $isOrgUser = in_array($user->role, ['organization', 'organization_pending']);

            if ($isOrgUser) {
                $organization = $user->organization;
                if (!$organization || !$organization->user) {
                    return response()->json(['success' => false, 'message' => 'Organization not found.'], 404);
                }
                $entity = $organization;
                $entityType = Organization::class;
                $orgUser = $organization->user;
            } else {
                $entity = $user;
                $entityType = User::class;
                $orgUser = $user;
            }

            $integration = BridgeIntegration::where('integratable_id', $entity->id)
                ->where('integratable_type', $entityType)
                ->first();

            if (!$integration || !$integration->bridge_wallet_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bridge wallet not initialized. Please initialize first.',
                ], 404);
            }

            // Check KYC/KYB status
            if (!$integration->canTransact()) {
                $requiredType = $isOrgUser ? 'KYB' : 'KYC';
                return response()->json([
                    'success' => false,
                    'message' => "Please complete {$requiredType} verification before making deposits.",
                    'requires_verification' => true,
                    'verification_type' => strtolower($requiredType),
                ], 403);
            }

            $amount = (float) $validated['amount'];

            // Calculate fee
            $fee = 0;
            $feeRecord = WalletFee::getActiveFee('deposit');
            if ($feeRecord) {
                $fee = $feeRecord->calculateFee($amount);
            }

            $totalAmount = $amount + $fee;

            DB::beginTransaction();

            try {
                // Create Bridge transfer for deposit (if Bridge supports internal transfers)
                // For deposits, we might need to use virtual accounts or external transfers
                // For now, we'll add to local balance and create a transaction record
                // In production, you'd create an actual Bridge transfer/deposit
                
                $orgUser->increment('balance', $amount);

                // Record transaction with pending status initially if using Bridge transfers
                $transaction = $orgUser->recordTransaction([
                    'type' => 'deposit',
                    'amount' => $amount,
                    'fee' => $fee,
                    'status' => 'completed', // Set to pending if waiting for Bridge confirmation
                    'payment_method' => 'bridge',
                    'meta' => [
                        'bridge_wallet_id' => $integration->bridge_wallet_id,
                        'bridge_customer_id' => $integration->bridge_customer_id,
                        'organization_id' => $isOrgUser ? $organization->id : null,
                        'deposited_by' => $user->id,
                        // Store transfer ID if Bridge returns one
                        // 'bridge_transfer_id' => $transferId,
                    ],
                    'processed_at' => now(),
                ]);

                DB::commit();

                return response()->json([
                    'success' => true,
                    'message' => 'Deposit successful! $' . number_format($amount, 2) . ' has been added to your wallet.',
                    'data' => [
                        'balance' => (float) $orgUser->balance,
                        'amount' => $amount,
                        'fee' => $fee,
                        'transaction_id' => $transaction->id,
                    ],
                ]);
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }
        } catch (\Exception $e) {
            Log::error('Bridge deposit error', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'Failed to process deposit'], 500);
        }
    }

    /**
     * Send money using Bridge
     */
    public function send(Request $request)
    {
        try {
            $validated = $request->validate([
                'amount' => 'required|numeric|min:0.01',
                'recipient_id' => 'required|string',
            ]);

            $user = Auth::user();
            $isOrgUser = in_array($user->role, ['organization', 'organization_pending']);

            if (!$isOrgUser) {
                return response()->json([
                    'success' => false,
                    'message' => 'This feature is only available for organization users.',
                ], 403);
            }

            $organization = $user->organization;
            if (!$organization || !$organization->user) {
                return response()->json(['success' => false, 'message' => 'Organization not found.'], 404);
            }

            $senderIntegration = BridgeIntegration::where('integratable_id', $organization->id)
                ->where('integratable_type', Organization::class)
                ->first();

            if (!$senderIntegration || !$senderIntegration->bridge_wallet_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bridge wallet not initialized. Please initialize first.',
                ], 404);
            }

            if (!$senderIntegration->canTransact()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Please complete KYB verification before sending money.',
                    'requires_verification' => true,
                    'verification_type' => 'kyb',
                ], 403);
            }

            $amount = (float) $validated['amount'];
            $senderUser = $organization->user;
            $senderBalance = (float) ($senderUser->balance ?? 0);

            // Calculate fee
            $fee = 0;
            $feeRecord = WalletFee::getActiveFee('send');
            if ($feeRecord) {
                $fee = $feeRecord->calculateFee($amount);
            }

            $totalAmount = $amount + $fee;

            if ($senderBalance < $totalAmount) {
                return response()->json([
                    'success' => false,
                    'message' => 'Insufficient balance. Available: $' . number_format($senderBalance, 2),
                ], 400);
            }

            // Parse recipient
            $recipientId = $validated['recipient_id'];
            $recipientType = null;
            $recipientDbId = null;

            if (strpos($recipientId, 'user_') === 0) {
                $recipientType = 'user';
                $recipientDbId = (int) str_replace('user_', '', $recipientId);
                $recipient = User::find($recipientDbId);
            } elseif (strpos($recipientId, 'org_') === 0) {
                $recipientType = 'organization';
                $recipientDbId = (int) str_replace('org_', '', $recipientId);
                $recipient = Organization::find($recipientDbId);
            } else {
                return response()->json(['success' => false, 'message' => 'Invalid recipient ID format.'], 400);
            }

            if (!$recipient) {
                return response()->json(['success' => false, 'message' => 'Recipient not found.'], 404);
            }

            $recipientUser = $recipientType === 'user' ? $recipient : $recipient->user;
            if (!$recipientUser) {
                return response()->json(['success' => false, 'message' => 'Recipient user not found.'], 404);
            }

            // Get recipient Bridge integration if available
            $recipientIntegration = null;
            if ($recipientType === 'user') {
                $recipientIntegration = BridgeIntegration::where('integratable_id', $recipient->id)
                    ->where('integratable_type', User::class)
                    ->first();
            } else {
                $recipientIntegration = BridgeIntegration::where('integratable_id', $recipient->id)
                    ->where('integratable_type', Organization::class)
                    ->first();
            }

            DB::beginTransaction();

            try {
                // Create Bridge transfer if recipient has Bridge wallet
                $bridgeTransferId = null;
                if ($recipientIntegration && $recipientIntegration->bridge_wallet_id) {
                    $transferData = [
                        'from_wallet_id' => $senderIntegration->bridge_wallet_id,
                        'to_wallet_id' => $recipientIntegration->bridge_wallet_id,
                        'amount' => $amount,
                        'currency' => 'USD',
                    ];

                    $transferResult = $this->bridgeService->createTransfer($transferData);
                    
                    if ($transferResult['success']) {
                        $bridgeTransferId = $transferResult['data']['id'] ?? $transferResult['data']['transfer_id'] ?? null;
                    }
                }

                // Deduct from sender
                $senderUser->decrement('balance', $totalAmount);

                // Record sender transaction
                $senderTransaction = $senderUser->recordTransaction([
                    'type' => 'transfer_out',
                    'amount' => $amount,
                    'fee' => $fee,
                    'status' => $bridgeTransferId ? 'pending' : 'completed', // Pending if using Bridge transfer
                    'payment_method' => 'bridge',
                    'related_id' => $recipientDbId,
                    'related_type' => $recipientType === 'user' ? User::class : Organization::class,
                    'meta' => [
                        'bridge_wallet_id' => $senderIntegration->bridge_wallet_id,
                        'bridge_transfer_id' => $bridgeTransferId,
                        'recipient_name' => $recipientType === 'user' ? $recipient->name : $recipient->name,
                        'recipient_type' => $recipientType,
                        'recipient_bridge_wallet_id' => $recipientIntegration->bridge_wallet_id ?? null,
                    ],
                    'processed_at' => $bridgeTransferId ? null : now(), // Set when Bridge confirms
                ]);

                // Add to recipient (if not using Bridge transfer, or after Bridge confirms)
                if (!$bridgeTransferId) {
                    $recipientUser->increment('balance', $amount);
                }

                // Record recipient transaction
                $recipientTransaction = $recipientUser->recordTransaction([
                    'type' => 'transfer_in',
                    'amount' => $amount,
                    'status' => $bridgeTransferId ? 'pending' : 'completed', // Pending if using Bridge transfer
                    'payment_method' => 'bridge',
                    'related_id' => $organization->id,
                    'related_type' => Organization::class,
                    'meta' => [
                        'bridge_wallet_id' => $recipientIntegration->bridge_wallet_id ?? null,
                        'bridge_transfer_id' => $bridgeTransferId,
                        'sender_organization_id' => $organization->id,
                        'sender_organization_name' => $organization->name,
                        'recipient_type' => $recipientType,
                    ],
                    'processed_at' => $bridgeTransferId ? null : now(), // Set when Bridge confirms
                ]);

                DB::commit();

                $senderUser->refresh();
                $recipientUser->refresh();

                return response()->json([
                    'success' => true,
                    'message' => 'Transfer successful!',
                    'data' => [
                        'sender_balance' => (float) $senderUser->balance,
                        'amount' => $amount,
                        'fee' => $fee,
                    ],
                ]);
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }
        } catch (\Exception $e) {
            Log::error('Bridge send error', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'Failed to process transfer'], 500);
        }
    }

    /**
     * Handle KYC callback after verification
     * This is called when Bridge redirects user back after KYC completion
     */
    public function kycCallback(Request $request)
    {
        try {
            $linkId = $request->input('link_id') ?? $request->input('id') ?? $request->input('kyc_link_id');
            $status = $request->input('status') ?? $request->input('kyc_status');

            Log::info('KYC Callback received', [
                'link_id' => $linkId,
                'status' => $status,
                'all_params' => $request->all(),
            ]);

            if ($linkId) {
                $integration = BridgeIntegration::where('kyc_link_id', $linkId)->first();
                if ($integration) {
                    $integration->kyc_status = $this->normalizeStatus($status);
                    $integration->save();

                    Log::info('KYC status updated from callback', [
                        'integration_id' => $integration->id,
                        'status' => $integration->kyc_status,
                    ]);
                }
            }

            // Redirect to billing page or dashboard
            if (Auth::check()) {
                return redirect('/settings/billing')->with('success', 'KYC verification status updated!');
            } else {
                return redirect('/login')->with('info', 'Please login to view your verification status');
            }
        } catch (\Exception $e) {
            Log::error('KYC callback error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            
            if (Auth::check()) {
                return redirect('/settings/billing')->with('error', 'Error processing KYC callback');
            } else {
                return redirect('/login');
            }
        }
    }

    /**
     * Handle KYB callback after verification
     * This is called when Bridge redirects user back after KYB completion
     */
    public function kybCallback(Request $request)
    {
        try {
            $linkId = $request->input('link_id') ?? $request->input('id') ?? $request->input('kyb_link_id');
            $status = $request->input('status') ?? $request->input('kyb_status');

            Log::info('KYB Callback received', [
                'link_id' => $linkId,
                'status' => $status,
                'all_params' => $request->all(),
            ]);

            if ($linkId) {
                $integration = BridgeIntegration::where('kyb_link_id', $linkId)->first();
                if ($integration) {
                    $integration->kyb_status = $this->normalizeStatus($status);
                    $integration->save();

                    Log::info('KYB status updated from callback', [
                        'integration_id' => $integration->id,
                        'status' => $integration->kyb_status,
                    ]);
                }
            }

            // Redirect to billing page or dashboard
            if (Auth::check()) {
                return redirect('/settings/billing')->with('success', 'KYB verification status updated!');
            } else {
                return redirect('/login')->with('info', 'Please login to view your verification status');
            }
        } catch (\Exception $e) {
            Log::error('KYB callback error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            
            if (Auth::check()) {
                return redirect('/settings/billing')->with('error', 'Error processing KYB callback');
            } else {
                return redirect('/login');
            }
        }
    }

    /**
     * Get webhook events for a specific webhook
     */
    public function getWebhookEvents(Request $request, string $webhookId)
    {
        try {
            $result = $this->bridgeService->getWebhookEvents($webhookId);

            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $result['error'] ?? 'Failed to fetch webhook events',
                ], $result['status'] ?? 500);
            }

            return response()->json([
                'success' => true,
                'data' => $result['data'],
            ]);
        } catch (\Exception $e) {
            Log::error('Get webhook events error', [
                'webhook_id' => $webhookId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch webhook events',
            ], 500);
        }
    }

    /**
     * Get a specific webhook event by ID
     */
    public function getWebhookEvent(Request $request, string $webhookId, string $eventId)
    {
        try {
            $result = $this->bridgeService->getWebhookEvent($webhookId, $eventId);

            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $result['error'] ?? 'Failed to fetch webhook event',
                ], $result['status'] ?? 500);
            }

            return response()->json([
                'success' => true,
                'data' => $result['data'],
            ]);
        } catch (\Exception $e) {
            Log::error('Get webhook event error', [
                'webhook_id' => $webhookId,
                'event_id' => $eventId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch webhook event',
            ], 500);
        }
    }

    /**
     * Normalize status value
     */
    private function normalizeStatus(?string $status): string
    {
        if (!$status) {
            return 'pending';
        }

        $status = strtolower($status);
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
}

