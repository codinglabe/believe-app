"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Head, router } from "@inertiajs/react"
import SettingsLayout from "@/layouts/settings/layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Wallet, 
  CreditCard, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  LogOut,
  DollarSign,
  Calendar,
  User,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ArrowUpCircle,
  ArrowDownCircle,
  ShoppingCart,
  RefreshCcw,
  Heart,
  Info,
  Eye
} from "lucide-react"
import { WalletConnectPopup } from "@/components/wallet-connect-popup"
import { showSuccessToast, showErrorToast } from "@/lib/toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

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
  meta?: any
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

export default function Billing({ wallet: initialWallet, transactions: initialTransactions }: BillingProps) {
  const [wallet, setWallet] = useState<WalletData>(initialWallet)
  const [isLoading, setIsLoading] = useState(false)
  const [showWalletPopup, setShowWalletPopup] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showDisconnectModal, setShowDisconnectModal] = useState(false)

  // Fetch wallet balance on mount if connected
  useEffect(() => {
    const fetchInitialBalance = async () => {
      if (initialWallet.connected) {
        try {
          const balanceResponse = await fetch(`/wallet/balance?t=${Date.now()}`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
              'X-Requested-With': 'XMLHttpRequest',
            },
            credentials: 'include',
            cache: 'no-cache',
          })

          if (balanceResponse.ok) {
            const balanceData = await balanceResponse.json()
            if (balanceData.success) {
              setWallet(prev => ({
                ...prev,
                balance: balanceData.balance || balanceData.local_balance || 0,
              }))
            }
          }
        } catch (error) {
          console.error('Failed to fetch initial balance:', error)
        }
      }
    }

    fetchInitialBalance()
  }, [])

  // Refresh wallet data
  const refreshWalletData = async () => {
    setIsRefreshing(true)
    try {
      const response = await fetch('/wallet/status', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.connected) {
          // Fetch balance
          const balanceResponse = await fetch(`/wallet/balance?t=${Date.now()}`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
              'X-Requested-With': 'XMLHttpRequest',
            },
            credentials: 'include',
            cache: 'no-cache',
          })

          if (balanceResponse.ok) {
            const balanceData = await balanceResponse.json()
            setWallet({
              connected: true,
              expired: false,
              connected_at: data.connected_at,
              expires_at: data.expires_at,
              wallet_user_id: data.wallet_user_id,
              balance: balanceData.balance || balanceData.local_balance || 0,
            })
            showSuccessToast('Wallet data refreshed successfully')
          } else {
            setWallet(prev => ({ ...prev, connected: true }))
          }
        } else {
          setWallet(prev => ({ ...prev, connected: false }))
        }
      }
    } catch (error) {
      console.error('Failed to refresh wallet data:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Disconnect wallet
  const handleDisconnect = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/wallet/disconnect', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setWallet({
            connected: false,
            expired: false,
            connected_at: null,
            expires_at: null,
            wallet_user_id: null,
            balance: 0,
          })
          showSuccessToast('Wallet disconnected successfully')
          router.reload({ only: ['wallet'] })
        }
      } else {
        showErrorToast('Failed to disconnect wallet')
      }
    } catch (error) {
      showErrorToast('An error occurred while disconnecting wallet')
    } finally {
      setIsLoading(false)
    }
  }

  const handleWalletConnect = async () => {
    // Don't close popup here - let success popup show first
    // Popup will be closed when user clicks "Got it!" button
    await refreshWalletData()
    // Reload after a short delay to allow success popup to be visible
    setTimeout(() => {
      router.reload({ only: ['wallet'] })
    }, 100)
  }

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

  return (
    <SettingsLayout activeTab="billing">
      <Head title="Billing & Wallet" />
      
      <div className="space-y-6">

        {/* Billing History Card */}
        <Card>
          <CardHeader>
            <CardTitle>Billing History</CardTitle>
            <CardDescription>
              View your past transactions and invoices
            </CardDescription>
          </CardHeader>
          <CardContent>
            {initialTransactions.data.length > 0 ? (
              <>
                <div className="space-y-3 mb-6">
                  {initialTransactions.data.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          {transaction.type === 'deposit' && <ArrowUpCircle className="h-5 w-5 text-green-500" />}
                          {transaction.type === 'withdrawal' && <ArrowDownCircle className="h-5 w-5 text-red-500" />}
                          {transaction.type === 'purchase' && <ShoppingCart className="h-5 w-5 text-purple-500" />}
                          {transaction.type === 'refund' && <RefreshCcw className="h-5 w-5 text-orange-500" />}
                          {transaction.type === 'donation' && <Heart className="h-5 w-5 text-pink-500" />}
                          {!['deposit', 'withdrawal', 'purchase', 'refund', 'donation'].includes(transaction.type) && (
                            <Info className="h-5 w-5 text-gray-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <p className="font-semibold capitalize text-sm sm:text-base">
                              {transaction.description || transaction.type.replace(/_/g, ' ')}
                            </p>
                            <Badge
                              variant={
                                transaction.status === 'completed'
                                  ? 'default'
                                  : transaction.status === 'pending'
                                  ? 'secondary'
                                  : 'destructive'
                              }
                              className="text-xs"
                            >
                              {transaction.status}
                            </Badge>
                          </div>
                          <div className="flex flex-col gap-1">
                            {transaction.plan_name && (
                              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                                <span className="font-medium text-foreground">Plan:</span>
                                <span className="text-muted-foreground">{transaction.plan_name}</span>
                                {transaction.plan_frequency && (
                                  <span className="text-muted-foreground">({transaction.plan_frequency})</span>
                                )}
                              </div>
                            )}
                            {transaction.credits_added && transaction.credits_added > 0 && (
                              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                                <span className="font-medium text-foreground">Credits Added:</span>
                                <span className="text-green-600 dark:text-green-400">{transaction.credits_added.toLocaleString()}</span>
                              </div>
                            )}
                          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground mt-1">
                            <span className="font-mono break-all">
                              {transaction.transaction_id || `TXN#${transaction.id}`}
                            </span>
                            <span className="whitespace-nowrap">
                              {transaction.processed_at
                                ? new Date(transaction.processed_at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                  })
                                : new Date(transaction.created_at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                            </span>
                            {transaction.payment_method && (
                              <span className="capitalize whitespace-nowrap">{transaction.payment_method}</span>
                            )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-left sm:text-right">
                          <p
                          className={`font-bold text-base sm:text-lg ${
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
                          <p className="text-xs text-muted-foreground mt-1">
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
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
                    <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                      Showing <span className="font-semibold">{initialTransactions.from || 0}</span> to{' '}
                      <span className="font-semibold">{initialTransactions.to || 0}</span> of{' '}
                      <span className="font-semibold">{initialTransactions.total || 0}</span> results
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (initialTransactions.prev_page_url) {
                            router.get(initialTransactions.prev_page_url, {}, { preserveState: true, preserveScroll: true })
                          }
                        }}
                        disabled={!initialTransactions.prev_page_url}
                        className="flex-shrink-0"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span className="hidden sm:inline ml-1">Previous</span>
                      </Button>
                      <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
                        {initialTransactions.links
                          .filter((link) => link.url && !isNaN(Number(link.label)))
                          .map((link, index) => (
                            <Button
                              key={index}
                              variant={link.active ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => {
                                if (!link.active && link.url) {
                                  router.get(link.url, {}, { preserveState: true, preserveScroll: true })
                                }
                              }}
                              disabled={link.active}
                              className="min-w-[36px] sm:min-w-[40px] flex-shrink-0"
                            >
                              {link.label}
                            </Button>
                          ))}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (initialTransactions.next_page_url) {
                            router.get(initialTransactions.next_page_url, {}, { preserveState: true, preserveScroll: true })
                          }
                        }}
                        disabled={!initialTransactions.next_page_url}
                        className="flex-shrink-0"
                      >
                        <span className="hidden sm:inline mr-1">Next</span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No transactions found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Wallet Connect Popup */}
      {showWalletPopup && (
        <WalletConnectPopup
          isOpen={showWalletPopup}
          onClose={() => setShowWalletPopup(false)}
          onConnect={handleWalletConnect}
          isConnected={wallet.connected}
          walletAppName="Believe Wallet"
          walletAppLogo="/logo.png"
        />
      )}

      {/* Disconnect Wallet Confirmation Modal */}
      <AlertDialog open={showDisconnectModal} onOpenChange={setShowDisconnectModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Wallet</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to disconnect your wallet? You will need to reconnect it to access your wallet features and balance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnect}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                'Disconnect'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsLayout>
  )
}

