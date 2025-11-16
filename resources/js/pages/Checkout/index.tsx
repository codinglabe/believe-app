import { Head, Link, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import FrontendLayout from "@/layouts/frontend/frontend-layout";

interface CartItem {
  id: number;
  quantity: number;
  unit_price: number | string;
  product: {
    name: string;
    image_url: string;
  };
}

interface CheckoutProps {
  items: CartItem[];
  total: number;
  stripePublishableKey: string;
}

// Helper function to safely convert to number
const toNumber = (value: number | string): number => {
  if (typeof value === 'number') return value;
  return parseFloat(value) || 0;
};

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

function CheckoutForm({ items, total }: { items: CartItem[]; total: number }) {
  const stripe = useStripe();
  const elements = useElements();
  const { post, setData, data, processing, errors } = useForm({
    name: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: 'United States',
  });

  const [clientSecret, setClientSecret] = useState('');
  const [orderId, setOrderId] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Create payment intent
  useEffect(() => {
    setIsLoading(true);
    post(route('checkout.payment-intent'), {
      onSuccess: (response: any) => {
        setClientSecret(response.props.clientSecret);
        setOrderId(response.props.orderId);
        setIsLoading(false);
      },
      onError: () => {
        setPaymentError('Failed to create payment intent');
        setIsLoading(false);
      },
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!stripe || !elements || !clientSecret) {
      setPaymentError('Payment system not ready');
      setIsLoading(false);
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setPaymentError('Card element not found');
      setIsLoading(false);
      return;
    }

    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
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
        setIsLoading(false);
      } else if (paymentIntent?.status === 'succeeded') {
        // Confirm payment on backend
        post(route('checkout.confirm'), {
          data: {
            order_id: orderId,
            payment_intent_id: paymentIntent.id,
          },
          onSuccess: (response: any) => {
            window.location.href = response.props.redirect;
          },
          onError: () => {
            setPaymentError('Failed to confirm payment');
            setIsLoading(false);
          },
        });
      }
    } catch (err: any) {
      setPaymentError(err.message || 'Payment error occurred');
      setIsLoading(false);
    }
  };

  const calculateItemTotal = (item: CartItem): number => {
    return toNumber(item.unit_price) * item.quantity;
  };

  const calculateCartTotal = (): number => {
    return items.reduce((total, item) => total + calculateItemTotal(item), 0);
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
                      <option value="United States">United States</option>
                      <option value="Canada">Canada</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="Australia">Australia</option>
                    </select>
                    {errors.country && (
                      <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.country}</p>
                    )}
                  </div>
                </div>
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
                  <div className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 transition-colors duration-200">
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
              <div className="space-y-4 mb-6">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        {item.quantity}x
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {item.product.name}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        ${toNumber(item.unit_price).toFixed(2)} each
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
                    ${calculateCartTotal().toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Shipping</span>
                  <span className="font-medium text-green-600 dark:text-green-400">
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
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900 dark:text-white">Total</span>
                    <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      ${calculateCartTotal().toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Complete Purchase Button */}
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={!stripe || processing || isLoading}
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
                  `Complete Purchase - $${calculateCartTotal().toFixed(2)}`
                )}
              </button>

              {/* Security Notice */}
              <div className="mt-4 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  🔒 Your payment is secure and encrypted
                </p>
              </div>

              {/* Trust Badges */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-center space-x-4">
                  <div className="text-center">
                    <div className="w-10 h-6 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center mx-auto mb-1">
                      <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400">VISA</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="w-10 h-6 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center mx-auto mb-1">
                      <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400">MC</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="w-10 h-6 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center mx-auto mb-1">
                      <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400">AMEX</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutIndex({ items, total, stripePublishableKey }: CheckoutProps) {
  return (
    <FrontendLayout>
      <Head title="Checkout" />

      <Elements stripe={stripePromise}>
        <CheckoutForm items={items} total={total} />
      </Elements>
    </FrontendLayout>
  );
}
