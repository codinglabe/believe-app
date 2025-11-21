<?php

namespace App\Http\Controllers;

use App\Services\PrintifyService;
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
        $webhooks = $webhooksResult['success'] ? ($webhooksResult['data'] ?? []) : [];

        return Inertia::render('settings/webhook-manage', [
            'webhooks' => $webhooks,
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
    public function deleteWebhook(string $webhookId): JsonResponse
    {
        $webhookHost = config('app.host');
        $result = $this->printifyService->deleteWebhook($webhookId, $webhookHost);

        if ($result['success']) {
            Log::info('Printify webhook deleted', ['webhook_id' => $webhookId]);

            return response()->json([
                'success' => true,
                'message' => 'Webhook deleted successfully'
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Failed to delete webhook: ' . ($result['error'] ?? 'Unknown error')
        ], 400);
    }
}
