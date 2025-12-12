<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class BridgeService
{
    private string $apiKey;
    private string $baseUrl;
    private string $webhookSecret;

    public function __construct()
    {
        $this->apiKey = config('services.bridge.api_key', env('BRIDGE_API_KEY'));
        $this->webhookSecret = config('services.bridge.webhook_secret', env('BRIDGE_WEBHOOK_SECRET'));
        
        // Set base URL based on environment
        // Check env() directly first, then fall back to config
        $environment = trim(strtolower(env('BRIDGE_ENVIRONMENT', config('services.bridge.environment', 'production'))));
        
        // Check if BRIDGE_BASE_URL is explicitly set in .env
        $explicitBaseUrl = env('BRIDGE_BASE_URL');
        
        if ($explicitBaseUrl) {
            // Use explicit base URL from .env if set
            $this->baseUrl = $explicitBaseUrl;
        } else {
            // Auto-detect based on environment
            if ($environment === 'sandbox') {
                $this->baseUrl = 'https://api.sandbox.bridge.xyz/v0';
            } else {
                $this->baseUrl = 'https://api.bridge.xyz/v0';
            }
        }

        if (empty($this->apiKey)) {
            Log::warning('Bridge API key is not configured');
        } else {
            Log::info('Bridge Service initialized', [
                'environment' => $environment,
                'base_url' => $this->baseUrl,
                'api_key_preview' => substr($this->apiKey, 0, 8) . '...' . substr($this->apiKey, -4),
            ]);
        }
    }

    /**
     * Make authenticated request to Bridge API
     */
    private function makeRequest(string $method, string $endpoint, array $data = [], bool $useIdempotency = false): array
    {
        try {
            if (empty($this->apiKey)) {
                return [
                    'success' => false,
                    'error' => 'Bridge API key is not configured.',
                ];
            }

            $url = "{$this->baseUrl}{$endpoint}";

            $headers = [
                'Api-Key' => $this->apiKey,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ];

            // Add Idempotency-Key for POST requests
            if ($useIdempotency || strtoupper($method) === 'POST') {
                $headers['Idempotency-Key'] = Str::uuid()->toString();
            }

            Log::debug('Bridge API Request', [
                'method' => $method,
                'url' => $url,
                'data' => $data, // Log the data being sent for debugging
            ]);

            $response = Http::withHeaders($headers)->{strtolower($method)}($url, $data);

            $statusCode = $response->status();
            $body = $response->json();

            if (!$response->successful()) {
                $errorMessage = $body['message'] ?? 'Bridge API request failed';
                
                // Log detailed error information including request data
                // Extract missing/invalid parameters from Bridge response if available
                $missingParams = $body['missing_parameters'] ?? $body['invalid_parameters'] ?? $body['errors'] ?? null;
                if ($missingParams) {
                    $errorMessage .= ' Missing/Invalid parameters: ' . json_encode($missingParams);
                }
                
                Log::error('Bridge API Error', [
                    'method' => $method,
                    'endpoint' => $endpoint,
                    'status' => $statusCode,
                    'request_data' => $data, // Include request data in error log
                    'response' => $body,
                    'error_message' => $errorMessage,
                    'missing_params' => $missingParams,
                ]);

                return [
                    'success' => false,
                    'error' => $errorMessage,
                    'status' => $statusCode,
                    'response' => $body, // Include full response for debugging
                ];
            }

            return [
                'success' => true,
                'data' => $body,
            ];
        } catch (\Exception $e) {
            Log::error('Bridge API Exception', [
                'method' => $method,
                'endpoint' => $endpoint,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    // ==================== CUSTOMERS ====================

    /**
     * Create a customer in Bridge
     */
    public function createCustomer(array $customerData): array
    {
        return $this->makeRequest('POST', '/customers', $customerData);
    }

    /**
     * Get customer by ID
     */
    public function getCustomer(string $customerId): array
    {
        return $this->makeRequest('GET', "/customers/{$customerId}");
    }

    /**
     * Update customer by ID
     */
    public function updateCustomer(string $customerId, array $customerData): array
    {
        return $this->makeRequest('PUT', "/customers/{$customerId}", $customerData);
    }

    /**
     * List all customers
     */
    public function getCustomers(): array
    {
        return $this->makeRequest('GET', '/customers');
    }

    // ==================== KYC LINKS ====================

    /**
     * Create KYC link for individual or business
     */
    public function createKYCLink(string $customerId, array $options = []): array
    {
        $data = array_merge([
            'customer_id' => $customerId,
            'type' => 'kyc', // KYC for individuals
        ], $options);

        // Endpoint uses underscore: /kyc_links
        return $this->makeRequest('POST', '/kyc_links', $data);
    }

    /**
     * Get KYC link status
     */
    public function getKYCLink(string $linkId): array
    {
        return $this->makeRequest('GET', "/kyc_links/{$linkId}");
    }

    /**
     * Create KYB link for business (same endpoint as KYC, but with type: kyb)
     */
    public function createKYBLink(string $customerId, array $options = []): array
    {
        $data = array_merge([
            'customer_id' => $customerId,
            'type' => 'kyb', // KYB for businesses
        ], $options);

        return $this->makeRequest('POST', '/kyc_links', $data);
    }

    // ==================== WALLETS ====================

    /**
     * Create a Bridge wallet for a customer
     */
    public function createWallet(string $customerId, string $chain = 'solana'): array
    {
        // Correct endpoint: /customers/{customerId}/wallets
        return $this->makeRequest('POST', "/customers/{$customerId}/wallets", [
            'chain' => $chain,
        ]);
    }

    /**
     * Get wallets for a customer
     */
    public function getWallets(string $customerId): array
    {
        return $this->makeRequest('GET', "/customers/{$customerId}/wallets");
    }

    /**
     * Get wallet by ID
     */
    public function getWallet(string $customerId, string $walletId): array
    {
        return $this->makeRequest('GET', "/customers/{$customerId}/wallets/{$walletId}");
    }


    // ==================== VIRTUAL ACCOUNTS ====================

    /**
     * Create a virtual account for deposits
     */
    public function createVirtualAccount(string $customerId, array $source, array $destination, ?string $developerFeePercent = null): array
    {
        // Correct endpoint: /customers/{customerId}/virtual_accounts
        $data = [
            'source' => $source,
            'destination' => $destination,
        ];

        if ($developerFeePercent !== null) {
            $data['developer_fee_percent'] = $developerFeePercent;
        }

        return $this->makeRequest('POST', "/customers/{$customerId}/virtual_accounts", $data);
    }

    /**
     * Get virtual accounts for a customer
     */
    public function getVirtualAccounts(string $customerId): array
    {
        return $this->makeRequest('GET', "/customers/{$customerId}/virtual_accounts");
    }

    /**
     * Get virtual account by ID
     */
    public function getVirtualAccount(string $customerId, string $virtualAccountId): array
    {
        return $this->makeRequest('GET', "/customers/{$customerId}/virtual_accounts/{$virtualAccountId}");
    }

    /**
     * Update virtual account
     */
    public function updateVirtualAccount(string $customerId, string $virtualAccountId, array $data): array
    {
        return $this->makeRequest('PUT', "/customers/{$customerId}/virtual_accounts/{$virtualAccountId}", $data);
    }

    /**
     * Get virtual account activity/history
     */
    public function getVirtualAccountHistory(string $customerId, string $virtualAccountId): array
    {
        return $this->makeRequest('GET', "/customers/{$customerId}/virtual_accounts/{$virtualAccountId}/history");
    }

    // ==================== EXTERNAL ACCOUNTS ====================

    /**
     * Create an external account (bank account)
     */
    public function createExternalAccount(string $customerId, array $accountData): array
    {
        // Correct endpoint: /customers/{customerId}/external_accounts
        return $this->makeRequest('POST', "/customers/{$customerId}/external_accounts", $accountData);
    }

    /**
     * Get external accounts for a customer
     */
    public function getExternalAccounts(string $customerId): array
    {
        return $this->makeRequest('GET', "/customers/{$customerId}/external_accounts");
    }

    /**
     * Get external account by ID
     */
    public function getExternalAccount(string $customerId, string $externalAccountId): array
    {
        return $this->makeRequest('GET', "/customers/{$customerId}/external_accounts/{$externalAccountId}");
    }

    // ==================== TRANSFERS ====================

    /**
     * Create a transfer
     */
    public function createTransfer(array $transferData): array
    {
        return $this->makeRequest('POST', '/transfers', $transferData);
    }

    /**
     * Get transfer by ID
     */
    public function getTransfer(string $transferId): array
    {
        return $this->makeRequest('GET', "/transfers/{$transferId}");
    }

    /**
     * List transfers
     */
    public function getTransfers(): array
    {
        return $this->makeRequest('GET', '/transfers');
    }

    // ==================== LIQUIDATION ADDRESSES ====================

    /**
     * Create a liquidation address
     */
    public function createLiquidationAddress(string $customerId, array $data): array
    {
        return $this->makeRequest('POST', "/customers/{$customerId}/liquidation_addresses", $data);
    }

    /**
     * Get liquidation addresses for a customer
     */
    public function getLiquidationAddresses(string $customerId): array
    {
        return $this->makeRequest('GET', "/customers/{$customerId}/liquidation_addresses");
    }

    // ==================== WEBHOOKS ====================

    /**
     * Get webhook events for a specific webhook
     * 
     * @param string $webhookId The webhook ID
     * @return array Response containing webhook events
     */
    public function getWebhookEvents(string $webhookId): array
    {
        return $this->makeRequest('GET', "/webhooks/{$webhookId}/events");
    }

    /**
     * Get a specific webhook event by ID
     * 
     * @param string $webhookId The webhook ID
     * @param string $eventId The event ID
     * @return array Response containing the webhook event
     */
    public function getWebhookEvent(string $webhookId, string $eventId): array
    {
        return $this->makeRequest('GET', "/webhooks/{$webhookId}/events/{$eventId}");
    }

    /**
     * List all webhooks
     * 
     * @return array Response containing list of webhooks
     */
    public function getWebhooks(): array
    {
        return $this->makeRequest('GET', '/webhooks');
    }

    /**
     * Get a specific webhook by ID
     * 
     * @param string $webhookId The webhook ID
     * @return array Response containing the webhook details
     */
    public function getWebhook(string $webhookId): array
    {
        return $this->makeRequest('GET', "/webhooks/{$webhookId}");
    }
}