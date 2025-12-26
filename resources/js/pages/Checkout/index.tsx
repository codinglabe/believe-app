"use client"

import { Head, Link } from "@inertiajs/react"
import { useState } from "react"
import FrontendLayout from "../../layouts/frontend/frontend-layout"
import Step1 from "./Step1"
import Step2 from "./Step2"

interface CartItem {
  id: number
  quantity: number
  unit_price: number
  variant_image: string | null
  product: {
    name: string
  }
  variant_data: {
    printify_variant_id: string
    printify_blueprint_id: number
    printify_print_provider_id: number
    variant_options: Record<string, any>
  }
}

interface CheckoutProps {
  items: CartItem[]
  subtotal: number
  platform_fee_percentage: number
  platform_fee: number
  donation_percentage: number
  stripePublishableKey: string
}

interface Step2Data {
  tempOrderId: number
  shippingMethods: any[]
  shippingCost: number
  taxAmount: number
    totalAmount: number
     donationAmount: number
}

export default function CheckoutIndex({
  items,
  subtotal,
  platform_fee_percentage,
  platform_fee,
  donation_percentage,
  stripePublishableKey,
}: CheckoutProps) {
  const [step, setStep] = useState(1)
  const [step2Data, setStep2Data] = useState<Step2Data | null>(null)
    const [donationAmount, setDonationAmount] = useState(0) // Add this state

  const handleStep1Complete = (data: Step2Data) => {
    setStep2Data(data)
    setDonationAmount(data.donationAmount || 0) // Store donation amount
    setStep(2)
  }

  return (
    <FrontendLayout>
      <Head title="Checkout" />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="flex text-center justify-center items-center gap-2">
              <Link href="/cart" className="text-3xl font-bold text-gray-600 dark:text-gray-400 hover:underline">
                Cart
              </Link>
              <span className="text-3xl font-bold text-gray-900 dark:text-white">/</span>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Checkout</h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Complete your purchase securely</p>
          </div>

          {/* Progress Indicator */}
          <div className="mb-8 flex items-center justify-center">
            <div className="flex items-center gap-4">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${step >= 1 ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"}`}
              >
                1
              </div>
              <div className={`h-1 w-12 ${step >= 2 ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"}`}></div>
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${step >= 2 ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"}`}
              >
                2
              </div>
            </div>
          </div>

          {/* Step Content */}
          {step === 1 ? (
            <Step1
              items={items}
              subtotal={subtotal}
              platform_fee_percentage={platform_fee_percentage}
              platform_fee={platform_fee}
              donation_percentage={donation_percentage}
              onComplete={handleStep1Complete}
            />
          ) : (
            <Step2
              items={items}
              subtotal={subtotal}
              // platform_fee={platform_fee} // Removed - customers don't pay platform fee
              donation_percentage={donation_percentage}
              donation_amount={donationAmount}
              step2Data={step2Data!}
              stripePublishableKey={stripePublishableKey}
              onBack={() => setStep(1)}
            />
          )}
        </div>
      </div>
    </FrontendLayout>
  )
}
