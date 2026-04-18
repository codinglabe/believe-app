import React, { useEffect } from 'react'
import { Head, Link, useForm, router, usePage } from '@inertiajs/react'
import { MerchantCard, MerchantCardContent, MerchantCardHeader, MerchantCardTitle } from '@/components/merchant-ui'
import { MerchantButton } from '@/components/merchant-ui'
import { MerchantInput } from '@/components/merchant-ui'
import { MerchantLabel } from '@/components/merchant-ui'
import { MerchantTextarea } from '@/components/merchant-ui'
import { MerchantDashboardLayout } from '@/components/merchant'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ImageUpload } from '@/components/admin/ImageUpload'
import { ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import { showSuccessToast, showErrorToast } from '@/lib/toast'

interface MerchantHubCategory {
  id: number
  name: string
  slug: string
}

interface CreateOfferProps {
  categories: MerchantHubCategory[]
}

export default function CreateOffer({ categories }: CreateOfferProps) {
  const { data, setData, post, processing, errors } = useForm({
    merchant_hub_category_id: '',
    title: '',
    short_description: '',
    description: '',
    reference_price: '' as string | number,
    discount_percentage: 5 as number,
    discount_cap: '' as string | number,
    image: null as File | null,
    currency: 'USD',
    inventory_qty: '',
    starts_at: '',
    ends_at: '',
    status: 'draft' as 'draft' | 'active' | 'paused' | 'expired',
    pickup_available: false,
  })

  // Live calculator: BIU rules — $1 discount = 1,000 points
  const price = Number(data.reference_price) || 0
  const pct = Number(data.discount_percentage) || 0
  const discountAmount = price > 0 && pct >= 1 && pct <= 10 ? Math.round(price * (pct / 100) * 100) / 100 : 0
  const pointsRequired = Math.round(discountAmount * 1000)
  const customerPays = Math.round((price - discountAmount) * 100) / 100

  const { props } = usePage<{ success?: string; error?: string }>()

  // Show flash messages
  useEffect(() => {
    if (props.success) {
      showSuccessToast(props.success)
    }
    if (props.error) {
      showErrorToast(props.error)
    }
  }, [props.success, props.error])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    post('/offers', {
      forceFormData: true,
      onSuccess: () => {
        router.visit('/offers')
      },
    })
  }

  return (
    <>
      <Head title="Create Offer - Merchant Dashboard" />
      <MerchantDashboardLayout>
        <div className="w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Create New Offer</h1>
                <p className="text-gray-400">Fill in the details below to create a new offer for your customers</p>
              </div>
              <Link href="/offers">
                <MerchantButton type="button" variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Offers
                </MerchantButton>
              </Link>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 1. Offer information */}
              <MerchantCard className="shadow-xl">
                <MerchantCardHeader>
                  <MerchantCardTitle className="text-white">Offer information</MerchantCardTitle>
                  <p className="text-sm text-gray-400 mt-1">Basic details and description</p>
                </MerchantCardHeader>
                <MerchantCardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <MerchantLabel htmlFor="merchant_hub_category_id">Category *</MerchantLabel>
                      <Select
                        value={data.merchant_hub_category_id}
                        onValueChange={(value) => setData('merchant_hub_category_id', value)}
                      >
                        <SelectTrigger className={`mt-1 bg-gray-900/50 border-[#2563EB]/40 text-white ${errors.merchant_hub_category_id ? 'border-red-500' : ''}`}>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id.toString()}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.merchant_hub_category_id && (
                        <p className="mt-1 text-sm text-red-400">{errors.merchant_hub_category_id}</p>
                      )}
                    </div>
                    <div>
                      <MerchantLabel htmlFor="title">Title *</MerchantLabel>
                      <MerchantInput
                        id="title"
                        value={data.title}
                        onChange={(e) => setData('title', e.target.value)}
                        placeholder="e.g., 50% Off Electronics"
                        className={`mt-1 ${errors.title ? 'border-red-500' : ''}`}
                        required
                      />
                      {errors.title && (
                        <p className="mt-1 text-sm text-red-400">{errors.title}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <MerchantLabel htmlFor="short_description">Short description</MerchantLabel>
                    <MerchantInput
                      id="short_description"
                      value={data.short_description}
                      onChange={(e) => setData('short_description', e.target.value)}
                      placeholder="Brief summary (max 500 characters)"
                      maxLength={500}
                      className={`mt-1 ${errors.short_description ? 'border-red-500' : ''}`}
                    />
                    {errors.short_description && (
                      <p className="mt-1 text-sm text-red-400">{errors.short_description}</p>
                    )}
                  </div>
                  <div>
                    <MerchantLabel htmlFor="description">Description *</MerchantLabel>
                    <MerchantTextarea
                      id="description"
                      value={data.description}
                      onChange={(e) => setData('description', e.target.value)}
                      placeholder="Full description of the offer"
                      rows={4}
                      className={`mt-1 ${errors.description ? 'border-red-500' : ''}`}
                      required
                    />
                    {errors.description && (
                      <p className="mt-1 text-sm text-red-400">{errors.description}</p>
                    )}
                  </div>
                  <div>
                    <ImageUpload
                      label="Offer image"
                      value={null}
                      onChange={(file) => setData('image', file)}
                      processing={processing}
                    />
                    <p className="text-xs text-gray-400 mt-1">Max 5MB</p>
                    {errors.image && (
                      <p className="mt-1 text-sm text-red-400">{errors.image}</p>
                    )}
                  </div>
                </MerchantCardContent>
              </MerchantCard>

              {/* 2. Pricing & points */}
              <MerchantCard className="shadow-xl">
                <MerchantCardHeader>
                  <MerchantCardTitle className="text-white">Pricing & points</MerchantCardTitle>
                  <p className="text-sm text-gray-400 mt-1">Discount 1–10%. Points are calculated automatically.</p>
                </MerchantCardHeader>
                <MerchantCardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <MerchantLabel htmlFor="reference_price">Retail / product price *</MerchantLabel>
                      <MerchantInput
                        id="reference_price"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={data.reference_price === '' ? '' : data.reference_price}
                        onChange={(e) => setData('reference_price', e.target.value ? Number(e.target.value) : '')}
                        placeholder="e.g. 100"
                        className={`mt-1 ${errors.reference_price ? 'border-red-500' : ''}`}
                        required
                      />
                      {errors.reference_price && (
                        <p className="mt-1 text-sm text-red-400">{errors.reference_price}</p>
                      )}
                    </div>
                    <div>
                      <MerchantLabel htmlFor="discount_percentage">Discount % *</MerchantLabel>
                      <Select
                        value={String(data.discount_percentage)}
                        onValueChange={(value) => setData('discount_percentage', Number(value))}
                      >
                        <SelectTrigger className={`mt-1 bg-gray-900/50 border-[#2563EB]/40 text-white ${errors.discount_percentage ? 'border-red-500' : ''}`}>
                          <SelectValue placeholder="Select %" />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                            <SelectItem key={n} value={String(n)}>{n}%</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.discount_percentage && (
                        <p className="mt-1 text-sm text-red-400">{errors.discount_percentage}</p>
                      )}
                    </div>
                    <div>
                      <MerchantLabel htmlFor="currency">Currency</MerchantLabel>
                      <Select
                        value={data.currency}
                        onValueChange={(value) => setData('currency', value)}
                      >
                        <SelectTrigger className="mt-1 bg-gray-900/50 border-[#2563EB]/40 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-lg bg-gray-900/50 border border-gray-700/50 p-4">
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Discount amount</p>
                      <p className="text-lg font-bold text-[#2563EB]">${discountAmount.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Points required</p>
                      <p className="text-lg font-bold text-white">{pointsRequired.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Customer pays (points)</p>
                      <p className="text-lg font-bold text-green-400">${customerPays.toFixed(2)}</p>
                    </div>
                  </div>
                </MerchantCardContent>
              </MerchantCard>

              {/* 3. Availability & publish */}
              <MerchantCard className="shadow-xl">
                <MerchantCardHeader>
                  <MerchantCardTitle className="text-white">Availability & publish</MerchantCardTitle>
                  <p className="text-sm text-gray-400 mt-1">Inventory, dates and status</p>
                </MerchantCardHeader>
                <MerchantCardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <MerchantLabel htmlFor="inventory_qty">Inventory quantity</MerchantLabel>
                      <MerchantInput
                        id="inventory_qty"
                        type="number"
                        min="0"
                        value={data.inventory_qty}
                        onChange={(e) => setData('inventory_qty', e.target.value)}
                        placeholder="Unlimited if empty"
                        className={`mt-1 ${errors.inventory_qty ? 'border-red-500' : ''}`}
                      />
                      {errors.inventory_qty && (
                        <p className="mt-1 text-sm text-red-400">{errors.inventory_qty}</p>
                      )}
                    </div>
                    <div>
                      <MerchantLabel htmlFor="starts_at">Starts at</MerchantLabel>
                      <MerchantInput
                        id="starts_at"
                        type="datetime-local"
                        value={data.starts_at}
                        onChange={(e) => setData('starts_at', e.target.value)}
                        className={`mt-1 ${errors.starts_at ? 'border-red-500' : ''}`}
                      />
                      {errors.starts_at && (
                        <p className="mt-1 text-sm text-red-400">{errors.starts_at}</p>
                      )}
                    </div>
                    <div>
                      <MerchantLabel htmlFor="ends_at">Ends at</MerchantLabel>
                      <MerchantInput
                        id="ends_at"
                        type="datetime-local"
                        value={data.ends_at}
                        onChange={(e) => setData('ends_at', e.target.value)}
                        className={`mt-1 ${errors.ends_at ? 'border-red-500' : ''}`}
                      />
                      {errors.ends_at && (
                        <p className="mt-1 text-sm text-red-400">{errors.ends_at}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      id="pickup_available"
                      type="checkbox"
                      checked={data.pickup_available}
                      onChange={(e) => setData('pickup_available', e.target.checked)}
                      className="rounded border-gray-600"
                    />
                    <label htmlFor="pickup_available" className="text-sm text-gray-300">
                      Allow local pickup (buyer pays no shipping; your business address is shown at checkout)
                    </label>
                  </div>
                  <div className="max-w-xs">
                    <MerchantLabel htmlFor="status">Status *</MerchantLabel>
                    <Select
                      value={data.status}
                      onValueChange={(value) => setData('status', value as 'draft' | 'active' | 'paused' | 'expired')}
                    >
                      <SelectTrigger className={`mt-1 bg-gray-900/50 border-[#2563EB]/40 text-white ${errors.status ? 'border-red-500' : ''}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.status && (
                      <p className="mt-1 text-sm text-red-400">{errors.status}</p>
                    )}
                  </div>
                </MerchantCardContent>
              </MerchantCard>

              {/* Submit */}
              <div className="flex flex-wrap justify-end gap-3 pt-2">
                <Link href="/offers">
                  <MerchantButton type="button" variant="outline">
                    Cancel
                  </MerchantButton>
                </Link>
                <MerchantButton type="submit" disabled={processing} className="bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:from-[#FF1FA3] hover:via-[#EC1F4C] hover:to-[#F98461]">
                  {processing ? 'Creating...' : 'Create Offer'}
                </MerchantButton>
              </div>
            </form>
          </motion.div>
        </div>
      </MerchantDashboardLayout>
    </>
  )
}

