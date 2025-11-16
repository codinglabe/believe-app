<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderTracking;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class WebhookController extends Controller
{
    /**
     * Handle Printify webhooks
     */
    public function printify(Request $request)
    {
        $secret = config('printify.webhook_secret');
        $signature = $request->header('X-Printify-Signature');

        // Verify webhook signature
        $payload = $request->getContent();
        $hash = hash_hmac('sha256', $payload, $secret);

        if ($hash !== $signature) {
            Log::warning('Invalid Printify webhook signature');
            return response()->json(['error' => 'Invalid signature'], 401);
        }

        $event = $request->input('event');
        $data = $request->input('data');

        switch ($event) {
            case 'order.shipped':
                $this->handleOrderShipped($data);
                break;
            case 'order.delivered':
                $this->handleOrderDelivered($data);
                break;
            case 'order.failed':
                $this->handleOrderFailed($data);
                break;
        }

        return response()->json(['success' => true]);
    }

    /**
     * Handle order shipped event
     */
    private function handleOrderShipped($data)
    {
        $order = Order::where('printify_order_id', $data['id'])->first();
        if (!$order)
            return;

        $order->update([
            'printify_status' => 'shipped',
            'tracking_number' => $data['tracking_number'] ?? null,
            'tracking_url' => $data['tracking_url'] ?? null,
            'status' => 'shipped',
        ]);

        OrderTracking::create([
            'order_id' => $order->id,
            'status' => 'shipped',
            'carrier' => $data['shipping_carrier'] ?? null,
            'tracking_number' => $data['tracking_number'] ?? null,
            'tracking_url' => $data['tracking_url'] ?? null,
            'description' => 'Order has been shipped',
            'event_date' => now(),
            'printify_event_data' => $data,
        ]);

        Log::info("Order #{$order->id} shipped");
    }

    /**
     * Handle order delivered event
     */
    private function handleOrderDelivered($data)
    {
        $order = Order::where('printify_order_id', $data['id'])->first();
        if (!$order)
            return;

        $order->update([
            'printify_status' => 'delivered',
            'status' => 'delivered',
        ]);

        OrderTracking::create([
            'order_id' => $order->id,
            'status' => 'delivered',
            'description' => 'Order has been delivered',
            'event_date' => now(),
            'printify_event_data' => $data,
        ]);

        Log::info("Order #{$order->id} delivered");
    }

    /**
     * Handle order failed event
     */
    private function handleOrderFailed($data)
    {
        $order = Order::where('printify_order_id', $data['id'])->first();
        if (!$order)
            return;

        $order->update([
            'printify_status' => 'failed',
            'status' => 'cancelled',
        ]);

        OrderTracking::create([
            'order_id' => $order->id,
            'status' => 'failed',
            'description' => $data['error_message'] ?? 'Order processing failed',
            'event_date' => now(),
            'printify_event_data' => $data,
        ]);

        Log::warning("Order #{$order->id} failed: {$data['error_message']}");
    }
}
