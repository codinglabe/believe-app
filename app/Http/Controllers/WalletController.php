<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
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
     */
    public function getBalance(Request $request)
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

            // Call wallet API to get balance
            // Note: You'll need to provide the actual balance endpoint from your wallet API
            $response = Http::withHeaders([
                'x-api-key' => self::WALLET_API_KEY,
                'Abp.TenantId' => self::WALLET_TENANT_ID,
                'Authorization' => 'Bearer ' . $user->wallet_access_token,
                'Content-Type' => 'application/json',
            ])->get(self::WALLET_API_URL . '/services/app/User/GetCurrentUser');

            if (!$response->successful()) {
                // Log the error for debugging
                Log::warning('Wallet balance API call failed', [
                    'user_id' => $user->id,
                    'status' => $response->status(),
                    'response' => $response->body(),
                ]);

                // If token is invalid, clear it
                if ($response->status() === 401) {
                    $user->update([
                        'wallet_access_token' => null,
                        'wallet_encrypted_token' => null,
                        'wallet_token_expires_at' => null,
                    ]);

                    return response()->json([
                        'success' => false,
                        'message' => 'Wallet token expired. Please reconnect your wallet.',
                        'connected' => false,
                        'expired' => true,
                    ], 401);
                }

                // If API call fails, return local balance instead of failing completely
                return response()->json([
                    'success' => true,
                    'balance' => (float) ($user->balance ?? 0),
                    'wallet_balance' => null,
                    'local_balance' => (float) ($user->balance ?? 0),
                    'currency' => 'USD',
                    'connected' => true,
                    'note' => 'Using local balance - API call failed',
                ]);
            }

            $data = $response->json();

            // Extract balance from response (adjust based on actual API response structure)
            $walletBalance = $data['result']['balance'] ?? $data['result']['walletBalance'] ?? null;

            // If balance is found in wallet API, optionally sync it to user's balance
            if ($walletBalance !== null) {
                // Uncomment this line if you want to sync wallet balance to user balance
                // $user->update(['balance' => (float) $walletBalance]);
            }

            return response()->json([
                'success' => true,
                'balance' => $walletBalance !== null ? (float) $walletBalance : (float) ($user->balance ?? 0),
                'wallet_balance' => $walletBalance !== null ? (float) $walletBalance : null,
                'local_balance' => (float) ($user->balance ?? 0),
                'currency' => 'USD',
                'connected' => true,
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
     */
    public function status(Request $request)
    {
        $user = Auth::user();

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

            return response()->json([
                'success' => true,
                'balance' => $data['result']['balance'] ?? $data['result']['tokenBalance'] ?? 0,
                'data' => $data['result'] ?? [],
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
}
