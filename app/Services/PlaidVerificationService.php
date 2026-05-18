<?php

namespace App\Services;

use App\Models\BankVerification;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PlaidVerificationService
{
    protected $plaidClientId;
    protected $plaidSecret;
    protected $plaidEnvironment;
    protected $plaidBaseUrl;

    public function __construct()
    {
        $this->plaidClientId = config('services.plaid.client_id');
        $this->plaidSecret = config('services.plaid.secret');
        $this->plaidEnvironment = config('services.plaid.environment', 'sandbox');
        $this->plaidBaseUrl = $this->getPlaidUrl();

        Log::debug('PlaidVerificationService initialized', [
            'environment' => $this->plaidEnvironment,
            'base_url' => $this->plaidBaseUrl
        ]);
    }

    public function createLinkToken(User $user)
    {
        Log::debug('Creating Plaid link token for user', ['user_id' => $user->id]);

        try {
            $payload = [
                'client_id' => $this->plaidClientId,
                'secret' => $this->plaidSecret,
                'client_name' => "Believe",
                'country_codes' => ['US'],
                'language' => 'en',
                'user' => [
                    'client_user_id' => (string) $user->id,
                    'legal_name' => $user->name,
                    'email_address' => $user->email,
                ],
                'products' => ['auth', 'identity'],
                'account_filters' => [
                    'depository' => [
                        'account_subtypes' => ['checking', 'savings']
                    ]
                ],
            ];

            $response = Http::post($this->plaidBaseUrl . '/link/token/create', $payload);

            if ($response->successful()) {
                $data = $response->json();
                Log::debug('Link token created successfully', [
                    'user_id' => $user->id,
                    'token_exists' => !empty($data['link_token'])
                ]);
                return $data['link_token'];
            }

            Log::error('Failed to create link token', [
                'status' => $response->status(),
                'response' => $response->body()
            ]);
            throw new \Exception('Failed to create link token');
        } catch (\Exception $e) {
            Log::error('Link token creation failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    public function exchangePublicToken(string $publicToken)
    {
        Log::debug('Exchanging public token for access token');

        try {
            $payload = [
                'client_id' => $this->plaidClientId,
                'secret' => $this->plaidSecret,
                'public_token' => $publicToken,
            ];

            $response = Http::post($this->plaidBaseUrl . '/item/public_token/exchange', $payload);

            if ($response->successful()) {
                $data = $response->json();
                Log::debug('Public token exchanged successfully', [
                    'access_token_received' => !empty($data['access_token']),
                    'item_id' => $data['item_id'] ?? null
                ]);
                return [
                    'access_token' => $data['access_token'],
                    'item_id' => $data['item_id'],
                ];
            }

            Log::error('Failed to exchange public token', [
                'status' => $response->status(),
                'response' => $response->body()
            ]);
            throw new \Exception('Failed to exchange public token');
        } catch (\Exception $e) {
            Log::error('Public token exchange failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    public function verifyBankOwnership(User $user, string $accessToken, string $accountId, array $metadata)
    {
        $organization = $user->organization;
        $userName = strtolower(trim($user->name));
        $orgName = strtolower(trim($organization->name ?? ''));

        Log::debug('Starting bank ownership verification', [
            'user_id' => $user->id,
            'organization_id' => $organization->id ?? null,
            'user_name' => $user->name,
            'organization_name' => $organization->name ?? null,
            'institution' => $metadata['institution']['name'] ?? 'Unknown'
        ]);

        if ($user->bankVerifications()->where('verification_status', 'verified')->exists()) {
            Log::warning('User already has verified bank account', ['user_id' => $user->id]);
            throw new \Exception('User already has a verified bank account');
        }

        $accountsData = $this->getAccounts($accessToken);
        if (!$accountsData) {
            throw new \Exception('Failed to retrieve account information');
        }

        $identityData = $this->getAccountIdentity($accessToken);
        if (!$identityData) {
            throw new \Exception('Failed to retrieve account owner information');
        }

        $plaidOwners = $this->extractPlaidOwnersNames($identityData); // array of lowercase owner names

        // Match Plaid owner names against user name or organization name
        $matched = false;
        $highestSimilarityUser = 0;
        $highestSimilarityOrg = 0;

        foreach ($plaidOwners as $plaidOwnerName) {
            similar_text($userName, $plaidOwnerName, $simUser);
            similar_text($orgName, $plaidOwnerName, $simOrg);

            if ($simUser > $highestSimilarityUser) {
                $highestSimilarityUser = $simUser;
            }

            if ($simOrg > $highestSimilarityOrg) {
                $highestSimilarityOrg = $simOrg;
            }

            if (max($simUser, $simOrg) >= 80) {
                $matched = true;
                break;
            }
        }

        $verificationStatus = $matched ? 'verified' : 'rejected';

        $verification = $this->createVerificationRecord(
            $user,
            $metadata,
            $accountsData['accounts'][0] ?? null,
            $accessToken,
            $verificationStatus,
            $highestSimilarityUser,
            $highestSimilarityOrg
        );

        if ($verificationStatus === 'verified') {
            $user->update([
                'is_verified' => true,
                'verification_status' => 'verified',
                'ownership_verified_at' => now()
            ]);
            Log::info('User verification completed successfully', ['user_id' => $user->id]);
        } else {
            Log::info('User verification rejected', ['user_id' => $user->id]);
        }

        return $verification;
    }

    /**
     * Extracts all owner names from Plaid identity data as lowercase trimmed array
     */
    protected function extractPlaidOwnersNames(array $identityData)
    {
        $owners = [];

        foreach ($identityData['accounts'] ?? [] as $account) {
            foreach ($account['owners'] ?? [] as $owner) {
                foreach ($owner['names'] ?? [] as $name) {
                    $owners[] = strtolower(trim($name));
                }
            }
        }

        return array_unique($owners);
    }

    /**
     * Creates or updates the bank verification record for user
     */
    protected function createVerificationRecord(
        User $user,
        array $metadata,
        ?array $primaryAccount,
        string $accessToken,
        string $verificationStatus,
        float $nameSimilarityUser,
        float $nameSimilarityOrg
    ) {
        $primaryOwnerName = 'Unknown';
        $primaryOwnerEmail = null;
        $primaryOwnerPhone = null;
        $primaryOwnerAddress = null;

        // Optional: extract primary owner info if you want to store more from metadata or identity

        $data = [
            'user_id' => $user->id,
            'user_name' => $user->name,
            'bank_account_owner_name' => $primaryOwnerName,
            'bank_account_owner_email' => $primaryOwnerEmail,
            'bank_account_owner_phone' => $primaryOwnerPhone,
            'bank_account_owner_address' => $primaryOwnerAddress,
            'bank_name' => $metadata['institution']['name'] ?? 'Unknown Bank',
            'account_type' => $primaryAccount['subtype'] ?? 'checking',
            'account_mask' => $primaryAccount['mask'] ?? '0000',
            'name_similarity_score_user' => round($nameSimilarityUser, 2),
            'name_similarity_score_org' => round($nameSimilarityOrg, 2),
            'verification_status' => $verificationStatus,
            'verification_method' => 'plaid_bank_account',
            'plaid_access_token' => encrypt($accessToken),
            'plaid_item_id' => $metadata['item_id'] ?? null,
            'plaid_data' => [
                'accounts' => $primaryAccount ? $primaryAccount : [],
                'institution' => $metadata['institution'] ?? null,
            ],
            'verified_at' => $verificationStatus === 'verified' ? now() : null,
            'rejection_reason' => $verificationStatus === 'rejected' ? 'Owner name did not match user or organization' : null,
        ];

        Log::debug('Creating verification record', ['data' => $data]);

        return BankVerification::updateOrCreate(
            ['user_id' => $user->id],
            $data
        );
    }

    protected function getAccounts(string $accessToken)
    {
        try {
            Log::debug('Fetching accounts from Plaid');
            $response = Http::post($this->plaidBaseUrl . '/accounts/get', [
                'client_id' => $this->plaidClientId,
                'secret' => $this->plaidSecret,
                'access_token' => $accessToken,
            ]);

            if ($response->successful()) {
                $data = $response->json();
                Log::debug('Accounts retrieved successfully', [
                    'account_count' => count($data['accounts'] ?? [])
                ]);
                return $data;
            }

            Log::error('Failed to get accounts', [
                'status' => $response->status(),
                'response' => $response->body()
            ]);
            return null;
        } catch (\Exception $e) {
            Log::error('Exception while getting accounts', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return null;
        }
    }

    protected function getAccountIdentity(string $accessToken)
    {
        try {
            Log::debug('Fetching identity from Plaid');
            $response = Http::post($this->plaidBaseUrl . '/identity/get', [
                'client_id' => $this->plaidClientId,
                'secret' => $this->plaidSecret,
                'access_token' => $accessToken,
            ]);

            if ($response->successful()) {
                $data = $response->json();
                Log::debug('Identity retrieved successfully', [
                    'accounts_with_identity' => count($data['accounts'] ?? [])
                ]);
                return $data;
            }

            Log::error('Failed to get identity', [
                'status' => $response->status(),
                'response' => $response->body()
            ]);
            return null;
        } catch (\Exception $e) {
            Log::error('Exception while getting identity', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return null;
        }
    }

    protected function getPlaidUrl()
    {
        return match ($this->plaidEnvironment) {
            'production' => 'https://production.plaid.com',
            'development' => 'https://development.plaid.com',
            default => 'https://sandbox.plaid.com',
        };
    }
}
