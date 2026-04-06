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

        // Load credentials from database first
        $bridgeConfig = \App\Models\PaymentMethod::getConfig('bridge');
        
        $apiKey = null;
        $environment = null;
        $source = '';

        if ($bridgeConfig) {
            $environment = $bridgeConfig->mode_environment ?? 'sandbox';
            
            if ($environment === 'sandbox' && !empty($bridgeConfig->sandbox_api_key)) {
                $apiKey = $bridgeConfig->sandbox_api_key;
                $source = 'database (sandbox)';
            } elseif ($environment === 'live' && !empty($bridgeConfig->live_api_key)) {
                $apiKey = $bridgeConfig->live_api_key;
                $source = 'database (live)';
            }
        }

        // Fall back to env if database doesn't have credentials
        if (empty($apiKey)) {
            $apiKey = config('services.bridge.api_key', env('BRIDGE_API_KEY'));
            $environment = config('services.bridge.environment', env('BRIDGE_ENVIRONMENT', 'production'));
            $source = 'environment (.env)';
        }

        if (empty($apiKey)) {
            $this->error('❌ Bridge API key is not configured');
            $this->info('Please configure Bridge credentials in: /settings/bridge');
            $this->info('Or add BRIDGE_API_KEY to your .env file');
            return 1;
        }

        $maskedKey = substr($apiKey, 0, 8) . '...' . substr($apiKey, -4);
        $this->info("API Key: {$maskedKey} (length: " . strlen($apiKey) . ")");
        $this->info("Environment: {$environment}");
        $this->info("Source: {$source}");
        $this->newLine();

        // Test API connection
        $this->info('Testing API connection...');
        
        try {
            // Create BridgeService with credentials from database or env
            $bridgeService = new BridgeService($apiKey, $environment);
            
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
                            $customerName = $customer['first_name'] ?? $customer['business_legal_name'] ?? $customer['first_name'] ?? 'N/A';
                            $customerEmail = $customer['email'] ?? 'N/A';
                            $customerType = $customer['type'] ?? 'N/A';
                            $customerStatus = $customer['status'] ?? 'N/A';
                            $kycStatus = $customer['kyc_status'] ?? $customer['kyb_status'] ?? 'N/A';
                            
                            $this->line("  " . ($index + 1) . ". ID: {$customerId} | Name: {$customerName} | Email: {$customerEmail} | Type: {$customerType} | Status: {$customerStatus} | KYC/KYB: {$kycStatus}");
                        }
                        
                        if ($customerCount > 10) {
                            $this->line("  ... and " . ($customerCount - 10) . " more customers");
                        }
                        
                        // Display detailed customer information
                        $this->newLine();
                        $this->info('📊 Detailed Customer Information:');
                        
                        foreach (array_slice($customerList, 0, 5) as $index => $customer) {
                            $customerId = $customer['id'] ?? 'N/A';
                            
                            // Fetch full customer details
                            $this->line("  Fetching details for customer: {$customerId}...");
                            $customerDetailsResult = $bridgeService->getCustomer($customerId);
                            
                            if ($customerDetailsResult['success']) {
                                $customerDetails = $customerDetailsResult['data'];
                                
                                $this->newLine();
                                $this->line("  ┌─ Customer #" . ($index + 1) . " Details ──────────────────────────────────────────");
                                
                                // Basic Info
                                $this->line("  │ ID: " . ($customerDetails['id'] ?? 'N/A'));
                                $this->line("  │ Type: " . ($customerDetails['type'] ?? 'N/A'));
                                $this->line("  │ Email: " . ($customerDetails['email'] ?? 'N/A'));
                                
                                // Business-specific fields
                                if (($customerDetails['type'] ?? '') === 'business') {
                                    $businessName = $customerDetails['business_name'] ?? $customerDetails['business_legal_name'] ?? $customerDetails['first_name'] ?? 'N/A';
                                    $this->line("  │ Business Name: {$businessName}");
                                    $this->line("  │ Business Type: " . ($customerDetails['business_type'] ?? 'N/A'));
                                    $this->line("  │ Business Industry: " . ($customerDetails['business_industry'] ?? 'N/A'));
                                    $this->line("  │ Business Description: " . (isset($customerDetails['business_description']) ? substr($customerDetails['business_description'], 0, 50) . '...' : 'N/A'));
                                    $this->line("  │ Primary Website: " . ($customerDetails['primary_website'] ?? $customerDetails['website'] ?? 'N/A'));
                                } else {
                                    $firstName = $customerDetails['first_name'] ?? 'N/A';
                                    $lastName = $customerDetails['last_name'] ?? 'N/A';
                                    $this->line("  │ First Name: {$firstName}");
                                    $this->line("  │ Last Name: {$lastName}");
                                }
                                
                                // Status
                                $this->line("  │ Status: " . ($customerDetails['status'] ?? 'N/A'));
                                $this->line("  │ KYC Status: " . ($customerDetails['kyc_status'] ?? 'N/A'));
                                if (($customerDetails['type'] ?? '') === 'business') {
                                    $this->line("  │ KYB Status: " . ($customerDetails['kyb_status'] ?? 'N/A'));
                                }
                                $this->line("  │ TOS Accepted: " . (isset($customerDetails['has_accepted_terms_of_service']) && $customerDetails['has_accepted_terms_of_service'] ? 'Yes' : 'No'));
                                
                                // Address
                                $address = $customerDetails['registered_address'] ?? $customerDetails['business_address'] ?? $customerDetails['residential_address'] ?? null;
                                if ($address) {
                                    $addressStr = ($address['street_line_1'] ?? '') . ', ' . 
                                                 ($address['city'] ?? '') . ', ' . 
                                                 ($address['subdivision'] ?? $address['state'] ?? '') . ' ' . 
                                                 ($address['postal_code'] ?? '') . ', ' . 
                                                 ($address['country'] ?? '');
                                    $this->line("  │ Address: " . trim($addressStr, ', '));
                                } else {
                                    $this->line("  │ Address: N/A");
                                }
                                
                                // Endorsements
                                $endorsements = $customerDetails['endorsements'] ?? [];
                                if (!empty($endorsements)) {
                                    $this->line("  │ Endorsements: " . count($endorsements) . " found");
                                    foreach ($endorsements as $endorsement) {
                                        $endorsementName = $endorsement['name'] ?? 'Unknown';
                                        $endorsementStatus = $endorsement['status'] ?? 'N/A';
                                        $this->line("  │   - {$endorsementName}: {$endorsementStatus}");
                                    }
                                } else {
                                    $this->line("  │ Endorsements: None");
                                }
                                
                                // Requirements Due
                                $requirementsDue = $customerDetails['requirements_due'] ?? [];
                                if (!empty($requirementsDue)) {
                                    $this->line("  │ Requirements Due: " . implode(', ', array_slice($requirementsDue, 0, 5)));
                                    if (count($requirementsDue) > 5) {
                                        $this->line("  │   ... and " . (count($requirementsDue) - 5) . " more");
                                    }
                                } else {
                                    $this->line("  │ Requirements Due: None");
                                }
                                
                                // Associated Persons (for business)
                                if (($customerDetails['type'] ?? '') === 'business') {
                                    $associatedPersons = $customerDetails['associated_persons'] ?? [];
                                    if (!empty($associatedPersons)) {
                                        $this->line("  │ Associated Persons: " . count($associatedPersons) . " found");
                                        foreach (array_slice($associatedPersons, 0, 3) as $person) {
                                            $personName = ($person['first_name'] ?? '') . ' ' . ($person['last_name'] ?? '');
                                            $personTitle = $person['title'] ?? 'N/A';
                                            $personOwnership = $person['ownership_percentage'] ?? 'N/A';
                                            $this->line("  │   - {$personName} ({$personTitle}) - {$personOwnership}% ownership");
                                        }
                                        if (count($associatedPersons) > 3) {
                                            $this->line("  │   ... and " . (count($associatedPersons) - 3) . " more");
                                        }
                                    } else {
                                        $this->line("  │ Associated Persons: None");
                                    }
                                }
                                
                                // Timestamps
                                $this->line("  │ Created: " . ($customerDetails['created_at'] ?? 'N/A'));
                                $this->line("  │ Updated: " . ($customerDetails['updated_at'] ?? 'N/A'));
                                
                                $this->line("  └─────────────────────────────────────────────────────────────────────");
                                
                                // Log full customer details
                                Log::info('Bridge Test - Full Customer Details', [
                                    'customer_id' => $customerId,
                                    'customer_type' => $customerDetails['type'] ?? 'N/A',
                                    'email' => $customerDetails['email'] ?? 'N/A',
                                    'status' => $customerDetails['status'] ?? 'N/A',
                                    'kyc_status' => $customerDetails['kyc_status'] ?? 'N/A',
                                    'kyb_status' => $customerDetails['kyb_status'] ?? null,
                                    'tos_accepted' => $customerDetails['has_accepted_terms_of_service'] ?? false,
                                    'endorsements_count' => count($endorsements),
                                    'requirements_due_count' => count($requirementsDue),
                                    'associated_persons_count' => count($associatedPersons ?? []),
                                    'full_customer_data' => $customerDetails,
                                ]);
                            } else {
                                $this->warn("  ⚠️  Failed to fetch details for customer {$customerId}: " . ($customerDetailsResult['error'] ?? 'Unknown error'));
                            }
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



