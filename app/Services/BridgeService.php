<?php

namespace App\Services;

use App\Models\PaymentMethod;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class BridgeService
{
    private string $apiKey = '';
    private string $baseUrl = '';
    private string $webhookSecret = '';
    private string $environment = 'production';

    /**
     * Initialize BridgeService
     * 
     * @param string|null $apiKey Optional API key (if not provided, will load from database or env)
     * @param string|null $environment Optional environment ('sandbox' or 'live', defaults to database setting or 'production')
     */
    public function __construct(?string $apiKey = null, ?string $environment = null)
    {
        // Load credentials from database first, then fall back to env
        $bridgeConfig = PaymentMethod::getConfig('bridge');

        // Determine environment
        if ($environment !== null) {
            $this->environment = trim(strtolower($environment));
        } elseif ($bridgeConfig && $bridgeConfig->mode_environment) {
            $this->environment = trim(strtolower($bridgeConfig->mode_environment));
        } else {
            $this->environment = trim(strtolower(env('BRIDGE_ENVIRONMENT', config('services.bridge.environment', 'production'))));
        }

        // Get API key - priority: parameter > database > env/config
        if ($apiKey !== null) {
            $this->apiKey = $apiKey;
        } elseif ($bridgeConfig) {
            // Use database credentials based on environment
            if ($this->environment === 'sandbox' && !empty($bridgeConfig->sandbox_api_key)) {
                $this->apiKey = $bridgeConfig->sandbox_api_key;
            } elseif ($this->environment === 'live' && !empty($bridgeConfig->live_api_key)) {
                $this->apiKey = $bridgeConfig->live_api_key;
            } else {
                // Fall back to env if database doesn't have credentials for this environment
                $this->apiKey = config('services.bridge.api_key', env('BRIDGE_API_KEY', ''));
            }
        } else {
            // Fall back to env/config
            $this->apiKey = config('services.bridge.api_key', env('BRIDGE_API_KEY', ''));
        }

        // Get webhook secret (from database if available, otherwise env)
        $webhookSecretValue = '';
        if ($bridgeConfig) {
            if ($this->environment === 'sandbox' && !empty($bridgeConfig->sandbox_webhook_public_key)) {
                $webhookSecretValue = $bridgeConfig->sandbox_webhook_public_key;
            } elseif ($this->environment === 'live' && !empty($bridgeConfig->live_webhook_public_key)) {
                $webhookSecretValue = $bridgeConfig->live_webhook_public_key;
            } else {
                $webhookSecretValue = config('services.bridge.webhook_secret', env('BRIDGE_WEBHOOK_SECRET', ''));
            }
        } else {
            $webhookSecretValue = config('services.bridge.webhook_secret', env('BRIDGE_WEBHOOK_SECRET', ''));
        }
        $this->webhookSecret = $webhookSecretValue ?? '';

        // Set base URL based on environment
        $explicitBaseUrl = env('BRIDGE_BASE_URL');
        if ($explicitBaseUrl) {
            $this->baseUrl = $explicitBaseUrl;
        } else {
            // Auto-detect based on environment
            if ($this->environment === 'sandbox') {
                $this->baseUrl = 'https://api.sandbox.bridge.xyz/v0';
            } else {
                $this->baseUrl = 'https://api.bridge.xyz/v0';
            }
        }

        if (empty($this->apiKey)) {
            Log::warning('Bridge API key is not configured', [
                'environment' => $this->environment,
                'source' => $bridgeConfig ? 'database' : 'env',
            ]);
        } else {
            Log::info('Bridge Service initialized', [
                'environment' => $this->environment,
                'base_url' => $this->baseUrl,
                'api_key_preview' => substr($this->apiKey, 0, 8) . '...' . substr($this->apiKey, -4),
                'source' => $bridgeConfig ? 'database' : 'env',
            ]);
        }
    }

    /**
     * Get the current environment
     * 
     * @return string
     */
    public function getEnvironment(): string
    {
        return $this->environment;
    }

    /**
     * Make authenticated request to Bridge API
     * 
     * @param string $method HTTP method (GET, POST, PUT, DELETE)
     * @param string $endpoint API endpoint (e.g., '/customers')
     * @param array $data Request body data
     * @param bool $useIdempotency Force idempotency key (defaults to true for POST)
     * @param string|null $customIdempotencyKey Optional custom idempotency key for retries
     * @return array Response array with 'success' and 'data' or 'error' keys
     */
    private function makeRequest(string $method, string $endpoint, array $data = [], bool $useIdempotency = false, ?string $customIdempotencyKey = null): array
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
                'Accept' => 'application/json',
            ];

            // Only set Content-Type for requests that have a body (POST, PUT, PATCH, DELETE with body)
            // GET requests should not have Content-Type: application/json as they don't have a body
            if (strtoupper($method) !== 'GET') {
                $headers['Content-Type'] = 'application/json';
            }

            // Add Idempotency-Key for POST requests (required by Bridge API)
            // This ensures duplicate requests are handled safely
            if ($useIdempotency || strtoupper($method) === 'POST') {
                $idempotencyKey = $customIdempotencyKey ?? Str::uuid()->toString();
                $headers['Idempotency-Key'] = $idempotencyKey;

                Log::debug('Bridge API Request with Idempotency Key', [
                    'method' => $method,
                    'url' => $url,
                    'idempotency_key' => $idempotencyKey,
                ]);
            }

            Log::debug('Bridge API Request', [
                'method' => $method,
                'url' => $url,
                'data' => $data, // Log the data being sent for debugging
            ]);

            // For GET requests, use query parameters instead of body
            // GET requests should not have a request body
            if (strtoupper($method) === 'GET') {
                // Build HTTP client - explicitly don't set Content-Type for GET
                $httpClient = Http::withHeaders($headers);

                // For GET requests with query parameters
                if (!empty($data)) {
                    // Laravel's HTTP client automatically uses data as query parameters for GET
                    $response = $httpClient->get($url, $data);
                } else {
                    // No data - make pure GET request with no body and no query params
                    $response = $httpClient->get($url);
                }
            } else {
                // For POST, PUT, DELETE, etc., send data as JSON body
                $response = Http::withHeaders($headers)->{strtolower($method)}($url, $data);
            }

            $statusCode = $response->status();
            $body = $response->json();

            // Log response for debugging (especially for GET requests)
            if (strtoupper($method) === 'GET' && strpos($endpoint, 'virtual_accounts') !== false) {
                Log::info('Bridge API Virtual Accounts Response', [
                    'endpoint' => $endpoint,
                    'status_code' => $statusCode,
                    'response_structure' => isset($body) ? gettype($body) : 'null',
                    'response_keys' => isset($body) && is_array($body) ? array_keys($body) : [],
                    'has_data_key' => isset($body['data']),
                    'data_count' => isset($body['data']) && is_array($body['data']) ? count($body['data']) : (isset($body['count']) ? $body['count'] : 'unknown'),
                    'full_response' => $body,
                ]);
            }

            if (!$response->successful()) {
                $errorMessage = $body['message'] ?? 'Bridge API request failed';

                // Log detailed error information including request data
                // Extract missing/invalid parameters from Bridge response if available
                $missingParams = $body['missing_parameters'] ?? $body['invalid_parameters'] ?? $body['errors'] ?? $body['error'] ?? null;
                if ($missingParams) {
                    if (is_string($missingParams)) {
                        $errorMessage .= ': ' . $missingParams;
                    } else {
                        $errorMessage .= ' Missing/Invalid parameters: ' . json_encode($missingParams);
                    }
                }

                // Handle 404 (Not Found) more gracefully - it's often expected when checking if resources exist
                $isNotFound = $statusCode === 404;
                $logLevel = $isNotFound ? 'warning' : 'error';
                $logMessage = $isNotFound ? 'Bridge API Resource Not Found' : 'Bridge API Error';

                Log::{$logLevel}($logMessage, [
                    'method' => $method,
                    'endpoint' => $endpoint,
                    'status' => $statusCode,
                    'request_data' => $data, // Include request data in error log
                    'response' => $body,
                    'error_message' => $errorMessage,
                    'missing_params' => $missingParams,
                    'full_response' => json_encode($body, JSON_PRETTY_PRINT),
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
        return $this->makeRequest('PATCH', "/customers/{$customerId}", $customerData);
    }

    /**
     * List all customers
     */
    public function getCustomers(): array
    {
        return $this->makeRequest('GET', '/customers');
    }

    /**
     * Request an endorsement for a customer
     * 
     * Per Bridge.xyz API docs: POST /customers/{customerId}/endorsements
     * 
     * @param string $customerId Bridge customer ID
     * @param array $endorsementData Endorsement data (e.g., ['endorsement_type' => 'cards'])
     * @return array Response with endorsement data or error
     */
    public function requestEndorsement(string $customerId, array $endorsementData): array
    {
        return $this->makeRequest('POST', "/customers/{$customerId}/endorsements", $endorsementData);
    }

    /**
     * Get Terms of Service link for a customer
     * 
     * @param string $email Customer email
     * @param string|null $redirectUri Optional redirect URI for callback
     * @return array
     */
    public function getTosLink(string $email, ?string $redirectUri = null): array
    {
        $data = ['email' => $email];

        Log::info('Bridge Service: getTosLink called', [
            'email' => $email,
            'redirect_uri' => $redirectUri ?? 'null (not provided)',
            'request_data' => $data,
        ]);

        $result = $this->makeRequest('POST', '/customers/tos_links', $data);

        // Append redirect_uri if provided
        if ($result['success'] && $redirectUri && isset($result['data']['url'])) {
            $urlBefore = $result['data']['url'];
            $separator = strpos($result['data']['url'], '?') !== false ? '&' : '?';
            $result['data']['url'] .= $separator . 'redirect_uri=' . urlencode($redirectUri);

            Log::info('Bridge Service: Added redirect_uri to TOS URL', [
                'url_before' => $urlBefore,
                'url_after' => $result['data']['url'],
                'redirect_uri' => $redirectUri,
            ]);
        } else {
            Log::info('Bridge Service: TOS link response (redirect_uri not added)', [
                'success' => $result['success'] ?? false,
                'has_url' => isset($result['data']['url']),
                'redirect_uri_provided' => !empty($redirectUri),
                'tos_url' => $result['data']['url'] ?? 'N/A',
            ]);
        }

        return $result;
    }

    /**
     * Create customer with custom KYC data (direct API approach)
     * 
     * @param array $customerData Customer data including KYC information
     * @return array
     */
    public function createCustomerWithKycData(array $customerData): array
    {
        return $this->makeRequest('POST', '/customers', $customerData);
    }

    /**
     * Create business customer directly via API
     * 
     * @param array $data Business customer data
     * @return array
     */
    public function createBusinessCustomer(array $data): array
    {
        return $this->makeRequest('POST', '/customers', $data);
    }

    /**
     * Get associated persons (beneficial owners) for a customer
     * 
     * @param string $customerId
     * @return array
     */
    public function getAssociatedPersons(string $customerId): array
    {
        // Associated persons are typically included in the customer response
        // But we can also try a dedicated endpoint if Bridge has one
        // For now, we'll get them from the customer data
        $customerResult = $this->getCustomer($customerId);

        if ($customerResult['success'] && isset($customerResult['data']['associated_persons'])) {
            return [
                'success' => true,
                'data' => $customerResult['data']['associated_persons'],
            ];
        }

        return [
            'success' => true,
            'data' => [],
        ];
    }

    /**
     * Create an associated person (beneficial owner or control person) for a business customer
     * 
     * @param string $customerId The Bridge customer ID
     * @param array $personData Associated person data including:
     *   - first_name, last_name, email, birth_date, title
     *   - ownership_percentage (for beneficial owners)
     *   - is_beneficial_owner: true (if ownership >= 25%)
     *   - has_control: true (for control persons like CEO, CFO, COO)
     *   - has_ownership: true (if they have ownership)
     *   - attested_ownership_structure_at (timestamp)
     *   - residential_address
     *   - identifying_information (SSN, driver's license, etc.)
     * @return array
     */
    public function createAssociatedPerson(string $customerId, array $personData): array
    {
        return $this->makeRequest('POST', "/customers/{$customerId}/associated_persons", $personData);
    }

    /**
     * Update an associated person (beneficial owner or control person) for a business customer
     * 
     * @param string $customerId The Bridge customer ID
     * @param string $associatedPersonId The Bridge associated person ID
     * @param array $personData Associated person data to update
     * @return array
     */
    public function updateAssociatedPerson(string $customerId, string $associatedPersonId, array $personData): array
    {
        return $this->makeRequest('PUT', "/customers/{$customerId}/associated_persons/{$associatedPersonId}", $personData);
    }

    // ==================== KYC LINKS ====================

    /**
     * Create KYC link (correct approach - no customer_id needed)
     */
    public function createKYCLink(array $data): array
    {
        // POST /v0/kyc_links with full_name, email, type
        $result = $this->makeRequest('POST', '/kyc_links', $data);

        // Handle duplicate_record error - Bridge returns existing KYC link in the response
        if (!$result['success'] && isset($result['response']['code']) && $result['response']['code'] === 'duplicate_record') {
            $existingLink = $result['response']['existing_kyc_link'] ?? null;

            if ($existingLink) {
                Log::info('Bridge KYC Link already exists, using existing link', [
                    'kyc_link_id' => $existingLink['id'] ?? null,
                    'customer_id' => $existingLink['customer_id'] ?? null,
                    'email' => $existingLink['email'] ?? null,
                ]);

                // Return as success with the existing link data
                return [
                    'success' => true,
                    'data' => $existingLink,
                    'is_existing' => true, // Flag to indicate this is an existing link
                ];
            }
        }

        return $result;
    }

    /**
     * Get KYC link status
     */
    public function getKYCLink(string $linkId): array
    {
        return $this->makeRequest('GET', "/kyc_links/{$linkId}");
    }

    /**
     * Get KYC link for an existing customer
     * GET /customers/{customerID}/kyc_link
     * 
     * @param string $customerId The Bridge customer ID
     * @return array
     */
    public function getCustomerKycLink(string $customerId): array
    {
        try {
            $response = Http::withHeaders([
                'Api-Key' => $this->apiKey,
            ])->get("{$this->baseUrl}/customers/{$customerId}/kyc_link");

            if ($response->successful()) {
                return ['success' => true, 'data' => $response->json()];
            }

            Log::warning('Failed to get customer KYC link', [
                'customer_id' => $customerId,
                'status' => $response->status(),
                'response' => $response->body(),
            ]);

            return [
                'success' => false,
                'error' => $response->body(),
                'status' => $response->status(),
            ];
        } catch (\Exception $e) {
            Log::error('Exception getting customer KYC link', [
                'customer_id' => $customerId,
                'error' => $e->getMessage(),
            ]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Convert KYC link URL to widget URL for iframe embedding
     * 
     * @param string $kycLinkUrl The original KYC link URL
     * @return string|null The widget URL for iframe, or null if conversion fails
     */
    public function convertKycLinkToWidgetUrl(string $kycLinkUrl): ?string
    {
        try {
            // Parse the KYC link URL to extract parameters
            // Example: https://bridge.withpersona.com/verify?fields[developer_id]=xxx&fields[email_address]=xxx&fields[iqt_token]=xxx&environment-id=xxx&inquiry-template-id=xxx&reference-id=xxx

            $parsedUrl = parse_url($kycLinkUrl);
            if (!$parsedUrl || !isset($parsedUrl['query'])) {
                Log::warning('Invalid KYC link URL format', ['url' => $kycLinkUrl]);
                return null;
            }

            parse_str($parsedUrl['query'], $params);

            // Extract required parameters
            $iqtToken = $params['fields']['iqt_token'] ?? null;
            $environmentId = $params['environment-id'] ?? null;
            $inquiryTemplateId = $params['inquiry-template-id'] ?? null;
            $developerId = $params['fields']['developer_id'] ?? null;

            if (!$iqtToken || !$environmentId || !$inquiryTemplateId) {
                Log::warning('Missing required parameters in KYC link', [
                    'url' => $kycLinkUrl,
                    'params' => $params
                ]);
                return null;
            }

            // Determine environment (sandbox or production)
            $environment = $this->baseUrl === 'https://api.sandbox.bridge.xyz/v0' ? 'sandbox' : 'production';

            // Build widget URL
            $widgetUrl = 'https://bridge.withpersona.com/widget?' . http_build_query([
                'environment' => $environment,
                'inquiry-template-id' => $inquiryTemplateId,
                'fields[iqt_token]' => $iqtToken,
                'iframe-origin' => request()->getSchemeAndHttpHost(),
            ]);

            // Add developer_id if present
            if ($developerId) {
                $widgetUrl .= '&fields[developer_id]=' . urlencode($developerId);
            }

            // Add email if present
            if (isset($params['fields']['email_address'])) {
                $widgetUrl .= '&fields[email_address]=' . urlencode($params['fields']['email_address']);
            }

            return $widgetUrl;
        } catch (\Exception $e) {
            Log::error('Failed to convert KYC link to widget URL', [
                'url' => $kycLinkUrl,
                'error' => $e->getMessage()
            ]);
            return null;
        }
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
    /**
     * Check if we're in sandbox mode
     */
    public function isSandbox(): bool
    {
        return $this->environment === 'sandbox';
    }

    public function createWallet(string $customerId, string $chain = 'solana'): array
    {
        // Check if we're in sandbox mode - wallets are not available in sandbox
        if ($this->isSandbox()) {
            return [
                'success' => false,
                'error' => 'Wallets are not available in sandbox mode. Please switch to production mode to create wallets.',
                'error_code' => 'SANDBOX_WALLETS_NOT_AVAILABLE',
                'environment' => 'sandbox',
            ];
        }

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
     * Generate a unique Ethereum-style address for sandbox mode
     * 
     * NOTE: In production, you should use a real wallet address you control.
     * This method is only for sandbox/testing purposes.
     */
    public function generateEthereumAddress(): string
    {
        // Generate 40 hex characters (20 bytes)
        $hex = bin2hex(random_bytes(20));
        return '0x' . $hex;
    }

    /**
     * Create a virtual account for deposits
     * 
     * Per Bridge.xyz documentation:
     * 
     * SANDBOX MODE:
     * - Uses dummy data with Ethereum payment rail
     * - Auto-generates Ethereum address if not provided
     * - Uses USDC currency for Ethereum payment rail
     * - bridge_wallet_id is not used (removed automatically)
     * 
     * PRODUCTION MODE:
     * - Requires valid wallet address you control (if using address-based payment rails)
     * - Can use bridge_wallet payment rail with bridge_wallet_id
     * - Uses actual currency (USD/usdc)
     * 
     * IMPORTANT NOTES:
     * - Virtual accounts don't hold balances. To track funds:
     *   * Use getVirtualAccountHistory() to check transaction history
     *   * Set up webhooks for real-time notifications
     * 
     * @param string $customerId Bridge customer ID
     * @param array $source Source deposit instructions (e.g., ['currency' => 'usd'])
     * @param array $destination Destination details (payment_rail, currency, address)
     * @param string|null $developerFeePercent Optional developer fee percentage
     * @return array Response with virtual account data or error
     */
    public function createVirtualAccount(string $customerId, array $source, array $destination, ?string $developerFeePercent = null): array
    {
        // Sandbox mode: Use dummy data per Bridge.xyz documentation
        if ($this->isSandbox()) {
            // Override bridge_wallet payment rail to ethereum (sandbox requirement)
            if (!isset($destination['payment_rail']) || $destination['payment_rail'] === 'bridge_wallet') {
                $destination['payment_rail'] = 'ethereum';
            }

            // Auto-generate Ethereum address for sandbox if not provided
            // Per Bridge.xyz docs: Sandbox uses dummy data with auto-generated addresses
            if (!isset($destination['address'])) {
                $destination['address'] = $this->generateEthereumAddress();
            }

            // Set currency to usdc for Ethereum in sandbox (per Bridge.xyz docs)
            if (!isset($destination['currency']) || $destination['currency'] === 'usdc') {
                $destination['currency'] = 'usdc';
            }

            // Remove bridge_wallet_id in sandbox (not used with Ethereum payment rail)
            unset($destination['bridge_wallet_id']);
        } else {
            // Production mode: Validate requirements based on payment rail
            // For address-based payment rails, address is required
            // For bridge_wallet payment rail, bridge_wallet_id is required
            if (!isset($destination['payment_rail']) || $destination['payment_rail'] !== 'bridge_wallet') {
                if (!isset($destination['address']) || empty($destination['address'])) {
                    return [
                        'success' => false,
                        'error' => 'Destination address is required in production mode for address-based payment rails. Please provide a valid wallet address you control.',
                        'error_code' => 'MISSING_DESTINATION_ADDRESS',
                    ];
                }
            }
        }

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
     * 
     * Use this to track funds for virtual accounts since they don't hold balances.
     * This endpoint returns all transactions (deposits, transfers) for the virtual account.
     * 
     * @param string $customerId Bridge customer ID
     * @param string $virtualAccountId Virtual account ID
     * @return array Response with transaction history
     */
    public function getVirtualAccountHistory(string $customerId, string $virtualAccountId): array
    {
        return $this->makeRequest('GET', "/customers/{$customerId}/virtual_accounts/{$virtualAccountId}/history");
    }

    // ==================== CARD ACCOUNTS ====================

    /**
     * Enable cards product for sandbox environment
     * This initializes the cards product in sandbox with default funding strategy
     * 
     * @return array Response indicating success or error
     */
    public function enableCardsProduct(): array
    {
        // Endpoint: POST /cards/enable
        // This sets up the sandbox environment with default funding strategy
        return $this->makeRequest('POST', '/cards/enable', []);
    }

    /**
     * Create a card account for a customer
     * 
     * @param string $customerId Bridge customer ID
     * @param array $cardData Card account data (optional, Bridge may auto-create)
     * @return array Response with card account data or error
     */
    public function createCardAccount(string $customerId, array $cardData = []): array
    {
        // Correct endpoint: /customers/{customerId}/card_accounts
        // Bridge API may auto-create card accounts, but we can explicitly create them
        return $this->makeRequest('POST', "/customers/{$customerId}/card_accounts", $cardData);
    }

    /**
     * Get card accounts for a customer
     * 
     * @param string $customerId Bridge customer ID
     * @return array Response with card accounts list
     */
    public function getCardAccounts(string $customerId): array
    {
        return $this->makeRequest('GET', "/customers/{$customerId}/card_accounts");
    }

    /**
     * Get card account by ID
     * 
     * @param string $customerId Bridge customer ID
     * @param string $cardAccountId Card account ID
     * @return array Response with card account data
     */
    public function getCardAccount(string $customerId, string $cardAccountId): array
    {
        return $this->makeRequest('GET', "/customers/{$customerId}/card_accounts/{$cardAccountId}");
    }

    // ==================== EXTERNAL ACCOUNTS ====================

    /**
     * Create an external account (bank account)
     * 
     * @param string $customerId Bridge customer ID
     * @param array $accountData Account data formatted according to Bridge API
     * @param string|null $idempotencyKey Optional idempotency key for the request
     * @return array
     */
    public function createExternalAccount(string $customerId, array $accountData, ?string $idempotencyKey = null): array
    {
        // Correct endpoint: /customers/{customerId}/external_accounts
        // makeRequest automatically adds Idempotency-Key for POST requests, but we can pass a custom one
        return $this->makeRequest('POST', "/customers/{$customerId}/external_accounts", $accountData, true, $idempotencyKey);
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
     * 
     * Per Bridge.xyz API documentation (https://apidocs.bridge.xyz/api-reference):
     * 
     * Transfer format examples:
     * 
     * Sandbox (Ethereum crypto-to-crypto):
     * {
     *   "amount": "100.00",
     *   "on_behalf_of": "customer_id",
     *   "source": {
     *     "payment_rail": "ethereum",
     *     "currency": "usdc",
     *     "from_address": "0x..."
     *   },
     *   "destination": {
     *     "payment_rail": "ethereum",
     *     "currency": "usdc",
     *     "to_address": "0x..."
     *   }
     * }
     * 
     * Production (Bridge wallet):
     * {
     *   "amount": "100.00",
     *   "on_behalf_of": "customer_id",
     *   "source": {
     *     "payment_rail": "bridge_wallet",
     *     "currency": "usdc",
     *     "bridge_wallet_id": "wallet_id"
     *   },
     *   "destination": {
     *     "payment_rail": "bridge_wallet",
     *     "currency": "usdc",
     *     "bridge_wallet_id": "wallet_id"
     *   }
     * }
     * 
     * @param array $transferData Transfer data with source and destination
     * @param string|null $idempotencyKey Optional idempotency key for safe retries (auto-generated if not provided)
     * @return array Response with transfer data or error
     */
    public function createTransfer(array $transferData, ?string $idempotencyKey = null): array
    {
        // Validate required fields per Bridge API requirements
        if (empty($transferData['amount'])) {
            return [
                'success' => false,
                'error' => 'Amount is required for transfers',
                'error_code' => 'MISSING_AMOUNT',
            ];
        }

        if (empty($transferData['on_behalf_of'])) {
            return [
                'success' => false,
                'error' => 'on_behalf_of (customer ID) is required for transfers',
                'error_code' => 'MISSING_ON_BEHALF_OF',
            ];
        }

        if (empty($transferData['source']) || empty($transferData['destination'])) {
            return [
                'success' => false,
                'error' => 'Both source and destination are required for transfers',
                'error_code' => 'MISSING_SOURCE_OR_DESTINATION',
            ];
        }

        // Validate source payment rail and required fields
        $sourceRail = $transferData['source']['payment_rail'] ?? null;
        if (!$sourceRail) {
            return [
                'success' => false,
                'error' => 'Source payment_rail is required',
                'error_code' => 'MISSING_SOURCE_PAYMENT_RAIL',
            ];
        }

        // Validate destination payment rail and required fields
        $destRail = $transferData['destination']['payment_rail'] ?? null;
        if (!$destRail) {
            return [
                'success' => false,
                'error' => 'Destination payment_rail is required',
                'error_code' => 'MISSING_DESTINATION_PAYMENT_RAIL',
            ];
        }

        // Log transfer creation attempt
        Log::info('Creating Bridge transfer', [
            'environment' => $this->isSandbox() ? 'sandbox' : 'production',
            'amount' => $transferData['amount'] ?? null,
            'on_behalf_of' => $transferData['on_behalf_of'] ?? null,
            'source_payment_rail' => $sourceRail,
            'destination_payment_rail' => $destRail,
            'source_currency' => $transferData['source']['currency'] ?? null,
            'destination_currency' => $transferData['destination']['currency'] ?? null,
        ]);

        // makeRequest automatically adds idempotency key for POST requests
        // Pass custom idempotency key if provided
        $result = $this->makeRequest('POST', '/transfers', $transferData, true, $idempotencyKey);

        if ($result['success']) {
            Log::info('Bridge transfer created successfully', [
                'transfer_id' => $result['data']['id'] ?? null,
                'state' => $result['data']['state'] ?? null,
                'amount' => $transferData['amount'] ?? null,
            ]);
        } else {
            Log::warning('Bridge transfer creation failed', [
                'error' => $result['error'] ?? 'Unknown error',
                'error_code' => $result['error_code'] ?? null,
                'status' => $result['status'] ?? null,
            ]);
        }

        return $result;
    }

    /**
     * Create a transfer between two Bridge wallets
     * 
     * Per Bridge.xyz API documentation for wallet-to-wallet transfers
     * 
     * @param string $fromCustomerId Source customer ID
     * @param string $fromWalletId Source wallet ID
     * @param string $toCustomerId Destination customer ID (on_behalf_of)
     * @param string $toWalletId Destination wallet ID
     * @param float $amount Transfer amount
     * @param string $currency Currency (default: USD, converted to usdc for bridge_wallet)
     * @return array Response with transfer data or error
     */
    public function createWalletToWalletTransfer(
        string $fromCustomerId,
        string $fromWalletId,
        string $toCustomerId,
        string $toWalletId,
        float $amount,
        string $currency = 'USD',
        ?string $fromAddress = null,
        ?string $toAddress = null
    ): array {
        // Convert USD to usdc for bridge_wallet payment rail
        $bridgeCurrency = strtolower($currency) === 'usd' ? 'usdc' : strtolower($currency);

        // In sandbox mode: Virtual accounts use ethereum payment rail, not bridge_wallet
        // In production mode: Both use bridge_wallet payment rail
        if ($this->isSandbox()) {
            // In sandbox: Virtual accounts are on ethereum chain
            // For ethereum payment rail, source must use virtual_account_id or address (NOT bridge_wallet_id)
            // Destination can use virtual_account_id or address
            if (empty($fromWalletId) && empty($fromAddress)) {
                return [
                    'success' => false,
                    'error' => 'Source wallet ID (virtual account ID) or address is required for transfers in sandbox mode.',
                    'error_code' => 'MISSING_SOURCE_WALLET_ID',
                ];
            }

            // For ethereum payment rail (crypto-to-crypto transfers), we MUST use 'from_address' and 'to_address' (NOT bridge_wallet_id or address)
            // Get source address from virtual account if we have virtual account ID
            $sourceAddress = $fromAddress;
            if (empty($sourceAddress) && !empty($fromWalletId)) {
                $virtualAccountResult = $this->getVirtualAccount($fromCustomerId, $fromWalletId);
                if ($virtualAccountResult['success'] && isset($virtualAccountResult['data']['destination']['address'])) {
                    $sourceAddress = $virtualAccountResult['data']['destination']['address'];
                } else {
                    return [
                        'success' => false,
                        'error' => 'Could not retrieve source address from virtual account. Virtual account ID: ' . $fromWalletId,
                        'error_code' => 'VIRTUAL_ACCOUNT_FETCH_FAILED',
                    ];
                }
            }

            if (empty($sourceAddress)) {
                return [
                    'success' => false,
                    'error' => 'Source address is required for ethereum payment rail transfers in sandbox mode.',
                    'error_code' => 'MISSING_SOURCE_ADDRESS',
                ];
            }

            // Get destination address from virtual account if we have virtual account ID
            $destinationAddress = $toAddress;
            if (empty($destinationAddress) && !empty($toWalletId)) {
                $virtualAccountResult = $this->getVirtualAccount($toCustomerId, $toWalletId);
                if ($virtualAccountResult['success'] && isset($virtualAccountResult['data']['destination']['address'])) {
                    $destinationAddress = $virtualAccountResult['data']['destination']['address'];
                } else {
                    return [
                        'success' => false,
                        'error' => 'Could not retrieve destination address from virtual account. Virtual account ID: ' . $toWalletId,
                        'error_code' => 'VIRTUAL_ACCOUNT_FETCH_FAILED',
                    ];
                }
            }

            if (empty($destinationAddress)) {
                return [
                    'success' => false,
                    'error' => 'Destination address is required for ethereum payment rail transfers in sandbox mode.',
                    'error_code' => 'MISSING_DESTINATION_ADDRESS',
                ];
            }

            // In sandbox, virtual accounts are on ethereum chain
            // For ethereum payment rail (crypto-to-crypto): MUST use 'from_address' and 'to_address' (NOT bridge_wallet_id or address)
            $transferData = [
                'amount' => number_format($amount, 2, '.', ''),
                'on_behalf_of' => $toCustomerId,
                'source' => [
                    'payment_rail' => 'ethereum', // Virtual accounts use ethereum chain
                    'currency' => 'usdc', // Sandbox uses USDC for Ethereum
                    'from_address' => $sourceAddress, // For ethereum crypto-to-crypto transfers, use from_address
                ],
                'destination' => [
                    'payment_rail' => 'ethereum', // Virtual accounts use ethereum chain
                    'currency' => 'usdc',
                    'to_address' => $destinationAddress, // For ethereum crypto-to-crypto transfers, use to_address
                ],
            ];
        } else {
            // Production mode: Use bridge_wallet payment rail for both
            $transferData = [
                'amount' => number_format($amount, 2, '.', ''),
                'on_behalf_of' => $toCustomerId,
                'source' => [
                    'payment_rail' => 'bridge_wallet',
                    'currency' => $bridgeCurrency,
                    'bridge_wallet_id' => $fromWalletId,
                ],
                'destination' => [
                    'payment_rail' => 'bridge_wallet',
                    'currency' => $bridgeCurrency,
                    'bridge_wallet_id' => $toWalletId,
                ],
            ];
        }

        return $this->createTransfer($transferData);
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

    /**
     * Create a transfer from external account to Bridge wallet (for USD top-up/deposit)
     * 
     * @param string $customerId Bridge customer ID
     * @param string $externalAccountId External bank account ID
     * @param string $walletId Bridge wallet ID
     * @param float $amount Amount to transfer
     * @param string $currency Currency (default: USD)
     * @return array
     */
    public function createTransferFromExternalAccount(string $customerId, string $externalAccountId, string $walletId, float $amount, string $currency = 'USD'): array
    {
        $transferData = [
            'amount' => number_format($amount, 2, '.', ''),
            'on_behalf_of' => $customerId,
            'source' => [
                'payment_rail' => 'ach',
                'currency' => strtolower($currency),
                'external_account_id' => $externalAccountId,
            ],
            'destination' => [
                'payment_rail' => 'bridge_wallet',
                'currency' => strtolower($currency) === 'usd' ? 'usdc' : strtolower($currency),
                'bridge_wallet_id' => $walletId,
            ],
        ];

        return $this->createTransfer($transferData);
    }

    /**
     * Create a transfer from Bridge wallet to external account (for withdrawal/payout)
     * 
     * Per Bridge.xyz API documentation:
     * - Source: bridge_wallet payment rail with bridge_wallet_id
     * - Destination: ach or wire payment rail with external_account_id
     * 
     * @param string $customerId Bridge customer ID
     * @param string $walletId Bridge wallet ID
     * @param string $externalAccountId External bank account ID
     * @param float $amount Amount to withdraw
     * @param string $currency Currency (default: USD)
     * @param string $paymentRail Payment rail for withdrawal (default: 'ach', can be 'ach' or 'wire')
     * @return array
     */
    public function createTransferToExternalAccount(string $customerId, string $walletId, string $externalAccountId, float $amount, string $currency = 'USD', string $paymentRail = 'ach'): array
    {
        // Convert USD to USDB for bridge_wallet payment rail
        $bridgeCurrency = strtolower($currency) === 'usd' ? 'usdc' : strtolower($currency);
        
        // Validate payment rail
        $validPaymentRails = ['ach', 'wire'];
        if (!in_array(strtolower($paymentRail), $validPaymentRails)) {
            return [
                'success' => false,
                'error' => 'Invalid payment rail. Must be "ach" or "wire"',
                'error_code' => 'INVALID_PAYMENT_RAIL',
            ];
        }

        $transferData = [
            'amount' => number_format($amount, 2, '.', ''),
            'on_behalf_of' => $customerId,
            'source' => [
                'payment_rail' => 'bridge_wallet',
                'currency' => $bridgeCurrency,
                'bridge_wallet_id' => $walletId,
            ],
            'destination' => [
                'payment_rail' => strtolower($paymentRail), // 'ach' or 'wire'
                'currency' => strtolower($currency),
                'external_account_id' => $externalAccountId,
            ],
        ];

        return $this->createTransfer($transferData);
    }

    /**
     * Create a virtual account for USD deposits to Bridge wallet
     * 
     * Per Bridge.xyz docs:
     * - Sandbox: Uses dummy data with Ethereum payment rail and auto-generated address
     * - Production: Uses bridge_wallet payment rail with actual wallet ID
     * 
     * @param string $customerId Bridge customer ID
     * @param string $walletId Bridge wallet ID (not used in sandbox)
     * @param string $currency Currency (default: USD)
     * @return array
     */
    public function createVirtualAccountForWallet(string $customerId, string $walletId, string $currency = 'USD'): array
    {
        $source = [
            'currency' => strtolower($currency),
        ];

        // In sandbox mode: Use dummy data per Bridge.xyz documentation
        // Sandbox uses Ethereum payment rail with auto-generated address and USDC currency
        $destination = [
            'currency' => 'usdc',
        ];

        if ($this->isSandbox()) {
            $destination['payment_rail'] = 'ethereum';
            $destination['address'] = $this->generateEthereumAddress();
        } else {
            $destination['payment_rail'] = 'bridge_wallet';
            $destination['bridge_wallet_id'] = $walletId;
        }

        return $this->createVirtualAccount($customerId, $source, $destination);
    }

    /**
     * Create a virtual account for chain wallet deposits (Solana, Ethereum, etc.)
     * 
     * @param string $customerId Bridge customer ID
     * @param string $walletId Bridge wallet ID
     * @param string $chain Blockchain chain (solana, ethereum, etc.)
     * @return array
     */
    public function createVirtualAccountForChainWallet(string $customerId, string $walletId, string $chain = 'solana'): array
    {
        $source = [
            'currency' => 'usd',
        ];

        // In sandbox mode, always use Ethereum with generated address
        if ($this->isSandbox()) {
            $destination = [
                'payment_rail' => 'ethereum',
                'currency' => 'usdc',
                'address' => $this->generateEthereumAddress(),
            ];
        } else {
            $destination = [
                'payment_rail' => $chain,
                'currency' => 'usdc',
                'bridge_wallet_id' => $walletId,
            ];
        }

        return $this->createVirtualAccount($customerId, $source, $destination);
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

    /**
     * Create a webhook with all event categories
     * 
     * @param string $webhookUrl The webhook URL
     * @return array Response containing the webhook details
     */
    public function createWebhook(string $webhookUrl): array
    {
        $data = [
            'url' => $webhookUrl,
            'event_categories' => [
                'customer',
                'kyc_link',
                'liquidation_address.drain',
                'static_memo.activity',
                'transfer',
                'virtual_account.activity',
                'card_account',
                'card_transaction',
                'posted_card_account_transaction',
                'card_withdrawal',
            ],
            // Bridge API requires event_epoch to be one of: "beginning_of_time" or "webhook_creation"
            // "beginning_of_time" - receive all historical events
            // "webhook_creation" - only receive events from webhook creation time forward
            'event_epoch' => 'webhook_creation',
        ];

        Log::info('Creating Bridge webhook', [
            'url' => $webhookUrl,
            'event_categories_count' => count($data['event_categories']),
            'event_epoch' => $data['event_epoch'],
        ]);

        return $this->makeRequest('POST', '/webhooks', $data);
    }

    /**
     * Activate a webhook
     * 
     * @param string $webhookId The webhook ID
     * @param string $webhookUrl The webhook URL
     * @param array $eventCategories Event categories to subscribe to
     * @return array Response containing the updated webhook details
     */
    public function activateWebhook(string $webhookId, string $webhookUrl, array $eventCategories = []): array
    {
        // If no event categories provided, use all supported categories
        if (empty($eventCategories)) {
            $eventCategories = [
                'customer',
                'kyc_link',
                'liquidation_address.drain',
                'static_memo.activity',
                'transfer',
                'virtual_account.activity',
                'card_account',
                'card_transaction',
                'posted_card_account_transaction',
                'card_withdrawal',
            ];
        }

        $data = [
            'url' => $webhookUrl,
            'status' => 'active',
            'event_categories' => $eventCategories,
            // Bridge API requires event_epoch to be one of: "beginning_of_time" or "webhook_creation"
            // "beginning_of_time" - receive all historical events
            // "webhook_creation" - only receive events from webhook creation time forward
            'event_epoch' => 'webhook_creation',
        ];

        Log::info('Activating Bridge webhook', [
            'webhook_id' => $webhookId,
            'url' => $webhookUrl,
            'status' => 'active',
            'event_epoch' => $data['event_epoch'],
        ]);

        return $this->makeRequest('PUT', "/webhooks/{$webhookId}", $data);
    }

    /**
     * Find or create and activate a webhook for the given URL
     * 
     * @param string $webhookUrl The webhook URL
     * @return array Response containing webhook details and public_key for signature verification
     */
    public function findOrCreateWebhook(string $webhookUrl): array
    {
        try {
            // First, try to find existing webhook
            $webhooksResult = $this->getWebhooks();

            if ($webhooksResult['success'] && isset($webhooksResult['data']['data'])) {
                foreach ($webhooksResult['data']['data'] as $webhook) {
                    if (isset($webhook['url']) && $webhook['url'] === $webhookUrl) {
                        Log::info('Found existing Bridge webhook', [
                            'webhook_id' => $webhook['id'] ?? 'N/A',
                            'url' => $webhookUrl,
                            'status' => $webhook['status'] ?? 'unknown',
                        ]);

                        // If webhook exists but is not active, activate it
                        if (isset($webhook['status']) && $webhook['status'] !== 'active') {
                            $activateResult = $this->activateWebhook(
                                $webhook['id'],
                                $webhookUrl,
                                $webhook['event_categories'] ?? []
                            );

                            if ($activateResult['success']) {
                                return $activateResult;
                            }
                        }

                        return [
                            'success' => true,
                            'data' => $webhook,
                            'existing' => true,
                        ];
                    }
                }
            }

            // No existing webhook found, create a new one
            Log::info('No existing webhook found, creating new one', ['url' => $webhookUrl]);
            $createResult = $this->createWebhook($webhookUrl);

            if (!$createResult['success']) {
                return $createResult;
            }

            $webhookId = $createResult['data']['id'] ?? null;
            if (!$webhookId) {
                return [
                    'success' => false,
                    'error' => 'Webhook created but no ID returned',
                ];
            }

            // Activate the newly created webhook
            $activateResult = $this->activateWebhook($webhookId, $webhookUrl);

            if ($activateResult['success']) {
                Log::info('Bridge webhook created and activated successfully', [
                    'webhook_id' => $webhookId,
                    'url' => $webhookUrl,
                ]);
            }

            return $activateResult;
        } catch (\Exception $e) {
            Log::error('Failed to find or create Bridge webhook', [
                'url' => $webhookUrl,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }
}
