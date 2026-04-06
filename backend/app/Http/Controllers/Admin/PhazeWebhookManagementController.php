<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PhazeWebhook;
use App\Services\GiftCardService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class PhazeWebhookManagementController extends Controller
{
    protected $giftCardService;

    public function __construct(GiftCardService $giftCardService)
    {
        $this->giftCardService = $giftCardService;
    }

    /**
     * List all registered Phaze webhooks
     * Fetches from both database and Phaze API
     */
    public function index()
    {
        try {
            // Get webhooks from database
            $dbWebhooks = PhazeWebhook::orderBy('created_at', 'desc')->get()->toArray();

            // Get webhooks from Phaze API
            $phazeApiWebhooks = $this->getPhazeWebhooksFromApi();

            // Merge and deduplicate webhooks
            // Priority: Phaze API data (most up-to-date), then database
            $allWebhooks = [];
            $seenIds = [];

            // First, add Phaze API webhooks
            if ($phazeApiWebhooks && is_array($phazeApiWebhooks)) {
                foreach ($phazeApiWebhooks as $apiWebhook) {
                    $phazeId = $apiWebhook['id'] ?? null;
                    if ($phazeId) {
                        $seenIds[] = $phazeId;
                        // Find matching database record
                        $dbMatch = collect($dbWebhooks)->firstWhere('phaze_webhook_id', $phazeId);

                        $allWebhooks[] = [
                            'id' => $dbMatch['id'] ?? null,
                            'phaze_webhook_id' => $phazeId,
                            'url' => $apiWebhook['url'] ?? null,
                            'api_key' => $dbMatch['api_key'] ?? ($apiWebhook['apiKey'] ?? null),
                            'authorization_header_name' => $dbMatch['authorization_header_name'] ?? ($apiWebhook['authorizationHeaderName'] ?? 'authorization'),
                            'account_id' => $apiWebhook['accountId'] ?? $dbMatch['account_id'] ?? null,
                            'is_active' => $dbMatch['is_active'] ?? true,
                            'created_at' => $apiWebhook['created_at'] ?? $dbMatch['created_at'] ?? null,
                            'updated_at' => $apiWebhook['updated_at'] ?? $dbMatch['updated_at'] ?? null,
                            'source' => 'phaze_api', // Indicates this came from Phaze API
                        ];
                    }
                }
            }

            // Then, add database webhooks that aren't in Phaze API
            foreach ($dbWebhooks as $dbWebhook) {
                $phazeId = $dbWebhook['phaze_webhook_id'] ?? null;
                if ($phazeId && !in_array($phazeId, $seenIds)) {
                    // This webhook exists in DB but not in Phaze API (might be deleted from Phaze)
                    $allWebhooks[] = array_merge($dbWebhook, [
                        'source' => 'database_only', // Indicates this is only in database
                    ]);
                } elseif (!$phazeId) {
                    // Webhook in DB but no Phaze ID (shouldn't happen, but handle it)
                    $allWebhooks[] = array_merge($dbWebhook, [
                        'source' => 'database_only',
                    ]);
                }
            }

            // Sort by created_at descending
            usort($allWebhooks, function($a, $b) {
                $aTime = strtotime($a['created_at'] ?? '1970-01-01');
                $bTime = strtotime($b['created_at'] ?? '1970-01-01');
                return $bTime - $aTime;
            });

            return response()->json([
                'success' => true,
                'webhooks' => $allWebhooks,
                'count' => count($allWebhooks),
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching Phaze webhooks: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            // Fallback to database only
            $webhooks = PhazeWebhook::orderBy('created_at', 'desc')->get();

            return response()->json([
                'success' => true,
                'webhooks' => $webhooks,
                'count' => $webhooks->count(),
                'warning' => 'Could not fetch webhooks from Phaze API. Showing database webhooks only.',
            ]);
        }
    }

    /**
     * Create a new Phaze webhook
     * Only admin can access this
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'url' => 'required|url',
            'api_key' => 'nullable|string|min:16',
            'authorization_header_name' => 'nullable|string|max:50',
        ]);

        try {
            // Ensure URL ends with /webhooks/phaze if not provided
            $url = $validated['url'];
            if (!str_ends_with($url, '/webhooks/phaze') && !str_ends_with($url, '/webhooks/phaze/')) {
                // If URL doesn't end with webhook path, append it
                $url = rtrim($url, '/') . '/webhooks/phaze';
            }

            // Check if webhook with this URL already exists in our database
            $existingWebhook = PhazeWebhook::where('url', $url)->first();

            if ($existingWebhook) {
                return response()->json([
                    'success' => false,
                    'message' => 'A webhook with this URL already exists in the system. Please delete the existing webhook first or use a different URL.',
                    'existing_webhook' => [
                        'id' => $existingWebhook->id,
                        'phaze_webhook_id' => $existingWebhook->phaze_webhook_id,
                        'url' => $existingWebhook->url,
                    ],
                ], 409); // 409 Conflict
            }

            // Generate API key if not provided
            $apiKey = $validated['api_key'] ?? $this->generateApiKey();
            $authorizationHeaderName = $validated['authorization_header_name'] ?? 'authorization';

            // Prepare webhook data for Phaze API
            $webhookData = [
                'url' => $url,
                'apiKey' => $apiKey,
                'authorizationHeaderName' => $authorizationHeaderName,
            ];

            // Call Phaze API to create webhook
            $phazeResponse = $this->createPhazeWebhook($webhookData);

            if (!$phazeResponse) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to create webhook in Phaze API. Please check the logs for more details.',
                ], 500);
            }

            // Check if Phaze returned an error about URL already existing
            if (isset($phazeResponse['error'])) {
                $errorMessage = $phazeResponse['error'];

                if (stripos($errorMessage, 'already used') !== false || stripos($errorMessage, 'already exists') !== false) {
                    return response()->json([
                        'success' => false,
                        'message' => 'This webhook URL is already registered with Phaze. Please delete the existing webhook from Phaze first, or use a different URL.',
                    ], 409); // 409 Conflict
                }

                return response()->json([
                    'success' => false,
                    'message' => 'Phaze API error: ' . $errorMessage,
                ], 400);
            }

            // Store webhook in database
            $webhook = PhazeWebhook::create([
                'phaze_webhook_id' => $phazeResponse['id'] ?? null,
                'url' => $url,
                'api_key' => $apiKey,
                'authorization_header_name' => $authorizationHeaderName,
                'account_id' => $phazeResponse['accountId'] ?? null,
                'is_active' => true,
            ]);

            Log::info('Phaze webhook created successfully', [
                'webhook_id' => $webhook->id,
                'phaze_webhook_id' => $webhook->phaze_webhook_id,
                'url' => $webhook->url,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Webhook created successfully',
                'webhook' => $webhook,
            ], 201);

        } catch (\Exception $e) {
            Log::error('Error creating Phaze webhook: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error creating webhook: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete a Phaze webhook
     * Only admin can access this
     * Can delete by database ID or Phaze webhook ID
     */
    public function destroy($id, Request $request)
    {
        try {
            // First, try to find by database ID
            $webhook = PhazeWebhook::find($id);

            $phazeWebhookId = null;

            if ($webhook) {
                // Found in database - use its Phaze webhook ID
                $phazeWebhookId = $webhook->phaze_webhook_id;
            } else {
                // Not found in database - check if this is a Phaze webhook ID
                // Try to find by phaze_webhook_id
                $webhook = PhazeWebhook::where('phaze_webhook_id', $id)->first();

                if ($webhook) {
                    $phazeWebhookId = $webhook->phaze_webhook_id;
                } else {
                    // Not in database at all - assume the ID is a Phaze webhook ID
                    // This handles webhooks that exist only in Phaze API
                    $phazeWebhookId = is_numeric($id) ? (int) $id : null;
                }
            }

            // Always delete from Phaze API if we have the webhook ID
            $phazeApiDeleted = false;
            if ($phazeWebhookId) {
                $phazeApiDeleted = $this->deletePhazeWebhook($phazeWebhookId);

                if (!$phazeApiDeleted) {
                    Log::warning('Failed to delete webhook from Phaze API, but continuing with database deletion', [
                        'webhook_id' => $id,
                        'phaze_webhook_id' => $phazeWebhookId,
                    ]);
                }
            } else {
                Log::warning('No Phaze webhook ID found, cannot delete from Phaze API', [
                    'webhook_id' => $id,
                ]);
            }

            // Delete from database if it exists
            if ($webhook) {
                $webhook->delete();
            }

            Log::info('Phaze webhook deleted successfully', [
                'webhook_id' => $id,
                'phaze_webhook_id' => $phazeWebhookId,
                'was_in_database' => $webhook !== null,
                'phaze_api_deleted' => $phazeApiDeleted,
            ]);

            $message = 'Webhook deleted successfully';
            if ($phazeWebhookId && !$phazeApiDeleted) {
                $message = 'Webhook deleted from database, but failed to delete from Phaze API. Please check logs.';
            }

            return response()->json([
                'success' => true,
                'message' => $message,
                'phaze_api_deleted' => $phazeApiDeleted,
            ]);

        } catch (\Exception $e) {
            Log::error('Error deleting Phaze webhook: ' . $e->getMessage(), [
                'webhook_id' => $id,
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error deleting webhook: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get webhooks from Phaze API
     */
    private function getPhazeWebhooksFromApi(): ?array
    {
        try {
            $endpoint = '/webhooks';
            $baseUrl = $this->getBaseUrl();
            $apiKey = $this->getApiKey();
            $apiSecret = $this->getApiSecret();

            if (empty($apiKey)) {
                Log::error('Phaze API key not configured');
                return null;
            }

            // Generate signature for GET request
            $signature = $this->generateSignature('GET', $endpoint, null, $apiSecret);

            $headers = [
                'API-Key' => $apiKey,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ];

            if ($signature) {
                $headers['Signature'] = $signature;
            }

            $ch = curl_init();
            curl_setopt_array($ch, [
                CURLOPT_URL => $baseUrl . $endpoint,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_HTTPGET => true,
                CURLOPT_HTTPHEADER => array_map(function ($key, $value) {
                    return "$key: $value";
                }, array_keys($headers), $headers),
                CURLOPT_SSL_VERIFYPEER => true,
                CURLOPT_TIMEOUT => 10,
            ]);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $error = curl_error($ch);
            curl_close($ch);

            if ($error) {
                Log::error('cURL error fetching Phaze webhooks', ['error' => $error]);
                return null;
            }

            if ($httpCode >= 200 && $httpCode < 300) {
                $responseData = json_decode($response, true);
                // Phaze API might return webhooks in different formats
                // Check if it's an array of webhooks or wrapped in a key
                if (isset($responseData['webhooks']) && is_array($responseData['webhooks'])) {
                    return $responseData['webhooks'];
                } elseif (is_array($responseData) && isset($responseData[0])) {
                    return $responseData; // Direct array of webhooks
                } elseif (is_array($responseData) && !empty($responseData)) {
                    return [$responseData]; // Single webhook wrapped in array
                }
                return [];
            } else {
                Log::warning('Phaze webhook fetch failed', [
                    'http_code' => $httpCode,
                    'response' => $response,
                ]);
                return null;
            }

        } catch (\Exception $e) {
            Log::error('Error fetching Phaze webhooks via API: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Create webhook via Phaze API
     */
    private function createPhazeWebhook(array $data): ?array
    {
        try {
            $endpoint = '/webhooks';
            $baseUrl = $this->getBaseUrl();
            $apiKey = $this->getApiKey();
            $apiSecret = $this->getApiSecret();

            if (empty($apiKey)) {
                Log::error('Phaze API key not configured');
                return null;
            }

            // Generate signature
            $signature = $this->generateSignature('POST', $endpoint, $data, $apiSecret);

            $headers = [
                'API-Key' => $apiKey,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ];

            if ($signature) {
                $headers['Signature'] = $signature;
            }

            $ch = curl_init();
            curl_setopt_array($ch, [
                CURLOPT_URL => $baseUrl . $endpoint,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
                CURLOPT_HTTPHEADER => array_map(function ($key, $value) {
                    return "$key: $value";
                }, array_keys($headers), $headers),
                CURLOPT_SSL_VERIFYPEER => true,
                CURLOPT_TIMEOUT => 10,
            ]);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $error = curl_error($ch);
            curl_close($ch);

            if ($error) {
                Log::error('cURL error creating Phaze webhook', ['error' => $error]);
                return null;
            }

            // Parse response
            $responseData = json_decode($response, true);

            if ($httpCode >= 200 && $httpCode < 300) {
                return $responseData ?: [];
            } else {
                // Return error information instead of null
                $errorMessage = $responseData['error'] ?? $responseData['message'] ?? 'Unknown error';
                Log::warning('Phaze webhook creation failed', [
                    'http_code' => $httpCode,
                    'response' => $response,
                ]);

                return [
                    'error' => $errorMessage,
                    'http_code' => $httpCode,
                ];
            }

        } catch (\Exception $e) {
            Log::error('Error creating Phaze webhook via API: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Delete webhook via Phaze API
     * DELETE {{baseUrl}}/webhooks/:id
     * Headers: API-Key (required), Signature (required)
     */
    private function deletePhazeWebhook(int $webhookId): bool
    {
        try {
            $endpoint = "/webhooks/{$webhookId}";
            $baseUrl = $this->getBaseUrl();
            $apiKey = $this->getApiKey();
            $apiSecret = $this->getApiSecret();

            if (empty($apiKey)) {
                Log::error('Phaze API key not configured');
                return false;
            }

            if (empty($apiSecret)) {
                Log::error('Phaze API secret not configured - signature required for DELETE');
                return false;
            }

            // Generate signature for DELETE request
            // For DELETE: METHOD + PATH + SECRET + "" (empty body)
            $signature = $this->generateSignature('DELETE', $endpoint, null, $apiSecret);

            $headers = [
                'API-Key' => $apiKey,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ];

            // Add signature header (use 'Signature' with capital S to match GiftCardService)
            if ($signature) {
                $headers['Signature'] = $signature;
            }

            $fullUrl = $baseUrl . $endpoint;

            Log::info('Deleting Phaze webhook via API', [
                'url' => $fullUrl,
                'webhook_id' => $webhookId,
                'has_signature' => !empty($signature),
                'endpoint' => $endpoint,
            ]);

            $ch = curl_init();
            curl_setopt_array($ch, [
                CURLOPT_URL => $fullUrl,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_CUSTOMREQUEST => 'DELETE',
                CURLOPT_HTTPHEADER => array_map(function ($key, $value) {
                    return "$key: $value";
                }, array_keys($headers), $headers),
                CURLOPT_SSL_VERIFYPEER => true,
                CURLOPT_TIMEOUT => 10,
            ]);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $error = curl_error($ch);
            curl_close($ch);

            if ($error) {
                Log::error('cURL error deleting Phaze webhook', [
                    'error' => $error,
                    'webhook_id' => $webhookId,
                    'url' => $fullUrl,
                ]);
                return false;
            }

            // Phaze API returns 200 OK with no response body on successful deletion
            if ($httpCode === 200) {
                Log::info('Phaze webhook deleted successfully via API', [
                    'webhook_id' => $webhookId,
                    'http_code' => $httpCode,
                ]);
                return true;
            }

            // If we get here, deletion failed - log detailed info for debugging
            $responseData = json_decode($response, true);
            Log::warning('Phaze webhook deletion failed', [
                'webhook_id' => $webhookId,
                'http_code' => $httpCode,
                'response' => $response,
                'response_data' => $responseData,
                'url' => $fullUrl,
                'endpoint' => $endpoint,
                'signature_sent' => !empty($signature),
            ]);
            return false;

        } catch (\Exception $e) {
            Log::error('Error deleting Phaze webhook via API: ' . $e->getMessage(), [
                'webhook_id' => $webhookId,
                'trace' => $e->getTraceAsString(),
            ]);
            return false;
        }
    }

    /**
     * Generate signature for Phaze API request
     */
    private function generateSignature(string $method, string $endpoint, $body = null, ?string $apiSecret = null): ?string
    {
        if (empty($apiSecret)) {
            $apiSecret = $this->getApiSecret();
        }

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
     * Get Phaze API base URL
     */
    private function getBaseUrl(): string
    {
        $environment = config('services.phaze.environment', env('PHAZE_ENVIRONMENT', 'sandbox'));
        $explicitBaseUrl = env('PHAZE_BASE_URL');

        if (!empty($explicitBaseUrl)) {
            return rtrim($explicitBaseUrl, '/');
        }

        if ($environment === 'sandbox') {
            return 'https://api.sandbox.phaze.io';
        } else {
            return 'https://api.phaze.io';
        }
    }

    /**
     * Get Phaze API key
     */
    private function getApiKey(): string
    {
        return config('services.phaze.api_key', env('PHAZE_API_KEY'));
    }

    /**
     * Get Phaze API secret
     */
    private function getApiSecret(): string
    {
        return config('services.phaze.api_secret', env('PHAZE_API_SECRET'));
    }

    /**
     * Generate a secure random API key for webhook
     */
    private function generateApiKey(): string
    {
        return bin2hex(random_bytes(32)); // 64 character hex string
    }
}
