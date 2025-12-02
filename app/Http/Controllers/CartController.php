<?php

namespace App\Http\Controllers;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class CartController extends Controller
{
    /**
     * Get user's cart
     */
    public function index(Request $request)
    {
        try {
            $user = $request->user();
            $cart = $user->cart()->with('items.product')->first();

            if (!$cart) {
                $cart = $user->cart()->create();
            }

            return Inertia::render('Cart/Index', [
                'cart' => $cart,
                'cartData' => $this->getCartData($request, $cart)
            ]);

        } catch (\Exception $e) {
            Log::error('Cart index error', ['error' => $e->getMessage()]);
            return redirect()->route('marketplace.index')->with('error', 'Error loading cart');
        }
    }

    /**
     * API: Get cart data for React components
     */
    public function getCartDataApi(Request $request)
    {
        try {
            $user = $request->user();
            $cart = $user->cart()->with('items.product')->first();

            if (!$cart) {
                return response()->json([
                    'cartData' => [
                        'items' => [],
                        'subtotal' => 0,
                        'item_count' => 0
                    ]
                ]);
            }

            return response()->json([
                'cartData' => $this->getCartData($request, $cart)
            ]);

        } catch (\Exception $e) {
            Log::error('Get cart data API error', ['error' => $e->getMessage()]);
            return response()->json([
                'cartData' => [
                    'items' => [],
                    'subtotal' => 0,
                    'item_count' => 0
                ]
            ]);
        }
    }

    /**
     * Add item to cart with variant support
     */
    // public function add(Request $request)
    // {
    //     try {
    //         $user = $request->user();

    //         // Use firstOrCreate to ensure cart always exists
    //         $cart = $user->cart()->firstOrCreate();

    //         $validated = $request->validate([
    //             'product_id' => 'required|exists:products,id',
    //             'quantity' => 'required|integer|min:1',
    //             'printify_variant_id' => 'required|string',
    //             'printify_blueprint_id' => 'required|integer',
    //             'printify_print_provider_id' => 'required|integer',
    //             'variant_options' => 'required|array',
    //             'variant_price_modifier' => 'required|numeric',
    //             'variant_image' => 'nullable|string',
    //         ]);

    //         // Get product with available quantity
    //         $product = Product::findOrFail($validated['product_id']);

    //         // Check if product is available
    //         if (!$product->quantity_available || $product->quantity_available <= 0) {
    //             return response()->json([
    //                 'success' => false,
    //                 'message' => 'This product is currently unavailable'
    //             ], 422);
    //         }

    //         // Check if requested quantity exceeds available quantity
    //         if ($validated['quantity'] > $product->quantity_available) {
    //             return response()->json([
    //                 'success' => false,
    //                 'message' => "Only {$product->quantity_available} items available in stock"
    //             ], 422);
    //         }

    //         // Check if product with same variant already in cart
    //         $existingItem = $cart->items()
    //             ->where('product_id', $validated['product_id'])
    //             ->where('printify_variant_id', $validated['printify_variant_id'])
    //             ->first();

    //         if ($existingItem) {
    //             // Calculate total quantity after adding
    //             $newTotalQuantity = $existingItem->quantity + $validated['quantity'];

    //             // Check if total quantity exceeds available stock
    //             if ($newTotalQuantity > $product->quantity_available) {
    //                 $remaining = $product->quantity_available - $existingItem->quantity;
    //                 $message = $remaining > 0
    //                     ? "You already have {$existingItem->quantity} in cart. You can add only {$remaining} more."
    //                     : "You already have maximum quantity in cart";

    //                 return response()->json([
    //                     'success' => false,
    //                     'message' => $message
    //                 ], 422);
    //             }

    //             // Update quantity if same variant exists
    //             $existingItem->update([
    //                 'quantity' => $newTotalQuantity
    //             ]);
    //         } else {
    //             // Check if variant is available
    //             if (isset($product->variants)) {
    //                 $variantData = json_decode($product->variants, true);
    //                 $selectedVariant = collect($variantData)->firstWhere('id', $validated['printify_variant_id']);

    //                 if ($selectedVariant && isset($selectedVariant['is_available']) && !$selectedVariant['is_available']) {
    //                     return response()->json([
    //                         'success' => false,
    //                         'message' => 'Selected variant is out of stock'
    //                     ], 422);
    //                 }
    //             }

    //             // Create new cart item with variant details
    //             $basePrice = $product->unit_price;
    //             $totalPrice = $basePrice + $validated['variant_price_modifier'];

    //             $variantOptions = json_encode($validated['variant_options']);

    //             $cart->items()->create([
    //                 'product_id' => $validated['product_id'],
    //                 'quantity' => $validated['quantity'],
    //                 'unit_price' => $totalPrice,
    //                 'printify_variant_id' => $validated['printify_variant_id'],
    //                 'printify_blueprint_id' => $validated['printify_blueprint_id'],
    //                 'printify_print_provider_id' => $validated['printify_print_provider_id'],
    //                 'variant_options' => $variantOptions,
    //                 'variant_price_modifier' => $validated['variant_price_modifier'],
    //                 'variant_image' => $validated['variant_image'] ?? null,
    //             ]);
    //         }

    //         return response()->json([
    //             'success' => true,
    //             'message' => 'Product added to cart',
    //             'cartData' => $this->getCartData($request, $cart)
    //         ]);

    //     } catch (\Exception $e) {
    //         Log::error('Add to cart error', ['error' => $e->getMessage()]);
    //         return response()->json([
    //             'success' => false,
    //             'message' => 'Failed to add product to cart: ' . $e->getMessage()
    //         ], 422);
    //     }
    // }


    /**
     * Add item to cart with variant support
     */
    public function add(Request $request)
    {
        try {
            $user = $request->user();

            // Use firstOrCreate to ensure cart always exists
            $cart = $user->cart()->firstOrCreate();

            $validated = $request->validate([
                'product_id' => 'required|exists:products,id',
                'quantity' => 'required|integer|min:1',
                'printify_variant_id' => 'required|string',
                'printify_blueprint_id' => 'required|integer',
                'printify_print_provider_id' => 'required|integer',
                'variant_options' => 'required|array',
                'variant_price_modifier' => 'required|numeric',
                'variant_image' => 'nullable|string',
            ]);

            // Get product with available quantity
            $product = Product::with('organization')->findOrFail($validated['product_id']);
            $newProductOrganizationId = $product->organization_id;

            // Check if product is available
            if (!$product->quantity_available || $product->quantity_available <= 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'This product is currently unavailable'
                ], 422);
            }

            // Check if requested quantity exceeds available quantity
            if ($validated['quantity'] > $product->quantity_available) {
                return response()->json([
                    'success' => false,
                    'message' => "Only {$product->quantity_available} items available in stock"
                ], 422);
            }

            // Get current cart items
            $currentCartItems = $cart->items()->with('product')->get();

            // If cart is empty, just add the new product
            if ($currentCartItems->isEmpty()) {
                // Add new product to cart
                $this->createCartItem($cart, $validated, $product);

                return response()->json([
                    'success' => true,
                    'message' => 'Product added to cart',
                    'cartData' => $this->getCartData($request, $cart)
                ]);
            }

            // Check organization of existing items
            $existingOrganizationIds = $currentCartItems->pluck('product.organization_id')->unique();

            // If cart already has items from this organization, just add/update
            if ($existingOrganizationIds->contains($newProductOrganizationId)) {
                // Check if product with same variant already in cart
                $existingItem = $cart->items()
                    ->where('product_id', $validated['product_id'])
                    ->where('printify_variant_id', $validated['printify_variant_id'])
                    ->first();

                if ($existingItem) {
                    // Calculate total quantity after adding
                    $newTotalQuantity = $existingItem->quantity + $validated['quantity'];

                    // Check if total quantity exceeds available stock
                    if ($newTotalQuantity > $product->quantity_available) {
                        $remaining = $product->quantity_available - $existingItem->quantity;
                        $message = $remaining > 0
                            ? "You already have {$existingItem->quantity} in cart. You can add only {$remaining} more."
                            : "You already have maximum quantity in cart";

                        return response()->json([
                            'success' => false,
                            'message' => $message
                        ], 422);
                    }

                    // Update quantity if same variant exists
                    $existingItem->update([
                        'quantity' => $newTotalQuantity
                    ]);
                } else {
                    // Check variant availability and add new item
                    if (!$this->isVariantAvailable($product, $validated['printify_variant_id'])) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Selected variant is out of stock'
                        ], 422);
                    }

                    $this->createCartItem($cart, $validated, $product);
                }

                return response()->json([
                    'success' => true,
                    'message' => 'Product added to cart',
                    'cartData' => $this->getCartData($request, $cart)
                ]);
            }

            // If cart has items from DIFFERENT organization, ask user for confirmation
            // (This should be handled in the frontend)
            // For now, we'll clear the cart and add the new product
            $cart->items()->delete();

            // Add new product to cart
            $this->createCartItem($cart, $validated, $product);

            return response()->json([
                'success' => true,
                'message' => 'Cart cleared and new product added from different organization',
                'cartData' => $this->getCartData($request, $cart),
                'cart_cleared' => true, // Flag for frontend
                'previous_organization' => $existingOrganizationIds->first(),
                'new_organization' => $newProductOrganizationId
            ]);

        } catch (\Exception $e) {
            Log::error('Add to cart error', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to add product to cart: ' . $e->getMessage()
            ], 422);
        }
    }


    /**
     * Helper method to create cart item
     */
    private function createCartItem($cart, $validated, $product)
    {
        $basePrice = $product->unit_price;
        $totalPrice = $basePrice + $validated['variant_price_modifier'];

        $variantOptions = json_encode($validated['variant_options']);

        $cart->items()->create([
            'product_id' => $validated['product_id'],
            'quantity' => $validated['quantity'],
            'unit_price' => $totalPrice,
            'printify_variant_id' => $validated['printify_variant_id'],
            'printify_blueprint_id' => $validated['printify_blueprint_id'],
            'printify_print_provider_id' => $validated['printify_print_provider_id'],
            'variant_options' => $variantOptions,
            'variant_price_modifier' => $validated['variant_price_modifier'],
            'variant_image' => $validated['variant_image'] ?? null,
        ]);
    }

    /**
     * Helper method to check variant availability
     */
    private function isVariantAvailable($product, $variantId)
    {
        if (isset($product->variants)) {
            $variantData = json_decode($product->variants, true);
            $selectedVariant = collect($variantData)->firstWhere('id', $variantId);

            if ($selectedVariant && isset($selectedVariant['is_available']) && !$selectedVariant['is_available']) {
                return false;
            }
        }
        return true;
    }

    /**
     * Get detailed cart data with variant info
     */
    public function getCartData(Request $request, Cart $cart = null)
    {
        if (!$cart) {
            $user = $request->user();
            $cart = $user->cart()->with('items.product')->first();
        }

        if (!$cart) {
            return [
                'items' => [],
                'subtotal' => 0,
                'item_count' => 0
            ];
        }

        $items = $cart->items->map(function ($item) {
            return [
                'id' => $item->id,
                'product_id' => $item->product_id,
                'product_name' => $item->product->name,
                'product_image' => $item->product->image,
                'quantity' => $item->quantity,
                'unit_price' => $item->unit_price,
                'subtotal' => $item->unit_price * $item->quantity,
                'variant_options' => $item->variant_options ? json_decode($item->variant_options, true) : [],
                'printify_variant_id' => $item->printify_variant_id,
                'variant_price_modifier' => $item->variant_price_modifier,
            ];
        });

        $subtotal = $items->sum('subtotal');

        return [
            'items' => $items,
            'subtotal' => $subtotal,
            'item_count' => $cart->items->sum('quantity')
        ];
    }

    /**
     * Update cart item quantity
     */
    public function update(Request $request, CartItem $cartItem): JsonResponse
    {
        $validated = $request->validate([
            'quantity' => 'required|integer|min:1|max:1000',
        ]);

        $this->authorize('update', $cartItem);

        if ($validated['quantity'] > $cartItem->product->quantity_available) {
            return response()->json([
                'error' => 'Only ' . $cartItem->product->quantity_available . ' items available in stock'
            ], 422);
        }

        $cartItem->update($validated);
        $cart = $cartItem->cart->load(['items.product', 'items.variant']);

        return response()->json([
            'message' => 'Cart item updated',
            'cart' => $cart,
            'total' => $cart->getTotal(),
            'itemCount' => $cart->getItemCount(),
        ]);
    }

    /**
     * Remove item from cart
     */
    public function destroy(CartItem $cartItem): JsonResponse
    {
        $this->authorize('delete', $cartItem);

        $cart = $cartItem->cart;
        $cartItem->delete();
        $cart->load(['items.product', 'items.variant']);

        return response()->json([
            'message' => 'Item removed from cart',
            'cart' => $cart,
            'total' => $cart->getTotal(),
            'itemCount' => $cart->getItemCount(),
        ]);
    }

    /**
     * Clear entire cart
     */
    public function clear(): JsonResponse
    {
        $cart = auth()->user()->cart;

        if ($cart) {
            $cart->items()->delete();
            $cart->load(['items.product', 'items.variant']);
        }

        return response()->json([
            'message' => 'Cart cleared',
            'cart' => $cart,
            'total' => $cart->getTotal(),
            'itemCount' => $cart->getItemCount(),
        ]);
    }
}
