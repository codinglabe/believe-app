import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import FrontendLayout from "@/layouts/frontend/frontend-layout";
import axios from 'axios';
import { showSuccessToast, showErrorToast } from '@/lib/toast';

interface CartItem {
  id: number;
  product_id: number;
  quantity: number;
  unit_price: number | string;
  product: {
    id: number;
    name: string;
    description: string;
    price: number;
    image_url: string;
    quantity_available: number;
  };
}

interface CartProps {
  cart: {
    id: number;
    items: CartItem[];
  };
  total: number;
  itemCount: number;
}

// Helper function to safely convert to number
const toNumber = (value: number | string): number => {
  if (typeof value === 'number') return value;
  return parseFloat(value) || 0;
};

export default function CartIndex({ cart: initialCart, total: initialTotal, itemCount: initialItemCount }: CartProps) {
  const [cart, setCart] = useState(initialCart);
  const [loadingItem, setLoadingItem] = useState<number | null>(null);

  const calculateItemTotal = (item: CartItem): number => {
    return toNumber(item.unit_price) * item.quantity;
  };

  const calculateCartTotal = (): number => {
    if (!cart?.items) return 0;
    return cart.items.reduce((total, item) => total + calculateItemTotal(item), 0);
  };

  const getCartItemCount = (): number => {
    if (!cart?.items) return 0;
    return cart.items.reduce((total, item) => total + item.quantity, 0);
  };

  const handleQuantityChange = async (cartItem: CartItem, newQuantity: number) => {
    if (newQuantity > 0) {
      setLoadingItem(cartItem.id);
      try {
        const response = await axios.put(route('cart.update', cartItem.id), {
          quantity: newQuantity
        });

        setCart(response.data.cart);
        // showSuccessToast('Cart updated');
      } catch (error: any) {
        if (error.response?.data?.error) {
          showErrorToast(error.response.data.error);
        } else {
          showErrorToast('Failed to update cart');
        }
      } finally {
        setLoadingItem(null);
      }
    }
  };

  const handleRemoveItem = async (cartItem: CartItem) => {
    setLoadingItem(cartItem.id);
    try {
      const response = await axios.delete(route('cart.destroy', cartItem.id));
      setCart(response.data.cart);
      showSuccessToast('Item removed from cart');
    } catch (error: any) {
      showErrorToast('Failed to remove item');
    } finally {
      setLoadingItem(null);
    }
  };

  const handleClearCart = async () => {
    if (confirm('Are you sure you want to clear your entire cart?')) {
      try {
        const response = await axios.post(route('cart.clear'));
        setCart(response.data.cart);
        showSuccessToast('Cart cleared');
      } catch (error: any) {
        showErrorToast('Failed to clear cart');
      }
    }
  };

  return (
    <FrontendLayout>
      <Head title="Shopping Cart" />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Shopping Cart
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Review your items and proceed to checkout
            </p>
          </div>

          {!cart || cart.items.length === 0 ? (
            // Empty Cart State
            <div className="text-center py-16">
              <div className="mx-auto h-24 w-24 text-gray-400 dark:text-gray-500 mb-4">
                <svg
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  className="w-full h-full"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Your cart is empty
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                Looks like you haven't added any items to your cart yet. Start shopping to find amazing products!
              </p>
              <Link
                href={route('marketplace.index')}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900 transition-colors duration-200"
              >
                Continue Shopping
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Cart Items Section */}
              <div className="lg:col-span-2">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors duration-200">
                  {/* Cart Header */}
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Cart Items ({cart.items.length})
                      </h2>
                      <button
                        onClick={handleClearCart}
                        className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors duration-200 font-medium"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  {/* Cart Items List */}
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {cart.items.map((item) => (
                      <div key={item.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors duration-200">
                        <div className="flex gap-4">
                          {/* Product Image */}
                          <div className="flex-shrink-0">
                            <img
                              src={item.product.image_url || "/placeholder.svg"}
                              alt={item.product.name}
                              className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                            />
                          </div>

                          {/* Product Details */}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">
                              {item.product.name}
                            </h3>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                              {item.product.description}
                            </p>
                            <p className="mt-2 text-lg font-bold text-blue-600 dark:text-blue-400">
                              ${toNumber(item.unit_price).toFixed(2)}
                            </p>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                              {item.product.quantity_available} in stock
                            </p>
                          </div>

                          {/* Quantity Controls & Actions */}
                          <div className="flex flex-col items-end justify-between">
                            {/* Quantity Controls */}
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => handleQuantityChange(item, item.quantity - 1)}
                                disabled={loadingItem === item.id || item.quantity <= 1}
                                className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                              >
                                <span className="sr-only">Decrease quantity</span>
                                −
                              </button>

                              <span className="w-12 text-center text-lg font-medium text-gray-900 dark:text-white">
                                {item.quantity}
                              </span>

                              <button
                                onClick={() => handleQuantityChange(item, item.quantity + 1)}
                                disabled={loadingItem === item.id || item.quantity >= item.product.quantity_available}
                                className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                              >
                                <span className="sr-only">Increase quantity</span>
                                +
                              </button>
                            </div>

                            {/* Item Total & Remove */}
                            <div className="text-right">
                              <p className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                ${calculateItemTotal(item).toFixed(2)}
                              </p>
                              <button
                                onClick={() => handleRemoveItem(item)}
                                disabled={loadingItem === item.id}
                                className="inline-flex items-center text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 font-medium"
                              >
                                <svg
                                  className="w-4 h-4 mr-1"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Loading State */}
                        {loadingItem === item.id && (
                          <div className="mt-3 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                              Updating...
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Order Summary Section */}
              <div className="lg:col-span-1">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sticky top-8 transition-colors duration-200">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                    Order Summary
                  </h2>

                  {/* Price Breakdown */}
                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        ${calculateCartTotal().toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Shipping</span>
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        Free
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Tax</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Calculated at checkout
                      </span>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-gray-900 dark:text-white">Total</span>
                        <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          ${calculateCartTotal().toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Checkout Button */}
                  <Link
                    href={route('checkout.show')}
                    className="w-full flex justify-center items-center px-6 py-4 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900 transition-colors duration-200 shadow-sm mb-4"
                  >
                    Proceed to Checkout
                  </Link>

                  {/* Continue Shopping */}
                  <Link
                    href={route('marketplace.index')}
                    className="w-full flex justify-center items-center px-6 py-3 border border-gray-300 dark:border-gray-600 text-base font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900 transition-colors duration-200"
                  >
                    Continue Shopping
                  </Link>

                  {/* Additional Info */}
                  <div className="mt-6 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      🔒 Secure checkout • Free returns • 24/7 support
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </FrontendLayout>
  );
}
