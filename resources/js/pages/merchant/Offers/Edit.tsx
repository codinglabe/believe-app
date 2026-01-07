import React, { useState } from 'react'
import { Head, Link, useForm } from '@inertiajs/react'
import { MerchantCard, MerchantCardContent, MerchantCardHeader, MerchantCardTitle } from '@/components/merchant-ui'
import { MerchantButton } from '@/components/merchant-ui'
import { MerchantInput } from '@/components/merchant-ui'
import { MerchantLabel } from '@/components/merchant-ui'
import { MerchantTextarea } from '@/components/merchant-ui'
import { MerchantDashboardLayout } from '@/components/merchant'
import { Upload, X, ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'

interface Props {
  offerId: string
}

export default function OfferEdit({ offerId }: Props) {
  // Mock existing offer data - replace with actual data from backend
  const existingOffer = {
    id: offerId,
    title: 'Wireless Earbuds',
    description: 'Premium wireless earbuds with noise cancellation and long battery life.',
    image: '/placeholder.jpg',
    pointsRequired: 10000,
    cashRequired: 25,
    category: 'Electronics',
    limitPerMember: 1,
    validUntil: '2024-12-31',
    redemptionRules: 'Limit 1 per member\nValid for in-store redemption only\nCannot be combined with other offers'
  }

  const { data, setData, post, processing, errors } = useForm({
    title: existingOffer.title,
    description: existingOffer.description,
    points_required: existingOffer.pointsRequired.toString(),
    cash_required: existingOffer.cashRequired?.toString() || '',
    image: null as File | null,
    category: existingOffer.category,
    limit_per_member: existingOffer.limitPerMember.toString(),
    redemption_rules: existingOffer.redemptionRules,
    valid_until: existingOffer.validUntil,
  })

  const [imagePreview, setImagePreview] = useState<string | null>(existingOffer.image)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setData('image', file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    post(`/offers/${offerId}`, {
      forceFormData: true,
      _method: 'PUT',
    })
  }

  return (
    <>
      <Head title={`Edit Offer - Merchant Dashboard`} />
      <MerchantDashboardLayout>
        <div className="w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="mb-6">
              <Link href={`/offers/${offerId}`}>
                <MerchantButton variant="outline" size="sm" className="mb-4">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Offer
                </MerchantButton>
              </Link>
              <h1 className="text-3xl font-bold text-white mb-2">Edit Offer</h1>
              <p className="text-gray-400">Update the details of your offer</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Main Details */}
                <div className="lg:col-span-2 space-y-6">
                  <MerchantCard className="shadow-2xl">
                    <MerchantCardHeader>
                      <MerchantCardTitle className="text-white">Basic Information</MerchantCardTitle>
                    </MerchantCardHeader>
                    <MerchantCardContent className="space-y-6">
                      {/* Image Upload */}
                      <div>
                        <MerchantLabel>Offer Image</MerchantLabel>
                        <div className="mt-2">
                          {imagePreview ? (
                            <div className="relative w-full h-64 rounded-lg overflow-hidden border-2 border-[#FF1493]/30 hover:border-[#FF1493]/50 transition-colors">
                              <img
                                src={imagePreview}
                                alt="Preview"
                                className="w-full h-full object-cover"
                              />
                              <MerchantButton
                                type="button"
                                variant="outline"
                                size="icon"
                                className="absolute top-2 right-2 bg-red-500/20 hover:bg-red-500/30 border-red-500/50"
                                onClick={() => {
                                  setImagePreview(null)
                                  setData('image', null)
                                }}
                              >
                                <X className="w-4 h-4" />
                              </MerchantButton>
                            </div>
                          ) : (
                            <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-[#FF1493]/30 border-dashed rounded-lg cursor-pointer bg-black/30 hover:bg-black/50 hover:border-[#FF1493]/50 transition-all group">
                              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <Upload className="w-10 h-10 mb-3 text-[#FF1493] group-hover:text-[#DC143C] transition-colors" />
                                <p className="mb-2 text-sm text-gray-300 group-hover:text-white">
                                  <span className="font-semibold">Click to upload</span> or drag and drop
                                </p>
                                <p className="text-xs text-gray-400">
                                  PNG, JPG or GIF (MAX. 800x400px)
                                </p>
                              </div>
                              <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={handleImageChange}
                              />
                            </label>
                          )}
                        </div>
                        {errors.image && (
                          <p className="mt-1 text-sm text-red-400">{errors.image}</p>
                        )}
                      </div>

                      {/* Title */}
                      <div>
                        <MerchantLabel htmlFor="title">Offer Title *</MerchantLabel>
                        <MerchantInput
                          id="title"
                          value={data.title}
                          onChange={(e) => setData('title', e.target.value)}
                          placeholder="e.g., Wireless Earbuds"
                          required
                        />
                        {errors.title && (
                          <p className="mt-1 text-sm text-red-400">{errors.title}</p>
                        )}
                      </div>

                      {/* Description */}
                      <div>
                        <MerchantLabel htmlFor="description">Description *</MerchantLabel>
                        <MerchantTextarea
                          id="description"
                          value={data.description}
                          onChange={(e) => setData('description', e.target.value)}
                          placeholder="Describe your offer in detail..."
                          rows={4}
                          required
                        />
                        {errors.description && (
                          <p className="mt-1 text-sm text-red-400">{errors.description}</p>
                        )}
                      </div>

                      {/* Pricing */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <MerchantLabel htmlFor="points_required">Points Required *</MerchantLabel>
                          <MerchantInput
                            id="points_required"
                            type="number"
                            value={data.points_required}
                            onChange={(e) => setData('points_required', e.target.value)}
                            placeholder="10000"
                            required
                          />
                          {errors.points_required && (
                            <p className="mt-1 text-sm text-red-400">{errors.points_required}</p>
                          )}
                        </div>

                        <div>
                          <MerchantLabel htmlFor="cash_required">Cash Required (Optional)</MerchantLabel>
                          <MerchantInput
                            id="cash_required"
                            type="number"
                            step="0.01"
                            value={data.cash_required}
                            onChange={(e) => setData('cash_required', e.target.value)}
                            placeholder="25.00"
                          />
                          {errors.cash_required && (
                            <p className="mt-1 text-sm text-red-400">{errors.cash_required}</p>
                          )}
                        </div>
                      </div>

                      {/* Category */}
                      <div>
                        <MerchantLabel htmlFor="category">Category</MerchantLabel>
                        <MerchantInput
                          id="category"
                          value={data.category}
                          onChange={(e) => setData('category', e.target.value)}
                          placeholder="e.g., Electronics, Dining, Services"
                        />
                        {errors.category && (
                          <p className="mt-1 text-sm text-red-400">{errors.category}</p>
                        )}
                      </div>
                    </MerchantCardContent>
                  </MerchantCard>

                  {/* Additional Details Card */}
                  <MerchantCard className="shadow-2xl">
                    <MerchantCardHeader>
                      <MerchantCardTitle className="text-white">Additional Details</MerchantCardTitle>
                    </MerchantCardHeader>
                    <MerchantCardContent className="space-y-6">
                      {/* Redemption Rules */}
                      <div>
                        <MerchantLabel htmlFor="redemption_rules">Redemption Rules</MerchantLabel>
                        <MerchantTextarea
                          id="redemption_rules"
                          value={data.redemption_rules}
                          onChange={(e) => setData('redemption_rules', e.target.value)}
                          placeholder="e.g., Limit 1 per member, Valid for in-store redemption only"
                          rows={3}
                        />
                        {errors.redemption_rules && (
                          <p className="mt-1 text-sm text-red-400">{errors.redemption_rules}</p>
                        )}
                      </div>

                      {/* Limit and Validity */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <MerchantLabel htmlFor="limit_per_member">Limit per Member</MerchantLabel>
                          <MerchantInput
                            id="limit_per_member"
                            type="number"
                            value={data.limit_per_member}
                            onChange={(e) => setData('limit_per_member', e.target.value)}
                            placeholder="1"
                          />
                          {errors.limit_per_member && (
                            <p className="mt-1 text-sm text-red-400">{errors.limit_per_member}</p>
                          )}
                        </div>

                        <div>
                          <MerchantLabel htmlFor="valid_until">Valid Until (Optional)</MerchantLabel>
                          <MerchantInput
                            id="valid_until"
                            type="date"
                            value={data.valid_until}
                            onChange={(e) => setData('valid_until', e.target.value)}
                          />
                          {errors.valid_until && (
                            <p className="mt-1 text-sm text-red-400">{errors.valid_until}</p>
                          )}
                        </div>
                      </div>
                    </MerchantCardContent>
                  </MerchantCard>
                </div>

                {/* Right Column - Summary/Actions */}
                <div className="lg:col-span-1">
                  <MerchantCard className="shadow-2xl sticky top-24">
                    <MerchantCardHeader>
                      <MerchantCardTitle className="text-white">Offer Summary</MerchantCardTitle>
                    </MerchantCardHeader>
                    <MerchantCardContent className="space-y-4">
                      <div className="p-4 bg-gradient-to-br from-[#FF1493]/10 via-[#DC143C]/10 to-[#E97451]/10 rounded-lg border border-[#FF1493]/20">
                        <p className="text-sm text-gray-400 mb-2">Preview</p>
                        {data.title ? (
                          <p className="font-semibold text-white">{data.title}</p>
                        ) : (
                          <p className="text-gray-500 italic">Enter offer title</p>
                        )}
                      </div>

                      <div className="space-y-3 pt-4 border-t border-[#FF1493]/20">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Points Required:</span>
                          <span className="text-sm font-semibold text-[#FF1493]">
                            {data.points_required ? parseInt(data.points_required).toLocaleString() : '0'}
                          </span>
                        </div>
                        {data.cash_required && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-400">Cash Required:</span>
                            <span className="text-sm font-semibold text-white">
                              ${parseFloat(data.cash_required).toFixed(2)}
                            </span>
                          </div>
                        )}
                        {data.category && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-400">Category:</span>
                            <span className="text-sm font-semibold text-white">{data.category}</span>
                          </div>
                        )}
                      </div>
                    </MerchantCardContent>
                  </MerchantCard>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-4 pt-6 border-t border-[#FF1493]/20">
                <Link href={`/offers/${offerId}`} className="flex-1">
                  <MerchantButton type="button" variant="outline" className="w-full">
                    Cancel
                  </MerchantButton>
                </Link>
                <MerchantButton type="submit" disabled={processing} className="flex-1 bg-gradient-to-r from-[#FF1493] via-[#DC143C] to-[#E97451] hover:from-[#FF1FA3] hover:via-[#EC1F4C] hover:to-[#F98461]">
                  {processing ? 'Updating...' : 'Update Offer'}
                </MerchantButton>
              </div>
            </form>
          </motion.div>
        </div>
      </MerchantDashboardLayout>
    </>
  )
}

