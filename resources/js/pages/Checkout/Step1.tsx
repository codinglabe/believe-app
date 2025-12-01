"use client"

import type React from "react"
import { useEffect, useState } from "react"
import axios from "axios"
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

interface Step1Props {
  items: CartItem[]
  subtotal: number
  platform_fee_percentage: number
  platform_fee: number
  donation_percentage: number
  onComplete: (data: any) => void
}

export default function Step1({
  items,
  subtotal,
  platform_fee_percentage,
  platform_fee,
  donation_percentage,
  onComplete,
}: Step1Props) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "US",
  })

  const [isDonating, setIsDonating] = useState(false)
  const [customDonationAmount, setCustomDonationAmount] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

const defaultDonation = (subtotal + platform_fee) * (donation_percentage / 100);
const finalDonationAmount = isDonating ? customDonationAmount || defaultDonation : 0;
const orderTotal = subtotal + platform_fee + finalDonationAmount;

// Donation টগল করলে অটো ১০% সাজেস্ট করবে
useEffect(() => {
  if (isDonating) {
    const suggested = Math.round(defaultDonation * 100) / 100;
    setCustomDonationAmount(suggested); // এটা অটো fill করবে
  } else {
    setCustomDonationAmount(0);
  }
}, [isDonating, subtotal, platform_fee, donation_percentage]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  const calculateDefaultDonation = (): number => {
    if (!isDonating) return 0
    const amount = (subtotal + platform_fee) * (donation_percentage / 100)
    return Math.round(amount * 100) / 100
  }

  const handleDonationToggle = (checked: boolean) => {
      setIsDonating(checked)
    setCustomDonationAmount(calculateDefaultDonation())
    if (checked) {
        setCustomDonationAmount(calculateDefaultDonation())
    } else {
      setCustomDonationAmount(0)
    }
  }

  const handleDonationAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseFloat(e.target.value) || 0
    setCustomDonationAmount(Math.round(value * 100) / 100)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrors({})

    try {
      const response = await axios.post("/checkout/step1", {
        ...formData,
        platform_fee: Number.parseFloat(platform_fee.toFixed(2)),
        donation_amount: isDonating ? Number.parseFloat(customDonationAmount.toFixed(2)) : 0,
      })

      if (response.data.success) {
        showSuccessToast("Shipping information saved successfully!")
        onComplete({
          tempOrderId: response.data.temp_order_id,
          shippingMethods: response.data.shipping_methods,
          shippingCost: Number.parseFloat(response.data.shipping_cost.toFixed(2)),
          taxAmount: Number.parseFloat(response.data.tax_amount.toFixed(2)),
          totalAmount: Number.parseFloat(response.data.total_amount.toFixed(2)),
        })
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || "Failed to submit shipping information"
      setErrors({ submit: errorMessage })
      showErrorToast(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Column - Form */}
      <div className="lg:col-span-2">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Shipping Information */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Shipping Information</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Full Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="john@example.com"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="+1 (555) 123-4567"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Street Address *
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="123 Main St"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">City *</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="New York"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">State *</label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="NY"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">ZIP Code *</label>
                <input
                  type="text"
                  name="zip"
                  value={formData.zip}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="10001"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Country *</label>
                <select
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                >
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  <option value="GB">United Kingdom</option>
                  <option value="AU">Australia</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Support with a Donation</h3>
            <label className="flex items-center space-x-3 cursor-pointer mb-4">
              <input
                type="checkbox"
                checked={isDonating}
                onChange={(e) => handleDonationToggle(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-900 dark:text-white font-medium">Add {donation_percentage}% donation</span>
            </label>

            {isDonating && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Donation Amount
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 dark:text-gray-400">$</span>
                    <input
                      type="number"
                      value={customDonationAmount === 0 && isDonating ? defaultDonation : customDonationAmount}
                      onChange={handleDonationAmountChange}
                      step="0.01"
                      min="0"
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                      placeholder={defaultDonation.toFixed(2)}
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Default suggestion: ${defaultDonation.toFixed(2)} ({donation_percentage}% of subtotal)
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium">
                    You can customize any amount you want
                  </p>
                </div>
              </div>
            )}

            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Your donation helps support our mission. Thank you!
            </p>
          </div>

          {errors.submit && (
            <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
              {errors.submit}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-4 px-6 rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-all disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Processing...
              </>
            ) : (
              "Continue to Payment"
            )}
          </button>
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
                              <div className="flex-shrink-0 w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden mr-2">
                      {item.variant_image ? (
                        <img
                          src={item.variant_image}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          {item.quantity}x
                        </span>
                      )}
                    </div>
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
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Platform Fee ({platform_fee_percentage}%)</span>
              <span>${platform_fee.toFixed(2)}</span>
            </div>
            {isDonating && finalDonationAmount > 0 && (
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Donation</span>
                <span>${finalDonationAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-700 pt-3">
              <span>Before Shipping & Tax</span>
              <span>${orderTotal.toFixed(2)}</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2">
              Shipping and tax will be calculated in the next step
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
