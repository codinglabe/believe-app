<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Stripe\Stripe;
use Stripe\PaymentIntent;

class CheckoutController extends Controller
{
    public function __construct()
    {
        Stripe::setApiKey(config('services.stripe.secret'));
    }

    /**
     * Show checkout page
     */
    public function show(): Response
    {
        $cart = auth()->user()->cart()->with('items.product')->first();

        if (!$cart || $cart->items->isEmpty()) {
            return Inertia::render('Checkout/Empty');
        }

        return Inertia::render('Checkout/index', [
            'items' => $cart->items,
            'total' => $cart->getTotal(),
            'stripePublishableKey' => config('services.stripe.public'),
        ]);
    }

    /**
     * Create payment intent
     */
    public function createPaymentIntent(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'email' => 'required|email',
            'address' => 'required|string',
            'city' => 'required|string',
            'state' => 'required|string',
            'zip' => 'required|string',
            'country' => 'required|string',
        ]);

        $cart = auth()->user()->cart()->with('items.product')->first();

        if (!$cart || $cart->items->isEmpty()) {
            return response()->json(['error' => 'Cart is empty'], 400);
        }

        $amount = (int) ($cart->getTotal() * 100); // Convert to cents

        try {
            $paymentIntent = PaymentIntent::create([
                'amount' => $amount,
                'currency' => 'usd',
                'description' => 'Marketplace Order - ' . auth()->user()->email,
                'metadata' => [
                    'user_id' => auth()->id(),
                    'order_type' => 'marketplace',
                ],
            ]);

            // Create order record
            $order = Order::create([
                'user_id' => auth()->id(),
                'total_amount' => $cart->getTotal(),
                'tax_amount' => 0,
                'shipping_cost' => 0,
                'status' => 'pending',
                'payment_method' => 'stripe',
                'stripe_payment_intent_id' => $paymentIntent->id,
                'shipping_info' => $validated,
            ]);

            // Create order items from cart
            foreach ($cart->items as $cartItem) {
                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $cartItem->product_id,
                    'quantity' => $cartItem->quantity,
                    'unit_price' => $cartItem->unit_price,
                    'total_price' => $cartItem->unit_price * $cartItem->quantity,
                ]);
            }

            return response()->json([
                'clientSecret' => $paymentIntent->client_secret,
                'orderId' => $order->id,
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Confirm payment
     */
    public function confirmPayment(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'order_id' => 'required|exists:orders,id',
            'payment_intent_id' => 'required|string',
        ]);

        try {
            $paymentIntent = PaymentIntent::retrieve($validated['payment_intent_id']);

            if ($paymentIntent->status === 'succeeded') {
                $order = Order::findOrFail($validated['order_id']);
                $order->markAsPaid();

                // Clear user's cart
                auth()->user()->cart()->first()?->items()->delete();

                return response()->json([
                    'success' => true,
                    'orderId' => $order->id,
                    'redirect' => route('order.confirmation', $order->id),
                ]);
            }

            return response()->json(['error' => 'Payment not completed'], 400);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
