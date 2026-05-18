import { Head, Link } from '@inertiajs/react';
import FrontendLayout from "@/layouts/frontend/frontend-layout";

export default function CheckoutEmpty() {
  return (
    <FrontendLayout>
      <Head title="Checkout" />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Checkout
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Complete your purchase securely with our streamlined checkout process
            </p>
          </div>

          {/* Main Content */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 md:p-12 transition-colors duration-200">
            <div className="text-center">
              {/* Empty Cart Illustration */}
              <div className="mx-auto w-48 h-48 mb-8 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 rounded-full flex items-center justify-center">
                  <svg
                    className="w-24 h-24 text-gray-400 dark:text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <div className="absolute -top-2 -right-2 w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-yellow-600 dark:text-yellow-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>
              </div>

              {/* Message */}
              <div className="max-w-md mx-auto">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Your cart is empty
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  Looks like you haven't added any items to your cart yet.
                </p>
                <p className="text-gray-500 dark:text-gray-500 text-sm mb-8">
                  Browse our marketplace to discover amazing products from various organizations.
                </p>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href={route('marketplace.index')}
                    className="inline-flex items-center justify-center px-8 py-4 border border-transparent text-base font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                      />
                    </svg>
                    Start Shopping
                  </Link>

                  <Link
                    href={route('cart.index')}
                    className="inline-flex items-center justify-center px-8 py-4 border border-gray-300 dark:border-gray-600 text-base font-medium rounded-xl text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900 transition-all duration-200"
                  >
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                    View Cart
                  </Link>
                </div>
              </div>

              {/* Features Grid */}
              <div className="mt-16 pt-12 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-8">
                  Why shop with us?
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg
                        className="w-6 h-6 text-green-600 dark:text-green-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                      Secure Payment
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Your payment information is encrypted and secure
                    </p>
                  </div>

                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg
                        className="w-6 h-6 text-blue-600 dark:text-blue-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                        />
                      </svg>
                    </div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                      Fast Shipping
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Quick delivery with real-time tracking
                    </p>
                  </div>

                  <div className="text-center">
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg
                        className="w-6 h-6 text-purple-600 dark:text-purple-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                        />
                      </svg>
                    </div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                      Easy Returns
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      30-day return policy for your peace of mind
                    </p>
                  </div>
                </div>
              </div>

              {/* Trust Indicators */}
              <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  Trusted by thousands of customers
                </p>
                <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-gray-600 dark:text-gray-400">SSL</span>
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Secure</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-gray-600 dark:text-gray-400">256</span>
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Encrypted</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-gray-600 dark:text-gray-400">PCI</span>
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Compliant</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="text-center mt-12">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Need help?{' '}
              <Link
                href={route('contact')}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors duration-200"
              >
                Contact our support team
              </Link>
            </p>
          </div>
        </div>
      </div>
    </FrontendLayout>
  );
}
