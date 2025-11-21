import { Head, Link, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import FrontendLayout from "@/layouts/frontend/frontend-layout";
import axios from 'axios';
import { showSuccessToast, showErrorToast } from '@/lib/toast';

interface CartItem {
  id: number;
  quantity: number;
  unit_price: number | string;
  product: {
    name: string;
    image_url: string;
  };
  variant_data: {
    printify_variant_id: string;
    printify_blueprint_id: number;
    printify_print_provider_id: number;
    variant_options: Record<string, any>;
  };
}

interface ShippingMethod {
  id: string;
  name: string;
  cost: number;
  estimated_days: string;
}

interface CheckoutProps {
  items: CartItem[];
  subtotal: number;
  shipping_cost: number;
  tax_amount: number;
  total_amount: number;
  shipping_methods: ShippingMethod[];
  stripePublishableKey: string;
}

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

function CheckoutForm({
  items,
  subtotal,
  shipping_cost: initialShippingCost,
  tax_amount: initialTaxAmount,
  total_amount: initialTotalAmount,
  shipping_methods: initialShippingMethods
}: Omit<CheckoutProps, 'stripePublishableKey'>) {
  const stripe = useStripe();
  const elements = useElements();

  const { post, setData, data, processing, errors } = useForm({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
    shipping_method: 'standard',
  });

  const [clientSecret, setClientSecret] = useState('');
  const [orderId, setOrderId] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCalculatingShipping, setIsCalculatingShipping] = useState(false);

  const [shippingCost, setShippingCost] = useState(initialShippingCost);
  const [taxAmount, setTaxAmount] = useState(initialTaxAmount);
  const [totalAmount, setTotalAmount] = useState(initialTotalAmount);
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>(initialShippingMethods);

  // Calculate shipping when address changes
  useEffect(() => {
    const calculateShipping = async () => {
      if (data.country && data.state && data.city && data.zip) {
        setIsCalculatingShipping(true);
        try {
          const response = await axios.post(route('checkout.shipping'), {
            country: data.country,
            state: data.state,
            city: data.city,
            zip: data.zip,
          });

          if (response.data.success) {
            setShippingCost(response.data.shipping_cost);
            setShippingMethods(response.data.shipping_methods);
            // Recalculate total
            const newTotal = subtotal + response.data.shipping_cost + taxAmount;
            setTotalAmount(newTotal);
          }
        } catch (error: any) {
          console.error('Shipping calculation failed:', error);
          // Use fallback shipping cost
          const fallbackCost = error.response?.data?.fallback_cost || 9.99;
          setShippingCost(fallbackCost);
          const newTotal = subtotal + fallbackCost + taxAmount;
          setTotalAmount(newTotal);
        } finally {
          setIsCalculatingShipping(false);
        }
      }
    };

    const timeoutId = setTimeout(calculateShipping, 1000);
    return () => clearTimeout(timeoutId);
  }, [data.country, data.state, data.city, data.zip, subtotal, taxAmount]);

  // Update total when shipping cost changes
  useEffect(() => {
    const newTotal = subtotal + shippingCost + taxAmount;
    setTotalAmount(newTotal);
  }, [subtotal, shippingCost, taxAmount]);

  const createPaymentIntent = async () => {
    setIsLoading(true);
    try {
      const response = await axios.post(route('checkout.payment-intent'), data);

      if (response.data.clientSecret) {
        setClientSecret(response.data.clientSecret);
        setOrderId(response.data.orderId);
      } else {
        throw new Error('Failed to create payment intent');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to create payment intent';
      setPaymentError(errorMessage);
      showErrorToast(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError('');

    if (!stripe || !elements) {
      setPaymentError('Payment system not ready');
      return;
    }

    // Create payment intent first
    // if (!clientSecret) {
    //   await createPaymentIntent();
    //   return;
    // }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setPaymentError('Card element not found');
      return;
    }

    setIsLoading(true);

      try {

           let currentClientSecret = clientSecret;
            let currentOrderId = orderId;

            // Step 1: Create payment intent if not exists
            if (!currentClientSecret) {
            const intentResponse = await axios.post(route('checkout.payment-intent'), data);

            if (!intentResponse.data.clientSecret) {
                throw new Error('Failed to create payment intent');
            }

            currentClientSecret = intentResponse.data.clientSecret;
            currentOrderId = intentResponse.data.orderId;

            setClientSecret(currentClientSecret);
            setOrderId(currentOrderId);
            }

      const { error, paymentIntent } = await stripe.confirmCardPayment(currentClientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: data.name,
            email: data.email,
            address: {
              line1: data.address,
              city: data.city,
              state: data.state,
              postal_code: data.zip,
              country: data.country,
            },
          },
        },
      });

      if (error) {
        setPaymentError(error.message || 'Payment failed');
        showErrorToast(error.message || 'Payment failed');
        setIsLoading(false);
      } else if (paymentIntent?.status === 'succeeded') {
        // Confirm payment on backend
        const confirmResponse = await axios.post(route('checkout.confirm'), {
          order_id: currentOrderId,
          payment_intent_id: paymentIntent.id,
        });

        if (confirmResponse.data.success) {
          showSuccessToast('Payment successful! Order has been placed.');
          window.location.href = confirmResponse.data.redirect;
        } else {
          throw new Error(confirmResponse.data.error || 'Failed to confirm payment');
        }
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Payment error occurred';
      setPaymentError(errorMessage);
      showErrorToast(errorMessage);
      setIsLoading(false);
    }
  };

  const toNumber = (value: number | string): number => {
    if (typeof value === 'number') return value;
    return parseFloat(value) || 0;
  };

  const calculateItemTotal = (item: CartItem): number => {
    return toNumber(item.unit_price) * item.quantity;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className='flex text-center align-center justify-center'>
            <Link href={route("cart.index")} className="text-3xl font-bold text-gray-600 dark:text-gray-400 mb-2 hover:underline">
              Cart &nbsp;
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              / Checkout
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Complete your purchase securely
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Checkout Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Shipping Information */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
                <div className="flex items-center mb-6">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">1</span>
                  </div>
                  <h2 className="ml-3 text-xl font-bold text-gray-900 dark:text-white">
                    Shipping Information
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={data.name}
                      onChange={(e) => setData('name', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors duration-200"
                      placeholder="John Doe"
                      required
                    />
                    {errors.name && (
                      <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.name}</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={data.email}
                      onChange={(e) => setData('email', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors duration-200"
                      placeholder="john@example.com"
                      required
                    />
                    {errors.email && (
                      <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.email}</p>
                    )}
                                  </div>

<div className="md:col-span-2">
  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
    Phone Number*
  </label>
  <input
    type="tel"
    value={data.phone}
    onChange={(e) => setData('phone', e.target.value)}
    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors duration-200"
    placeholder="+1 (555) 123-4567"
  />
  {errors.phone && (
    <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.phone}</p>
  )}
</div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Street Address *
                    </label>
                    <input
                      type="text"
                      value={data.address}
                      onChange={(e) => setData('address', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors duration-200"
                      placeholder="123 Main St"
                      required
                    />
                    {errors.address && (
                      <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.address}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      City *
                    </label>
                    <input
                      type="text"
                      value={data.city}
                      onChange={(e) => setData('city', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors duration-200"
                      placeholder="New York"
                      required
                    />
                    {errors.city && (
                      <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.city}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      State *
                    </label>
                    <input
                      type="text"
                      value={data.state}
                      onChange={(e) => setData('state', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors duration-200"
                      placeholder="NY"
                      required
                    />
                    {errors.state && (
                      <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.state}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      ZIP Code *
                    </label>
                    <input
                      type="text"
                      value={data.zip}
                      onChange={(e) => setData('zip', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors duration-200"
                      placeholder="10001"
                      required
                    />
                    {errors.zip && (
                      <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.zip}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Country *
                    </label>
                    <select
                      value={data.country}
                      onChange={(e) => setData('country', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-200"
                      required
                    >
                      <option value="US">United States</option>
                      <option value="CA">Canada</option>
                      <option value="GB">United Kingdom</option>
                      <option value="AU">Australia</option>
                    </select>
                    {errors.country && (
                      <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.country}</p>
                    )}
                  </div>
                </div>

                {/* Shipping Method Selection */}
                {shippingMethods?.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Shipping Method *
                    </label>
                    <div className="space-y-3">
                      {shippingMethods.map((method) => (
                        <label key={method.id} className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="radio"
                            name="shipping_method"
                            value={method.id}
                            checked={data.shipping_method === method.id}
                            onChange={(e) => setData('shipping_method', e.target.value)}
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <span className="block text-sm font-medium text-gray-900 dark:text-white">
                              {method.name}
                            </span>
                            <span className="block text-sm text-gray-500 dark:text-gray-400">
                              {method.estimated_days}
                            </span>
                          </div>
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            ${method.cost.toFixed(2)}
                          </span>
                        </label>
                      ))}
                    </div>
                    {errors.shipping_method && (
                      <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.shipping_method}</p>
                    )}
                  </div>
                )}

                {isCalculatingShipping && (
                  <div className="mt-4 flex items-center text-sm text-blue-600 dark:text-blue-400">
                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Calculating shipping costs...
                  </div>
                )}
              </div>

              {/* Payment Information */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
                <div className="flex items-center mb-6">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">2</span>
                  </div>
                  <h2 className="ml-3 text-xl font-bold text-gray-900 dark:text-white">
                    Payment Information
                  </h2>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Card Details *
                  </label>
                  <div className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-white transition-colors duration-200">
                    <CardElement
                      options={{
                        style: {
                          base: {
                            fontSize: '16px',
                            color: '#1f2937',
                            '::placeholder': {
                              color: '#9ca3af',
                            },
                            backgroundColor: 'transparent',
                          },
                          invalid: {
                            color: '#dc2626',
                          },
                        },
                        hidePostalCode: true,
                      }}
                    />
                  </div>
                </div>

                {paymentError && (
                  <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-4 transition-colors duration-200">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      {paymentError}
                    </div>
                  </div>
                )}

                {/* Security Badges */}
                <div className="flex items-center justify-center space-x-6 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-center">
                    <div className="w-12 h-8 bg-gray-200 dark:bg-gray-600 rounded flex items-center justify-center mx-auto mb-1">
                      <span className="text-xs font-bold text-gray-600 dark:text-gray-400">SSL</span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Secure</span>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-8 bg-gray-200 dark:bg-gray-600 rounded flex items-center justify-center mx-auto mb-1">
                      <span className="text-xs font-bold text-gray-600 dark:text-gray-400">256-bit</span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Encrypted</span>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sticky top-8 transition-colors duration-200">
              <div className="flex items-center mb-6">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">3</span>
                </div>
                <h2 className="ml-3 text-xl font-bold text-gray-900 dark:text-white">
                  Order Summary
                </h2>
              </div>

              {/* Order Items */}
              <div className="space-y-4 mb-6 max-h-64 overflow-y-auto">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
                      {item.product.image_url ? (
                        <img
                          src={item.product.image_url}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          {item.quantity}x
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {item.product.name}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        ${toNumber(item.unit_price).toFixed(2)} × {item.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        ${calculateItemTotal(item).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Price Breakdown */}
              <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    ${subtotal}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Shipping</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    ${shippingCost}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Tax</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    ${taxAmount}
                  </span>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900 dark:text-white">Total</span>
                    <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      ${totalAmount}
                    </span>
                  </div>
                </div>
              </div>

              {/* Complete Purchase Button */}
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={!stripe || processing || isLoading || isCalculatingShipping}
                className="w-full mt-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-4 px-6 rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-all duration-200 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  `Complete Purchase - $${totalAmount}`
                )}
              </button>

              {/* Security Notice */}
              <div className="mt-4 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  🔒 Your payment is secure and encrypted
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutIndex({
  items,
  subtotal,
  shipping_cost,
  tax_amount,
  total_amount,
  shipping_methods,
  stripePublishableKey
}: CheckoutProps) {
  return (
    <FrontendLayout>
      <Head title="Checkout" />

      <Elements stripe={stripePromise}>
        <CheckoutForm
          items={items}
          subtotal={subtotal}
          shipping_cost={shipping_cost}
          tax_amount={tax_amount}
          total_amount={total_amount}
          shipping_methods={shipping_methods}
        />
      </Elements>
    </FrontendLayout>
  );
}
