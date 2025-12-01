"use client"

import type React from "react"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js"
import axios from "axios"
import { useState, useEffect } from "react"
import { showErrorToast, showSuccessToast } from "../../lib/toast"

interface CartItem {
  id: number
  quantity: number
  unit_price: number
  variant_image: string | null
  product: {
    name: string
  }
}

interface Step2Data {
  tempOrderId: number
  shippingMethods: any[]
  shippingCost: number
  taxAmount: number
  totalAmount: number
}

interface Step2Props {
  items: CartItem[]
  subtotal: number
  platform_fee: number
  donation_percentage: number
  step2Data: Step2Data
  stripePublishableKey: string
  onBack: () => void
}

// Stripe card element styles
const cardElementOptions = {
  style: {
    base: {
      fontSize: '16px',
      color: '#1f2937',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSmoothing: 'antialiased',
      '::placeholder': {
        color: '#9ca3af',
      },
      ':-webkit-autofill': {
        color: '#1f2937',
      },
    },
    invalid: {
      color: '#dc2626',
      iconColor: '#dc2626',
    },
  },
  hidePostalCode: true,
}

function Step2Form({ items, subtotal, platform_fee, step2Data, onBack }: Omit<Step2Props, "stripePublishableKey">) {
  const stripe = useStripe()
  const elements = useElements()

  const [selectedShippingMethod, setSelectedShippingMethod] = useState(
    step2Data.shippingMethods[0]?.id || "standard"
  )
  const [isLoading, setIsLoading] = useState(false)
  const [paymentError, setPaymentError] = useState("")
  const [cardComplete, setCardComplete] = useState(false)

  const handleCardChange = (event: any) => {
    setCardComplete(event.complete)
    if (event.error) {
      setPaymentError(event.error.message)
    } else {
      setPaymentError("")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPaymentError("")

    if (!stripe || !elements) {
      setPaymentError("Payment system not ready. Please refresh the page.")
      return
    }

    const cardElement = elements.getElement(CardElement)
    if (!cardElement) {
      setPaymentError("Card element not found. Please refresh the page.")
      return
    }

    if (!cardComplete) {
      setPaymentError("Please complete your card details.")
      return
    }

    setIsLoading(true)

    try {
      // Step 1: Create payment intent on backend
      const intentResponse = await axios.post("/checkout/payment-intent", {
        temp_order_id: step2Data.tempOrderId,
        shipping_method: selectedShippingMethod,
      })

      if (!intentResponse.data.clientSecret) {
        throw new Error(intentResponse.data.error || "Failed to create payment intent")
      }

      const clientSecret = intentResponse.data.clientSecret

      if (!clientSecret) {
        throw new Error("No client secret received from server")
      }

      // Step 2: Confirm card payment with Stripe
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: "Customer", // You might want to pass the actual customer name
            email: "customer@example.com", // You might want to pass the actual email
          },
        },
      })

      if (error) {
        setPaymentError(error.message || "Card payment failed")
        showErrorToast(error.message || "Card payment failed")
        setIsLoading(false)
        return
      }

      if (paymentIntent?.status === "succeeded") {
        // Step 3: Confirm payment on backend
        const confirmResponse = await axios.post("/checkout/confirm", {
          temp_order_id: step2Data.tempOrderId,
          payment_intent_id: paymentIntent.id,
        })

        if (confirmResponse.data.success) {
          showSuccessToast(confirmResponse.data.message || "Payment successful! Your order has been created.")
          setTimeout(() => {
            window.location.href = confirmResponse.data.redirect
          }, 2000)
        } else {
          throw new Error(confirmResponse.data.error || "Failed to confirm payment")
        }
      } else {
        throw new Error("Payment was not completed successfully. Status: " + paymentIntent?.status)
      }
    } catch (error: any) {
      console.error('Payment error:', error)
      const errorMessage = error.response?.data?.error || error.message || "Payment error occurred"
      setPaymentError(errorMessage)
      showErrorToast(errorMessage)
      setIsLoading(false)
    }
  }

  const shippingCost = step2Data.shippingCost
  const taxAmount = step2Data.taxAmount
  const totalAmount = step2Data.totalAmount

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Column - Payment Form */}
      <div className="lg:col-span-2">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Shipping Method */}
          {/* <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Shipping Method</h3>

            <div className="space-y-3">
              {step2Data.shippingMethods && step2Data.shippingMethods.length > 0 ? (
                step2Data.shippingMethods.map((method) => (
                  <label key={method.id} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="shipping_method"
                      value={method.id}
                      checked={selectedShippingMethod === method.id}
                      onChange={(e) => setSelectedShippingMethod(e.target.value)}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{method.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{method.estimated_days}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">${method.cost.toFixed(2)}</p>
                  </label>
                ))
              ) : (
                <p className="text-gray-500 dark:text-gray-400">Standard Shipping: ${shippingCost.toFixed(2)}</p>
              )}
            </div>
          </div> */}

          {/* Payment */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Payment Details</h3>

            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Card Details *
            </label>

            <div className="p-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 transition-colors duration-200">
              <CardElement
                options={cardElementOptions}
                onChange={handleCardChange}
              />
            </div>

            <div className="flex items-center mt-2 text-sm text-gray-500 dark:text-gray-400">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              Your payment details are secure and encrypted
            </div>

            {paymentError && (
              <div className="mt-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
                <div className="flex items-start">
                  <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm">{paymentError}</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={onBack}
              disabled={isLoading}
              className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white py-3 px-6 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Back to Shipping
            </button>
            <button
              type="submit"
              disabled={!stripe || !cardComplete || isLoading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 px-6 rounded-lg font-semibold transition-all disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Processing Payment...
                </>
              ) : (
                `Pay $${totalAmount.toFixed(2)}`
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Right Column - Order Summary */}
      <div className="lg:col-span-1">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sticky top-8">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Order Summary</h3>

          {/* Items */}
          <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{item.product.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    ${item.unit_price.toFixed(2)} × {item.quantity}
                  </p>
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  ${(item.unit_price * item.quantity).toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          {/* Breakdown */}
          <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Platform Fee</span>
              <span>${platform_fee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Shipping</span>
              <span>${shippingCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Tax</span>
              <span>${taxAmount.toFixed(2)}</span>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-3 flex justify-between font-bold text-lg text-gray-900 dark:text-white">
              <span>Total</span>
              <span className="text-blue-600 dark:text-blue-400">${totalAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-6 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center text-green-800 dark:text-green-400">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">All prices include applicable fees</span>
            </div>
          </div>

          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              🔒 Your payment is secure and encrypted with Stripe
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '')

export default function Step2(props: Step2Props) {
  return (
    <Elements stripe={stripePromise}>
      <Step2Form {...props} />
    </Elements>
  )
}
