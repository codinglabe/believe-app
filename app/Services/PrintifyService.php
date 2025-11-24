<?php

namespace App\Services;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PrintifyService
{
    protected $client;
    protected $apiKey;
    protected $shopId;
    protected $baseUrl;

    public function __construct()
    {
        $this->baseUrl = config('printify.base_url', 'https://api.printify.com/');
        $this->apiKey = config('printify.api_key');
        $this->shopId = config('printify.shop_id');

        $this->client = new Client([
            'base_uri' => $this->baseUrl,
            'headers' => [
                'Authorization' => 'Bearer ' . $this->apiKey,
                'Content-Type' => 'application/json',
                'User-Agent' => 'BelieveInUnity/'  . env('APP_VERSION', '1.0')
            ],
            'timeout' => 30,
            'connect_timeout' => 10,
        ]);
    }

    /**
     * Get all blueprints (product types)
     */
    public function getBlueprints(): array
    {
        try {
            $response = $this->client->get('v1/catalog/blueprints.json');
            return json_decode($response->getBody(), true) ?: [];
        } catch (RequestException $e) {
            $this->handleException($e, 'Blueprints');
            return [];
        }
    }

    /**
     * Get print providers for a specific blueprint
     */
    public function getProviders(int $blueprintId): array
    {
        try {
            $response = $this->client->get("v1/catalog/blueprints/{$blueprintId}/print_providers.json");
            return json_decode($response->getBody(), true) ?: [];
        } catch (RequestException $e) {
            $this->handleException($e, 'Providers', ['blueprint_id' => $blueprintId]);
            return [];
        }
    }

    /**
     * Get print providers for a specific blueprint
     */
    public function getProvider(int $printProviderId): array
    {
        try {
            $response = $this->client->get("v1/catalog/print_providers/{$printProviderId}.json");
            return json_decode($response->getBody(), true) ?: [];
        } catch (RequestException $e) {
            $this->handleException($e, 'Provider id', ['printProviderId' => $printProviderId]);
            return [];
        }
    }

    /**
     * Get variants for a blueprint and print provider
     */
    public function getVariants(int $blueprintId, int $printProviderId): array
    {
        try {
            $response = $this->client->get("v1/catalog/blueprints/{$blueprintId}/print_providers/{$printProviderId}/variants.json");
            return json_decode($response->getBody(), true) ?: [];
        } catch (RequestException $e) {
            $this->handleException($e, 'Variants', [
                'blueprint_id' => $blueprintId,
                'print_provider_id' => $printProviderId
            ]);
            return [];
        }
    }

    /**
     * Get shipping information for a blueprint and print provider
     */
    public function getShipping(int $blueprintId, int $printProviderId): array
    {
        try {
            $response = $this->client->get("v2/catalog/blueprints/{$blueprintId}/print_providers/{$printProviderId}/shipping/standard.json");
            return json_decode($response->getBody(), true) ?: [];
        } catch (RequestException $e) {
            $this->handleException($e, 'Shipping', [
                'blueprint_id' => $blueprintId,
                'print_provider_id' => $printProviderId
            ]);
            return [];
        }
    }

    /**
     * Create a new product
     */
    public function createProduct(array $productData): array
    {
        try {
            Log::info('Sending Printify API request', [
                'shop_id' => $this->shopId,
                'product_data' => $productData
            ]);

            $response = $this->client->post("v1/shops/{$this->shopId}/products.json", [
                'json' => $productData,
                'http_errors' => false // Don't throw exceptions for HTTP errors
            ]);

            $statusCode = $response->getStatusCode();
            $responseBody = $response->getBody()->getContents();
            $responseData = json_decode($responseBody, true);

            Log::info('Printify API response', [
                'status_code' => $statusCode,
                'response' => $responseData
            ]);

            if ($statusCode >= 400) {
                throw new \Exception('Printify API error: ' . ($responseData['message'] ?? 'Unknown error') . ' (Status: ' . $statusCode . ')');
            }

            return $responseData;

        } catch (RequestException $e) {
            Log::error('Printify API request failed', [
                'error' => $e->getMessage(),
                'url' => $e->getRequest()->getUri(),
                'method' => $e->getRequest()->getMethod()
            ]);

            if ($e->hasResponse()) {
                $responseBody = $e->getResponse()->getBody()->getContents();
                $errorData = json_decode($responseBody, true);
                throw new \Exception('Printify API error: ' . ($errorData['message'] ?? $e->getMessage()));
            }

            throw new \Exception('Printify API connection failed: ' . $e->getMessage());
        } catch (\Exception $e) {
            Log::error('Printify service error', [
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Update an existing product
     */
    public function updateProduct(string $productId, array $productData): array
    {
        try {
            $response = $this->client->put("v1/shops/{$this->shopId}/products/{$productId}.json", [
                'json' => $productData
            ]);
            return json_decode($response->getBody(), true);
        } catch (RequestException $e) {
            $this->handleException($e, 'Update Product', ['product_id' => $productId]);
            throw $e;
        }
    }

    /**
     * Get a specific product
     */
    public function getProduct(string $productId): array
    {
        try {
            $response = $this->client->get("v1/shops/{$this->shopId}/products/{$productId}.json");
            return json_decode($response->getBody(), true);
        } catch (RequestException $e) {
            $this->handleException($e, 'Get Product', ['product_id' => $productId]);
            throw $e;
        }
    }

    /**
     * Get all products with pagination
     */
    public function getProducts(int $page = 1, int $limit = 100): array
    {
        try {
            $response = $this->client->get("v1/shops/{$this->shopId}/products.json", [
                'query' => [
                    'page' => $page,
                    'limit' => $limit
                ]
            ]);
            return json_decode($response->getBody(), true);
        } catch (RequestException $e) {
            $this->handleException($e, 'Get Products');
            throw $e;
        }
    }

    /**
     * Delete a product
     */
    public function deleteProduct(string $productId): bool
    {
        try {
            $response = $this->client->delete("v1/shops/{$this->shopId}/products/{$productId}.json");
            return $response->getStatusCode() === 200;
        } catch (RequestException $e) {
            $this->handleException($e, 'Delete Product', ['product_id' => $productId]);
            throw $e;
        }
    }

    /**
     * Publish a product
     */
    // In your PrintifyService
    public function publishProduct(string $productId, array $publishData = []): array
    {
        $defaultData = [
            'title' => true,
            'description' => true,
            'images' => true,
            'variants' => true,
            'tags' => true,
            'keyFeatures' => true,
            'shipping_template' => true
        ];

        $publishData = array_merge($defaultData, $publishData);

        try {
            $response = $this->client->post("v1/shops/{$this->shopId}/products/{$productId}/publish.json", [
                'json' => $publishData,
                'http_errors' => false
            ]);

            $statusCode = $response->getStatusCode();
            $responseBody = $response->getBody()->getContents();

            return [
                'success' => $statusCode === 200,
                'status_code' => $statusCode,
                'data' => json_decode($responseBody, true)
            ];

        } catch (\Exception $e) {
            \Log::error('Failed to publish Printify product', [
                'product_id' => $productId,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    // Mark publishing as succeeded (important for your custom integration)
    public function markPublishingSucceeded(string $productId, string $externalId, string $handle): array
    {
        try {
            $response = $this->client->post("v1/shops/{$this->shopId}/products/{$productId}/publishing_succeeded.json", [
                'json' => [
                    'external' => [
                        'id' => $externalId,
                        'handle' => $handle
                    ]
                ],
                'http_errors' => false
            ]);

            $statusCode = $response->getStatusCode();
            $responseBody = $response->getBody()->getContents();

            return [
                'success' => $statusCode === 200,
                'status_code' => $statusCode,
                'data' => json_decode($responseBody, true)
            ];

        } catch (\Exception $e) {
            \Log::error('Failed to mark publishing succeeded', [
                'product_id' => $productId,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Unpublish a product
     */
    public function unpublishProduct(string $productId): array
    {
        try {
            $response = $this->client->post("v1/shops/{$this->shopId}/products/{$productId}/unpublish.json", [
                'http_errors' => false
            ]);

            $statusCode = $response->getStatusCode();
            $responseBody = $response->getBody()->getContents();

            return [
                'success' => $statusCode === 200,
                'status_code' => $statusCode,
                'data' => json_decode($responseBody, true)
            ];

        } catch (\Exception $e) {
            \Log::error('Failed to unpublish Printify product', [
                'product_id' => $productId,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Upload an image
     */
    public function uploadImage(string $imageUrl): array
    {
        try {
            $response = $this->client->post("v1/uploads/images.json", [
                'json' => [
                    'file_name' => basename($imageUrl),
                    'url' => $imageUrl
                ]
            ]);
            return json_decode($response->getBody(), true);
        } catch (RequestException $e) {
            $this->handleException($e, 'Upload Image');
            throw $e;
        }
    }


    public function createOrder(array $orderData): array
    {
        try {
            // Prepare request data
            $requestData = [
                'external_id' => $orderData['external_id'] ?? 'order-' . uniqid(),
                'label' => $orderData['label'] ?? 'ORDER-' . substr(uniqid(), -6),
                'line_items' => $orderData['line_items'],
                'shipping_method' => $orderData['shipping_method'] ?? 1,
                'send_shipping_notification' => $orderData['send_shipping_notification'] ?? false,
                'address_to' => $orderData['address_to'],
            ];

            // Add optional fields
            if (isset($orderData['is_printify_express'])) {
                $requestData['is_printify_express'] = $orderData['is_printify_express'];
            }
            if (isset($orderData['is_economy_shipping'])) {
                $requestData['is_economy_shipping'] = $orderData['is_economy_shipping'];
            }



            // Make API request using Guzzle
            $response = $this->client->post("v1/shops/{$this->shopId}/orders.json", [
                'json' => $requestData,
                'http_errors' => false // Don't throw exceptions for HTTP errors
            ]);

            $statusCode = $response->getStatusCode();
            $responseBody = $response->getBody()->getContents();
            $responseData = json_decode($responseBody, true) ?? $responseBody;



            // Check if request was successful
            if ($statusCode >= 200 && $statusCode < 300) {
                Log::info('Printify order created successfully');
                return $responseData;
            }

            // Handle different error scenarios
            $errorMessage = $this->handleErrorResponse($statusCode, $responseData);

            throw new \Exception($errorMessage);

        } catch (RequestException $e) {
            // Handle Guzzle request exceptions
            $errorMessage = $this->handleGuzzleException($e);
            Log::error('Printify Guzzle Error: ' . $errorMessage);
            throw new \Exception($errorMessage);

        } catch (\Exception $e) {
            Log::error('Printify Service Error: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * <CHANGE> Get order status from Printify
     */
    public function getOrder(string $orderId): array
    {
        try {
            $response = $this->client->get("v1/shops/{$this->shopId}/orders/{$orderId}.json");
            return json_decode($response->getBody(), true) ?? [];
        } catch (RequestException $e) {
            Log::error('Failed to fetch Printify order', [
                'order_id' => $orderId,
                'error' => $e->getMessage()
            ]);
            return [];
        }
    }


    /**
     * Cancel order in Printify
     */
    public function cancelOrder(string $orderId): array
    {
        try {
            $response = $this->client->post("v1/shops/{$this->shopId}/orders/{$orderId}/cancel.json", [
                'http_errors' => false,
                'json' => [] // Empty payload as per Printify API
            ]);

            $statusCode = $response->getStatusCode();
            $responseBody = $response->getBody()->getContents();
            $responseData = json_decode($responseBody, true);

            if ($statusCode === 200) {
                Log::info('Printify order cancelled successfully', [
                    'order_id' => $orderId,
                    'response' => $responseData
                ]);
                return $responseData;
            }

            $errorMessage = "Failed to cancel order. Status: {$statusCode}, Response: {$responseBody}";
            Log::error($errorMessage);
            throw new \Exception($errorMessage);

        } catch (\Exception $e) {
            Log::error('Printify cancelOrder error: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * <CHANGE> Calculate shipping cost and details from Printify
     */
    public function calculateShipping(array $lineItems, array $shippingAddress): array
    {
        try {
            $payload = [
                'line_items' => $lineItems,
                'address_to' => $shippingAddress
            ];

            Log::info('Calculating Printify shipping', ['payload' => $payload]);

            $response = $this->client->post("v1/shops/{$this->shopId}/orders/shipping.json", [
                'json' => $payload,
                'http_errors' => false
            ]);

            $statusCode = $response->getStatusCode();
            $responseBody = $response->getBody()->getContents();
            $responseData = json_decode($responseBody, true);

            Log::info('Printify shipping calculation response', [
                'status_code' => $statusCode,
                'response' => $responseData
            ]);

            if ($statusCode >= 400) {
                throw new \Exception('Shipping calculation failed: ' . ($responseData['message'] ?? 'Unknown error'));
            }

            return $responseData ?? [];

        } catch (\Exception $e) {
            Log::error('Printify shipping calculation error', [
                'error' => $e->getMessage()
            ]);
            return [];
        }
    }

    /**
     * <CHANGE> Get product with full variant details from Printify
     */
    public function getProductWithVariants(int $blueprintId, int $printProviderId): array
    {
        try {
            $response = $this->client->get("v1/catalog/blueprints/{$blueprintId}/print_providers/{$printProviderId}/variants.json");
            $variants = json_decode($response->getBody(), true) ?? [];

            return [
                'blueprint_id' => $blueprintId,
                'print_provider_id' => $printProviderId,
                'variants' => $variants['data'] ?? $variants ?? []
            ];
        } catch (RequestException $e) {
            Log::error('Failed to fetch product variants from Printify', [
                'blueprint_id' => $blueprintId,
                'print_provider_id' => $printProviderId,
                'error' => $e->getMessage()
            ]);
            return [];
        }
    }

    /**
     * <CHANGE> Build Printify order payload from cart items
     */
    public function buildOrderPayload(array $cartItems, array $shippingInfo, array $shippingOption): array
    {
        $lineItems = [];

        foreach ($cartItems as $item) {
            $lineItems[] = [
                'product_id' => $item['printify_product_id'] ?? $item['product_id'],
                'variant_id' => (string) $item['printify_variant_id'],
                'quantity' => $item['quantity'],
                'print_provider_id' => $item['printify_print_provider_id'] ?? 1,
            ];
        }

        return [
            'external_order_id' => (string) time() . '-' . uniqid(),
            'line_items' => $lineItems,
            'shipping_method' => $shippingOption['id'] ?? null,
            'address_to' => [
                'first_name' => $shippingInfo['first_name'],
                'last_name' => $shippingInfo['last_name'],
                'email' => $shippingInfo['email'],
                'phone' => $shippingInfo['phone'] ?? '',
                'address1' => $shippingInfo['shipping_address'],
                'city' => $shippingInfo['city'],
                'region' => $shippingInfo['state'] ?? '',
                'country' => $shippingInfo['country'] ?? 'BD',
                'zip' => $shippingInfo['zip']
            ]
        ];
    }

    /**
     * Create webhook in Printify
     */
    public function createWebhook(string $url, string $event): array
    {
        try {
            $response = $this->client->post("v1/shops/{$this->shopId}/webhooks.json", [
                'json' => [
                    'url' => $url,
                    'topic' => $event
                ]
            ]);

            $data = json_decode($response->getBody(), true) ?? [];

            return [
                'success' => true,
                'data' => $data
            ];

        } catch (RequestException $e) {
            Log::error('Error creating Printify webhook', [
                'url' => $url,
                'event' => $event,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        } catch (\Exception $e) {
            Log::error('Unexpected error creating Printify webhook', [
                'url' => $url,
                'event' => $event,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Create multiple webhooks in Printify
     */
    public function createWebhooks(string $url, array $events): array
    {
        $results = [];
        $successCount = 0;
        $errorCount = 0;

        foreach ($events as $event) {
            $result = $this->createWebhook($url, $event);
            $results[$event] = $result;

            if ($result['success']) {
                $successCount++;
            } else {
                $errorCount++;
            }
        }

        return [
            'success' => $errorCount === 0, // Overall success if no errors
            'success_count' => $successCount,
            'error_count' => $errorCount,
            'results' => $results
        ];
    }

    /**
     * Get existing webhooks
     */
    public function getWebhooks(): array
    {
        try {
            $response = $this->client->get("v1/shops/{$this->shopId}/webhooks.json");
            $data = json_decode($response->getBody(), true) ?? [];

            return [
                'success' => true,
                'data' => $data
            ];

        } catch (RequestException $e) {
            Log::error('Failed to fetch Printify webhooks', [
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        } catch (\Exception $e) {
            Log::error('Unexpected error fetching Printify webhooks', [
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Delete webhook
     */
    public function deleteWebhook(string $webhookId, string $webhookHost): array
    {
        try {
            $response = $this->client->delete("v1/shops/{$this->shopId}/webhooks/{$webhookId}.json?host={$webhookHost}");

            return [
                'success' => true
            ];

        } catch (RequestException $e) {
            Log::error('Error deleting Printify webhook', [
                'webhook_id' => $webhookId,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        } catch (\Exception $e) {
            Log::error('Unexpected error deleting Printify webhook', [
                'webhook_id' => $webhookId,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }


    /**
     * Handle API exceptions
     */
    private function handleException(RequestException $e, string $operation, array $context = []): void
    {
        $context['operation'] = $operation;

        if ($e->hasResponse()) {
            $statusCode = $e->getResponse()->getStatusCode();
            $responseBody = $e->getResponse()->getBody()->getContents();

            $context['status_code'] = $statusCode;
            $context['response'] = $responseBody;

            Log::error("Printify API Error - {$operation}: Status {$statusCode}", $context);
        } else {
            $context['error_message'] = $e->getMessage();
            Log::error("Printify API Error - {$operation}: No response", $context);
        }
    }


    /**
     * Handle error responses from Printify API
     */
    private function handleErrorResponse(int $statusCode, $responseData): string
    {
        $message = "HTTP {$statusCode}: ";

        if (is_array($responseData)) {
            if (isset($responseData['message'])) {
                $message .= $responseData['message'];
            } elseif (isset($responseData['error'])) {
                $message .= $responseData['error'];
            } else {
                $message .= json_encode($responseData);
            }
        } else {
            $message .= $responseData;
        }

        return $message;
    }

    /**
     * Handle Guzzle request exceptions
     */
    private function handleGuzzleException(RequestException $e): string
    {
        if ($e->hasResponse()) {
            $response = $e->getResponse();
            $statusCode = $response->getStatusCode();
            $body = $response->getBody()->getContents();

            return "Guzzle HTTP {$statusCode}: " . $body;
        }

        return "Guzzle Error: " . $e->getMessage();
    }
}
