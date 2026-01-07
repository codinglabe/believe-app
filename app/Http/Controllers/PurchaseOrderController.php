<?php

namespace App\Http\Controllers;

use Stripe\Stripe;
use App\Models\Order;
use App\Models\Product;
use App\Models\Service;
use Illuminate\Support\Str;
use App\Models\OrderProduct;
use Illuminate\Http\Request;
use App\Models\OrderShippingInfo;
use Illuminate\Support\Facades\Auth;
use App\Services\StripeConfigService;
use Stripe\Checkout\Session as StripeSession;

class PurchaseOrderController extends Controller
{
    public function purchaseOrder(Request $request)
    {
        $validated = $request->validate([
            'first_name' => 'required|string',
            'last_name' => 'required|string',
            'email' => 'required|email',
            'shipping_address' => 'required|string',
            'city' => 'required|string',
            'zip' => 'required|string',
            'phone' => 'required|string',
            'products' => 'required|array',
            'products.*.id' => 'required|integer',
            'products.*.quantity' => 'required|integer|min:1',
        ]);

        try {
            // Build Stripe line items
            $lineItems = [];
            foreach ($validated['products'] as $item) {
                $product = Product::findOrFail($item['id']);
                $lineItems[] = [
                    'price_data' => [
                        'currency' => 'usd',
                        'product_data' => [
                            'name' => $product->name,
                        ],
                        'unit_amount' => (int)($product->unit_price * 100),
                    ],
                    'quantity' => $item['quantity'],
                ];
            }

            // Get Stripe credentials from database, fallback to env
            $environment = StripeConfigService::getEnvironment();
            $credentials = StripeConfigService::getCredentials($environment);

            if ($credentials && !empty($credentials['secret_key'])) {
                Stripe::setApiKey($credentials['secret_key']);
            } else {
                // Fallback to env if database credentials not found
                Stripe::setApiKey(config('services.stripe.secret'));
            }

            $session = StripeSession::create([
                'payment_method_types' => ['card'],
                'line_items' => $lineItems,
                'mode' => 'payment',
                'customer_email' => $validated['email'],
                'success_url' => route('purchase.success') . '?session_id={CHECKOUT_SESSION_ID}',
                'cancel_url' => route('purchase.cancel'),
                'metadata' => [
                    'user_id' => Auth::id(),
                    'first_name' => $validated['first_name'],
                    'last_name' => $validated['last_name'],
                    'shipping_address' => $validated['shipping_address'],
                    'city' => $validated['city'],
                    'zip' => $validated['zip'],
                    'phone' => $validated['phone'],
                ],
            ]);


            return response()->json(['url' => $session->url]);
        } catch (\Exception $e) {
            // You can customize this error handling as needed
            return back()->withErrors(['stripe' => 'Payment processing failed: ' . $e->getMessage()]);
        }
    }


    public function purchaseSuccess(Request $request)
    {
        try {
            $session_id = $request->get('session_id');
            if (!$session_id) {
                return back()->withErrors(['stripe' => 'Missing Stripe session ID.']);
            }

            // Get Stripe credentials from database, fallback to env
            $environment = StripeConfigService::getEnvironment();
            $credentials = StripeConfigService::getCredentials($environment);

            if ($credentials && !empty($credentials['secret_key'])) {
                Stripe::setApiKey($credentials['secret_key']);
            } else {
                // Fallback to env if database credentials not found
                Stripe::setApiKey(config('services.stripe.secret'));
            }

            // Get session from Stripe
            $session = StripeSession::retrieve($session_id);



            do {
                $referenceNumber = 'ORD-' . strtoupper(Str::random(10));
            } while (Order::where('reference_number', $referenceNumber)->exists());

            // Retrieve metadata from Stripe
            $metadata = $session->metadata;
            $userId = $metadata->user_id ?? null;

            // Assume line_items were sent using 'unit_amount' and stored product names
            $lineItems = \Stripe\Checkout\Session::allLineItems($session->id);

            // Calculate total
            $totalAmount = 0;
            $fee = 0; // Can be Stripe fee if you want to handle

            // Create Order
            $order = Order::create([
                'user_id' => $userId,
                'reference_number' => $referenceNumber,
                'total_amount' => ($session->amount_total / 100),
                'fee' => $fee,
                'status' => 'paid',
            ]);

            // Create Shipping Info
            OrderShippingInfo::create([
                'order_id' => $order->id,
                'first_name' => $metadata->first_name ?? '',
                'last_name' => $metadata->last_name ?? '',
                'email' => $session->customer_email ?? '',
                'shipping_address' => $metadata->shipping_address ?? '',
                'city' => $metadata->city ?? '',
                'zip' => $metadata->zip ?? '',
                'phone' => $metadata->phone ?? '',
            ]);

            // Loop through each item and store as OrderProduct
            foreach ($lineItems->data as $item) {
                // You may need to fetch product by name or keep a custom product_id in metadata
                $product = Product::where('name', $item->description)->first();

                if ($product) {
                    OrderProduct::create([
                        'order_id' => $order->id,
                        'product_id' => $product->id,
                        'quantity' => $item->quantity,
                        'unit_price' => $item->amount_subtotal / 100 / $item->quantity, // accurate price
                    ]);
                }
            }

            // Record service usage
            Service::create([
                'amount' => $order->total_amount,
                'charges' => $fee,
                'currency' => $session->currency ?? 'usd',
                'serviceable_type' => Order::class,
                'serviceable_id' => $order->id,
                'payment_gateway' => 'stripe',
                'api_response' => json_encode($session),
            ]);



            return redirect()->route('order.success', ['order' => $order->id])->with('success', 'Order placed successfully!');
        } catch (\Exception $e) {
            return back()->withErrors(['stripe' => 'Error on success page: ' . $e->getMessage()]);
        }
    }

    public function orderSuccess(Request $request)
    {
        try {
            return view('order.success');
        } catch (\Exception $e) {
            return back()->withErrors(['stripe' => 'Error on cancel page: ' . $e->getMessage()]);
        }
    }

    public function purchaseCancel(Request $request)
    {
        try {
            return view('order.cancel');
        } catch (\Exception $e) {
            return back()->withErrors(['stripe' => 'Error on cancel page: ' . $e->getMessage()]);
        }
    }
}
