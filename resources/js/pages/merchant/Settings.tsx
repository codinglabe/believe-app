import React, { useState, useEffect } from 'react'
import { Head, useForm, router, Link } from '@inertiajs/react'
import { MerchantCard, MerchantCardContent, MerchantCardHeader, MerchantCardTitle } from '@/components/merchant-ui'
import { MerchantButton } from '@/components/merchant-ui'
import { MerchantInput } from '@/components/merchant-ui'
import { MerchantLabel } from '@/components/merchant-ui'
import { MerchantTextarea } from '@/components/merchant-ui'
import { MerchantDashboardLayout } from '@/components/merchant'
import { Save, Building2, User, CreditCard, Globe, Download, CheckCircle2, XCircle, MapPin, Trash2, Star } from 'lucide-react'
import { usePage } from '@inertiajs/react'
import { showSuccessToast, showErrorToast } from '@/lib/toast'

interface Subscription {
  id: number
  stripe_id: string
  stripe_status: string
  stripe_price: string
  quantity: number
  trial_ends_at?: string
  ends_at?: string
  created_at: string
  plan: {
    id: number
    name: string
    price: number
    frequency: string
  } | null
}

interface Invoice {
  id: string
  number: string | null
  amount_paid: number
  amount_due: number
  currency: string
  status: string
  paid: boolean
  subscription_canceled?: boolean
  created: string
  period_start: string | null
  period_end: string | null
  hosted_invoice_url: string | null
  invoice_pdf: string | null
  description: string
}

interface BillingData {
  subscription: Subscription | null
  invoices: Invoice[]
}

interface ShippingAddressRow {
  id: number
  label: string | null
  contact_name: string | null
  address_line1: string
  address_line2: string | null
  city: string
  state: string | null
  zip: string
  country: string
  is_default: boolean
}

interface SettingsProps {
  billingData?: BillingData
  shippingAddresses?: ShippingAddressRow[]
}

export default function Settings({ billingData: initialBillingData, shippingAddresses = [] }: SettingsProps) {
  const { auth, flash } = usePage().props as any
  const merchant = auth?.user

  const [activeTab, setActiveTab] = useState<'profile' | 'business' | 'billing'>('profile')
  const [cancelingSubscription, setCancelingSubscription] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null)
  
  const billingData = initialBillingData || null

  // Flash toasts shown by app-layout; do not duplicate here.

  const handleCancelSubscription = () => {
    if (!billingData?.subscription) return

    setCancelingSubscription(true)
    router.post('/subscription/cancel', {}, {
      onSuccess: () => {
        setShowCancelConfirm(false)
        // Page will reload with updated billing data from Inertia
      },
      onError: (errors) => {
        console.error('Failed to cancel subscription:', errors)
        showErrorToast('Failed to cancel subscription. Please try again.')
      },
      onFinish: () => {
        setCancelingSubscription(false)
      }
    })
  }

  const profileForm = useForm({
    name: merchant?.name || '',
    email: merchant?.email || '',
    phone: merchant?.phone || '',
  })

  const emptyAddressForm = () => ({
    label: '',
    contact_name: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
    is_default: false,
  })

  const addressForm = useForm(emptyAddressForm())

  const businessForm = useForm({
    business_name: merchant?.business_name || '',
    business_description: merchant?.business_description || '',
    website: merchant?.website || '',
    address: merchant?.address || '',
    city: merchant?.city || '',
    state: merchant?.state || '',
    zip_code: merchant?.zip_code || '',
    country: merchant?.country || '',
  })

  // Sync form data when merchant data changes (after save/reload)
  useEffect(() => {
    if (merchant) {
      businessForm.setData({
        business_name: merchant.business_name || '',
        business_description: merchant.business_description || '',
        website: merchant.website || '',
        address: merchant.address || '',
        city: merchant.city || '',
        state: merchant.state || '',
        zip_code: merchant.zip_code || '',
        country: merchant.country || '',
      })
      profileForm.setData({
        name: merchant.name || '',
        email: merchant.email || '',
        phone: merchant.phone || '',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchant?.id, merchant?.website, merchant?.business_name, merchant?.name, merchant?.email])

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    profileForm.patch('/settings/profile', {
      onSuccess: () => {
        showSuccessToast('Profile updated successfully!')
        // Reload merchant data
        router.reload({ only: ['auth'] })
      },
      onError: (errors) => {
        if (errors) {
          showErrorToast('Failed to update profile. Please check the form for errors.')
        }
      }
    })
  }

  const resetAddressForm = () => {
    addressForm.setData(emptyAddressForm())
    addressForm.clearErrors()
    setEditingAddressId(null)
  }

  const startEditAddress = (row: ShippingAddressRow) => {
    setEditingAddressId(row.id)
    addressForm.setData({
      label: row.label || '',
      contact_name: row.contact_name || '',
      address_line1: row.address_line1,
      address_line2: row.address_line2 || '',
      city: row.city,
      state: row.state || '',
      zip: row.zip,
      country: row.country || 'US',
      is_default: row.is_default,
    })
    addressForm.clearErrors()
  }

  const submitShippingAddress = (e: React.FormEvent) => {
    e.preventDefault()
    const opts = {
      preserveScroll: true,
      onSuccess: () => {
        showSuccessToast(editingAddressId ? 'Shipping address updated.' : 'Shipping address added.')
        resetAddressForm()
        router.reload()
      },
      onError: () => showErrorToast('Please fix the errors below.'),
    }
    if (editingAddressId) {
      addressForm.patch(`/settings/shipping-addresses/${editingAddressId}`, opts)
    } else {
      addressForm.post('/settings/shipping-addresses', opts)
    }
  }

  const deleteShippingAddress = (id: number) => {
    if (!confirm('Remove this shipping address?')) return
    router.delete(`/settings/shipping-addresses/${id}`, {
      preserveScroll: true,
      onSuccess: () => {
        showSuccessToast('Shipping address removed.')
        if (editingAddressId === id) resetAddressForm()
        router.reload()
      },
    })
  }

  const setDefaultShippingAddress = (id: number) => {
    router.post(
      `/settings/shipping-addresses/${id}/default`,
      {},
      {
        preserveScroll: true,
        onSuccess: () => {
          showSuccessToast('Default shipping address updated.')
          router.reload()
        },
      }
    )
  }

  const handleBusinessSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    businessForm.patch('/settings/business', {
      onSuccess: () => {
        showSuccessToast('Business information updated successfully!')
        // Reload merchant data
        router.reload({ only: ['auth'] })
      },
      onError: (errors) => {
        if (errors) {
          showErrorToast('Failed to update business information. Please check the form for errors.')
        }
      }
    })
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'business', label: 'Business', icon: Building2 },
    { id: 'billing', label: 'Billing', icon: CreditCard },
  ]

  return (
    <>
      <Head title="Settings - Merchant Dashboard" />
      <MerchantDashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
            <p className="text-gray-400">Manage your account and business preferences</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <MerchantCard>
                <MerchantCardContent className="p-2">
                  <nav className="space-y-1">
                    {tabs.map((tab) => {
                      const Icon = tab.icon
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id as any)}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                            activeTab === tab.id
                              ? 'bg-gradient-to-r from-[#FF1493]/30 via-[#DC143C]/30 to-[#E97451]/30 text-white border-l-2 border-[#FF1493]'
                              : 'text-gray-300 hover:bg-[#FF1493]/10 hover:text-white'
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                          <span className="font-medium">{tab.label}</span>
                        </button>
                      )
                    })}
                  </nav>
                </MerchantCardContent>
              </MerchantCard>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <MerchantCard>
                    <MerchantCardHeader>
                      <MerchantCardTitle className="text-white">Profile Information</MerchantCardTitle>
                    </MerchantCardHeader>
                    <MerchantCardContent>
                      <form onSubmit={handleProfileSubmit} className="space-y-6">
                        <div>
                          <MerchantLabel htmlFor="name">Full Name</MerchantLabel>
                          <MerchantInput
                            id="name"
                            value={profileForm.data.name}
                            onChange={(e) => profileForm.setData('name', e.target.value)}
                            className="mt-1"
                          />
                          {profileForm.errors.name && (
                            <p className="mt-1 text-sm text-red-400">{profileForm.errors.name}</p>
                          )}
                        </div>

                        <div>
                          <MerchantLabel htmlFor="email">Email Address</MerchantLabel>
                          <MerchantInput
                            id="email"
                            type="email"
                            value={profileForm.data.email}
                            onChange={(e) => profileForm.setData('email', e.target.value)}
                            className="mt-1"
                          />
                          {profileForm.errors.email && (
                            <p className="mt-1 text-sm text-red-400">{profileForm.errors.email}</p>
                          )}
                        </div>

                        <div>
                          <MerchantLabel htmlFor="phone">Phone Number</MerchantLabel>
                          <MerchantInput
                            id="phone"
                            type="tel"
                            value={profileForm.data.phone}
                            onChange={(e) => profileForm.setData('phone', e.target.value)}
                            className="mt-1"
                          />
                          {profileForm.errors.phone && (
                            <p className="mt-1 text-sm text-red-400">{profileForm.errors.phone}</p>
                          )}
                        </div>

                        <div className="flex justify-end pt-4">
                          <MerchantButton type="submit" disabled={profileForm.processing}>
                            <Save className="w-4 h-4 mr-2" />
                            {profileForm.processing ? 'Saving...' : 'Save profile'}
                          </MerchantButton>
                        </div>
                      </form>
                    </MerchantCardContent>
                  </MerchantCard>

                  <MerchantCard>
                    <MerchantCardHeader>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-[#FF1493]" />
                        <MerchantCardTitle className="text-white">Shipping addresses</MerchantCardTitle>
                      </div>
                    </MerchantCardHeader>
                    <MerchantCardContent className="space-y-6">
                      <p className="text-sm text-gray-400">
                        Add one or more ship-from locations for marketplace orders. The default address is used for
                        carrier rates and labels. If you have none saved, your business address from the Business tab is
                        used.
                      </p>

                      {shippingAddresses.length > 0 && (
                        <ul className="space-y-3">
                          {shippingAddresses.map((row) => (
                            <li
                              key={row.id}
                              className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 p-4 rounded-lg border border-[#FF1493]/20 bg-black/40"
                            >
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  <span className="font-medium text-white">
                                    {row.label?.trim() || 'Shipping location'}
                                  </span>
                                  {row.is_default && (
                                    <span className="text-xs px-2 py-0.5 rounded bg-[#FF1493]/20 text-[#FF1493]">
                                      Default
                                    </span>
                                  )}
                                </div>
                                {row.contact_name && (
                                  <p className="text-sm text-gray-300">{row.contact_name}</p>
                                )}
                                <p className="text-sm text-gray-400">
                                  {row.address_line1}
                                  {row.address_line2 ? `, ${row.address_line2}` : ''}
                                </p>
                                <p className="text-sm text-gray-400">
                                  {[row.city, row.state, row.zip].filter(Boolean).join(', ')} {row.country}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2 shrink-0">
                                {!row.is_default && (
                                  <MerchantButton
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setDefaultShippingAddress(row.id)}
                                    title="Set as default"
                                  >
                                    <Star className="w-4 h-4 mr-1" />
                                    Default
                                  </MerchantButton>
                                )}
                                <MerchantButton
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => startEditAddress(row)}
                                >
                                  Edit
                                </MerchantButton>
                                <MerchantButton
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="border-red-500/40 text-red-400"
                                  onClick={() => deleteShippingAddress(row.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </MerchantButton>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}

                      <form onSubmit={submitShippingAddress} className="space-y-4 pt-2 border-t border-[#FF1493]/20">
                        <h3 className="text-white font-medium">
                          {editingAddressId ? 'Edit address' : 'Add address'}
                        </h3>
                        <div>
                          <MerchantLabel htmlFor="addr_label">Label (optional)</MerchantLabel>
                          <MerchantInput
                            id="addr_label"
                            value={addressForm.data.label}
                            onChange={(e) => addressForm.setData('label', e.target.value)}
                            className="mt-1"
                            placeholder="e.g. Main warehouse"
                          />
                          {addressForm.errors.label && (
                            <p className="mt-1 text-sm text-red-400">{addressForm.errors.label}</p>
                          )}
                        </div>
                        <div>
                          <MerchantLabel htmlFor="addr_contact">Ship-from contact name (optional)</MerchantLabel>
                          <MerchantInput
                            id="addr_contact"
                            value={addressForm.data.contact_name}
                            onChange={(e) => addressForm.setData('contact_name', e.target.value)}
                            className="mt-1"
                          />
                          {addressForm.errors.contact_name && (
                            <p className="mt-1 text-sm text-red-400">{addressForm.errors.contact_name}</p>
                          )}
                        </div>
                        <div>
                          <MerchantLabel htmlFor="addr_line1">Street address</MerchantLabel>
                          <MerchantInput
                            id="addr_line1"
                            value={addressForm.data.address_line1}
                            onChange={(e) => addressForm.setData('address_line1', e.target.value)}
                            className="mt-1"
                          />
                          {addressForm.errors.address_line1 && (
                            <p className="mt-1 text-sm text-red-400">{addressForm.errors.address_line1}</p>
                          )}
                        </div>
                        <div>
                          <MerchantLabel htmlFor="addr_line2">Apt / suite (optional)</MerchantLabel>
                          <MerchantInput
                            id="addr_line2"
                            value={addressForm.data.address_line2}
                            onChange={(e) => addressForm.setData('address_line2', e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <MerchantLabel htmlFor="addr_city">City</MerchantLabel>
                            <MerchantInput
                              id="addr_city"
                              value={addressForm.data.city}
                              onChange={(e) => addressForm.setData('city', e.target.value)}
                              className="mt-1"
                            />
                            {addressForm.errors.city && (
                              <p className="mt-1 text-sm text-red-400">{addressForm.errors.city}</p>
                            )}
                          </div>
                          <div>
                            <MerchantLabel htmlFor="addr_state">State / region</MerchantLabel>
                            <MerchantInput
                              id="addr_state"
                              value={addressForm.data.state}
                              onChange={(e) => addressForm.setData('state', e.target.value)}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <MerchantLabel htmlFor="addr_zip">ZIP / postal code</MerchantLabel>
                            <MerchantInput
                              id="addr_zip"
                              value={addressForm.data.zip}
                              onChange={(e) => addressForm.setData('zip', e.target.value)}
                              className="mt-1"
                            />
                            {addressForm.errors.zip && (
                              <p className="mt-1 text-sm text-red-400">{addressForm.errors.zip}</p>
                            )}
                          </div>
                          <div>
                            <MerchantLabel htmlFor="addr_country">Country</MerchantLabel>
                            <MerchantInput
                              id="addr_country"
                              value={addressForm.data.country}
                              onChange={(e) => addressForm.setData('country', e.target.value)}
                              className="mt-1"
                              placeholder="US"
                            />
                            {addressForm.errors.country && (
                              <p className="mt-1 text-sm text-red-400">{addressForm.errors.country}</p>
                            )}
                          </div>
                        </div>
                        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={addressForm.data.is_default}
                            onChange={(e) => addressForm.setData('is_default', e.target.checked)}
                            className="rounded border-gray-600 bg-black/50 text-[#FF1493] focus:ring-[#FF1493]"
                          />
                          Use as default ship-from address
                        </label>
                        <div className="flex flex-wrap gap-2 justify-end">
                          {editingAddressId && (
                            <MerchantButton type="button" variant="outline" onClick={resetAddressForm}>
                              Cancel edit
                            </MerchantButton>
                          )}
                          <MerchantButton type="submit" disabled={addressForm.processing}>
                            <Save className="w-4 h-4 mr-2" />
                            {addressForm.processing ? 'Saving...' : editingAddressId ? 'Update address' : 'Add address'}
                          </MerchantButton>
                        </div>
                      </form>
                    </MerchantCardContent>
                  </MerchantCard>
                </div>
              )}

              {/* Business Tab */}
              {activeTab === 'business' && (
                <MerchantCard>
                  <MerchantCardHeader>
                    <MerchantCardTitle className="text-white">Business Information</MerchantCardTitle>
                  </MerchantCardHeader>
                  <MerchantCardContent>
                    <form onSubmit={handleBusinessSubmit} className="space-y-6">
                      <div>
                        <MerchantLabel htmlFor="business_name">Business Name</MerchantLabel>
                        <MerchantInput
                          id="business_name"
                          value={businessForm.data.business_name}
                          onChange={(e) => businessForm.setData('business_name', e.target.value)}
                          className="mt-1"
                        />
                        {businessForm.errors.business_name && (
                          <p className="mt-1 text-sm text-red-400">{businessForm.errors.business_name}</p>
                        )}
                      </div>

                      <div>
                        <MerchantLabel htmlFor="business_description">Business Description</MerchantLabel>
                        <MerchantTextarea
                          id="business_description"
                          value={businessForm.data.business_description}
                          onChange={(e) => businessForm.setData('business_description', e.target.value)}
                          rows={4}
                          className="mt-1"
                        />
                        {businessForm.errors.business_description && (
                          <p className="mt-1 text-sm text-red-400">{businessForm.errors.business_description}</p>
                        )}
                      </div>

                      <div>
                        <MerchantLabel htmlFor="website">Website</MerchantLabel>
                        <div className="relative mt-1">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Globe className="h-5 w-5 text-gray-400" />
                          </div>
                          <MerchantInput
                            id="website"
                            type="url"
                            placeholder="https://example.com"
                            value={businessForm.data.website}
                            onChange={(e) => businessForm.setData('website', e.target.value)}
                            className="pl-10"
                          />
                        </div>
                        {businessForm.errors.website && (
                          <p className="mt-1 text-sm text-red-400">{businessForm.errors.website}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-400">Optional: Your business website URL</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <MerchantLabel htmlFor="address">Business address</MerchantLabel>
                          <MerchantInput
                            id="address"
                            value={businessForm.data.address}
                            onChange={(e) => businessForm.setData('address', e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <MerchantLabel htmlFor="city">City</MerchantLabel>
                          <MerchantInput
                            id="city"
                            value={businessForm.data.city}
                            onChange={(e) => businessForm.setData('city', e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <MerchantLabel htmlFor="state">State</MerchantLabel>
                          <MerchantInput
                            id="state"
                            value={businessForm.data.state}
                            onChange={(e) => businessForm.setData('state', e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <MerchantLabel htmlFor="zip_code">Zip Code</MerchantLabel>
                          <MerchantInput
                            id="zip_code"
                            value={businessForm.data.zip_code}
                            onChange={(e) => businessForm.setData('zip_code', e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <MerchantLabel htmlFor="country">Country</MerchantLabel>
                          <MerchantInput
                            id="country"
                            value={businessForm.data.country}
                            onChange={(e) => businessForm.setData('country', e.target.value)}
                            className="mt-1"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-4">
                        <MerchantButton type="submit" disabled={businessForm.processing}>
                          <Save className="w-4 h-4 mr-2" />
                          {businessForm.processing ? 'Saving...' : 'Save Changes'}
                        </MerchantButton>
                      </div>
                    </form>
                  </MerchantCardContent>
                </MerchantCard>
              )}

              {/* Billing Tab */}
              {activeTab === 'billing' && (
                <div className="space-y-6">
                  {/* Current Subscription */}
                  <MerchantCard>
                    <MerchantCardHeader>
                      <MerchantCardTitle className="text-white">Current Subscription</MerchantCardTitle>
                    </MerchantCardHeader>
                    <MerchantCardContent>
                      {billingData?.subscription ? (
                        <div className="space-y-4">
                          <div className="flex items-start justify-between p-4 rounded-lg bg-gradient-to-br from-[#FF1493]/10 via-[#DC143C]/10 to-[#E97451]/10 border border-[#FF1493]/20">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-semibold text-white">
                                  {billingData.subscription.plan?.name || 'Subscription'}
                                </h3>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  billingData.subscription.stripe_status === 'active' 
                                    ? 'bg-green-500/20 text-green-400' 
                                    : billingData.subscription.stripe_status === 'trialing'
                                    ? 'bg-blue-500/20 text-blue-400'
                                    : 'bg-yellow-500/20 text-yellow-400'
                                }`}>
                                  {billingData.subscription.stripe_status.charAt(0).toUpperCase() + billingData.subscription.stripe_status.slice(1)}
                                </span>
                              </div>
                              {billingData.subscription.plan && (
                                <p className="text-gray-300 mb-1">
                                  ${billingData.subscription.plan.price.toFixed(2)} / {billingData.subscription.plan.frequency === 'monthly' ? 'month' : 'year'}
                                </p>
                              )}
                              {billingData.subscription.trial_ends_at && (
                                <p className="text-sm text-gray-400">
                                  Trial ends: {new Date(billingData.subscription.trial_ends_at).toLocaleDateString()}
                                </p>
                              )}
                              {billingData.subscription.ends_at && (
                                <p className="text-sm text-gray-400">
                                  Cancels on: {new Date(billingData.subscription.ends_at).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col gap-2">
                              <Link href="/subscription">
                                <MerchantButton variant="outline" size="sm" className="w-full">
                                  Manage
                                </MerchantButton>
                              </Link>
                              {!billingData.subscription.ends_at && (
                                <>
                                  {!showCancelConfirm ? (
                                    <MerchantButton
                                      variant="outline"
                                      size="sm"
                                      className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10"
                                      onClick={() => setShowCancelConfirm(true)}
                                    >
                                      Cancel Subscription
                                    </MerchantButton>
                                  ) : (
                                    <div className="flex flex-col gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                                      <p className="text-xs text-gray-300 mb-2">
                                        Are you sure you want to cancel? Your subscription will remain active until the end of the billing period.
                                      </p>
                                      <div className="flex gap-2">
                                        <MerchantButton
                                          size="sm"
                                          className="flex-1 bg-red-500 hover:bg-red-600"
                                          onClick={handleCancelSubscription}
                                          disabled={cancelingSubscription}
                                        >
                                          {cancelingSubscription ? 'Canceling...' : 'Confirm Cancel'}
                                        </MerchantButton>
                                        <MerchantButton
                                          variant="outline"
                                          size="sm"
                                          className="flex-1"
                                          onClick={() => setShowCancelConfirm(false)}
                                          disabled={cancelingSubscription}
                                        >
                                          Keep
                                        </MerchantButton>
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-gray-400 mb-4">No active subscription</p>
                          <Link href="/subscription">
                            <MerchantButton>
                              View Plans
                            </MerchantButton>
                          </Link>
                        </div>
                      )}
                    </MerchantCardContent>
                  </MerchantCard>

                  {/* Billing History */}
                  <MerchantCard>
                    <MerchantCardHeader>
                      <MerchantCardTitle className="text-white">Billing History</MerchantCardTitle>
                    </MerchantCardHeader>
                    <MerchantCardContent>
                      {billingData?.invoices && billingData.invoices.length > 0 ? (
                        <div className="space-y-3">
                          {billingData.invoices.map((invoice) => (
                            <div
                              key={invoice.id}
                              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg border border-[#FF1493]/20 bg-black/50 hover:bg-black/70 transition-colors"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-2">
                                  <h4 className="text-white font-medium">
                                    {invoice.description}
                                  </h4>
                                  {invoice.subscription_canceled ? (
                                    <span className="px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-400 flex-shrink-0">
                                      Cancelled
                                    </span>
                                  ) : invoice.paid ? (
                                    <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                                  ) : (
                                    <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                                  {invoice.number && (
                                    <span>Invoice #{invoice.number}</span>
                                  )}
                                  <span>
                                    {new Date(invoice.created).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric'
                                    })}
                                  </span>
                                  {invoice.period_start && invoice.period_end && (
                                    <span>
                                      {new Date(invoice.period_start).toLocaleDateString()} - {new Date(invoice.period_end).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <p className="text-white font-semibold">
                                    ${invoice.amount_paid.toFixed(2)} {invoice.currency}
                                  </p>
                                  {!invoice.paid && invoice.amount_due > 0 && (
                                    <p className="text-sm text-red-400">
                                      ${invoice.amount_due.toFixed(2)} due
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {invoice.invoice_pdf && (
                                    <a
                                      href={invoice.invoice_pdf}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-2 rounded-lg border border-[#FF1493]/20 text-[#FF1493] hover:bg-[#FF1493]/10 transition-colors"
                                      title="Download PDF"
                                    >
                                      <Download className="w-4 h-4" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-gray-400">No invoices found</p>
                        </div>
                      )}
                    </MerchantCardContent>
                  </MerchantCard>
                </div>
              )}
            </div>
          </div>
        </div>
      </MerchantDashboardLayout>
    </>
  )
}

