"use client"

import React, { useMemo } from "react"
import { Head, router } from "@inertiajs/react"
import ProfileLayout from "@/components/frontend/layout/user-profile-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/frontend/ui/card"
import { Button } from "@/components/frontend/ui/button"
import { Badge } from "@/components/frontend/ui/badge"
import { 
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ArrowUpCircle,
  ArrowDownCircle,
  ShoppingCart,
  RefreshCcw,
  Heart,
  Wallet,
  Shield,
  CreditCard,
  Send,
  Download,
  TrendingUp,
  FileText,
} from "lucide-react"

interface WalletData {
  connected: boolean
  expired: boolean
  connected_at: string | null
  expires_at: string | null
  wallet_user_id: number | null
  balance: number
}

interface Transaction {
  id: number
  type: string
  status: string
  amount: number
  fee: number
  currency: string
  payment_method: string | null
  transaction_id: string | null
  processed_at: string | null
  created_at: string
  meta?: Record<string, unknown>
  plan_name?: string | null
  plan_frequency?: string | null
  credits_added?: number | null
  description?: string | null
}

interface PaginationLink {
  url: string | null
  label: string
  active: boolean
}

interface PaginationData {
  current_page: number
  data: Transaction[]
  first_page_url: string
  from: number
  last_page: number
  last_page_url: string
  links: PaginationLink[]
  next_page_url: string | null
  path: string
  per_page: number
  prev_page_url: string | null
  to: number
  total: number
}

interface BillingProps {
  wallet: WalletData
  transactions: PaginationData
}

export default function Billing({ transactions: initialTransactions }: BillingProps) {

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatTransactionId = (transactionId: string | null, id: number) => {
    if (!transactionId) return `TXN#${id}`
    // If it's a Stripe session ID, show last 12 characters
    if (transactionId.startsWith('cs_')) {
      return `...${transactionId.slice(-12)}`
    }
    // If it's very long, truncate it
    if (transactionId.length > 20) {
      return `${transactionId.slice(0, 8)}...${transactionId.slice(-8)}`
    }
    return transactionId
  }

  const getTransactionTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      'wallet_subscription': 'Wallet Subscription',
      'kyc_fee': 'KYC Verification Fee',
      'purchase': 'Purchase',
      'deposit': 'Deposit',
      'withdrawal': 'Withdrawal',
      'refund': 'Refund',
      'donation': 'Donation',
      'transfer': 'Transfer',
    }
    return typeMap[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const getTransactionDescription = (transaction: Transaction) => {
    if (transaction.description) {
      return transaction.description
    }
    if (transaction.plan_name) {
      return `${transaction.plan_name} Plan${transaction.plan_frequency ? ` (${transaction.plan_frequency})` : ''}`
    }
    if (transaction.type === 'wallet_subscription') {
      return 'Wallet Subscription Payment'
    }
    if (transaction.type === 'kyc_fee') {
      return 'One-time KYC Verification Fee'
    }
    return getTransactionTypeLabel(transaction.type)
  }

  const isSubscriptionOrKycTransaction = (transaction: Transaction): boolean => {
    const type = transaction.type?.toLowerCase() || ''
    const description = transaction.description?.toLowerCase() || ''
    const planName = transaction.plan_name?.toLowerCase() || ''
    
    // Check type
    if (type === 'wallet_subscription' || type === 'kyc_fee') {
      return true
    }
    
    // Check description
    if (description.includes('wallet subscription') || 
        description.includes('subscription') ||
        description.includes('kyc') ||
        description.includes('verification fee')) {
      return true
    }
    
    // Check if it's a wallet plan purchase
    if (planName && (planName.includes('wallet') || planName.includes('subscription'))) {
      return true
    }
    
    // Check meta data
    if (transaction.meta && typeof transaction.meta === 'object') {
      const metaStr = JSON.stringify(transaction.meta).toLowerCase()
      if (metaStr.includes('wallet_plan') || metaStr.includes('wallet_subscription') || metaStr.includes('kyc')) {
        return true
      }
    }
    
    return false
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      case "failed":
      case "cancelled":
      case "rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      case "refund":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
    }
  }

  const getTypeIcon = (type: string) => {
    const typeLower = type?.toLowerCase() || ''
    
    switch (typeLower) {
      case "deposit":
        return <ArrowUpCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
      case "withdrawal":
        return <ArrowDownCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
      case "purchase":
        return <ShoppingCart className="h-6 w-6 text-purple-600 dark:text-purple-400" />
      case "refund":
        return <RefreshCcw className="h-6 w-6 text-orange-600 dark:text-orange-400" />
      case "donation":
        return <Heart className="h-6 w-6 text-pink-600 dark:text-pink-400" />
      case "wallet_subscription":
        return <Wallet className="h-6 w-6 text-blue-600 dark:text-blue-400" />
      case "kyc_fee":
        return <Shield className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
      case "transfer_out":
        return <Send className="h-6 w-6 text-red-600 dark:text-red-400" />
      case "transfer_in":
        return <Download className="h-6 w-6 text-green-600 dark:text-green-400" />
      case "commission":
        return <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
      case "payment":
        return <CreditCard className="h-6 w-6 text-purple-600 dark:text-purple-400" />
      case "invoice":
        return <FileText className="h-6 w-6 text-gray-600 dark:text-gray-400" />
      default:
        // Check if type contains keywords for better matching
        if (typeLower.includes('subscription') || typeLower.includes('wallet')) {
          return <Wallet className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        }
        if (typeLower.includes('kyc') || typeLower.includes('verification')) {
          return <Shield className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
        }
        if (typeLower.includes('transfer') || typeLower.includes('send')) {
          return <Send className="h-6 w-6 text-red-600 dark:text-red-400" />
        }
        if (typeLower.includes('receive') || typeLower.includes('deposit')) {
          return <Download className="h-6 w-6 text-green-600 dark:text-green-400" />
        }
        if (typeLower.includes('purchase') || typeLower.includes('buy')) {
          return <ShoppingCart className="h-6 w-6 text-purple-600 dark:text-purple-400" />
        }
        if (typeLower.includes('refund') || typeLower.includes('return')) {
          return <RefreshCcw className="h-6 w-6 text-orange-600 dark:text-orange-400" />
        }
        if (typeLower.includes('donation') || typeLower.includes('donate')) {
          return <Heart className="h-6 w-6 text-pink-600 dark:text-pink-400" />
        }
        // Default fallback - use CreditCard instead of Info
        return <CreditCard className="h-6 w-6 text-gray-600 dark:text-gray-400" />
    }
  }

  const handlePageChange = (url: string | null) => {
    if (url) {
      router.get(url, {}, { preserveState: true, preserveScroll: true })
    }
  }

  const pageNumbers = useMemo(() => {
    return initialTransactions.links.filter(link => link.url && !isNaN(Number(link.label)))
  }, [initialTransactions.links])

  return (
    <ProfileLayout title="Billing & Wallet" description="Manage your wallet connection and view your balance">
      <Head title="Billing & Wallet" />
      
      <div className="space-y-6">
        {/* Billing History Card */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
          <CardHeader className="pb-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">Billing History</CardTitle>
                <CardDescription className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  View your past transactions and invoices
                </CardDescription>
              </div>
              {initialTransactions?.total && (
                <Badge variant="outline" className="text-sm font-medium">
                  {initialTransactions.total} {initialTransactions.total === 1 ? 'transaction' : 'transactions'}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {initialTransactions?.data && initialTransactions.data.length > 0 ? (
              <>
                      <div className="space-y-3">
                  {initialTransactions.data.map((transaction) => (
                    <div 
                      key={transaction.id} 
                      className="group relative flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-800/50 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200"
                    >
                      {/* Icon Container */}
                      <div className="flex-shrink-0 self-center">
                        {getTypeIcon(transaction.type)}
                      </div>

                      {/* Transaction Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-1">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
                                {getTransactionDescription(transaction)}
                              </h3>
                              <Badge 
                                className={`text-xs font-medium px-1.5 py-0.5 ${getStatusBadgeClass(transaction.status)}`}
                              >
                                {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                            </Badge>
                            </div>
                            <div className="flex flex-col gap-1 mt-1">
                              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs">
                                  {formatTransactionId(transaction.transaction_id, transaction.id)}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-500 flex-wrap">
                                <span>
                                  {formatDate(transaction.processed_at || transaction.created_at)}
                                </span>
                                {transaction.payment_method && (
                                  <span>
                                    {transaction.payment_method.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                  </span>
                                )}
                              </div>
                              {transaction.credits_added && transaction.credits_added > 0 && (
                                <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                                  +{transaction.credits_added} credits added
                                </div>
                          )}
                        </div>
                      </div>

                          {/* Amount Section */}
                          <div className="flex-shrink-0 text-right self-center">
                            {(() => {
                              const amount = Number(transaction.amount)
                              const displayAmount = Math.abs(amount)
                              
                              // Check if it's subscription or KYC fee - show red with no symbol
                              const isSubscriptionOrKyc = isSubscriptionOrKycTransaction(transaction)
                              
                              // For other transactions, determine if positive or negative
                              const isPositive = !isSubscriptionOrKyc && ['deposit', 'refund', 'donation'].includes(transaction.type)
                              
                              return (
                                <div className={`inline-flex flex-col items-end justify-center p-2 rounded-lg ${
                                  isSubscriptionOrKyc
                                    ? 'bg-red-50 dark:bg-red-900/20'
                                    : isPositive
                                    ? 'bg-green-50 dark:bg-green-900/20'
                                    : 'bg-red-50 dark:bg-red-900/20'
                                }`}>
                                  <p
                                    className={`font-bold text-lg ${
                                      isSubscriptionOrKyc
                                        ? 'text-red-600 dark:text-red-400'
                                        : isPositive
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                                    {isSubscriptionOrKyc ? '' : (isPositive ? '+' : '-')}
                                    {transaction.currency === 'USD' ? '$' : transaction.currency + ' '}
                                    {displayAmount.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                        {transaction.fee > 0 && (
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                      Fee: {transaction.currency === 'USD' ? '$' : transaction.currency + ' '}
                                      {Number(transaction.fee).toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </p>
                        )}
                                </div>
                              )
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination Controls */}
                {initialTransactions.last_page > 1 && (
                  <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(initialTransactions.prev_page_url)}
                      disabled={!initialTransactions.prev_page_url}
                      className="gap-2"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Page {initialTransactions.current_page} of {initialTransactions.last_page}
                      </span>
                    <div className="flex gap-1">
                      {pageNumbers.map((link, index) => (
                        <Button
                          key={index}
                          variant={link.active ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handlePageChange(link.url)}
                          disabled={link.active}
                            className="min-w-[2.5rem]"
                        >
                          {link.label}
                        </Button>
                      ))}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(initialTransactions.next_page_url)}
                      disabled={!initialTransactions.next_page_url}
                      className="gap-2"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No transactions found</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Your transaction history will appear here once you make a payment.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </ProfileLayout>
  )
}

