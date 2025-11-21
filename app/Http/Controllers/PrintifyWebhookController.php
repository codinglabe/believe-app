<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class PrintifyWebhookController extends Controller
{
    /**
     * Handle Printify order webhooks
     */
    public function handleOrderWebhook(Request $request): JsonResponse
    {
        // Verify webhook signature
        if (!$this->verifySignature($request)) {
            Log::warning('Invalid webhook signature', [
                'ip' => $request->ip(),
                'headers' => $request->headers->all()
            ]);
            return response()->json(['error' => 'Invalid signature'], 401);
        }

        $payload = $request->all();

        Log::info('Printify Webhook Received', [
            'type' => $payload['type'] ?? 'unknown',
            'printify_order_id' => $payload['data']['id'] ?? 'unknown'
        ]);

        try {
            $eventType = $payload['type'] ?? null;
            $orderData = $payload['data'] ?? [];

            switch ($eventType) {
                case 'order:created':
                    $this->handleOrderCreated($orderData);
                    break;

                case 'order:updated':
                    $this->handleOrderUpdated($orderData);
                    break;

                case 'order:sent-to-production':
                    $this->handleOrderSentToProduction($orderData);
                    break;

                case 'order:shipment:created':
                    $this->handleOrderShipmentCreated($orderData);
                    break;

                case 'order:shipment:delivered':
                    $this->handleOrderShipmentDelivered($orderData);
                    break;

                case 'order:cancelled':
                    $this->handleOrderCancelled($orderData);
                    break;

                default:
                    Log::warning('Unhandled Printify webhook event', ['type' => $eventType]);
            }

            return response()->json(['success' => true]);

        } catch (\Exception $e) {
            Log::error('Printify webhook processing error', [
                'error' => $e->getMessage(),
                'payload' => $payload
            ]);

            return response()->json(['error' => 'Webhook processing failed'], 500);
        }
    }

    /**
     * Verify webhook signature
     */
    private function verifySignature(Request $request): bool
    {
        $signature = $request->header('Printify-Signature');
        $payload = $request->getContent();
        $secret = config('printify.webhook_secret');

        if (!$signature || !$secret) {
            Log::warning('Missing signature or secret');
            return false;
        }

        $expectedSignature = hash_hmac('sha256', $payload, $secret);

        return hash_equals($signature, $expectedSignature);
    }

    /**
     * Handle order:created event - The order was created
     */
    private function handleOrderCreated(array $orderData): void
    {
        $printifyOrderId = $orderData['id'] ?? null;

        if (!$printifyOrderId) {
            Log::warning('Order created webhook missing ID');
            return;
        }

        $order = Order::where('printify_order_id', $printifyOrderId)->first();

        if ($order) {
            $order->update([
                'printify_response' => json_encode($orderData),
                'status' => 'processing',
            ]);

            Log::info('Order created in Printify via webhook', [
                'order_id' => $order->id,
                'printify_order_id' => $printifyOrderId,
                'status' => $orderData['status'] ?? 'created'
            ]);
        } else {
            Log::warning('Order not found for Printify created webhook', [
                'printify_order_id' => $printifyOrderId
            ]);
        }
    }

    /**
     * Handle order:updated event - The order's status was updated
     */
    private function handleOrderUpdated(array $orderData): void
    {
        $printifyOrderId = $orderData['id'] ?? null;
        $status = $orderData['status'] ?? null;

        if (!$printifyOrderId || !$status) {
            Log::warning('Order updated webhook missing ID or status');
            return;
        }

        $order = Order::where('printify_order_id', $printifyOrderId)->first();

        if (!$order) {
            Log::warning('Order not found for Printify update webhook', [
                'printify_order_id' => $printifyOrderId
            ]);
            return;
        }

        $updates = [
            'printify_status' => $status,
            'printify_response' => json_encode($orderData),
            'updated_at' => now(),
        ];

        // Map Printify status to local status
        $statusMapping = [
            'on-hold' => 'processing',
            'confirmed' => 'processing',
            'in-production' => 'processing',
            'shipped' => 'shipped',
            'fulfilled' => 'completed',
            'canceled' => 'cancelled',
            'failed' => 'failed',
        ];

        if (isset($statusMapping[$status])) {
            $updates['status'] = $statusMapping[$status];
        }

        $order->update($updates);

        Log::info('Order status updated via Printify webhook', [
            'order_id' => $order->id,
            'printify_order_id' => $printifyOrderId,
            'printify_status' => $status,
            'local_status' => $updates['status'] ?? $order->status,
        ]);
    }

    /**
     * Handle order:sent-to-production event - The order was sent to production
     */
    private function handleOrderSentToProduction(array $orderData): void
    {
        $printifyOrderId = $orderData['id'] ?? null;

        if (!$printifyOrderId) {
            Log::warning('Order sent to production webhook missing ID');
            return;
        }

        $order = Order::where('printify_order_id', $printifyOrderId)->first();

        if ($order) {
            $order->update([
                'printify_status' => 'production',
                'status' => 'processing',
                'printify_response' => json_encode($orderData),
                'sent_to_production_at' => now(),
            ]);

            Log::info('Order sent to production via Printify webhook', [
                'order_id' => $order->id,
                'printify_order_id' => $printifyOrderId
            ]);
        } else {
            Log::warning('Order not found for Printify sent to production webhook', [
                'printify_order_id' => $printifyOrderId
            ]);
        }
    }

    /**
     * Handle order:shipment:created event - Some/all items have been fulfilled
     */
    private function handleOrderShipmentCreated(array $shipmentData): void
    {
        $printifyOrderId = $shipmentData['order_id'] ?? null;

        if (!$printifyOrderId) {
            Log::warning('Shipment created webhook missing order ID');
            return;
        }

        $order = Order::where('printify_order_id', $printifyOrderId)->first();

        if ($order) {
            $updates = [
                'printify_status' => 'shipped',
                'status' => 'shipped',
                'tracking_number' => $shipmentData['tracking_number'] ?? null,
                'tracking_url' => $shipmentData['tracking_url'] ?? null,
                'shipped_at' => $shipmentData['shipped_at'] ?? now(),
                'printify_response' => json_encode($shipmentData),
            ];

            // If this is a partial shipment, don't mark as fully shipped
            if (isset($shipmentData['fulfilled_items']) && is_array($shipmentData['fulfilled_items'])) {
                $fulfilledCount = count($shipmentData['fulfilled_items']);
                $updates['fulfilled_items_count'] = $fulfilledCount;

                // You might want to track partial fulfillment differently
                if ($fulfilledCount < $order->items()->count()) {
                    $updates['status'] = 'partially_shipped';
                    $updates['printify_status'] = 'partially_fulfilled';
                }
            }

            $order->update($updates);

            Log::info('Shipment created via Printify webhook', [
                'order_id' => $order->id,
                'printify_order_id' => $printifyOrderId,
                'tracking_number' => $shipmentData['tracking_number'] ?? null,
                'fulfilled_items_count' => $updates['fulfilled_items_count'] ?? null
            ]);
        } else {
            Log::warning('Order not found for Printify shipment created webhook', [
                'printify_order_id' => $printifyOrderId
            ]);
        }
    }

    /**
     * Handle order:shipment:delivered event - Some/all items have been delivered
     */
    private function handleOrderShipmentDelivered(array $deliveryData): void
    {
        $printifyOrderId = $deliveryData['order_id'] ?? null;

        if (!$printifyOrderId) {
            Log::warning('Shipment delivered webhook missing order ID');
            return;
        }

        $order = Order::where('printify_order_id', $printifyOrderId)->first();

        if ($order) {
            $updates = [
                'printify_status' => 'delivered',
                'printify_response' => json_encode($deliveryData),
                'delivered_at' => $deliveryData['delivered_at'] ?? now(),
            ];

            // Check if all items are delivered
            $totalItems = $order->items()->count();
            $deliveredItems = $deliveryData['delivered_items'] ?? [];

            if (count($deliveredItems) >= $totalItems) {
                $updates['status'] = 'completed';
            } else {
                $updates['status'] = 'partially_delivered';
                $updates['delivered_items_count'] = count($deliveredItems);
            }

            $order->update($updates);

            Log::info('Shipment delivered via Printify webhook', [
                'order_id' => $order->id,
                'printify_order_id' => $printifyOrderId,
                'delivered_items_count' => count($deliveredItems),
                'total_items' => $totalItems,
                'status' => $updates['status']
            ]);
        } else {
            Log::warning('Order not found for Printify shipment delivered webhook', [
                'printify_order_id' => $printifyOrderId
            ]);
        }
    }

    /**
     * Handle order:cancelled event
     */
    private function handleOrderCancelled(array $orderData): void
    {
        $printifyOrderId = $orderData['id'] ?? null;

        Log::warning('Order created webhook received', [
            'printify_order_id' => $printifyOrderId
        ]);

        $order = Order::where('printify_order_id', $printifyOrderId)->first();

        if ($order) {
            $order->update([
                'printify_status' => 'canceled',
                'status' => 'cancelled',
                'printify_response' => json_encode($orderData),
                'cancelled_at' => now(),
            ]);

            Log::info('Order cancelled via Printify webhook', [
                'order_id' => $order->id,
                'printify_order_id' => $printifyOrderId
            ]);
        }
    }
}
