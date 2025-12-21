<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Organization;
use App\Models\BoardMember;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class WalletController extends Controller
{
    private const WALLET_API_URL = 'https://believe-in-unity-g3cpesercthbaya4.canadacentral-01.azurewebsites.net/api';
    private const WALLET_API_KEY = 'oQ87kHpl3u74kxKJMsOnLlPMUgmbySxu';
    private const WALLET_TENANT_ID = '4';

    /**
     * Connect user's wallet by authenticating with wallet API
     */
    public function connect(Request $request)
    {
        // Always return JSON - catch validation exception
        try {
            $validated = $request->validate([
                'email' => 'required|string|email',
                'password' => 'required|string|min:6',
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        }

        try {
            $user = Auth::user();
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated',
                ], 401);
            }

            // Call wallet API to authenticate
            $response = Http::withHeaders([
                'x-api-key' => self::WALLET_API_KEY,
                'Abp.TenantId' => self::WALLET_TENANT_ID,
                'Content-Type' => 'application/json',
            ])->post(self::WALLET_API_URL . '/TokenAuth/Authenticate', [
                'userNameOrEmailAddress' => $request->email,
                'password' => $request->password,
            ]);

            if (!$response->successful()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Wallet authentication failed. Please check your credentials.',
                ], 401);
            }

            $data = $response->json();

            if (!isset($data['result']['accessToken']) || !$data['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $data['error']['message'] ?? 'Wallet authentication failed.',
                ], 401);
            }

            $result = $data['result'];
            $expiresInSeconds = $result['expireInSeconds'] ?? 86400; // Default 24 hours

            // Store wallet tokens and user info
            $user->update([
                'wallet_access_token' => $result['accessToken'],
                'wallet_encrypted_token' => $result['encryptedAccessToken'] ?? null,
                'wallet_user_id' => $result['userId'] ?? null,
                'wallet_token_expires_at' => Carbon::now()->addSeconds($expiresInSeconds),
                'wallet_connected_at' => Carbon::now(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Wallet connected successfully!',
                'data' => [
                    'user_id' => $result['userId'] ?? null,
                    'expires_at' => $user->wallet_token_expires_at?->toIso8601String(),
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Wallet connection error: ' . $e->getMessage(), [
                'user_id' => Auth::id(),
                'error' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'An error occurred while connecting your wallet. Please try again.',
            ], 500);
        }
    }

    /**
     * Get user's wallet balance
     * For organization users, returns the organization's balance
     */
    public function getBalance(Request $request)
    {
        try {
            $user = Auth::user();

            // Check if user is an organization user
            $isOrgUser = in_array($user->role, ['organization', 'organization_pending']);
            
            if ($isOrgUser) {
                // Get organization through the user's organization relationship
                $organization = $user->organization;
                
                if ($organization && $organization->user) {
                    // Get balance from organization's user, not organization itself
                    $orgUser = $organization->user;
                    $balance = (float) ($orgUser->balance ?? 0);
                    
                    // Check if organization has active subscription
                    $hasSubscription = $orgUser->current_plan_id !== null;
                    
                    // Generate wallet address from organization ID
                    $walletAddress = '0x' . str_pad(dechex($organization->id), 40, '0', STR_PAD_LEFT);
                    
                    return response()->json([
                        'success' => true,
                        'balance' => $balance,
                        'organization_balance' => $balance,
                        'local_balance' => $balance,
                        'currency' => 'USD',
                        'connected' => true,
                        'source' => 'organization',
                        'organization_id' => $organization->id,
                        'organization_name' => $organization->name,
                        'address' => $walletAddress,
                        'has_subscription' => $hasSubscription,
                    ]);
                } else {
                    // Organization user but no organization or user found
                    return response()->json([
                        'success' => true,
                        'balance' => 0,
                        'organization_balance' => 0,
                        'local_balance' => 0,
                        'currency' => 'USD',
                        'connected' => true,
                        'source' => 'organization',
                        'note' => 'No organization or organization user found',
                        'has_subscription' => false,
                    ]);
                }
            }

            // For regular users, get balance directly from user table
            $balance = (float) ($user->balance ?? 0);
            
            // Check if user has active subscription
            $hasSubscription = $user->current_plan_id !== null;
            
            return response()->json([
                'success' => true,
                'balance' => $balance,
                'local_balance' => $balance,
                'currency' => 'USD',
                'connected' => true,
                'source' => 'user',
                'has_subscription' => $hasSubscription,
            ]);

        } catch (\Exception $e) {
            Log::error('Wallet balance fetch error: ' . $e->getMessage(), [
                'user_id' => Auth::id(),
                'error' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'An error occurred while fetching wallet balance.',
            ], 500);
        }
    }

    /**
     * Check wallet connection status
     * For organization users, always returns connected (using organization balance)
     */
    public function status(Request $request)
    {
        $user = Auth::user();

        // Check if user is an organization user
        $isOrgUser = in_array($user->role, ['organization', 'organization_pending']);
        
        if ($isOrgUser) {
            // Get organization through board membership or direct relationship
            $organization = null;
            $boardMember = BoardMember::where('user_id', $user->id)->first();
            if ($boardMember) {
                $organization = Organization::find($boardMember->organization_id);
            }
            if (!$organization) {
                $organization = Organization::where('user_id', $user->id)->first();
            }
            
            // Generate a wallet address based on organization ID (for display purposes)
            $walletAddress = $organization 
                ? '0x' . str_pad(dechex($organization->id), 40, '0', STR_PAD_LEFT)
                : null;

            return response()->json([
                'success' => true,
                'connected' => true, // Organization users are always "connected" using organization balance
                'expired' => false,
                'wallet_user_id' => $organization?->id,
                'address' => $walletAddress,
                'source' => 'organization',
                'organization_id' => $organization?->id,
                'organization_name' => $organization?->name,
            ]);
        }

        // For regular users, check wallet connection
        $isConnected = !empty($user->wallet_access_token);
        $isExpired = $isConnected && $user->wallet_token_expires_at && $user->wallet_token_expires_at->isPast();

        return response()->json([
            'success' => true,
            'connected' => $isConnected && !$isExpired,
            'expired' => $isExpired,
            'connected_at' => $user->wallet_connected_at?->toIso8601String(),
            'expires_at' => $user->wallet_token_expires_at?->toIso8601String(),
            'wallet_user_id' => $user->wallet_user_id,
        ]);
    }

    /**
     * Disconnect wallet
     */
    public function disconnect(Request $request)
    {
        $user = Auth::user();

        $user->update([
            'wallet_access_token' => null,
            'wallet_encrypted_token' => null,
            'wallet_user_id' => null,
            'wallet_token_expires_at' => null,
            'wallet_connected_at' => null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Wallet disconnected successfully.',
        ]);
    }

    /**
     * Get user's reward balance
     */
    public function getRewardBalance(Request $request)
    {
        try {
            $user = Auth::user();

            // Check if wallet is connected
            if (!$user->wallet_access_token) {
                return response()->json([
                    'success' => false,
                    'message' => 'Wallet not connected. Please connect your wallet first.',
                    'connected' => false,
                ], 400);
            }

            // Check if token is expired
            if ($user->wallet_token_expires_at && $user->wallet_token_expires_at->isPast()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Wallet token expired. Please reconnect your wallet.',
                    'connected' => false,
                    'expired' => true,
                ], 401);
            }

            // Call wallet API to get reward balance
            $response = Http::withHeaders([
                'x-api-key' => self::WALLET_API_KEY,
                'Abp.TenantId' => self::WALLET_TENANT_ID,
                'Authorization' => 'Bearer ' . $user->wallet_access_token,
                'Content-Type' => 'application/json',
            ])->get(self::WALLET_API_URL . '/services/app/UserReward/GetCurrentUserBalance');

            if (!$response->successful()) {
                if ($response->status() === 401) {
                    $user->update([
                        'wallet_access_token' => null,
                        'wallet_encrypted_token' => null,
                        'wallet_token_expires_at' => null,
                    ]);
                }

                return response()->json([
                    'success' => false,
                    'message' => 'Failed to fetch reward balance.',
                ], $response->status());
            }

            $data = $response->json();

            // Extract the result from the API response
            $result = $data['result'] ?? [];

            return response()->json([
                'success' => true,
                'transferBalance' => $result['transferBalance'] ?? 0,
                'donationBalance' => $result['donationBalance'] ?? 0,
                'volunteerBalance' => $result['volunteerBalance'] ?? 0,
                'socialImpactNumber' => $result['socialImpactNumber'] ?? null,
                'data' => $result,
            ]);

        } catch (\Exception $e) {
            Log::error('Reward balance fetch error: ' . $e->getMessage(), [
                'user_id' => Auth::id(),
                'error' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'An error occurred while fetching reward balance.',
            ], 500);
        }
    }

    /**
     * Get user's reward transaction history
     */
    public function getRewardTransactionHistory(Request $request)
    {
        try {
            $user = Auth::user();

            // Check if wallet is connected
            if (!$user->wallet_access_token) {
                return response()->json([
                    'success' => false,
                    'message' => 'Wallet not connected. Please connect your wallet first.',
                    'connected' => false,
                ], 400);
            }

            // Check if token is expired
            if ($user->wallet_token_expires_at && $user->wallet_token_expires_at->isPast()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Wallet token expired. Please reconnect your wallet.',
                    'connected' => false,
                    'expired' => true,
                ], 401);
            }

            // Get pagination parameters
            $page = $request->get('page', 1);
            $perPage = $request->get('per_page', 10);

            // Call wallet API to get transaction history
            $response = Http::withHeaders([
                'x-api-key' => self::WALLET_API_KEY,
                'Abp.TenantId' => self::WALLET_TENANT_ID,
                'Authorization' => 'Bearer ' . $user->wallet_access_token,
                'Content-Type' => 'application/json',
            ])->get(self::WALLET_API_URL . '/services/app/UserReward/GetTransactionHistory', [
                'page' => $page,
                'perPage' => $perPage,
            ]);

            if (!$response->successful()) {
                if ($response->status() === 401) {
                    $user->update([
                        'wallet_access_token' => null,
                        'wallet_encrypted_token' => null,
                        'wallet_token_expires_at' => null,
                    ]);
                }

                return response()->json([
                    'success' => false,
                    'message' => 'Failed to fetch transaction history.',
                ], $response->status());
            }

            $data = $response->json();

            return response()->json([
                'success' => true,
                'data' => $data['result'] ?? [],
                'transactions' => $data['result']['items'] ?? $data['result'] ?? [],
            ]);

        } catch (\Exception $e) {
            Log::error('Reward transaction history fetch error: ' . $e->getMessage(), [
                'user_id' => Auth::id(),
                'error' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'An error occurred while fetching transaction history.',
            ], 500);
        }
    }

    /**
     * Credit volunteer hours
     */
    public function creditVolunteerHours(Request $request)
    {
        try {
            $validated = $request->validate([
                'hours' => 'required|numeric|min:0',
                'description' => 'nullable|string|max:500',
            ]);

            $user = Auth::user();

            // Check if wallet is connected
            if (!$user->wallet_access_token) {
                return response()->json([
                    'success' => false,
                    'message' => 'Wallet not connected. Please connect your wallet first.',
                    'connected' => false,
                ], 400);
            }

            // Check if token is expired
            if ($user->wallet_token_expires_at && $user->wallet_token_expires_at->isPast()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Wallet token expired. Please reconnect your wallet.',
                    'connected' => false,
                    'expired' => true,
                ], 401);
            }

            // Call wallet API to credit volunteer hours
            $response = Http::withHeaders([
                'x-api-key' => self::WALLET_API_KEY,
                'Abp.TenantId' => self::WALLET_TENANT_ID,
                'Authorization' => 'Bearer ' . $user->wallet_access_token,
                'Content-Type' => 'application/json',
            ])->post(self::WALLET_API_URL . '/services/app/UserReward/CreditVolunteerHours', [
                'hours' => $validated['hours'],
                'description' => $validated['description'] ?? null,
            ]);

            if (!$response->successful()) {
                if ($response->status() === 401) {
                    $user->update([
                        'wallet_access_token' => null,
                        'wallet_encrypted_token' => null,
                        'wallet_token_expires_at' => null,
                    ]);
                }

                return response()->json([
                    'success' => false,
                    'message' => 'Failed to credit volunteer hours.',
                    'error' => $response->json(),
                ], $response->status());
            }

            $data = $response->json();

            return response()->json([
                'success' => true,
                'message' => 'Volunteer hours credited successfully.',
                'data' => $data['result'] ?? [],
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Credit volunteer hours error: ' . $e->getMessage(), [
                'user_id' => Auth::id(),
                'error' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'An error occurred while crediting volunteer hours.',
            ], 500);
        }
    }

    /**
     * Get user's token balance
     */
    public function getTokenBalance(Request $request)
    {
        try {
            $user = Auth::user();

            // Check if wallet is connected
            if (!$user->wallet_access_token) {
                return response()->json([
                    'success' => false,
                    'message' => 'Wallet not connected. Please connect your wallet first.',
                    'connected' => false,
                ], 400);
            }

            // Check if token is expired
            if ($user->wallet_token_expires_at && $user->wallet_token_expires_at->isPast()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Wallet token expired. Please reconnect your wallet.',
                    'connected' => false,
                    'expired' => true,
                ], 401);
            }

            // Call wallet API to get token balance
            $response = Http::withHeaders([
                'x-api-key' => self::WALLET_API_KEY,
                'Abp.TenantId' => self::WALLET_TENANT_ID,
                'Authorization' => 'Bearer ' . $user->wallet_access_token,
                'Content-Type' => 'application/json',
            ])->get(self::WALLET_API_URL . '/services/app/Customers/GetTokenBalance');

            if (!$response->successful()) {
                if ($response->status() === 401) {
                    $user->update([
                        'wallet_access_token' => null,
                        'wallet_encrypted_token' => null,
                        'wallet_token_expires_at' => null,
                    ]);
                }

                return response()->json([
                    'success' => false,
                    'message' => 'Failed to fetch token balance.',
                ], $response->status());
            }

            $data = $response->json();

            // Parse response: { "result": 0.0, "success": true, ... }
            $tokenBalance = isset($data['result']) ? (float) $data['result'] : 0;

            return response()->json([
                'success' => true,
                'balance' => $tokenBalance,
                'tokenBalance' => $tokenBalance,
                'data' => $data,
            ]);

        } catch (\Exception $e) {
            Log::error('Token balance fetch error: ' . $e->getMessage(), [
                'user_id' => Auth::id(),
                'error' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'An error occurred while fetching token balance.',
            ], 500);
        }
    }

    /**
     * Get wallet activity (donations received by organization)
     */
    public function getActivity(Request $request)
    {
        try {
            $user = Auth::user();

            // Check if user is an organization user
            $isOrgUser = in_array($user->role, ['organization', 'organization_pending']);
            
            if (!$isOrgUser) {
                return response()->json([
                    'success' => false,
                    'message' => 'This endpoint is only available for organization users.',
                ], 403);
            }

            // Get organization through the user's organization relationship
            $organization = $user->organization;
            
            if (!$organization || !$organization->user) {
                return response()->json([
                    'success' => true,
                    'activities' => [],
                    'has_more' => false,
                    'current_page' => 1,
                    'total' => 0,
                ]);
            }

            $orgUser = $organization->user;

            // Get pagination parameters
            $page = (int) $request->get('page', 1);
            $perPage = (int) $request->get('per_page', 5);
            
            // Get donations received by this organization
            $donations = \App\Models\Donation::where('organization_id', $organization->id)
                ->whereIn('status', ['completed', 'active'])
                ->with(['user:id,name,email'])
                ->get()
                ->map(function ($donation) {
                    return [
                        'id' => 'donation_' . $donation->id,
                        'type' => 'donation',
                        'amount' => (float) $donation->amount,
                        'date' => $donation->donation_date?->toIso8601String() ?? $donation->created_at->toIso8601String(),
                        'status' => $donation->status,
                        'donor_name' => $donation->user->name ?? 'Anonymous',
                        'donor_email' => $donation->user->email ?? null,
                        'frequency' => $donation->frequency,
                        'message' => $donation->message,
                        'transaction_id' => $donation->transaction_id,
                        'sort_date' => $donation->donation_date ?? $donation->created_at,
                    ];
                });

            // Get transactions (transfers and deposits) for the organization's user
            $transactions = Transaction::where('user_id', $orgUser->id)
                ->whereIn('type', ['transfer_out', 'transfer_in', 'deposit'])
                ->where('status', 'completed')
                ->orderBy('created_at', 'desc')
                ->get();
            
            Log::info('Wallet activity - transactions found', [
                'org_user_id' => $orgUser->id,
                'transaction_count' => $transactions->count(),
                'transaction_ids' => $transactions->pluck('id')->toArray(),
            ]);
            
            $transactions = $transactions->map(function ($transaction) {
                    $meta = $transaction->meta ?? [];
                    $isOutgoing = $transaction->type === 'transfer_out';
                    $isDeposit = $transaction->type === 'deposit';
                    
                    if ($isDeposit) {
                        return [
                            'id' => 'transaction_' . $transaction->id,
                            'type' => 'deposit',
                            'amount' => (float) $transaction->amount,
                            'date' => $transaction->processed_at?->toIso8601String() ?? $transaction->created_at->toIso8601String(),
                            'status' => $transaction->status,
                            'donor_name' => $meta['deposited_by_name'] ?? $meta['organization_name'] ?? 'System',
                            'donor_email' => null,
                            'frequency' => 'one-time',
                            'message' => 'Deposit to wallet',
                            'transaction_id' => $transaction->transaction_id,
                            'sort_date' => $transaction->processed_at ?? $transaction->created_at,
                            'is_outgoing' => false,
                            'recipient_type' => null,
                        ];
                    }
                    
                    return [
                        'id' => 'transaction_' . $transaction->id,
                        'type' => $isOutgoing ? 'transfer_sent' : 'transfer_received',
                        'amount' => (float) $transaction->amount,
                        'date' => $transaction->processed_at?->toIso8601String() ?? $transaction->created_at->toIso8601String(),
                        'status' => $transaction->status,
                        'donor_name' => $isOutgoing 
                            ? ($meta['recipient_name'] ?? 'Unknown')
                            : ($meta['sender_organization_name'] ?? 'Unknown'),
                        'donor_email' => null,
                        'frequency' => 'one-time',
                        'message' => $isOutgoing 
                            ? 'Sent to ' . ($meta['recipient_type'] === 'user' ? 'user' : 'organization')
                            : 'Received from ' . ($meta['sender_organization_name'] ?? 'organization'),
                        'transaction_id' => $transaction->transaction_id,
                        'sort_date' => $transaction->processed_at ?? $transaction->created_at,
                        'is_outgoing' => $isOutgoing,
                        'recipient_type' => $meta['recipient_type'] ?? null,
                    ];
                });

            // Combine and sort by date (newest first)
            $allActivities = $donations->concat($transactions)
                ->sortByDesc('sort_date')
                ->values();

            $total = $allActivities->count();
            $paginated = $allActivities->slice(($page - 1) * $perPage, $perPage)->values();
            
            // Remove sort_date from final output
            $activities = $paginated->map(function ($activity) {
                unset($activity['sort_date']);
                return $activity;
            });

            $hasMore = ($page * $perPage) < $total;

            return response()->json([
                'success' => true,
                'activities' => $activities,
                'has_more' => $hasMore,
                'current_page' => $page,
                'total' => $total,
            ]);

        } catch (\Exception $e) {
            Log::error('Wallet activity fetch error: ' . $e->getMessage(), [
                'user_id' => Auth::id(),
                'error' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'An error occurred while fetching wallet activity.',
            ], 500);
        }
    }

    /**
     * Search for users and organizations by name or email
     */
    public function searchRecipients(Request $request)
    {
        try {
            $user = Auth::user();
            $search = $request->input('search', '');
            $limit = min((int) $request->input('limit', 10), 20); // Max 20 results

            if (empty($search) || strlen(trim($search)) < 2) {
                return response()->json([
                    'success' => true,
                    'results' => [],
                ]);
            }

            $searchTerm = '%' . trim($search) . '%';
            $results = [];

            // Search users (excluding the current user and only users with 'user' role via Spatie)
            // Exclude users who have 'admin' or 'organization' roles
            $users = User::where('id', '!=', $user->id)
                ->whereHas('roles', function ($query) {
                    $query->where('name', 'user');
                })
                ->whereDoesntHave('roles', function ($query) {
                    $query->whereIn('name', ['admin', 'organization', 'organization_pending']);
                })
                ->where(function ($query) use ($searchTerm) {
                    $query->where('name', 'LIKE', $searchTerm)
                        ->orWhere('email', 'LIKE', $searchTerm);
                })
                ->select('id', 'name', 'email')
                ->with('roles:id,name')
                ->limit($limit)
                ->get();

            foreach ($users as $userResult) {
                $results[] = [
                    'id' => 'user_' . $userResult->id,
                    'type' => 'user',
                    'name' => $userResult->name,
                    'email' => $userResult->email,
                    'display_name' => $userResult->name . ($userResult->email ? ' (' . $userResult->email . ')' : ''),
                    'address' => '0x' . str_pad(dechex($userResult->id), 40, '0', STR_PAD_LEFT), // Generate address from user ID
                ];
            }

            // Search organizations
            $organizations = Organization::where(function ($query) use ($searchTerm) {
                    $query->where('name', 'LIKE', $searchTerm)
                        ->orWhere('email', 'LIKE', $searchTerm);
                })
                ->select('id', 'name', 'email')
                ->limit($limit)
                ->get();

            foreach ($organizations as $org) {
                $results[] = [
                    'id' => 'org_' . $org->id,
                    'type' => 'organization',
                    'name' => $org->name,
                    'email' => $org->email,
                    'display_name' => $org->name . ($org->email ? ' (' . $org->email . ')' : ''),
                    'address' => '0x' . str_pad(dechex($org->id), 40, '0', STR_PAD_LEFT), // Generate address from org ID
                ];
            }

            // Limit total results
            $results = array_slice($results, 0, $limit);

            return response()->json([
                'success' => true,
                'results' => $results,
            ]);

        } catch (\Exception $e) {
            Log::error('Search recipients error: ' . $e->getMessage(), [
                'user_id' => Auth::id(),
                'error' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'An error occurred while searching recipients.',
                'results' => [],
            ], 500);
        }
    }

    /**
     * Send money to a recipient (user or organization)
     */
    public function send(Request $request)
    {
        try {
            $user = Auth::user();
            
            // Validate request
            $validated = $request->validate([
                'amount' => 'required|numeric|min:0.01',
                'recipient_id' => 'required|string', // Format: 'user_123' or 'org_456'
                'recipient_address' => 'nullable|string',
            ]);

            $amount = (float) $validated['amount'];
            $recipientId = $validated['recipient_id'];
            
            // Check if user is an organization user
            $isOrgUser = in_array($user->role, ['organization', 'organization_pending']);
            
            if (!$isOrgUser) {
                return response()->json([
                    'success' => false,
                    'message' => 'This feature is only available for organization users.',
                ], 403);
            }

            // Get sender's organization and user
            $organization = $user->organization;
            if (!$organization || !$organization->user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Organization not found.',
                ], 404);
            }

            $senderUser = $organization->user;
            $senderBalance = (float) ($senderUser->balance ?? 0);

            // Check if sender has sufficient balance
            if ($senderBalance < $amount) {
                return response()->json([
                    'success' => false,
                    'message' => 'Insufficient balance. Available: $' . number_format($senderBalance, 2),
                ], 400);
            }

            // Parse recipient ID
            $recipientType = null;
            $recipientDbId = null;
            
            if (strpos($recipientId, 'user_') === 0) {
                $recipientType = 'user';
                $recipientDbId = (int) str_replace('user_', '', $recipientId);
            } elseif (strpos($recipientId, 'org_') === 0) {
                $recipientType = 'organization';
                $recipientDbId = (int) str_replace('org_', '', $recipientId);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid recipient ID format.',
                ], 400);
            }

            // Get recipient
            $recipientUser = null;
            $recipientName = 'Unknown';
            
            if ($recipientType === 'user') {
                $recipientUser = User::find($recipientDbId);
                if (!$recipientUser) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Recipient user not found.',
                    ], 404);
                }
                $recipientName = $recipientUser->name;
            } elseif ($recipientType === 'organization') {
                $recipientOrg = Organization::find($recipientDbId);
                if (!$recipientOrg) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Recipient organization not found.',
                    ], 404);
                }
                $recipientName = $recipientOrg->name;
                
                // Get organization's user for balance
                if ($recipientOrg->user) {
                    $recipientUser = $recipientOrg->user;
                } else {
                    return response()->json([
                        'success' => false,
                        'message' => 'Recipient organization has no associated user account.',
                    ], 404);
                }
            }

            // Perform transaction using database transaction
            DB::beginTransaction();
            
            try {
                // Deduct from sender
                $senderUser->decrement('balance', $amount);
                
                // Record sender transaction
                $senderUser->recordTransaction([
                    'type' => 'transfer_out',
                    'amount' => $amount,
                    'status' => 'completed',
                    'payment_method' => 'wallet',
                    'related_id' => $recipientDbId,
                    'related_type' => $recipientType === 'user' ? User::class : Organization::class,
                    'meta' => [
                        'recipient_name' => $recipientName,
                        'recipient_type' => $recipientType,
                        'sender_organization_id' => $organization->id,
                        'sender_organization_name' => $organization->name,
                    ],
                    'processed_at' => now(),
                ]);

                // Add to recipient
                $recipientUser->increment('balance', $amount);
                
                // Record recipient transaction
                $recipientUser->recordTransaction([
                    'type' => 'transfer_in',
                    'amount' => $amount,
                    'status' => 'completed',
                    'payment_method' => 'wallet',
                    'related_id' => $organization->id,
                    'related_type' => Organization::class,
                    'meta' => [
                        'sender_organization_id' => $organization->id,
                        'sender_organization_name' => $organization->name,
                        'recipient_type' => $recipientType,
                        'recipient_name' => $recipientName,
                    ],
                    'processed_at' => now(),
                ]);

                DB::commit();

                // Get updated balances
                $senderUser->refresh();
                $recipientUser->refresh();

                Log::info('Wallet transfer completed', [
                    'sender_org_id' => $organization->id,
                    'sender_user_id' => $senderUser->id,
                    'recipient_type' => $recipientType,
                    'recipient_id' => $recipientDbId,
                    'recipient_user_id' => $recipientUser->id,
                    'amount' => $amount,
                    'sender_new_balance' => $senderUser->balance,
                    'recipient_new_balance' => $recipientUser->balance,
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Successfully sent $' . number_format($amount, 2) . ' to ' . $recipientName,
                    'data' => [
                        'amount' => $amount,
                        'recipient_name' => $recipientName,
                        'recipient_type' => $recipientType,
                        'sender_balance' => (float) $senderUser->balance,
                        'transaction_id' => null, // Will be set by recordTransaction
                    ],
                ]);

            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Wallet send error: ' . $e->getMessage(), [
                'user_id' => Auth::id(),
                'error' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'An error occurred while processing the transfer. Please try again.',
            ], 500);
        }
    }

    /**
     * Deposit money to organization wallet
     */
    public function deposit(Request $request)
    {
        try {
            $user = Auth::user();
            
            // Validate request
            $validated = $request->validate([
                'amount' => 'required|numeric|min:0.01',
            ]);

            $amount = (float) $validated['amount'];
            
            // Check if user is an organization user
            $isOrgUser = in_array($user->role, ['organization', 'organization_pending']);
            
            if (!$isOrgUser) {
                return response()->json([
                    'success' => false,
                    'message' => 'This feature is only available for organization users.',
                ], 403);
            }

            // Get organization and user
            $organization = $user->organization;
            if (!$organization || !$organization->user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Organization not found.',
                ], 404);
            }

            $orgUser = $organization->user;

            DB::beginTransaction();
            
            try {
                // Add funds to organization user balance
                $orgUser->increment('balance', $amount);
                
                // Record deposit transaction
                $orgUser->recordTransaction([
                    'type' => 'deposit',
                    'amount' => $amount,
                    'status' => 'completed',
                    'payment_method' => 'wallet',
                    'meta' => [
                        'organization_id' => $organization->id,
                        'organization_name' => $organization->name,
                        'deposited_by' => $user->id,
                        'deposited_by_name' => $user->name,
                    ],
                    'processed_at' => now(),
                ]);

                DB::commit();

                // Get updated balance
                $orgUser->refresh();

                return response()->json([
                    'success' => true,
                    'message' => 'Deposit successful! $' . number_format($amount, 2) . ' has been added to your wallet.',
                    'data' => [
                        'balance' => (float) $orgUser->balance,
                        'amount' => $amount,
                    ],
                ]);

            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Wallet deposit error: ' . $e->getMessage(), [
                'user_id' => Auth::id(),
                'error' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'An error occurred while processing the deposit. Please try again.',
            ], 500);
        }
    }
}
