<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use App\Models\User;

class GiftCardService
{
    // Cache duration in seconds (5 minutes)
    private const CACHE_DURATION = 300;

    // Phaze API Configuration
    private function getBaseUrl(): string
    {
        $environment = config('services.phaze.environment', env('PHAZE_ENVIRONMENT', 'sandbox'));
        $explicitBaseUrl = env('PHAZE_BASE_URL');

        // If explicit base URL is set, use it
        if (!empty($explicitBaseUrl)) {
            return rtrim($explicitBaseUrl, '/');
        }

        // Otherwise, use environment-based defaults
        if ($environment === 'sandbox') {
            return 'https://api.sandbox.phaze.io';
        } else {
            return 'https://api.phaze.io';
        }
    }

    private function getApiKey(): string
    {
        return config('services.phaze.api_key', env('PHAZE_API_KEY'));
    }

    private function getApiSecret(): string
    {
        return config('services.phaze.api_secret', env('PHAZE_API_SECRET'));
    }

    /**
     * Generate signature for Phaze API request
     */
    private function generateSignature(string $method, string $endpoint, $body = null): ?string
    {
        $apiSecret = $this->getApiSecret();

        if (empty($apiSecret)) {
            return null;
        }

        $requestMethod = strtoupper($method);
        $requestPath = $endpoint;

        $requestBody = '';
        if ($body !== null && in_array($method, ['POST', 'PUT', 'PATCH'])) {
            $requestBody = json_encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        }

        $stringToSign = $requestMethod . $requestPath . $apiSecret . $requestBody;
        return hash('sha256', $stringToSign);
    }

    /**
     * Make cURL request to Phaze API
     * Optimized for performance
     */
    private function makeCurlRequest(string $method, string $endpoint, array $headers = [], $body = null): ?array
    {
        $baseUrl = $this->getBaseUrl();
        $fullUrl = rtrim($baseUrl, '/') . $endpoint;

        $ch = curl_init();

        // Basic cURL options
        curl_setopt_array($ch, [
            CURLOPT_URL => $fullUrl,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_TIMEOUT => 10, // Reduced timeout for faster failure
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_2_0, // Use HTTP/2 if available
            CURLOPT_ENCODING => '', // Enable compression
        ]);

        // Set headers
        $headerArray = [];
        foreach ($headers as $key => $value) {
            $headerArray[] = $key . ': ' . $value;
        }
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headerArray);

        // Set method and body
        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            if ($body !== null) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
            }
        } elseif ($method !== 'GET') {
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
            if ($body !== null) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
            }
        }

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            Log::error('cURL error in Phaze API request', [
                'error' => $error,
                'endpoint' => $endpoint,
            ]);
            return null;
        }

        if ($httpCode < 200 || $httpCode >= 300) {
            Log::warning('Phaze API request failed', [
                'http_code' => $httpCode,
                'endpoint' => $endpoint,
                'response_preview' => substr($response, 0, 200),
            ]);
            return null;
        }

        $data = json_decode($response, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            Log::error('Failed to parse Phaze API JSON response', [
                'error' => json_last_error_msg(),
                'endpoint' => $endpoint,
            ]);
            return null;
        }

        return $data;
    }

    /**
     * Get account status from Phaze API
     */
    public function getAccountStatus(): ?array
    {
        try {
            $endpoint = '/accountstatus';
            $headers = [
                'API-Key' => $this->getApiKey(),
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ];

            return $this->makeCurlRequest('GET', $endpoint, $headers);
        } catch (\Exception $e) {
            Log::error('Error fetching Phaze account status: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Create a disbursement (gift card purchase) via Phaze API
     */
    public function createDisbursement(array $data): ?array
    {
        try {
            $disbursementData = [
                'amount' => $data['amount'],
                'currency' => $data['currency'] ?? 'USD',
                'recipient' => [
                    'email' => $data['recipient_email'],
                    'name' => $data['recipient_name'] ?? 'Gift Card Recipient',
                ],
                'description' => $data['description'] ?? 'Gift Card Purchase',
                'metadata' => $data['metadata'] ?? [],
            ];

            $endpoint = '/disbursements';
            $signature = $this->generateSignature('POST', $endpoint, $disbursementData);

            $headers = [
                'API-Key' => $this->getApiKey(),
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ];

            if ($signature) {
                $headers['Signature'] = $signature;
            }

            return $this->makeCurlRequest('POST', $endpoint, $headers, $disbursementData);
        } catch (\Exception $e) {
            Log::error('Error creating Phaze disbursement: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Get disbursement status from Phaze API
     */
    public function getDisbursementStatus(string $disbursementId): ?array
    {
        try {
            $endpoint = '/disbursements/' . $disbursementId;
            $headers = [
                'API-Key' => $this->getApiKey(),
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ];

            return $this->makeCurlRequest('GET', $endpoint, $headers);
        } catch (\Exception $e) {
            Log::error('Error fetching Phaze disbursement status: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Purchase gift card via Phaze API
     * This is called after Stripe payment is successful
     *
     * @param array $data Purchase data including productId, amount, currency, orderId, externalUserId
     * @return array|null Purchase response from Phaze API
     */
    public function purchaseGiftCard(array $data): ?array
    {
        try {
            $purchaseData = [
                'productId' => $data['productId'],
                'price' => $data['amount'], // Face value of the gift card (required parameter)
                'orderId' => $data['orderId'], // Must be Version 4 UUID
                'externalUserId' => $data['externalUserId'], // User ID from our system
            ];

            // Optional fields
            if (isset($data['currency'])) {
                $purchaseData['baseCurrency'] = $data['currency'];
            }

            $endpoint = '/purchase';
            $signature = $this->generateSignature('POST', $endpoint, $purchaseData);

            $headers = [
                'API-Key' => $this->getApiKey(),
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ];

            if ($signature) {
                $headers['Signature'] = $signature;
            }

            $response = $this->makeCurlRequest('POST', $endpoint, $headers, $purchaseData);

            if (!$response) {
                // Try without signature as fallback
                if ($signature) {
                    Log::info('Phaze purchase: Retrying without signature', [
                        'orderId' => $purchaseData['orderId'],
                        'productId' => $purchaseData['productId'],
                    ]);
                    unset($headers['Signature']);
                    $response = $this->makeCurlRequest('POST', $endpoint, $headers, $purchaseData);
                }
            }

            if (!$response) {
                Log::warning('Phaze purchase API call failed', [
                    'orderId' => $purchaseData['orderId'],
                    'productId' => $purchaseData['productId'],
                    'price' => $purchaseData['price'],
                    'externalUserId' => $purchaseData['externalUserId'],
                ]);
            }

            return $response;
        } catch (\Exception $e) {
            Log::error('Error purchasing gift card from Phaze API: ' . $e->getMessage(), [
                'data' => $data,
                'trace' => $e->getTraceAsString(),
            ]);
            return null;
        }
    }

    /**
     * Get purchase details from Phaze API by purchase/transaction ID
     *
     * @param string $purchaseId The Phaze purchase/transaction ID
     * @return array|null Purchase details from Phaze API
     */
    public function getPurchaseDetails(string $purchaseId): ?array
    {
        try {
            $endpoint = '/purchase/' . $purchaseId;
            $apiKey = $this->getApiKey();

            if (empty($apiKey)) {
                Log::warning('Phaze API key not configured');
                return null;
            }

            // Generate signature
            $apiSecret = $this->getApiSecret();
            $signature = null;
            if (!empty($apiSecret)) {
                $signature = $this->generateSignature('GET', $endpoint, null);
            }

            // Prepare headers
            $headers = [
                'API-Key' => $apiKey,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ];

            if ($signature) {
                $headers['Signature'] = $signature;
            }

            // Make request with cURL
            $response = $this->makeCurlRequest('GET', $endpoint, $headers);

            if (!$response) {
                // Try without signature as fallback
                if ($signature) {
                    unset($headers['Signature']);
                    $response = $this->makeCurlRequest('GET', $endpoint, $headers);
                }
            }

            return $response;
        } catch (\Exception $e) {
            Log::error('Error fetching purchase details from Phaze API: ' . $e->getMessage(), [
                'purchase_id' => $purchaseId,
            ]);
            return null;
        }
    }

    /**
     * Lookup transaction by order ID from Phaze API
     * This is a fallback method - webhooks are preferred for real-time updates
     *
     * @param string $orderId The order ID to lookup
     * @return array|null Transaction data or null on failure
     */
    public function lookupTransactionByOrderId(string $orderId): ?array
    {
        try {
            $endpoint = '/transaction/' . urlencode($orderId);
            $baseUrl = $this->getBaseUrl();
            $apiKey = $this->getApiKey();

            if (empty($apiKey)) {
                Log::warning('Phaze API key not configured');
                return null;
            }

            // Generate signature
            $apiSecret = $this->getApiSecret();
            $signature = null;
            if (!empty($apiSecret)) {
                $signature = $this->generateSignature('GET', $endpoint, null);
            }

            // Prepare headers
            $headers = [
                'API-Key' => $apiKey,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ];

            if ($signature) {
                $headers['Signature'] = $signature;
            }

            // Make request with cURL
            $response = $this->makeCurlRequest('GET', $endpoint, $headers);

            if (!$response) {
                // Try without signature as fallback
                if ($signature) {
                    unset($headers['Signature']);
                    $response = $this->makeCurlRequest('GET', $endpoint, $headers);
                }
            }

            if ($response && isset($response['httpCode']) && $response['httpCode'] >= 200 && $response['httpCode'] < 300) {
                $data = json_decode($response['body'], true);
                return $data;
            }

            Log::warning('Phaze transaction lookup failed', [
                'order_id' => $orderId,
                'http_code' => $response['httpCode'] ?? null,
                'response' => $response['body'] ?? null,
            ]);

            return null;
        } catch (\Exception $e) {
            Log::error('Error looking up transaction by order ID: ' . $e->getMessage(), [
                'order_id' => $orderId,
                'trace' => $e->getTraceAsString(),
            ]);
            return null;
        }
    }

    /**
     * Get gift card brands from Phaze API for a specific country
     * Optimized with caching and cURL
     *
     * @param string $country Country name (e.g., "USA", "Canada", "UK")
     * @param int $currentPage Page number for pagination (default: 1)
     * @return array List of brands
     */
    public function getGiftBrands(string $country = 'USA', int $currentPage = 1): array
    {
        // Create cache key
        $cacheKey = "phaze_brands_{$country}_page_{$currentPage}";

        // Try to get from cache first
        return Cache::remember($cacheKey, self::CACHE_DURATION, function () use ($country, $currentPage) {
            try {
                $apiKey = $this->getApiKey();
                if (empty($apiKey)) {
                    return [];
                }

                // Build endpoint
                $endpointPath = '/brands/country/' . urlencode($country);
                $endpoint = $endpointPath . '?currentPage=' . $currentPage;

                // Generate signature
                $apiSecret = $this->getApiSecret();
                $signature = null;
                if (!empty($apiSecret)) {
                    $signature = $this->generateSignature('GET', $endpoint, null);
                }

                // Prepare headers
                $headers = [
                    'API-Key' => $apiKey,
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json',
                ];

                if ($signature) {
                    $headers['Signature'] = $signature;
                }

                // Make request with cURL
                $response = $this->makeCurlRequest('GET', $endpoint, $headers);

                if (!$response) {
                    // Try without signature as fallback
                    if ($signature) {
                        unset($headers['Signature']);
                        $response = $this->makeCurlRequest('GET', $endpoint, $headers);
                    }
                }

                if (!$response || !is_array($response)) {
                    return [];
                }

                // Extract brands from response
                if (isset($response['brands']) && is_array($response['brands'])) {
                    // Ensure all brands have productName for display
                    $brands = array_map(function ($brand) {
                        // Try multiple possible field names for brand name
                        $brandName = null;

                        // Helper function to check if a value looks like a productId
                        $isProductId = function($value) {
                            if (empty($value)) return true;
                            $value = trim($value);
                            // ProductIds are usually long numbers (10+ digits)
                            // Brand names usually have letters or are shorter
                            if (is_numeric($value) && strlen($value) >= 10) {
                                return true; // Likely a productId
                            }
                            // Check if it's all digits
                            if (preg_match('/^[0-9]+$/', $value) && strlen($value) >= 8) {
                                return true; // Likely a productId
                            }
                            // Check if it starts with "Gift Card #" followed by numbers
                            if (preg_match('/^Gift Card #?[0-9]+$/', $value)) {
                                return true; // This is a generated name, not a real brand name
                            }
                            return false;
                        };

                        // Check common field names in order of preference
                        // Phaze API might use different field names
                        $possibleFields = [
                            'productName',
                            'name',
                            'brandName',
                            'title',
                            'brand',
                            'displayName',
                            'productTitle',
                            'merchantName',
                            'storeName',
                            'vendorName'
                        ];

                        foreach ($possibleFields as $field) {
                            if (isset($brand[$field]) && !empty($brand[$field])) {
                                $value = trim($brand[$field]);
                                // Skip if it looks like a productId
                                if (!$isProductId($value)) {
                                    $brandName = $value;
                                    break;
                                }
                            }
                        }

                        // If we found a valid brand name, use it
                        if (isset($brandName) && $brandName && strlen($brandName) > 0) {
                            $brand['productName'] = $brandName;
                        } else {
                            // Log available fields for debugging (only once per cache cycle to avoid spam)
                            static $hasLoggedStructure = false;
                            if (!$hasLoggedStructure) {
                                Log::info('Phaze API brand structure - checking for name fields', [
                                    'productId' => $brand['productId'] ?? 'unknown',
                                    'available_fields' => array_keys($brand),
                                    'all_field_values' => $brand, // Full brand object for debugging
                                ]);
                                $hasLoggedStructure = true;
                            }
                            // Use a generic name instead of showing productId
                            $brand['productName'] = 'Gift Card';
                        }

                        // Ensure productId is preserved
                        if (!isset($brand['productId'])) {
                            Log::warning('Brand missing productId', [
                                'available_fields' => array_keys($brand),
                            ]);
                        }

                        return $brand;
                    }, $response['brands']);

                    return $brands;
                }

                return [];
            } catch (\Exception $e) {
                Log::error('Error fetching gift card brands from Phaze API: ' . $e->getMessage(), [
                    'country' => $country,
                ]);
                return [];
            }
        });
    }

    /**
     * Clear cache for a specific country
     */
    public function clearBrandsCache(string $country = null): void
    {
        if ($country) {
            // Clear specific country cache
            for ($page = 1; $page <= 10; $page++) {
                Cache::forget("phaze_brands_{$country}_page_{$page}");
            }
        } else {
            // Clear all brands cache
            $countries = ['USA', 'Canada', 'UK', 'France', 'India', 'Italy', 'Japan'];
            foreach ($countries as $countryCode) {
                for ($page = 1; $page <= 10; $page++) {
                    Cache::forget("phaze_brands_{$countryCode}_page_{$page}");
                }
            }
        }
    }
}
