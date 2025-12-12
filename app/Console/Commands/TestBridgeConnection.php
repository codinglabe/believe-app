<?php

namespace App\Console\Commands;

use App\Services\BridgeService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class TestBridgeConnection extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'bridge:test';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test Bridge API connection and verify API key';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Testing Bridge API Connection...');
        $this->newLine();

        // Check configuration
        $apiKey = config('services.bridge.api_key');
        $environment = config('services.bridge.environment', env('BRIDGE_ENVIRONMENT', 'production'));

        if (empty($apiKey)) {
            $this->error('❌ BRIDGE_API_KEY is not set in .env file');
            $this->info('Please add: BRIDGE_API_KEY=your_api_key_here');
            return 1;
        }

        $maskedKey = substr($apiKey, 0, 8) . '...' . substr($apiKey, -4);
        $this->info("API Key: {$maskedKey} (length: " . strlen($apiKey) . ")");
        $this->info("Environment: {$environment}");
        $this->newLine();

        // Test API connection
        $this->info('Testing API connection...');
        
        try {
            $bridgeService = new BridgeService();
            
            // Get the actual base URL from the service (using reflection to access private property)
            $reflection = new \ReflectionClass($bridgeService);
            $baseUrlProperty = $reflection->getProperty('baseUrl');
            $baseUrlProperty->setAccessible(true);
            $baseUrl = $baseUrlProperty->getValue($bridgeService);
            
            $this->info("Base URL: {$baseUrl}");
            $this->newLine();
            
            // Try to list customers (simple endpoint to test authentication)
            $customersEndpoint = "{$baseUrl}/customers";
            $this->info("Calling: GET {$customersEndpoint}");
            $this->newLine();
            
            $result = $bridgeService->getCustomers();
            
            // Log the full response with full URL
            Log::info('Bridge Test - GET /customers API Call', [
                'url' => $customersEndpoint,
                'method' => 'GET',
                'success' => $result['success'] ?? false,
                'status' => $result['status'] ?? null,
                'response_data' => $result['data'] ?? null,
                'error' => $result['error'] ?? null,
                'full_response' => $result,
            ]);
            
            if ($result['success']) {
                $this->info('✅ Bridge API connection successful!');
                $this->info('Your API key is valid and working.');
                $this->newLine();
                
                // Display customers data
                $customers = $result['data'] ?? [];
                $customerList = isset($customers['data']) ? $customers['data'] : $customers;
                
                if (is_array($customerList)) {
                    $customerCount = count($customerList);
                    $this->info("📋 Customers API Response:");
                    $this->info("Total customers: {$customerCount}");
                    
                    if ($customerCount > 0) {
                        $this->newLine();
                        $this->line('Customer list:');
                        foreach (array_slice($customerList, 0, 10) as $index => $customer) {
                            $customerId = $customer['id'] ?? $customer['customer_id'] ?? 'N/A';
                            $customerName = $customer['name'] ?? $customer['business_name'] ?? 'N/A';
                            $customerEmail = $customer['email'] ?? 'N/A';
                            $customerType = $customer['type'] ?? 'N/A';
                            
                            $this->line("  " . ($index + 1) . ". ID: {$customerId} | Name: {$customerName} | Email: {$customerEmail} | Type: {$customerType}");
                        }
                        
                        if ($customerCount > 10) {
                            $this->line("  ... and " . ($customerCount - 10) . " more customers");
                        }
                    } else {
                        $this->line('  No customers found.');
                    }
                    
                    // Log full response data
                    $this->newLine();
                    $this->line('Full API response logged to: storage/logs/laravel.log');
                } else {
                    $this->info("📋 Customers API Response:");
                    $this->line('Response data: ' . json_encode($customers, JSON_PRETTY_PRINT));
                }
                
                $this->newLine();
                
                // Test webhooks
                $this->info('Testing Webhooks...');
                $this->line('Fetching webhooks list...');
                
                $webhooksResult = $bridgeService->getWebhooks();
                
                if ($webhooksResult['success']) {
                    $webhooks = $webhooksResult['data'] ?? [];
                    
                    if (is_array($webhooks) && !empty($webhooks)) {
                        // Handle if webhooks is an array of webhook objects
                        $webhookList = isset($webhooks['data']) ? $webhooks['data'] : $webhooks;
                        
                        if (!empty($webhookList)) {
                            $firstWebhook = is_array($webhookList) ? $webhookList[0] : $webhookList;
                            $webhookId = $firstWebhook['id'] ?? $firstWebhook['webhook_id'] ?? null;
                            
                            if ($webhookId) {
                                $this->info("Found webhook: {$webhookId}");
                                $this->line("Fetching events for webhook: {$webhookId}...");
                                
                                $eventsResult = $bridgeService->getWebhookEvents($webhookId);
                                
                                if ($eventsResult['success']) {
                                    $events = $eventsResult['data'] ?? [];
                                    $eventList = isset($events['data']) ? $events['data'] : $events;
                                    $eventCount = is_array($eventList) ? count($eventList) : 0;
                                    
                                    $this->info("✅ Webhook events retrieved successfully!");
                                    $this->info("Total events: {$eventCount}");
                                    
                                    if ($eventCount > 0 && is_array($eventList)) {
                                        $this->newLine();
                                        $this->line('Recent events:');
                                        $recentEvents = array_slice($eventList, 0, 5);
                                        
                                        foreach ($recentEvents as $event) {
                                            $eventId = $event['id'] ?? $event['event_id'] ?? 'N/A';
                                            $eventType = $event['type'] ?? $event['event_type'] ?? 'N/A';
                                            $createdAt = $event['created_at'] ?? $event['timestamp'] ?? 'N/A';
                                            
                                            $this->line("  - Event ID: {$eventId} | Type: {$eventType} | Created: {$createdAt}");
                                        }
                                    }
                                } else {
                                    $this->warn('⚠️  Could not fetch webhook events');
                                    $this->line('Error: ' . ($eventsResult['error'] ?? 'Unknown error'));
                                }
                            } else {
                                $this->warn('⚠️  Webhook ID not found in webhook data');
                            }
                        } else {
                            $this->info('ℹ️  No webhooks found');
                        }
                    } else {
                        $this->info('ℹ️  No webhooks configured');
                    }
                } else {
                    $this->warn('⚠️  Could not fetch webhooks');
                    $this->line('Error: ' . ($webhooksResult['error'] ?? 'Unknown error'));
                    $this->line('Note: This might be normal if webhooks are not configured yet.');
                }
                
                return 0;
            } else {
                $this->error('❌ Bridge API connection failed');
                $this->error('Error: ' . ($result['error'] ?? 'Unknown error'));
                
                if (isset($result['status'])) {
                    $this->info("HTTP Status: {$result['status']}");
                }
                
                $this->newLine();
                $this->warn('Troubleshooting:');
                $this->line('1. Verify your API key in Bridge Dashboard: https://dashboard.bridge.xyz');
                $this->line('2. Make sure you\'re using the correct API key for your environment');
                $this->line('3. Check that there are no extra spaces or quotes in your .env file');
                $this->line('4. Run: php artisan config:clear');
                
                return 1;
            }
        } catch (\Exception $e) {
            $this->error('❌ Exception occurred: ' . $e->getMessage());
            $this->error($e->getTraceAsString());
            return 1;
        }
    }
}



