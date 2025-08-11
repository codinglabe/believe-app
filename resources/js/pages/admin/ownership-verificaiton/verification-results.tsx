"use client"
import { Head, router, usePage } from "@inertiajs/react"
import { motion } from "framer-motion"
import { CheckCircle, XCircle, AlertTriangle, Clock, Shield, Building, User, FileText, ArrowLeft, Download, RefreshCw, Users, AlertCircle, Crown, UserCheck, UserX, BanknoteIcon as Bank, Loader2 } from 'lucide-react'
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Badge } from "@/components/frontend/ui/badge"
import { Progress } from "@/components/frontend/ui/progress"
import { Separator } from "@/components/frontend/ui/separator"
import { Alert, AlertDescription } from "@/components/frontend/ui/alert"
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
{
  title: 'Results',
  href: '/verification/results',
},
]

interface Officer {
name: string
title: string
compensation: number
is_ceo?: boolean
is_primary?: boolean
}

interface VerificationData {
id: number
verification_status: 'verified' | 'needs_additional_docs' | 'rejected' | 'pending' | 'flagged_fraud'
progress: number
ein: string
organization_legal_name: string
manager_full_name: string
claimed_title: string
nonprofit_exists: boolean
nonprofit_in_good_standing: boolean
name_matches_public_records: boolean
manager_listed_as_officer: boolean
propublica_data: any
officers_list: Officer[]
verified_at: string | null
rejection_reason: string | null
required_documents: string[] | null
compliance_score: number
created_at: string
fraud_flags: string[] | null
ceo_info: {
  name: string
  title: string
  compensation: number
} | null
profile_name_matches_ceo: boolean
profile_name_matches_any_officer: boolean
profile_name_matches_organization_name: boolean
verification_method: string
}

interface Organization {
id: number
name: string
ein: string
city: string
state: string
description: string
}

interface User {
id: number
name: string
email: string
}

export default function VerificationResults() {
const { verification, organization, auth } = usePage().props as {
  verification: VerificationData
  organization: Organization
  auth: { user: User }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'verified':
      return <CheckCircle className="w-8 h-8 text-green-500" />
    case 'needs_additional_docs':
      return <AlertTriangle className="w-8 h-8 text-yellow-500" />
    case 'rejected':
      return <XCircle className="w-8 h-8 text-red-500" />
    case 'flagged_fraud':
      return <AlertCircle className="w-8 h-8 text-red-600" />
    default:
      return <Clock className="w-8 h-8 text-gray-500" />
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'verified':
      return 'bg-gradient-to-r from-green-500 to-emerald-600'
    case 'needs_additional_docs':
      return 'bg-gradient-to-r from-yellow-500 to-orange-500'
    case 'rejected':
      return 'bg-gradient-to-r from-red-500 to-red-600'
    case 'flagged_fraud':
      return 'bg-gradient-to-r from-red-600 to-red-700'
    default:
      return 'bg-gradient-to-r from-gray-500 to-gray-600'
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'verified':
      return 'Verification Complete'
    case 'needs_additional_docs':
      return 'Additional Documents Required'
    case 'rejected':
      return 'Verification Rejected'
    case 'flagged_fraud':
      return 'Potential Fraud Detected'
    default:
      return 'Verification Pending'
  }
}

const getStatusDescription = (status: string) => {
  switch (status) {
    case 'verified':
      return 'Your organization has been successfully verified through IRS records. You now have full access to all platform features.'
    case 'needs_additional_docs':
      return 'We need additional documentation to complete your verification. Please upload the required documents below.'
    case 'rejected':
      return 'Your verification was rejected due to the reasons listed below. You may resubmit with corrected information.'
    case 'flagged_fraud':
      return 'Our system has detected potential fraudulent activity. Please contact support for manual review.'
    default:
      return 'Your verification is being processed. We\'ll notify you once it\'s complete.'
  }
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const CheckItem = ({ 
  label, 
  passed, 
  description,
  isCritical = false
}: { 
  label: string
  passed: boolean
  description: string 
  isCritical?: boolean
}) => (
  <div className={`flex items-start gap-3 p-4 rounded-lg border transition-all duration-200 ${
    isCritical && !passed 
      ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20' 
      : passed 
        ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
        : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'
  }`}>
    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
      passed ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400' : 
      isCritical ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400' :
      'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400'
    }`}>
      {passed ? (
        <CheckCircle className="w-4 h-4" />
      ) : isCritical ? (
        <AlertCircle className="w-4 h-4" />
      ) : (
        <XCircle className="w-4 h-4" />
      )}
    </div>
    <div className="flex-1">
      <h4 className={`font-medium ${
        isCritical && !passed 
          ? 'text-red-900 dark:text-red-300' 
          : 'text-gray-900 dark:text-white'
      }`}>
        {label}
        {isCritical && !passed && (
          <Badge variant="destructive" className="ml-2 text-xs">
            CRITICAL
          </Badge>
        )}
      </h4>
      <p className={`text-sm mt-1 ${
        isCritical && !passed 
          ? 'text-red-700 dark:text-red-400' 
          : 'text-gray-600 dark:text-gray-400'
      }`}>
        {description}
      </p>
    </div>
  </div>
)

const FraudAlert = ({ flags }: { flags: string[] }) => (
  <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
    <AlertCircle className="h-4 w-4 text-red-600" />
    <AlertDescription className="text-red-800 dark:text-red-300">
      <strong>Fraud Detection Alert:</strong>
      <ul className="list-disc list-inside mt-2 space-y-1">
        {flags.map((flag, index) => (
          <li key={index}>{flag}</li>
        ))}
      </ul>
    </AlertDescription>
  </Alert>
)

// Find CEO or primary officer
const ceoInfo = verification.ceo_info || verification.officers_list?.find(officer => 
  officer.title?.toLowerCase().includes('ceo') || 
  officer.title?.toLowerCase().includes('chief executive') ||
  officer.title?.toLowerCase().includes('president') ||
  officer.is_ceo ||
  officer.is_primary
)

const isFraudulent = verification.verification_status === 'flagged_fraud' || 
                    verification.fraud_flags?.length > 0 ||
                    (!verification.profile_name_matches_ceo && !verification.profile_name_matches_any_officer && !verification.profile_name_matches_organization_name)

return (
  <AppLayout breadcrumbs={breadcrumbs}>
    <Head title="Verification Results" />
    
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card className="shadow-2xl border-0 overflow-hidden backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
            <CardHeader className={`${getStatusColor(verification.verification_status)} text-white text-center py-12 relative overflow-hidden`}>
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="relative z-10 flex flex-col items-center gap-6">
                <div className="p-4 bg-white/20 rounded-full backdrop-blur-sm">
                  {getStatusIcon(verification.verification_status)}
                </div>
                <div>
                  <CardTitle className="text-4xl font-bold mb-3">
                    {getStatusText(verification.verification_status)}
                  </CardTitle>
                  <p className="text-xl opacity-90 max-w-2xl">
                    {getStatusDescription(verification.verification_status)}
                  </p>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {verification.compliance_score}%
                  </div>
                  <div className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Compliance Score
                  </div>
                  <Progress value={verification.compliance_score} className="mt-3" />
                </div>
                
                <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl">
                  <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 font-mono">
                    {verification.ein}
                  </div>
                  <div className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                    Organization EIN
                  </div>
                </div>
                
                <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl">
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {verification.verified_at ? formatDate(verification.verified_at) : formatDate(verification.created_at)}
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-300 mt-1">
                    {verification.verified_at ? 'Verified Date' : 'Submitted Date'}
                  </div>
                </div>

                <div className="text-center p-6 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl">
                  <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                    {verification.officers_list?.length || 0}
                  </div>
                  <div className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                    Officers Found
                  </div>
                </div>
              </div>

              {/* IRS Verification Success */}
              {verification.verification_status === 'verified' && (
                <div className="mb-6">
                  <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg border border-green-200 dark:border-green-700">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                        <Shield className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-green-900 dark:text-green-300">
                          Verified through IRS Records
                        </h3>
                        <p className="text-sm text-green-700 dark:text-green-400">
                          Your name matches official IRS records for this organization!
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-green-700 dark:text-green-400">Organization:</span>
                        <div className="font-medium text-green-900 dark:text-green-300">
                          {verification.organization_legal_name}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm text-green-700 dark:text-green-400">EIN:</span>
                        <div className="font-medium text-green-900 dark:text-green-300">
                          {verification.ein}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 p-3 bg-green-100 dark:bg-green-800/20 rounded-lg">
                      <div className="text-sm font-medium text-green-800 dark:text-green-300">
                        {verification.profile_name_matches_ceo && '✓ Name matches CEO/President record'}
                        {!verification.profile_name_matches_ceo && verification.profile_name_matches_any_officer && '✓ Name matches officer record'}
                        {!verification.profile_name_matches_ceo && !verification.profile_name_matches_any_officer && verification.profile_name_matches_organization_name && '✓ Name matches organization name'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Fraud Alert */}
              {isFraudulent && (
                <div className="mb-6">
                  <FraudAlert flags={verification.fraud_flags || [
                    `Profile name "${auth.user.name}" does not match any IRS records`,
                    'User not found in organization officer records',
                    'Name does not match organization name',
                    'Potential identity mismatch detected'
                  ]} />
                </div>
              )}

              <div className="flex flex-wrap gap-4 justify-center">
                <Button
                  onClick={() => router.visit('/dashboard')}
                  className="bg-blue-600 hover:bg-blue-700 px-6 py-3"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
                
                {verification.verification_status === 'verified' && (
                  <Button variant="outline" className="px-6 py-3">
                    <Download className="w-4 h-4 mr-2" />
                    Download Certificate
                  </Button>
                )}
                
                {(verification.verification_status === 'rejected' || verification.verification_status === 'flagged_fraud') && (
                  <Button 
                    variant="outline"
                    onClick={() => router.visit('/verification/ownership')}
                    className="px-6 py-3"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry Verification
                  </Button>
                )}

                {verification.verification_status === 'flagged_fraud' && (
                  <Button variant="destructive" className="px-6 py-3">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Contact Support
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Verification Checks */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <Card className="shadow-xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Shield className="w-6 h-6" />
                  Verification Checks
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <CheckItem
                  label="Organization Exists in IRS Records"
                  passed={verification.nonprofit_exists}
                  description="Organization found in IRS nonprofit database"
                />
                
                <CheckItem
                  label="Organization in Good Standing"
                  passed={verification.nonprofit_in_good_standing}
                  description="Organization has recent tax filings and is active"
                />
                
                <CheckItem
                  label="Name Matches CEO/President"
                  passed={verification.profile_name_matches_ceo}
                  description={`Profile name "${auth.user.name}" matches CEO/President "${ceoInfo?.name || 'Unknown'}"`}
                  isCritical={true}
                />
                
                <CheckItem
                  label="Listed as Officer"
                  passed={verification.profile_name_matches_any_officer}
                  description="Profile name matches any organization officer in IRS records"
                  isCritical={true}
                />

                <CheckItem
                  label="Name Matches Organization"
                  passed={verification.profile_name_matches_organization_name}
                  description="Profile name matches or is similar to organization name"
                />
                
                <CheckItem
                  label="Public Records Match"
                  passed={verification.name_matches_public_records}
                  description="Manager name matches public records"
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* Organization & CEO Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-6"
          >
            
            {/* Verification Method */}
            <Card className="shadow-xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  Verification Method
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                  <div className="font-semibold text-blue-900 dark:text-blue-300">
                    IRS Records Verification
                  </div>
                  <div className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                    Verified through official IRS nonprofit database records
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CEO/Primary Officer Info */}
            {ceoInfo && (
              <Card className="shadow-xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-yellow-600" />
                    CEO / Primary Officer
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      verification.profile_name_matches_ceo 
                        ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400'
                        : 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400'
                    }`}>
                      {verification.profile_name_matches_ceo ? (
                        <UserCheck className="w-6 h-6" />
                      ) : (
                        <UserX className="w-6 h-6" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-lg font-semibold text-gray-900 dark:text-white">
                        {ceoInfo.name}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {ceoInfo.title}
                      </div>
                      {ceoInfo.compensation > 0 && (
                        <div className="text-sm font-medium text-green-600 dark:text-green-400">
                          {formatCurrency(ceoInfo.compensation)} compensation
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Your Profile Name
                      </label>
                      <div className={`text-lg font-semibold ${
                        verification.profile_name_matches_ceo 
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {auth.user.name}
                      </div>
                    </div>

                    <div className={`p-3 rounded-lg ${
                      verification.profile_name_matches_ceo 
                        ? 'bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800'
                        : 'bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800'
                    }`}>
                      <div className={`text-sm font-medium ${
                        verification.profile_name_matches_ceo 
                          ? 'text-green-800 dark:text-green-300'
                          : 'text-red-800 dark:text-red-300'
                      }`}>
                        {verification.profile_name_matches_ceo 
                          ? '✓ Name matches CEO record'
                          : '✗ Name does not match CEO record'
                        }
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Organization Info */}
            <Card className="shadow-xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  Organization Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Legal Name
                  </label>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {verification.organization_legal_name}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      EIN
                    </label>
                    <div className="font-mono text-gray-900 dark:text-white">
                      {verification.ein}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Location
                    </label>
                    <div className="text-gray-900 dark:text-white">
                      {organization?.city || 'Unknown'}, {organization?.state || 'Unknown'}
                    </div>
                  </div>
                </div>

                {verification.propublica_data && (
                  <div className="pt-4 border-t">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                      Financial Information
                    </h4>
                    <div className="grid grid-cols-1 gap-3">
                      {verification.propublica_data.asset_amount > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Assets:</span>
                          <span className="font-medium">
                            {formatCurrency(verification.propublica_data.asset_amount)}
                          </span>
                        </div>
                      )}
                      {verification.propublica_data.revenue_amount > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Revenue:</span>
                          <span className="font-medium">
                            {formatCurrency(verification.propublica_data.revenue_amount)}
                          </span>
                        </div>
                      )}
                      {verification.propublica_data.tax_period && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Tax Period:</span>
                          <span className="font-medium">
                            {verification.propublica_data.tax_period}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Manager Info */}
            <Card className="shadow-xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Claimed Manager Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Full Name
                  </label>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {verification.manager_full_name}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Title/Position
                  </label>
                  <div className="text-gray-900 dark:text-white">
                    {verification.claimed_title}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Officers List */}
        {verification.officers_list && verification.officers_list.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-8"
          >
            <Card className="shadow-xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Organization Officers ({verification.officers_list.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {verification.officers_list.map((officer, index) => {
                    const isProfileMatch = officer.name.toLowerCase().includes(auth.user.name.toLowerCase()) ||
                                         auth.user.name.toLowerCase().includes(officer.name.toLowerCase())
                    
                    return (
                      <div key={index} className={`p-4 rounded-lg border transition-all duration-200 ${
                        isProfileMatch 
                          ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                          : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className={`font-medium ${
                              isProfileMatch 
                                ? 'text-green-900 dark:text-green-300'
                                : 'text-gray-900 dark:text-white'
                            }`}>
                              {officer.name}
                              {isProfileMatch && (
                                <Badge variant="secondary" className="ml-2 text-xs bg-green-100 text-green-800">
                                  MATCH
                                </Badge>
                              )}
                            </div>
                            <div className={`text-sm ${
                              isProfileMatch 
                                ? 'text-green-700 dark:text-green-400'
                                : 'text-gray-600 dark:text-gray-400'
                            }`}>
                              {officer.title}
                            </div>
                            {officer.compensation > 0 && (
                              <div className="text-sm font-medium text-blue-600 dark:text-blue-400 mt-1">
                                {formatCurrency(officer.compensation)}
                              </div>
                            )}
                          </div>
                          {(officer.title?.toLowerCase().includes('ceo') || 
                            officer.title?.toLowerCase().includes('president') ||
                            officer.title?.toLowerCase().includes('chief executive')) && (
                            <Crown className="w-4 h-4 text-yellow-600 flex-shrink-0 ml-2" />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Additional Information */}
        {(verification.rejection_reason || verification.required_documents || verification.fraud_flags) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-8"
          >
            <Card className="shadow-xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Additional Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {verification.rejection_reason && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                    <h4 className="font-medium text-red-900 dark:text-red-300 mb-2">
                      Rejection Reason
                    </h4>
                    <p className="text-red-800 dark:text-red-400">
                      {verification.rejection_reason}
                    </p>
                  </div>
                )}
                
                {verification.required_documents && verification.required_documents.length > 0 && (
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                    <h4 className="font-medium text-yellow-900 dark:text-yellow-300 mb-2">
                      Required Documents
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-yellow-800 dark:text-yellow-400">
                      {verification.required_documents.map((doc, index) => (
                        <li key={index} className="capitalize">
                          {doc.replace(/_/g, ' ')}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {verification.fraud_flags && verification.fraud_flags.length > 0 && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                    <h4 className="font-medium text-red-900 dark:text-red-300 mb-2">
                      Fraud Detection Flags
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-red-800 dark:text-red-400">
                      {verification.fraud_flags.map((flag, index) => (
                        <li key={index}>{flag}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  </AppLayout>
)
}
