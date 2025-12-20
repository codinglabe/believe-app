<?php

namespace App\Http\Controllers;

use App\Services\PrintifyService;
use App\Models\PhazeWebhook;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\Log;

class WebhookManagementController extends Controller
{
    protected $printifyService;

    public function __construct(PrintifyService $printifyService)
    {
        $this->printifyService = $printifyService;
    }

    /**
     * Display webhook management page
     */
    public function index(): Response
    {
        $webhooksResult = $this->printifyService->getWebhooks();
        $printifyWebhooks = $webhooksResult['success'] ? ($webhooksResult['data'] ?? []) : [];

        // Get Phaze webhooks from database
        $phazeWebhooks = PhazeWebhook::orderBy('created_at', 'desc')->get();

        return Inertia::render('settings/webhook-manage', [
            'printifyWebhooks' => $printifyWebhooks,
            'phazeWebhooks' => $phazeWebhooks,
        ]);
    }

    /**
     * Setup Printify webhooks
     */
    public function setupWebhooks(): JsonResponse
    {
        try {
            $webhookUrl = config('app.url') . 'webhooks/printify/orders';

            $events = [
                'order:created',
                'order:updated',
                'order:sent-to-production',
                'order:shipment:created',
                'order:shipment:delivered',
            ];

            $result = $this->printifyService->createWebhooks($webhookUrl, $events);

            if ($result['success']) {
                Log::info('All Printify webhooks setup successfully', [
                    'url' => $webhookUrl,
                    'events' => $events,
                    'success_count' => $result['success_count']
                ]);

                return response()->json([
                    'success' => true,
                    'message' => "All {$result['success_count']} webhooks setup successfully",
                    'data' => $result['results']
                ]);
            } else {
                Log::warning('Some Printify webhooks failed to setup', [
                    'url' => $webhookUrl,
                    'success_count' => $result['success_count'],
                    'error_count' => $result['error_count']
                ]);

                return response()->json([
                    'success' => false,
                    'message' => "{$result['success_count']} webhooks created, {$result['error_count']} failed",
                    'data' => $result['results']
                ], 400);
            }

        } catch (\Exception $e) {
            Log::error('Error setting up Printify webhooks: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to setup webhooks: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get current webhooks
     */
    public function getWebhooks(): JsonResponse
    {
        $result = $this->printifyService->getWebhooks();

        if ($result['success']) {
            return response()->json([
                'success' => true,
                'data' => $result['data']
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Failed to get webhooks: ' . ($result['error'] ?? 'Unknown error')
        ], 400);
    }

    /**
     * Delete webhook
     */
    public function deleteWebhook(string $webhookId, Request $request): JsonResponse
    {
        try {
            // First, get all webhooks to find the exact webhook and its stored host
            $webhooksResult = $this->printifyService->getWebhooks();

            if (!$webhooksResult['success'] || !isset($webhooksResult['data'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to fetch webhook details: ' . ($webhooksResult['error'] ?? 'Unknown error')
                ], 400);
            }

            // Find the specific webhook by ID
            $webhook = collect($webhooksResult['data'])->firstWhere('id', $webhookId);

            if (!$webhook) {
                return response()->json([
                    'success' => false,
                    'message' => 'Webhook not found'
                ], 404);
            }

            // Extract host from the webhook's stored URL (this is the host Printify has)
            $webhookUrl = $webhook['url'] ?? null;

            if (!$webhookUrl) {
                Log::error('Webhook URL not found in webhook data', [
                    'webhook_id' => $webhookId,
                    'webhook_data' => $webhook,
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Webhook URL not found in webhook data'
                ], 400);
            }

            // Parse the URL to extract host
            $parsedUrl = parse_url($webhookUrl);
            $webhookHost = $parsedUrl['host'] ?? null;

            // Include port if present (important for localhost)
            if (isset($parsedUrl['port'])) {
                $webhookHost .= ':' . $parsedUrl['port'];
            }

            if (!$webhookHost) {
                Log::error('Could not extract host from webhook URL', [
                    'webhook_id' => $webhookId,
                    'webhook_url' => $webhookUrl,
                    'parsed_url' => $parsedUrl,
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Could not extract host from webhook URL'
                ], 400);
            }

            Log::info('Attempting to delete Printify webhook', [
                'webhook_id' => $webhookId,
                'host' => $webhookHost,
                'webhook_url' => $webhookUrl,
            ]);

            $result = $this->printifyService->deleteWebhook($webhookId, $webhookHost);

            if ($result['success']) {
                Log::info('Printify webhook deleted successfully', [
                    'webhook_id' => $webhookId,
                    'host' => $webhookHost,
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Webhook deleted successfully'
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Failed to delete webhook: ' . ($result['error'] ?? 'Unknown error')
            ], 400);

        } catch (\Exception $e) {
            Log::error('Exception deleting Printify webhook: ' . $e->getMessage(), [
                'webhook_id' => $webhookId,
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error deleting webhook: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get Phaze webhooks
     */
    public function getPhazeWebhooks(): JsonResponse
    {
        try {
            $webhooks = PhazeWebhook::orderBy('created_at', 'desc')->get();

            return response()->json([
                'success' => true,
                'data' => $webhooks
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching Phaze webhooks: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch webhooks: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create Phaze webhook
     */
    public function createPhazeWebhook(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'url' => 'required|url',
            'api_key' => 'nullable|string|min:16',
            'authorization_header_name' => 'nullable|string|max:50',
        ]);

        try {
            $giftCardService = app(\App\Services\GiftCardService::class);
            $webhookController = new \App\Http\Controllers\Admin\PhazeWebhookManagementController($giftCardService);

            $response = $webhookController->store($request);

            return $response;

        } catch (\Exception $e) {
            Log::error('Error creating Phaze webhook: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to create webhook: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete Phaze webhook
     */
    public function deletePhazeWebhook($id): JsonResponse
    {
        try {
            $giftCardService = app(\App\Services\GiftCardService::class);
            $webhookController = new \App\Http\Controllers\Admin\PhazeWebhookManagementController($giftCardService);

            $response = $webhookController->destroy($id);

            return $response;

        } catch (\Exception $e) {
            Log::error('Error deleting Phaze webhook: ' . $e->getMessage(), [
                'webhook_id' => $id,
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to delete webhook: ' . $e->getMessage()
            ], 500);
        }
    }
}
