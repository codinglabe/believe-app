"use client"

import React, { useState, useEffect, useMemo } from "react"
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
  Info,
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

export default function Billing({ wallet: initialWallet, transactions: initialTransactions }: BillingProps) {
  // Wallet prop is kept for interface compatibility but not used

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
    switch (type) {
      case "deposit":
        return <ArrowUpCircle className="h-5 w-5 text-green-500" />
      case "withdrawal":
        return <ArrowDownCircle className="h-5 w-5 text-red-500" />
      case "purchase":
        return <ShoppingCart className="h-5 w-5 text-purple-500" />
      case "refund":
        return <RefreshCcw className="h-5 w-5 text-orange-500" />
      case "donation":
        return <Heart className="h-5 w-5 text-pink-500" />
      default:
        return <Info className="h-5 w-5 text-gray-500" />
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
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Billing History</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              View your past transactions and invoices
            </CardDescription>
          </CardHeader>
          <CardContent>
            {initialTransactions.data.length > 0 ? (
              <>
                <div className="space-y-4">
                  {initialTransactions.data.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50 dark:bg-gray-700/50">
                      <div className="flex items-center gap-3">
                        {getTypeIcon(transaction.type)}
                        <div>
                          <p className="font-semibold capitalize text-gray-900 dark:text-white">
                            {transaction.type.replace(/_/g, ' ')}
                            <Badge variant="outline" className={`ml-2 ${getStatusBadgeClass(transaction.status)}`}>
                              {transaction.status}
                            </Badge>
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {transaction.transaction_id || `TXN#${transaction.id}`}
                          </p>
                          {transaction.processed_at && (
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                              {formatDate(transaction.processed_at)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-bold ${
                            ['deposit', 'refund', 'donation'].includes(transaction.type)
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {['deposit', 'refund', 'donation'].includes(transaction.type) ? '+' : '-'}
                          {transaction.currency} {Number(transaction.amount).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                        {transaction.fee > 0 && (
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            Fee: {transaction.currency} {Number(transaction.fee).toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination Controls */}
                {initialTransactions.last_page > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(initialTransactions.prev_page_url)}
                      disabled={!initialTransactions.prev_page_url}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="flex gap-1">
                      {pageNumbers.map((link, index) => (
                        <Button
                          key={index}
                          variant={link.active ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handlePageChange(link.url)}
                          disabled={link.active}
                        >
                          {link.label}
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(initialTransactions.next_page_url)}
                      disabled={!initialTransactions.next_page_url}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">No transactions found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </ProfileLayout>
  )
}

