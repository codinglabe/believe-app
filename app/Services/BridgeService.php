<?php

namespace App\Services;

use App\Models\BridgeIntegration;
use App\Models\BridgeWallet;
use App\Models\PaymentMethod;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Laravel\Cashier\Cashier;

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
     * HTTP client for Bridge API (verify_ssl can be disabled for local cURL CA issues).
     */
    private function httpClient(array $headers): \Illuminate\Http\Client\PendingRequest
    {
        $verify = config('services.bridge.verify_ssl', true);

        return Http::withOptions(['verify' => $verify])->withHeaders($headers);
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
                $httpClient = $this->httpClient($headers);

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
            $response = $this->httpClient($headers)->{strtolower($method)}($url, $data);
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

                // Extract missing/invalid parameters from Bridge response if available
                $missingParams = $body['missing_parameters'] ?? $body['invalid_parameters'] ?? $body['errors'] ?? $body['error'] ?? null;
                if ($missingParams) {
                    if (is_string($missingParams)) {
                        $errorMessage .= ': ' . $missingParams;
                    } else {
                        $errorMessage .= ' Missing/Invalid parameters: ' . json_encode($missingParams);
                    }
                }

                if (isset($body['source']['key']) && is_array($body['source']['key'])) {
                    $fieldErrors = [];
                    foreach ($body['source']['key'] as $field => $reason) {
                        $fieldErrors[] = $field . ': ' . $reason;
                    }
                    if ($fieldErrors !== []) {
                        $errorMessage .= ' (' . implode('; ', $fieldErrors) . ')';
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
     * Find customers by email (Bridge supports email query filter).
     */
    public function getCustomersByEmail(string $email): array
    {
        return $this->makeRequest('GET', '/customers', ['email' => trim($email)]);
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

        if ($redirectUri) {
            $data['redirect_uri'] = $redirectUri;
        }
        
        Log::info('Bridge Service: getTosLink called', [
            'email' => $email,
            'redirect_uri' => $redirectUri ?? 'null (not provided)',
            'request_data' => $data,
        ]);
        
        $result = $this->makeRequest('POST', '/customers/tos_links', $data);
        
        // Fallback: append redirect_uri when Bridge omits it from the response URL.
        if ($result['success'] && $redirectUri && isset($result['data']['url'])) {
            $url = $result['data']['url'];
            if (! str_contains($url, 'redirect_uri=')) {
                $urlBefore = $url;
                $separator = str_contains($url, '?') ? '&' : '?';
                $result['data']['url'] = $url.$separator.'redirect_uri='.urlencode($redirectUri);

                Log::info('Bridge Service: Appended redirect_uri to TOS URL', [
                'url_before' => $urlBefore,
                'url_after' => $result['data']['url'],
                'redirect_uri' => $redirectUri,
            ]);
            }
        } else {
            Log::info('Bridge Service: TOS link response', [
                'success' => $result['success'] ?? false,
                'has_url' => isset($result['data']['url']),
                'redirect_uri_provided' => ! empty($redirectUri),
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
     * Get KYC link for an existing customer (GET /customers/{id}/kyc_link).
     *
     * @see https://apidocs.bridge.xyz/api-reference/customers/retrieve-a-hosted-kyc-link-for-an-existing-customer
     */
    public function getCustomerKycLink(
        string $customerId,
        ?string $endorsement = null,
        ?string $redirectUri = null,
    ): array {
        $query = [];

            if ($endorsement) {
            $query['endorsement'] = $endorsement;
        }

        if ($redirectUri) {
            $query['redirect_uri'] = $redirectUri;
        }

        $result = $this->makeRequest('GET', "/customers/{$customerId}/kyc_link", $query);

        if (! ($result['success'] ?? false)) {
            Log::warning('Failed to get customer KYC link', [
                'customer_id' => $customerId,
                'endorsement' => $endorsement,
                'status' => $result['status'] ?? null,
                'error' => $result['error'] ?? null,
            ]);
        }

        return $result;
    }

    /**
     * Base wallet KYC link — GET /customers/{id}/kyc_link (no endorsement param).
     * Use this for wallet identity verification, not cards issuance.
     *
     * @see https://apidocs.bridge.xyz/platform/customers/customers/kyclinks
     */
    public function resolveBaseKycLink(
        string $customerId,
        ?string $redirectUri = null,
        ?string $kycLinkId = null,
    ): array {
        $result = ['success' => false, 'error' => 'Failed to get base KYC link'];

        for ($attempt = 1; $attempt <= 3; $attempt++) {
            if ($attempt > 1) {
                sleep(1);
            }

            $attemptRedirect = $attempt <= 2 ? $redirectUri : null;
            $fetchResult = $this->getCustomerKycLink($customerId, null, $attemptRedirect);
            $url = $this->extractKycLinkUrl($fetchResult);

            if ($url !== null) {
                Log::info('Base KYC link resolved via GET /customers/{id}/kyc_link', [
                    'customer_id' => $customerId,
                    'attempt' => $attempt,
                ]);

                return [
                    'success' => true,
                    'url' => $url,
                    'data' => $fetchResult['data'] ?? ['url' => $url, 'kyc_link' => $url],
                    'source' => 'customer_kyc_link_base',
                    'endorsement' => 'base',
                ];
            }

            if (($fetchResult['status'] ?? 0) !== 500) {
                $result = $fetchResult;
                break;
            }
        }

        if ($kycLinkId) {
            $linkResult = $this->getKYCLink($kycLinkId);
            $url = $this->extractKycLinkUrl($linkResult);

            if ($url !== null) {
                Log::info('Base KYC link resolved via stored kyc_links resource', [
                    'customer_id' => $customerId,
                    'kyc_link_id' => $kycLinkId,
                ]);

                return [
                    'success' => true,
                    'url' => $url,
                    'data' => $linkResult['data'] ?? ['url' => $url, 'kyc_link' => $url],
                    'source' => 'kyc_links_resource',
                    'endorsement' => 'base',
                ];
            }
        }
            
            return [
                'success' => false, 
            'error' => is_array($result) ? ($result['error'] ?? 'Failed to get base KYC link') : 'Failed to get base KYC link',
            'endorsement' => 'base',
        ];
    }

    /**
     * Cards endorsement KYC link — GET /customers/{id}/kyc_link?endorsement=cards per Bridge docs.
     * When base KYC is already approved, never reuse the base KYC link resource (full Persona flow).
     * Attempts phone remediation + polling first so cards may auto-approve without Persona.
     *
     * @see https://apidocs.bridge.xyz/platform/cards/overview/kyc
     */
    public function resolveCardsEndorsementKycLink(
        string $customerId,
        ?string $redirectUri = null,
        ?string $kycLinkId = null,
        ?string $preferredPhone = null,
        bool $attemptAutoResolution = false,
    ): array {
        if ($this->isSandbox()) {
            $this->ensureCardsProductEnabled();
        } else {
            $cardsReady = $this->ensureCardsProductEnabled();
            if (! ($cardsReady['success'] ?? false) && ! ($cardsReady['already_enabled'] ?? false)) {
                Log::warning('Live Stripe Issuing not ready before cards endorsement KYC link', [
                'customer_id' => $customerId,
                    'error' => $cardsReady['error'] ?? null,
                ]);
            }
        }

        $this->ensureCustomerHasCardsEndorsement($customerId);

        $customerResult = $this->getCustomer($customerId);
        $customerData = $customerResult['data'] ?? [];
        $baseApproved = $this->getBaseEndorsementInfo($customerData)['approved'] ?? false;

        if ($attemptAutoResolution) {
            $autoResult = $this->attemptCardsEndorsementAutoResolution($customerId, $preferredPhone);
            if ($autoResult['cards_already_approved'] ?? false) {
                return [
                    'success' => true,
                    'cards_already_approved' => true,
                    'endorsement' => 'cards',
                    'source' => 'auto_resolution',
                ];
            }
        }

        if ($this->cardsEndorsementBlockedByPhoneOnly($customerId)) {
            return [
                'success' => false,
                'error' => 'A valid phone number is required for cards verification.',
                'endorsement' => 'cards',
                'phone_required' => true,
                'cards_endorsement_issues' => ['phone_number_invalid_format'],
            ];
        }

        // Stored kyc_link_id is the base KYC link — only use before base endorsement is approved.
        $effectiveKycLinkId = $baseApproved ? null : $kycLinkId;

        if ($effectiveKycLinkId) {
            $linkResult = $this->getKYCLink($effectiveKycLinkId);
            $url = $this->extractKycLinkUrl($linkResult);

            if ($url !== null) {
                Log::info('Cards endorsement KYC link resolved via KYC link resource (base KYC not yet approved)', [
                    'customer_id' => $customerId,
                    'kyc_link_id' => $effectiveKycLinkId,
                ]);

                return [
                    'success' => true,
                    'url' => $url,
                    'data' => $linkResult['data'] ?? ['url' => $url, 'kyc_link' => $url],
                    'source' => 'kyc_links_resource',
                    'endorsement' => 'cards',
                ];
            }
        }

        $result = ['success' => false, 'error' => 'Failed to get cards endorsement KYC link'];

        for ($attempt = 1; $attempt <= 4; $attempt++) {
            if ($attempt > 1) {
                sleep(1);
            }

            $attemptRedirect = $attempt <= 2 ? $redirectUri : null;
            $result = $this->getCustomerKycLink($customerId, 'cards', $attemptRedirect);
            $url = $this->extractKycLinkUrl($result);

            if ($url !== null) {
                Log::info('Cards endorsement KYC link resolved via GET ?endorsement=cards', [
                    'customer_id' => $customerId,
                    'attempt' => $attempt,
                ]);

                return [
                    'success' => true,
                    'url' => $url,
                    'data' => $result['data'] ?? ['url' => $url],
                    'source' => 'customer_kyc_link_cards',
                    'endorsement' => 'cards',
                ];
            }

            if (($result['status'] ?? 0) !== 500) {
                break;
            }
        }

        $createResult = $this->createCardsEndorsementKycLinkFallback($customerId, $redirectUri, $preferredPhone);
        if ($createResult['success'] ?? false) {
            return $createResult;
        }

        $lastError = $result['error'] ?? $createResult['error'] ?? 'Failed to get cards endorsement KYC link';
        $issues = $this->getCardsEndorsementIssues($customerId);

        Log::error('Cards endorsement KYC link unavailable — all resolution paths failed', [
            'customer_id' => $customerId,
            'base_kyc_approved' => $baseApproved,
            'status' => $result['status'] ?? null,
            'error' => $lastError,
            'cards_endorsement_issues' => $issues,
            'create_fallback_error' => $createResult['error'] ?? null,
        ]);

        return [
            'success' => false,
            'error' => $lastError,
            'endorsement' => 'cards',
            'source' => 'customer_kyc_link_cards',
            'cards_endorsement_issues' => $issues,
        ];
    }

    public function getCardsEndorsementKycLink(
        string $customerId,
        ?string $redirectUri = null,
        ?string $kycLinkId = null,
        ?string $preferredPhone = null,
    ): array {
        $resolved = $this->resolveCardsEndorsementKycLink($customerId, $redirectUri, $kycLinkId, $preferredPhone);

        if ($resolved['cards_already_approved'] ?? false) {
            return [
                'success' => true,
                'cards_already_approved' => true,
                'source' => $resolved['source'] ?? 'auto_resolution',
            ];
        }

        if ($resolved['success'] ?? false) {
            return [
                'success' => true,
                'url' => $resolved['url'] ?? $this->extractKycLinkUrl($resolved),
                'source' => $resolved['source'] ?? null,
            ];
        }

        return [
            'success' => false,
            'error' => $resolved['error'] ?? 'Failed to get cards endorsement verification link',
            'cards_endorsement_issues' => $resolved['cards_endorsement_issues'] ?? null,
            'phone_required' => $resolved['phone_required'] ?? false,
        ];
    }

    /**
     * Sync phone to Bridge and poll for cards endorsement approval (no Persona when blockers clear).
     */
    public function attemptCardsEndorsementAutoResolution(string $customerId, ?string $preferredPhone = null): array
    {
        $this->remediateCardsEndorsementBlockers($customerId, $preferredPhone);

        for ($attempt = 0; $attempt < 6; $attempt++) {
            if ($attempt > 0) {
                sleep(2);
            }

            $customerResult = $this->getCustomer($customerId);
            if (! ($customerResult['success'] ?? false)) {
                continue;
            }

            $endorsementInfo = $this->getCardsEndorsementInfo($customerResult['data'] ?? []);
            if ($endorsementInfo['approved'] ?? false) {
                Log::info('Cards endorsement auto-approved after remediation', [
                    'customer_id' => $customerId,
                    'attempt' => $attempt + 1,
                ]);

                return ['success' => true, 'cards_already_approved' => true];
            }

            if ($attempt === 0 && $this->cardsEndorsementBlockedByPhoneOnly($customerId)) {
                break;
            }
        }

        return [
            'success' => false,
            'issues' => $this->getCardsEndorsementIssues($customerId),
        ];
    }

    /**
     * Parse base endorsement status from a Bridge customer payload.
     */
    public function getBaseEndorsementInfo(array $customerData): array
    {
        foreach ($customerData['endorsements'] ?? [] as $endorsement) {
            if (strtolower($endorsement['name'] ?? '') !== 'base') {
                continue;
            }

            $status = strtolower($endorsement['status'] ?? '');

            return [
                'exists' => true,
                'approved' => $status === 'approved',
                'status' => $status,
                'endorsement' => $endorsement,
            ];
        }

        return ['exists' => false, 'approved' => false, 'status' => null, 'endorsement' => null];
    }

    /**
     * Cards is blocked only by phone format (all other cards requirements already complete).
     */
    public function cardsEndorsementBlockedByPhoneOnly(string $customerId): bool
    {
        $customerResult = $this->getCustomer($customerId);
        if (! ($customerResult['success'] ?? false)) {
            return false;
        }

        $endorsementInfo = $this->getCardsEndorsementInfo($customerResult['data'] ?? []);
        if ($endorsementInfo['approved'] ?? false) {
            return false;
        }

        $issues = $endorsementInfo['endorsement']['requirements']['issues'] ?? [];

        return is_array($issues)
            && $issues === ['phone_number_invalid_format'];
    }

    /**
     * Return open cards endorsement requirement issues from Bridge customer payload.
     *
     * @return list<string>
     */
    public function getCardsEndorsementIssues(string $customerId): array
    {
        $customerResult = $this->getCustomer($customerId);
        if (! ($customerResult['success'] ?? false)) {
            return [];
        }

        $endorsementInfo = $this->getCardsEndorsementInfo($customerResult['data'] ?? []);
        $issues = $endorsementInfo['endorsement']['requirements']['issues'] ?? [];

        return is_array($issues) ? array_values(array_filter($issues, 'is_string')) : [];
    }

    /**
     * POST /kyc_links with cards endorsement when GET ?endorsement=cards is unavailable.
     */
    protected function createCardsEndorsementKycLinkFallback(
        string $customerId,
        ?string $redirectUri = null,
        ?string $preferredPhone = null,
    ): array {
        $customerResult = $this->getCustomer($customerId);
        if (! ($customerResult['success'] ?? false)) {
            return ['success' => false, 'error' => 'Bridge customer not found'];
        }

        $customer = $customerResult['data'];
        $firstName = trim((string) ($customer['first_name'] ?? ''));
        $lastName = trim((string) ($customer['last_name'] ?? ''));
        $fullName = trim("{$firstName} {$lastName}");
        $email = trim((string) ($customer['email'] ?? ''));
        $type = strtolower((string) ($customer['type'] ?? 'individual'));

        if ($fullName === '' || $email === '') {
            return ['success' => false, 'error' => 'Customer is missing name or email for cards KYC link'];
        }

        $payload = [
            'full_name' => $fullName,
            'email' => $email,
            'type' => in_array($type, ['business', 'individual'], true) ? $type : 'individual',
            'endorsements' => ['cards'],
        ];

        if ($redirectUri) {
            $payload['redirect_uri'] = $redirectUri;
        }

        $phone = $this->resolvePhoneForCardsEndorsement($customer, $preferredPhone);
        if ($phone !== null) {
            $payload['phone'] = $phone;
        }

        $result = $this->createKYCLink($payload);
        $url = $this->extractKycLinkUrl($result);

        if ($url === null) {
            return [
                'success' => false,
                'error' => $result['error'] ?? 'Failed to create cards endorsement KYC link',
            ];
        }

        Log::info('Cards endorsement KYC link resolved via POST /kyc_links fallback', [
            'customer_id' => $customerId,
            'kyc_link_id' => $result['data']['id'] ?? null,
        ]);

        return [
            'success' => true,
            'url' => $url,
            'data' => $result['data'] ?? ['url' => $url, 'kyc_link' => $url],
            'source' => 'kyc_links_create_cards',
            'endorsement' => 'cards',
        ];
    }

    /**
     * Fix known cards endorsement blockers before requesting the KYC link (e.g. invalid phone format).
     */
    public function remediateCardsEndorsementBlockers(string $customerId, ?string $preferredPhone = null): void
    {
        $issues = $this->getCardsEndorsementIssues($customerId);
        $needsPhoneFix = in_array('phone_number_invalid_format', $issues, true);

        if (! $needsPhoneFix && $preferredPhone === null) {
            return;
        }

        $customerResult = $this->getCustomer($customerId);
        if (! ($customerResult['success'] ?? false)) {
            return;
        }

        $customer = $customerResult['data'];
        $currentPhone = trim((string) ($customer['phone'] ?? ''));
        $normalized = $this->resolvePhoneForCardsEndorsement($customer, $preferredPhone ?: $currentPhone);

        if ($normalized === null) {
            Log::info('No valid cards phone available for Bridge customer update', [
                'customer_id' => $customerId,
                'issues' => $issues,
                'preferred_phone' => $preferredPhone,
                'current_phone' => $currentPhone !== '' ? $currentPhone : null,
            ]);

            return;
        }

        // Phone already on Bridge — do not PATCH again (Bridge may keep stale issue until KYC completes).
        if ($normalized === $currentPhone) {
            return;
        }

        $updateResult = $this->updateCustomer($customerId, ['phone' => $normalized]);

        Log::info('Updated Bridge customer phone for cards endorsement', [
            'customer_id' => $customerId,
            'phone' => $normalized,
            'success' => $updateResult['success'] ?? false,
            'error' => $updateResult['error'] ?? null,
            'issues' => $issues,
        ]);
    }

    /**
     * Resolve a phone number acceptable for Bridge cards (US customers require +1).
     */
    public function resolvePhoneForCardsEndorsement(array $customer, ?string $preferredPhone): ?string
    {
        $candidate = $preferredPhone ?: trim((string) ($customer['phone'] ?? ''));
        $normalized = $this->normalizePhoneE164($candidate);

        if ($normalized === null) {
            return null;
        }

        $country = strtoupper((string) (
            $customer['country']
            ?? $customer['residential_address']['country']
            ?? ''
        ));
        $isUsCustomer = in_array($country, ['USA', 'US', 'UNITED STATES'], true);

        if ($isUsCustomer && ! preg_match('/^\+1\d{10}$/', $normalized)) {
            return null;
        }

        return $normalized;
    }

    /**
     * Normalize a phone number to E.164 for Bridge cards requirements.
     */
    public function normalizePhoneE164(?string $raw): ?string
    {
        if ($raw === null || trim($raw) === '') {
            return null;
        }

        $digits = preg_replace('/\D+/', '', trim($raw));
        if ($digits === '' || $digits === null) {
            return null;
        }

        if (str_starts_with(trim($raw), '+')) {
            return '+'.$digits;
        }

        if (strlen($digits) === 10) {
            return '+1'.$digits;
        }

        if (strlen($digits) === 11 && str_starts_with($digits, '1')) {
            return '+'.$digits;
        }

        return '+'.$digits;
    }

    protected function ensureCustomerHasCardsEndorsement(string $customerId): void
    {
        $customerResult = $this->getCustomer($customerId);
        if (! ($customerResult['success'] ?? false)) {
            return;
        }

        $endorsementInfo = $this->getCardsEndorsementInfo($customerResult['data'] ?? []);
        if ($endorsementInfo['exists'] ?? false) {
            return;
        }

        $requestResult = $this->requestEndorsement($customerId, [
            'endorsement_type' => 'cards',
        ]);

        Log::info('Requested cards endorsement on Bridge customer before KYC link', [
            'customer_id' => $customerId,
            'success' => $requestResult['success'] ?? false,
            'error' => $requestResult['error'] ?? null,
        ]);
    }

    /**
     * @param  array<string, mixed>  $result
     */
    protected function extractKycLinkUrl(array $result): ?string
    {
        if (! ($result['success'] ?? false)) {
            return null;
        }

        $data = $result['data'] ?? [];

        $url = $data['url']
            ?? $data['kyc_link']
            ?? $data['link_url']
            ?? null;

        return is_string($url) && $url !== '' ? $url : null;
    }

    /**
     * Convert KYC link URL to widget URL for iframe embedding
     * 
     * @param string $kycLinkUrl The original KYC link URL
     * @return string|null The widget URL for iframe, or null if conversion fails
     */
    public function convertKycLinkToWidgetUrl(string $kycLinkUrl, ?string $iframeOrigin = null): ?string
    {
        try {
            $iframeOrigin = $iframeOrigin ?: request()->getSchemeAndHttpHost();

            // Bridge docs: replace /verify with /widget and pass iframe-origin
            if (str_contains($kycLinkUrl, '/widget')) {
                return $this->appendIframeOriginToPersonaUrl($kycLinkUrl, $iframeOrigin);
            }

            if (str_contains($kycLinkUrl, '/verify')) {
                $widgetUrl = str_replace('/verify', '/widget', $kycLinkUrl);

                return $this->appendIframeOriginToPersonaUrl($widgetUrl, $iframeOrigin);
            }

            // Fallback: rebuild widget URL from verify query params
            $parsedUrl = parse_url($kycLinkUrl);
            if (! $parsedUrl || ! isset($parsedUrl['query'])) {
                Log::warning('Invalid KYC link URL format', ['url' => $kycLinkUrl]);

                return null;
            }

            parse_str($parsedUrl['query'], $params);
            
            $iqtToken = $params['fields']['iqt_token'] ?? null;
            $environmentId = $params['environment-id'] ?? null;
            $inquiryTemplateId = $params['inquiry-template-id'] ?? null;
            $developerId = $params['fields']['developer_id'] ?? null;

            if (! $iqtToken || ! $inquiryTemplateId) {
                Log::warning('Missing required parameters in KYC link', [
                    'url' => $kycLinkUrl,
                    'params' => $params,
                ]);

                return null;
            }

            $environment = $this->isSandbox() ? 'sandbox' : 'production';
            
            $query = [
                'environment' => $environment,
                'inquiry-template-id' => $inquiryTemplateId,
                'fields[iqt_token]' => $iqtToken,
                'iframe-origin' => $iframeOrigin,
            ];

            if ($environmentId) {
                $query['environment-id'] = $environmentId;
            }

            if ($developerId) {
                $query['fields[developer_id]'] = $developerId;
            }

            if (isset($params['fields']['email_address'])) {
                $query['fields[email_address]'] = $params['fields']['email_address'];
            }

            return 'https://bridge.withpersona.com/widget?' . http_build_query($query);
        } catch (\Exception $e) {
            Log::error('Failed to convert KYC link to widget URL', [
                'url' => $kycLinkUrl,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    private function appendIframeOriginToPersonaUrl(string $url, string $iframeOrigin): string
    {
        $parts = parse_url($url);
        if (! $parts) {
            return $url;
        }

        parse_str($parts['query'] ?? '', $query);
        $query['iframe-origin'] = $iframeOrigin;

        $scheme = $parts['scheme'] ?? 'https';
        $host = $parts['host'] ?? '';
        $path = $parts['path'] ?? '';
        $port = isset($parts['port']) ? ':' . $parts['port'] : '';

        return $scheme . '://' . $host . $port . $path . '?' . http_build_query($query);
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

    /**
     * Get a Bridge wallet by wallet ID (developer-level endpoint).
     *
     * @see https://apidocs.bridge.xyz/api-reference/bridge-wallets/get-a-bridge-wallet
     */
    public function getBridgeWalletById(string $walletId): array
    {
        return $this->makeRequest('GET', '/wallets/'.trim($walletId));
    }

    /**
     * List Bridge wallets for the authenticated developer.
     *
     * @see https://apidocs.bridge.xyz/api-reference/bridge-wallets/get-all-bridge-wallets
     */
    public function getBridgeWallets(array $query = []): array
    {
        return $this->makeRequest('GET', '/wallets', $query);
    }

    /**
     * Paginate through all developer Bridge wallets.
     *
     * @return array{success: bool, data?: array<int, array<string, mixed>>, error?: string}
     */
    public function listAllBridgeWallets(int $pageSize = 100): array
    {
        $pageSize = max(1, min(100, $pageSize));
        $all = [];
        $startingAfter = null;

        do {
            $query = ['limit' => $pageSize];
            if ($startingAfter !== null) {
                $query['starting_after'] = $startingAfter;
            }

            $result = $this->getBridgeWallets($query);
            if (! ($result['success'] ?? false)) {
                return $result;
            }

            $items = $this->normalizeBridgeListData($result);
            foreach ($items as $item) {
                $all[] = $item;
            }

            $count = count($items);
            $startingAfter = $count > 0 ? (string) ($items[$count - 1]['id'] ?? '') : null;
        } while ($count >= $pageSize && $startingAfter !== '');

        return [
            'success' => true,
            'data' => $all,
        ];
    }

    /**
     * List prefunded accounts for the authenticated developer.
     *
     * @see https://apidocs.bridge.xyz/api-reference/prefunded-accounts/get-a-list-of-all-prefunded-account
     */
    public function getPrefundedAccounts(): array
    {
        return $this->makeRequest('GET', '/prefunded_accounts');
    }

    /**
     * Get a prefunded account by ID.
     *
     * @see https://apidocs.bridge.xyz/api-reference/prefunded-accounts/get-details-for-a-specific-prefunded-account
     */
    public function getPrefundedAccount(string $prefundedAccountId): array
    {
        return $this->makeRequest('GET', '/prefunded_accounts/'.trim($prefundedAccountId));
    }

    /**
     * @return array{name: string, available_balance: string, currency: string}|null
     */
    public function getPrefundedAccountSummary(?string $prefundedAccountId): ?array
    {
        $prefundedAccountId = trim((string) ($prefundedAccountId ?? ''));
        if ($prefundedAccountId === '') {
            return null;
        }

        $result = $this->getPrefundedAccount($prefundedAccountId);
        if (! ($result['success'] ?? false) || ! is_array($result['data'] ?? null)) {
            return null;
        }

        $data = $result['data'];

        return [
            'name' => (string) ($data['name'] ?? 'Prefunded account'),
            'available_balance' => (string) ($data['available_balance'] ?? '0'),
            'currency' => strtolower((string) ($data['currency'] ?? 'usd')),
        ];
    }

    /**
     * Extract a Bridge wallet ID from a prefunded account or wallet payload.
     *
     * @param  array<string, mixed>  $payload
     */
    public function extractBridgeWalletIdFromPayload(array $payload): string
    {
        foreach (['bridge_wallet_id', 'wallet_id', 'source_id'] as $key) {
            if (! empty($payload[$key]) && is_string($payload[$key])) {
                return trim($payload[$key]);
            }
        }

        $bridgeWallet = $payload['bridge_wallet'] ?? null;
        if (is_array($bridgeWallet) && ! empty($bridgeWallet['id'])) {
            return trim((string) $bridgeWallet['id']);
        }

        $source = $payload['source'] ?? null;
        if (is_array($source)) {
            foreach (['bridge_wallet_id', 'wallet_id', 'id'] as $key) {
                if (! empty($source[$key]) && is_string($source[$key])) {
                    return trim($source[$key]);
                }
            }
        }

        return '';
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function extractCustomerIdFromPayload(array $payload): string
    {
        foreach (['customer_id', 'developer_customer_id', 'owner_customer_id', 'on_behalf_of'] as $key) {
            if (! empty($payload[$key]) && is_string($payload[$key])) {
                return trim($payload[$key]);
            }
        }

        $bridgeWallet = $payload['bridge_wallet'] ?? null;
        if (is_array($bridgeWallet)) {
            $fromWallet = $this->extractCustomerIdFromPayload($bridgeWallet);
            if ($fromWallet !== '') {
                return $fromWallet;
            }
        }

        return '';
    }

    public function resolveBridgeWalletIdFromPrefundedAccount(string $prefundedAccountId): ?string
    {
        $prefundedAccountId = trim($prefundedAccountId);
        if ($prefundedAccountId === '') {
            return null;
        }

        $result = $this->getPrefundedAccount($prefundedAccountId);
        if (! ($result['success'] ?? false) || ! is_array($result['data'] ?? null)) {
            return null;
        }

        $walletId = $this->extractBridgeWalletIdFromPayload($result['data']);

        return $walletId !== '' ? $walletId : null;
    }

    /**
     * Resolve platform liquidity IDs to a valid Bridge wallet for transfers.
     *
     * @return array{customer_id: string, wallet_id: string, parsed: array<string, mixed>}|null
     */
    public function resolvePlatformPrefundedWallet(
        string $customerId,
        string $walletId,
        ?string $prefundedAccountId = null,
    ): ?array {
        $customerId = trim($customerId);
        $walletId = trim($walletId);
        $prefundedAccountId = trim((string) ($prefundedAccountId ?? ''));

        $accountCandidates = array_values(array_unique(array_filter([
            $prefundedAccountId,
            $walletId,
        ])));

        $resolvedWalletId = $walletId;
        $resolvedAccountId = $prefundedAccountId;

        foreach ($accountCandidates as $accountId) {
            $fromAccount = $this->resolveBridgeWalletIdFromPrefundedAccount($accountId);
            if ($fromAccount === null) {
                continue;
            }

            $resolvedWalletId = $fromAccount;
            if ($resolvedAccountId === '') {
                $resolvedAccountId = $accountId;
            }

            break;
        }

        if ($resolvedWalletId === '') {
            return null;
        }

        if ($customerId === '' && $resolvedAccountId !== '') {
            $detail = $this->getPrefundedAccount($resolvedAccountId);
            if (($detail['success'] ?? false) && is_array($detail['data'] ?? null)) {
                $customerId = $this->extractCustomerIdFromPayload($detail['data']);
            }
        }

        $parsed = $this->parseBridgeWalletForTransfer($customerId, $resolvedWalletId);
        if ($parsed === null) {
            return null;
        }

        if ($customerId === '') {
            $walletResult = $this->getBridgeWalletById($parsed['wallet_id']);
            if (($walletResult['success'] ?? false) && is_array($walletResult['data'] ?? null)) {
                $customerId = $this->extractCustomerIdFromPayload($walletResult['data']);
            }
        }

        return [
            'customer_id' => $customerId,
            'wallet_id' => $parsed['wallet_id'],
            'parsed' => $parsed,
        ];
    }

    /**
     * Normalize stored prefunded liquidity config to real Bridge wallet IDs.
     *
     * @param  array<string, mixed>  $config
     * @return array<string, mixed>
     */
    public function normalizeStoredPrefundedWalletConfig(array $config, string $environment): array
    {
        $prefix = $environment === 'sandbox' ? 'sandbox' : 'live';
        $customerKey = "{$prefix}_prefunded_customer_id";
        $walletKey = "{$prefix}_prefunded_wallet_id";
        $accountKey = "{$prefix}_prefunded_account_id";

        $customerId = trim((string) ($config[$customerKey] ?? ''));
        $walletId = trim((string) ($config[$walletKey] ?? ''));
        $accountId = trim((string) ($config[$accountKey] ?? ''));

        if ($walletId === '' && $accountId === '') {
            return $config;
        }

        $resolved = $this->resolvePlatformPrefundedWallet(
            $customerId,
            $walletId,
            $accountId !== '' ? $accountId : null,
        );

        if ($resolved === null) {
            return $config;
        }

        $config[$walletKey] = $resolved['wallet_id'];
        $config[$customerKey] = $resolved['customer_id'];

        return $config;
    }

    /**
     * Wallet transaction history (deposits, withdrawals, etc.)
     *
     * @see https://apidocs.bridge.xyz/api-reference/bridge-wallets/get-transaction-history-for-a-bridge-wallet
     */
    public function getBridgeWalletHistory(string $customerId, string $walletId, array $query = []): array
    {
        $result = $this->makeRequest('GET', "/customers/{$customerId}/wallets/{$walletId}/history", $query);

        if (($result['success'] ?? false) || ($result['status'] ?? 0) !== 404) {
            return $result;
        }

        // Some Bridge environments expose wallet history without the customer prefix.
        return $this->makeRequest('GET', "/wallets/{$walletId}/history", $query);
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
            $paymentRail = strtolower((string) ($destination['payment_rail'] ?? ''));
            $hasAddress = ! empty($destination['address']);
            $hasBridgeWalletId = ! empty($destination['bridge_wallet_id']);

            // Per Bridge API: bridge_wallet_id requires payment_rail = chain name (solana, ethereum, etc.)
            if ($paymentRail === 'bridge_wallet') {
                return [
                    'success' => false,
                    'error' => 'destination.payment_rail must be the wallet chain (e.g. solana, ethereum), not bridge_wallet, when using bridge_wallet_id.',
                    'error_code' => 'INVALID_PAYMENT_RAIL',
                ];
            }

            if ($hasBridgeWalletId && $paymentRail === '') {
                return [
                    'success' => false,
                    'error' => 'destination.payment_rail (chain name) is required when using bridge_wallet_id.',
                    'error_code' => 'MISSING_PAYMENT_RAIL',
                ];
            }

            if (! $hasBridgeWalletId && ! $hasAddress) {
                return [
                    'success' => false,
                    'error' => 'Destination address or bridge_wallet_id is required in production mode.',
                    'error_code' => 'MISSING_DESTINATION',
                ];
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
     * Normalize Bridge list responses ({ count, data: [...] } or bare array).
     *
     * @param  array<string, mixed>|null  $apiResult
     * @return array<int, array<string, mixed>>
     */
    public function normalizeBridgeListData(?array $apiResult): array
    {
        if ($apiResult === null) {
            return [];
        }

        if (array_key_exists('success', $apiResult)) {
            if (! ($apiResult['success'] ?? false)) {
                return [];
            }
            $data = $apiResult['data'] ?? [];
        } else {
            $data = $apiResult;
        }

        if (isset($data['data']) && is_array($data['data'])) {
            return array_values(array_filter($data['data'], 'is_array'));
        }

        if (is_array($data) && isset($data[0]) && is_array($data[0])) {
            return $data;
        }

        return [];
    }

    /**
     * Resolve the best virtual account for deposits from Bridge (sync from API).
     */
    public function resolveVirtualAccountFromBridge(string $customerId, ?string $preferredBridgeWalletId = null): ?array
    {
        $accounts = $this->normalizeBridgeListData($this->getVirtualAccounts($customerId));

        if ($accounts === []) {
            return null;
        }

        if ($preferredBridgeWalletId) {
            foreach ($accounts as $account) {
                $destination = $account['destination'] ?? [];
                if (($destination['bridge_wallet_id'] ?? null) === $preferredBridgeWalletId) {
                    return $this->enrichVirtualAccountDetails($customerId, $account);
                }
            }
        }

        foreach ($accounts as $account) {
            $instructions = $account['source_deposit_instructions'] ?? [];
            if (! empty($instructions['bank_routing_number']) || ! empty($instructions['bank_account_number'])) {
                return $this->enrichVirtualAccountDetails($customerId, $account);
            }
        }

        return $this->enrichVirtualAccountDetails($customerId, $accounts[0]);
    }

    /**
     * Fetch full virtual account payload when list item lacks deposit instructions.
     *
     * @param  array<string, mixed>  $account
     * @return array<string, mixed>
     */
    public function enrichVirtualAccountDetails(string $customerId, array $account): array
    {
        $instructions = $account['source_deposit_instructions'] ?? [];
        if (! empty($instructions['bank_routing_number']) || ! empty($instructions['bank_account_number'])) {
            return $account;
        }

        $virtualAccountId = $account['id'] ?? null;
        if (! $virtualAccountId) {
            return $account;
        }

        $detail = $this->getVirtualAccount($customerId, $virtualAccountId);
        if ($detail['success'] && is_array($detail['data'] ?? null)) {
            return $detail['data'];
        }

        return $account;
    }

    /**
     * Resolve Bridge wallet ID from local records or Bridge API.
     */
    public function resolveBridgeWalletIdForIntegration(
        \App\Models\BridgeIntegration $integration,
        ?\App\Models\BridgeWallet $wallet = null,
    ): ?string {
        $walletId = $wallet?->bridge_wallet_id ?? $integration->bridge_wallet_id;
        if ($walletId) {
            return $walletId;
        }

        $customerId = $integration->bridge_customer_id;
        if (! $customerId) {
            return null;
        }

        $wallets = $this->normalizeBridgeListData($this->getWallets($customerId));
        if ($wallets === []) {
            return null;
        }

        $first = $wallets[0];
        $resolved = $first['id'] ?? null;

        if ($resolved && $wallet) {
            $wallet->bridge_wallet_id = $resolved;
            $wallet->wallet_address = $wallet->wallet_address ?? ($first['address'] ?? null);
            $wallet->chain = $wallet->chain ?? ($first['chain'] ?? 'solana');
            $wallet->save();
        }

        if ($resolved && ! $integration->bridge_wallet_id) {
            $integration->bridge_wallet_id = $resolved;
            $integration->wallet_address = $integration->wallet_address ?? ($first['address'] ?? null);
            $integration->save();
        }

        return $resolved;
    }

    /**
     * Persist virtual account details on a local BridgeWallet row.
     *
     * @param  array<string, mixed>  $virtualAccountData
     */
    public function attachVirtualAccountToWallet(
        \App\Models\BridgeWallet $wallet,
        array $virtualAccountData,
    ): \App\Models\BridgeWallet {
        $destination = $virtualAccountData['destination'] ?? [];

        $wallet->virtual_account_id = $virtualAccountData['id'] ?? $wallet->virtual_account_id;
        $wallet->virtual_account_details = $virtualAccountData;

        if (! $wallet->bridge_wallet_id && ! empty($destination['bridge_wallet_id'])) {
            $wallet->bridge_wallet_id = $destination['bridge_wallet_id'];
        }

        if (! $wallet->wallet_address && ! empty($destination['address'])) {
            $wallet->wallet_address = $destination['address'];
        }

        if (! empty($destination['payment_rail'])) {
            $wallet->chain = $destination['payment_rail'];
        }

        $wallet->save();

        return $wallet;
    }

    /**
     * Ensure customer has a Bridge wallet in production (create if missing).
     *
     * @return array{success: bool, bridge_wallet_id?: string, wallet?: \App\Models\BridgeWallet, error?: string}
     */
    public function ensureProductionBridgeWallet(
        \App\Models\BridgeIntegration $integration,
        ?\App\Models\BridgeWallet $wallet = null,
        string $chain = 'solana',
    ): array {
        if ($this->isSandbox()) {
            return ['success' => true, 'bridge_wallet_id' => null];
        }

        $bridgeWalletId = $this->resolveBridgeWalletIdForIntegration($integration, $wallet);
        if ($bridgeWalletId) {
            return ['success' => true, 'bridge_wallet_id' => $bridgeWalletId, 'wallet' => $wallet];
        }

        $customerId = $integration->bridge_customer_id;
        if (! $customerId) {
            return ['success' => false, 'error' => 'Bridge customer ID is missing.'];
        }

        $walletResult = $this->createWallet($customerId, $chain);
        if (! ($walletResult['success'] ?? false)) {
            return [
                'success' => false,
                'error' => $walletResult['error'] ?? 'Failed to create Bridge wallet.',
            ];
        }

        $walletData = $walletResult['data'] ?? [];
        $newId = $walletData['id'] ?? null;
        if (! $newId) {
            return ['success' => false, 'error' => 'Bridge wallet created but no wallet ID returned.'];
        }

        if ($wallet) {
            $wallet->bridge_wallet_id = $newId;
            $wallet->wallet_address = $walletData['address'] ?? $wallet->wallet_address;
            $wallet->chain = $chain;
            $wallet->save();
        } else {
            $wallet = \App\Models\BridgeWallet::updateOrCreate(
                [
                    'bridge_integration_id' => $integration->id,
                    'bridge_wallet_id' => $newId,
                ],
                [
                    'bridge_customer_id' => $customerId,
                    'wallet_address' => $walletData['address'] ?? null,
                    'chain' => $chain,
                    'status' => 'active',
                    'balance' => 0,
                    'currency' => 'USD',
                    'is_primary' => true,
                    'wallet_metadata' => $walletData,
                    'last_balance_sync' => now(),
                ],
            );
        }

        $integration->bridge_wallet_id = $newId;
        $integration->wallet_address = $walletData['address'] ?? $integration->wallet_address;
        $integration->wallet_chain = $chain;
        $integration->save();

        return ['success' => true, 'bridge_wallet_id' => $newId, 'wallet' => $wallet];
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
    public function getVirtualAccountHistory(string $customerId, string $virtualAccountId, array $query = []): array
    {
        return $this->makeRequest('GET', "/customers/{$customerId}/virtual_accounts/{$virtualAccountId}/history", $query);
    }

    // ==================== CARD ACCOUNTS ====================

    /**
     * Link Bridge sandbox cards to the Laravel Cashier Stripe account (POST /cards/enable).
     *
     * @see https://apidocs.bridge.xyz/platform/cards/sandbox/sandbox
     */
    public function enableCardsProduct(?string $programType = null, bool $force = false): array
    {
        if (! $this->isSandbox()) {
            return [
                'success' => false,
                'error' => 'POST /cards/enable is only supported in Bridge sandbox.',
            ];
        }

        if ($force) {
            $bridge = PaymentMethod::getConfig('bridge');
            if ($bridge) {
                $config = is_array($bridge->additional_config) ? $bridge->additional_config : [];
                unset($config['cards_enabled_at']);
                $bridge->update(['additional_config' => $config]);
            }
        }

        $stripeAccountId = $this->resolveStripeAccountIdForCards();
        if (! $stripeAccountId) {
            return [
                'success' => false,
                'error' => 'Stripe account ID could not be resolved. Configure Laravel Cashier Stripe keys under Settings → Stripe & PayPal, or set a Stripe Account ID override in Bridge settings.',
            ];
        }

        $programType = $programType ?? $this->getCardsProgramType();

        $result = $this->makeRequest('POST', '/cards/enable', [
            'stripe_account_id' => $stripeAccountId,
            'program_type' => $programType,
        ]);

        if ($result['success']) {
            $this->persistCardsEnableMetadata($stripeAccountId, $programType);

            return $result;
        }

        $errorMessage = strtolower((string) ($result['error'] ?? ''));
        if (str_contains($errorMessage, 'already enabled')) {
            $this->persistCardsEnableMetadata($stripeAccountId, $programType);

            return [
                'success' => true,
                'already_enabled' => true,
                'data' => $result['response'] ?? null,
            ];
        }

        return $result;
    }

    /**
     * Ensure cards are ready for issuance.
     *
     * Sandbox: POST /cards/enable links Bridge sandbox to Cashier Stripe sandbox.
     * Production: no /cards/enable — verify live Stripe Issuing (Bridge Cards app installed).
     *
     * @see https://apidocs.bridge.xyz/platform/cards/sandbox/sandbox
     * @see https://apidocs.bridge.xyz/platform/cards/overview/stripe-issuing
     */
    public function ensureCardsProductEnabled(): array
    {
        if ($this->isSandbox()) {
            if ($this->isCardsEnabledOnDeveloperAccount()) {
                return ['success' => true, 'already_enabled' => true];
            }

            return $this->enableCardsProduct();
        }

        $readiness = $this->getStripeIssuingReadiness();
        $bridgeCards = $this->fetchCardsDeveloperAccountStatus(true);

        if (($readiness['issuing_enabled'] ?? false) && ($bridgeCards['enabled'] ?? false)) {
            $accountId = (string) ($readiness['account_id'] ?? '');
            if ($accountId !== '') {
                $this->persistCardsEnableMetadata($accountId, $this->getCardsProgramType());
            }

            return [
                'success' => true,
                'already_enabled' => true,
                'production' => true,
                'account_id' => $readiness['account_id'] ?? null,
            ];
        }

        if (($readiness['issuing_enabled'] ?? false) && ! ($bridgeCards['enabled'] ?? false)) {
            return [
                'success' => false,
                'production' => true,
                'error' => 'Stripe Issuing is active, but Bridge Cards is not enabled on your Bridge developer account yet. Complete Bridge cards onboarding before requesting the cards endorsement.',
                'needs_bridge_stripe_app' => false,
                'help_url' => 'https://apidocs.bridge.xyz/platform/cards/overview/stripe-issuing',
            ];
        }

        return [
            'success' => false,
            'production' => true,
            'error' => $readiness['message'] ?? 'Live Stripe Issuing is not active. Complete Bridge cards onboarding and install the Bridge Cards Stripe App on your live Stripe account.',
            'needs_bridge_stripe_app' => $readiness['needs_bridge_stripe_app'] ?? true,
            'help_url' => 'https://apidocs.bridge.xyz/platform/cards/overview/stripe-issuing',
        ];
    }

    /**
     * Resolve Stripe Connect/platform account ID for Bridge cards enable.
     * Uses Cashier (PaymentMethod stripe row) with optional Bridge settings override.
     */
    public function isStripeConfiguredForCards(): bool
    {
        return $this->isStripeConfiguredForEnvironment($this->isSandbox() ? 'sandbox' : 'live');
    }

    public function isStripeConfiguredForEnvironment(string $environment): bool
    {
        $stripeEnv = $environment === 'live' ? 'live' : 'sandbox';

        if (StripeConfigService::getCredentials($stripeEnv) !== null) {
            return true;
        }

        if ($environment === 'live') {
            return ! empty(config('cashier.secret'))
                || ! empty(config('services.stripe.secret'));
        }

        return false;
    }

    /**
     * Check whether Cashier's Stripe account has Issuing enabled (Bridge Cards app installed).
     */
    public function getStripeIssuingReadiness(): array
    {
        return $this->getStripeIssuingReadinessForEnvironment($this->isSandbox() ? 'sandbox' : 'live');
    }

    /**
     * Issuing readiness for a specific Bridge environment (sandbox or live).
     *
     * @return array{configured: bool, account_id: string|null, issuing_enabled: bool, needs_bridge_stripe_app: bool, message: string}
     */
    public function getStripeIssuingReadinessForEnvironment(string $environment): array
    {
        $isSandbox = $environment === 'sandbox';
        $accountId = $this->resolveStripeAccountIdForCardsEnvironment($environment);

        if (! $accountId) {
            return [
                'configured' => false,
                'account_id' => null,
                'issuing_enabled' => false,
                'needs_bridge_stripe_app' => true,
                'message' => 'Configure Stripe keys under Settings → Stripe & PayPal first.',
            ];
        }

        $stripeEnv = $isSandbox ? 'sandbox' : 'live';
        StripeConfigService::configureStripe($stripeEnv);

        try {
            Cashier::stripe()->issuing->cardholders->all(['limit' => 1]);

            return [
                'configured' => true,
                'account_id' => $accountId,
                'issuing_enabled' => true,
                'needs_bridge_stripe_app' => false,
                'message' => 'Stripe Issuing is active on this account.',
            ];
        } catch (\Throwable $e) {
            $message = $e->getMessage();
            $needsApp = stripos($message, 'not set up to use Issuing') !== false
                || stripos($message, 'issuing') !== false;

            return [
                'configured' => true,
                'account_id' => $accountId,
                'issuing_enabled' => false,
                'needs_bridge_stripe_app' => $needsApp,
                'message' => $needsApp
                    ? ($isSandbox
                        ? 'Install the Bridge Cards Stripe App on your Stripe Sandbox, then click Enable Bridge Cards here. (Sandbox keys still start with sk_test_ — that is normal.)'
                        : 'Install the Bridge Cards Stripe App on your live Stripe account using the install link from Bridge, add live Stripe keys under Settings → Stripe & PayPal, then click Verify Bridge Cards Setup here.')
                    : $message,
            ];
        }
    }

    public function resolveStripeAccountIdForCards(): ?string
    {
        return $this->resolveStripeAccountIdForCardsEnvironment($this->isSandbox() ? 'sandbox' : 'live');
    }

    public function resolveStripeAccountIdForCardsEnvironment(string $environment): ?string
    {
        $isSandbox = $environment === 'sandbox';
        $bridge = PaymentMethod::getConfig('bridge');
        $config = is_array($bridge?->additional_config) ? $bridge->additional_config : [];

        $overrideKey = $isSandbox ? 'sandbox_stripe_account_id' : 'live_stripe_account_id';
        $override = trim((string) ($config[$overrideKey] ?? ''));

        if ($override !== '' && str_starts_with($override, 'acct_')) {
            return $override;
        }

        $stripeEnv = $isSandbox ? 'sandbox' : 'live';

        if (! StripeConfigService::configureStripe($stripeEnv)) {
            StripeConfigService::configureStripe('sandbox');
        }

        try {
            $account = Cashier::stripe()->accounts->retrieve();

            return $account->id ?? null;
        } catch (\Throwable $e) {
            Log::warning('Failed to resolve Stripe account ID for Bridge cards via Cashier', [
                'environment' => $environment,
                'stripe_env' => $stripeEnv,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    public function getCardsProgramType(): string
    {
        $bridge = PaymentMethod::getConfig('bridge');
        $config = is_array($bridge?->additional_config) ? $bridge->additional_config : [];
        $type = strtolower((string) ($config['cards_program_type'] ?? 'consumer'));

        return in_array($type, ['consumer', 'commercial'], true) ? $type : 'consumer';
    }

    private function persistCardsEnableMetadata(string $stripeAccountId, string $programType): void
    {
        $bridge = PaymentMethod::getConfig('bridge');

        if (! $bridge) {
            return;
        }

        $config = is_array($bridge->additional_config) ? $bridge->additional_config : [];
        $config['cards_enabled_at'] = now()->toIso8601String();
        $config['cards_enable_stripe_account_id'] = $stripeAccountId;
        $config['cards_program_type'] = $programType;

        $bridge->update(['additional_config' => $config]);
        $this->clearCardsDeveloperAccountStatusCache();
    }

    /**
     * Probe Bridge for an active card program on this developer account.
     *
     * @see https://apidocs.bridge.xyz/api-reference/cards/get-a-listing-of-your-card-programs-card-designs
     *
     * @return array{enabled: bool, checked_at: string, source: string, error?: string|null}
     */
    public function fetchCardsDeveloperAccountStatus(bool $forceRefresh = false): array
    {
        $cacheKey = $this->cardsDeveloperAccountStatusCacheKey();

        if (! $forceRefresh) {
            $cached = Cache::get($cacheKey);
            if (is_array($cached) && array_key_exists('enabled', $cached)) {
                return $cached;
            }
        }

        if (empty($this->apiKey)) {
            return [
                'enabled' => false,
                'checked_at' => now()->toIso8601String(),
                'source' => 'missing_api_key',
                'error' => 'Bridge API key is not configured.',
            ];
        }

        $result = $this->makeRequest('GET', '/developer/cards/designs');

        if ($result['success'] ?? false) {
            $status = [
                'enabled' => true,
                'checked_at' => now()->toIso8601String(),
                'source' => 'bridge_api',
            ];
        } elseif ($this->isCardsDeveloperAccountNotEnabledError($result)) {
            $status = [
                'enabled' => false,
                'checked_at' => now()->toIso8601String(),
                'source' => 'bridge_api',
            ];
        } else {
            Log::warning('Bridge cards developer status probe failed — defaulting to disabled', [
                'environment' => $this->environment,
                'error' => $result['error'] ?? null,
                'status' => $result['status'] ?? null,
            ]);

            $status = [
                'enabled' => false,
                'checked_at' => now()->toIso8601String(),
                'source' => 'probe_error',
                'error' => $result['error'] ?? 'Unable to verify Bridge Cards status.',
            ];
        }

        Cache::put($cacheKey, $status, now()->addMinutes(5));

        return $status;
    }

    public function clearCardsDeveloperAccountStatusCache(): void
    {
        Cache::forget($this->cardsDeveloperAccountStatusCacheKey());
    }

    private function cardsDeveloperAccountStatusCacheKey(): string
    {
        return 'bridge:cards_developer_enabled:'.$this->environment;
    }

    /**
     * Whether Bridge Cards is enabled on this developer account (GET /developer/cards/designs).
     */
    public function isCardsEnabledOnDeveloperAccount(bool $forceRefresh = false): bool
    {
        return (bool) ($this->fetchCardsDeveloperAccountStatus($forceRefresh)['enabled'] ?? false);
    }

    /**
     * Bridge indicates Cards is not enabled for this developer account.
     */
    public function isCardsDeveloperAccountNotEnabledError(array $bridgeApiResult): bool
    {
        if ($this->isCardsProductNotEnabledError($bridgeApiResult)) {
            return true;
        }

        $errorMessage = strtolower((string) ($bridgeApiResult['error'] ?? ''));
        $errorCode = strtolower((string) ($bridgeApiResult['response']['code'] ?? ''));

        return $errorCode === 'not_allowed'
            || str_contains($errorMessage, 'cards is not enabled')
            || str_contains($errorMessage, 'card program');
    }

    /**
     * KYC endorsements for Connect Wallet — cards when Cards is enabled on the developer account, otherwise base.
     *
     * @return list<string>
     */
    public function resolveConnectWalletEndorsements(): array
    {
        return $this->isCardsEnabledOnDeveloperAccount() ? ['cards'] : ['base'];
    }

    /**
     * Bridge rejected a cards endorsement because Cards is not enabled for this developer.
     */
    public function isCardsEndorsementNotAllowedError(array $bridgeApiResult): bool
    {
        $errorMessage = strtolower((string) ($bridgeApiResult['error'] ?? ''));
        $errorCode = strtolower((string) ($bridgeApiResult['response']['code'] ?? ''));

        return $errorCode === 'not_allowed'
            || str_contains($errorMessage, 'endorsement not allowed')
            || str_contains($errorMessage, 'cards is not enabled');
    }

    /**
     * Create a card account for a customer (legacy Bridge API — deprecated for issuance).
     *
     * @deprecated Card creation migrated to Stripe Issuing — use issueVirtualCard().
     */
    public function createCardAccount(string $customerId, array $cardData = []): array
    {
        return $this->makeRequest('POST', "/customers/{$customerId}/card_accounts", $cardData);
    }

    /**
     * Issue a virtual card using Stripe Issuing + Bridge wallet (current Bridge cards flow).
     */
    public function issueVirtualCard(BridgeIntegration $integration, string $customerId, bool $isBusiness = false): array
    {
        return app(BridgeStripeIssuingService::class)->issueVirtualCard($integration, $customerId, $isBusiness);
    }

    /**
     * Resolve an existing issued virtual card for UI display.
     */
    public function getVirtualCard(BridgeIntegration $integration, string $customerId): array
    {
        return app(BridgeStripeIssuingService::class)->getVirtualCard($integration, $customerId);
    }

    /**
     * Legacy GET /card_accounts errors that mean card issuance moved to Stripe Issuing.
     */
    public function isStripeIssuingMigrationError(array $bridgeApiResult): bool
    {
        $message = strtolower((string) ($bridgeApiResult['error'] ?? ''));
        $code = strtolower((string) ($bridgeApiResult['response']['code'] ?? ''));

        if ($code === 'not_allowed' && str_contains($message, 'migrated to stripe issuing')) {
            return true;
        }

        return str_contains($message, 'migrated to stripe issuing')
            || str_contains($message, 'stripe issuing');
    }

    /**
     * Whether legacy card_accounts API failures should block Stripe Issuing issuance.
     */
    public function shouldBypassLegacyCardAccountsGate(array $bridgeApiResult): bool
    {
        if (! $this->isSandbox()) {
            return true;
        }

        return $this->isStripeIssuingMigrationError($bridgeApiResult);
    }

    /**
     * Detect Bridge "cards product not enabled" errors (sandbox POST /cards/enable path).
     */
    public function isCardsProductNotEnabledError(array $bridgeApiResult): bool
    {
        $errorMessage = strtolower((string) ($bridgeApiResult['error'] ?? ''));
        $errorCode = strtolower((string) ($bridgeApiResult['response']['code'] ?? ''));

        return $errorCode === 'not_allowed'
            || str_contains($errorMessage, 'cards product has not been enabled')
            || str_contains($errorMessage, 'cards-sandbox');
    }

    /**
     * Parse cards endorsement status from a Bridge customer payload.
     */
    public function getCardsEndorsementInfo(array $customerData): array
    {
        $status = null;
        $exists = false;
        $approved = false;
        $endorsementData = null;

        foreach ($customerData['endorsements'] ?? [] as $endorsement) {
            if (strtolower($endorsement['name'] ?? '') !== 'cards') {
                continue;
            }

            $exists = true;
            $status = strtolower($endorsement['status'] ?? '');
            $approved = $status === 'approved';
            $endorsementData = $endorsement;
            break;
        }

        return [
            'exists' => $exists,
            'approved' => $approved,
            'status' => $status,
            'endorsement' => $endorsementData,
        ];
    }

    /**
     * Bridge may omit top-level birth_date even when KYC captured DOB in endorsement requirements.
     */
    public function customerHasDateOfBirth(array $customerData): bool
    {
        if (! empty($customerData['birth_date'])) {
            return true;
        }

        foreach ($customerData['endorsements'] ?? [] as $endorsement) {
            $complete = $endorsement['requirements']['complete'] ?? [];

            if (in_array('date_of_birth', $complete, true)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Cards issuance requires the cards endorsement KYC flow when not yet approved.
     *
     * @see https://apidocs.bridge.xyz/platform/cards/overview/kyc
     */
    public function customerNeedsCardsEndorsementFlow(array $customerData): bool
    {
        $endorsementInfo = $this->getCardsEndorsementInfo($customerData);

        if ($endorsementInfo['approved']) {
            return false;
        }

        if (! $endorsementInfo['exists']) {
            return true;
        }

        return ! in_array($endorsementInfo['status'], ['approved'], true);
    }

    /**
     * Resolve the on-chain wallet address linked to a Bridge integration.
     */
    public function resolveIntegrationWalletAddress(BridgeIntegration $integration): ?string
    {
        $integration->loadMissing('primaryWallet');

        $isSandbox = $this->isSandbox();
        $primaryWallet = $integration->primaryWallet;

        if ($primaryWallet?->wallet_address) {
            return $primaryWallet->wallet_address;
        }

        if ($primaryWallet && $isSandbox && $primaryWallet->virtual_account_id) {
            $address = $this->extractVirtualAccountAddress($primaryWallet->virtual_account_details);
            if ($address) {
                return $address;
            }
        }

        $wallet = BridgeWallet::where('bridge_integration_id', $integration->id)
            ->where('is_primary', true)
            ->first();

        if ($wallet?->wallet_address) {
            return $wallet->wallet_address;
        }

        if ($wallet && $isSandbox && $wallet->virtual_account_id) {
            return $this->extractVirtualAccountAddress($wallet->virtual_account_details);
        }

        return null;
    }

    /**
     * Build card account create payload per Bridge legacy card guide.
     */
    public function buildCardAccountPayload(?string $walletAddress = null): array
    {
        $isSandbox = $this->isSandbox();

        $payload = [
            'chain' => $isSandbox ? 'ethereum' : 'solana',
            'currency' => 'usdc',
        ];

        if ($walletAddress) {
            $payload['crypto_account'] = [
                'type' => 'bridge_wallet',
                'address' => $walletAddress,
            ];
        }

        return $payload;
    }

    public function buildCardAccountPayloadForIntegration(BridgeIntegration $integration): array
    {
        return $this->buildCardAccountPayload($this->resolveIntegrationWalletAddress($integration));
    }

    /**
     * @param mixed $virtualAccountDetails
     */
    private function extractVirtualAccountAddress($virtualAccountDetails): ?string
    {
        if (is_string($virtualAccountDetails)) {
            $virtualAccountDetails = json_decode($virtualAccountDetails, true) ?? [];
        }

        if (! is_array($virtualAccountDetails)) {
            return null;
        }

        return $virtualAccountDetails['destination']['address'] ?? null;
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
        if (isset($accountData['address']) && is_array($accountData['address'])) {
            $accountData['address'] = $this->sanitizeExternalAccountAddress($accountData['address']);
        }

        return $this->makeRequest('POST', "/customers/{$customerId}/external_accounts", $accountData, true, $idempotencyKey);
    }

    /**
     * Normalize external account address per Bridge bank validation rules.
     *
     * @see https://apidocs.bridge.xyz/platform/orchestration/external-accounts/validations
     *
     * @param  array<string, mixed>  $address
     * @return array<string, string>
     */
    public function sanitizeExternalAccountAddress(array $address): array
    {
        $street1 = $this->cleanBridgeStreetLine((string) ($address['street_line_1'] ?? ''));
        $street2 = $this->cleanBridgeStreetLine((string) ($address['street_line_2'] ?? ''));
        $city = trim((string) ($address['city'] ?? ''));
        $state = trim((string) ($address['state'] ?? ''));
        $postal = trim((string) ($address['postal_code'] ?? ''));
        $country = $this->normalizeBridgeCountry((string) ($address['country'] ?? 'USA'));

        if ($street1 === '' && $street2 !== '') {
            $street1 = $street2;
            $street2 = '';
        }

        if ($this->isUsBridgeCountry($country) && $street1 !== '' && ! preg_match('/^\d/', $street1)) {
            if (preg_match('/\b(\d+\s+\S.*)$/', $street1.' '.$street2, $matches)) {
                $street1 = trim($matches[1]);
            } elseif (preg_match('/(\d+)/', $street1.' '.$street2, $matches)) {
                $street1 = trim($matches[0]);
            }
        }

        $street1 = $this->truncateBridgeAddressField($street1, 35);
        $street2 = $this->truncateBridgeAddressField($street2, 35);

        if ($street1 !== '' && strlen($street1) < 3) {
            $street1 = $this->truncateBridgeAddressField(str_pad($street1, 3, '.'), 35);
        }

        $line3 = $this->buildBridgeFormattedLine3($city, $state, $postal, $country);
        while (strlen($line3) > 35 && $city !== '') {
            $cityWords = preg_split('/\s+/', $city) ?: [];
            if (count($cityWords) <= 1) {
                $moved = $city;
                $city = '';
            } else {
                $moved = (string) array_pop($cityWords);
                $city = trim(implode(' ', $cityWords));
            }

            if ($street2 === '') {
                $street2 = $this->truncateBridgeAddressField($moved, 35);
            } else {
                $combined = trim($street2.', '.$moved);
                if (strlen($combined) <= 35) {
                    $street2 = $combined;
                } else {
                    $street2 = $this->truncateBridgeAddressField($combined, 35);
                    break;
                }
            }

            $line3 = $this->buildBridgeFormattedLine3($city, $state, $postal, $country);
        }

        if (strlen($line3) > 35) {
            $city = $this->truncateBridgeAddressField($city, max(1, 35 - strlen(trim($state.' '.$postal))));
        }

        $sanitized = [
            'street_line_1' => $street1,
            'street_line_2' => $street2,
            'city' => $city,
            'state' => $state,
            'postal_code' => $postal,
            'country' => $country,
        ];

        return array_filter($sanitized, fn ($value) => $value !== '');
    }

    /**
     * @param  array<string, mixed>  $address
     * @return list<string>
     */
    public function bridgeExternalAccountAddressViolations(array $address): array
    {
        $violations = [];
        $street1 = trim((string) ($address['street_line_1'] ?? ''));
        $street2 = trim((string) ($address['street_line_2'] ?? ''));
        $city = trim((string) ($address['city'] ?? ''));
        $state = trim((string) ($address['state'] ?? ''));
        $postal = trim((string) ($address['postal_code'] ?? ''));
        $country = $this->normalizeBridgeCountry((string) ($address['country'] ?? 'USA'));

        if ($street1 === '') {
            $violations[] = 'street_line_1 is required';
        } elseif (strlen($street1) < 3) {
            $violations[] = 'street_line_1 is too short';
        } elseif (strlen($street1) > 35) {
            $violations[] = 'street_line_1 is too long';
        }

        if ($street2 !== '' && strlen($street2) > 35) {
            $violations[] = 'street_line_2 is too long';
        }

        if ($city === '') {
            $violations[] = 'city is required';
        }

        if ($postal === '') {
            $violations[] = 'postal_code is required';
        }

        if ($country === '') {
            $violations[] = 'country is required';
        }

        if ($this->bridgeCountryRequiresState($country) && $state === '') {
            $violations[] = 'state is required';
        }

        if ($street1 !== '' && $this->bridgeStreetLineHasPoBoxOrPmb($street1)) {
            $violations[] = 'street_line_1 cannot contain PO Box or PMB';
        }

        if ($street2 !== '' && $this->bridgeStreetLineHasPoBoxOrPmb($street2)) {
            $violations[] = 'street_line_2 cannot contain PO Box or PMB';
        }

        if ($this->isUsBridgeCountry($country) && $street1 !== '' && ! preg_match('/^\d/', $street1)) {
            $violations[] = 'street_line_1 must include a street number for US addresses';
        }

        $line3 = $this->buildBridgeFormattedLine3($city, $state, $postal, $country);
        if (strlen($line3) > 35) {
            $violations[] = 'formatted address line 3 is too long';
        }

        return $violations;
    }

    /**
     * @param  array<string, mixed>  $updates
     */
    public function updateExternalAccount(string $customerId, string $externalAccountId, array $updates): array
    {
        if (isset($updates['address']) && is_array($updates['address'])) {
            $updates['address'] = $this->sanitizeExternalAccountAddress($updates['address']);
        }

        return $this->makeRequest(
            'PUT',
            "/customers/{$customerId}/external_accounts/{$externalAccountId}",
            $updates,
        );
    }

    /**
     * Fix external account address fields that exceed Bridge limits before off-ramp transfers.
     *
     * @return array{success: bool, status?: int, data?: array<string, mixed>, message?: string, violations?: list<string>}
     */
    public function ensureExternalAccountAddressValid(string $customerId, string $externalAccountId): array
    {
        $result = $this->getExternalAccount($customerId, $externalAccountId);
        if (! ($result['success'] ?? false) || ! is_array($result['data'] ?? null)) {
            return $result;
        }

        $address = is_array($result['data']['address'] ?? null) ? $result['data']['address'] : [];
        if ($address === []) {
            return $result;
        }

        $sanitized = $this->sanitizeExternalAccountAddress($address);
        $currentViolations = $this->bridgeExternalAccountAddressViolations($address);
        $sanitizedViolations = $this->bridgeExternalAccountAddressViolations($sanitized);

        if ($currentViolations === [] && $sanitizedViolations === []) {
            return $result;
        }

        if ($sanitizedViolations !== []) {
            return [
                'success' => false,
                'status' => 422,
                'message' => 'Bank account address could not be normalized for withdrawal: '.implode('; ', $sanitizedViolations),
                'violations' => $sanitizedViolations,
            ];
        }

        $needsUpdate = $currentViolations !== [];
        if (! $needsUpdate) {
            foreach (['street_line_1', 'street_line_2', 'city', 'state', 'postal_code', 'country'] as $field) {
                $original = trim((string) ($address[$field] ?? ''));
                $fixed = trim((string) ($sanitized[$field] ?? ''));
                if ($original !== $fixed) {
                    $needsUpdate = true;
                    break;
                }
            }
        }

        if (! $needsUpdate) {
            return $result;
        }

        $update = $this->updateExternalAccount($customerId, $externalAccountId, [
            'address' => $sanitized,
        ]);

        if (! ($update['success'] ?? false)) {
            return $update;
        }

        $refreshed = $this->getExternalAccount($customerId, $externalAccountId);
        if (! ($refreshed['success'] ?? false)) {
            return $refreshed;
        }

        $refreshedAddress = is_array($refreshed['data']['address'] ?? null) ? $refreshed['data']['address'] : [];
        $remainingViolations = $this->bridgeExternalAccountAddressViolations($refreshedAddress);
        if ($remainingViolations !== []) {
            return [
                'success' => false,
                'status' => 422,
                'message' => 'Bank account address is still invalid after update: '.implode('; ', $remainingViolations),
                'violations' => $remainingViolations,
            ];
        }

        return $refreshed;
    }

    private function cleanBridgeStreetLine(string $value): string
    {
        $value = trim(preg_replace('/\s+/', ' ', $value) ?? '');

        return $this->bridgeStreetLineHasPoBoxOrPmb($value) ? '' : $value;
    }

    private function bridgeStreetLineHasPoBoxOrPmb(string $value): bool
    {
        return (bool) preg_match('/\b(p\.?\s*o\.?\s*box|post\s*office\s*box|po\s*box|pmb)\b/i', $value);
    }

    private function truncateBridgeAddressField(string $value, int $maxLength): string
    {
        $value = trim($value);
        if ($value === '' || strlen($value) <= $maxLength) {
            return $value;
        }

        return rtrim(substr($value, 0, $maxLength));
    }

    private function normalizeBridgeCountry(string $country): string
    {
        $country = strtoupper(trim($country));

        return match ($country) {
            'US', 'USA', 'UNITED STATES', 'UNITED STATES OF AMERICA' => 'USA',
            default => $country !== '' ? $country : 'USA',
        };
    }

    private function isUsBridgeCountry(string $country): bool
    {
        return in_array($this->normalizeBridgeCountry($country), ['US', 'USA'], true);
    }

    private function bridgeCountryRequiresState(string $country): bool
    {
        return $this->isUsBridgeCountry($country);
    }

    private function buildBridgeFormattedLine3(string $city, string $state, string $postal, string $country): string
    {
        $parts = array_values(array_filter([$city, $state, $postal], fn ($part) => $part !== ''));

        if (! $this->isUsBridgeCountry($country) && $country !== '') {
            $parts[] = $this->abbreviateBridgeCountryForLine3($country);
        }

        return trim(implode(' ', $parts));
    }

    private function abbreviateBridgeCountryForLine3(string $country): string
    {
        $country = $this->normalizeBridgeCountry($country);
        if (strlen($country) <= 3) {
            return $country;
        }

        return substr($country, 0, 3);
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

    public function deleteExternalAccount(string $customerId, string $externalAccountId): array
    {
        return $this->makeRequest(
            'DELETE',
            "/customers/{$customerId}/external_accounts/{$externalAccountId}",
        );
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
     * Resolve a customer's custodial Bridge wallet for transfers.
     *
     * @return array{wallet_id: string, chain: string, currency: string, initiation_required: bool}|null
     */
    public function resolveCustomerBridgeWallet(BridgeIntegration $integration, ?string $customerIdOverride = null): ?array
    {
        $customerId = trim((string) ($customerIdOverride ?? $integration->bridge_customer_id ?? ''));
        if ($customerId === '') {
            return null;
        }

        $integration->loadMissing('primaryWallet', 'wallets');

        $walletId = $integration->bridge_wallet_id
            ?? $integration->primaryWallet?->bridge_wallet_id
            ?? $integration->wallets->first(fn (BridgeWallet $w) => ! empty($w->bridge_wallet_id))?->bridge_wallet_id;

        if ($walletId) {
            $resolved = $this->parseBridgeWalletForTransfer($customerId, $walletId);
            if ($resolved !== null) {
                return $resolved;
            }
        }

        $wallets = $this->normalizeBridgeListData($this->getWallets($customerId));
        if ($wallets === []) {
            return null;
        }

        $walletId = (string) ($wallets[0]['id'] ?? '');
        if ($walletId === '') {
            return null;
        }

        $resolved = $this->parseBridgeWalletForTransfer($customerId, $walletId);
        if ($resolved === null) {
            return null;
        }

        if ($integration->bridge_wallet_id !== $walletId) {
            $integration->update(['bridge_wallet_id' => $walletId]);
        }

        return $resolved;
    }

    /**
     * @return array{wallet_id: string, chain: string, currency: string, balance: float, initiation_required: bool}|null
     */
    public function parseBridgeWalletForTransfer(string $customerId, string $walletId): ?array
    {
        $customerId = trim($customerId);
        $walletId = trim($walletId);

        if ($walletId === '') {
            return null;
        }

        $data = null;

        if ($customerId !== '') {
            $result = $this->getWallet($customerId, $walletId);
            if (($result['success'] ?? false) && is_array($result['data'] ?? null)) {
                $data = $result['data'];
            }
        }

        if ($data === null) {
            $result = $this->getBridgeWalletById($walletId);
            if (($result['success'] ?? false) && is_array($result['data'] ?? null)) {
                $data = $result['data'];
            }
        }

        if ($data === null) {
            return null;
        }

        $resolvedWalletId = trim((string) ($data['id'] ?? $walletId));
        if ($resolvedWalletId === '') {
            return null;
        }

        $chain = strtolower((string) ($data['chain'] ?? 'solana'));
        if (in_array($chain, ['usd', 'fiat'], true)) {
            $chain = 'solana';
        }

        $primaryStablecoin = $this->resolvePrimaryStablecoinBalance($data);

        return [
            'wallet_id' => $resolvedWalletId,
            'chain' => $chain,
            'currency' => $primaryStablecoin['currency'],
            'balance' => $primaryStablecoin['balance'],
            'initiation_required' => (bool) ($data['initiation_required'] ?? false),
        ];
    }

    /**
     * Pick the stablecoin with the highest spendable balance in a Bridge wallet.
     *
     * @param  array<string, mixed>  $walletData
     * @return array{currency: string, balance: float}
     */
    public function resolvePrimaryStablecoinBalance(array $walletData): array
    {
        $bestCurrency = 'usdc';
        $bestBalance = 0.0;
        $balances = $walletData['balances'] ?? [];

        if (is_array($balances)) {
            foreach ($balances as $balance) {
                if (! is_array($balance)) {
                    continue;
                }

                $currency = strtolower((string) ($balance['currency'] ?? ''));
                if (! in_array($currency, ['usdc', 'usdb', 'usd'], true)) {
                    continue;
                }

                $amount = (float) ($balance['balance'] ?? 0);
                if ($amount > $bestBalance) {
                    $bestBalance = $amount;
                    $bestCurrency = $currency === 'usd' ? 'usdc' : $currency;
                }
            }
        }

        if ($bestBalance > 0) {
            return [
                'currency' => $bestCurrency,
                'balance' => round($bestBalance, 2),
            ];
        }

        $parsedBalance = $this->parseBridgeWalletUsdBalance($walletData);

        return [
            'currency' => $bestCurrency,
            'balance' => round($parsedBalance, 2),
        ];
    }

    /**
     * @param  array<string, mixed>  $walletData
     */
    public function resolveWalletBalanceCurrency(array $walletData): string
    {
        return $this->resolvePrimaryStablecoinBalance($walletData)['currency'];
    }

    /**
     * Sum USDC/USDB balances from a Bridge custodial wallet payload.
     *
     * @param  array<string, mixed>  $walletData
     */
    public function parseBridgeWalletUsdBalance(array $walletData): float
    {
        $total = 0.0;
        $balances = $walletData['balances'] ?? [];

        if (is_array($balances)) {
            foreach ($balances as $balance) {
                if (! is_array($balance)) {
                    continue;
                }

                $currency = strtolower((string) ($balance['currency'] ?? ''));
                if (! in_array($currency, ['usdc', 'usdb', 'usd'], true)) {
                    continue;
                }

                $total += (float) ($balance['balance'] ?? 0);
            }
        }

        if ($total > 0) {
            return round($total, 2);
        }

        foreach (['balance', 'available_balance', 'total_balance'] as $key) {
            if (isset($walletData[$key]) && is_numeric($walletData[$key])) {
                return round((float) $walletData[$key], 2);
            }
        }

        return 0.0;
    }

    /**
     * Create a transfer between two Bridge wallets
     * 
     * @see https://apidocs.bridge.xyz/platform/wallets/move-money
     * @see https://apidocs.bridge.xyz/get-started/guides/common-use-cases/payroll
     * 
     * @param string $fromCustomerId Source customer ID
     * @param string $fromWalletId Source wallet ID
     * @param string $toCustomerId Destination customer ID (on_behalf_of)
     * @param string $toWalletId Destination wallet ID
     * @param float $amount Transfer amount
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
        $fromWallet = $this->parseBridgeWalletForTransfer($fromCustomerId, $fromWalletId);
        $toWallet = $this->parseBridgeWalletForTransfer($toCustomerId, $toWalletId);

        if ($fromWallet !== null && $toWallet !== null) {
            if ($fromWallet['initiation_required']) {
                return [
                    'success' => false,
                    'error' => 'Sender wallet requires payment initiation before transfers can be created.',
                    'initiation_required' => true,
                ];
            }

            $transferCurrency = $fromWallet['currency'];
            $availableBalance = (float) ($fromWallet['balance'] ?? 0);

            if ($availableBalance < $amount) {
                return [
                    'success' => false,
                    'error' => 'Insufficient funds in your Bridge wallet. Available: $'.number_format($availableBalance, 2),
                    'error_code' => 'INSUFFICIENT_BRIDGE_WALLET_BALANCE',
                    'bridge_wallet_balance' => $availableBalance,
                ];
            }

            return $this->createTransfer([
                'amount' => number_format($amount, 2, '.', ''),
                'on_behalf_of' => $fromCustomerId,
                'source' => [
                    'payment_rail' => 'bridge_wallet',
                    'currency' => $transferCurrency,
                    'bridge_wallet_id' => $fromWallet['wallet_id'],
                ],
                'destination' => [
                    'payment_rail' => $toWallet['chain'],
                    'currency' => $transferCurrency,
                    'bridge_wallet_id' => $toWallet['wallet_id'],
                ],
            ]);
        }

        if (! $this->isSandbox()) {
            return [
                'success' => false,
                'error' => 'Both sender and recipient must have active Bridge custodial wallets.',
                'error_code' => 'MISSING_BRIDGE_WALLET',
            ];
        }

            if (empty($fromWalletId) && empty($fromAddress)) {
                return [
                    'success' => false,
                'error' => 'Source Bridge wallet or virtual account is required for transfers.',
                    'error_code' => 'MISSING_SOURCE_WALLET_ID',
                ];
            }

            $sourceAddress = $fromAddress;
        if (empty($sourceAddress) && ! empty($fromWalletId)) {
                $virtualAccountResult = $this->getVirtualAccount($fromCustomerId, $fromWalletId);
                if ($virtualAccountResult['success'] && isset($virtualAccountResult['data']['destination']['address'])) {
                    $sourceAddress = $virtualAccountResult['data']['destination']['address'];
                } else {
                    return [
                        'success' => false,
                    'error' => 'Could not retrieve source address from virtual account.',
                        'error_code' => 'VIRTUAL_ACCOUNT_FETCH_FAILED',
                    ];
                }
            }

            $destinationAddress = $toAddress;
        if (empty($destinationAddress) && ! empty($toWalletId)) {
                $virtualAccountResult = $this->getVirtualAccount($toCustomerId, $toWalletId);
                if ($virtualAccountResult['success'] && isset($virtualAccountResult['data']['destination']['address'])) {
                    $destinationAddress = $virtualAccountResult['data']['destination']['address'];
                } else {
                    return [
                        'success' => false,
                    'error' => 'Could not retrieve destination address from virtual account.',
                        'error_code' => 'VIRTUAL_ACCOUNT_FETCH_FAILED',
                    ];
                }
            }

        if (empty($sourceAddress) || empty($destinationAddress)) {
                return [
                    'success' => false,
                'error' => 'Source and destination addresses are required for sandbox transfers.',
                'error_code' => 'MISSING_ADDRESSES',
                ];
            }

        return $this->createTransfer([
            'amount' => number_format($amount, 2, '.', ''),
            'on_behalf_of' => $fromCustomerId,
                'source' => [
                'payment_rail' => 'ethereum',
                'currency' => 'usdc',
                'from_address' => $sourceAddress,
                ],
                'destination' => [
                'payment_rail' => 'ethereum',
                    'currency' => 'usdc',
                'to_address' => $destinationAddress,
            ],
        ]);
    }

    /**
     * List transfers
     */
    public function getTransfers(array $query = []): array
    {
        return $this->makeRequest('GET', '/transfers', $query);
    }

    /**
     * List transfers for a customer (on_behalf_of filter).
     */
    public function getCustomerTransfers(string $customerId, array $query = []): array
    {
        return $this->makeRequest('GET', '/transfers', array_merge(['on_behalf_of' => $customerId], $query));
    }

    /**
     * Get transfer by ID
     */
    public function getTransfer(string $transferId): array
    {
        return $this->makeRequest('GET', "/transfers/{$transferId}");
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
    public function createTransferToExternalAccount(
        string $customerId,
        string $walletId,
        string $externalAccountId,
        float $amount,
        string $currency = 'USD',
        string $paymentRail = 'ach',
        ?string $achReference = null,
        ?string $wireMessage = null,
    ): array {
        // Per Bridge USD integration guide: offramp source uses bridge_wallet + usdc
        $bridgeCurrency = strtolower($currency) === 'usd' ? 'usdc' : strtolower($currency);
        
        $paymentRail = strtolower($paymentRail);
        $validPaymentRails = ['ach', 'wire', 'ach_same_day'];
        if (! in_array($paymentRail, $validPaymentRails, true)) {
            return [
                'success' => false,
                'error' => 'Invalid payment rail. Must be "ach", "ach_same_day", or "wire"',
                'error_code' => 'INVALID_PAYMENT_RAIL',
            ];
        }

        $formattedAmount = number_format($amount, 2, '.', '');

        $destination = [
            'payment_rail' => $paymentRail,
            'currency' => strtolower($currency),
            'external_account_id' => $externalAccountId,
            // Bridge offramp examples also include amount on destination
            'amount' => $formattedAmount,
        ];

        if ($achReference !== null && $achReference !== '' && in_array($paymentRail, ['ach', 'ach_same_day'], true)) {
            $destination['ach_reference'] = $achReference;
        }

        if ($wireMessage !== null && $wireMessage !== '' && $paymentRail === 'wire') {
            $destination['wire_message'] = $wireMessage;
        }

        $transferData = [
            'amount' => $formattedAmount,
            'on_behalf_of' => $customerId,
            'source' => [
                'payment_rail' => 'bridge_wallet',
                'currency' => $bridgeCurrency,
                'bridge_wallet_id' => $walletId,
            ],
            'destination' => $destination,
        ];

        return $this->createTransfer($transferData);
    }

    /**
     * Fund a customer's Bridge wallet from the platform prefunded liquidity wallet.
     *
     * @see https://apidocs.bridge.xyz/platform/wallets/prefunded_wallets
     *
     * @return array{success: bool, data?: array<string, mixed>, error?: string, message?: string, error_code?: string, status?: int}
     */
    public function createPrefundedWalletTransfer(
        string $prefundedCustomerId,
        string $prefundedWalletId,
        string $recipientCustomerId,
        string $recipientWalletId,
        float $amount,
        ?string $idempotencyKey = null,
        ?string $prefundedAccountId = null,
    ): array {
        $resolved = $this->resolvePlatformPrefundedWallet(
            $prefundedCustomerId,
            $prefundedWalletId,
            $prefundedAccountId,
        );

        if ($resolved === null) {
            return [
                'success' => false,
                'error' => 'Platform prefunded wallet is not configured correctly. In Bridge settings, load your live prefunded account and save the linked Bridge wallet ID.',
                'error_code' => 'PREFUNDED_WALLET_NOT_CONFIGURED',
            ];
        }

        $prefundedCustomerId = $resolved['customer_id'];
        $prefundedWalletId = $resolved['wallet_id'];
        $prefundedWallet = $resolved['parsed'];
        $recipientCustomerId = trim($recipientCustomerId);
        $recipientWalletId = trim($recipientWalletId);

        if ($recipientCustomerId === '' || $recipientWalletId === '') {
            return [
                'success' => false,
                'error' => 'Recipient Bridge wallet is not configured.',
                'error_code' => 'RECIPIENT_WALLET_REQUIRED',
            ];
        }

        $recipientWallet = $this->parseBridgeWalletForTransfer($recipientCustomerId, $recipientWalletId);

        if ($recipientWallet === null) {
            return [
                'success' => false,
                'error' => 'Your Bridge wallet could not be loaded.',
                'error_code' => 'RECIPIENT_WALLET_NOT_FOUND',
            ];
        }

        $availableBalance = (float) ($prefundedWallet['balance'] ?? 0);
        if ($availableBalance + 0.000001 < $amount) {
            return [
                'success' => false,
                'error' => 'Platform liquidity is temporarily unavailable. Please try again later.',
                'error_code' => 'INSUFFICIENT_PREFUNDED_BALANCE',
            ];
        }

        return $this->createTransfer([
            'amount' => number_format($amount, 2, '.', ''),
            'on_behalf_of' => $recipientCustomerId,
            'source' => [
                'payment_rail' => 'bridge_wallet',
                'currency' => $prefundedWallet['currency'],
                'bridge_wallet_id' => $prefundedWallet['wallet_id'],
            ],
            'destination' => [
                'payment_rail' => $recipientWallet['chain'],
                'currency' => $recipientWallet['currency'],
                'bridge_wallet_id' => $recipientWallet['wallet_id'],
            ],
        ], $idempotencyKey);
    }

    /**
     * Resolve the on-chain network for a Bridge custodial wallet.
     */
    public function resolveWalletChain(string $customerId, string $walletId, ?string $fallback = 'solana'): string
    {
        $result = $this->getWallet($customerId, $walletId);
        if (($result['success'] ?? false) && ! empty($result['data']['chain'])) {
            return strtolower((string) $result['data']['chain']);
        }

        $normalized = strtolower((string) ($fallback ?? 'solana'));

        return in_array($normalized, ['usd', 'fiat'], true) ? 'solana' : $normalized;
    }

    /**
     * Create a virtual account for USD deposits to Bridge wallet
     * 
     * Per Bridge API: production destination uses chain name as payment_rail + bridge_wallet_id.
     * 
     * @param string $customerId Bridge customer ID
     * @param string $walletId Bridge wallet ID
     * @param string $currency Currency (default: USD)
     * @param string|null $chain Wallet chain (solana, ethereum, base, etc.)
     * @return array
     */
    public function createVirtualAccountForWallet(
        string $customerId,
        string $walletId,
        string $currency = 'USD',
        ?string $chain = null,
    ): array {
        $source = [
            'currency' => strtolower($currency),
        ];

        if ($this->isSandbox()) {
            $destination = [
                'payment_rail' => 'ethereum',
            'currency' => 'usdc',
                'address' => $this->generateEthereumAddress(),
            ];
        } else {
            $walletChain = $chain
                ? strtolower($chain)
                : $this->resolveWalletChain($customerId, $walletId);

            if (in_array($walletChain, ['usd', 'fiat'], true)) {
                $walletChain = $this->resolveWalletChain($customerId, $walletId);
            }

            $destination = [
                'payment_rail' => $walletChain,
                'currency' => 'usdc',
                'bridge_wallet_id' => $walletId,
            ];
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
    public function createVirtualAccountForChainWallet(
        string $customerId,
        string $walletId,
        string $chain = 'solana',
        ?string $walletAddress = null,
    ): array {
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
            ];

            if ($walletId) {
                $destination['bridge_wallet_id'] = $walletId;
            }

            if ($walletAddress) {
                $destination['address'] = $walletAddress;
            }
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
     * Event categories Bridge should deliver to our webhook endpoint.
     * 
     * @return list<string>
     */
    public static function webhookEventCategories(): array
    {
        return [
                'customer',
                'kyc_link',
                'liquidation_address.drain',
                'static_memo.activity',
                'transfer',
                'virtual_account.activity',
            'bridge_wallet.activity',
                'card_account',
                'card_transaction',
                'posted_card_account_transaction',
                'card_withdrawal',
        ];
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
            'event_categories' => self::webhookEventCategories(),
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
            $eventCategories = self::webhookEventCategories();
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
                                self::webhookEventCategories()
                            );
                            
                            if ($activateResult['success']) {
                                return $activateResult;
                            }
                        }

                        $requiredCategories = self::webhookEventCategories();
                        $currentCategories = $webhook['event_categories'] ?? [];
                        $missingCategories = array_values(array_diff($requiredCategories, $currentCategories));

                        if ($missingCategories !== []) {
                            Log::info('Updating Bridge webhook event categories', [
                                'webhook_id' => $webhook['id'] ?? null,
                                'missing_categories' => $missingCategories,
                            ]);

                            $syncResult = $this->activateWebhook(
                                $webhook['id'],
                                $webhookUrl,
                                $requiredCategories
                            );

                            if ($syncResult['success']) {
                                return $syncResult;
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
