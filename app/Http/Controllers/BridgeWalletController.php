<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Organization;
use App\Models\BridgeIntegration;
use App\Models\BridgeWallet;
use App\Models\BridgeKycKybSubmission;
use App\Models\VerificationDocument;
use App\Models\AdminSetting;
use App\Models\WalletFee;
use App\Models\Transaction;
use App\Models\LiquidationAddress;
use App\Services\BridgeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class BridgeWalletController extends Controller
{
    protected BridgeService $bridgeService;

    public function __construct(BridgeService $bridgeService)
    {
        $this->bridgeService = $bridgeService;
    }

    public function initializeBridge(Request $request)
    {
        try {
            $user = Auth::user();
            $isOrgUser = $user->hasRole(['organization', 'organization_pending']);

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
            $integration = BridgeIntegration::with('primaryWallet')
                ->where('integratable_id', $entity->id)
                ->where('integratable_type', $entityType)
                ->first();

            // If fully initialized, return existing data
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

            // If KYC link exists but not completed, return existing links
            if ($integration && $integration->kyc_link_id) {
                return response()->json([
                    'success' => true,
                    'message' => 'Please complete verification',
                    'data' => [
                        'customer_id' => $integration->bridge_customer_id,
                        'kyc_link_id' => $integration->kyc_link_id,
                        'tos_link' => $integration->tos_link_url,
                        'kyc_link' => $integration->kyc_link_url,
                        'kyc_status' => $integration->kyc_status,
                        'requires_verification' => true,
                    ],
                ]);
            }

            DB::beginTransaction();

            try {
                // Get required fields
                $email = trim($entity->email ?? $user->email ?? '');
                $fullName = $isOrgUser
                    ? trim($organization->name ?? $user->name ?? '')
                    : trim($user->name ?? '');

                if (empty($email)) {
                    throw new \Exception('Email is required');
                }

                if (empty($fullName)) {
                    throw new \Exception('Name is required');
                }

                // Create KYC Link - Bridge's recommended approach
                $kycLinkData = [
                    'full_name' => $fullName,
                    'email' => $email,
                    'type' => $isOrgUser ? 'business' : 'individual',
                ];

                Log::info('Creating Bridge KYC Link', [
                    'is_org_user' => $isOrgUser,
                    'kyc_link_data' => $kycLinkData,
                ]);

                $kycLinkResult = $this->bridgeService->createKYCLink($kycLinkData);

                if (!$kycLinkResult['success']) {
                    throw new \Exception($kycLinkResult['error'] ?? 'Failed to create KYC Link');
                }

                $response = $kycLinkResult['data'];
                
                // Log if we're using an existing link
                if (isset($kycLinkResult['is_existing']) && $kycLinkResult['is_existing']) {
                    Log::info('Using existing Bridge KYC Link', [
                        'kyc_link_id' => $response['id'] ?? null,
                        'customer_id' => $response['customer_id'] ?? null,
                        'email' => $response['email'] ?? null,
                    ]);
                }

                // Save integration
                if (!$integration) {
                    $integration = new BridgeIntegration();
                    $integration->integratable_id = $entity->id;
                    $integration->integratable_type = $entityType;
                }

                $integration->bridge_customer_id = $response['customer_id'] ?? null;
                $integration->kyc_link_id = $response['id'] ?? null;
                $integration->kyc_link_url = $response['kyc_link'] ?? null;
                $integration->tos_link_url = $response['tos_link'] ?? null;
                // Use Bridge's actual status values
                $integration->kyc_status = $response['kyc_status'] ?? 'not_started';
                $integration->tos_status = $response['tos_status'] ?? 'pending'; // ToS uses 'pending' or 'approved'
                $integration->bridge_metadata = [
                    'kyc_link_response' => $response,
                    'type' => $isOrgUser ? 'business' : 'individual',
                ];
                $integration->save();

                DB::commit();

                // Convert KYC link to widget URL for iframe embedding
                $kycWidgetUrl = null;
                if ($integration->kyc_link_url) {
                    $kycWidgetUrl = $this->bridgeService->convertKycLinkToWidgetUrl($integration->kyc_link_url);
                }

                return response()->json([
                    'success' => true,
                    'message' => 'Please complete verification',
                    'data' => [
                        'customer_id' => $integration->bridge_customer_id,
                        'kyc_link_id' => $integration->kyc_link_id,
                        'tos_link' => $integration->tos_link_url,  // User visits this FIRST
                        'kyc_link' => $integration->kyc_link_url,  // Original redirect link
                        'kyc_widget_url' => $kycWidgetUrl,  // Widget URL for iframe
                        'kyc_status' => $integration->kyc_status,
                        'tos_status' => $integration->tos_status,
                        'requires_verification' => true,
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
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to initialize Bridge: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Create wallet after KYC is approved
     */
    public function createWalletAfterKYC(Request $request)
    {
        try {
            $user = Auth::user();
            $isOrgUser = $user->hasRole(['organization', 'organization_pending']);

            $entity = $isOrgUser ? $user->organization : $user;
            $entityType = $isOrgUser ? Organization::class : User::class;

            $integration = BridgeIntegration::with('primaryWallet')
                ->where('integratable_id', $entity->id)
                ->where('integratable_type', $entityType)
                ->first();

            if (!$integration || !$integration->bridge_customer_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Please initialize Bridge first.',
                ], 404);
            }

            // Check KYC/KYB status
            $isApproved = false;
            if ($isOrgUser) {
                // For businesses, check KYB status
                $isApproved = $integration->kyb_status === 'approved';
                if (!$isApproved) {
                    return response()->json([
                        'success' => false,
                        'message' => 'KYB must be approved before creating wallet.',
                        'kyb_status' => $integration->kyb_status,
                    ], 403);
                }
            } else {
                // For individuals, check KYC status
                $isApproved = $integration->kyc_status === 'approved';
                if (!$isApproved) {
                return response()->json([
                    'success' => false,
                    'message' => 'KYC must be approved before creating wallet.',
                    'kyc_status' => $integration->kyc_status,
                ], 403);
                }
            }

            // Check if we're in sandbox mode
            $isSandbox = $this->bridgeService->isSandbox();

            // Check if wallet/virtual account already exists
            if ($isSandbox) {
                // In sandbox, first check Bridge API for existing virtual accounts
                // IMPORTANT: Each customer must have their own virtual account
                $customerId = $integration->bridge_customer_id;
                
                Log::info('Checking for existing virtual accounts for customer', [
                    'customer_id' => $customerId,
                    'integration_id' => $integration->id,
                    'integratable_id' => $integration->integratable_id,
                    'integratable_type' => $integration->integratable_type,
                ]);
                
                $virtualAccountsResult = $this->bridgeService->getVirtualAccounts($customerId);
                
                Log::info('Virtual accounts retrieval result', [
                    'customer_id' => $customerId,
                    'success' => $virtualAccountsResult['success'] ?? false,
                    'has_data' => !empty($virtualAccountsResult['data']),
                    'data_structure' => isset($virtualAccountsResult['data']) ? gettype($virtualAccountsResult['data']) : 'null',
                    'data_keys' => isset($virtualAccountsResult['data']) && is_array($virtualAccountsResult['data']) ? array_keys($virtualAccountsResult['data']) : [],
                    'full_response' => $virtualAccountsResult,
                ]);
                
                if ($virtualAccountsResult['success'] && !empty($virtualAccountsResult['data'])) {
                    // Handle Bridge API response structure: { count: X, data: [...], pagination_token: ... }
                    $responseData = $virtualAccountsResult['data'];
                    $virtualAccounts = [];
                    
                    if (isset($responseData['data']) && is_array($responseData['data'])) {
                        // Response has 'data' key containing array
                        $virtualAccounts = $responseData['data'];
                        Log::info('Extracted virtual accounts from response.data', [
                            'count' => count($virtualAccounts),
                            'first_item_keys' => !empty($virtualAccounts) && is_array($virtualAccounts[0]) ? array_keys($virtualAccounts[0]) : [],
                        ]);
                    } elseif (is_array($responseData) && isset($responseData[0])) {
                        // Response is directly an array
                        $virtualAccounts = $responseData;
                        Log::info('Using response as direct array', [
                            'count' => count($virtualAccounts),
                        ]);
                    } else {
                        Log::warning('Unexpected response structure for virtual accounts', [
                            'response_data' => $responseData,
                            'response_data_type' => gettype($responseData),
                        ]);
                    }
                    
                    // Ensure we have valid virtual accounts array
                    if (empty($virtualAccounts) || !is_array($virtualAccounts)) {
                        Log::warning('No valid virtual accounts found in response', [
                            'virtual_accounts' => $virtualAccounts,
                            'virtual_accounts_type' => gettype($virtualAccounts),
                            'response_data' => $responseData,
                        ]);
                    }
                    
                    // Filter only activated virtual accounts from Bridge
                    $activatedVirtualAccounts = array_filter($virtualAccounts, function($va) {
                        return isset($va['status']) && strtolower($va['status']) === 'activated';
                    });
                    
                    // Re-index array after filtering
                    $activatedVirtualAccounts = array_values($activatedVirtualAccounts);
                    
                    Log::info('Filtered activated virtual accounts', [
                        'total_virtual_accounts' => count($virtualAccounts),
                        'activated_count' => count($activatedVirtualAccounts),
                        'activated_statuses' => array_map(function($va) {
                            return $va['status'] ?? 'no_status';
                        }, $virtualAccounts),
                    ]);
                    
                    // If activated virtual accounts exist in Bridge, use the first one
                    // IMPORTANT: Verify this virtual account belongs to this customer
                    if (!empty($activatedVirtualAccounts) && is_array($activatedVirtualAccounts)) {
                        $existingVirtualAccount = $activatedVirtualAccounts[0]; // Use first activated virtual account
                        $virtualAccountId = $existingVirtualAccount['id'] ?? null;
                        $virtualAccountCustomerId = $existingVirtualAccount['customer_id'] ?? null;
                        
                        // CRITICAL: Verify virtual account belongs to this customer
                        if ($virtualAccountCustomerId && $virtualAccountCustomerId !== $customerId) {
                            Log::error('VIRTUAL ACCOUNT CUSTOMER MISMATCH - Using wrong customer virtual account!', [
                                'expected_customer_id' => $customerId,
                                'virtual_account_customer_id' => $virtualAccountCustomerId,
                                'virtual_account_id' => $virtualAccountId,
                                'integration_id' => $integration->id,
                            ]);
                            // Don't use this virtual account - create a new one instead
                            $existingVirtualAccount = null;
                            $virtualAccountId = null;
                        } else {
                            Log::info('Using activated virtual account for customer', [
                                'customer_id' => $customerId,
                                'virtual_account_id' => $virtualAccountId,
                                'virtual_account_customer_id' => $virtualAccountCustomerId,
                                'status' => $existingVirtualAccount['status'] ?? null,
                                'has_destination' => isset($existingVirtualAccount['destination']),
                                'destination_keys' => isset($existingVirtualAccount['destination']) && is_array($existingVirtualAccount['destination']) 
                                    ? array_keys($existingVirtualAccount['destination']) 
                                    : [],
                                'full_virtual_account' => $existingVirtualAccount,
                            ]);
                        }
                        
                        if ($virtualAccountId && $existingVirtualAccount) {
                            // Check if we already have this in our database
                            // IMPORTANT: Also verify it belongs to this integration/customer
                            $existingWallet = BridgeWallet::where('bridge_integration_id', $integration->id)
                                ->where('bridge_customer_id', $customerId)
                                ->where('virtual_account_id', $virtualAccountId)
                                ->first();
                            
                            Log::info('Checking existing wallet in database', [
                                'customer_id' => $customerId,
                                'integration_id' => $integration->id,
                                'virtual_account_id' => $virtualAccountId,
                                'found_existing_wallet' => $existingWallet !== null,
                                'existing_wallet_customer_id' => $existingWallet ? $existingWallet->bridge_customer_id : null,
                            ]);
                            
                            if (!$existingWallet) {
                                // Store in bridge_wallets table if not already stored
                                // Extract destination details from Bridge response
                                $destination = $existingVirtualAccount['destination'] ?? [];
                                $destinationAddress = $destination['address'] ?? null;
                                $destinationChain = $destination['payment_rail'] ?? 'ethereum';
                                $destinationCurrency = $destination['currency'] ?? 'usdc';
                                
                                // Validate that we have valid virtual account data before saving
                                if (empty($existingVirtualAccount) || !is_array($existingVirtualAccount)) {
                                    Log::error('Cannot save empty or invalid virtual account data', [
                                        'virtual_account_id' => $virtualAccountId,
                                        'existing_virtual_account' => $existingVirtualAccount,
                                        'existing_virtual_account_type' => gettype($existingVirtualAccount),
                                    ]);
                                    throw new \Exception('Invalid virtual account data received from Bridge API');
                                }
                                
                                Log::info('Creating BridgeWallet record', [
                                    'virtual_account_id' => $virtualAccountId,
                                    'destination_address' => $destinationAddress,
                                    'destination_chain' => $destinationChain,
                                    'destination_currency' => $destinationCurrency,
                                    'virtual_account_details_type' => gettype($existingVirtualAccount),
                                    'virtual_account_details_empty' => empty($existingVirtualAccount),
                                    'virtual_account_details_keys' => is_array($existingVirtualAccount) ? array_keys($existingVirtualAccount) : [],
                                    'virtual_account_details_count' => is_array($existingVirtualAccount) ? count($existingVirtualAccount) : 0,
                                ]);
                                
                                $existingWallet = BridgeWallet::create([
                                    'bridge_integration_id' => $integration->id,
                                    'bridge_customer_id' => $integration->bridge_customer_id,
                                    'bridge_wallet_id' => null,
                                    'wallet_address' => $destinationAddress,
                                    'chain' => $destinationChain,
                                    'status' => 'active',
                                    'balance' => 0,
                                    'currency' => strtoupper($destinationCurrency), // Convert usdc to USDC
                                    'virtual_account_id' => $virtualAccountId,
                                    'virtual_account_details' => $existingVirtualAccount, // Store full virtual account data
                                    'is_primary' => true,
                                    'last_balance_sync' => now(),
                                ]);
                                
                                // Refresh to get the actual saved data
                                $existingWallet->refresh();
                                
                                Log::info('BridgeWallet created successfully', [
                                    'wallet_id' => $existingWallet->id,
                                    'virtual_account_id' => $existingWallet->virtual_account_id,
                                    'virtual_account_details_saved' => !empty($existingWallet->virtual_account_details),
                                    'virtual_account_details_type' => gettype($existingWallet->virtual_account_details),
                                    'virtual_account_details_is_array' => is_array($existingWallet->virtual_account_details),
                                    'virtual_account_details_count' => is_array($existingWallet->virtual_account_details) ? count($existingWallet->virtual_account_details) : 0,
                                    'virtual_account_details_keys' => is_array($existingWallet->virtual_account_details) ? array_keys($existingWallet->virtual_account_details) : [],
                                ]);
                                
                                // Mark as primary and update others
                                BridgeWallet::where('bridge_integration_id', $integration->id)
                                    ->where('id', '!=', $existingWallet->id)
                                    ->update(['is_primary' => false]);
                            }
                            
                            // Return existing virtual account from Bridge
                            return response()->json([
                                'success' => true,
                                'message' => 'Virtual account already exists',
                                'data' => [
                                    'wallet_id' => $existingWallet->id,
                                    'virtual_account' => $existingVirtualAccount,
                                    'virtual_account_id' => $virtualAccountId,
                                    'address' => $existingWallet->wallet_address,
                                    'is_sandbox' => true,
                                ],
                            ]);
                        }
                    }
                }
                
                // Also check local database as fallback, but verify status is activated in Bridge
                $existingWallet = BridgeWallet::where('bridge_integration_id', $integration->id)
                    ->whereNotNull('virtual_account_id')
                    ->where('is_primary', true)
                    ->where('status', 'active')
                    ->first();

                if ($existingWallet && $existingWallet->virtual_account_id) {
                    // Verify the virtual account is still activated in Bridge
                    $verifyResult = $this->bridgeService->getVirtualAccount(
                        $integration->bridge_customer_id,
                        $existingWallet->virtual_account_id
                    );
                    
                    // Only return if status is activated in Bridge
                    if ($verifyResult['success'] && isset($verifyResult['data']['status']) && 
                        strtolower($verifyResult['data']['status']) === 'activated') {
                        // Update local record with latest Bridge data
                        $existingWallet->virtual_account_details = $verifyResult['data'];
                        $existingWallet->save();
                        
                        return response()->json([
                            'success' => true,
                            'message' => 'Virtual account already exists',
                            'data' => [
                                'wallet_id' => $existingWallet->id,
                                'virtual_account' => $verifyResult['data'],
                                'virtual_account_id' => $existingWallet->virtual_account_id,
                                'address' => $existingWallet->wallet_address,
                                'is_sandbox' => true,
                            ],
                        ]);
                    }
                }
            } else {
                // In production, first check Bridge API for existing wallets
                $walletsResult = $this->bridgeService->getWallets($integration->bridge_customer_id);
                
                if ($walletsResult['success'] && !empty($walletsResult['data'])) {
                    $wallets = is_array($walletsResult['data']) && isset($walletsResult['data']['data'])
                        ? $walletsResult['data']['data']
                        : (is_array($walletsResult['data']) ? $walletsResult['data'] : []);
                    
                    // If wallets exist in Bridge, use the first one
                    if (!empty($wallets) && is_array($wallets)) {
                        $existingBridgeWallet = $wallets[0]; // Use first wallet
                        $bridgeWalletId = $existingBridgeWallet['id'] ?? null;
                        
                        if ($bridgeWalletId) {
                            // Check if we already have this in our database
                            $existingWallet = BridgeWallet::where('bridge_integration_id', $integration->id)
                                ->where('bridge_wallet_id', $bridgeWalletId)
                                ->first();
                            
                            if (!$existingWallet) {
                                // Store in bridge_wallets table if not already stored
                                $existingWallet = BridgeWallet::create([
                                    'bridge_integration_id' => $integration->id,
                                    'bridge_customer_id' => $integration->bridge_customer_id,
                                    'bridge_wallet_id' => $bridgeWalletId,
                                    'wallet_address' => $existingBridgeWallet['address'] ?? null,
                                    'chain' => $existingBridgeWallet['chain'] ?? 'solana',
                                    'status' => 'active',
                                    'balance' => 0,
                                    'currency' => 'USD',
                                    'is_primary' => true,
                                    'wallet_metadata' => $existingBridgeWallet,
                                    'last_balance_sync' => now(),
                                ]);
                                
                                // Mark as primary and update others
                                BridgeWallet::where('bridge_integration_id', $integration->id)
                                    ->where('id', '!=', $existingWallet->id)
                                    ->update(['is_primary' => false]);
                                
                                // Update integration for backward compatibility
                                $integration->bridge_wallet_id = $bridgeWalletId;
                                $integration->wallet_address = $existingBridgeWallet['address'] ?? null;
                                $integration->wallet_chain = $existingBridgeWallet['chain'] ?? 'solana';
                                $integration->save();
                            }
                            
                            // Return existing wallet from Bridge
                            return response()->json([
                                'success' => true,
                                'message' => 'Wallet already exists',
                                'data' => [
                                    'wallet_id' => $existingWallet->id,
                                    'bridge_wallet_id' => $bridgeWalletId,
                                    'address' => $existingWallet->wallet_address,
                                    'chain' => $existingWallet->chain,
                                ],
                            ]);
                        }
                    }
                }
                
                // Also check local database as fallback
                $existingWallet = BridgeWallet::where('bridge_integration_id', $integration->id)
                    ->whereNotNull('bridge_wallet_id')
                    ->where('is_primary', true)
                    ->first();

                if ($existingWallet && $existingWallet->bridge_wallet_id) {
                    // Wallet already exists locally, return it
                    return response()->json([
                        'success' => true,
                        'message' => 'Wallet already exists',
                        'data' => [
                            'wallet_id' => $existingWallet->id,
                            'bridge_wallet_id' => $existingWallet->bridge_wallet_id,
                            'address' => $existingWallet->wallet_address,
                            'chain' => $existingWallet->chain,
                        ],
                    ]);
                }

                // Also check integration's bridge_wallet_id for backward compatibility
            if ($integration->bridge_wallet_id) {
                return response()->json([
                    'success' => true,
                    'message' => 'Wallet already exists',
                        'data' => [
                            'wallet_id' => $integration->bridge_wallet_id,
                            'bridge_wallet_id' => $integration->bridge_wallet_id,
                            'address' => $integration->wallet_address,
                        ],
                ]);
            }
            }

            // No existing wallet/virtual account found, create new one
            // In sandbox mode, create virtual account instead of wallet
            if ($isSandbox) {
                // Create virtual account for sandbox mode
                // IMPORTANT: Each customer gets their own unique virtual account
                $customerId = $integration->bridge_customer_id;
                
                Log::info('Creating new virtual account for customer', [
                    'customer_id' => $customerId,
                    'integration_id' => $integration->id,
                    'integratable_id' => $integration->integratable_id,
                    'integratable_type' => $integration->integratable_type,
                ]);
                
                $virtualAccountResult = $this->bridgeService->createVirtualAccount(
                    $customerId, // CRITICAL: Use customer-specific ID
                    ['currency' => 'usd'],
                    [
                        'payment_rail' => 'ethereum',
                        'currency' => 'usdc',
                        'address' => $this->bridgeService->generateEthereumAddress(), // Generate unique address per customer
                    ]
                );
                
                Log::info('Virtual account creation API call made', [
                    'customer_id' => $customerId,
                    'api_success' => $virtualAccountResult['success'] ?? false,
                    'virtual_account_id' => $virtualAccountResult['data']['id'] ?? null,
                    'virtual_account_customer_id' => $virtualAccountResult['data']['customer_id'] ?? null,
                ]);

                if (!$virtualAccountResult['success']) {
                    Log::error('Failed to create virtual account', [
                        'error' => $virtualAccountResult['error'] ?? 'Unknown error',
                        'full_result' => $virtualAccountResult,
                    ]);
                    throw new \Exception($virtualAccountResult['error'] ?? 'Failed to create virtual account');
                }

                $virtualAccountData = $virtualAccountResult['data'];
                
                // Validate that we have valid virtual account data
                if (empty($virtualAccountData) || !is_array($virtualAccountData)) {
                    Log::error('Invalid virtual account data received from Bridge API', [
                        'customer_id' => $customerId,
                        'virtual_account_result' => $virtualAccountResult,
                        'virtual_account_data' => $virtualAccountData,
                        'virtual_account_data_type' => gettype($virtualAccountData),
                    ]);
                    throw new \Exception('Invalid virtual account data received from Bridge API');
                }
                
                // CRITICAL: Verify the virtual account belongs to the correct customer
                $virtualAccountCustomerId = $virtualAccountData['customer_id'] ?? null;
                if ($virtualAccountCustomerId && $virtualAccountCustomerId !== $customerId) {
                    Log::error('VIRTUAL ACCOUNT CUSTOMER MISMATCH - Bridge returned wrong customer!', [
                        'expected_customer_id' => $customerId,
                        'virtual_account_customer_id' => $virtualAccountCustomerId,
                        'virtual_account_id' => $virtualAccountData['id'] ?? null,
                        'integration_id' => $integration->id,
                    ]);
                    throw new \Exception("Virtual account customer mismatch: expected {$customerId}, got {$virtualAccountCustomerId}");
                }
                
                Log::info('Virtual account created successfully for customer', [
                    'customer_id' => $customerId,
                    'virtual_account_id' => $virtualAccountData['id'] ?? null,
                    'virtual_account_customer_id' => $virtualAccountCustomerId,
                    'has_destination' => isset($virtualAccountData['destination']),
                    'virtual_account_data_type' => gettype($virtualAccountData),
                    'virtual_account_data_keys' => is_array($virtualAccountData) ? array_keys($virtualAccountData) : [],
                    'virtual_account_data_empty' => empty($virtualAccountData),
                    'virtual_account_data_count' => is_array($virtualAccountData) ? count($virtualAccountData) : 0,
                    'full_virtual_account_data' => $virtualAccountData,
                ]);

                // Extract destination details from Bridge response
                $destination = $virtualAccountData['destination'] ?? [];
                $destinationAddress = $destination['address'] ?? null;
                $destinationChain = $destination['payment_rail'] ?? 'ethereum';
                $destinationCurrency = $destination['currency'] ?? 'usdc';
                
                Log::info('Extracted destination details', [
                    'destination_address' => $destinationAddress,
                    'destination_chain' => $destinationChain,
                    'destination_currency' => $destinationCurrency,
                    'destination_keys' => array_keys($destination),
                ]);

                // Create BridgeWallet record for virtual account in sandbox mode
                // Use virtual_account_id as unique identifier to prevent duplicates
                // IMPORTANT: Store with correct customer_id to ensure customer-specific virtual accounts
                $walletData = [
                    'bridge_integration_id' => $integration->id,
                    'bridge_customer_id' => $customerId, // Use the verified customer ID
                    'bridge_wallet_id' => null, // No wallet ID in sandbox, only virtual account
                    'wallet_address' => $destinationAddress,
                    'chain' => $destinationChain,
                    'status' => 'active',
                    'balance' => 0,
                    'currency' => strtoupper($destinationCurrency), // Convert usdc to USDC
                    'virtual_account_details' => $virtualAccountData, // Store full virtual account data
                    'is_primary' => true,
                    'last_balance_sync' => now(),
                ];
                
                Log::info('Creating/updating BridgeWallet with data', [
                    'virtual_account_id' => $virtualAccountData['id'] ?? null,
                    'virtual_account_details_type' => gettype($virtualAccountData),
                    'virtual_account_details_empty' => empty($virtualAccountData),
                    'wallet_data_keys' => array_keys($walletData),
                ]);
                
                $wallet = BridgeWallet::updateOrCreate(
                    [
                        'bridge_integration_id' => $integration->id,
                        'virtual_account_id' => $virtualAccountData['id'] ?? null,
                    ],
                    $walletData
                );
                
                // Refresh to get the actual saved data
                $wallet->refresh();
                
                Log::info('BridgeWallet saved', [
                    'wallet_id' => $wallet->id,
                    'virtual_account_id' => $wallet->virtual_account_id,
                    'virtual_account_details_saved' => !empty($wallet->virtual_account_details),
                    'virtual_account_details_type' => gettype($wallet->virtual_account_details),
                    'virtual_account_details_is_array' => is_array($wallet->virtual_account_details),
                    'virtual_account_details_count' => is_array($wallet->virtual_account_details) ? count($wallet->virtual_account_details) : 0,
                    'virtual_account_details_keys' => is_array($wallet->virtual_account_details) ? array_keys($wallet->virtual_account_details) : [],
                    'raw_virtual_account_details' => $wallet->getRawOriginal('virtual_account_details') ?? 'null',
                ]);

                // Mark as primary and update others
                if ($wallet->is_primary) {
                    BridgeWallet::where('bridge_integration_id', $integration->id)
                        ->where('id', '!=', $wallet->id)
                        ->update(['is_primary' => false]);
                }

                // Also store in integration metadata for backward compatibility
                $integrationMetadata = $integration->bridge_metadata ?? [];
                if (!is_array($integrationMetadata)) {
                    $integrationMetadata = is_string($integrationMetadata) ? json_decode($integrationMetadata, true) : [];
                }
                $integrationMetadata['virtual_account'] = $virtualAccountData;
                $integration->bridge_metadata = $integrationMetadata;
                $integration->save();

                Log::info('Virtual account created in sandbox mode and saved to bridge_wallets', [
                    'integration_id' => $integration->id,
                    'wallet_id' => $wallet->id,
                    'virtual_account_id' => $virtualAccountData['id'] ?? null,
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Virtual account created successfully',
                    'data' => [
                        'wallet_id' => $wallet->id,
                        'virtual_account' => $virtualAccountData,
                        'virtual_account_id' => $virtualAccountData['id'] ?? null,
                        'address' => $wallet->wallet_address,
                        'is_sandbox' => true,
                    ],
                ]);
            }

            // Production mode: Create wallet with chain parameter
            $chain = $request->input('chain', 'solana');
            $walletResult = $this->bridgeService->createWallet(
                $integration->bridge_customer_id,
                $chain
            );

            if (!$walletResult['success']) {
                throw new \Exception($walletResult['error'] ?? 'Failed to create wallet');
            }

            $walletData = $walletResult['data'];

            // Update integration for backward compatibility
            $integration->bridge_wallet_id = $walletData['id'] ?? null;
            $integration->wallet_address = $walletData['address'] ?? null;
            $integration->wallet_chain = $chain;
            $integration->save();

            // Create BridgeWallet record
            $wallet = BridgeWallet::updateOrCreate(
                [
                    'bridge_integration_id' => $integration->id,
                    'bridge_wallet_id' => $walletData['id'] ?? null,
                ],
                [
                    'bridge_customer_id' => $integration->bridge_customer_id,
                    'wallet_address' => $walletData['address'] ?? null,
                    'chain' => $chain,
                    'status' => 'active',
                    'balance' => 0,
                    'currency' => 'USD',
                    'is_primary' => true,
                    'wallet_metadata' => $walletData,
                    'last_balance_sync' => now(),
                ]
            );

            // If this is the first wallet, mark it as primary and update others
            if ($wallet->is_primary) {
                BridgeWallet::where('bridge_integration_id', $integration->id)
                    ->where('id', '!=', $wallet->id)
                    ->update(['is_primary' => false]);
            }

            // Automatically create virtual account for the wallet
            $virtualAccountData = null;
            try {
                if ($chain === 'solana' || $chain === 'ethereum' || $chain === 'usd' || $chain === 'USD') {
                    // Create virtual account for chain wallet or USD account
                    if ($chain === 'usd' || $chain === 'USD') {
                        $virtualAccountResult = $this->bridgeService->createVirtualAccountForWallet(
                            $integration->bridge_customer_id,
                            $walletData['id'] ?? null,
                            'USD'
                        );
                    } else {
                        $virtualAccountResult = $this->bridgeService->createVirtualAccountForChainWallet(
                            $integration->bridge_customer_id,
                            $walletData['id'] ?? null,
                            $chain
                        );
                    }

                    if ($virtualAccountResult['success'] && isset($virtualAccountResult['data'])) {
                        $virtualAccountData = $virtualAccountResult['data'];
                        
                        // Update wallet record with virtual account info
                        $wallet->virtual_account_id = $virtualAccountData['id'] ?? null;
                        $wallet->virtual_account_details = $virtualAccountData;
                        $wallet->save();

                        Log::info('Virtual account created automatically', [
                            'wallet_id' => $wallet->id,
                            'virtual_account_id' => $virtualAccountData['id'] ?? null,
                        ]);
                    } else {
                        Log::warning('Failed to create virtual account automatically', [
                            'wallet_id' => $wallet->id,
                            'error' => $virtualAccountResult['error'] ?? 'Unknown error',
                        ]);
                    }
                }
            } catch (\Exception $e) {
                // Don't fail wallet creation if virtual account creation fails
                Log::warning('Error creating virtual account automatically', [
                    'wallet_id' => $wallet->id,
                    'error' => $e->getMessage(),
                ]);
            }

            Log::info('Wallet created successfully', [
                'integration_id' => $integration->id,
                'wallet_id' => $wallet->id,
                'bridge_wallet_id' => $walletData['id'] ?? null,
                'address' => $walletData['address'] ?? null,
                'chain' => $chain,
                'virtual_account_created' => $virtualAccountData !== null,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Wallet and virtual account created successfully',
                'data' => [
                    'wallet_id' => $wallet->id,
                    'bridge_wallet_id' => $integration->bridge_wallet_id,
                    'address' => $integration->wallet_address,
                    'chain' => $chain,
                    'virtual_account' => $virtualAccountData,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Wallet creation error', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to create wallet: ' . $e->getMessage(),
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
            $isOrgUser = $user->hasRole(['organization', 'organization_pending']);

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

            $integration = BridgeIntegration::with('primaryWallet')
                ->where('integratable_id', $entity->id)
                ->where('integratable_type', $entityType)
                ->first();

            // If no integration or no customer ID, Bridge is not initialized
            // But return organization data for pre-filling the form
            $organizationData = null;
            if ($isOrgUser && $organization) {
                $organizationData = [
                    'business_name' => $organization->name,
                    'email' => $organization->email ?? $user->email,
                    'ein' => $organization->ein,
                    'phone' => $organization->phone,
                    'website' => $organization->website,
                    'street_line_1' => $organization->street,
                    'city' => $organization->city,
                    'state' => $organization->state,
                    'postal_code' => $organization->zip,
                    'country' => 'USA',
                ];
            }
            
            if (!$integration || !$integration->bridge_customer_id) {
                return response()->json([
                    'success' => false,
                    'initialized' => false,
                    'message' => 'Bridge wallet not initialized.',
                    'organization_data' => $organizationData, // Include organization data for pre-filling
                ], 200); // Return 200 so frontend can handle it gracefully
            }

            // Customer exists, so Bridge is initialized (even if wallet doesn't exist yet)
            // Wallet is created after KYC approval
            $isOrgUser = $user->hasRole(['organization', 'organization_pending']);
            $needsVerification = $isOrgUser
                ? ($integration->kyb_status !== 'approved')
                : ($integration->kyc_status !== 'approved');

            // Check TOS status from Bridge API via customer endorsements
            $tosStatusFromBridge = $integration->tos_status ?? 'pending';
            $tosAcceptedFromBridge = false;

            try {
                $customerResult = $this->bridgeService->getCustomer($integration->bridge_customer_id);
                if ($customerResult['success'] && isset($customerResult['data'])) {
                    $customer = $customerResult['data'];
                    $endorsements = $customer['endorsements'] ?? [];

                    // Check if terms_of_service is in "complete" requirements
                    foreach ($endorsements as $endorsement) {
                        $complete = $endorsement['requirements']['complete'] ?? [];
                        if (in_array('terms_of_service_v1', $complete) || in_array('terms_of_service_v2', $complete)) {
                            $tosAcceptedFromBridge = true;
                            $tosStatusFromBridge = 'accepted';
                            break;
                        }
                    }

                    // If not found in complete, check missing requirements
                    if (!$tosAcceptedFromBridge) {
                        foreach ($endorsements as $endorsement) {
                            $missing = $endorsement['requirements']['missing'] ?? [];
                            if (in_array('terms_of_service_v1', $missing) || in_array('terms_of_service_v2', $missing)) {
                                $tosStatusFromBridge = 'pending';
                                break;
                            }
                        }
                    }

                    // Update local database if Bridge status differs
                    if ($tosAcceptedFromBridge && $integration->tos_status !== 'accepted') {
                        $integration->tos_status = 'accepted';
                        $integration->save();
                    }
                }
            } catch (\Exception $e) {
                Log::warning('Failed to check TOS status from Bridge', [
                    'error' => $e->getMessage(),
                    'customer_id' => $integration->bridge_customer_id,
                ]);
                // Continue with local status if Bridge check fails
            }

            // Convert KYC/KYB links to widget URLs for iframe embedding
            $kycWidgetUrl = null;
            $kybWidgetUrl = null;
            if ($integration->kyc_link_url) {
                $kycWidgetUrl = $this->bridgeService->convertKycLinkToWidgetUrl($integration->kyc_link_url);
            }
            if ($integration->kyb_link_url) {
                $kybWidgetUrl = $this->bridgeService->convertKycLinkToWidgetUrl($integration->kyb_link_url);
            }

            // Determine KYB step progress for multi-step flow
            $kybStep = 'control_person'; // Default to step 1
            $controlPersonKycLink = null;
            $controlPersonKycIframeUrl = null;
            $hasBusinessDocuments = false; // Initialize for use in return statement
            
            if ($isOrgUser) {
                // Check if control person has been submitted
                $submission = BridgeKycKybSubmission::where('bridge_integration_id', $integration->id)
                    ->where('type', 'kyb')
                    ->latest()
                    ->first();
                
                if ($submission) {
                    // Check if control person data exists (from new control_persons table)
                    $hasControlPerson = $submission->controlPerson()->exists();
                    
                    // Check if business documents exist (check VerificationDocument table)
                    $hasBusinessDocuments = false;
                    $businessDocs = $submission->verificationDocuments()
                        ->whereIn('document_type', ['business_formation', 'business_ownership', 'proof_of_address', 'proof_of_nature_of_business'])
                        ->exists();
                    $hasBusinessDocuments = $businessDocs;
                    
                    // If not found in submission, check Bridge API (for direct mode)
                    if (!$hasBusinessDocuments) {
                        try {
                            $customerResult = $this->bridgeService->getCustomer($integration->bridge_customer_id);
                            if ($customerResult['success'] && isset($customerResult['data']['documents'])) {
                                $documents = $customerResult['data']['documents'] ?? [];
                                $hasBusinessDocuments = !empty($documents);
                            }
                        } catch (\Exception $e) {
                            // Bridge API check failed, will check metadata below
                        }
                    }
                    
                    // If still not found, check metadata (fallback)
                    if (!$hasBusinessDocuments) {
                        $metadata = $integration->bridge_metadata ?? [];
                        if (is_string($metadata)) {
                            $metadata = json_decode($metadata, true) ?? [];
                        }
                        $hasBusinessDocuments = !empty($metadata['business_documents_submitted'] ?? false);
                    }
                    
                    // Determine current step
                    // Check submission status - show KYC verification step if approved OR if KYC link exists (awaiting UBO verification)
                    // Bridge KYC/KYB statuses: not_started, incomplete, under_review, awaiting_questionnaire, awaiting_ubo, approved, rejected, paused, offboarded
                    $submissionStatus = $submission->submission_status ?? 'not_started';
                    $isApproved = in_array($submissionStatus, ['approved']); // Only 'approved' means fully approved
                    
                    // Check if we have a KYC link in associated_persons table (control person)
                    $controlPersonKycLink = null;
                    $controlPersonKycIframeUrl = null;
                    
                    // First, try to get from associated_persons table (control person)
                    if ($hasControlPerson) {
                        $controlPerson = $submission->controlPerson;
                        if ($controlPerson) {
                            // Find the associated person record (control person is also an associated person)
                            // Try by bridge_associated_person_id first, then by email
                            $associatedPerson = null;
                            if ($controlPerson->bridge_associated_person_id) {
                                $associatedPerson = $submission->associatedPersons()
                                    ->where('bridge_associated_person_id', $controlPerson->bridge_associated_person_id)
                                    ->first();
                            }
                            
                            // If not found by ID, try by email
                            if (!$associatedPerson && $controlPerson->email) {
                                $associatedPerson = $submission->associatedPersons()
                                    ->where('email', $controlPerson->email)
                                    ->first();
                            }
                            
                            if ($associatedPerson) {
                                $controlPersonKycLink = $associatedPerson->kyc_link;
                                $controlPersonKycIframeUrl = $associatedPerson->iframe_kyc_link;
                            }
                        }
                    }
                    
                    // If not found in associated_persons, try metadata
                    if (!$controlPersonKycLink) {
                        $metadata = $integration->bridge_metadata ?? [];
                        if (is_string($metadata)) {
                            $metadata = json_decode($metadata, true) ?? [];
                        }
                        $controlPersonKycLink = $metadata['control_person_kyc_link'] ?? null;
                    }
                    
                    // Show KYC verification step if:
                    // 1. Documents are approved, OR
                    // 2. We have a KYC link (meaning we're waiting for UBO verification)
                    $hasKycLink = !empty($controlPersonKycLink) || !empty($controlPersonKycIframeUrl);
                    $shouldShowKycStep = $hasControlPerson && $hasBusinessDocuments && ($isApproved || $hasKycLink);
                    
                    if ($shouldShowKycStep) {
                        // Show KYC verification step - we're waiting for UBO verification
                        $kybStep = 'kyc_verification';
                    } elseif ($hasControlPerson && $hasBusinessDocuments) {
                        // Documents submitted but not approved yet and no KYC link - stay on business_documents step
                        $kybStep = 'business_documents';
                    } elseif ($hasControlPerson) {
                        $kybStep = 'business_documents';
                    } else {
                        $kybStep = 'control_person';
                    }
                } else {
                    // Check metadata for step if no submission yet
                    $metadata = $integration->bridge_metadata ?? [];
                    if (is_string($metadata)) {
                        $metadata = json_decode($metadata, true) ?? [];
                    }
                    $kybStep = $metadata['kyb_step'] ?? 'control_person';
                    $controlPersonKycLink = $metadata['control_person_kyc_link'] ?? null;
                    $controlPersonKycIframeUrl = null; // Initialize
                    // Check if business documents were submitted (from metadata)
                    $hasBusinessDocuments = !empty($metadata['business_documents_submitted'] ?? false);
                }
            }

            // Convert control person KYC link to iframe URL if available (only if not already set from associated_persons)
            if ($controlPersonKycLink && !$controlPersonKycIframeUrl) {
                $controlPersonKycIframeUrl = $this->bridgeService->convertKycLinkToWidgetUrl($controlPersonKycLink);
            }

            // Also check submission data for iframe URL (from AdminKybVerificationController) - as fallback
            if ($isOrgUser && isset($submission) && !$controlPersonKycIframeUrl) {
                $submissionData = $submission->submission_data ?? [];
                if (is_string($submissionData)) {
                    $submissionData = json_decode($submissionData, true) ?? [];
                }
                if (isset($submissionData['iframe_kyc_link']) && !empty($submissionData['iframe_kyc_link'])) {
                    $controlPersonKycIframeUrl = $submissionData['iframe_kyc_link'];
                }
                if (isset($submissionData['kyc_link']) && !empty($submissionData['kyc_link']) && !$controlPersonKycLink) {
                    $controlPersonKycLink = $submissionData['kyc_link'];
                    if (!$controlPersonKycIframeUrl) {
                        $controlPersonKycIframeUrl = $this->bridgeService->convertKycLinkToWidgetUrl($controlPersonKycLink);
                    }
                }
            }

            // Get requested fields from submission if admin requested re-fill
            $requestedFields = null;
            $refillMessage = null;
            if ($isOrgUser && isset($submission)) {
                $submissionData = $submission->submission_data ?? [];
                if (is_string($submissionData)) {
                    $submissionData = json_decode($submissionData, true) ?? [];
                }
                if (isset($submissionData['requested_fields']) && is_array($submissionData['requested_fields']) && !empty($submissionData['requested_fields'])) {
                    $requestedFields = $submissionData['requested_fields'];
                    $refillMessage = $submissionData['refill_message'] ?? null;
                }
            }

            // Get wallet address from primary wallet if exists, otherwise from integration
            $walletAddress = $integration->wallet_address;
            $primaryWallet = $integration->primaryWallet;
            
            // Check if we're in sandbox mode
            $isSandbox = $this->bridgeService->isSandbox();
            
            if ($primaryWallet) {
                // Priority 1: Get address from primary wallet
                if ($primaryWallet->wallet_address) {
                    $walletAddress = $primaryWallet->wallet_address;
                } elseif ($isSandbox && $primaryWallet->virtual_account_id) {
                    // In sandbox mode, if we have virtual account but no wallet_address, extract from virtual_account_details
                    $virtualAccountDetails = $primaryWallet->virtual_account_details;
                    if (is_string($virtualAccountDetails)) {
                        $virtualAccountDetails = json_decode($virtualAccountDetails, true) ?? [];
                    }
                    if (is_array($virtualAccountDetails) && isset($virtualAccountDetails['destination']['address'])) {
                        $walletAddress = $virtualAccountDetails['destination']['address'];
                        // Update the wallet record with the address for future use
                        $primaryWallet->wallet_address = $walletAddress;
                        $primaryWallet->save();
                    }
                }
            }
            
            // Fallback: try to get from BridgeWallet table if still no address
            if (!$walletAddress) {
                $wallet = BridgeWallet::where('bridge_integration_id', $integration->id)
                    ->where('is_primary', true)
                    ->first();
                if ($wallet) {
                    if ($wallet->wallet_address) {
                        $walletAddress = $wallet->wallet_address;
                    } elseif ($isSandbox && $wallet->virtual_account_id && $wallet->virtual_account_details) {
                        // Extract address from virtual account details
                        $virtualAccountDetails = $wallet->virtual_account_details;
                        if (is_string($virtualAccountDetails)) {
                            $virtualAccountDetails = json_decode($virtualAccountDetails, true) ?? [];
                        }
                        if (is_array($virtualAccountDetails) && isset($virtualAccountDetails['destination']['address'])) {
                            $walletAddress = $virtualAccountDetails['destination']['address'];
                            // Update the wallet record with the address
                            $wallet->wallet_address = $walletAddress;
                            $wallet->save();
                        }
                    }
                }
            }
            
            // Determine has_wallet based on mode
            $hasWallet = false;
            if ($isSandbox) {
                // In sandbox: check for virtual account
                $hasWallet = ($primaryWallet && !empty($primaryWallet->virtual_account_id)) || 
                            (!empty($walletAddress)); // If we have an address, we have a virtual account
            } else {
                // In production: check for actual wallet
                $hasWallet = !empty($integration->bridge_wallet_id) || 
                            ($primaryWallet && !empty($primaryWallet->bridge_wallet_id));
            }

            return response()->json([
                'success' => true,
                'initialized' => true,
                'customer_id' => $integration->bridge_customer_id,
                'wallet_id' => $integration->bridge_wallet_id, // May be null if KYC not approved yet
                'wallet_address' => $walletAddress, // Wallet address for display (from wallet or virtual account)
                'has_wallet' => $hasWallet, // Whether wallet/virtual account exists
                'is_sandbox' => $isSandbox, // Indicate if we're in sandbox mode
                'kyc_status' => $integration->kyc_status,
                'kyb_status' => $integration->kyb_status,
                'tos_status' => $tosStatusFromBridge,
                'tos_accepted' => $tosAcceptedFromBridge,
                'tos_link' => $integration->tos_link_url,
                'kyc_link' => $integration->kyc_link_url,
                'kyb_link' => $integration->kyb_link_url,
                'kyc_widget_url' => $kycWidgetUrl,
                'kyb_widget_url' => $kybWidgetUrl,
                'requires_verification' => $needsVerification || empty($integration->bridge_wallet_id),
                'verification_type' => $isOrgUser ? 'kyb' : 'kyc',
                'organization_data' => $organizationData, // Always include organization data for pre-filling
                'kyb_step' => $isOrgUser ? $kybStep : null, // Current step for KYB multi-step flow
                'control_person_kyc_link' => $isOrgUser ? $controlPersonKycLink : null, // KYC link for control person
                'control_person_kyc_iframe_url' => $isOrgUser ? $controlPersonKycIframeUrl : null, // Iframe URL for control person KYC
                'kyb_submission_status' => $isOrgUser && isset($submission) ? $submission->submission_status : null, // Submission status for checking approval
                'business_documents_submitted' => $isOrgUser ? $hasBusinessDocuments : false, // Whether business documents have been submitted
                'document_statuses' => $isOrgUser && isset($submission) ? $this->getDocumentStatuses($submission) : null, // Document approval/rejection statuses from VerificationDocument table
                'requested_fields' => $requestedFields, // Fields that admin requested to be re-filled
                'refill_message' => $refillMessage, // Message from admin about what needs to be re-filled
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
            $isOrgUser = $user->hasRole(['organization', 'organization_pending']);

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

            $integration = BridgeIntegration::with('primaryWallet')
                ->where('integratable_id', $entity->id)
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
            $isOrgUser = $user->hasRole(['organization', 'organization_pending']);

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

            $integration = BridgeIntegration::with('primaryWallet')
                ->where('integratable_id', $entity->id)
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
            $linkUrl = $linkResult['data']['url'] ?? $linkResult['data']['link_url'] ?? $linkResult['data']['kyc_link'] ?? null;

            // Convert to widget URL for iframe embedding
            $widgetUrl = null;
            if ($linkUrl) {
                $widgetUrl = $this->bridgeService->convertKycLinkToWidgetUrl($linkUrl);
            }

            if ($linkType === 'kyb') {
                $integration->kyb_link_id = $linkId;
                $integration->kyb_link_url = $linkUrl;
                // Bridge KYB statuses: not_started, incomplete, under_review, awaiting_questionnaire, awaiting_ubo, approved, rejected, paused, offboarded
                $integration->kyb_status = 'not_started';
            } else {
                $integration->kyc_link_id = $linkId;
                $integration->kyc_link_url = $linkUrl;
                // Bridge KYC statuses: not_started, incomplete, under_review, awaiting_questionnaire, approved, rejected, paused, offboarded
                $integration->kyc_status = 'not_started';
            }
            $integration->save();

            return response()->json([
                'success' => true,
                'message' => ucfirst($linkType) . ' link created successfully',
                'data' => [
                    'link_id' => $linkId,
                    'link_url' => $linkUrl,
                    'widget_url' => $widgetUrl, // Widget URL for iframe
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('KYC/KYB link creation error', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'Failed to create link'], 500);
        }
    }

    /**
     * Get Terms of Service link for custom KYC
     */
    public function getTosLink(Request $request)
    {
        try {
            $user = Auth::user();
            $isOrgUser = $user->hasRole(['organization', 'organization_pending']);

            if ($isOrgUser) {
                $organization = $user->organization;
                if (!$organization) {
                    return response()->json(['success' => false, 'message' => 'Organization not found.'], 404);
                }
                $entity = $organization;
                $entityType = Organization::class;
                $email = $organization->email ?? $user->email;
            } else {
                $entity = $user;
                $entityType = User::class;
                $email = $user->email;
            }

            if (empty($email)) {
                return response()->json(['success' => false, 'message' => 'Email is required.'], 400);
            }

            // Get or create integration
            $integration = BridgeIntegration::with('primaryWallet')
                ->where('integratable_id', $entity->id)
                ->where('integratable_type', $entityType)
                ->first();

            if (!$integration) {
                $integration = new BridgeIntegration();
                $integration->integratable_id = $entity->id;
                $integration->integratable_type = $entityType;
            }

            // Check if refresh is requested - if so, always fetch a new TOS link
            $refresh = $request->query('refresh') === '1' || $request->query('refresh') === 'true';
            
            // Check if TOS is already accepted
            if ($integration->tos_status === 'accepted' && !$refresh) {
                // TOS already accepted, return existing TOS link if available, or return success
                // But only if refresh is not requested
                return response()->json([
                    'success' => true,
                    'data' => [
                        'tos_url' => $integration->tos_link_url,
                        'tos_link_id' => $integration->bridge_metadata['tos_link_id'] ?? null,
                        'already_accepted' => true,
                        'tos_status' => 'accepted',
                    ],
                ]);
            }

            // Always get a fresh TOS link (especially if refresh is requested)
            // This ensures we use the latest redirect_uri from .env
            // Get redirect URI for callback - use BRIDGE_REDIRECT_URI from environment
            // IMPORTANT: For local development, browsers block redirects from public domains (Bridge) to localhost
            // Set BRIDGE_REDIRECT_URI in .env to a public URL (e.g., ngrok) for local development
            // Example: BRIDGE_REDIRECT_URI=https://your-ngrok-url.ngrok.io
            
            // ============================================
            // ALWAYS USE APP_URL as redirect_uri (user requirement)
            // ============================================
            $appUrl = env('APP_URL') ?? config('app.url');
            
            Log::info('Bridge TOS: Using APP_URL as redirect_uri', [
                'app_url' => $appUrl,
                'customer_id' => $integration->bridge_customer_id,
                'entity_id' => $entity->id,
                'entity_type' => $entityType,
            ]);
            
            // Always construct redirect_uri from APP_URL
            $redirectUri = rtrim($appUrl, '/') . '/wallet/tos-callback';
            
            // Add customer_id to redirect URI so we can identify the user in callback
            // This helps when session is not available
            if ($integration->bridge_customer_id) {
                $separator = strpos($redirectUri, '?') !== false ? '&' : '?';
                $redirectUri .= $separator . 'customer_id=' . urlencode($integration->bridge_customer_id);
                Log::info('Bridge TOS: Added customer_id to redirect_uri', [
                    'redirect_uri' => $redirectUri,
                    'customer_id' => $integration->bridge_customer_id,
                ]);
            }

            Log::info('Bridge TOS: Calling Bridge API getTosLink', [
                'email' => $email,
                'redirect_uri' => $redirectUri,
            ]);
            
            $result = $this->bridgeService->getTosLink($email, $redirectUri);

            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $result['error'] ?? 'Failed to get TOS link',
                ], 500);
            }

            // Save TOS link to database
            $tosUrl = $result['data']['url'] ?? null;
            $tosLinkId = $result['data']['id'] ?? null;

            if ($tosUrl) {
                // Always update the TOS link URL to ensure it has the latest redirect_uri
                $integration->tos_link_url = $tosUrl;
                
                // Extract redirect_uri from the TOS URL to log it
                $urlParts = parse_url($tosUrl);
                $redirectUriFromUrl = null;
                if (isset($urlParts['query'])) {
                    parse_str($urlParts['query'], $queryParams);
                    $redirectUriFromUrl = $queryParams['redirect_uri'] ?? null;
                }
                
                Log::info('Bridge TOS: Saved fresh TOS link to database', [
                    'tos_url' => $tosUrl,
                    'redirect_uri_from_url' => $redirectUriFromUrl ? urldecode($redirectUriFromUrl) : 'not found in URL',
                    'redirect_uri_used' => $redirectUri ?? 'null',
                ]);

                // Extract customer_id from TOS URL if present (Bridge includes it in the URL)
                $metadata = $integration->bridge_metadata ?? [];
                if ($tosLinkId) {
                    $metadata['tos_link_id'] = $tosLinkId;
                }

                // Parse TOS URL to extract customer_id
                $urlParts = parse_url($tosUrl);
                if (isset($urlParts['query'])) {
                    parse_str($urlParts['query'], $queryParams);
                    if (isset($queryParams['customer_id'])) {
                        $metadata['tos_customer_id'] = $queryParams['customer_id'];
                        // Also update bridge_customer_id if not set
                        if (!$integration->bridge_customer_id) {
                            $integration->bridge_customer_id = $queryParams['customer_id'];
                        }
                    }
                }

                $integration->bridge_metadata = $metadata;
                $integration->save();
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'tos_url' => $tosUrl,
                    'tos_link_id' => $tosLinkId,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('TOS link error', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'Failed to get TOS link'], 500);
        }
    }

    /**
     * Handle TOS callback (redirect from Bridge)
     */
    public function tosCallback(Request $request)
    {
        try {
            $signedAgreementId = $request->input('signed_agreement_id') ?? $request->query('signed_agreement_id');

            if (!$signedAgreementId) {
                if ($request->expectsJson() || $request->isMethod('POST')) {
                    return response()->json(['success' => false, 'message' => 'TOS acceptance failed'], 400);
                }
                if ($request->isMethod('GET')) {
                    return response()->view('bridge.tos-callback', [
                        'signedAgreementId' => '',
                        'success' => false,
                        'error' => 'TOS acceptance failed. No signed_agreement_id received.',
                    ]);
                }
                return redirect('/wallet')->with('error', 'TOS acceptance failed');
            }

            $user = Auth::user();
            $integration = null;
            $entity = null;
            $entityType = null;

            if ($user) {
                $isOrgUser = $user->hasRole(['organization', 'organization_pending']);

                if ($isOrgUser) {
                    $organization = $user->organization;
                    if ($organization) {
                        $entity = $organization;
                        $entityType = Organization::class;
                    }
                } else {
                    $entity = $user;
                    $entityType = User::class;
                }

                if ($entity) {
                    $integration = BridgeIntegration::where('integratable_id', $entity->id)
                        ->where('integratable_type', $entityType)
                        ->first();
                }
            }

            // Fallback: Find by customer_id (but ONLY if it exists in Bridge)
            $customerId = $request->input('customer_id') ?? $request->query('customer_id');
            if (!$integration && $customerId) {
                // FIRST verify the customer actually exists in Bridge before using it
                $customerExistsInBridge = false;
                try {
                    $verifyResult = $this->bridgeService->getCustomer($customerId);
                    $customerExistsInBridge = $verifyResult['success'];
                } catch (\Exception $e) {
                    Log::warning('TOS callback: Failed to verify customer from request exists in Bridge', [
                        'customer_id' => $customerId,
                        'error' => $e->getMessage(),
                    ]);
                }
                
                // Only use customer_id from request if it actually exists in Bridge
                if ($customerExistsInBridge) {
                    $integration = BridgeIntegration::where('bridge_customer_id', $customerId)->first();
                    
                    // If still not found, try to get customer from Bridge and match by email
                    if (!$integration) {
                        try {
                            $customerResult = $this->bridgeService->getCustomer($customerId);
                            if ($customerResult['success'] && isset($customerResult['data']['email'])) {
                                $customerEmail = $customerResult['data']['email'];
                                
                                // Try to find integration by matching email with organization or user
                                // First try organization
                                $organization = \App\Models\Organization::where('email', $customerEmail)->first();
                                if ($organization) {
                                    $integration = BridgeIntegration::where('integratable_id', $organization->id)
                                        ->where('integratable_type', Organization::class)
                                        ->first();
                                    
                                    // If integration exists but doesn't have customer_id, update it
                                    if ($integration && !$integration->bridge_customer_id) {
                                        $integration->bridge_customer_id = $customerId;
                                        $integration->save();
                                    }
                                }
                                
                                // If still not found, try user
                                if (!$integration) {
                                    $userByEmail = \App\Models\User::where('email', $customerEmail)->first();
                                    if ($userByEmail) {
                                        $integration = BridgeIntegration::where('integratable_id', $userByEmail->id)
                                            ->where('integratable_type', \App\Models\User::class)
                                            ->first();
                                        
                                        // If integration exists but doesn't have customer_id, update it
                                        if ($integration && !$integration->bridge_customer_id) {
                                            $integration->bridge_customer_id = $customerId;
                                            $integration->save();
                                        }
                                    }
                                }
                            }
                        } catch (\Exception $e) {
                            Log::warning('TOS callback: Failed to fetch customer from Bridge', [
                                'customer_id' => $customerId,
                                'error' => $e->getMessage(),
                            ]);
                        }
                    }
                } else {
                    // Customer ID from request doesn't exist in Bridge - ignore it
                    Log::warning('TOS callback: Customer ID from request does not exist in Bridge, ignoring it', [
                        'customer_id' => $customerId,
                        'signed_agreement_id' => $signedAgreementId,
                    ]);
                    $customerId = null; // Clear it so it's not used later
                }
            }

            // Fallback: Find by signed_agreement_id in metadata
            if (!$integration && $signedAgreementId) {
                // Try JSON contains first
                $integration = BridgeIntegration::whereJsonContains('bridge_metadata->signed_agreement_id', $signedAgreementId)->first();
                
                // Alternative: Search in metadata as string (for older records)
                if (!$integration) {
                    $integrations = BridgeIntegration::whereNotNull('bridge_metadata')->get();
                    foreach ($integrations as $int) {
                        $metadata = $int->bridge_metadata ?? [];
                        if (isset($metadata['signed_agreement_id']) && $metadata['signed_agreement_id'] === $signedAgreementId) {
                            $integration = $int;
                            break;
                        }
                    }
                }
                
                // If still not found, try to get customer_id from Bridge by searching for customer with this signed_agreement_id
                if (!$integration && $signedAgreementId) {
                    Log::info('TOS callback: Searching Bridge for customer with signed_agreement_id', [
                        'signed_agreement_id' => $signedAgreementId,
                    ]);
                    
                    try {
                        // List all customers from Bridge and find the one with matching signed_agreement_id
                        $customersResult = $this->bridgeService->getCustomers();
                        
                        if ($customersResult['success'] && isset($customersResult['data'])) {
                            $customers = $customersResult['data'];
                            
                            // Handle both array and object responses
                            if (isset($customers['data']) && is_array($customers['data'])) {
                                $customers = $customers['data'];
                            } elseif (!is_array($customers)) {
                                $customers = [$customers];
                            }
                            
                            foreach ($customers as $customer) {
                                $customerSignedAgreementId = $customer['signed_agreement_id'] ?? null;
                                
                                if ($customerSignedAgreementId === $signedAgreementId) {
                                    $foundCustomerId = $customer['id'] ?? null;
                                    
                                    if ($foundCustomerId) {
                                        Log::info('TOS callback: Found customer in Bridge by signed_agreement_id', [
                                            'customer_id' => $foundCustomerId,
                                            'signed_agreement_id' => $signedAgreementId,
                                        ]);
                                        
                                        // Now find integration by customer_id
                                        $integration = BridgeIntegration::where('bridge_customer_id', $foundCustomerId)->first();
                                        
                                        // If integration found but doesn't have customer_id, update it
                                        if ($integration && !$integration->bridge_customer_id) {
                                            $integration->bridge_customer_id = $foundCustomerId;
                                            $integration->save();
                                        }
                                        
                                        // If still no integration, try to find by email
                                        if (!$integration && isset($customer['email'])) {
                                            $customerEmail = $customer['email'];
                                            
                                            // Try organization first
                                            $organization = \App\Models\Organization::where('email', $customerEmail)->first();
                                            if ($organization) {
                                                $integration = BridgeIntegration::where('integratable_id', $organization->id)
                                                    ->where('integratable_type', Organization::class)
                                                    ->first();
                                                
                                                if ($integration) {
                                                    $integration->bridge_customer_id = $foundCustomerId;
                                                    $integration->save();
                                                }
                                            }
                                            
                                            // Try user if not found
                                            if (!$integration) {
                                                $userByEmail = \App\Models\User::where('email', $customerEmail)->first();
                                                if ($userByEmail) {
                                                    $integration = BridgeIntegration::where('integratable_id', $userByEmail->id)
                                                        ->where('integratable_type', \App\Models\User::class)
                                                        ->first();
                                                    
                                                    if ($integration) {
                                                        $integration->bridge_customer_id = $foundCustomerId;
                                                        $integration->save();
                                                    }
                                                }
                                            }
                                        }
                                        
                                        break;
                                    }
                                }
                            }
                        }
                    } catch (\Exception $e) {
                        Log::warning('TOS callback: Failed to search Bridge for customer by signed_agreement_id', [
                            'signed_agreement_id' => $signedAgreementId,
                            'error' => $e->getMessage(),
                        ]);
                    }
                }
            }
            
            // Last resort: If we have customer_id (and it exists in Bridge), 
            // try to find any integration that might be related (check all integrations)
            // NOTE: $customerId is only set if it exists in Bridge (from previous check)
            if (!$integration && $customerId) {
                // Check if there's only one integration - might be the one we need
                $integrationCount = BridgeIntegration::count();
                if ($integrationCount === 1) {
                    $integration = BridgeIntegration::first();
                    // Only update if missing or if existing one doesn't exist in Bridge
                    if ($integration) {
                        $shouldUpdate = false;
                        $oldCustomerId = $integration->bridge_customer_id;
                        
                        if (!$oldCustomerId) {
                            // No customer_id, safe to update
                            $shouldUpdate = true;
                        } else {
                            // Verify existing customer_id still exists in Bridge
                            try {
                                $oldCustomerResult = $this->bridgeService->getCustomer($oldCustomerId);
                                if (!$oldCustomerResult['success']) {
                                    // Old customer doesn't exist, safe to update
                                    $shouldUpdate = true;
                                    Log::info('TOS callback: Existing customer_id no longer exists in Bridge, updating', [
                                        'old_customer_id' => $oldCustomerId,
                                        'new_customer_id' => $customerId,
                                    ]);
                                } else {
                                    // Old customer exists, don't overwrite
                                    Log::info('TOS callback: Existing customer_id still valid, not overwriting', [
                                        'existing_customer_id' => $oldCustomerId,
                                        'requested_customer_id' => $customerId,
                                    ]);
                                }
                            } catch (\Exception $e) {
                                // Error checking, be conservative and don't update
                                Log::warning('TOS callback: Error verifying existing customer_id', [
                                    'old_customer_id' => $oldCustomerId,
                                    'error' => $e->getMessage(),
                                ]);
                            }
                        }
                        
                        if ($shouldUpdate) {
                            Log::info('TOS callback: Using single integration and updating customer_id', [
                                'integration_id' => $integration->id,
                                'old_customer_id' => $oldCustomerId,
                                'new_customer_id' => $customerId,
                            ]);
                            $integration->bridge_customer_id = $customerId;
                            $integration->save();
                        }
                    }
                } else {
                    // If multiple integrations, try to find the most recent one without a customer_id
                    $integration = BridgeIntegration::whereNull('bridge_customer_id')
                        ->orWhere('bridge_customer_id', '')
                        ->latest()
                        ->first();
                    
                    if ($integration) {
                        Log::info('TOS callback: Found integration without customer_id and updating it', [
                            'integration_id' => $integration->id,
                            'customer_id' => $customerId,
                        ]);
                        $integration->bridge_customer_id = $customerId;
                        $integration->save();
                    }
                }
            }
            
            // Final fallback: If we still don't have integration but have signed_agreement_id,
            // and there's only one integration, use it (likely the correct one)
            if (!$integration && $signedAgreementId) {
                $integrationCount = BridgeIntegration::count();
                if ($integrationCount === 1) {
                    $integration = BridgeIntegration::first();
                    Log::info('TOS callback: Using single integration as final fallback', [
                        'integration_id' => $integration->id,
                        'signed_agreement_id' => $signedAgreementId,
                        'existing_customer_id' => $integration->bridge_customer_id,
                    ]);
                    
                    // If integration doesn't have customer_id, try to get it from Bridge using signed_agreement_id
                    if (!$integration->bridge_customer_id) {
                        try {
                            $customersResult = $this->bridgeService->getCustomers();
                            
                            if ($customersResult['success'] && isset($customersResult['data'])) {
                                $customers = $customersResult['data'];
                                
                                // Handle both array and object responses
                                if (isset($customers['data']) && is_array($customers['data'])) {
                                    $customers = $customers['data'];
                                } elseif (!is_array($customers)) {
                                    $customers = [$customers];
                                }
                                
                                foreach ($customers as $customer) {
                                    $customerSignedAgreementId = $customer['signed_agreement_id'] ?? null;
                                    
                                    if ($customerSignedAgreementId === $signedAgreementId) {
                                        $foundCustomerId = $customer['id'] ?? null;
                                        
                                        if ($foundCustomerId) {
                                            $integration->bridge_customer_id = $foundCustomerId;
                                            $integration->save();
                                            
                                            Log::info('TOS callback: Updated single integration with customer_id from Bridge', [
                                                'integration_id' => $integration->id,
                                                'customer_id' => $foundCustomerId,
                                            ]);
                                            break;
                                        }
                                    }
                                }
                            }
                        } catch (\Exception $e) {
                            Log::warning('TOS callback: Failed to get customer_id from Bridge for single integration', [
                                'error' => $e->getMessage(),
                            ]);
                        }
                    }
                }
            }

            if (!$integration) {
                // Enhanced logging to help debug
                $allIntegrations = BridgeIntegration::whereNotNull('bridge_customer_id')->get(['id', 'bridge_customer_id', 'integratable_id', 'integratable_type']);
                $customerIds = $allIntegrations->pluck('bridge_customer_id')->toArray();
                
                Log::warning('TOS callback: Cannot find integration', [
                    'signed_agreement_id' => $signedAgreementId,
                    'user_id' => $user->id ?? null,
                    'customer_id' => $customerId,
                    'customer_id_in_request' => $request->input('customer_id') ?? $request->query('customer_id'),
                    'total_integrations' => BridgeIntegration::count(),
                    'integrations_with_customer_id' => count($customerIds),
                    'existing_customer_ids' => $customerIds,
                    'searched_customer_id_exists' => in_array($customerId, $customerIds),
                ]);

                if ($request->isMethod('GET')) {
                    return response()->view('bridge.tos-callback', [
                        'signedAgreementId' => $signedAgreementId,
                        'success' => false,
                        'error' => 'Cannot identify user. Please try accepting TOS again.',
                    ]);
                }
                return response()->json(['success' => false, 'message' => 'Integration not found'], 404);
            }

            // ============================================
            // CRITICAL: Verify customer exists in Bridge before updating
            // ============================================
            $customerIdToUpdate = $integration->bridge_customer_id;
            $customerExists = false;
            
            // If we have a customer_id, verify it exists in Bridge
            if ($customerIdToUpdate) {
                try {
                    $verifyResult = $this->bridgeService->getCustomer($customerIdToUpdate);
                    $customerExists = $verifyResult['success'];
                    
                    if (!$customerExists) {
                        Log::warning('TOS callback: Customer ID in integration does not exist in Bridge', [
                            'integration_id' => $integration->id,
                            'customer_id' => $customerIdToUpdate,
                            'signed_agreement_id' => $signedAgreementId,
                        ]);
                        
                        // Try to find the correct customer by signed_agreement_id
                        if ($signedAgreementId) {
                            try {
                                $customersResult = $this->bridgeService->getCustomers();
                                
                                if ($customersResult['success'] && isset($customersResult['data'])) {
                                    $customers = $customersResult['data'];
                                    
                                    // Handle both array and object responses
                                    if (isset($customers['data']) && is_array($customers['data'])) {
                                        $customers = $customers['data'];
                                    } elseif (!is_array($customers)) {
                                        $customers = [$customers];
                                    }
                                    
                                    foreach ($customers as $customer) {
                                        $customerSignedAgreementId = $customer['signed_agreement_id'] ?? null;
                                        
                                        if ($customerSignedAgreementId === $signedAgreementId) {
                                            $foundCustomerId = $customer['id'] ?? null;
                                            
                                            if ($foundCustomerId) {
                                                Log::info('TOS callback: Found correct customer by signed_agreement_id, updating integration', [
                                                    'integration_id' => $integration->id,
                                                    'old_customer_id' => $customerIdToUpdate,
                                                    'new_customer_id' => $foundCustomerId,
                                                    'signed_agreement_id' => $signedAgreementId,
                                                ]);
                                                
                                                // Update integration with correct customer_id
                                                $integration->bridge_customer_id = $foundCustomerId;
                                                $integration->save();
                                                
                                                $customerIdToUpdate = $foundCustomerId;
                                                $customerExists = true;
                                                break;
                                            }
                                        }
                                    }
                                }
                            } catch (\Exception $e) {
                                Log::error('TOS callback: Failed to search for customer by signed_agreement_id', [
                                    'error' => $e->getMessage(),
                                    'signed_agreement_id' => $signedAgreementId,
                                ]);
                            }
                        }
                    }
                } catch (\Exception $e) {
                    Log::error('TOS callback: Failed to verify customer exists in Bridge', [
                        'customer_id' => $customerIdToUpdate,
                        'error' => $e->getMessage(),
                    ]);
                }
            } else {
                // No customer_id in integration, try to find by signed_agreement_id
                if ($signedAgreementId) {
                    try {
                        $customersResult = $this->bridgeService->getCustomers();
                        
                        if ($customersResult['success'] && isset($customersResult['data'])) {
                            $customers = $customersResult['data'];
                            
                            // Handle both array and object responses
                            if (isset($customers['data']) && is_array($customers['data'])) {
                                $customers = $customers['data'];
                            } elseif (!is_array($customers)) {
                                $customers = [$customers];
                            }
                            
                            foreach ($customers as $customer) {
                                $customerSignedAgreementId = $customer['signed_agreement_id'] ?? null;
                                
                                if ($customerSignedAgreementId === $signedAgreementId) {
                                    $foundCustomerId = $customer['id'] ?? null;
                                    
                                    if ($foundCustomerId) {
                                        Log::info('TOS callback: Found customer by signed_agreement_id for integration without customer_id', [
                                            'integration_id' => $integration->id,
                                            'customer_id' => $foundCustomerId,
                                            'signed_agreement_id' => $signedAgreementId,
                                        ]);
                                        
                                        // Update integration with customer_id
                                        $integration->bridge_customer_id = $foundCustomerId;
                                        $integration->save();
                                        
                                        $customerIdToUpdate = $foundCustomerId;
                                        $customerExists = true;
                                        break;
                                    }
                                }
                            }
                        }
                    } catch (\Exception $e) {
                        Log::error('TOS callback: Failed to find customer by signed_agreement_id', [
                            'error' => $e->getMessage(),
                            'signed_agreement_id' => $signedAgreementId,
                        ]);
                    }
                }
            }
            
            // If we still don't have a valid customer, return error
            if (!$customerIdToUpdate || !$customerExists) {
                Log::error('TOS callback: Cannot find valid customer in Bridge', [
                    'integration_id' => $integration->id,
                    'signed_agreement_id' => $signedAgreementId,
                    'customer_id_in_integration' => $integration->bridge_customer_id,
                ]);
                
                if ($request->isMethod('GET')) {
                    return response()->view('bridge.tos-callback', [
                        'signedAgreementId' => $signedAgreementId,
                        'success' => false,
                        'error' => 'Cannot find customer in Bridge. Please contact support.',
                    ]);
                }
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot find customer in Bridge'
                ], 404);
            }

            // ============================================
            // KEY FIX: Update Bridge customer with signed_agreement_id
            // ============================================
            $updateResult = $this->bridgeService->updateCustomer(
                $customerIdToUpdate,
                [
                    'signed_agreement_id' => $signedAgreementId,
                ]
            );

            if (!$updateResult['success']) {
                Log::error('TOS callback: Failed to update Bridge customer', [
                    'customer_id' => $customerIdToUpdate,
                    'signed_agreement_id' => $signedAgreementId,
                    'error' => $updateResult['error'] ?? 'Unknown error',
                ]);

                if ($request->isMethod('GET')) {
                    return response()->view('bridge.tos-callback', [
                        'signedAgreementId' => $signedAgreementId,
                        'success' => false,
                        'error' => 'Failed to update Bridge: ' . ($updateResult['error'] ?? 'Unknown error'),
                    ]);
                }
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to update Bridge customer'
                ], 500);
            }

            Log::info('TOS callback: Bridge customer updated successfully', [
                'customer_id' => $customerIdToUpdate,
                'signed_agreement_id' => $signedAgreementId,
            ]);

            // ============================================
            // CRITICAL: Fetch FRESH customer data from Bridge API (NO CACHE)
            // ============================================
            Log::info('TOS callback: Fetching FRESH customer data from Bridge API (no cache)', [
                'customer_id' => $customerIdToUpdate,
                'signed_agreement_id' => $signedAgreementId,
            ]);
            
            // Force fresh data - clear any potential cache and fetch directly from Bridge
            $customerResult = $this->bridgeService->getCustomer($customerIdToUpdate);
            
            $tosStatus = 'approved'; // Default
            $hasAcceptedTos = false;
            
            if (!$customerResult['success']) {
                Log::error('TOS callback: Failed to fetch customer from Bridge after TOS acceptance', [
                    'customer_id' => $customerIdToUpdate,
                    'error' => $customerResult['error'] ?? 'Unknown error',
                ]);
                // Still update with signed_agreement_id but mark as warning
                $tosStatus = 'approved';
            } else {
                // Get FRESH TOS status from Bridge response
                $customer = $customerResult['data'];
                $hasAcceptedTos = $customer['has_accepted_terms_of_service'] ?? false;
                $endorsements = $customer['endorsements'] ?? [];
                
                // Check endorsements for TOS status
                $tosAcceptedFromBridge = false;
                $tosStatusFromBridge = 'pending';
                
                if (!empty($endorsements)) {
                    foreach ($endorsements as $endorsement) {
                        $complete = $endorsement['complete'] ?? [];
                        $missing = $endorsement['missing'] ?? [];
                        
                        if (!empty($complete)) {
                            if (in_array('terms_of_service_v1', $complete) || in_array('terms_of_service_v2', $complete)) {
                                $tosAcceptedFromBridge = true;
                                $tosStatusFromBridge = 'accepted';
                            }
                        }
                        
                        if (!$tosAcceptedFromBridge && !empty($missing)) {
                            if (in_array('terms_of_service_v1', $missing) || in_array('terms_of_service_v2', $missing)) {
                                $tosStatusFromBridge = 'pending';
                            }
                        }
                    }
                }
                
                // Use Bridge's has_accepted_terms_of_service as primary source
                if ($hasAcceptedTos) {
                    $tosAcceptedFromBridge = true;
                    $tosStatusFromBridge = 'accepted';
                }
                
                Log::info('TOS callback: FRESH TOS status from Bridge API', [
                    'customer_id' => $integration->bridge_customer_id,
                    'has_accepted_terms_of_service' => $hasAcceptedTos,
                    'tos_accepted_from_endorsements' => $tosAcceptedFromBridge,
                    'tos_status_from_bridge' => $tosStatusFromBridge,
                    'endorsements' => $endorsements,
                    'signed_agreement_id_from_bridge' => $customer['signed_agreement_id'] ?? null,
                ]);
                
                // Update local database with FRESH status from Bridge
                $tosStatus = $tosAcceptedFromBridge ? 'accepted' : $tosStatusFromBridge;
            }

            // Update local database
            // Store signed_agreement_id in bridge_metadata (JSON column), not as a direct column
            $metadata = $integration->bridge_metadata ?? [];
            if (!is_array($metadata)) {
                // Ensure metadata is an array (in case it's stored as JSON string)
                $metadata = is_string($metadata) ? json_decode($metadata, true) : [];
            }
            $metadata['signed_agreement_id'] = $signedAgreementId;
            $metadata['tos_accepted_at'] = now()->toIso8601String();
            
            // Store FRESH customer data from Bridge response
            if (isset($customerResult['data'])) {
                $metadata['tos_callback_customer_data'] = $customerResult['data'];
                $metadata['tos_callback_fetched_at'] = now()->toIso8601String();
            }
            
            $integration->bridge_metadata = $metadata;
            
            // Use update() to ensure proper JSON encoding
            $integration->update([
                'tos_status' => $tosStatus,
                'bridge_metadata' => $metadata,
            ]);

            // Refresh to ensure we have the latest data
            $integration->refresh();

            // Verify the save worked
            $savedMetadata = $integration->bridge_metadata ?? [];
            if (!is_array($savedMetadata)) {
                $savedMetadata = is_string($savedMetadata) ? json_decode($savedMetadata, true) : [];
            }
            
            Log::info('TOS callback: Successfully updated', [
                'integration_id' => $integration->id,
                'tos_status' => $integration->tos_status,
                'signed_agreement_id' => $signedAgreementId,
                'bridge_metadata' => $savedMetadata,
                'metadata_has_signed_agreement_id' => isset($savedMetadata['signed_agreement_id']),
                'saved_signed_agreement_id' => $savedMetadata['signed_agreement_id'] ?? 'NOT FOUND',
            ]);

            if ($request->isMethod('POST')) {
                return response()->json([
                    'success' => true,
                    'signed_agreement_id' => $signedAgreementId,
                ]);
            }

            return response()->view('bridge.tos-callback', [
                'signedAgreementId' => $signedAgreementId,
                'success' => true,
            ]);
        } catch (\Exception $e) {
            Log::error('TOS callback error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            if ($request->isMethod('GET')) {
                return response()->view('bridge.tos-callback', [
                    'signedAgreementId' => $request->input('signed_agreement_id') ?? '',
                    'success' => false,
                    'error' => 'Error processing TOS acceptance.',
                ]);
            }
            return response()->json(['success' => false, 'message' => 'Error'], 500);
        }
    }

    /**
     * Check TOS status from Bridge API via customer endorsements
     */
    public function checkTosStatus(Request $request)
    {
        try {
            $user = Auth::user();
            $isOrgUser = $user->hasRole(['organization', 'organization_pending']);

            if ($isOrgUser) {
                $organization = $user->organization;
                if (!$organization) {
                    return response()->json([
                        'success' => false,
                        'tos_accepted' => false,
                        'message' => 'Organization not found.',
                    ], 404);
                }
                $entity = $organization;
                $entityType = Organization::class;
            } else {
                $entity = $user;
                $entityType = User::class;
            }

            $integration = BridgeIntegration::with('primaryWallet')
                ->where('integratable_id', $entity->id)
                ->where('integratable_type', $entityType)
                ->first();

            if (!$integration || !$integration->bridge_customer_id) {
                return response()->json([
                    'success' => false,
                    'tos_accepted' => false,
                    'message' => 'Customer not created yet',
                ], 200);
            }

            // Get customer from Bridge
            $result = $this->bridgeService->getCustomer($integration->bridge_customer_id);

            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to get customer from Bridge',
                    'error' => $result['error'] ?? 'Unknown error',
                ], 500);
            }

            $customer = $result['data'];
            $endorsements = $customer['endorsements'] ?? [];

            // Check if terms_of_service is in "complete" requirements
            $tosAccepted = false;
            $tosStatus = 'pending';

            // Also check Bridge's has_accepted_terms_of_service flag
            $hasAcceptedFromBridge = $customer['has_accepted_terms_of_service'] ?? false;

            foreach ($endorsements as $endorsement) {
                $complete = $endorsement['requirements']['complete'] ?? [];
                $missing = $endorsement['requirements']['missing'] ?? [];

                // Check if TOS is in complete requirements
                if (in_array('terms_of_service_v1', $complete) || in_array('terms_of_service_v2', $complete)) {
                    $tosAccepted = true;
                    $tosStatus = 'accepted';
                    break;
                }

                // Check if TOS is in missing requirements (nested structure)
                // Bridge returns missing as: { "all_of": ["terms_of_service_v1", ...] }
                if (isset($missing['all_of']) && is_array($missing['all_of'])) {
                    foreach ($missing['all_of'] as $requirement) {
                        if (is_string($requirement) && (strpos($requirement, 'terms_of_service') !== false)) {
                            // TOS is still missing
                            $tosStatus = 'pending';
                            break 2; // Break out of both loops
                        }
                    }
                } elseif (is_array($missing)) {
                    // Handle flat array structure
                    if (in_array('terms_of_service_v1', $missing) || in_array('terms_of_service_v2', $missing)) {
                        $tosStatus = 'pending';
                        break;
                    }
                }
            }

            // Use Bridge's has_accepted_terms_of_service as the source of truth
            if ($hasAcceptedFromBridge) {
                $tosAccepted = true;
                $tosStatus = 'accepted';
            }

            // Update local database to match Bridge's status
            if ($integration->tos_status !== $tosStatus) {
                Log::info('Syncing TOS status from Bridge', [
                    'integration_id' => $integration->id,
                    'old_status' => $integration->tos_status,
                    'new_status' => $tosStatus,
                    'bridge_has_accepted' => $hasAcceptedFromBridge,
                ]);

                $integration->tos_status = $tosStatus;
                $metadata = $integration->bridge_metadata ?? [];
                $metadata['tos_synced_at'] = now()->toIso8601String();
                $metadata['bridge_has_accepted_terms'] = $hasAcceptedFromBridge;
                $integration->bridge_metadata = $metadata;
                $integration->save();
            }

            return response()->json([
                'success' => true,
                'tos_accepted' => $tosAccepted,
                'tos_status' => $tosStatus,
                'bridge_has_accepted_terms_of_service' => $hasAcceptedFromBridge,
                'local_status' => $integration->tos_status,
                'synced' => true,
            ]);
        } catch (\Exception $e) {
            Log::error('Check TOS status error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to check TOS status',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Sync TOS status from Bridge API (force sync)
     */
    public function syncTosStatus(Request $request)
    {
        try {
            $user = Auth::user();
            $isOrgUser = $user->hasRole(['organization', 'organization_pending']);

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

            $integration = BridgeIntegration::with('primaryWallet')
                ->where('integratable_id', $entity->id)
                ->where('integratable_type', $entityType)
                ->first();

            if (!$integration || !$integration->bridge_customer_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Customer not created yet',
                ], 404);
            }

            // Get customer from Bridge
            $result = $this->bridgeService->getCustomer($integration->bridge_customer_id);

            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to get customer from Bridge',
                    'error' => $result['error'] ?? 'Unknown error',
                ], 500);
            }

            $customer = $result['data'];
            $endorsements = $customer['endorsements'] ?? [];
            $hasAcceptedFromBridge = $customer['has_accepted_terms_of_service'] ?? false;

            // Check endorsements for TOS status
            $tosAccepted = false;
            $tosStatus = 'pending';

            foreach ($endorsements as $endorsement) {
                $complete = $endorsement['requirements']['complete'] ?? [];

                // Check if TOS is in complete requirements
                if (in_array('terms_of_service_v1', $complete) || in_array('terms_of_service_v2', $complete)) {
                    $tosAccepted = true;
                    $tosStatus = 'accepted';
                    break;
                }
            }

            // Use Bridge's has_accepted_terms_of_service as the source of truth
            if ($hasAcceptedFromBridge) {
                $tosAccepted = true;
                $tosStatus = 'accepted';
            } else {
                // If not accepted, check if it's in missing
                foreach ($endorsements as $endorsement) {
                    $missing = $endorsement['requirements']['missing'] ?? [];

                    // Check nested missing structure
                    if (isset($missing['all_of']) && is_array($missing['all_of'])) {
                        foreach ($missing['all_of'] as $requirement) {
                            if (is_string($requirement) && (strpos($requirement, 'terms_of_service') !== false)) {
                                $tosStatus = 'pending';
                                break 2;
                            }
                        }
                    }
                }
            }

            // Update local database to match Bridge's status
            $oldStatus = $integration->tos_status;
            $integration->tos_status = $tosStatus;
            $metadata = $integration->bridge_metadata ?? [];
            $metadata['tos_synced_at'] = now()->toIso8601String();
            $metadata['bridge_has_accepted_terms'] = $hasAcceptedFromBridge;
            $integration->bridge_metadata = $metadata;
            $integration->save();

            Log::info('TOS status synced from Bridge', [
                'integration_id' => $integration->id,
                'old_status' => $oldStatus,
                'new_status' => $tosStatus,
                'bridge_has_accepted' => $hasAcceptedFromBridge,
            ]);

            return response()->json([
                'success' => true,
                'tos_accepted' => $tosAccepted,
                'tos_status' => $tosStatus,
                'bridge_has_accepted_terms_of_service' => $hasAcceptedFromBridge,
                'local_status' => $integration->tos_status,
                'synced' => true,
                'message' => $oldStatus !== $tosStatus
                    ? "TOS status updated from '{$oldStatus}' to '{$tosStatus}'"
                    : "TOS status is already in sync: '{$tosStatus}'",
            ]);
        } catch (\Exception $e) {
            Log::error('Sync TOS status error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to sync TOS status',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Create customer with custom KYC data
     */
    public function createCustomerWithKyc(Request $request)
    {
        try {
            $user = Auth::user();
            $isOrgUser = $user->hasRole(['organization', 'organization_pending']);

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

            // Get or create integration
            $integration = BridgeIntegration::with('primaryWallet')
                ->where('integratable_id', $entity->id)
                ->where('integratable_type', $entityType)
                ->first();

            if (!$integration) {
                $integration = new BridgeIntegration();
                $integration->integratable_id = $entity->id;
                $integration->integratable_type = $entityType;
            }

            // Get signed agreement ID (from TOS acceptance)
            // Check multiple sources: request, integration metadata, or TOS status
            $metadata = is_array($integration->bridge_metadata) 
                ? $integration->bridge_metadata 
                : json_decode($integration->bridge_metadata ?? '{}', true);
            
            $signedAgreementId = $request->input('signed_agreement_id') 
                ?? ($metadata['signed_agreement_id'] ?? null);
            
            Log::info('Create customer KYC: Checking signed_agreement_id', [
                'from_request' => $request->input('signed_agreement_id'),
                'from_metadata' => $metadata['signed_agreement_id'] ?? null,
                'tos_status' => $integration->tos_status,
                'metadata_keys' => array_keys($metadata),
                'final_signed_agreement_id' => $signedAgreementId,
            ]);

            // If no signed_agreement_id but TOS status is accepted, try to get it from Bridge
            if (!$signedAgreementId && $integration->tos_status === 'accepted') {
                Log::info('TOS is accepted but signed_agreement_id not found, checking Bridge customer', [
                    'customer_id' => $integration->bridge_customer_id,
                    'tos_status' => $integration->tos_status,
                ]);
                
                // Try to get signed_agreement_id from Bridge customer data
                try {
                    $customerResult = $this->bridgeService->getCustomer($integration->bridge_customer_id);
                    if ($customerResult['success'] && isset($customerResult['data']['signed_agreement_id'])) {
                        $signedAgreementId = $customerResult['data']['signed_agreement_id'];
                        // Save it to metadata for future use
                        $metadata = $integration->bridge_metadata ?? [];
                        $metadata['signed_agreement_id'] = $signedAgreementId;
                        $integration->bridge_metadata = $metadata;
                        $integration->save();
                        
                        Log::info('Retrieved signed_agreement_id from Bridge customer', [
                            'signed_agreement_id' => $signedAgreementId,
                        ]);
                    }
                } catch (\Exception $e) {
                    Log::warning('Failed to get signed_agreement_id from Bridge', [
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            // If still no signed_agreement_id, check if TOS is accepted
            if (!$signedAgreementId) {
                // Check TOS status - if accepted, allow submission (signed_agreement_id might be in Bridge)
                if ($integration->tos_status === 'accepted' || $integration->tos_status === 'approved') {
                    Log::info('TOS is accepted but signed_agreement_id not available, allowing submission without it', [
                        'tos_status' => $integration->tos_status,
                        'customer_id' => $integration->bridge_customer_id,
                        'note' => 'Bridge API may have signed_agreement_id even if not in local DB',
                    ]);
                    // Allow submission to proceed - Bridge API will handle signed_agreement_id if needed
                    // We'll pass null and Bridge will use the customer's existing signed_agreement_id
                } else {
                    return response()->json([
                        'success' => false,
                        'message' => 'Terms of Service must be accepted first. Please accept TOS before submitting KYC data.',
                        'debug' => [
                            'tos_status' => $integration->tos_status,
                            'has_signed_agreement_id' => !empty($metadata['signed_agreement_id'] ?? null),
                            'metadata_keys' => array_keys($metadata),
                        ],
                    ], 400);
                }
            }

            DB::beginTransaction();

            try {
                // Initialize image path variables (used in both KYB and KYC flows)
                $idFrontImagePath = null;
                $idBackImagePath = null;
                
                // Check for step parameter (multi-step KYB flow)
                $step = $request->input('step');
                
                if ($isOrgUser) {
                    // Business customer (KYB) - Multi-step flow
                    if ($step === 'control_person') {
                        // Step 1: Control Person submission only
                        $validated = $request->validate([
                            'business_name' => 'sometimes|string|max:255',
                            'email' => 'sometimes|email',
                            'ein' => 'sometimes|string',
                            'street_line_1' => 'sometimes|string',
                            'city' => 'sometimes|string',
                            'state' => 'sometimes|string',
                            'postal_code' => 'sometimes|string',
                            'country' => 'sometimes|string',
                            'control_person.first_name' => 'required|string',
                            'control_person.last_name' => 'required|string',
                            'control_person.email' => 'required|email',
                            'control_person.birth_date' => 'required|date',
                            'control_person.ssn' => ['required', 'string', 'regex:/^\d{9}$/', 'size:9'],
                            'control_person.title' => 'required|string',
                            'control_person.ownership_percentage' => 'required|numeric|min:0|max:100',
                            'control_person.street_line_1' => 'required|string',
                            'control_person.city' => 'required|string',
                            'control_person.state' => 'required|string',
                            'control_person.postal_code' => 'required|string',
                            'control_person.country' => 'required|string',
                            'control_person.id_type' => 'required|in:drivers_license,passport',
                            'control_person.id_number' => 'required|string',
                            'control_person.id_front_image' => 'required|string',
                            'control_person.id_back_image' => 'nullable|string',
                        ]);
                    } elseif ($step === 'business_documents') {
                        // Step 2: Business Documents submission
                        // Check if this is a re-upload (existing submission with rejected documents)
                        $isReUpload = false;
                        $rejectedDocuments = [];
                        
                        if ($integration) {
                            $submission = BridgeKycKybSubmission::where('bridge_integration_id', $integration->id)
                                ->where('type', 'kyb')
                                ->with('verificationDocuments') // Eager load verification documents
                                ->first();
                            
                            if ($submission) {
                                // Check verification_documents table for rejected documents
                                $verificationDocs = $submission->verificationDocuments;
                                
                                foreach ($verificationDocs as $doc) {
                                    if ($doc->status === 'rejected') {
                                        $isReUpload = true;
                                        $rejectedDocuments[] = $doc->document_type;
                                    }
                                }
                                
                                // Fallback: Also check old submission_data structure for backward compatibility
                                if (!$isReUpload && isset($submission->submission_data['document_statuses'])) {
                                    $docStatuses = $submission->submission_data['document_statuses'];
                                    
                                    // Check if any documents are rejected
                                    if (isset($docStatuses['business_formation']) && $docStatuses['business_formation'] === 'rejected') {
                                        $isReUpload = true;
                                        $rejectedDocuments[] = 'business_formation';
                                    }
                                    if (isset($docStatuses['business_ownership']) && $docStatuses['business_ownership'] === 'rejected') {
                                        $isReUpload = true;
                                        $rejectedDocuments[] = 'business_ownership';
                                    }
                                    if (isset($docStatuses['proof_of_address']) && $docStatuses['proof_of_address'] === 'rejected') {
                                        $isReUpload = true;
                                        $rejectedDocuments[] = 'proof_of_address';
                                    }
                                }
                            }
                        }
                        
                        // Check if admin requested specific fields for refill
                        $requestedFields = null;
                        if ($submission) {
                            $submissionData = $submission->submission_data ?? [];
                            if (is_string($submissionData)) {
                                $submissionData = json_decode($submissionData, true) ?? [];
                            }
                            if (isset($submissionData['requested_fields']) && is_array($submissionData['requested_fields']) && !empty($submissionData['requested_fields'])) {
                                $requestedFields = $submissionData['requested_fields'];
                            }
                        }
                        
                        // Build validation rules conditionally
                        $validationRules = [
                            'business_industry' => 'nullable|string',
                            'primary_website' => 'nullable|url',
                            'dao_status' => 'nullable|boolean',
                            'physical_address' => 'nullable|array',
                            'physical_address.street_line_1' => 'nullable|string',
                            'physical_address.street_line_2' => 'nullable|string',
                            'physical_address.city' => 'nullable|string',
                            'physical_address.subdivision' => 'nullable|string',
                            'physical_address.postal_code' => 'nullable|string',
                            'physical_address.country' => 'nullable|string',
                            // Enhanced KYB Requirements
                            'source_of_funds' => 'nullable|string',
                            'annual_revenue' => 'nullable|string',
                            'transaction_volume' => 'nullable|string',
                            'account_purpose' => 'nullable|string',
                            'high_risk_activities' => 'nullable|string',
                            'high_risk_geographies' => 'nullable|string',
                            'proof_of_address_document' => 'nullable|string', // Base64 PDF (conditional)
                            'proof_of_nature_of_business' => 'nullable|string', // Base64 PDF (for Bridge verification)
                            'determination_letter_501c3' => 'nullable|string', // Base64 PDF (internal use only, not sent to Bridge)
                        ];
                        
                        // If admin requested specific fields, only validate those fields
                        if ($requestedFields && !empty($requestedFields)) {
                            // Admin refill mode: only validate requested fields
                            // Start with all fields as nullable
                            $validationRules['business_formation_document'] = 'nullable|string';
                            $validationRules['business_ownership_document'] = 'nullable|string';
                            $validationRules['business_description'] = 'nullable|string';
                            $validationRules['entity_type'] = 'nullable|string|in:cooperative,corporation,llc,other,partnership,sole_prop,trust';
                            
                            // Only require fields that are in requested_fields
                            if (in_array('business_formation_document', $requestedFields)) {
                                $validationRules['business_formation_document'] = 'required|string';
                            }
                            if (in_array('business_ownership_document', $requestedFields)) {
                                $validationRules['business_ownership_document'] = 'required|string';
                            }
                            if (in_array('business_description', $requestedFields)) {
                                $validationRules['business_description'] = 'required|string';
                            }
                            if (in_array('entity_type', $requestedFields)) {
                                $validationRules['entity_type'] = 'required|string|in:cooperative,corporation,llc,other,partnership,sole_prop,trust';
                            }
                            if (in_array('primary_website', $requestedFields)) {
                                $validationRules['primary_website'] = 'required|url';
                            }
                            if (in_array('business_industry', $requestedFields)) {
                                $validationRules['business_industry'] = 'required|string';
                            }
                            // Enhanced KYB fields
                            if (in_array('source_of_funds', $requestedFields)) {
                                $validationRules['source_of_funds'] = 'required|string';
                            }
                            if (in_array('annual_revenue', $requestedFields)) {
                                $validationRules['annual_revenue'] = 'required|string';
                            }
                            if (in_array('transaction_volume', $requestedFields)) {
                                $validationRules['transaction_volume'] = 'required|string';
                            }
                            if (in_array('account_purpose', $requestedFields)) {
                                $validationRules['account_purpose'] = 'required|string';
                            }
                            if (in_array('high_risk_activities', $requestedFields)) {
                                $validationRules['high_risk_activities'] = 'required|string';
                            }
                            if (in_array('high_risk_geographies', $requestedFields)) {
                                $validationRules['high_risk_geographies'] = 'required|string';
                            }
                            if (in_array('proof_of_address_document', $requestedFields)) {
                                $validationRules['proof_of_address_document'] = 'required|string';
                            }
                            if (in_array('proof_of_nature_of_business', $requestedFields)) {
                                $validationRules['proof_of_nature_of_business'] = 'required|string';
                            }
                            if (in_array('determination_letter_501c3', $requestedFields)) {
                                $validationRules['determination_letter_501c3'] = 'required|string';
                            }
                            // Physical address fields
                            if (in_array('physical_address.street_line_1', $requestedFields)) {
                                $validationRules['physical_address.street_line_1'] = 'required|string';
                            }
                            if (in_array('physical_address.city', $requestedFields)) {
                                $validationRules['physical_address.city'] = 'required|string';
                            }
                            if (in_array('physical_address.subdivision', $requestedFields)) {
                                $validationRules['physical_address.subdivision'] = 'required|string';
                            }
                            if (in_array('physical_address.postal_code', $requestedFields)) {
                                $validationRules['physical_address.postal_code'] = 'required|string';
                            }
                            if (in_array('physical_address.country', $requestedFields)) {
                                $validationRules['physical_address.country'] = 'required|string';
                            }
                            if (in_array('dao_status', $requestedFields)) {
                                $validationRules['dao_status'] = 'required|boolean';
                            }
                        } elseif ($isReUpload && !empty($rejectedDocuments)) {
                            // Re-upload mode: only require rejected documents
                            // Check which documents are rejected from verification_documents table
                            if ($submission && $submission->relationLoaded('verificationDocuments')) {
                                $verificationDocs = $submission->verificationDocuments;
                                
                                // Check business_formation
                                $formationDoc = $verificationDocs->firstWhere('document_type', 'business_formation');
                                if (in_array('business_formation', $rejectedDocuments) || ($formationDoc && $formationDoc->status === 'rejected')) {
                                    $validationRules['business_formation_document'] = 'required|string';
                                } else {
                                    // If document exists and is not rejected, make it optional
                                    $validationRules['business_formation_document'] = 'nullable|string';
                                }
                                
                                // Check business_ownership
                                $ownershipDoc = $verificationDocs->firstWhere('document_type', 'business_ownership');
                                if (in_array('business_ownership', $rejectedDocuments) || ($ownershipDoc && $ownershipDoc->status === 'rejected')) {
                                    $validationRules['business_ownership_document'] = 'required|string';
                                } else {
                                    // If document exists and is not rejected, make it optional
                                    $validationRules['business_ownership_document'] = 'nullable|string';
                                }
                            } else {
                                // Fallback: use rejectedDocuments array
                                if (in_array('business_formation', $rejectedDocuments)) {
                                    $validationRules['business_formation_document'] = 'required|string';
                                } else {
                                    $validationRules['business_formation_document'] = 'nullable|string';
                                }
                                
                                if (in_array('business_ownership', $rejectedDocuments)) {
                                    $validationRules['business_ownership_document'] = 'required|string';
                                } else {
                                    $validationRules['business_ownership_document'] = 'nullable|string';
                                }
                            }
                            
                            // Don't require business_description and entity_type in re-upload mode
                            // They should already be in the submission from the first submission
                            $validationRules['business_description'] = 'nullable|string';
                            $validationRules['entity_type'] = 'nullable|string|in:cooperative,corporation,llc,other,partnership,sole_prop,trust';
                        } else {
                            // Initial submission: require all mandatory fields
                            $validationRules['business_formation_document'] = 'required|string';
                            $validationRules['business_ownership_document'] = 'required|string';
                            $validationRules['business_description'] = 'required|string';
                            $validationRules['entity_type'] = 'required|string|in:cooperative,corporation,llc,other,partnership,sole_prop,trust';
                        }
                        
                        $validated = $request->validate($validationRules);
                    } else {
                        // Legacy single-step validation (for backward compatibility)
                        $validated = $request->validate([
                            'business_name' => 'sometimes|string|max:255',
                            'email' => 'sometimes|email',
                            'ein' => 'sometimes|string',
                            'phone' => 'nullable|string',
                            'website' => 'nullable|url',
                            'street_line_1' => 'sometimes|string',
                            'street_line_2' => 'nullable|string',
                            'city' => 'sometimes|string',
                            'state' => 'sometimes|string',
                            'postal_code' => 'sometimes|string',
                            'country' => 'sometimes|string',
                            'control_person.first_name' => 'required|string',
                            'control_person.last_name' => 'required|string',
                            'control_person.email' => 'required|email',
                            'control_person.birth_date' => 'required|date',
                            'control_person.ssn' => ['required', 'string', 'regex:/^\d{9}$/', 'size:9'],
                            'control_person.title' => 'required|string',
                            'control_person.ownership_percentage' => 'required|numeric|min:0|max:100',
                            'control_person.street_line_1' => 'required|string',
                            'control_person.city' => 'required|string',
                            'control_person.state' => 'required|string',
                            'control_person.postal_code' => 'required|string',
                            'control_person.country' => 'required|string',
                            'control_person.id_type' => 'required|in:drivers_license,passport',
                            'control_person.id_number' => 'required|string',
                            'control_person.id_front_image' => 'required|string',
                            'control_person.id_back_image' => 'nullable|string',
                        ]);
                    }

                    // Handle Step 2: Business Documents (add documents to existing customer)
                    if ($step === 'business_documents') {
                        if (!$integration->bridge_customer_id) {
                            throw new \Exception('Business customer must be created first. Please complete Step 1: Control Person.');
                        }
                        
                        // Save documents to storage
                        $fileIdentifier = $integration->bridge_customer_id;
                        $formationDocPath = null;
                        $ownershipDocPath = null;
                        $poaDocPath = null;
                        $proofOfNaturePath = null;
                        
                        if (!empty($validated['business_formation_document'])) {
                            $formationDocPath = $this->saveBase64Image(
                                $validated['business_formation_document'],
                                'bridge/kyb/documents',
                                'formation_' . $fileIdentifier . '_' . time()
                            );
                        }
                        if (!empty($validated['business_ownership_document'])) {
                            $ownershipDocPath = $this->saveBase64Image(
                                $validated['business_ownership_document'],
                                'bridge/kyb/documents',
                                'ownership_' . $fileIdentifier . '_' . time()
                            );
                        }
                        if (!empty($validated['proof_of_address_document'])) {
                            $poaDocPath = $this->saveBase64Image(
                                $validated['proof_of_address_document'],
                                'bridge/kyb/documents',
                                'poa_' . $fileIdentifier . '_' . time()
                            );
                        }
                        if (!empty($validated['proof_of_nature_of_business'])) {
                            $proofOfNaturePath = $this->saveBase64Image(
                                $validated['proof_of_nature_of_business'],
                                'bridge/kyb/documents',
                                'proof_of_nature_' . $fileIdentifier . '_' . time()
                            );
                        }
                        
                        // Save 501c3 Determination Letter (for internal use only, not sent to Bridge)
                        $determinationLetterPath = null;
                        if (!empty($validated['determination_letter_501c3'])) {
                            $determinationLetterPath = $this->saveBase64Image(
                                $validated['determination_letter_501c3'],
                                'bridge/kyb/documents',
                                '501c3_' . $fileIdentifier . '_' . time()
                            );
                        }
                        
                        // Check if direct Bridge submission is enabled
                        $directBridgeSubmission = AdminSetting::get('kyb_direct_bridge_submission', false);
                        
                        // Only send to Bridge API if direct submission mode is enabled
                        if ($directBridgeSubmission) {
                            // Convert to base64 for Bridge API
                            $formationDocBase64 = $this->filePathToBase64($formationDocPath);
                            $ownershipDocBase64 = $this->filePathToBase64($ownershipDocPath);
                            
                            // Get existing customer to update
                            $customerResult = $this->bridgeService->getCustomer($integration->bridge_customer_id);
                            if (!$customerResult['success']) {
                                throw new \Exception('Failed to retrieve customer from Bridge');
                            }
                            
                            $existingCustomer = $customerResult['data'];
                            $existingDocuments = $existingCustomer['documents'] ?? [];
                            
                            // Add new documents
                            $documents = [];
                            if ($formationDocBase64) {
                                $documents[] = [
                                    'purposes' => ['business_formation'],
                                    'file' => $formationDocBase64,
                                ];
                            }
                            if ($ownershipDocBase64) {
                                $documents[] = [
                                    'purposes' => ['ownership_information'],
                                    'file' => $ownershipDocBase64,
                                ];
                            }
                            if (!empty($validated['proof_of_nature_of_business'])) {
                                $proofOfNatureBase64 = $this->filePathToBase64($proofOfNaturePath);
                                if ($proofOfNatureBase64) {
                                    $documents[] = [
                                        'purposes' => ['proof_of_nature_of_business'],
                                        'file' => $proofOfNatureBase64,
                                    ];
                                }
                            }
                            
                            // Update customer with documents and additional information
                            $updateData = [];
                            if (!empty($validated['business_description'])) {
                                $updateData['business_description'] = $validated['business_description'];
                            }
                            if (!empty($validated['primary_website'])) {
                                $updateData['primary_website'] = $validated['primary_website'];
                            }
                            if (!empty($validated['entity_type'])) {
                                $updateData['entity_type'] = $validated['entity_type'];
                            }
                            if (isset($validated['dao_status'])) {
                                $updateData['dao_status'] = (bool) $validated['dao_status'];
                            }
                            // Add physical address if provided
                            if (!empty($validated['physical_address'])) {
                                $physicalAddr = $validated['physical_address'];
                                if (!empty($physicalAddr['street_line_1'])) {
                                    $updateData['physical_address'] = [
                                        'street_line_1' => $physicalAddr['street_line_1'] ?? '',
                                        'street_line_2' => $physicalAddr['street_line_2'] ?? null,
                                        'city' => $physicalAddr['city'] ?? '',
                                        'subdivision' => $physicalAddr['subdivision'] ?? '',
                                        'postal_code' => $physicalAddr['postal_code'] ?? '',
                                        'country' => $physicalAddr['country'] ?? 'USA',
                                    ];
                                }
                            }
                            // Enhanced KYB fields (store in metadata, may not be in Bridge API)
                            $enhancedFields = [];
                            if (!empty($validated['source_of_funds'])) {
                                $enhancedFields['source_of_funds'] = $validated['source_of_funds'];
                            }
                            if (!empty($validated['annual_revenue'])) {
                                $enhancedFields['annual_revenue'] = $validated['annual_revenue'];
                            }
                            if (!empty($validated['transaction_volume'])) {
                                $enhancedFields['transaction_volume'] = $validated['transaction_volume'];
                            }
                            if (!empty($validated['account_purpose'])) {
                                $enhancedFields['account_purpose'] = $validated['account_purpose'];
                            }
                            if (!empty($validated['high_risk_activities'])) {
                                $enhancedFields['high_risk_activities'] = $validated['high_risk_activities'];
                            }
                            if (!empty($validated['high_risk_geographies'])) {
                                $enhancedFields['high_risk_geographies'] = $validated['high_risk_geographies'];
                            }
                            if (!empty($documents)) {
                                $updateData['documents'] = array_merge($existingDocuments, $documents);
                            }
                            
                            // Handle proof of address document if provided
                            if (!empty($validated['proof_of_address_document'])) {
                                $poaDocBase64 = $this->filePathToBase64($poaDocPath);
                                if ($poaDocBase64) {
                                    $updateData['documents'][] = [
                                        'purposes' => ['proof_of_address'],
                                        'file' => $poaDocBase64,
                                    ];
                                }
                            }
                            
                            $result = $this->bridgeService->updateCustomer($integration->bridge_customer_id, $updateData);
                            
                            if (!$result['success']) {
                                throw new \Exception($result['error'] ?? 'Failed to upload business documents');
                            }
                            
                            Log::info('Business documents sent to Bridge API (Direct Mode)', [
                                'integration_id' => $integration->id,
                                'customer_id' => $integration->bridge_customer_id,
                            ]);
                        } else {
                            // Approval mode: Only save to database, don't send to Bridge
                            Log::info('Business documents saved locally (Approval Mode - waiting for admin approval)', [
                                'integration_id' => $integration->id,
                                'customer_id' => $integration->bridge_customer_id,
                            ]);
                            
                            // Enhanced KYB fields (store in metadata for later)
                            $enhancedFields = [];
                            if (!empty($validated['source_of_funds'])) {
                                $enhancedFields['source_of_funds'] = $validated['source_of_funds'];
                            }
                            if (!empty($validated['annual_revenue'])) {
                                $enhancedFields['annual_revenue'] = $validated['annual_revenue'];
                            }
                            if (!empty($validated['transaction_volume'])) {
                                $enhancedFields['transaction_volume'] = $validated['transaction_volume'];
                            }
                            if (!empty($validated['account_purpose'])) {
                                $enhancedFields['account_purpose'] = $validated['account_purpose'];
                            }
                            if (!empty($validated['high_risk_activities'])) {
                                $enhancedFields['high_risk_activities'] = $validated['high_risk_activities'];
                            }
                            if (!empty($validated['high_risk_geographies'])) {
                                $enhancedFields['high_risk_geographies'] = $validated['high_risk_geographies'];
                            }
                        }
                        
                        // Get metadata
                        $metadata = $integration->bridge_metadata ?? [];
                        if (is_string($metadata)) {
                            $metadata = json_decode($metadata, true) ?? [];
                        }
                        
                        // Try to get/create KYC link for control person (only in direct mode)
                        $controlPersonEmail = $metadata['control_person_email'] ?? null;
                        $kycLink = null;
                        if ($directBridgeSubmission && $controlPersonEmail) {
                            try {
                                $kycLinkResult = $this->bridgeService->createKYCLink([
                                    'email' => $controlPersonEmail,
                                    'full_name' => ($metadata['control_person_first_name'] ?? '') . ' ' . ($metadata['control_person_last_name'] ?? ''),
                                    'type' => 'individual',
                                ]);
                                if ($kycLinkResult['success'] && isset($kycLinkResult['data']['url'])) {
                                    $kycLink = $kycLinkResult['data']['url'];
                                }
                            } catch (\Exception $e) {
                                Log::warning('Failed to create Control Person KYC link', ['error' => $e->getMessage()]);
                            }
                        }
                        
                        // Update metadata with step progress and enhanced fields
                        // Only move to kyc_verification step if direct mode
                        // In approval mode, stay on business_documents step until admin approves
                        if ($directBridgeSubmission) {
                            $metadata['kyb_step'] = 'kyc_verification';
                        } else {
                            // Approval mode: stay on business_documents step
                            $metadata['kyb_step'] = 'business_documents';
                        }
                        $metadata['business_documents_submitted'] = true;
                        if ($kycLink) {
                            $metadata['control_person_kyc_link'] = $kycLink;
                        }
                        // Store enhanced KYB fields in metadata
                        if (!empty($enhancedFields)) {
                            $metadata['enhanced_kyb_fields'] = $enhancedFields;
                        }
                        // Store entity type and DAO status
                        if (!empty($validated['entity_type'])) {
                            $metadata['entity_type'] = $validated['entity_type'];
                        }
                        if (isset($validated['dao_status'])) {
                            $metadata['dao_status'] = (bool) $validated['dao_status'];
                        }
                        $integration->bridge_metadata = $metadata;
                        $integration->save();
                        
                        // Create or update the KYB submission record with ALL data when documents are submitted
                        $submission = BridgeKycKybSubmission::where('bridge_integration_id', $integration->id)
                            ->where('type', 'kyb')
                            ->latest()
                            ->first();
                        
                        // Get control person data from metadata or existing submission
                        $controlPersonData = null;
                        if ($submission && !empty($submission->control_person)) {
                            $controlPersonData = $submission->control_person;
                        } else {
                            // Try to get from metadata
                            $metadata = $integration->bridge_metadata ?? [];
                            if (is_string($metadata)) {
                                $metadata = json_decode($metadata, true) ?? [];
                            }
                            if (!empty($metadata['control_person_email'])) {
                                // We have control person info in metadata, but need to get full data
                                // This should have been saved in Step 1, but if not, we'll create minimal record
                                $controlPersonData = [
                                    'first_name' => $metadata['control_person_first_name'] ?? null,
                                    'last_name' => $metadata['control_person_last_name'] ?? null,
                                    'email' => $metadata['control_person_email'] ?? null,
                                ];
                            }
                        }
                        
                        // Get business info from organization
                        $organization = $user->organization;
                        $businessName = $organization->name ?? null;
                        $businessEmail = $organization->email ?? $user->email ?? null;
                        $ein = $organization->ein ?? null;
                        
                        // Build complete submission data (without document paths - they're in separate table now)
                        $submissionData = [
                            'entity_type' => $validated['entity_type'] ?? null,
                            'dao_status' => $validated['dao_status'] ?? false,
                            'physical_address' => $validated['physical_address'] ?? null,
                            'business_description' => $validated['business_description'] ?? null,
                            'primary_website' => $validated['primary_website'] ?? null,
                            'business_industry' => $validated['business_industry'] ?? null,
                            'source_of_funds' => $validated['source_of_funds'] ?? null,
                            'annual_revenue' => $validated['annual_revenue'] ?? null,
                            'transaction_volume' => $validated['transaction_volume'] ?? null,
                            'account_purpose' => $validated['account_purpose'] ?? null,
                            'high_risk_activities' => $validated['high_risk_activities'] ?? null,
                            'high_risk_geographies' => $validated['high_risk_geographies'] ?? null,
                        ];
                        
                        if ($submission) {
                            // Update existing submission
                            $existingSubmissionData = $submission->submission_data ?? [];
                            if (is_string($existingSubmissionData)) {
                                $existingSubmissionData = json_decode($existingSubmissionData, true) ?? [];
                            }
                            
                            // Merge new data with existing (preserve existing values if new ones are null)
                            foreach ($submissionData as $key => $value) {
                                if ($value !== null) {
                                    $existingSubmissionData[$key] = $value;
                                } elseif (!isset($existingSubmissionData[$key])) {
                                    $existingSubmissionData[$key] = $value;
                                }
                            }
                            
                            // Clear requested_fields and refill_message after successful submission
                            unset($existingSubmissionData['requested_fields']);
                            unset($existingSubmissionData['refill_message']);
                            unset($existingSubmissionData['refill_requested_at']);
                            unset($existingSubmissionData['refill_requested_by']);
                            
                            // Update only allowed fields (business_name and business_email columns don't exist anymore)
                            $submission->submission_data = $existingSubmissionData;
                            
                            // Update ein if needed
                            if (!$submission->ein && $ein) {
                                $submission->ein = $ein;
                            }
                            
                            // Ensure submission status is set (not_started if not sent to Bridge)
                            // Bridge KYC/KYB statuses: not_started, incomplete, under_review, awaiting_questionnaire, awaiting_ubo, approved, rejected, paused, offboarded
                            // If admin requested more info (document rejected), and user re-uploads, move it back to not_started.
                            if (!$submission->submission_status) {
                                $submission->submission_status = 'not_started';
                            } elseif (in_array($submission->submission_status, ['needs_more_info', 'rejected'], true)) {
                                $submission->submission_status = 'not_started'; // Reset to not_started when re-uploading
                            }
                            
                            // Use update() with only allowed fields to prevent trying to update removed columns
                            $submission->update([
                                'submission_data' => $existingSubmissionData,
                                'ein' => $submission->ein,
                                'submission_status' => $submission->submission_status,
                            ]);
                            
                            // Save or update documents in separate table (preserve approved documents)
                            if ($formationDocPath) {
                                $doc = VerificationDocument::updateOrCreate(
                                    [
                                        'bridge_kyc_kyb_submission_id' => $submission->id,
                                        'document_type' => 'business_formation',
                                    ],
                                    [
                                        'file_path' => $formationDocPath,
                                        'status' => 'pending', // Reset to pending when re-uploaded
                                        'rejection_reason' => null,
                                        'rejected_at' => null,
                                        'rejected_by' => null,
                                    ]
                                );
                            }
                            
                            if ($ownershipDocPath) {
                                $doc = VerificationDocument::updateOrCreate(
                                    [
                                        'bridge_kyc_kyb_submission_id' => $submission->id,
                                        'document_type' => 'business_ownership',
                                    ],
                                    [
                                        'file_path' => $ownershipDocPath,
                                        'status' => 'pending', // Reset to pending when re-uploaded
                                        'rejection_reason' => null,
                                        'rejected_at' => null,
                                        'rejected_by' => null,
                                    ]
                                );
                            }
                            
                            if ($poaDocPath) {
                                $doc = VerificationDocument::updateOrCreate(
                                    [
                                        'bridge_kyc_kyb_submission_id' => $submission->id,
                                        'document_type' => 'proof_of_address',
                                    ],
                                    [
                                        'file_path' => $poaDocPath,
                                        'status' => 'pending', // Reset to pending when re-uploaded
                                        'rejection_reason' => null,
                                        'rejected_at' => null,
                                        'rejected_by' => null,
                                    ]
                                );
                            }
                            
                            if ($proofOfNaturePath) {
                                $doc = VerificationDocument::updateOrCreate(
                                    [
                                        'bridge_kyc_kyb_submission_id' => $submission->id,
                                        'document_type' => 'proof_of_nature_of_business',
                                    ],
                                    [
                                        'file_path' => $proofOfNaturePath,
                                        'status' => 'pending', // Reset to pending when re-uploaded
                                        'rejection_reason' => null,
                                        'rejected_at' => null,
                                        'rejected_by' => null,
                                    ]
                                );
                            }
                        } else {
                            // Create new submission record (simplified - business data comes from organizations table)
                            // Bridge KYC/KYB statuses: not_started, incomplete, under_review, awaiting_questionnaire, awaiting_ubo, approved, rejected, paused, offboarded
                            $submission = BridgeKycKybSubmission::create([
                                'bridge_integration_id' => $integration->id,
                                'type' => 'kyb',
                                'submission_status' => 'not_started', // Will be approved by admin later
                                'ein' => $ein,
                                'bridge_customer_id' => $integration->bridge_customer_id,
                                'submission_data' => $submissionData,
                            ]);
                            
                            Log::info('KYB submission created in database after Step 2 (Business Documents)', [
                                'submission_id' => $submission->id,
                                'integration_id' => $integration->id,
                                'customer_id' => $integration->bridge_customer_id,
                            ]);
                            
                            // Save documents in separate table
                            if ($formationDocPath) {
                                VerificationDocument::create([
                                    'bridge_kyc_kyb_submission_id' => $submission->id,
                                    'document_type' => 'business_formation',
                                    'file_path' => $formationDocPath,
                                    'status' => 'pending',
                                ]);
                            }
                            
                            if ($ownershipDocPath) {
                                VerificationDocument::create([
                                    'bridge_kyc_kyb_submission_id' => $submission->id,
                                    'document_type' => 'business_ownership',
                                    'file_path' => $ownershipDocPath,
                                    'status' => 'pending',
                                ]);
                            }
                            
                            if ($poaDocPath) {
                                VerificationDocument::create([
                                    'bridge_kyc_kyb_submission_id' => $submission->id,
                                    'document_type' => 'proof_of_address',
                                    'file_path' => $poaDocPath,
                                    'status' => 'pending',
                                ]);
                            }
                            
                            if ($proofOfNaturePath) {
                                VerificationDocument::create([
                                    'bridge_kyc_kyb_submission_id' => $submission->id,
                                    'document_type' => 'proof_of_nature_of_business',
                                    'file_path' => $proofOfNaturePath,
                                    'status' => 'pending',
                                ]);
                            }
                            
                            // Save 501c3 Determination Letter (internal use only, not sent to Bridge)
                            if ($determinationLetterPath) {
                                VerificationDocument::create([
                                    'bridge_kyc_kyb_submission_id' => $submission->id,
                                    'document_type' => 'determination_letter_501c3',
                                    'file_path' => $determinationLetterPath,
                                    'status' => 'pending',
                                ]);
                            }
                        }
                        
                        DB::commit();
                        
                        return response()->json([
                            'success' => true,
                            'message' => 'Business documents uploaded successfully.',
                            'data' => [
                                'control_person_kyc_link' => $kycLink,
                            ],
                        ]);
                    }
                    
                    // Use organization data as defaults, override with request data if provided
                    // Ensure organization exists (should be checked earlier, but add safety check)
                    if (!$organization) {
                        throw new \Exception('Organization not found. Please ensure your organization is properly set up.');
                    }
                    
                    $businessName = $validated['business_name'] ?? $organization->name ?? null;
                    $email = $validated['email'] ?? $organization->email ?? $user->email ?? null;
                    $ein = $validated['ein'] ?? $organization->ein ?? null;
                    $phone = $validated['phone'] ?? $organization->phone ?? null;
                    $website = $validated['website'] ?? $organization->website ?? null;
                    
                    // Business Address - use organization defaults
                    $streetLine1 = $validated['street_line_1'] ?? $organization->street ?? null;
                    $city = $validated['city'] ?? $organization->city ?? null;
                    $state = $validated['state'] ?? $organization->state ?? null;
                    $postalCode = $validated['postal_code'] ?? $organization->zip ?? null;
                    $country = $validated['country'] ?? 'USA';
                    
                    // Validate required fields are present (either from request or organization)
                    if (empty($businessName)) {
                        throw new \Exception('Business name is required');
                    }
                    if (empty($email)) {
                        throw new \Exception('Email is required');
                    }
                    if (empty($ein)) {
                        throw new \Exception('EIN is required');
                    }
                    if (empty($streetLine1) || empty($city) || empty($state) || empty($postalCode)) {
                        throw new \Exception('Business address is incomplete. Please provide street, city, state, and ZIP code.');
                    }

                    // Save images to storage first (store file paths, not base64)
                    $fileIdentifier = $integration->bridge_customer_id ?? ('integration_' . $integration->id);
                    
                    if (!empty($validated['control_person']['id_front_image'])) {
                        $idFrontImagePath = $this->saveBase64Image(
                            $validated['control_person']['id_front_image'],
                            'bridge/kyb/documents',
                            'id_front_' . $fileIdentifier . '_' . time()
                        );
                    }
                    if (!empty($validated['control_person']['id_back_image'])) {
                        $idBackImagePath = $this->saveBase64Image(
                            $validated['control_person']['id_back_image'],
                            'bridge/kyb/documents',
                            'id_back_' . $fileIdentifier . '_' . time()
                        );
                    }

                    // Convert saved file paths to base64 for Bridge API
                    $idFrontBase64 = $this->filePathToBase64($idFrontImagePath);
                    $idBackBase64 = $this->filePathToBase64($idBackImagePath);

                    // Build customer data for Bridge API (without associated_persons - they must be added separately)
                    $customerData = [
                        'type' => 'business',
                        'business_legal_name' => $businessName, // Changed from 'business_name'
                        'email' => $email,
                        
                        // Registered Address (legal address) - Changed from 'business_address'
                        'registered_address' => [
                            'street_line_1' => $streetLine1,
                            'street_line_2' => $validated['street_line_2'] ?? null,
                            'city' => $city,
                            'subdivision' => $state,
                            'postal_code' => $postalCode,
                            'country' => $country, // Should be ISO 3166-1 alpha3 (e.g., 'USA')
                        ],
                        
                        // Physical/Operating Address (use from validated if provided, otherwise same as registered)
                        'physical_address' => !empty($validated['physical_address']['street_line_1']) ? [
                            'street_line_1' => $validated['physical_address']['street_line_1'] ?? $streetLine1,
                            'street_line_2' => $validated['physical_address']['street_line_2'] ?? $validated['street_line_2'] ?? null,
                            'city' => $validated['physical_address']['city'] ?? $city,
                            'subdivision' => $validated['physical_address']['subdivision'] ?? $state,
                            'postal_code' => $validated['physical_address']['postal_code'] ?? $postalCode,
                            'country' => $validated['physical_address']['country'] ?? $country,
                        ] : [
                            'street_line_1' => $streetLine1,
                            'street_line_2' => $validated['street_line_2'] ?? null,
                            'city' => $city,
                            'subdivision' => $state,
                            'postal_code' => $postalCode,
                            'country' => $country,
                        ],

                        // Business Tax ID (EIN for US)
                        'identifying_information' => [
                            [
                                'type' => 'ein',
                                'issuing_country' => 'usa',
                                'number' => $ein,
                            ],
                        ],
                        
                        // Business description (required by Bridge)
                        'business_description' => $validated['business_description'] ?? 'Business operations',
                    ];
                    
                    // Only include signed_agreement_id if we have a valid one
                    if ($signedAgreementId && $signedAgreementId !== 'accepted') {
                        $customerData['signed_agreement_id'] = $signedAgreementId;
                    }

                    // Add optional fields
                    if (!empty($phone)) {
                        $customerData['phone'] = $phone;
                    }
                    if (!empty($website)) {
                        $customerData['website'] = $website;
                    }
                    // Add primary_website if available
                    if (!empty($validated['primary_website'])) {
                        $customerData['primary_website'] = $validated['primary_website'];
                    }
                    // Add entity_type if available (may not be in Bridge API, but include it)
                    if (!empty($validated['entity_type'])) {
                        $customerData['entity_type'] = $validated['entity_type'];
                    }
                    
                    // Store associated person data separately (will be added after customer creation)
                    $associatedPersonData = [
                        'first_name' => $validated['control_person']['first_name'],
                        'last_name' => $validated['control_person']['last_name'],
                        'email' => $validated['control_person']['email'],
                        'birth_date' => $validated['control_person']['birth_date'],
                        'title' => $validated['control_person']['title'],
                        'ownership_percentage' => $validated['control_person']['ownership_percentage'],
                        // Set is_beneficial_owner to true if ownership >= 25%
                        'is_beneficial_owner' => ($validated['control_person']['ownership_percentage'] ?? 0) >= 25,
                        'has_control' => true, // Control person (CEO, CFO, COO, etc.)
                        'has_ownership' => ($validated['control_person']['ownership_percentage'] ?? 0) >= 25,
                        'attested_ownership_structure_at' => now()->toIso8601String(),

                        'residential_address' => [
                            'street_line_1' => $validated['control_person']['street_line_1'],
                            'city' => $validated['control_person']['city'],
                            'subdivision' => $validated['control_person']['state'],
                            'postal_code' => $validated['control_person']['postal_code'],
                            'country' => $validated['control_person']['country'],
                        ],

                        'identifying_information' => [
                            [
                                'type' => 'ssn',
                                'issuing_country' => 'usa',
                                'number' => $validated['control_person']['ssn'],
                            ],
                            [
                                'type' => $validated['control_person']['id_type'],
                                'issuing_country' => 'usa',
                                'number' => $validated['control_person']['id_number'],
                                'image_front' => $idFrontBase64,
                                'image_back' => $idBackBase64,
                            ],
                        ],
                    ];
                    
                    // Store additional beneficial owners if provided
                    $additionalBeneficialOwners = [];
                    if ($request->has('additional_beneficial_owners') && is_array($request->input('additional_beneficial_owners'))) {
                        $additionalBeneficialOwners = $request->input('additional_beneficial_owners');
                    }
                } else {
                    // Individual customer (KYC)
                    // Make id_back_image conditional based on id_type
                    $idType = $request->input('id_type');
                    $idBackImageRule = ($idType === 'passport') ? 'nullable|string' : 'required|string';
                    
                    $validated = $request->validate([
                        'first_name' => 'required|string|max:255',
                        'last_name' => 'required|string|max:255',
                        'email' => 'required|email',
                        'birth_date' => 'required|date',
                        'residential_address' => 'required|array',
                        'residential_address.street_line_1' => 'required|string',
                        'residential_address.city' => 'required|string',
                        'residential_address.subdivision' => 'required|string',
                        'residential_address.postal_code' => 'required|string',
                        'residential_address.country' => 'required|string',
                        'ssn' => ['required', 'string', 'regex:/^\d{9}$/', 'size:9'],
                        'id_type' => 'required|in:drivers_license,passport,state_id',
                        'id_number' => 'required|string',
                        'id_front_image' => 'required|string', // Base64 encoded
                        'id_back_image' => $idBackImageRule, // Base64 encoded - required except for passport
                    ]);

                    // Save images to storage first (store file paths, not base64)
                    $fileIdentifier = $integration->bridge_customer_id ?? ('integration_' . $integration->id);
                    $idBackImagePath = null; // Initialize to null
                    
                    if (!empty($validated['id_front_image'])) {
                        $idFrontImagePath = $this->saveBase64Image(
                            $validated['id_front_image'],
                            'bridge/kyc/documents',
                            'id_front_' . $fileIdentifier . '_' . time()
                        );
                    }
                    if (!empty($validated['id_back_image'])) {
                        $idBackImagePath = $this->saveBase64Image(
                            $validated['id_back_image'],
                            'bridge/kyc/documents',
                            'id_back_' . $fileIdentifier . '_' . time()
                        );
                    }

                    // Convert saved file paths to base64 for Bridge API
                    $idFrontBase64 = $this->filePathToBase64($idFrontImagePath);
                    $idBackBase64 = !empty($idBackImagePath) ? $this->filePathToBase64($idBackImagePath) : null;

                    // Build identifying information array
                    $identifyingInfo = [
                        [
                            'type' => 'ssn',
                            'issuing_country' => 'usa',
                            'number' => $validated['ssn'],
                        ],
                        [
                            'type' => $validated['id_type'],
                            'issuing_country' => 'usa',
                            'number' => $validated['id_number'],
                            'image_front' => $idFrontBase64,
                        ],
                    ];
                    
                    // Only include image_back if it exists (not for passport)
                    if ($idBackBase64) {
                        $identifyingInfo[1]['image_back'] = $idBackBase64;
                    }

                    $customerData = [
                        'type' => 'individual',
                        'first_name' => $validated['first_name'],
                        'last_name' => $validated['last_name'],
                        'email' => $validated['email'],
                        'birth_date' => $validated['birth_date'],
                        'residential_address' => $validated['residential_address'],
                        'identifying_information' => $identifyingInfo,
                    ];
                    
                    // Only include signed_agreement_id if we have a valid one
                    if ($signedAgreementId && $signedAgreementId !== 'accepted') {
                        $customerData['signed_agreement_id'] = $signedAgreementId;
                    }
                }

                // Check if direct Bridge submission is enabled (for KYB only)
                $directBridgeSubmission = AdminSetting::get('kyb_direct_bridge_submission', false);
                
                // For KYB submissions, if direct mode is disabled, only save locally
                if ($isOrgUser && !$directBridgeSubmission) {
                    Log::info('KYB submission mode: Approval required - saving locally only', [
                        'integration_id' => $integration->id,
                        'direct_mode' => false,
                    ]);
                    
                    // Set status to not_started (awaiting admin approval)
                    // Bridge KYB statuses: not_started, incomplete, under_review, awaiting_questionnaire, awaiting_ubo, approved, rejected, paused, offboarded
                    if ($isOrgUser) {
                        $integration->kyb_status = 'not_started';
                    }
                    $integration->tos_status = 'accepted';
                    
                    // Save metadata
                    $existingMetadata = $integration->bridge_metadata ?? [];
                    if (!is_array($existingMetadata)) {
                        $existingMetadata = is_string($existingMetadata) ? json_decode($existingMetadata, true) : [];
                    }
                    
                    $newMetadata = array_merge($existingMetadata, [
                        'type' => 'business',
                        'submission_mode' => 'approval_required',
                        'created_at' => now()->toIso8601String(),
                    ]);
                    
                    if ($signedAgreementId && $signedAgreementId !== 'accepted') {
                        $newMetadata['signed_agreement_id'] = $signedAgreementId;
                    }
                    
                    $integration->bridge_metadata = $newMetadata;
                    $integration->save();
                    
                    // Save submission locally (without Bridge response)
                    $this->saveKycKybSubmission($integration, $validated, $customerData, [], $isOrgUser, false);
                    
                    DB::commit();
                    
                    return response()->json([
                        'success' => true,
                        'message' => 'KYB data submitted successfully. Awaiting admin approval.',
                        'data' => [
                            'kyb_status' => 'pending',
                            'requires_approval' => true,
                        ],
                    ]);
                }
                
                // Direct mode or individual KYC - proceed with Bridge submission
                // Check if customer already exists
                if ($integration->bridge_customer_id) {
                    Log::info('Customer already exists, updating instead of creating', [
                        'customer_id' => $integration->bridge_customer_id,
                        'type' => $isOrgUser ? 'business' : 'individual',
                    ]);
                    
                    // Extract associated_persons before removing them from update data
                    $associatedPersons = $customerData['associated_persons'] ?? [];
                    
                    // For existing customers, Bridge doesn't allow updating associated_persons (UBOs) via PATCH
                    // Only update fields that can be changed
                    $updateData = $customerData;
                    
                    // Remove fields that cannot be updated via PATCH
                    unset($updateData['associated_persons']); // Must use separate endpoint
                    unset($updateData['type']); // Type cannot be changed
                    
                    // Fix field names for Bridge API
                    if (isset($updateData['business_name'])) {
                        $updateData['business_legal_name'] = $updateData['business_name'];
                        unset($updateData['business_name']);
                    }
                    if (isset($updateData['business_address'])) {
                        $updateData['registered_address'] = $updateData['business_address'];
                        unset($updateData['business_address']);
                    }
                    
                    // Only include signed_agreement_id if we have one
                    if ($signedAgreementId && $signedAgreementId !== 'accepted') {
                        $updateData['signed_agreement_id'] = $signedAgreementId;
                    }
                    
                    Log::info('Updating existing customer (excluding immutable fields)', [
                        'customer_id' => $integration->bridge_customer_id,
                        'update_fields' => array_keys($updateData),
                        'has_associated_persons' => !empty($associatedPersons),
                    ]);
                    
                    // Update existing customer instead of creating new one
                    $result = $this->bridgeService->updateCustomer($integration->bridge_customer_id, $updateData);
                    
                    if (!$result['success']) {
                        Log::error('Bridge customer update failed', [
                            'customer_id' => $integration->bridge_customer_id,
                            'error' => $result['error'],
                            'response' => $result['response'] ?? null,
                            'type' => $isOrgUser ? 'business' : 'individual',
                        ]);
                        throw new \Exception($result['error'] ?? 'Failed to update customer');
                    }
                    
                    $responseData = $result['data'];
                    
                    // Add associated persons using the separate endpoint (POST /customers/{id}/associated_persons)
                    if (!empty($associatedPersons) && $isOrgUser) {
                        Log::info('Adding associated persons via separate endpoint', [
                            'customer_id' => $integration->bridge_customer_id,
                            'count' => count($associatedPersons),
                        ]);
                        
                        // Get existing associated persons from Bridge to avoid duplicates
                        $existingBridgePersonsResult = $this->bridgeService->getAssociatedPersons($integration->bridge_customer_id);
                        $existingBridgePersons = [];
                        if ($existingBridgePersonsResult['success'] && is_array($existingBridgePersonsResult['data'])) {
                            $existingBridgePersons = $existingBridgePersonsResult['data'];
                        }
                        
                        foreach ($associatedPersons as $index => $person) {
                            // Ensure is_beneficial_owner is set correctly (true if ownership >= 25%)
                            $ownershipPercentage = $person['ownership_percentage'] ?? 0;
                            $person['is_beneficial_owner'] = $ownershipPercentage >= 25;
                            
                            // Ensure has_control and has_ownership are set
                            if (!isset($person['has_control'])) {
                                $person['has_control'] = true; // Control person (CEO, CFO, etc.)
                            }
                            if (!isset($person['has_ownership'])) {
                                $person['has_ownership'] = $ownershipPercentage > 0;
                            }
                            
                            // Ensure attested_ownership_structure_at is set
                            if (!isset($person['attested_ownership_structure_at'])) {
                                $person['attested_ownership_structure_at'] = now()->toIso8601String();
                            }
                            
                            // Check if person already exists in Bridge by email
                            $personEmail = $person['email'] ?? null;
                            $existingBridgePerson = null;
                            if ($personEmail) {
                                foreach ($existingBridgePersons as $existingPerson) {
                                    if (isset($existingPerson['email']) && strtolower(trim($existingPerson['email'])) === strtolower(trim($personEmail))) {
                                        $existingBridgePerson = $existingPerson;
                                        break;
                                    }
                                }
                            }
                            
                            // If person already exists in Bridge, skip creation
                            if ($existingBridgePerson && isset($existingBridgePerson['id'])) {
                                Log::info('Associated person already exists in Bridge - skipping creation', [
                                    'customer_id' => $integration->bridge_customer_id,
                                    'associated_person_id' => $existingBridgePerson['id'],
                                    'email' => $personEmail,
                                    'person_index' => $index,
                                ]);
                                continue; // Skip to next person
                            }
                            
                            Log::info('Creating associated person', [
                                'customer_id' => $integration->bridge_customer_id,
                                'person_index' => $index,
                                'name' => ($person['first_name'] ?? '') . ' ' . ($person['last_name'] ?? ''),
                                'is_beneficial_owner' => $person['is_beneficial_owner'],
                                'has_control' => $person['has_control'],
                                'ownership_percentage' => $ownershipPercentage,
                            ]);
                            
                            $personResult = $this->bridgeService->createAssociatedPerson(
                                $integration->bridge_customer_id,
                                $person
                            );
                            
                            if (!$personResult['success']) {
                                Log::error('Failed to create associated person', [
                                    'customer_id' => $integration->bridge_customer_id,
                                    'person_index' => $index,
                                    'error' => $personResult['error'] ?? 'Unknown error',
                                    'response' => $personResult['response'] ?? null,
                                ]);
                                // Don't throw - log and continue (associated person creation is not critical for customer update)
                            } else {
                                Log::info('Associated person created successfully', [
                                    'customer_id' => $integration->bridge_customer_id,
                                    'person_index' => $index,
                                    'person_id' => $personResult['data']['id'] ?? 'N/A',
                                ]);
                            }
                        }
                    }
                    
                    Log::info('Customer updated successfully', [
                        'customer_id' => $integration->bridge_customer_id,
                        'associated_persons_added' => !empty($associatedPersons),
                    ]);
                } else {
                    // Create new customer with Bridge
                    // Use createBusinessCustomer for business, createCustomerWithKycData for individual
                    if ($isOrgUser) {
                        $result = $this->bridgeService->createBusinessCustomer($customerData);
                    } else {
                        $result = $this->bridgeService->createCustomerWithKycData($customerData);
                    }

                    if (!$result['success']) {
                        Log::error('Bridge customer creation failed', [
                            'error' => $result['error'],
                            'response' => $result['response'] ?? null,
                            'type' => $isOrgUser ? 'business' : 'individual',
                        ]);
                        throw new \Exception($result['error'] ?? 'Failed to create customer');
                    }

                    $responseData = $result['data'];

                    // Update integration with new customer ID
                    $integration->bridge_customer_id = $responseData['id'] ?? null;
                }

                // For step === 'control_person', add associated person and create KYC link
                $controlPersonKycLink = null;
                if ($step === 'control_person' && $isOrgUser && isset($validated['control_person']) && !empty($integration->bridge_customer_id)) {
                    // Build associated person data if not already built
                    if (!isset($associatedPersonData)) {
                        $idFrontBase64 = $this->filePathToBase64($idFrontImagePath ?? null);
                        $idBackBase64 = $this->filePathToBase64($idBackImagePath ?? null);
                        
                        $associatedPersonData = [
                            'first_name' => $validated['control_person']['first_name'],
                            'last_name' => $validated['control_person']['last_name'],
                            'email' => $validated['control_person']['email'],
                            'birth_date' => $validated['control_person']['birth_date'],
                            'title' => $validated['control_person']['title'],
                            'ownership_percentage' => $validated['control_person']['ownership_percentage'],
                            'has_control' => true,
                            'has_ownership' => ($validated['control_person']['ownership_percentage'] ?? 0) >= 25,
                            'attested_ownership_structure_at' => now()->toIso8601String(),
                            'residential_address' => [
                                'street_line_1' => $validated['control_person']['street_line_1'],
                                'city' => $validated['control_person']['city'],
                                'subdivision' => $validated['control_person']['state'],
                                'postal_code' => $validated['control_person']['postal_code'],
                                'country' => $validated['control_person']['country'],
                            ],
                            'identifying_information' => [
                                [
                                    'type' => 'ssn',
                                    'issuing_country' => 'usa',
                                    'number' => $validated['control_person']['ssn'],
                                ],
                                [
                                    'type' => $validated['control_person']['id_type'],
                                    'issuing_country' => 'usa',
                                    'number' => $validated['control_person']['id_number'],
                                    'image_front' => $idFrontBase64,
                                    'image_back' => $idBackBase64,
                                ],
                            ],
                        ];
                    }
                    
                    // Add associated person (control person) to the business customer
                    $personResult = $this->bridgeService->createAssociatedPerson(
                        $integration->bridge_customer_id,
                        $associatedPersonData
                    );
                    
                    if (!$personResult['success']) {
                        Log::error('Failed to create associated person in control_person step', [
                            'customer_id' => $integration->bridge_customer_id,
                            'error' => $personResult['error'] ?? 'Unknown error',
                        ]);
                        throw new \Exception('Failed to create Control Person: ' . ($personResult['error'] ?? 'Unknown error'));
                    }
                    
                    // Create KYC link for control person
                    try {
                        $kycLinkResult = $this->bridgeService->createKYCLink([
                            'email' => $validated['control_person']['email'],
                            'full_name' => $validated['control_person']['first_name'] . ' ' . $validated['control_person']['last_name'],
                            'type' => 'individual',
                        ]);
                        
                        if ($kycLinkResult['success'] && isset($kycLinkResult['data']['url'])) {
                            $controlPersonKycLink = $kycLinkResult['data']['url'];
                        }
                    } catch (\Exception $e) {
                        Log::warning('Failed to create Control Person KYC link', ['error' => $e->getMessage()]);
                    }
                    
                    // Update metadata with step progress (for both new and existing customers)
                    $existingMetadata = $integration->bridge_metadata ?? [];
                    if (is_string($existingMetadata)) {
                        $existingMetadata = json_decode($existingMetadata, true) ?? [];
                    }
                    if (!is_array($existingMetadata)) {
                        $existingMetadata = [];
                    }
                    
                    $existingMetadata['control_person_email'] = $validated['control_person']['email'];
                    $existingMetadata['control_person_first_name'] = $validated['control_person']['first_name'];
                    $existingMetadata['control_person_last_name'] = $validated['control_person']['last_name'];
                    $existingMetadata['kyb_step'] = 'business_documents'; // Move to next step
                    if ($controlPersonKycLink) {
                        $existingMetadata['control_person_kyc_link'] = $controlPersonKycLink;
                    }
                    
                    $integration->bridge_metadata = $existingMetadata;
                    $integration->save();
                }
                
                // Set status based on customer type (use Bridge's actual status values)
                if ($isOrgUser) {
                    // Business customer - check kyb_status
                    // Bridge KYB statuses: not_started, incomplete, under_review, awaiting_questionnaire, awaiting_ubo, approved, rejected, paused, offboarded
                    $integration->kyb_status = $responseData['kyb_status'] ?? 'not_started';
                    // Business might also have kyc_status for control persons
                    if (isset($responseData['kyc_status'])) {
                        $integration->kyc_status = $responseData['kyc_status'];
                    }
                } else {
                    // Individual customer - check kyc_status
                    // Bridge KYC statuses: not_started, incomplete, under_review, awaiting_questionnaire, approved, rejected, paused, offboarded
                    $integration->kyc_status = $responseData['kyc_status'] ?? 'not_started';
                }

                $integration->tos_status = 'accepted';
                
                // Merge metadata while preserving existing signed_agreement_id if it exists
                $existingMetadata = $integration->bridge_metadata ?? [];
                if (!is_array($existingMetadata)) {
                    $existingMetadata = is_string($existingMetadata) ? json_decode($existingMetadata, true) : [];
                }
                
                $newMetadata = array_merge($existingMetadata, [
                    'customer_data' => $responseData,
                    'type' => $isOrgUser ? 'business' : 'individual',
                    'created_at' => now()->toIso8601String(),
                ]);
                
                // Store control person info and step progress for later use
                if ($step === 'control_person' && $isOrgUser && isset($validated['control_person'])) {
                    $newMetadata['control_person_email'] = $validated['control_person']['email'];
                    $newMetadata['control_person_first_name'] = $validated['control_person']['first_name'];
                    $newMetadata['control_person_last_name'] = $validated['control_person']['last_name'];
                    $newMetadata['kyb_step'] = 'business_documents'; // Move to next step
                    if ($controlPersonKycLink) {
                        $newMetadata['control_person_kyc_link'] = $controlPersonKycLink;
                    }
                } elseif ($step === 'business_documents' && $isOrgUser) {
                    $newMetadata['kyb_step'] = 'kyc_verification'; // Move to next step
                    $newMetadata['business_documents_submitted'] = true;
                    if ($kycLink) {
                        $newMetadata['control_person_kyc_link'] = $kycLink;
                    }
                }
                
                // Only set signed_agreement_id if we have one and it's not already set
                if ($signedAgreementId && !isset($existingMetadata['signed_agreement_id'])) {
                    $newMetadata['signed_agreement_id'] = $signedAgreementId;
                } elseif ($signedAgreementId) {
                    // Update it if we have a new one
                    $newMetadata['signed_agreement_id'] = $signedAgreementId;
                }
                
                $integration->bridge_metadata = $newMetadata;
                $integration->save();

                // Save KYC/KYB submission data to database (images already saved, just pass paths)
                // Note: For direct mode, images are already saved above, so saveKycKybSubmission will use the paths
                // For approval mode, saveKycKybSubmission will save images itself
                if ($isOrgUser) {
                    // Pass saved image paths to saveKycKybSubmission
                    if (!isset($validated['control_person'])) {
                        $validated['control_person'] = [];
                    }
                    $validated['control_person']['id_front_image_path'] = $idFrontImagePath ?? null;
                    $validated['control_person']['id_back_image_path'] = $idBackImagePath ?? null;
                } else {
                    $validated['id_front_image_path'] = $idFrontImagePath ?? null;
                    $validated['id_back_image_path'] = $idBackImagePath ?? null;
                }
                $this->saveKycKybSubmission($integration, $validated, $customerData, $responseData, $isOrgUser, true);

                DB::commit();

                // Return appropriate response based on step
                if ($step === 'control_person' && $isOrgUser) {
                    return response()->json([
                        'success' => true,
                        'message' => 'Control Person information submitted successfully.',
                        'data' => [
                            'customer_id' => $integration->bridge_customer_id,
                            'control_person_kyc_link' => $controlPersonKycLink,
                        ],
                    ]);
                }

                return response()->json([
                    'success' => true,
                    'message' => 'KYC data submitted successfully. Verification is pending.',
                    'data' => [
                        'customer_id' => $integration->bridge_customer_id,
                        'kyc_status' => $integration->kyc_status,
                        'kyb_status' => $integration->kyb_status,
                    ],
                ]);
            } catch (\Illuminate\Validation\ValidationException $e) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $e->errors(),
                ], 422);
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }
        } catch (\Exception $e) {
            Log::error('Create customer with KYC error', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to create customer: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get Control Person KYC link for business verification
     */
    public function getControlPersonKycLink(Request $request)
    {
        try {
            $validated = $request->validate([
                'control_person_email' => 'required|email',
            ]);

            $user = Auth::user();
            $isOrgUser = $user->hasRole(['organization', 'organization_pending']);

            if (!$isOrgUser) {
                return response()->json([
                    'success' => false,
                    'message' => 'This endpoint is only available for business accounts.',
                ], 403);
            }

            $organization = $user->organization;
            if (!$organization) {
                return response()->json(['success' => false, 'message' => 'Organization not found.'], 404);
            }

            $integration = BridgeIntegration::where('integratable_id', $organization->id)
                ->where('integratable_type', Organization::class)
                ->first();

            if (!$integration || !$integration->bridge_customer_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Business customer not found. Please complete Step 1: Control Person first.',
                ], 404);
            }

            // Get control person info from metadata
            $metadata = is_array($integration->bridge_metadata) 
                ? $integration->bridge_metadata 
                : json_decode($integration->bridge_metadata ?? '{}', true);
            
            $controlPersonEmail = $validated['control_person_email'];
            $controlPersonFirstName = $metadata['control_person_first_name'] ?? '';
            $controlPersonLastName = $metadata['control_person_last_name'] ?? '';
            $fullName = trim($controlPersonFirstName . ' ' . $controlPersonLastName);

            // Create KYC link for control person
            $kycLinkResult = $this->bridgeService->createKYCLink([
                'email' => $controlPersonEmail,
                'full_name' => $fullName ?: 'Control Person',
                'type' => 'individual',
            ]);

            if (!$kycLinkResult['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $kycLinkResult['error'] ?? 'Failed to create KYC link',
                ], 500);
            }

            $kycLink = $kycLinkResult['data']['url'] ?? null;

            // Convert to iframe URL
            $iframeUrl = null;
            if ($kycLink) {
                $iframeUrl = $this->bridgeService->convertKycLinkToWidgetUrl($kycLink);
            }

            if (!$kycLink) {
                return response()->json([
                    'success' => false,
                    'message' => 'KYC link not found in response',
                ], 500);
            }

            return response()->json([
                'success' => true,
                'message' => 'KYC link created successfully',
                'data' => [
                    'kyc_link' => $kycLink,
                    'iframe_kyc_link' => $iframeUrl,
                    'kyc_iframe_url' => $iframeUrl, // Alternative key for compatibility
                ],
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Get Control Person KYC link error', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to get KYC link: ' . $e->getMessage(),
            ], 500);
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
            $isOrgUser = $user->hasRole(['organization', 'organization_pending']);

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

            $integration = BridgeIntegration::with('primaryWallet')
                ->where('integratable_id', $entity->id)
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
            $isOrgUser = $user->hasRole(['organization', 'organization_pending']);

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
                // Create Bridge transfer if both sender and recipient have Bridge wallets
                // Per Bridge.xyz API: Use source/destination with payment_rail format
                $bridgeTransferId = null;
                if ($senderIntegration->bridge_wallet_id && $recipientIntegration && $recipientIntegration->bridge_wallet_id) {
                    try {
                        $transferResult = $this->bridgeService->createWalletToWalletTransfer(
                            $senderIntegration->bridge_customer_id,
                            $senderIntegration->bridge_wallet_id,
                            $recipientIntegration->bridge_customer_id,
                            $recipientIntegration->bridge_wallet_id,
                            $amount,
                            'USD'
                        );

                        if ($transferResult['success'] && isset($transferResult['data'])) {
                            $bridgeTransferId = $transferResult['data']['id'] ?? $transferResult['data']['transfer_id'] ?? null;
                            
                            Log::info('Bridge transfer created for send money', [
                                'transfer_id' => $bridgeTransferId,
                                'sender_customer_id' => $senderIntegration->bridge_customer_id,
                                'recipient_customer_id' => $recipientIntegration->bridge_customer_id,
                                'amount' => $amount,
                            ]);
                        } else {
                            Log::warning('Failed to create Bridge transfer', [
                                'error' => $transferResult['error'] ?? 'Unknown error',
                                'response' => $transferResult,
                            ]);
                        }
                    } catch (\Exception $e) {
                        Log::error('Exception creating Bridge transfer', [
                            'error' => $e->getMessage(),
                            'trace' => $e->getTraceAsString(),
                        ]);
                        // Continue with local transaction even if Bridge transfer fails
                    }
                }

                // Deduct from sender immediately
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
                        'bridge_customer_id' => $senderIntegration->bridge_customer_id,
                        'bridge_transfer_id' => $bridgeTransferId,
                        'recipient_name' => $recipientType === 'user' ? $recipient->name : $recipient->name,
                        'recipient_type' => $recipientType,
                        'recipient_bridge_wallet_id' => $recipientIntegration->bridge_wallet_id ?? null,
                        'recipient_bridge_customer_id' => $recipientIntegration->bridge_customer_id ?? null,
                    ],
                    'processed_at' => $bridgeTransferId ? null : now(), // Set when Bridge confirms
                ]);

                // Handle recipient balance and transaction
                // If using Bridge transfer, recipient balance will be added when webhook confirms
                // If not using Bridge transfer (recipient has no Bridge wallet), add balance immediately
                if (!$bridgeTransferId) {
                    // Recipient doesn't have Bridge wallet - add balance immediately (local transfer)
                    $recipientUser->increment('balance', $amount);
                }

                // Record recipient transaction (always create, even if pending)
                $recipientTransaction = $recipientUser->recordTransaction([
                    'type' => 'transfer_in',
                    'amount' => $amount,
                    'status' => $bridgeTransferId ? 'pending' : 'completed', // Pending if using Bridge transfer
                    'payment_method' => 'bridge',
                    'related_id' => $organization->id,
                    'related_type' => Organization::class,
                    'meta' => [
                        'bridge_wallet_id' => $recipientIntegration->bridge_wallet_id ?? null,
                        'bridge_customer_id' => $recipientIntegration->bridge_customer_id ?? null,
                        'bridge_transfer_id' => $bridgeTransferId,
                        'sender_organization_id' => $organization->id,
                        'sender_organization_name' => $organization->name,
                        'sender_bridge_wallet_id' => $senderIntegration->bridge_wallet_id,
                        'sender_bridge_customer_id' => $senderIntegration->bridge_customer_id,
                        'recipient_type' => $recipientType,
                    ],
                    'processed_at' => $bridgeTransferId ? null : now(), // Set when Bridge confirms via webhook
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

    /**
     * Get business details from Bridge
     */
    public function getBusinessDetails(Request $request)
    {
        try {
            $user = Auth::user();
            $organization = $user->organization;

            if (!$organization) {
                return response()->json([
                    'success' => false,
                    'message' => 'Organization not found',
                ], 404);
            }

            $integration = BridgeIntegration::where('integratable_id', $organization->id)
                ->where('integratable_type', Organization::class)
                ->first();

            if (!$integration || !$integration->bridge_customer_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bridge customer not found',
                ], 404);
            }

            // Get customer details
            $customerResult = $this->bridgeService->getCustomer($integration->bridge_customer_id);

            if (!$customerResult['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $customerResult['error'] ?? 'Failed to get customer',
                ], 500);
            }

            // Get associated persons (beneficial owners)
            $associatedPersonsResult = $this->bridgeService->getAssociatedPersons($integration->bridge_customer_id);

            $customer = $customerResult['data'];

            return response()->json([
                'success' => true,
                'data' => [
                    // Basic Info
                    'id' => $customer['id'] ?? null,
                    'type' => $customer['type'] ?? null,
                    'email' => $customer['email'] ?? null,
                    'business_legal_name' => $customer['business_legal_name'] ?? null,
                    'business_name' => $customer['business_name'] ?? $customer['first_name'] ?? null,
                    'business_type' => $customer['business_type'] ?? null,
                    'business_industry' => $customer['business_industry'] ?? null,
                    'business_description' => $customer['business_description'] ?? null,
                    'primary_website' => $customer['primary_website'] ?? $customer['website'] ?? null,
                    
                    // Status
                    'kyc_status' => $customer['kyc_status'] ?? null,
                    'kyb_status' => $customer['kyb_status'] ?? null,
                    'status' => $customer['status'] ?? null,
                    
                    // Address
                    'registered_address' => $customer['registered_address'] ?? $customer['business_address'] ?? null,
                    
                    // Endorsements (ToS status, requirements)
                    'endorsements' => $customer['endorsements'] ?? [],
                    
                    // Requirements
                    'requirements_due' => $customer['requirements_due'] ?? [],
                    
                    // Associated Persons (Beneficial Owners)
                    'associated_persons' => $associatedPersonsResult['data'] ?? ($customer['associated_persons'] ?? []),
                    'ultimate_beneficial_owners' => $customer['ultimate_beneficial_owners'] ?? [],
                    
                    // Timestamps
                    'created_at' => $customer['created_at'] ?? null,
                    'updated_at' => $customer['updated_at'] ?? null,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Get business details error', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to get business details',
            ], 500);
        }
    }

    /**
     * Convert file path to base64 data URL for Bridge API
     * 
     * @param string|null $filePath Storage path relative to storage/app/public
     * @return string|null Base64 data URL or null if file doesn't exist
     */
    protected function filePathToBase64(?string $filePath): ?string
    {
        if (empty($filePath)) {
            return null;
        }

        try {
            $fullPath = storage_path('app/public/' . $filePath);
            if (!file_exists($fullPath)) {
                Log::warning('Image file not found for base64 conversion', ['path' => $fullPath]);
                return null;
            }

            $imageData = file_get_contents($fullPath);
            if ($imageData === false) {
                Log::error('Failed to read image file', ['path' => $fullPath]);
                return null;
            }

            $mimeType = $this->getMimeTypeFromPath($filePath);
            return "data:{$mimeType};base64," . base64_encode($imageData);
        } catch (\Exception $e) {
            Log::error('Failed to convert file to base64', [
                'path' => $filePath,
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * Save base64 image to storage and return the storage path
     * 
     * @param string $base64Data Base64 encoded image data (without data:image/... prefix)
     * @param string $directory Directory within storage/app/public
     * @param string $filename Optional filename, will generate if not provided
     * @return string|null Storage path relative to storage/app/public, or null on failure
     */
    protected function saveBase64Image(string $base64Data, string $directory = 'bridge/documents', ?string $filename = null): ?string
    {
        try {
            if (empty($base64Data)) {
                return null;
            }

            // Detect file type from base64 data URL
            $fileExtension = 'jpg'; // default
            $mimeType = null;
            
            // Check if it's a data URL with MIME type
            if (preg_match('/^data:([^;]+);base64,/', $base64Data, $matches)) {
                $mimeType = $matches[1];
                
                // Map MIME types to file extensions
                $mimeToExtension = [
                    'image/jpeg' => 'jpg',
                    'image/jpg' => 'jpg',
                    'image/png' => 'png',
                    'image/gif' => 'gif',
                    'image/webp' => 'webp',
                    'application/pdf' => 'pdf',
                    'image/pdf' => 'pdf', // Some systems use this
                ];
                
                if (isset($mimeToExtension[$mimeType])) {
                    $fileExtension = $mimeToExtension[$mimeType];
                } elseif (strpos($mimeType, 'image/') === 0) {
                    // Generic image type, try to extract from MIME
                    $parts = explode('/', $mimeType);
                    if (count($parts) > 1) {
                        $fileExtension = $parts[1];
                    }
                } elseif (strpos($mimeType, 'pdf') !== false) {
                    $fileExtension = 'pdf';
                }
            }
            
            // Remove data URL prefix if present
            $base64Data = preg_replace('/^data:[^;]+;base64,/', '', $base64Data);
            
            // Decode base64
            $imageData = base64_decode($base64Data, true);
            if ($imageData === false) {
                Log::error('Failed to decode base64 image data');
                return null;
            }

            // Generate filename if not provided, using detected extension
            if (!$filename) {
                $filename = uniqid('doc_', true) . '.' . $fileExtension;
            } else {
                // If filename provided but doesn't have extension, add detected one
                if (!preg_match('/\.(jpg|jpeg|png|gif|webp|pdf)$/i', $filename)) {
                    $filename = pathinfo($filename, PATHINFO_FILENAME) . '.' . $fileExtension;
                }
            }

            // Ensure directory exists
            $fullPath = $directory . '/' . $filename;
            Storage::disk('public')->makeDirectory($directory);

            // Save file
            Storage::disk('public')->put($fullPath, $imageData);

            Log::info('Base64 file saved to storage', [
                'path' => $fullPath,
                'mime_type' => $mimeType,
                'extension' => $fileExtension,
                'size' => strlen($imageData),
            ]);

            return $fullPath;
        } catch (\Exception $e) {
            Log::error('Failed to save base64 image', [
                'error' => $e->getMessage(),
                'directory' => $directory,
            ]);
            return null;
        }
    }

    /**
     * Get MIME type from a stored file path (by extension).
     */
    protected function getMimeTypeFromPath(string $path): string
    {
        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        return match ($extension) {
            'pdf' => 'application/pdf',
            'png' => 'image/png',
            'jpg', 'jpeg' => 'image/jpeg',
            'gif' => 'image/gif',
            'webp' => 'image/webp',
            default => 'application/octet-stream',
        };
    }

    /**
     * Save KYC/KYB submission data to database and upload documents
     * 
     * @param BridgeIntegration $integration
     * @param array $validated Validated form data
     * @param array $customerData Data sent to Bridge API
     * @param array $responseData Response from Bridge API
     * @param bool $isOrgUser Whether this is an organization user
     */
    protected function saveKycKybSubmission(
        BridgeIntegration $integration,
        array $validated,
        array $customerData,
        array $responseData,
        bool $isOrgUser,
        bool $sentToBridge = true
    ): void {
        try {
            // Upload ID images to storage (only if not already saved)
            $idFrontImagePath = null;
            $idBackImagePath = null;

            // Check if images are already saved (from direct mode submission)
            if ($isOrgUser) {
                // Business (KYB) - check if paths are already provided
                if (!empty($validated['control_person']['id_front_image_path'])) {
                    $idFrontImagePath = $validated['control_person']['id_front_image_path'];
                } elseif (!empty($validated['control_person']['id_front_image'])) {
                    // Save from base64 if path not provided
                    $fileIdentifier = $integration->bridge_customer_id ?? ('integration_' . $integration->id);
                    $idFrontImagePath = $this->saveBase64Image(
                        $validated['control_person']['id_front_image'],
                        'bridge/kyb/documents',
                        'id_front_' . $fileIdentifier . '_' . time()
                    );
                }
                
                if (!empty($validated['control_person']['id_back_image_path'])) {
                    $idBackImagePath = $validated['control_person']['id_back_image_path'];
                } elseif (!empty($validated['control_person']['id_back_image'])) {
                    // Save from base64 if path not provided
                    $fileIdentifier = $integration->bridge_customer_id ?? ('integration_' . $integration->id);
                    $idBackImagePath = $this->saveBase64Image(
                        $validated['control_person']['id_back_image'],
                        'bridge/kyb/documents',
                        'id_back_' . $fileIdentifier . '_' . time()
                    );
                }
            } else {
                // Individual (KYC) - check if paths are already provided
                if (!empty($validated['id_front_image_path'])) {
                    $idFrontImagePath = $validated['id_front_image_path'];
                } elseif (!empty($validated['id_front_image'])) {
                    // Save from base64 if path not provided
                    $fileIdentifier = $integration->bridge_customer_id ?? ('integration_' . $integration->id);
                    $idFrontImagePath = $this->saveBase64Image(
                        $validated['id_front_image'],
                        'bridge/kyc/documents',
                        'id_front_' . $fileIdentifier . '_' . time()
                    );
                }
                
                if (!empty($validated['id_back_image_path'])) {
                    $idBackImagePath = $validated['id_back_image_path'];
                } elseif (!empty($validated['id_back_image'])) {
                    // Save from base64 if path not provided
                    $fileIdentifier = $integration->bridge_customer_id ?? ('integration_' . $integration->id);
                    $idBackImagePath = $this->saveBase64Image(
                        $validated['id_back_image'],
                        'bridge/kyc/documents',
                        'id_back_' . $fileIdentifier . '_' . time()
                    );
                }
            }

            // Prepare submission data (simplified - only essential fields)
            // Bridge KYC/KYB statuses: not_started, incomplete, under_review, awaiting_questionnaire, awaiting_ubo, approved, rejected, paused, offboarded
            $submissionData = [
                'bridge_integration_id' => $integration->id,
                'type' => $isOrgUser ? 'kyb' : 'kyc',
                'submission_status' => $sentToBridge ? 'under_review' : 'not_started',
                'ein' => $validated['ein'] ?? null,
                'bridge_customer_id' => $integration->bridge_customer_id,
                'bridge_response' => $sentToBridge ? $responseData : null,
                'submission_data' => [], // Store only metadata, not business/control person data
            ];

            // Add business-specific metadata to submission_data (not as columns)
            if ($isOrgUser) {
                // Store Standard KYB Requirements in submission_data
                $submissionData['submission_data'] = [
                    'entity_type' => $validated['entity_type'] ?? null,
                    'dao_status' => $validated['dao_status'] ?? false,
                    'business_description' => $validated['business_description'] ?? null,
                    'primary_website' => $validated['primary_website'] ?? null,
                    'business_industry' => $validated['business_industry'] ?? null,
                    'source_of_funds' => $validated['source_of_funds'] ?? null,
                    'annual_revenue' => $validated['annual_revenue'] ?? null,
                    'transaction_volume' => $validated['transaction_volume'] ?? null,
                    'account_purpose' => $validated['account_purpose'] ?? null,
                    'high_risk_activities' => $validated['high_risk_activities'] ?? null,
                    'high_risk_geographies' => $validated['high_risk_geographies'] ?? null,
                    'physical_address' => $validated['physical_address'] ?? null,
                ];
            } else {
                // Individual (KYC) - store in submission_data
                $submissionData['submission_data'] = [
                    'first_name' => $validated['first_name'] ?? null,
                    'last_name' => $validated['last_name'] ?? null,
                    'email' => $validated['email'] ?? null,
                    'birth_date' => $validated['birth_date'] ?? null,
                    'residential_address' => $customerData['residential_address'] ?? null,
                    'identifying_information' => $customerData['identifying_information'] ?? null,
                ];
            }

            // Find existing submission for control person step (KYB)
            $existingSubmission = null;
            if ($isOrgUser) {
                $existingSubmission = BridgeKycKybSubmission::where('bridge_integration_id', $integration->id)
                    ->where('type', 'kyb')
                    ->latest()
                    ->first();
            }

            if ($existingSubmission) {
                // Update existing submission
                $existingSubmissionData = $existingSubmission->submission_data ?? [];
                if (is_string($existingSubmissionData)) {
                    $existingSubmissionData = json_decode($existingSubmissionData, true) ?? [];
                }
                
                // Merge submission_data
                if (isset($submissionData['submission_data']) && is_array($submissionData['submission_data'])) {
                    $submissionData['submission_data'] = array_merge($existingSubmissionData, $submissionData['submission_data']);
                } else {
                    $submissionData['submission_data'] = $existingSubmissionData;
                }
                
                // Clear requested_fields and refill_message after successful submission
                unset($submissionData['submission_data']['requested_fields']);
                unset($submissionData['submission_data']['refill_message']);
                unset($submissionData['submission_data']['refill_requested_at']);
                unset($submissionData['submission_data']['refill_requested_by']);
                
                // Update existing submission (only essential fields)
                $existingSubmission->fill([
                    'submission_status' => $submissionData['submission_status'] ?? $existingSubmission->submission_status,
                    'ein' => $submissionData['ein'] ?? $existingSubmission->ein,
                    'bridge_customer_id' => $submissionData['bridge_customer_id'] ?? $existingSubmission->bridge_customer_id,
                    'bridge_response' => $submissionData['bridge_response'] ?? $existingSubmission->bridge_response,
                    'submission_data' => $submissionData['submission_data'],
                ]);
                $existingSubmission->save();
                
                // Save or update ID documents in separate table (preserve approved documents)
                if ($idFrontImagePath) {
                    VerificationDocument::updateOrCreate(
                        [
                            'bridge_kyc_kyb_submission_id' => $existingSubmission->id,
                            'document_type' => 'id_front',
                        ],
                        [
                            'file_path' => $idFrontImagePath,
                            'status' => 'pending', // Reset to pending when re-uploaded
                            'rejection_reason' => null,
                            'rejected_at' => null,
                            'rejected_by' => null,
                        ]
                    );
                }
                
                if ($idBackImagePath) {
                    VerificationDocument::updateOrCreate(
                        [
                            'bridge_kyc_kyb_submission_id' => $existingSubmission->id,
                            'document_type' => 'id_back',
                        ],
                        [
                            'file_path' => $idBackImagePath,
                            'status' => 'pending', // Reset to pending when re-uploaded
                            'rejection_reason' => null,
                            'rejected_at' => null,
                            'rejected_by' => null,
                        ]
                    );
                }
                
                // Save or update control person to control_persons table
                if ($isOrgUser && !empty($validated['control_person'])) {
                    $controlPersonData = $validated['control_person'];
                    \App\Models\ControlPerson::updateOrCreate(
                        [
                            'bridge_kyc_kyb_submission_id' => $existingSubmission->id,
                        ],
                        [
                            'first_name' => $controlPersonData['first_name'] ?? null,
                            'last_name' => $controlPersonData['last_name'] ?? null,
                            'email' => $controlPersonData['email'] ?? null,
                            'birth_date' => $controlPersonData['birth_date'] ?? null,
                            'ssn' => $controlPersonData['ssn'] ?? null,
                            'title' => $controlPersonData['title'] ?? null,
                            'ownership_percentage' => $controlPersonData['ownership_percentage'] ?? null,
                            'street_line_1' => $controlPersonData['street_line_1'] ?? null,
                            'city' => $controlPersonData['city'] ?? null,
                            'state' => $controlPersonData['state'] ?? null,
                            'postal_code' => $controlPersonData['postal_code'] ?? null,
                            'country' => $controlPersonData['country'] ?? 'USA',
                            'id_type' => $controlPersonData['id_type'] ?? null,
                            'id_number' => $controlPersonData['id_number'] ?? null,
                            'bridge_associated_person_id' => $controlPersonData['bridge_associated_person_id'] ?? null,
                        ]
                    );
                    
                    // Save ID images to verification_documents (linked to control person via submission)
                    if ($idFrontImagePath) {
                        VerificationDocument::updateOrCreate(
                            [
                                'bridge_kyc_kyb_submission_id' => $existingSubmission->id,
                                'document_type' => 'id_front',
                            ],
                            [
                                'file_path' => $idFrontImagePath,
                                'status' => 'pending',
                            ]
                        );
                    }
                    if ($idBackImagePath) {
                        VerificationDocument::updateOrCreate(
                            [
                                'bridge_kyc_kyb_submission_id' => $existingSubmission->id,
                                'document_type' => 'id_back',
                            ],
                            [
                                'file_path' => $idBackImagePath,
                                'status' => 'pending',
                            ]
                        );
                    }
                }
            } else {
                // Create new submission record (simplified)
                $submission = BridgeKycKybSubmission::create($submissionData);
                
                // Save ID documents in separate table
                if ($idFrontImagePath) {
                    VerificationDocument::create([
                        'bridge_kyc_kyb_submission_id' => $submission->id,
                        'document_type' => 'id_front',
                        'file_path' => $idFrontImagePath,
                        'status' => 'pending',
                    ]);
                }
                
                if ($idBackImagePath) {
                    VerificationDocument::create([
                        'bridge_kyc_kyb_submission_id' => $submission->id,
                        'document_type' => 'id_back',
                        'file_path' => $idBackImagePath,
                        'status' => 'pending',
                    ]);
                }
                
                // Save control person to control_persons table (for KYB)
                if ($isOrgUser && !empty($validated['control_person'])) {
                    $controlPersonData = $validated['control_person'];
                    $controlPerson = \App\Models\ControlPerson::create([
                        'bridge_kyc_kyb_submission_id' => $submission->id,
                        'first_name' => $controlPersonData['first_name'] ?? null,
                        'last_name' => $controlPersonData['last_name'] ?? null,
                        'email' => $controlPersonData['email'] ?? null,
                        'birth_date' => $controlPersonData['birth_date'] ?? null,
                        'ssn' => $controlPersonData['ssn'] ?? null,
                        'title' => $controlPersonData['title'] ?? null,
                        'ownership_percentage' => $controlPersonData['ownership_percentage'] ?? null,
                        'street_line_1' => $controlPersonData['street_line_1'] ?? null,
                        'city' => $controlPersonData['city'] ?? null,
                        'state' => $controlPersonData['state'] ?? null,
                        'postal_code' => $controlPersonData['postal_code'] ?? null,
                        'country' => $controlPersonData['country'] ?? 'USA',
                        'id_type' => $controlPersonData['id_type'] ?? null,
                        'id_number' => $controlPersonData['id_number'] ?? null,
                        'bridge_associated_person_id' => $controlPersonData['bridge_associated_person_id'] ?? null,
                    ]);
                    
                    // ID images are already saved above to verification_documents
                }
            }

            Log::info('KYC/KYB submission saved to database', [
                'bridge_integration_id' => $integration->id,
                'type' => $isOrgUser ? 'kyb' : 'kyc',
                'customer_id' => $integration->bridge_customer_id,
                'id_front_image_path' => $idFrontImagePath,
                'id_back_image_path' => $idBackImagePath,
            ]);
        } catch (\Exception $e) {
            // Log error but don't fail the entire request
            Log::error('Failed to save KYC/KYB submission to database', [
                'error' => $e->getMessage(),
                'bridge_integration_id' => $integration->id,
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }

    /**
     * Get document statuses from VerificationDocument table
     * 
     * @param BridgeKycKybSubmission $submission
     * @return array
     */
    protected function getDocumentStatuses(BridgeKycKybSubmission $submission): array
    {
        $statuses = [];
        $rejectionReasons = [];
        
        // Get all verification documents for this submission
        $documents = $submission->verificationDocuments()->get();
        
        foreach ($documents as $doc) {
            $statuses[$doc->document_type] = $doc->status;
            
            if ($doc->rejection_reason) {
                $rejectionReasons[$doc->document_type . '_rejection_reason'] = $doc->rejection_reason;
            }
            if ($doc->rejected_at) {
                $statuses[$doc->document_type . '_rejected_at'] = $doc->rejected_at->toIso8601String();
            }
            if ($doc->rejected_by) {
                $statuses[$doc->document_type . '_rejected_by'] = $doc->rejected_by;
            }
            if ($doc->approval_notes) {
                $statuses[$doc->document_type . '_approval_notes'] = $doc->approval_notes;
            }
            if ($doc->approved_at) {
                $statuses[$doc->document_type . '_approved_at'] = $doc->approved_at->toIso8601String();
            }
            if ($doc->approved_by) {
                $statuses[$doc->document_type . '_approved_by'] = $doc->approved_by;
            }
        }
        
        // Merge rejection reasons into statuses array
        return array_merge($statuses, $rejectionReasons);
    }

    /**
     * Create virtual account for USD deposits to Bridge wallet
     * This provides bank account details for manual transfers
     */
    public function createVirtualAccountForWallet(Request $request)
    {
        try {
            $user = Auth::user();
            $isOrgUser = $user->hasRole(['organization', 'organization_pending']);

            $entity = $isOrgUser ? $user->organization : $user;
            $entityType = $isOrgUser ? Organization::class : User::class;

            $integration = BridgeIntegration::with('primaryWallet')
                ->where('integratable_id', $entity->id)
                ->where('integratable_type', $entityType)
                ->first();

            if (!$integration || !$integration->bridge_customer_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bridge integration not found. Please initialize Bridge first.',
                ], 404);
            }

            // Get wallet ID from request or use primary wallet
            $walletId = $request->input('wallet_id');
            $chain = $request->input('chain', 'solana');
            
            if (!$walletId) {
                // Get primary wallet
                $wallet = \App\Models\BridgeWallet::where('bridge_integration_id', $integration->id)
                    ->where('is_primary', true)
                    ->first();
                
                if (!$wallet) {
                    return response()->json([
                        'success' => false,
                        'message' => 'No wallet found. Please create a wallet first.',
                    ], 404);
                }
                
                $walletId = $wallet->bridge_wallet_id;
            }

            // Check if virtual account already exists for this wallet
            $existingVirtualAccounts = $this->bridgeService->getVirtualAccounts($integration->bridge_customer_id);
            
            if ($existingVirtualAccounts['success'] && !empty($existingVirtualAccounts['data'])) {
                $virtualAccounts = is_array($existingVirtualAccounts['data']) && isset($existingVirtualAccounts['data']['data'])
                    ? $existingVirtualAccounts['data']['data']
                    : (is_array($existingVirtualAccounts['data']) ? $existingVirtualAccounts['data'] : []);
                
                // Check if virtual account exists for this wallet
                foreach ($virtualAccounts as $va) {
                    if (isset($va['destination']['bridge_wallet_id']) && $va['destination']['bridge_wallet_id'] === $walletId) {
                        return response()->json([
                            'success' => true,
                            'message' => 'Virtual account already exists',
                            'data' => $va,
                        ]);
                    }
                }
            }

            // Create virtual account
            // For chain wallets, use chain-specific method
            if ($chain !== 'usd' && $chain !== 'USD') {
                $result = $this->bridgeService->createVirtualAccountForChainWallet(
                    $integration->bridge_customer_id,
                    $walletId,
                    $chain
                );
            } else {
                // For USD accounts
                $result = $this->bridgeService->createVirtualAccountForWallet(
                    $integration->bridge_customer_id,
                    $walletId,
                    'USD'
                );
            }

            if (!$result['success']) {
                throw new \Exception($result['error'] ?? 'Failed to create virtual account');
            }

            $virtualAccountData = $result['data'];
            
            // Update wallet record with virtual account info
            $wallet = \App\Models\BridgeWallet::where('bridge_wallet_id', $walletId)
                ->where('bridge_integration_id', $integration->id)
                ->first();
            
            if ($wallet) {
                $wallet->virtual_account_id = $virtualAccountData['id'] ?? null;
                $wallet->virtual_account_details = $virtualAccountData;
                $wallet->save();
            }

            return response()->json([
                'success' => true,
                'message' => 'Virtual account created successfully',
                'data' => $virtualAccountData,
            ]);
        } catch (\Exception $e) {
            Log::error('Virtual account creation error', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to create virtual account: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get virtual accounts for the current user/organization
     */
    public function getVirtualAccounts(Request $request)
    {
        try {
            $user = Auth::user();
            $isOrgUser = $user->hasRole(['organization', 'organization_pending']);

            $entity = $isOrgUser ? $user->organization : $user;
            $entityType = $isOrgUser ? Organization::class : User::class;

            $integration = BridgeIntegration::with('primaryWallet')
                ->where('integratable_id', $entity->id)
                ->where('integratable_type', $entityType)
                ->first();

            if (!$integration || !$integration->bridge_customer_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bridge integration not found.',
                ], 404);
            }

            $result = $this->bridgeService->getVirtualAccounts($integration->bridge_customer_id);

            if (!$result['success']) {
                throw new \Exception($result['error'] ?? 'Failed to get virtual accounts');
            }

            return response()->json([
                'success' => true,
                'data' => $result['data'],
            ]);
        } catch (\Exception $e) {
            Log::error('Get virtual accounts error', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to get virtual accounts: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Create transfer from external account to Bridge wallet (for USD top-up)
     */
    public function createTransferFromExternalAccount(Request $request)
    {
        try {
            $user = Auth::user();
            $isOrgUser = $user->hasRole(['organization', 'organization_pending']);

            $entity = $isOrgUser ? $user->organization : $user;
            $entityType = $isOrgUser ? Organization::class : User::class;

            $integration = BridgeIntegration::with('primaryWallet')
                ->where('integratable_id', $entity->id)
                ->where('integratable_type', $entityType)
                ->first();

            if (!$integration || !$integration->bridge_customer_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bridge integration not found.',
                ], 404);
            }

            $validated = $request->validate([
                'external_account_id' => 'required|string',
                'wallet_id' => 'required|string',
                'amount' => 'required|numeric|min:0.01',
                'currency' => 'nullable|string|in:USD,usd',
            ]);

            $result = $this->bridgeService->createTransferFromExternalAccount(
                $integration->bridge_customer_id,
                $validated['external_account_id'],
                $validated['wallet_id'],
                (float) $validated['amount'],
                $validated['currency'] ?? 'USD'
            );

            if (!$result['success']) {
                throw new \Exception($result['error'] ?? 'Failed to create transfer');
            }

            return response()->json([
                'success' => true,
                'message' => 'Transfer initiated successfully',
                'data' => $result['data'],
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Transfer from external account error', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to create transfer: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get external accounts (bank accounts) for the current user/organization
     */
    public function getExternalAccounts(Request $request)
    {
        try {
            $user = Auth::user();
            $isOrgUser = $user->hasRole(['organization', 'organization_pending']);

            $entity = $isOrgUser ? $user->organization : $user;
            $entityType = $isOrgUser ? Organization::class : User::class;

            $integration = BridgeIntegration::with('primaryWallet')
                ->where('integratable_id', $entity->id)
                ->where('integratable_type', $entityType)
                ->first();

            if (!$integration || !$integration->bridge_customer_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bridge integration not found.',
                ], 404);
            }

            $result = $this->bridgeService->getExternalAccounts($integration->bridge_customer_id);

            if (!$result['success']) {
                throw new \Exception($result['error'] ?? 'Failed to get external accounts');
            }

            return response()->json([
                'success' => true,
                'data' => $result['data'],
            ]);
        } catch (\Exception $e) {
            Log::error('Get external accounts error', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to get external accounts: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Create external account (link bank account)
     */
    public function createExternalAccount(Request $request)
    {
        try {
            $user = Auth::user();
            $isOrgUser = $user->hasRole(['organization', 'organization_pending']);

            $entity = $isOrgUser ? $user->organization : $user;
            $entityType = $isOrgUser ? Organization::class : User::class;

            $integration = BridgeIntegration::with('primaryWallet')
                ->where('integratable_id', $entity->id)
                ->where('integratable_type', $entityType)
                ->first();

            if (!$integration || !$integration->bridge_customer_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bridge integration not found.',
                ], 404);
            }

            $validated = $request->validate([
                'account_data' => 'required|array',
                'account_data.routing_number' => 'required|string',
                'account_data.account_number' => 'required|string',
                'account_data.account_type' => 'required|string|in:checking,savings',
                'account_data.account_holder_name' => 'required|string',
            ]);

            $result = $this->bridgeService->createExternalAccount(
                $integration->bridge_customer_id,
                $validated['account_data']
            );

            if (!$result['success']) {
                throw new \Exception($result['error'] ?? 'Failed to create external account');
            }

            return response()->json([
                'success' => true,
                'message' => 'External account linked successfully',
                'data' => $result['data'],
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Create external account error', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to create external account: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get deposit instructions (bank details) for virtual account
     */
    public function getDepositInstructions(Request $request)
    {
        try {
            $user = Auth::user();
            $isOrgUser = $user->hasRole(['organization', 'organization_pending']);

            $entity = $isOrgUser ? $user->organization : $user;
            $entityType = $isOrgUser ? Organization::class : User::class;

            Log::info('Fetching deposit instructions', [
                'user_id' => $user->id,
                'is_org_user' => $isOrgUser,
                'entity_id' => $entity->id,
                'entity_type' => $entityType,
                'entity_name' => $isOrgUser ? ($entity->name ?? 'N/A') : ($entity->name ?? 'N/A'),
            ]);

            // Explicitly query with both integratable_id and integratable_type to ensure we get the correct integration
            $integration = BridgeIntegration::with(['primaryWallet' => function($query) {
                $query->where('is_primary', true);
            }])
                ->where('integratable_id', $entity->id)
                ->where('integratable_type', $entityType)
                ->first();

            if (!$integration || !$integration->bridge_customer_id) {
                Log::warning('Bridge integration not found for deposit instructions', [
                    'entity_id' => $entity->id,
                    'entity_type' => $entityType,
                    'user_id' => $user->id,
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Bridge integration not found. Please initialize Bridge first.',
                ], 404);
            }

            Log::info('Found Bridge integration', [
                'integration_id' => $integration->id,
                'customer_id' => $integration->bridge_customer_id,
                'entity_id' => $entity->id,
            ]);

            // Get primary wallet - explicitly query to ensure it belongs to this integration
            $primaryWallet = BridgeWallet::where('bridge_integration_id', $integration->id)
                ->where('is_primary', true)
                ->first();
            
            if (!$primaryWallet) {
                Log::warning('No primary wallet found for deposit instructions', [
                    'integration_id' => $integration->id,
                    'customer_id' => $integration->bridge_customer_id,
                    'entity_id' => $entity->id,
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'No wallet found. Please create a wallet/virtual account first.',
                ], 404);
            }

            Log::info('Found primary wallet', [
                'wallet_id' => $primaryWallet->id,
                'integration_id' => $primaryWallet->bridge_integration_id,
                'customer_id' => $primaryWallet->bridge_customer_id,
                'virtual_account_id' => $primaryWallet->virtual_account_id,
                'has_virtual_account_details' => !empty($primaryWallet->virtual_account_details),
            ]);

            // Verify wallet belongs to correct integration and customer
            if ($primaryWallet->bridge_integration_id !== $integration->id) {
                Log::error('Wallet integration mismatch', [
                    'wallet_integration_id' => $primaryWallet->bridge_integration_id,
                    'expected_integration_id' => $integration->id,
                    'wallet_id' => $primaryWallet->id,
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Wallet does not belong to this organization.',
                ], 403);
            }

            if ($primaryWallet->bridge_customer_id !== $integration->bridge_customer_id) {
                Log::error('Wallet customer mismatch', [
                    'wallet_customer_id' => $primaryWallet->bridge_customer_id,
                    'expected_customer_id' => $integration->bridge_customer_id,
                    'wallet_id' => $primaryWallet->id,
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Wallet does not belong to this customer.',
                ], 403);
            }

            // Check if we have virtual account details stored
            $virtualAccountDetails = $primaryWallet->virtual_account_details;
            
            // Parse JSON string if needed
            if (is_string($virtualAccountDetails)) {
                $virtualAccountDetails = json_decode($virtualAccountDetails, true) ?? [];
            }
            
            if (!$virtualAccountDetails || !is_array($virtualAccountDetails) || empty($virtualAccountDetails)) {
                // Try to fetch from Bridge API if we have virtual_account_id
                if ($primaryWallet->virtual_account_id) {
                    Log::info('Fetching virtual account details from Bridge API', [
                        'customer_id' => $integration->bridge_customer_id,
                        'virtual_account_id' => $primaryWallet->virtual_account_id,
                        'wallet_id' => $primaryWallet->id,
                    ]);
                    
                    $virtualAccountResult = $this->bridgeService->getVirtualAccount(
                        $integration->bridge_customer_id,
                        $primaryWallet->virtual_account_id
                    );
                    
                    if ($virtualAccountResult['success'] && isset($virtualAccountResult['data'])) {
                        $virtualAccountDetails = $virtualAccountResult['data'];
                        
                        // Verify the virtual account belongs to the correct customer
                        $virtualAccountCustomerId = $virtualAccountDetails['customer_id'] ?? null;
                        if ($virtualAccountCustomerId && $virtualAccountCustomerId !== $integration->bridge_customer_id) {
                            Log::error('Virtual account customer mismatch from Bridge API', [
                                'virtual_account_customer_id' => $virtualAccountCustomerId,
                                'expected_customer_id' => $integration->bridge_customer_id,
                                'virtual_account_id' => $primaryWallet->virtual_account_id,
                            ]);
                            return response()->json([
                                'success' => false,
                                'message' => 'Virtual account does not belong to this customer.',
                            ], 403);
                        }
                        
                        // Update stored details
                        $primaryWallet->virtual_account_details = $virtualAccountDetails;
                        $primaryWallet->save();
                        
                        Log::info('Virtual account details fetched and saved', [
                            'wallet_id' => $primaryWallet->id,
                            'virtual_account_id' => $primaryWallet->virtual_account_id,
                            'has_deposit_instructions' => isset($virtualAccountDetails['source_deposit_instructions']),
                        ]);
                    } else {
                        Log::error('Failed to fetch virtual account from Bridge', [
                            'customer_id' => $integration->bridge_customer_id,
                            'virtual_account_id' => $primaryWallet->virtual_account_id,
                            'error' => $virtualAccountResult['error'] ?? 'Unknown error',
                        ]);
                        return response()->json([
                            'success' => false,
                            'message' => 'Failed to fetch virtual account details from Bridge.',
                        ], 404);
                    }
                } else {
                    Log::warning('No virtual account ID found', [
                        'wallet_id' => $primaryWallet->id,
                        'integration_id' => $integration->id,
                    ]);
                    return response()->json([
                        'success' => false,
                        'message' => 'No virtual account found. Please create a virtual account first.',
                    ], 404);
                }
            }

            // Extract deposit instructions
            $depositInstructions = $virtualAccountDetails['source_deposit_instructions'] ?? null;
            
            if (!$depositInstructions) {
                Log::warning('Deposit instructions not found in virtual account details', [
                    'wallet_id' => $primaryWallet->id,
                    'virtual_account_id' => $primaryWallet->virtual_account_id,
                    'virtual_account_details_keys' => is_array($virtualAccountDetails) ? array_keys($virtualAccountDetails) : [],
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Deposit instructions not available for this virtual account.',
                ], 404);
            }

            Log::info('Deposit instructions retrieved successfully', [
                'wallet_id' => $primaryWallet->id,
                'virtual_account_id' => $primaryWallet->virtual_account_id,
                'customer_id' => $integration->bridge_customer_id,
                'entity_id' => $entity->id,
                'has_payment_rails' => isset($depositInstructions['payment_rails']),
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'deposit_instructions' => $depositInstructions,
                    'virtual_account_id' => $primaryWallet->virtual_account_id,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Get deposit instructions error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'user_id' => Auth::id(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to get deposit instructions: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Generate QR code for deposit instructions (receive money)
     * 
     * Creates a QR code containing bank account details for easy sharing
     * Works for both sandbox and live environments
     */
    public function getDepositQrCode(Request $request)
    {
        try {
            $user = Auth::user();
            $isOrgUser = $user->hasRole(['organization', 'organization_pending']);

            $entity = $isOrgUser ? $user->organization : $user;
            $entityType = $isOrgUser ? Organization::class : User::class;

            // Get integration
            $integration = BridgeIntegration::where('integratable_id', $entity->id)
                ->where('integratable_type', $entityType)
                ->first();

            if (!$integration || !$integration->bridge_customer_id) {
                // Return error QR code image instead of JSON (using SVG format - no imagick required)
                $errorQr = QrCode::format('svg')
                    ->size(300)
                    ->margin(2)
                    ->generate('Error: Bridge integration not found');
                return response($errorQr, 200, ['Content-Type' => 'image/svg+xml']);
            }

            // Get primary wallet
            $primaryWallet = BridgeWallet::where('bridge_integration_id', $integration->id)
                ->where('is_primary', true)
                ->first();
            
            if (!$primaryWallet || !$primaryWallet->virtual_account_id) {
                // Return error QR code image instead of JSON (using SVG format - no imagick required)
                $errorQr = QrCode::format('svg')
                    ->size(300)
                    ->margin(2)
                    ->generate('Error: No virtual account found');
                return response($errorQr, 200, ['Content-Type' => 'image/svg+xml']);
            }

            // Get virtual account details
            $virtualAccountDetails = $primaryWallet->virtual_account_details;
            
            if (is_string($virtualAccountDetails)) {
                $virtualAccountDetails = json_decode($virtualAccountDetails, true) ?? [];
            }
            
            if (!$virtualAccountDetails || !is_array($virtualAccountDetails) || empty($virtualAccountDetails)) {
                // Fetch from Bridge API if not stored
                if ($primaryWallet->virtual_account_id) {
                    $virtualAccountResult = $this->bridgeService->getVirtualAccount(
                        $integration->bridge_customer_id,
                        $primaryWallet->virtual_account_id
                    );
                    
                    if ($virtualAccountResult['success'] && isset($virtualAccountResult['data'])) {
                        $virtualAccountDetails = $virtualAccountResult['data'];
                        $primaryWallet->virtual_account_details = $virtualAccountDetails;
                        $primaryWallet->save();
                    } else {
                        // Return error QR code image instead of JSON (using SVG format - no imagick required)
                        $errorQr = QrCode::format('svg')
                            ->size(300)
                            ->margin(2)
                            ->generate('Error: Failed to fetch virtual account details');
                        return response($errorQr, 200, ['Content-Type' => 'image/svg+xml']);
                    }
                } else {
                    // Return error QR code image instead of JSON (using SVG format - no imagick required)
                    $errorQr = QrCode::format('svg')
                        ->size(300)
                        ->margin(2)
                        ->generate('Error: No virtual account found');
                    return response($errorQr, 200, ['Content-Type' => 'image/svg+xml']);
                }
            }

            // Extract deposit instructions
            $depositInstructions = $virtualAccountDetails['source_deposit_instructions'] ?? null;
            
            if (!$depositInstructions) {
                // Return error QR code image instead of JSON (using SVG format - no imagick required)
                $errorQr = QrCode::format('svg')
                    ->size(300)
                    ->margin(2)
                    ->generate('Error: Deposit instructions not available');
                return response($errorQr, 200, ['Content-Type' => 'image/svg+xml']);
            }

            // Build QR code data
            // Format: Bank account details in a structured format
            // For ACH/Wire transfers, we'll create a JSON structure with bank details
            $qrData = [
                'type' => 'bank_transfer',
                'bank_name' => $depositInstructions['bank_name'] ?? '',
                'routing_number' => $depositInstructions['bank_routing_number'] ?? '',
                'account_number' => $depositInstructions['bank_account_number'] ?? '',
                'account_holder' => $depositInstructions['bank_beneficiary_name'] ?? '',
                'currency' => $depositInstructions['currency'] ?? 'USD',
                'payment_rail' => $depositInstructions['payment_rail'] ?? ($depositInstructions['payment_rails'][0] ?? 'ach_push'),
            ];

            // Also create a human-readable string format for compatibility
            $qrString = json_encode($qrData);

            // Generate QR code as SVG (no imagick required)
            $qrCode = QrCode::format('svg')
                ->size(300)
                ->margin(2)
                ->errorCorrection('M')
                ->generate($qrString);

            return response($qrCode, 200, [
                'Content-Type' => 'image/svg+xml',
                'Cache-Control' => 'no-cache, no-store, must-revalidate',
                'Pragma' => 'no-cache',
                'Expires' => '0'
            ]);
        } catch (\Exception $e) {
            Log::error('Generate deposit QR code error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'user_id' => Auth::id(),
            ]);
            
            // Return a simple error QR code or empty response (using SVG format - no imagick required)
            try {
                $errorQr = QrCode::format('svg')
                    ->size(300)
                    ->margin(2)
                    ->generate('Error: Unable to generate QR code');
                return response($errorQr, 200, ['Content-Type' => 'image/svg+xml']);
            } catch (\Exception $e2) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to generate QR code: ' . $e->getMessage(),
                ], 500);
            }
        }
    }

    /**
     * Create a liquidation address for crypto deposits
     */
    public function createLiquidationAddress(Request $request)
    {
        try {
            $user = Auth::user();
            $isOrgUser = $user->hasRole(['organization', 'organization_pending']);

            $entity = $isOrgUser ? $user->organization : $user;
            $entityType = $isOrgUser ? Organization::class : User::class;

            // Get integration
            $integration = BridgeIntegration::where('integratable_id', $entity->id)
                ->where('integratable_type', $entityType)
                ->first();

            if (!$integration || !$integration->bridge_customer_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bridge integration not found',
                ], 404);
            }

            // Check if we're in sandbox mode
            $isSandbox = $this->bridgeService->isSandbox();

            // Get primary wallet (for production) or virtual account (for sandbox)
            $primaryWallet = BridgeWallet::where('bridge_integration_id', $integration->id)
                ->where('is_primary', true)
                ->first();

            $destinationAddress = null;
            $destinationPaymentRail = null;
            $destinationCurrency = null;

            if ($isSandbox) {
                // Sandbox: Use virtual account address (wallets don't exist in sandbox)
                $virtualAccountsResult = $this->bridgeService->getVirtualAccounts($integration->bridge_customer_id);
                if ($virtualAccountsResult['success'] && isset($virtualAccountsResult['data']['data'])) {
                    $virtualAccounts = $virtualAccountsResult['data']['data'];
                    if (count($virtualAccounts) > 0) {
                        $virtualAccount = $virtualAccounts[0];
                        $destinationAddress = $virtualAccount['destination']['address'] ?? null;
                        $destinationPaymentRail = $virtualAccount['destination']['payment_rail'] ?? 'ethereum';
                        $destinationCurrency = $virtualAccount['destination']['currency'] ?? 'usdc';
                    }
                }

                if (!$destinationAddress) {
                    return response()->json([
                        'success' => false,
                        'message' => 'No virtual account found. Please create a virtual account first.',
                    ], 404);
                }
            } else {
                // Production: Use wallet address
                if (!$primaryWallet || !$primaryWallet->wallet_address) {
                    return response()->json([
                        'success' => false,
                        'message' => 'No wallet found',
                    ], 404);
                }

                $destinationAddress = $primaryWallet->wallet_address;
                $destinationPaymentRail = $primaryWallet->chain ?? 'solana';
                $destinationCurrency = 'usdb'; // Production uses USDB for Bridge wallets
            }

            // Validate request
            $validated = $request->validate([
                'chain' => 'required|string|in:solana,ethereum,base,polygon',
                'currency' => 'required|string|in:usdc,usdt',
                'destination_payment_rail' => 'required|string',
                'destination_currency' => 'required|string|in:usdb,usdc',
            ]);

            // Validate chain/currency combinations
            // USDT is not supported on Solana (per Bridge.xyz API)
            if ($validated['chain'] === 'solana' && $validated['currency'] === 'usdt') {
                return response()->json([
                    'success' => false,
                    'message' => 'USDT is not supported on Solana. Please use USDC for Solana.',
                ], 400);
            }

            // Override destination currency and payment rail based on environment
            // In sandbox, use the virtual account's destination settings (Ethereum + USDC)
            // In production, use the validated values (can be Solana/Ethereum + USDB)
            if ($isSandbox) {
                // Sandbox: Always use Ethereum payment rail and USDC currency (per Bridge.xyz docs)
                // Also, in sandbox, only Ethereum chain is supported
                if ($validated['chain'] !== 'ethereum') {
                    return response()->json([
                        'success' => false,
                        'message' => 'In sandbox mode, only Ethereum chain is supported for liquidation addresses.',
                    ], 400);
                }
                if ($validated['currency'] !== 'usdc') {
                    return response()->json([
                        'success' => false,
                        'message' => 'In sandbox mode, only USDC currency is supported for liquidation addresses.',
                    ], 400);
                }
                $destinationPaymentRail = 'ethereum';
                $destinationCurrency = 'usdc';
            } else {
                // Production: Use validated values
                $destinationPaymentRail = $validated['destination_payment_rail'];
                $destinationCurrency = $validated['destination_currency'];
            }

            // Prepare liquidation address data
            $liquidationData = [
                'chain' => $validated['chain'],
                'currency' => $validated['currency'],
                'destination_payment_rail' => $destinationPaymentRail,
                'destination_currency' => $destinationCurrency,
                'destination_address' => $destinationAddress,
            ];

            // Create liquidation address via Bridge API
            $result = $this->bridgeService->createLiquidationAddress(
                $integration->bridge_customer_id,
                $liquidationData
            );

            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $result['error'] ?? 'Failed to create liquidation address',
                ], 500);
            }

            // Store liquidation address in database
            if (isset($result['data'])) {
                $bridgeLiquidationData = $result['data'];
                
                $liquidationAddress = LiquidationAddress::updateOrCreate(
                    [
                        'bridge_integration_id' => $integration->id,
                        'chain' => $validated['chain'],
                        'currency' => $validated['currency'],
                    ],
                    [
                        'bridge_customer_id' => $integration->bridge_customer_id,
                        'bridge_liquidation_address_id' => $bridgeLiquidationData['id'] ?? null,
                        'address' => $bridgeLiquidationData['address'] ?? null,
                        'destination_payment_rail' => $destinationPaymentRail,
                        'destination_currency' => $destinationCurrency,
                        'destination_address' => $destinationAddress,
                        'return_address' => $bridgeLiquidationData['return_address'] ?? null,
                        'state' => $bridgeLiquidationData['state'] ?? 'active',
                        'liquidation_metadata' => $bridgeLiquidationData,
                        'last_sync_at' => now(),
                    ]
                );

                return response()->json([
                    'success' => true,
                    'data' => $bridgeLiquidationData,
                ]);
            }

            return response()->json([
                'success' => true,
                'data' => $result['data'],
            ]);
        } catch (\Exception $e) {
            Log::error('Create liquidation address error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'user_id' => Auth::id(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to create liquidation address: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get liquidation addresses for the user
     */
    public function getLiquidationAddresses(Request $request)
    {
        try {
            $user = Auth::user();
            $isOrgUser = $user->hasRole(['organization', 'organization_pending']);

            $entity = $isOrgUser ? $user->organization : $user;
            $entityType = $isOrgUser ? Organization::class : User::class;

            // Get integration
            $integration = BridgeIntegration::where('integratable_id', $entity->id)
                ->where('integratable_type', $entityType)
                ->first();

            if (!$integration || !$integration->bridge_customer_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bridge integration not found',
                ], 404);
            }

            // First, try to get liquidation addresses from database
            $liquidationAddresses = LiquidationAddress::where('bridge_integration_id', $integration->id)
                ->active()
                ->get();

            // If we have addresses in database, return them
            if ($liquidationAddresses->count() > 0) {
                $formattedAddresses = $liquidationAddresses->map(function ($address) {
                    return [
                        'id' => $address->bridge_liquidation_address_id,
                        'chain' => $address->chain,
                        'currency' => $address->currency,
                        'address' => $address->address,
                        'destination_payment_rail' => $address->destination_payment_rail,
                        'destination_currency' => $address->destination_currency,
                        'destination_address' => $address->destination_address,
                        'return_address' => $address->return_address,
                        'state' => $address->state,
                    ];
                });

                return response()->json([
                    'success' => true,
                    'data' => $formattedAddresses->toArray(),
                ]);
            }

            // If no addresses in database, fetch from Bridge API and store them
            $result = $this->bridgeService->getLiquidationAddresses($integration->bridge_customer_id);

            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $result['error'] ?? 'Failed to fetch liquidation addresses',
                ], 500);
            }

            // Parse Bridge API response
            $bridgeAddresses = [];
            if (isset($result['data'])) {
                $data = $result['data'];
                $bridgeAddresses = is_array($data) && isset($data['data']) 
                    ? $data['data'] 
                    : (is_array($data) ? $data : []);
            }

            // Store addresses in database
            foreach ($bridgeAddresses as $bridgeAddress) {
                LiquidationAddress::updateOrCreate(
                    [
                        'bridge_integration_id' => $integration->id,
                        'bridge_liquidation_address_id' => $bridgeAddress['id'] ?? null,
                    ],
                    [
                        'bridge_customer_id' => $integration->bridge_customer_id,
                        'chain' => $bridgeAddress['chain'] ?? null,
                        'currency' => $bridgeAddress['currency'] ?? null,
                        'address' => $bridgeAddress['address'] ?? null,
                        'destination_payment_rail' => $bridgeAddress['destination_payment_rail'] ?? null,
                        'destination_currency' => $bridgeAddress['destination_currency'] ?? null,
                        'destination_address' => $bridgeAddress['destination_address'] ?? null,
                        'return_address' => $bridgeAddress['return_address'] ?? null,
                        'state' => $bridgeAddress['state'] ?? 'active',
                        'liquidation_metadata' => $bridgeAddress,
                        'last_sync_at' => now(),
                    ]
                );
            }

            return response()->json([
                'success' => true,
                'data' => $bridgeAddresses,
            ]);
        } catch (\Exception $e) {
            Log::error('Get liquidation addresses error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'user_id' => Auth::id(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch liquidation addresses: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Generate QR code for a liquidation address
     */
    public function getLiquidationAddressQrCode(Request $request)
    {
        try {
            $user = Auth::user();
            $isOrgUser = $user->hasRole(['organization', 'organization_pending']);

            $entity = $isOrgUser ? $user->organization : $user;
            $entityType = $isOrgUser ? Organization::class : User::class;

            // Get integration
            $integration = BridgeIntegration::where('integratable_id', $entity->id)
                ->where('integratable_type', $entityType)
                ->first();

            if (!$integration || !$integration->bridge_customer_id) {
                $errorQr = QrCode::format('svg')
                    ->size(300)
                    ->margin(2)
                    ->generate('Error: Bridge integration not found');
                return response($errorQr, 200, ['Content-Type' => 'image/svg+xml']);
            }

            // Get liquidation address ID from request
            $liquidationAddressId = $request->query('id');
            if (!$liquidationAddressId) {
                $errorQr = QrCode::format('svg')
                    ->size(300)
                    ->margin(2)
                    ->generate('Error: Liquidation address ID required');
                return response($errorQr, 200, ['Content-Type' => 'image/svg+xml']);
            }

            // Try to get liquidation address from database first
            $liquidationAddress = LiquidationAddress::where('bridge_integration_id', $integration->id)
                ->where(function ($query) use ($liquidationAddressId) {
                    $query->where('bridge_liquidation_address_id', $liquidationAddressId)
                          ->orWhere('id', $liquidationAddressId);
                })
                ->first();

            // If not in database, fetch from Bridge API
            if (!$liquidationAddress) {
                $result = $this->bridgeService->getLiquidationAddresses($integration->bridge_customer_id);

                if (!$result['success']) {
                    $errorQr = QrCode::format('svg')
                        ->size(300)
                        ->margin(2)
                        ->generate('Error: Failed to fetch liquidation addresses');
                    return response($errorQr, 200, ['Content-Type' => 'image/svg+xml']);
                }

                // Parse Bridge API response
                $liquidationAddresses = [];
                if (isset($result['data'])) {
                    $data = $result['data'];
                    $liquidationAddresses = is_array($data) && isset($data['data']) 
                        ? $data['data'] 
                        : (is_array($data) ? $data : []);
                }

                // Find the specific liquidation address
                $bridgeAddress = collect($liquidationAddresses)->firstWhere('id', $liquidationAddressId);

                if ($bridgeAddress) {
                    // Store in database for future use
                    $liquidationAddress = LiquidationAddress::updateOrCreate(
                        [
                            'bridge_integration_id' => $integration->id,
                            'bridge_liquidation_address_id' => $bridgeAddress['id'] ?? null,
                        ],
                        [
                            'bridge_customer_id' => $integration->bridge_customer_id,
                            'chain' => $bridgeAddress['chain'] ?? null,
                            'currency' => $bridgeAddress['currency'] ?? null,
                            'address' => $bridgeAddress['address'] ?? null,
                            'destination_payment_rail' => $bridgeAddress['destination_payment_rail'] ?? null,
                            'destination_currency' => $bridgeAddress['destination_currency'] ?? null,
                            'destination_address' => $bridgeAddress['destination_address'] ?? null,
                            'return_address' => $bridgeAddress['return_address'] ?? null,
                            'state' => $bridgeAddress['state'] ?? 'active',
                            'liquidation_metadata' => $bridgeAddress,
                            'last_sync_at' => now(),
                        ]
                    );
                }
            }

            if (!$liquidationAddress || !$liquidationAddress->address) {
                $errorQr = QrCode::format('svg')
                    ->size(300)
                    ->margin(2)
                    ->generate('Error: Liquidation address not found');
                return response($errorQr, 200, ['Content-Type' => 'image/svg+xml']);
            }

            // Generate QR code for the liquidation address
            $qrCode = QrCode::format('svg')
                ->size(300)
                ->margin(2)
                ->errorCorrection('M')
                ->generate($liquidationAddress->address);

            return response($qrCode, 200, [
                'Content-Type' => 'image/svg+xml',
                'Cache-Control' => 'no-cache, no-store, must-revalidate',
                'Pragma' => 'no-cache',
                'Expires' => '0'
            ]);
        } catch (\Exception $e) {
            Log::error('Generate liquidation address QR code error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'user_id' => Auth::id(),
            ]);

            try {
                $errorQr = QrCode::format('svg')
                    ->size(300)
                    ->margin(2)
                    ->generate('Error: Unable to generate QR code');
                return response($errorQr, 200, ['Content-Type' => 'image/svg+xml']);
            } catch (\Exception $e2) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to generate QR code: ' . $e->getMessage(),
                ], 500);
            }
        }
    }
}
