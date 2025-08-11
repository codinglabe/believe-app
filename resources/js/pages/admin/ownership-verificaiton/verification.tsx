"use client"
import React, { useState } from "react"
import { Head, router, useForm, usePage } from "@inertiajs/react"
import { motion } from "framer-motion"
import { Building, User, FileText, Shield, Lock, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Input } from "@/components/frontend/ui/input"
import { Label } from "@/components/frontend/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/frontend/ui/select"
import AppLayout from '@/layouts/app-layout'
import { type BreadcrumbItem } from '@/types'

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
  },
  {
    title: 'Organization Verification',
    href: '/verification/ownership',
  },
]

const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
]

export default function ComprehensiveVerificationPage() {
  const { auth, organization } = usePage().props as any
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data, setData, post, processing, errors } = useForm({
    manager_name: auth.user.name || '',
    manager_title: '',
    state: organization?.state || '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    post('/verification/ownership/verify', {
      onSuccess: () => {
        router.visit('/verification/results')
      },
      onError: () => {
        setIsSubmitting(false)
      },
      onFinish: () => {
        setIsSubmitting(false)
      }
    })
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Organization Verification" />
      
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mb-6 shadow-2xl">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Organization Verification
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Verify your ownership of this organization through IRS records
            </p>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Organization Information (Read-only) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="shadow-xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
                <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                  <CardTitle className="flex items-center gap-2">
                    <Building className="w-6 h-6" />
                    Organization Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        Organization Name
                      </Label>
                      <div className="mt-1 p-3 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white font-medium">
                        {organization?.name || 'No organization found'}
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        EIN Number
                      </Label>
                      <div className="mt-1 p-3 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white font-mono">
                        {organization?.ein || 'No EIN found'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-900 dark:text-blue-300">
                          Organization Information Locked
                        </h4>
                        <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                          This information is from your existing organization profile and cannot be changed during verification.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Manager Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="shadow-xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
                <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-6 h-6" />
                    Manager Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="manager_name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Your Full Name *
                      </Label>
                      <Input
                        id="manager_name"
                        type="text"
                        value={data.manager_name}
                        onChange={(e) => setData('manager_name', e.target.value)}
                        className={`mt-1 ${errors.manager_name ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                        placeholder="Enter your full legal name"
                        required
                      />
                      {errors.manager_name && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {errors.manager_name}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        This should match your name in the organization's IRS records
                      </p>
                    </div>
                    
                    <div>
                      <Label htmlFor="manager_title" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Your Title/Position *
                      </Label>
                      <Input
                        id="manager_title"
                        type="text"
                        value={data.manager_title}
                        onChange={(e) => setData('manager_title', e.target.value)}
                        className={`mt-1 ${errors.manager_title ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                        placeholder="e.g., Executive Director, CEO, President"
                        required
                      />
                      {errors.manager_title && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {errors.manager_title}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Your official title within the organization
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="state" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Organization State *
                    </Label>
                    <Select value={data.state} onValueChange={(value) => setData('state', value)}>
                      <SelectTrigger className={`mt-1 ${errors.state ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}>
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {US_STATES.map((state) => (
                          <SelectItem key={state.value} value={state.value}>
                            {state.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.state && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.state}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      State where your organization is registered
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Verification Process */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="shadow-xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
                <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-6 h-6" />
                    Verification Process
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        1
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">IRS Records Check</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          We'll verify your organization exists in IRS nonprofit database using the EIN
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        2
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">Form 990 Officer Verification</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          We'll check if your name matches any officer listed in the organization's Form 990 filings
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        3
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">Instant Results</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Get immediate verification results based on IRS data matching
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-yellow-900 dark:text-yellow-300">
                          Important Note
                        </h4>
                        <p className="text-sm text-yellow-800 dark:text-yellow-400 mt-1">
                          Your name and title must match the information in your organization's most recent IRS Form 990 filing. 
                          If there's a mismatch, your verification may be flagged for manual review.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Submit Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-center"
            >
              <Button
                type="submit"
                disabled={processing || isSubmitting || !organization?.ein}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-12 py-4 text-lg font-semibold shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105"
              >
                {processing || isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Verifying Organization...
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5 mr-2" />
                    Start Verification Process
                  </>
                )}
              </Button>
              
              {!organization?.ein && (
                <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                  No organization EIN found. Please ensure you have a valid organization profile.
                </p>
              )}
            </motion.div>
          </form>
        </div>
      </div>
    </AppLayout>
  )
}
