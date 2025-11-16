<?php
namespace App\Http\Controllers;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CartController extends Controller
{
    /**
     * Get user's cart
     */
    public function index(): Response
    {
        $cart = auth()->user()->cart()->with('items.product.organization')->first();

        if (!$cart) {
            $cart = Cart::create(['user_id' => auth()->id()]);
        }

        return Inertia::render('Cart/Index', [
            'cart' => $cart->load('items.product'),
            'total' => $cart->getTotal(),
            'itemCount' => $cart->getItemCount(),
        ]);
    }


    public function getCartData(): JsonResponse
    {
        $cart = auth()->user()->cart()->with('items.product.organization')->first();

        if (!$cart) {
            $cart = Cart::create(['user_id' => auth()->id()]);
        }

        return response()->json([
            'cart' => $cart->load('items.product'),
            'total' => $cart->getTotal(),
            'itemCount' => $cart->getItemCount(),
        ]);
    }

    /**
     * Add item to cart
     */
    public function add(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
            'quantity' => 'required|integer|min:1|max:1000',
        ]);

        $product = Product::findOrFail($validated['product_id']);

        // Check if product is available
        if ($product->quantity_available <= 0) {
            return response()->json([
                'error' => 'Product is out of stock'
            ], 422);
        }

        $cart = auth()->user()->cart()->firstOrCreate(['user_id' => auth()->id()]);

        $cartItem = $cart->items()->where('product_id', $product->id)->first();

        if ($cartItem) {
            $newQuantity = $cartItem->quantity + $validated['quantity'];

            // Check stock availability
            if ($newQuantity > $product->quantity_available) {
                return response()->json([
                    'error' => 'Only ' . $product->quantity_available . ' items available in stock'
                ], 422);
            }

            $cartItem->update(['quantity' => $newQuantity]);
        } else {
            CartItem::create([
                'cart_id' => $cart->id,
                'product_id' => $product->id,
                'quantity' => $validated['quantity'],
                'unit_price' => $product->unit_price ?? $product->price,
            ]);
        }

        // Reload the cart with fresh data
        $cart->load('items.product');

        return response()->json([
            'message' => 'Product added to cart',
            'cart' => $cart,
            'total' => $cart->getTotal(),
            'itemCount' => $cart->getItemCount(),
        ]);
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

        // Check stock availability
        if ($validated['quantity'] > $cartItem->product->quantity_available) {
            return response()->json([
                'error' => 'Only ' . $cartItem->product->quantity_available . ' items available in stock'
            ], 422);
        }

        $cartItem->update($validated);

        // Reload the cart with fresh data
        $cart = $cartItem->cart->load('items.product');

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

        // Reload the cart with fresh data
        $cart->load('items.product');

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
            $cart->load('items.product');
        }

        return response()->json([
            'message' => 'Cart cleared',
            'cart' => $cart,
            'total' => $cart->getTotal(),
            'itemCount' => $cart->getItemCount(),
        ]);
    }
}
