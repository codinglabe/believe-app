"use client"

import type React from "react"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js"
import axios from "axios"
import { useState, useEffect } from "react"
import { usePage } from "@inertiajs/react"
import { showErrorToast, showInfoToast, showSuccessToast } from "../../lib/toast"
import { Coins, CreditCard } from "lucide-react"

// Add this function to check if Stripe.js loaded
const stripePromise = (() => {
  try {
    const key = import.meta.env.VITE_STRIPE_PUBLIC_KEY || ''
    if (!key) {
      console.error('Stripe public key is missing')
      return null
    }
    return loadStripe(key)
  } catch (error) {
    console.error('Failed to load Stripe:', error)
    return null
  }
})()

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
  donationAmount: number
}

interface Step2Props {
  items: CartItem[]
  subtotal: number
  // platform_fee: number // Removed - customers don't pay platform fee
  donation_amount: number
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

function Step2Form({ items, subtotal, donation_amount, step2Data, onBack }: Omit<Step2Props, "stripePublishableKey">) {
  const stripe = useStripe()
  const elements = useElements()
  const [stripeLoaded, setStripeLoaded] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'believe_points'>('stripe')
  const page = usePage()
  const auth = (page.props as any).auth
  const currentBalance = parseFloat(auth?.user?.believe_points) || 0

  // State for current amounts
  const [currentTaxAmount, setCurrentTaxAmount] = useState(step2Data.taxAmount)
  const [currentShippingCost, setCurrentShippingCost] = useState(step2Data.shippingCost)
  const [currentTotalAmount, setCurrentTotalAmount] = useState(step2Data.totalAmount)
  // Donation removed for Printify products - currentDonationAmount always 0

  // New state for tax calculation status
  const [isTaxCalculated, setIsTaxCalculated] = useState(false)
  const [taxCalculationMessage, setTaxCalculationMessage] = useState("Click 'Calculate & Pay' to calculate tax")

  // State for payment flow
  const [paymentStep, setPaymentStep] = useState<'initial' | 'calculating' | 'ready' | 'processing'>('initial')
  const [paymentIntentData, setPaymentIntentData] = useState<any>(null)
  const [paymentError, setPaymentError] = useState("")
  const [cardComplete, setCardComplete] = useState(false)

  // Calculate points required based on current total (updates after tax calculation)
  const pointsRequired = currentTotalAmount
  const hasEnoughPoints = currentBalance >= pointsRequired

  // Update points check when total amount changes
  useEffect(() => {
    if (paymentMethod === 'believe_points' && currentTotalAmount > 0) {
      if (currentBalance < currentTotalAmount) {
        setPaymentError(`Insufficient Believe Points. You need ${currentTotalAmount.toFixed(2)} points but only have ${currentBalance.toFixed(2)} points.`)
      } else {
        setPaymentError("")
      }
    }
  }, [currentTotalAmount, currentBalance, paymentMethod])

  const [selectedShippingMethod, setSelectedShippingMethod] = useState(
    step2Data.shippingMethods[0]?.id || "standard"
  )

  // Initialize tax calculation status
  useEffect(() => {
    // Check if tax is already calculated (from Step1)
    if (step2Data.taxAmount > 0) {
      setIsTaxCalculated(true)
      setTaxCalculationMessage(`Tax calculated: $${step2Data.taxAmount.toFixed(2)}`)
    } else {
      setIsTaxCalculated(false)
      setTaxCalculationMessage("Tax not calculated yet. Click 'Calculate & Pay' to calculate.")
    }
  }, [step2Data.taxAmount])

  // Check if Stripe is loaded
  useEffect(() => {
    if (stripe && elements) {
      setStripeLoaded(true)
    } else {
      const timer = setTimeout(() => {
        if (!stripe || !elements) {
          console.error('Stripe.js failed to load')
          setPaymentError('Payment system failed to load. Please refresh the page.')
        }
      }, 5000)

      return () => clearTimeout(timer)
    }
  }, [stripe, elements])

  const handleCardChange = (event: any) => {
    setCardComplete(event.complete)
    if (event.error) {
      setPaymentError(event.error.message)
    } else {
      setPaymentError("")
    }
  }

  const handlePayButtonClick = async (e: React.FormEvent) => {
    e.preventDefault()
    setPaymentError("")

    // Handle Believe Points payment (skip Stripe validation)
    if (paymentMethod === 'believe_points') {
      console.log('Believe Points payment initiated', {
        currentBalance,
        pointsRequired,
        hasEnoughPoints,
        isTaxCalculated,
        currentTotalAmount,
        paymentStep
      })

      setPaymentError("")

      try {
        // STEP 1: Calculate tax & shipping first if not calculated (same as Stripe flow)
        if (!isTaxCalculated || paymentStep === 'initial') {
          console.log('Step 1: Calculating tax & shipping for Believe Points payment...')
          setPaymentStep('calculating')
          setTaxCalculationMessage("Calculating tax and final amounts...")

          const intentResponse = await axios.post("/checkout/payment-intent", {
            temp_order_id: step2Data.tempOrderId,
            shipping_method: selectedShippingMethod,
          })

          if (!intentResponse.data.success) {
            throw new Error(intentResponse.data.error || "Failed to calculate amounts")
          }

          // Update amounts from response
          const finalAmount = intentResponse.data.amount || currentTotalAmount
          const finalTaxAmount = intentResponse.data.tax_amount || 0
          const finalShippingCost = intentResponse.data.shipping_cost || currentShippingCost

          console.log('Tax & shipping calculated:', {
            finalAmount,
            finalTaxAmount,
            finalShippingCost,
            currentBalance
          })

          // Update state with calculated amounts
          setCurrentTaxAmount(finalTaxAmount)
          setCurrentShippingCost(finalShippingCost)
          setCurrentTotalAmount(finalAmount)
          setIsTaxCalculated(true)
          setTaxCalculationMessage(`Tax calculated: $${finalTaxAmount.toFixed(2)}`)

          // Check if user has enough points after tax calculation
          if (currentBalance < finalAmount) {
            setPaymentStep('initial')
            throw new Error(`Insufficient Believe Points. You need ${finalAmount.toFixed(2)} points but only have ${currentBalance.toFixed(2)} points.`)
          }

          // Move to ready state (same as Stripe flow)
          setPaymentStep('ready')
          console.log('Step 1 complete: Tax calculated, moving to ready state')
          return // Exit here, user will click again to confirm
        }

        // STEP 2: Confirm payment (only when step is 'ready')
        if (paymentStep === 'ready') {
          console.log('Step 2: Confirming Believe Points payment...')
          setPaymentStep('processing')

          // Final check before payment
          if (currentBalance < currentTotalAmount) {
            setPaymentStep('ready')
            throw new Error(`Insufficient Believe Points. You need ${currentTotalAmount.toFixed(2)} points but only have ${currentBalance.toFixed(2)} points.`)
          }

          console.log('Confirming payment with:', {
            tempOrderId: step2Data.tempOrderId,
            amount: currentTotalAmount,
            pointsRequired: currentTotalAmount,
            currentBalance
          })

          // Confirm payment with Believe Points
          const confirmResponse = await axios.post("/checkout/confirm", {
            temp_order_id: step2Data.tempOrderId,
            payment_method: 'believe_points',
          })

          console.log('Believe Points payment response:', confirmResponse.data)

          if (confirmResponse.data.success) {
            showSuccessToast("Payment successful! Your order has been created.")
            setTimeout(() => {
              window.location.href = confirmResponse.data.redirect || '/profile/orders'
            }, 2000)
          } else {
            throw new Error(confirmResponse.data.error || "Failed to confirm payment")
          }
        }
      } catch (error: any) {
        console.error('Believe Points payment error:', error)
        const errorMessage = error.response?.data?.error || error.message || "Payment error occurred"
        setPaymentError(errorMessage)
        showErrorToast(errorMessage)
        setPaymentStep('initial')
      }
      return
    }

    // Stripe payment validation (only for Stripe payments)
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

    // FIRST CLICK: Calculate final amounts and create payment intent (Stripe)
    if (paymentStep === 'initial') {
      setPaymentStep('calculating')
      setTaxCalculationMessage("Calculating tax and final amounts...")

      try {
        // Step 1: Create payment intent (this will update tax and create intent)
        const intentResponse = await axios.post("/checkout/payment-intent", {
          temp_order_id: step2Data.tempOrderId,
          shipping_method: selectedShippingMethod,
        })

        if (!intentResponse.data.success) {
          throw new Error(intentResponse.data.error || "Failed to create payment intent")
        }

        // Update local amounts with latest from server
        if (intentResponse.data.amount !== undefined) {
          setCurrentTotalAmount(intentResponse.data.amount)
        }
        if (intentResponse.data.tax_amount !== undefined) {
          const newTaxAmount = intentResponse.data.tax_amount
          setCurrentTaxAmount(newTaxAmount)
          setIsTaxCalculated(true)
          setTaxCalculationMessage(`Tax calculated: $${newTaxAmount.toFixed(2)}`)
        }
        if (intentResponse.data.shipping_cost !== undefined) {
          setCurrentShippingCost(intentResponse.data.shipping_cost)
        }
        // Donation removed for Printify products

        // Store payment intent data for next step
        setPaymentIntentData({
          clientSecret: intentResponse.data.clientSecret,
          tempOrderId: intentResponse.data.temp_order_id,
          donationAmount: 0, // Donation disabled for Printify products
          taxAmount: intentResponse.data.tax_amount,
        })

        // Move to ready state for payment confirmation
        setPaymentStep('ready')

        // Show tax calculation result
        if (intentResponse.data.tax_amount > 0) {
          showInfoToast(`Tax calculated: $${intentResponse.data.tax_amount.toFixed(2)}. Click 'Confirm Payment' to proceed.`)
        } else if (intentResponse.data.tax_estimated) {
          showInfoToast("Tax amount estimated. Click 'Confirm Payment' to proceed.")
        }

      } catch (error: any) {
        console.error('Payment calculation error:', error)
        const errorMessage = error.response?.data?.error || error.message || "Payment calculation failed"
        setPaymentError(errorMessage)
        setTaxCalculationMessage("Tax calculation failed. Please try again.")
        showErrorToast(errorMessage)
        setPaymentStep('initial')
      }
    }
    // SECOND CLICK: Confirm payment with Stripe
    else if (paymentStep === 'ready') {
      setPaymentStep('processing')

      try {
        if (!paymentIntentData || !paymentIntentData.clientSecret) {
          throw new Error("Payment intent not found. Please try again.")
        }

        const clientSecret = paymentIntentData.clientSecret

        // Confirm card payment with Stripe
        const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: "Customer",
              email: "customer@example.com",
            },
          },
        })

        if (error) {
          throw new Error(error.message || "Card payment failed")
        }

        if (paymentIntent?.status === "succeeded") {
          // Confirm payment on backend
          const confirmResponse = await axios.post("/checkout/confirm", {
            temp_order_id: step2Data.tempOrderId,
            payment_intent_id: paymentIntent.id,
            payment_method: 'stripe',
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
        setPaymentStep('initial') // Reset to initial state
      }
    }
  }

  // Donation calculation removed for Printify products

  // Determine button text and state based on payment step
  const getButtonText = () => {
    switch (paymentStep) {
      case 'initial':
        return isTaxCalculated
          ? `Pay $${currentTotalAmount.toFixed(2)}`
          : `Calculate & Pay $${currentTotalAmount.toFixed(2)}`
      case 'calculating':
        return "Calculating Tax & Amounts..."
      case 'ready':
        return `Confirm Payment $${currentTotalAmount.toFixed(2)}`
      case 'processing':
        return "Processing Payment..."
      default:
        return `Pay $${currentTotalAmount.toFixed(2)}`
    }
  }

  const isButtonDisabled = () => {
    if (paymentMethod === 'believe_points') {
      // Disable if processing
      if (paymentStep === 'calculating' || paymentStep === 'processing') {
        return true
      }
      // If tax is calculated and we don't have enough points, disable
      if (isTaxCalculated && !hasEnoughPoints) {
        return true
      }
      // Allow clicking in 'initial' or 'ready' state
      // In 'initial': will calculate tax & shipping
      // In 'ready': will confirm payment
      return false
    }
    return !stripeLoaded ||
           !stripe ||
           !cardComplete ||
           paymentStep === 'calculating' ||
           paymentStep === 'processing'
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Column - Payment Form */}
      <div className="lg:col-span-2">
        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
          {/* Show step indicator */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  paymentStep === 'initial'
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                    : 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300'
                }`}>
                  {paymentStep === 'initial' ? '1' : '✓'}
                </div>
                <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  {isTaxCalculated ? 'Amounts Ready' : 'Calculate Amounts'}
                </span>
              </div>

              <div className="w-16 h-1 bg-gray-200 dark:bg-gray-700 mx-2"></div>

              <div className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  paymentStep === 'ready' || paymentStep === 'processing'
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600'
                }`}>
                  2
                </div>
                <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">Confirm Payment</span>
              </div>
            </div>

            {/* Tax Calculation Status */}
            <div className={`mt-4 p-3 rounded-lg border ${
              isTaxCalculated
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
            }`}>
              <div className="flex items-center">
                <svg className={`w-5 h-5 mr-2 ${
                  isTaxCalculated ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'
                }`} fill="currentColor" viewBox="0 0 20 20">
                  {isTaxCalculated ? (
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  ) : (
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  )}
                </svg>
                <span className={`text-sm font-medium ${
                  isTaxCalculated ? 'text-green-800 dark:text-green-400' : 'text-yellow-800 dark:text-yellow-400'
                }`}>
                  {taxCalculationMessage}
                </span>
              </div>
            </div>

            {paymentStep === 'ready' && (
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center text-green-800 dark:text-green-400">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium">Final amounts calculated. Click "Confirm Payment" to proceed.</span>
                </div>
              </div>
            )}
          </div>

          {/* Payment Method Selection */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Payment Method</h3>

            <div className="space-y-3">
              {/* Stripe Payment */}
              <label className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                paymentMethod === 'stripe'
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
              }`}>
                <input
                  type="radio"
                  name="payment_method"
                  value="stripe"
                  checked={paymentMethod === 'stripe'}
                  onChange={(e) => setPaymentMethod(e.target.value as 'stripe' | 'believe_points')}
                  className="w-4 h-4 text-blue-600"
                />
                <CreditCard className="h-5 w-5 text-blue-600" />
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 dark:text-white">Pay with Card (Stripe)</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Secure payment via Stripe</div>
                </div>
              </label>

              {/* Believe Points Payment */}
              <label className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                paymentMethod === 'believe_points'
                  ? 'border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-yellow-400'
              } ${!hasEnoughPoints ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <input
                  type="radio"
                  name="payment_method"
                  value="believe_points"
                  checked={paymentMethod === 'believe_points'}
                  onChange={(e) => setPaymentMethod(e.target.value as 'stripe' | 'believe_points')}
                  disabled={!hasEnoughPoints}
                  className="w-4 h-4 text-yellow-600"
                />
                <Coins className="h-5 w-5 text-yellow-600" />
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    Pay with Believe Points
                    {!hasEnoughPoints && (
                      <span className="text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 px-2 py-1 rounded">
                        Insufficient
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Your balance: {currentBalance.toFixed(2)} points
                    {hasEnoughPoints && (
                      <span className="text-green-600 dark:text-green-400 ml-2">
                        (You'll have {(currentBalance - pointsRequired).toFixed(2)} points remaining)
                      </span>
                    )}
                  </div>
                </div>
              </label>
            </div>

            {paymentMethod === 'believe_points' && !hasEnoughPoints && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-300">
                  You need {pointsRequired.toFixed(2)} points but only have {currentBalance.toFixed(2)} points.
                </p>
              </div>
            )}
          </div>

          {/* Payment */}
          {paymentMethod === 'stripe' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Payment Details</h3>

            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Card Details *
            </label>

            {!stripeLoaded ? (
              <div className="p-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-900 animate-pulse">
                <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded"></div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Loading payment form...</p>
              </div>
            ) : (
              <>
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
              </>
            )}

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
          )}

          <div className="flex gap-4">
            <button
              type="button"
              onClick={onBack}
              disabled={paymentStep === 'calculating' || paymentStep === 'processing'}
              className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white py-3 px-6 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Back to Shipping
            </button>
            <button
              type="button"
              onClick={handlePayButtonClick}
              disabled={isButtonDisabled()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 px-6 rounded-lg font-semibold transition-all disabled:cursor-not-allowed flex items-center justify-center"
            >
              {(paymentStep === 'calculating' || paymentStep === 'processing') ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {paymentStep === 'calculating' ? "Calculating..." : "Processing..."}
                </>
              ) : paymentMethod === 'believe_points' ? (
                <>
                  <Coins className="mr-2 h-5 w-5" />
                  {paymentStep === 'initial'
                    ? (isTaxCalculated
                        ? `Pay ${currentTotalAmount.toFixed(2)} Points`
                        : `Calculate & Pay ${currentTotalAmount.toFixed(2)} Points`)
                    : paymentStep === 'ready'
                    ? `Confirm Payment (${currentTotalAmount.toFixed(2)} Points)`
                    : `Pay ${currentTotalAmount.toFixed(2)} Points`
                  }
                </>
              ) : (
                getButtonText()
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Right Column - Order Summary */}
      <div className="lg:col-span-1">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sticky top-8">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Order Summary</h3>

          {/* Show calculating state */}
          {paymentStep === 'calculating' && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center">
                <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Calculating tax and final amounts...
              </p>
            </div>
          )}

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
            {/* Platform Fee removed - customers don't pay it */}
            {/* Donation Amount - Removed for Printify products */}

            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Shipping</span>
              <span>
                {paymentStep === 'calculating' ? (
                  <span className="inline-flex items-center">
                    <svg className="animate-spin h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Calculating...
                  </span>
                ) : (
                  `$${currentShippingCost.toFixed(2)}`
                )}
              </span>
            </div>

            {/* Tax Display - Show different states */}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Tax</span>
              <span className={
                isTaxCalculated
                  ? "text-gray-600 dark:text-gray-400"
                  : "text-yellow-600 dark:text-yellow-400 font-semibold"
              }>
                {paymentStep === 'calculating' ? (
                  <span className="inline-flex items-center">
                    <svg className="animate-spin h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Calculating...
                  </span>
                ) : isTaxCalculated ? (
                  `$${currentTaxAmount.toFixed(2)}`
                ) : (
                  <span className="inline-flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Not calculated
                  </span>
                )}
              </span>
            </div>

            {/* Total - Also show different states */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3 flex justify-between font-bold text-lg">
              <span className={
                isTaxCalculated
                  ? "text-gray-900 dark:text-white"
                  : "text-yellow-700 dark:text-yellow-300"
              }>Total</span>
              <span className={
                isTaxCalculated
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-yellow-600 dark:text-yellow-400"
              }>
                {paymentStep === 'calculating' ? (
                  <span className="inline-flex items-center">
                    <svg className="animate-spin h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Calculating...
                  </span>
                ) : isTaxCalculated ? (
                  `$${currentTotalAmount.toFixed(2)}`
                ) : (
                  <span className="inline-flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    ${currentTotalAmount.toFixed(2)}*
                  </span>
                )}
              </span>
            </div>

            {/* Tax Calculation Note */}
            {!isTaxCalculated && paymentStep !== 'calculating' && (
              <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                <p className="text-xs text-yellow-700 dark:text-yellow-300">
                  * Total amount does not include tax. Tax will be calculated when you click "Calculate & Pay".
                </p>
              </div>
            )}
          </div>

          {/* Donation Message - Removed for Printify products */}

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

// ... Rest of the component remains the same (StripeFallback and main export)
// Add fallback component
function StripeFallback() {
  return (
    <div className="p-8 text-center">
      <div className="mb-4">
        <svg className="w-16 h-16 text-yellow-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.874-.833-2.644 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Payment System Loading</h3>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        The payment form is taking longer than expected to load.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-lg font-semibold transition-all"
      >
        Refresh Page
      </button>
    </div>
  )
}

export default function Step2(props: Step2Props) {
  const [stripeError, setStripeError] = useState(false)

  // Check if Stripe key exists
  useEffect(() => {
    if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
      console.error('Stripe public key is missing in environment variables')
      setStripeError(true)
    }
  }, [])

  if (stripeError) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
        <h3 className="text-lg font-bold text-red-800 dark:text-red-400 mb-2">Payment Configuration Error</h3>
        <p className="text-red-700 dark:text-red-300">
          Stripe payment is not properly configured. Please contact support.
        </p>
      </div>
    )
  }

  if (!stripePromise) {
    return <StripeFallback />
  }

  return (
    <Elements stripe={stripePromise}>
      <Step2Form {...props} />
    </Elements>
  )
}

