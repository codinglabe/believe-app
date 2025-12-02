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

// Popup Component
interface DonationReminderPopupProps {
  isOpen: boolean
  onClose: () => void
  onProceedWithoutDonation: () => void
  onEnableDonation: () => void
  suggestedDonation: number
}

function DonationReminderPopup({
  isOpen,
  onClose,
  onProceedWithoutDonation,
  onEnableDonation,
  suggestedDonation,
}: DonationReminderPopupProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-blue-600 dark:text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Support Our Mission</h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-.464 5.535a1 1 0 10-1.415-1.414 3 3 0 01-4.242 0 1 1 0 00-1.415 1.414 5 5 0 007.072 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <p className="text-gray-700 dark:text-gray-300 text-center text-lg mb-3">
              "We don't mark up anything here."
            </p>
            <p className="text-gray-700 dark:text-gray-300 text-center text-lg mb-2">
              "All items are offered at cost."
            </p>
            <p className="text-gray-700 dark:text-gray-300 text-center text-lg font-medium">
              "Your generosity keeps us going — please leave a donation to help us continue this mission."
            </p>
          </div>

          {/* Suggested Donation */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-6 border border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Suggested Donation</span>
              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                ${suggestedDonation.toFixed(2)}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              This helps cover our operational costs and supports our community work
            </p>
          </div>
        </div>

        {/* Footer - Action Buttons */}
        <div className="p-6 pt-0 flex flex-col gap-3">
          <button
            onClick={onEnableDonation}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add ${suggestedDonation.toFixed(2)} Donation
            </div>
          </button>

          <button
            onClick={onProceedWithoutDonation}
            className="w-full py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-xl transition-colors border border-gray-300 dark:border-gray-600"
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
              Continue Without Donation
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Your purchase still supports our mission
            </p>
          </button>

          <button
            onClick={onClose}
            className="w-full py-3 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300 font-medium rounded-xl transition-colors"
          >
            Go Back & Review
          </button>
        </div>
      </div>
    </div>
  )
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
  const [showDonationPopup, setShowDonationPopup] = useState(false)
  const [isFormValidated, setIsFormValidated] = useState(false)

  const defaultDonation = subtotal * (donation_percentage / 100)
  const finalDonationAmount = isDonating ? customDonationAmount || defaultDonation : 0
  const orderTotal = subtotal + platform_fee + finalDonationAmount

  // Auto-suggest donation when toggled ON
  useEffect(() => {
    if (isDonating) {
      const suggested = Math.round(defaultDonation * 100) / 100
      setCustomDonationAmount(suggested)
    } else {
      setCustomDonationAmount(0)
    }
  }, [isDonating, subtotal, platform_fee, donation_percentage])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  const handleDonationToggle = (checked: boolean) => {
    setIsDonating(checked)
    if (checked) {
      setCustomDonationAmount(Math.round(defaultDonation * 100) / 100)
    } else {
      setCustomDonationAmount(0)
    }
  }

  const handleDonationAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseFloat(e.target.value) || 0
    setCustomDonationAmount(Math.round(value * 100) / 100)
  }

  const validateForm = (): boolean => {
    const requiredFields = ['name', 'email', 'phone', 'address', 'city', 'state', 'zip']
    const newErrors: Record<string, string> = {}

    requiredFields.forEach(field => {
      if (!formData[field as keyof typeof formData]) {
        newErrors[field] = 'This field is required'
      }
    })

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form
    if (!validateForm()) {
      showErrorToast("Please fill in all required fields correctly")
      return
    }

    // Check if donation is not enabled
    if (!isDonating && !isFormValidated) {
      setShowDonationPopup(true)
      return
    }

    // Proceed with form submission
    await submitForm()
  }

  const submitForm = async () => {
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
          donationAmount: isDonating ? Number.parseFloat(customDonationAmount.toFixed(2)) : 0,
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

  const handleProceedWithoutDonation = () => {
    setShowDonationPopup(false)
    setIsFormValidated(true)
    // Auto-submit the form after closing popup
    setTimeout(() => {
      submitForm()
    }, 100)
  }

  const handleEnableDonation = () => {
    setShowDonationPopup(false)
    setIsDonating(true)
    setIsFormValidated(true)
    // Auto-focus donation input after popup closes
    setTimeout(() => {
      const donationInput = document.querySelector('input[type="number"]') as HTMLInputElement
      if (donationInput) {
        donationInput.focus()
        donationInput.select()
      }
    }, 200)
  }

  return (
    <>
      {/* Donation Reminder Popup */}
      <DonationReminderPopup
        isOpen={showDonationPopup}
        onClose={() => setShowDonationPopup(false)}
        onProceedWithoutDonation={handleProceedWithoutDonation}
        onEnableDonation={handleEnableDonation}
        suggestedDonation={defaultDonation}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Shipping Information */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Shipping Information</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="John Doe"
                    required
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
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
                  {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
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
                  {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
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
                  {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
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
                  {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
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
                  {errors.state && <p className="text-red-500 text-sm mt-1">{errors.state}</p>}
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
                  {errors.zip && <p className="text-red-500 text-sm mt-1">{errors.zip}</p>}
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

            {/* Donation Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Support with a Donation</h3>

              <div className="flex items-center justify-between mb-4">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isDonating}
                    onChange={(e) => handleDonationToggle(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-900 dark:text-white font-medium">
                    Add {donation_percentage}% donation
                  </span>
                </label>

                {!isDonating && (
                  <span className="text-sm text-gray-500 dark:text-gray-400 italic">
                    Recommended to support our mission
                  </span>
                )}
              </div>

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
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white py-4 px-6 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-all disabled:cursor-not-allowed flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
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
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                  Continue to Payment
                </>
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
                <div className="flex justify-between text-blue-600 dark:text-blue-400 font-medium">
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

            {/* Donation Note */}
            {!isDonating && (
              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-xs text-amber-700 dark:text-amber-400 text-center">
                  💝 Consider adding a donation to support our mission
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
