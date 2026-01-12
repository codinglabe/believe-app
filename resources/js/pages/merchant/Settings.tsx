import React, { useState } from 'react'
import { Head, useForm, router } from '@inertiajs/react'
import { MerchantCard, MerchantCardContent, MerchantCardHeader, MerchantCardTitle } from '@/components/merchant-ui'
import { MerchantButton } from '@/components/merchant-ui'
import { MerchantInput } from '@/components/merchant-ui'
import { MerchantLabel } from '@/components/merchant-ui'
import { MerchantTextarea } from '@/components/merchant-ui'
import { MerchantDashboardLayout } from '@/components/merchant'
import { Save, Building2, User, Bell, Shield, CreditCard, Globe } from 'lucide-react'
import { motion } from 'framer-motion'
import { usePage } from '@inertiajs/react'

export default function Settings() {
  const { auth } = usePage().props as any
  const merchant = auth?.user

  const [activeTab, setActiveTab] = useState<'profile' | 'business' | 'notifications' | 'billing' | 'security'>('profile')

  const profileForm = useForm({
    name: merchant?.name || '',
    email: merchant?.email || '',
    phone: merchant?.phone || '',
  })

  const businessForm = useForm({
    business_name: merchant?.business_name || '',
    business_description: merchant?.business_description || '',
    address: merchant?.address || '',
    city: merchant?.city || '',
    state: merchant?.state || '',
    zip_code: merchant?.zip_code || '',
    country: merchant?.country || '',
  })

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    profileForm.patch('/settings/profile', {
      onSuccess: () => {
        // Show success message
      }
    })
  }

  const handleBusinessSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    businessForm.patch('/settings/business', {
      onSuccess: () => {
        // Show success message
      }
    })
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'business', label: 'Business', icon: Building2 },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'security', label: 'Security', icon: Shield },
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
                          {profileForm.processing ? 'Saving...' : 'Save Changes'}
                        </MerchantButton>
                      </div>
                    </form>
                  </MerchantCardContent>
                </MerchantCard>
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

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <MerchantLabel htmlFor="address">Address</MerchantLabel>
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

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <MerchantCard>
                  <MerchantCardHeader>
                    <MerchantCardTitle className="text-white">Notification Preferences</MerchantCardTitle>
                  </MerchantCardHeader>
                  <MerchantCardContent>
                    <div className="space-y-4">
                      <p className="text-gray-400">Notification settings coming soon...</p>
                    </div>
                  </MerchantCardContent>
                </MerchantCard>
              )}

              {/* Billing Tab */}
              {activeTab === 'billing' && (
                <MerchantCard>
                  <MerchantCardHeader>
                    <MerchantCardTitle className="text-white">Billing & Subscription</MerchantCardTitle>
                  </MerchantCardHeader>
                  <MerchantCardContent>
                    <div className="space-y-4">
                      <p className="text-gray-400">Billing settings coming soon...</p>
                    </div>
                  </MerchantCardContent>
                </MerchantCard>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <MerchantCard>
                  <MerchantCardHeader>
                    <MerchantCardTitle className="text-white">Security Settings</MerchantCardTitle>
                  </MerchantCardHeader>
                  <MerchantCardContent>
                    <div className="space-y-4">
                      <p className="text-gray-400">Security settings coming soon...</p>
                    </div>
                  </MerchantCardContent>
                </MerchantCard>
              )}
            </div>
          </div>
        </div>
      </MerchantDashboardLayout>
    </>
  )
}

